import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, userAccessToken, accountId, importAll, code, redirectUri } = await req.json();

    // Get Facebook App credentials from admin_config
    const { data: config } = await supabase
      .from('admin_config')
      .select('fb_app_id, fb_app_secret')
      .single();

    if (!config?.fb_app_id || !config?.fb_app_secret) {
      throw new Error('Facebook App not configured');
    }

    // Helper function to check if account is active elsewhere
    const checkAccountActiveElsewhere = async (igAccountId: string): Promise<boolean> => {
      const { data: existingAccount } = await supabase
        .from("instagram_accounts")
        .select("id, status")
        .eq("instagram_account_id", igAccountId)
        .eq("status", "active")
        .neq("user_id", user.id)
        .maybeSingle();
      
      return !!existingAccount;
    };

    // Handle OAuth callback - exchange code for access token
    if (action === 'callback' && code) {
      console.log('Processing Instagram OAuth callback with code');
      
      // Exchange code for access token
      const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${config.fb_app_id}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${config.fb_app_secret}&code=${code}`;
      
      const tokenResponse = await fetch(tokenUrl);
      const tokenData = await tokenResponse.json();
      
      console.log('Token exchange response:', { success: !!tokenData.access_token, hasError: !!tokenData.error });

      if (tokenData.error) {
        throw new Error(`Facebook API error: ${tokenData.error.message || JSON.stringify(tokenData.error)}`);
      }

      if (!tokenData.access_token) {
        throw new Error('Failed to get access token from code');
      }

      // Exchange for long-lived token
      const longLivedUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.fb_app_id}&client_secret=${config.fb_app_secret}&fb_exchange_token=${tokenData.access_token}`;
      
      const longLivedResponse = await fetch(longLivedUrl);
      const longLivedData = await longLivedResponse.json();
      
      const longLivedToken = longLivedData.access_token || tokenData.access_token;

      // Get Instagram Business Accounts
      const igAccountsResponse = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count}&access_token=${longLivedToken}`
      );
      const igAccountsData = await igAccountsResponse.json();

      if (igAccountsData.error) {
        throw new Error(igAccountsData.error.message);
      }

      const instagramAccounts = igAccountsData.data
        .filter((page: any) => page.instagram_business_account)
        .map((page: any) => ({
          id: page.instagram_business_account.id,
          username: page.instagram_business_account.username,
          name: page.instagram_business_account.name || page.instagram_business_account.username,
          profile_picture_url: page.instagram_business_account.profile_picture_url,
          followers_count: page.instagram_business_account.followers_count || 0,
          page_access_token: page.access_token,
        }));

      let imported = 0;
      
      for (const account of instagramAccounts) {
        try {
          // Check if account is active in another user's account
          const isActiveElsewhere = await checkAccountActiveElsewhere(account.id);
          const accountStatus = isActiveElsewhere ? 'inactive' : 'active';

          // Save to database
          const { error: saveError } = await supabase
            .from('instagram_accounts')
            .upsert({
              user_id: user.id,
              instagram_account_id: account.id,
              instagram_username: account.username,
              account_name: account.name,
              profile_picture_url: account.profile_picture_url,
              followers_count: account.followers_count,
              access_token: account.page_access_token,
              status: accountStatus,
            }, {
              onConflict: 'instagram_account_id,user_id'
            });

          if (saveError) {
            console.error('Error saving Instagram account:', account.id, saveError);
            continue;
          }

          // Get the internal UUID of the saved account
          const { data: savedAcc } = await supabase
            .from('instagram_accounts')
            .select('id')
            .eq('instagram_account_id', account.id)
            .eq('user_id', user.id)
            .single();

          if (!savedAcc) {
            console.error('Failed to retrieve saved Instagram account UUID');
            continue;
          }

          // Create default templates using internal UUID
          await supabase.from('instagram_unsent_reply_templates').upsert({
            instagram_account_id: savedAcc.id,
            user_id: user.id,
            name: 'Unsent Message Auto-Reply',
            reply_message: 'Hi! 👋 I noticed you unsent a message. No worries! If you need anything or have questions, feel free to reach out anytime. I\'m here to help! 😊',
            is_active: false
          }, { onConflict: 'instagram_account_id' });

          await supabase.from('instagram_story_triggers').insert([
            {
              instagram_account_id: savedAcc.id,
              user_id: user.id,
              name: 'Story Reply Auto-Response',
              dm_message: 'Thanks for replying to my story! 🎉 I love hearing from you. What did you think about it? Let me know if you have any questions or just want to chat! 💬',
              trigger_type: 'all_story_replies',
              is_active: true
            },
            {
              instagram_account_id: savedAcc.id,
              user_id: user.id,
              name: 'Story Mention Auto-Response',
              dm_message: 'Hey! 🙏 Thanks so much for mentioning me in your story! That really means a lot. I appreciate the shoutout! Let\'s stay connected. 💫',
              trigger_type: 'story_mentions',
              is_active: true
            }
          ]).throwOnError();

          // Subscribe to webhooks only if active
          if (accountStatus === 'active') {
            await fetch(
              `https://graph.facebook.com/v21.0/${account.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token=${account.page_access_token}`,
              { method: 'POST' }
            );
          }
          
          imported++;
        } catch (accountError) {
          console.error('Error importing Instagram account:', account.id, accountError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, imported }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'connect') {
      // Exchange short-lived token for long-lived token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.fb_app_id}&client_secret=${config.fb_app_secret}&fb_exchange_token=${userAccessToken}`
      );
      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        throw new Error(tokenData.error.message);
      }

      const longLivedToken = tokenData.access_token;

      // Get Instagram Business Accounts
      const igAccountsResponse = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count}&access_token=${longLivedToken}`
      );
      const igAccountsData = await igAccountsResponse.json();

      if (igAccountsData.error) {
        throw new Error(igAccountsData.error.message);
      }

      const instagramAccounts = igAccountsData.data
        .filter((page: any) => page.instagram_business_account)
        .map((page: any) => ({
          id: page.instagram_business_account.id,
          username: page.instagram_business_account.username,
          name: page.instagram_business_account.name || page.instagram_business_account.username,
          profile_picture_url: page.instagram_business_account.profile_picture_url,
          followers_count: page.instagram_business_account.followers_count || 0,
          page_access_token: page.access_token,
        }));

      // Import all Instagram accounts
      if (importAll) {
        let imported = 0;
        
        for (const account of instagramAccounts) {
          try {
            // Check if account is active in another user's account
            const isActiveElsewhere = await checkAccountActiveElsewhere(account.id);
            const accountStatus = isActiveElsewhere ? 'inactive' : 'active';

            // Save to database
            const { error: saveError } = await supabase
              .from('instagram_accounts')
              .upsert({
                user_id: user.id,
                instagram_account_id: account.id,
                instagram_username: account.username,
                account_name: account.name,
                profile_picture_url: account.profile_picture_url,
                followers_count: account.followers_count,
                access_token: account.page_access_token,
                status: accountStatus,
              }, {
                onConflict: 'instagram_account_id,user_id'
              });

          if (saveError) {
            console.error('Error saving Instagram account:', account.id, saveError);
            continue;
          }

          // Get the internal UUID of the saved account
          const { data: savedAcc } = await supabase
            .from('instagram_accounts')
            .select('id')
            .eq('instagram_account_id', account.id)
            .eq('user_id', user.id)
            .single();

          if (!savedAcc) {
            console.error('Failed to retrieve saved Instagram account UUID');
            continue;
          }

          // Create default templates using internal UUID
          await supabase.from('instagram_unsent_reply_templates').upsert({
            instagram_account_id: savedAcc.id,
            user_id: user.id,
            name: 'Unsent Message Auto-Reply',
            reply_message: 'Hi! 👋 I noticed you unsent a message. No worries! If you need anything or have questions, feel free to reach out anytime. I\'m here to help! 😊',
            is_active: false
          }, { onConflict: 'instagram_account_id' });

          await supabase.from('instagram_story_triggers').insert([
            {
              instagram_account_id: savedAcc.id,
              user_id: user.id,
              name: 'Story Reply Auto-Response',
              dm_message: 'Thanks for replying to my story! 🎉 I love hearing from you. What did you think about it? Let me know if you have any questions or just want to chat! 💬',
              trigger_type: 'all_story_replies',
              is_active: true
            },
            {
              instagram_account_id: savedAcc.id,
              user_id: user.id,
              name: 'Story Mention Auto-Response',
              dm_message: 'Hey! 🙏 Thanks so much for mentioning me in your story! That really means a lot. I appreciate the shoutout! Let\'s stay connected. 💫',
              trigger_type: 'story_mentions',
              is_active: true
            }
          ]);

            // Subscribe to webhooks only if active
            if (accountStatus === 'active') {
              await fetch(
                `https://graph.facebook.com/v21.0/${account.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token=${account.page_access_token}`,
                { method: 'POST' }
              );
            }
            
            imported++;
          } catch (accountError) {
            console.error('Error importing Instagram account:', account.id, accountError);
          }
        }

        return new Response(
          JSON.stringify({ success: true, imported }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Single account connection (legacy support)
      if (accountId) {
        const selectedAccount = instagramAccounts.find((acc: any) => acc.id === accountId);
        if (!selectedAccount) {
          throw new Error('Instagram account not found');
        }

        // Check if account is active in another user's account
        const isActiveElsewhere = await checkAccountActiveElsewhere(selectedAccount.id);
        const accountStatus = isActiveElsewhere ? 'inactive' : 'active';

        const { data: savedAccount, error: saveError } = await supabase
          .from('instagram_accounts')
          .upsert({
            user_id: user.id,
            instagram_account_id: selectedAccount.id,
            instagram_username: selectedAccount.username,
            account_name: selectedAccount.name,
            profile_picture_url: selectedAccount.profile_picture_url,
            followers_count: selectedAccount.followers_count,
            access_token: selectedAccount.page_access_token,
            status: accountStatus,
          }, {
            onConflict: 'instagram_account_id,user_id'
          })
          .select()
          .single();

        if (saveError) throw saveError;

        // Create default templates using the internal UUID from savedAccount
        await supabase.from('instagram_unsent_reply_templates').upsert({
          instagram_account_id: savedAccount.id,
          user_id: user.id,
          name: 'Unsent Message Auto-Reply',
          reply_message: 'Hi! 👋 I noticed you unsent a message. No worries! If you need anything or have questions, feel free to reach out anytime. I\'m here to help! 😊',
          is_active: false
        }, { onConflict: 'instagram_account_id' });

        await supabase.from('instagram_story_triggers').insert([
          {
            instagram_account_id: savedAccount.id,
            user_id: user.id,
            name: 'Story Reply Auto-Response',
            dm_message: 'Thanks for replying to my story! 🎉 I love hearing from you. What did you think about it? Let me know if you have any questions or just want to chat! 💬',
            trigger_type: 'all_story_replies',
            is_active: true
          },
          {
            instagram_account_id: savedAccount.id,
            user_id: user.id,
            name: 'Story Mention Auto-Response',
            dm_message: 'Hey! 🙏 Thanks so much for mentioning me in your story! That really means a lot. I appreciate the shoutout! Let\'s stay connected. 💫',
            trigger_type: 'story_mentions',
            is_active: true
          }
        ]);

        if (accountStatus === 'active') {
          await fetch(
            `https://graph.facebook.com/v21.0/${accountId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token=${selectedAccount.page_access_token}`,
            { method: 'POST' }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            account: savedAccount 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return accounts list for manual selection (legacy)
      return new Response(
        JSON.stringify({ 
          success: true, 
          accounts: instagramAccounts 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect') {
      const { error: deleteError } = await supabase
        .from('instagram_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Error in instagram-connect:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
