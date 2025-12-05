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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Handle webhook verification
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      const { data: config } = await supabase
        .from('admin_config')
        .select('webhook_verify_token')
        .single();

      if (mode === 'subscribe' && token === config?.webhook_verify_token) {
        console.log('Instagram webhook verified');
        return new Response(challenge, { status: 200 });
      }

      return new Response('Forbidden', { status: 403 });
    }

    // Helper function to check keyword match
    const matchesKeyword = (text: string, keywords: string[], matchType: string, excludeKeywords: string[]): boolean => {
      const lowerText = text.toLowerCase();
      
      // Check exclude keywords first
      if (excludeKeywords && excludeKeywords.length > 0) {
        for (const exclude of excludeKeywords) {
          if (lowerText.includes(exclude.toLowerCase())) {
            return false;
          }
        }
      }

      if (!keywords || keywords.length === 0) return false;

      for (const keyword of keywords) {
        const lowerKeyword = keyword.toLowerCase();
        switch (matchType) {
          case 'exact':
            if (lowerText === lowerKeyword) return true;
            break;
          case 'starts_with':
            if (lowerText.startsWith(lowerKeyword)) return true;
            break;
          case 'contains':
          default:
            if (lowerText.includes(lowerKeyword)) return true;
            break;
        }
      }
      return false;
    };

    // Helper function to send Instagram DM
    const sendInstagramDM = async (recipientId: string, message: string, accessToken: string) => {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: message }
          })
        }
      );
      
      const result = await response.json();
      if (!response.ok) {
        console.error('Failed to send Instagram DM:', result);
        throw new Error(result.error?.message || 'Failed to send DM');
      }
      
      console.log('Instagram DM sent successfully:', result);
      return result;
    };

    // Helper function to reply to comment
    const replyToComment = async (commentId: string, message: string, accessToken: string) => {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${commentId}/replies?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        }
      );
      
      const result = await response.json();
      if (!response.ok) {
        console.error('Failed to reply to comment:', result);
        throw new Error(result.error?.message || 'Failed to reply');
      }
      
      console.log('Comment reply sent successfully:', result);
      return result;
    };

    // Handle webhook events
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('Instagram webhook received:', JSON.stringify(body, null, 2));

      for (const entry of body.entry || []) {
        const instagramAccountId = entry.id;

        // Find the Instagram account in our database
        const { data: instagramAccount } = await supabase
          .from('instagram_accounts')
          .select('*')
          .eq('instagram_account_id', instagramAccountId)
          .single();

        if (!instagramAccount) {
          console.log('Instagram account not found:', instagramAccountId);
          continue;
        }

        // Process comment events
        for (const change of entry.changes || []) {
          if (change.field === 'comments') {
            const value = change.value;
            const commentId = value.id;
            const commentText = value.text;
            const commenterId = value.from?.id;
            const postId = value.media?.id;

            console.log('Processing comment:', { commentId, commentText, commenterId, postId, instagramAccountId });

            // Ignore comments made by our own Instagram account to prevent reply loops
            if (!commentText || !commenterId) {
              console.log('[SKIP] Missing comment text or commenter id');
              continue;
            }

            if (
              commenterId === instagramAccountId ||
              commenterId === instagramAccount.instagram_account_id
            ) {
              console.log('[SKIP] Comment is from our own Instagram account, ignoring to avoid loops');
              continue;
            }

            // Check if we've already processed this comment (by comment_id OR by recent duplicate)
            const { data: existingReply } = await supabase
              .from('instagram_comment_replies')
              .select('id')
              .eq('comment_id', commentId)
              .maybeSingle();

            if (existingReply) {
              console.log('[DUPLICATE] Comment already processed by comment_id, skipping:', commentId);
              continue;
            }

            // Additional duplicate check: same commenter + post + text within last 60 seconds
            const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
            const { data: recentDuplicate } = await supabase
              .from('instagram_comment_replies')
              .select('id')
              .eq('commenter_instagram_id', commenterId)
              .eq('post_id', postId)
              .eq('comment_text', commentText)
              .gte('created_at', sixtySecondsAgo)
              .maybeSingle();

            if (recentDuplicate) {
              console.log('[DUPLICATE] Same comment from same user on same post within 60s, skipping');
              continue;
            }

            // Immediately insert a placeholder record to prevent race conditions
            const { error: lockError } = await supabase
              .from('instagram_comment_replies')
              .insert({
                user_id: instagramAccount.user_id,
                instagram_account_id: instagramAccount.id,
                post_id: postId,
                comment_id: commentId,
                comment_text: commentText,
                commenter_instagram_id: commenterId,
                dm_sent: false,
                public_reply_sent: false,
              });

            if (lockError) {
              // If insert fails due to duplicate key, another instance is processing this
              console.log('[DUPLICATE] Lock insert failed, another process is handling this comment:', lockError.message);
              continue;
            }

            console.log('[LOCK] Created lock record for comment:', commentId);

            // Get all active triggers for this account
            const { data: triggers } = await supabase
              .from('instagram_comment_triggers')
              .select('*')
              .eq('instagram_account_id', instagramAccount.id)
              .eq('is_active', true);

            if (!triggers || triggers.length === 0) {
              console.log('No active triggers found for this account');
              continue;
            }

            // Find matching trigger with improved logic
            let matchedTrigger = null;
            console.log('[TRIGGER MATCHING] Checking triggers for comment on post:', postId);
            
            for (const trigger of triggers) {
              console.log('[TRIGGER MATCHING] Checking trigger:', {
                name: trigger.name,
                type: trigger.trigger_type,
                reply_mode: trigger.reply_mode,
                post_id: trigger.post_id,
                has_keywords: !!trigger.trigger_keywords?.length
              });

              // Step 1: Check post_id match if trigger has one
              if (trigger.post_id && trigger.post_id !== postId) {
                console.log('[TRIGGER MATCHING] Skipping - post_id mismatch');
                continue;
              }

              // Step 2: Handle both full_account and keyword trigger types with reply_mode
              if (trigger.trigger_type === 'full_account' || trigger.trigger_type === 'keyword') {
                const replyMode = trigger.reply_mode || 'generic';
                
                // Generic mode - match ALL comments
                if (replyMode === 'generic') {
                  console.log('[TRIGGER MATCHING] Matched - generic reply mode');
                  matchedTrigger = trigger;
                  break;
                }
                
                // AI mode - match ALL comments
                if (replyMode === 'ai') {
                  console.log('[TRIGGER MATCHING] Matched - AI reply mode');
                  matchedTrigger = trigger;
                  break;
                }
                
                // Keyword-based mode - check keywords
                if (replyMode === 'keyword_based') {
                  // Check if we have new keyword_filters structure (multiple filter sets)
                  if (trigger.keyword_filters && Array.isArray(trigger.keyword_filters) && trigger.keyword_filters.length > 0) {
                    console.log('[TRIGGER MATCHING] Using keyword_filters array with', trigger.keyword_filters.length, 'filter sets');
                    
                    for (const filter of trigger.keyword_filters) {
                      if (!filter.keywords) continue;
                      
                      // Handle both array (new) and string (legacy) formats
                      const filterKeywords = Array.isArray(filter.keywords) 
                        ? filter.keywords 
                        : filter.keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
                      const matchType = filter.matchType || 'contains';
                      
                      if (matchesKeyword(
                        commentText,
                        filterKeywords,
                        matchType,
                        trigger.exclude_keywords || []
                      )) {
                        console.log('[TRIGGER MATCHING] Matched filter set with keywords:', filter.keywords);
                        matchedTrigger = { ...trigger, keyword_reply_message: filter.replyMessage };
                        break;
                      }
                    }
                    
                    // If no filter matched but no_match_reply_message exists, use it
                    if (!matchedTrigger && trigger.no_match_reply_message) {
                      console.log('[TRIGGER MATCHING] No keyword match, using no_match_reply_message');
                      matchedTrigger = { ...trigger, keyword_reply_message: trigger.no_match_reply_message };
                    }
                    
                    if (matchedTrigger) break;
                  } else {
                    // Fallback to old trigger_keywords structure for backward compatibility
                    const hasKeywords = trigger.trigger_keywords && trigger.trigger_keywords.length > 0;
                    
                    if (hasKeywords) {
                      if (matchesKeyword(
                        commentText,
                        trigger.trigger_keywords || [],
                        trigger.match_type || 'contains',
                        trigger.exclude_keywords || []
                      )) {
                        console.log('[TRIGGER MATCHING] Matched - keyword match (legacy structure)');
                        matchedTrigger = trigger;
                        break;
                      } else if (trigger.no_match_reply_message) {
                        // No keyword match but no_match_reply_message exists
                        console.log('[TRIGGER MATCHING] No keyword match, using no_match_reply_message (legacy)');
                        matchedTrigger = { ...trigger, keyword_reply_message: trigger.no_match_reply_message };
                        break;
                      } else {
                        console.log('[TRIGGER MATCHING] No keyword match');
                      }
                    } else {
                      // No keywords defined, treat as generic
                      console.log('[TRIGGER MATCHING] Matched - keyword_based with no keywords (treating as generic)');
                      matchedTrigger = trigger;
                      break;
                    }
                  }
                }
              }
            }

            if (matchedTrigger) {
              console.log('Matched trigger:', matchedTrigger.name);

              try {
                // Fetch commenter details
                let commenterName = '';
                try {
                  const userResponse = await fetch(
                    `https://graph.facebook.com/v21.0/${commenterId}?fields=name&access_token=${instagramAccount.access_token}`
                  );
                  const userData = await userResponse.json();
                  commenterName = userData.name || '';
                  console.log('Fetched commenter name:', commenterName);
                } catch (error) {
                  console.error('Failed to fetch commenter details:', error);
                }

                // Process name variables
                let firstName = '';
                let lastName = '';
                if (commenterName) {
                  const nameParts = commenterName.trim().split(' ');
                  firstName = nameParts[0] || '';
                  lastName = nameParts.slice(1).join(' ') || '';
                }

                // Determine the reply message based on reply_mode
                let publicReplyMessage = '';
                const replyMode = matchedTrigger.reply_mode || 'generic';
                
                console.log('[REPLY MESSAGE] Using reply_mode:', replyMode);
                
                if (replyMode === 'generic') {
                  publicReplyMessage = matchedTrigger.generic_message || matchedTrigger.public_reply_message || '';
                  console.log('[REPLY MESSAGE] Using generic_message');
                } else if (replyMode === 'keyword_based') {
                  publicReplyMessage = matchedTrigger.keyword_reply_message || matchedTrigger.public_reply_message || '';
                  console.log('[REPLY MESSAGE] Using keyword_reply_message');
                } else if (replyMode === 'ai') {
                  // AI-generated reply
                  if (matchedTrigger.ai_prompt) {
                    try {
                      // Fetch user's AI configuration
                      const { data: profile } = await supabase
                        .from('profiles')
                        .select('preferred_ai_provider, openai_api_key, gemini_api_key, text_model, max_tokens')
                        .eq('id', instagramAccount.user_id)
                        .single();

                      console.log('[AI CONFIG] Fetched profile:', { 
                        hasProfile: !!profile, 
                        provider: profile?.preferred_ai_provider,
                        hasOpenAI: !!profile?.openai_api_key,
                        hasGemini: !!profile?.gemini_api_key
                      });

                      if (profile && (profile.openai_api_key || profile.gemini_api_key)) {
                        console.log('[REPLY MESSAGE] Generating AI reply with provider:', profile.preferred_ai_provider);
                        
                        const aiPrompt = matchedTrigger.ai_prompt;
                        const userMessage = `Comment from ${commenterName}: "${commentText}"\n\nPlease generate an appropriate reply.`;
                        
                        let aiReply = '';
                        
                        if (profile.preferred_ai_provider === 'openai' && profile.openai_api_key) {
                          const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${profile.openai_api_key}`,
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              model: profile.text_model || 'gpt-4o-mini',
                              messages: [
                                { role: 'system', content: aiPrompt },
                                { role: 'user', content: userMessage }
                              ],
                              max_tokens: profile.max_tokens || 150,
                            }),
                          });
                          
                          if (openaiResponse.ok) {
                            const openaiData = await openaiResponse.json();
                            aiReply = openaiData.choices[0]?.message?.content || '';
                            console.log('[AI REPLY] OpenAI reply generated, length:', aiReply.length);
                          } else {
                            const errorBody = await openaiResponse.text();
                            console.error('[AI REPLY] OpenAI API error:', openaiResponse.status, errorBody);
                          }
                        } else if (profile.preferred_ai_provider === 'gemini' && profile.gemini_api_key) {
                          const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${profile.text_model || 'gemini-pro'}:generateContent?key=${profile.gemini_api_key}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              contents: [{
                                parts: [{
                                  text: `${aiPrompt}\n\n${userMessage}`
                                }]
                              }],
                              generationConfig: {
                                maxOutputTokens: profile.max_tokens || 150,
                              }
                            }),
                          });
                          
                          if (geminiResponse.ok) {
                            const geminiData = await geminiResponse.json();
                            aiReply = geminiData.candidates[0]?.content?.parts[0]?.text || '';
                            console.log('[AI REPLY] Gemini reply generated, length:', aiReply.length);
                          } else {
                            const errorBody = await geminiResponse.text();
                            console.error('[AI REPLY] Gemini API error:', geminiResponse.status, errorBody);
                          }
                        }
                        
                        if (aiReply) {
                          publicReplyMessage = aiReply.trim();
                          console.log('[REPLY MESSAGE] AI reply generated successfully');
                        } else {
                          console.log('[REPLY MESSAGE] Failed to generate AI reply, using fallback');
                          publicReplyMessage = matchedTrigger.public_reply_message || '';
                        }
                      } else {
                        console.log('[REPLY MESSAGE] No API key configured (provider:', profile?.preferred_ai_provider || 'none', '), using fallback');
                        publicReplyMessage = matchedTrigger.public_reply_message || '';
                      }
                    } catch (aiError) {
                      console.error('[REPLY MESSAGE] Error generating AI reply:', aiError);
                      publicReplyMessage = matchedTrigger.public_reply_message || '';
                    }
                  } else {
                    console.log('[REPLY MESSAGE] AI mode enabled but no ai_prompt configured, using fallback');
                    publicReplyMessage = matchedTrigger.public_reply_message || '';
                  }
                }
                
                // Fallback to public_reply_message if specific message is empty
                if (!publicReplyMessage) {
                  publicReplyMessage = matchedTrigger.public_reply_message || '';
                  console.log('[REPLY MESSAGE] Using fallback public_reply_message');
                }

                // Process DM message with variables
                const dmMessage = matchedTrigger.dm_message || matchedTrigger.dm_message_text || '';
                const shouldSendDM = matchedTrigger.send_dm_after_reply && dmMessage;
                
                console.log('[DM CONFIG]', {
                  send_dm_after_reply: matchedTrigger.send_dm_after_reply,
                  has_dm_message: !!dmMessage,
                  dm_conditions: matchedTrigger.dm_conditions,
                  dm_delay: matchedTrigger.dm_delay_seconds
                });
                
                let processedDmMessage = dmMessage;
                
                // Replace @{user} with @username mention (Instagram uses @ mentions in DMs)
                if (processedDmMessage.includes('@{user}') && commenterName) {
                  processedDmMessage = processedDmMessage.replace(/@\{user\}/g, `@${commenterName}`);
                }
                
                // Replace {first_name}
                if (processedDmMessage.includes('{first_name}') && firstName) {
                  processedDmMessage = processedDmMessage.replace(/\{first_name\}/g, firstName);
                }
                
                // Replace {last_name}
                if (processedDmMessage.includes('{last_name}') && lastName) {
                  processedDmMessage = processedDmMessage.replace(/\{last_name\}/g, lastName);
                }

                console.log('[DM] Processed DM message:', processedDmMessage);

                // Send DM to commenter if enabled and conditions met
                let dmSent = false;
                let dmError = null;
                
                if (shouldSendDM) {
                  // Check DM conditions
                  const dmConditions = matchedTrigger.dm_conditions || { always: true };
                  let shouldSend = false;
                  
                  if (dmConditions.always) {
                    shouldSend = true;
                  } else if (dmConditions.keywords && Array.isArray(dmConditions.keywords)) {
                    const commentLower = commentText.toLowerCase();
                    shouldSend = dmConditions.keywords.some((kw: string) => 
                      commentLower.includes(kw.toLowerCase())
                    );
                  } else if (dmConditions.min_comment_length) {
                    shouldSend = commentText.length >= dmConditions.min_comment_length;
                  }
                  
                  console.log('[DM] Should send based on conditions:', shouldSend);
                  
                  if (shouldSend) {
                    try {
                      // Apply delay if configured
                      if (matchedTrigger.dm_delay_seconds && matchedTrigger.dm_delay_seconds > 0) {
                        console.log('[DM] Applying delay:', matchedTrigger.dm_delay_seconds, 'seconds');
                        await new Promise(resolve => setTimeout(resolve, matchedTrigger.dm_delay_seconds * 1000));
                      }
                      
                      await sendInstagramDM(
                        commenterId,
                        processedDmMessage,
                        instagramAccount.access_token
                      );
                      dmSent = true;
                      console.log('[DM] DM sent successfully to commenter:', commenterId);
                    } catch (error: any) {
                      // Instagram requires users to message your account first before you can DM them
                      // Error code 100 with subcode 2018001 means "No matching user found"
                      if (error.message?.includes('No matching user found')) {
                        dmError = 'User must message your account first before receiving DMs';
                        console.log('[DM] Cannot send DM: User has not messaged the account yet');
                      } else {
                        dmError = error.message || 'Unknown DM error';
                        console.error('[DM] Failed to send DM:', error);
                      }
                    }
                  }
                }

                // Send public reply if configured
                let publicReplySent = false;
                if (publicReplyMessage) {
                  try {
                    // Process public reply message with variables
                    let processedPublicReply = publicReplyMessage;
                    
                    // Replace @{user} with @username mention
                    if (processedPublicReply.includes('@{user}') && commenterName) {
                      processedPublicReply = processedPublicReply.replace(/@\{user\}/g, `@${commenterName}`);
                    }
                    
                    // Replace {first_name}
                    if (processedPublicReply.includes('{first_name}') && firstName) {
                      processedPublicReply = processedPublicReply.replace(/\{first_name\}/g, firstName);
                    }
                    
                    // Replace {last_name}
                    if (processedPublicReply.includes('{last_name}') && lastName) {
                      processedPublicReply = processedPublicReply.replace(/\{last_name\}/g, lastName);
                    }

                    console.log('[REPLY] Processed public reply:', processedPublicReply);

                    await replyToComment(
                      commentId,
                      processedPublicReply,
                      instagramAccount.access_token
                    );
                    publicReplySent = true;
                    console.log('[REPLY] Public reply sent successfully to comment:', commentId);
                  } catch (replyError) {
                    console.error('[REPLY] Failed to send public reply:', replyError);
                  }
                }

                // Update the lock record with final status and trigger_id
                await supabase
                  .from('instagram_comment_replies')
                  .update({
                    trigger_id: matchedTrigger.id,
                    dm_sent: dmSent,
                    public_reply_sent: publicReplySent,
                  })
                  .eq('comment_id', commentId);

                console.log('[COMPLETE] Comment automation completed successfully');
              } catch (error) {
                console.error('Error processing comment automation:', error);
              }
            } else {
              console.log('No matching trigger found for comment:', commentText);
            }
          }
        }

        // Process messaging events
        for (const messaging of entry.messaging || []) {
          // Check for postback events
          if (messaging.postback) {
            const senderId = messaging.sender.id;
            const payload = messaging.postback.payload;
            
            // Check for product details postback
            if (payload && payload.startsWith('PRODUCT_DETAILS_')) {
              const payloadParts = payload.replace('PRODUCT_DETAILS_', '').split('_');
              const productId = payloadParts[0];
              const linkType = payloadParts[1] || 'internal'; // 'internal' or 'external'
              console.log('[POSTBACK] Product details request for:', productId, 'Link type:', linkType);
              
              // Fetch product and send details
              const { data: product } = await supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();
              
              if (product) {
                // Fetch store info for custom button text
                const { data: store } = await supabase
                  .from('stores')
                  .select('subdomain, carousel_buy_now_text')
                  .eq('id', product.store_id)
                  .single();

                const { data: variations } = await supabase
                  .from('product_variations')
                  .select('name')
                  .eq('product_id', productId);
                
                const { data: images } = await supabase
                  .from('product_images')
                  .select('url')
                  .eq('product_id', productId)
                  .order('display_order');
                
                const allImages = images?.map((img: any) => img.url) || (product.image_url ? [product.image_url] : []);
                const variationNames = variations?.map((v: any) => v.name) || [];
                
                // Send images
                for (const imageUrl of allImages) {
                  if (imageUrl) {
                    await fetch(
                      `https://graph.facebook.com/v21.0/me/messages?access_token=${instagramAccount.access_token}`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          recipient: { id: senderId },
                          message: {
                            attachment: {
                              type: 'image',
                              payload: { url: imageUrl }
                            }
                          }
                        })
                      }
                    );
                    await new Promise(resolve => setTimeout(resolve, 500));
                  }
                }
                
                // Send details
                const detailsParts = [
                  `📦 ${product.name}`,
                  variationNames.length > 0 ? `Available in: ${variationNames.join(', ')}` : '',
                  `💰 Price: ${product.price}`,
                  product.description || ''
                ].filter(Boolean);
                
                await fetch(
                  `https://graph.facebook.com/v21.0/me/messages?access_token=${instagramAccount.access_token}`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      recipient: { id: senderId },
                      message: { text: detailsParts.join('\n') }
                    })
                  }
                );

                // Send Buy Now button
                const storeUrl = store?.subdomain
                  ? `${Deno.env.get('SITE_URL')}/store/${store.subdomain}`
                  : `${Deno.env.get('SITE_URL')}/store/${product.store_id}`;
                const buyNowUrl = linkType === 'external'
                  ? (product.landing_page_url || `${storeUrl}/product/${productId}`)
                  : `${storeUrl}/product/${productId}`;

                await fetch(
                  `https://graph.facebook.com/v21.0/me/messages?access_token=${instagramAccount.access_token}`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      recipient: { id: senderId },
                      message: {
                        attachment: {
                          type: 'template',
                          payload: {
                            template_type: 'button',
                            text: 'Ready to purchase?',
                            buttons: [{
                              type: 'web_url',
                              title: store?.carousel_buy_now_text || 'Buy Now',
                              url: buyNowUrl
                            }]
                          }
                        }
                      }
                    })
                  }
                );
              }
            }
            continue;
          }
          
          const senderId = messaging.sender.id;
          const recipientId = messaging.recipient.id;

          // Fetch user profile from Instagram Graph API
          let subscriberName = null;
          let subscriberUsername = null;
          let profilePicUrl = null;
          try {
            const userInfoResponse = await fetch(
              `https://graph.facebook.com/v21.0/${senderId}?fields=name,username,profile_pic&access_token=${instagramAccount.access_token}`
            );
            const userInfo = await userInfoResponse.json();
            if (!userInfo.error) {
              subscriberName = userInfo.name || null;
              subscriberUsername = userInfo.username || null;
              profilePicUrl = userInfo.profile_pic || null;
              console.log('[INSTAGRAM-WEBHOOK] Fetched user info:', { senderId, name: subscriberName, username: subscriberUsername, profilePic: profilePicUrl });
            } else {
              console.log('[INSTAGRAM-WEBHOOK] Could not fetch user info:', userInfo.error);
            }
          } catch (e) {
            console.log('[INSTAGRAM-WEBHOOK] Error fetching Instagram user info:', e);
          }

          // Ensure subscriber exists
          const { data: subscriber, error: subscriberError } = await supabase
            .from('instagram_subscribers')
            .upsert({
              user_id: instagramAccount.user_id,
              instagram_account_id: instagramAccount.id,
              subscriber_instagram_id: senderId,
              subscriber_name: subscriberName,
              subscriber_username: subscriberUsername,
              profile_pic_url: profilePicUrl,
              last_interaction_time: new Date().toISOString(),
            }, {
              onConflict: 'instagram_account_id,subscriber_instagram_id'
            })
            .select()
            .single();

          if (subscriberError) {
            console.error('Error upserting subscriber:', subscriberError);
            continue;
          }

          // Ensure conversation exists
          const { data: conversation, error: conversationError } = await supabase
            .from('instagram_conversations')
            .upsert({
              user_id: instagramAccount.user_id,
              instagram_account_id: instagramAccount.id,
              subscriber_id: subscriber.id,
              last_message_at: new Date().toISOString(),
            }, {
              onConflict: 'instagram_account_id,subscriber_id'
            })
            .select()
            .single();

          if (conversationError) {
            console.error('Error upserting conversation:', conversationError);
            continue;
          }

          // Process message
          if (messaging.message && !messaging.message.is_echo) {
            const messageText = messaging.message.text || '[Attachment]';
            
            // Save incoming message
            await supabase
              .from('instagram_messages')
              .insert({
                conversation_id: conversation.id,
                instagram_message_id: messaging.message.mid,
                message_text: messageText,
                sender_type: 'subscriber',
                attachment_type: messaging.message.attachments?.[0]?.type,
                attachment_url: messaging.message.attachments?.[0]?.payload?.url,
              });

            // Update conversation
            await supabase
              .from('instagram_conversations')
              .update({
                last_message_text: messageText,
                last_message_at: new Date().toISOString(),
                unread_count: (conversation.unread_count || 0) + 1,
              })
              .eq('id', conversation.id);

            console.log('Instagram message saved:', messageText);

            // Check for flow triggers
            if (messaging.message.text) {
              const { data: flows } = await supabase
                .from('instagram_chatbot_flows')
                .select('*')
                .eq('instagram_account_id', instagramAccount.id)
                .eq('is_active', true);

              if (flows && flows.length > 0) {
                let matchedFlow = null;

                for (const flow of flows) {
                  if (!flow.trigger_keyword) {
                    // No keyword means trigger on any message
                    matchedFlow = flow;
                    break;
                  }

                  const messageTextLower = messaging.message.text.toLowerCase();
                  const triggerKeywordLower = flow.trigger_keyword.toLowerCase();

                  switch (flow.match_type) {
                    case 'exact':
                      if (messageTextLower === triggerKeywordLower) {
                        matchedFlow = flow;
                      }
                      break;
                    case 'contains':
                      if (messageTextLower.includes(triggerKeywordLower)) {
                        matchedFlow = flow;
                      }
                      break;
                    case 'starts_with':
                      if (messageTextLower.startsWith(triggerKeywordLower)) {
                        matchedFlow = flow;
                      }
                      break;
                  }

                  if (matchedFlow) break;
                }

                if (matchedFlow) {
                  console.log('Matched flow:', matchedFlow.name);
                  
                  try {
                    // Invoke execute-instagram-flow function
                    const response = await fetch(
                      `${Deno.env.get('SUPABASE_URL')}/functions/v1/execute-instagram-flow`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                        },
                        body: JSON.stringify({
                          flowId: matchedFlow.id,
                          subscriberInstagramId: senderId,
                          accessToken: instagramAccount.access_token,
                          conversationId: conversation.id
                        })
                      }
                    );

                    const result = await response.json();
                    console.log('Flow execution result:', result);
                  } catch (flowError) {
                    console.error('Error executing flow:', flowError);
                  }
                }
              }
            }
          }

          // Process message unsend events
          if (messaging.message?.is_deleted) {
            console.log('Instagram message unsent:', messaging.message);
            
            // Get the original message from our database
            const { data: originalMessage } = await supabase
              .from('instagram_messages')
              .select('*')
              .eq('instagram_message_id', messaging.message.mid)
              .single();

            if (originalMessage) {
              // Get subscriber info
              const { data: subscriberInfo } = await supabase
                .from('instagram_subscribers')
                .select('subscriber_name, subscriber_username')
                .eq('id', subscriber.id)
                .single();

              // Store the unsent message
              await supabase
                .from('instagram_unsent_messages')
                .insert({
                  user_id: instagramAccount.user_id,
                  instagram_account_id: instagramAccount.id,
                  sender_instagram_id: senderId,
                  sender_name: subscriberInfo?.subscriber_name || subscriberInfo?.subscriber_username || 'Unknown',
                  message_text: originalMessage.message_text,
                  original_message_id: messaging.message.mid,
                  conversation_id: conversation.id,
                });

              console.log('Unsent message saved:', originalMessage.message_text);

              // Check for active auto-reply template
              const { data: activeTemplate } = await supabase
                .from('instagram_unsent_reply_templates')
                .select('*')
                .eq('instagram_account_id', instagramAccount.id)
                .eq('is_active', true)
                .limit(1)
                .single();

              if (activeTemplate) {
                try {
                  await sendInstagramDM(
                    senderId,
                    activeTemplate.reply_message,
                    instagramAccount.access_token
                  );
                  console.log('Auto-reply sent for unsent message to:', senderId);
                } catch (error: any) {
                  console.error('Failed to send auto-reply for unsent message:', error);
                }
              }
            }
          }

          // Process postbacks
          if (messaging.postback) {
            console.log('Instagram postback received:', messaging.postback);
            
            await supabase
              .from('instagram_messages')
              .insert({
                conversation_id: conversation.id,
                message_text: messaging.postback.title || messaging.postback.payload,
                sender_type: 'subscriber',
              });
          }

          // Process story mentions and replies
          const hasStoryReply = messaging.message?.reply_to?.story;
          const hasStoryMention = messaging.message?.attachments?.some(
            (att: any) => att.type === 'story_mention'
          );

          if (hasStoryReply || hasStoryMention) {
            const storyId = messaging.message?.reply_to?.story?.id || 
                           messaging.message?.attachments?.find((att: any) => att.type === 'story_mention')?.payload?.url;
            const replyText = messaging.message?.text || '';
            const replierId = senderId;
            const isStoryMention = hasStoryMention;

            if (isStoryMention) {
              console.log('Story mention received:', { storyId, replierId });
            } else {
              console.log('Story reply received:', { storyId, replyText, replierId });
            }

            // Get active story triggers
            const { data: storyTriggers } = await supabase
              .from('instagram_story_triggers')
              .select('*')
              .eq('instagram_account_id', instagramAccount.id)
              .eq('is_active', true);

            if (storyTriggers && storyTriggers.length > 0) {
              for (const trigger of storyTriggers) {
                let shouldTrigger = false;

                if (isStoryMention && trigger.trigger_type === 'story_mentions') {
                  shouldTrigger = true;
                } else if (!isStoryMention && trigger.trigger_type === 'all_story_replies') {
                  shouldTrigger = true;
                }

                if (shouldTrigger) {
                  console.log('Matched story trigger:', trigger.name);

                  // Send DM
                  let dmSent = false;
                  try {
                    await sendInstagramDM(
                      replierId,
                      trigger.dm_message,
                      instagramAccount.access_token
                    );
                    dmSent = true;
                    console.log(`Story ${isStoryMention ? 'mention' : 'reply'} DM sent to:`, replierId);
                  } catch (error: any) {
                    console.error(`Failed to send story ${isStoryMention ? 'mention' : 'reply'} DM:`, error);
                  }

                  // Log the story reply/mention
                  await supabase
                    .from('instagram_story_replies')
                    .insert({
                      user_id: instagramAccount.user_id,
                      instagram_account_id: instagramAccount.id,
                      trigger_id: trigger.id,
                      story_id: storyId,
                      reply_text: isStoryMention ? '@mention' : replyText,
                      reply_type: isStoryMention ? 'story_mention' : 'story_reply',
                      replier_instagram_id: replierId,
                      dm_sent: dmSent,
                    });

                  break; // Only trigger first matching automation
                }
              }
            }
          }
        }

        // Process story mentions from changes
        for (const change of entry.changes || []) {
          if (change.field === 'story_mentions') {
            const value = change.value;
            const mentionId = value.id;
            const storyId = value.media?.id;
            const mentionerId = value.from?.id;

            console.log('Story mention received:', { mentionId, storyId, mentionerId });

            // Get active story triggers
            const { data: storyTriggers } = await supabase
              .from('instagram_story_triggers')
              .select('*')
              .eq('instagram_account_id', instagramAccount.id)
              .eq('is_active', true)
              .in('trigger_type', ['all_story_replies', 'story_mentions']);

            if (storyTriggers && storyTriggers.length > 0) {
              const trigger = storyTriggers[0];
              console.log('Matched story mention trigger:', trigger.name);

              // Send DM
              let dmSent = false;
              try {
                await sendInstagramDM(
                  mentionerId,
                  trigger.dm_message,
                  instagramAccount.access_token
                );
                dmSent = true;
                console.log('Story mention DM sent to:', mentionerId);
              } catch (error: any) {
                console.error('Failed to send story mention DM:', error);
              }

              // Log the story mention
              await supabase
                .from('instagram_story_replies')
                .insert({
                  user_id: instagramAccount.user_id,
                  instagram_account_id: instagramAccount.id,
                  trigger_id: trigger.id,
                  story_id: storyId,
                  reply_text: '@mention',
                  reply_type: 'story_mention',
                  replier_instagram_id: mentionerId,
                  dm_sent: dmSent,
                });
            }
          }

        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error: any) {
    console.error('Error in instagram-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
