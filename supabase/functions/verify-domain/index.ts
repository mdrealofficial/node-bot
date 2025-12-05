import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user from the authorization header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { storeId, domain } = await req.json();
    console.log('Verifying domain:', domain, 'for store:', storeId);

    if (!domain || !storeId) {
      return new Response(
        JSON.stringify({ error: 'Missing domain or store ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this store
    const { data: store, error: storeError } = await supabaseClient
      .from('stores')
      .select('id, user_id')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    if (storeError || !store) {
      console.error('Store not found or unauthorized:', storeError);
      return new Response(
        JSON.stringify({ error: 'Store not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the app's domain from the request origin or environment
    const appDomain = new URL(req.headers.get('origin') || Deno.env.get('SUPABASE_URL') || '').hostname;
    console.log('App domain:', appDomain);

    // Use DNS over HTTPS (Google Public DNS) to check domain resolution
    const dnsQuery = `https://dns.google/resolve?name=${domain}&type=A`;
    console.log('Checking DNS:', dnsQuery);
    
    let verified = false;
    let diagnostics = {
      hasARecord: false,
      hasCNAME: false,
      aRecords: [] as string[],
      cnameRecords: [] as string[],
      propagated: false,
      errors: [] as string[],
    };

    try {
      // Check A records
      const dnsResponse = await fetch(dnsQuery);
      const dnsData = await dnsResponse.json();
      console.log('DNS A record response:', JSON.stringify(dnsData));

      if (dnsData.Status === 0 && dnsData.Answer) {
        diagnostics.hasARecord = true;
        diagnostics.aRecords = dnsData.Answer
          .filter((a: any) => a.type === 1) // Type 1 is A record
          .map((a: any) => a.data);
        
        if (diagnostics.aRecords.length > 0) {
          verified = true;
          diagnostics.propagated = true;
          console.log('Domain verification successful - A records found:', diagnostics.aRecords);
        }
      } else if (dnsData.Status === 3) {
        diagnostics.errors.push('Domain does not exist (NXDOMAIN)');
      } else if (dnsData.Status !== 0) {
        diagnostics.errors.push(`DNS query failed with status ${dnsData.Status}`);
      }
    } catch (dnsError) {
      console.error('DNS A record lookup error:', dnsError);
      diagnostics.errors.push('Failed to query A records');
    }

    // Check CNAME records as fallback
    try {
      const cnameQuery = `https://dns.google/resolve?name=${domain}&type=CNAME`;
      const cnameResponse = await fetch(cnameQuery);
      const cnameData = await cnameResponse.json();
      console.log('DNS CNAME response:', JSON.stringify(cnameData));
      
      if (cnameData.Status === 0 && cnameData.Answer) {
        diagnostics.hasCNAME = true;
        diagnostics.cnameRecords = cnameData.Answer
          .filter((a: any) => a.type === 5) // Type 5 is CNAME
          .map((a: any) => a.data);
        
        if (diagnostics.cnameRecords.length > 0 && !verified) {
          verified = true;
          diagnostics.propagated = true;
          console.log('Domain verification successful - CNAME records found:', diagnostics.cnameRecords);
        }
      }
    } catch (cnameError) {
      console.error('CNAME lookup error:', cnameError);
      diagnostics.errors.push('Failed to query CNAME records');
    }

    // Generate helpful feedback messages
    let feedbackMessages = [];
    
    if (!diagnostics.hasARecord && !diagnostics.hasCNAME) {
      feedbackMessages.push('No DNS records found. Please add an A record or CNAME record pointing to this application.');
    } else if (!verified) {
      if (diagnostics.hasARecord && diagnostics.aRecords.length === 0) {
        feedbackMessages.push('A record found but no IP address returned.');
      }
      if (diagnostics.hasCNAME && diagnostics.cnameRecords.length === 0) {
        feedbackMessages.push('CNAME record found but no target returned.');
      }
    }

    if (diagnostics.errors.length > 0) {
      feedbackMessages.push(...diagnostics.errors);
    }

    if (!diagnostics.propagated && (diagnostics.hasARecord || diagnostics.hasCNAME)) {
      feedbackMessages.push('DNS records may still be propagating. This can take up to 48 hours.');
    }

    if (verified) {
      // Update store with verification status
      const { error: updateError } = await supabaseClient
        .from('stores')
        .update({
          custom_domain_verified: true,
          custom_domain_verified_at: new Date().toISOString(),
        })
        .eq('id', storeId);

      if (updateError) {
        console.error('Failed to update store:', updateError);
        throw updateError;
      }

      console.log('Domain verified and store updated successfully');
      return new Response(
        JSON.stringify({ 
          success: true, 
          verified: true,
          message: 'Domain verified successfully! SSL certificate will be provisioned automatically.',
          diagnostics: {
            ...diagnostics,
            recommendation: 'Your domain is properly configured and pointing to this application.'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('Domain not verified - DNS records not properly configured');
      
      // Build detailed recommendation based on diagnostics
      let recommendation = '';
      if (!diagnostics.hasARecord && !diagnostics.hasCNAME) {
        recommendation = 'Add either an A record pointing to your app\'s IP address or a CNAME record pointing to your app\'s domain.';
      } else if (diagnostics.hasARecord && diagnostics.aRecords.length === 0) {
        recommendation = 'Your A record is configured but not returning a valid IP address. Check your DNS provider settings.';
      } else if (diagnostics.hasCNAME && diagnostics.cnameRecords.length === 0) {
        recommendation = 'Your CNAME record is configured but not returning a valid target. Check your DNS provider settings.';
      } else if (!diagnostics.propagated) {
        recommendation = 'Your DNS records are configured but may still be propagating. Wait up to 48 hours and try again.';
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          verified: false,
          message: feedbackMessages.length > 0 ? feedbackMessages.join(' ') : 'Domain DNS records not properly configured.',
          diagnostics: {
            ...diagnostics,
            recommendation,
            feedback: feedbackMessages
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error verifying domain:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
