import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationConfig {
  targetUrl: string;
  targetAnonKey: string;
  targetServiceKey: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { targetUrl, targetAnonKey, targetServiceKey } = await req.json() as MigrationConfig;

    if (!targetUrl || !targetAnonKey || !targetServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sourceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const targetSupabase = createClient(targetUrl, targetServiceKey);

    const migrationLog: string[] = [];
    let progressInfo = {
      current: 0,
      total: 0,
      stage: '',
      percentage: 0,
      currentItem: ''
    };

    const addLog = (message: string) => {
      console.log(message);
      migrationLog.push(message);
    };

    addLog('🚀 Starting automatic migration...');
    addLog('📍 Migration initiated');
    addLog('');

    const tables = [
      'admin_config', 'profiles', 'user_roles', 'user_settings',
      'facebook_pages', 'instagram_accounts', 'tiktok_accounts',
      'subscribers', 'instagram_subscribers', 'tiktok_subscribers',
      'chatbot_flows', 'instagram_chatbot_flows',
      'comment_reply_templates', 'instagram_comment_triggers',
      'instagram_story_triggers', 'instagram_follow_triggers',
      'message_templates', 'conversations', 'instagram_conversations',
      'tiktok_conversations', 'messages', 'instagram_messages',
      'tiktok_messages', 'flow_executions', 'instagram_flow_executions',
      'node_executions', 'instagram_node_executions',
      'flow_user_inputs', 'instagram_flow_user_inputs', 'flow_versions',
      'comment_replies', 'instagram_comment_replies',
      'instagram_story_replies', 'instagram_follow_dms',
      'stores', 'products', 'categories', 'product_images',
      'product_variations', 'product_attributes', 'product_attribute_values',
      'orders', 'order_items', 'coupons', 'payment_transactions',
      'subscriptions', 'token_usage_history', 'backups'
    ];

    // ===== STEP 0: Schema Validation =====
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    addLog('📋 STEP 0: Validating schema compatibility...');
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    addLog('');

    progressInfo.stage = 'Schema Validation';
    progressInfo.total = tables.length;
    let existingCount = 0;
    const missingTables: string[] = [];

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      progressInfo.current = i + 1;
      progressInfo.currentItem = table;
      progressInfo.percentage = ((i + 1) / tables.length) * 30;

      try {
        addLog(`🔍 Checking: ${table}`);

        // Check if table exists on target
        const { error: checkError } = await targetSupabase
          .from(table)
          .select('id')
          .limit(1);

        if (!checkError) {
          addLog(`  ✅ Table exists`);
          existingCount++;
        } else {
          addLog(`  ⚠️  Table missing - needs manual creation`);
          missingTables.push(table);
        }
        addLog('');
      } catch (error: any) {
        addLog(`  ❌ Error: ${error.message}`);
        missingTables.push(table);
        addLog('');
      }
    }

    addLog(`📊 Schema: ${existingCount} existing, ${missingTables.length} missing`);
    
    if (missingTables.length > 0) {
      addLog('');
      addLog('⚠️  MANUAL SCHEMA SETUP REQUIRED');
      addLog('The following tables need to be created manually on the target:');
      missingTables.forEach(t => addLog(`   - ${t}`));
      addLog('');
      addLog('Please run your migrations on the target project first,');
      addLog('then retry this data migration.');
    }
    addLog('');

    // ===== STEP 1: Data Migration =====
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    addLog('📦 STEP 1: Migrating data...');
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    addLog('');

    progressInfo.stage = 'Data Migration';
    let migratedTables = 0;
    let totalRows = 0;

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];

      if (missingTables.includes(table)) {
        addLog(`  ⏭️  Skipping ${table} (table missing on target)`);
        continue;
      }

      try {
        progressInfo.current = i + 1;
        progressInfo.currentItem = table;
        progressInfo.percentage = 30 + ((i + 1) / tables.length) * 30;

        addLog(`📥 Migrating: ${table}`);

        const { data, error: fetchError } = await sourceSupabase
          .from(table)
          .select('*');

        if (fetchError) {
          addLog(`  ⚠️  Fetch error: ${fetchError.message}`);
          addLog('');
          continue;
        }

        if (!data || data.length === 0) {
          addLog(`  ℹ️  No data`);
          addLog('');
          continue;
        }

        addLog(`  📋 Found ${data.length} rows`);

        // Insert in batches
        const batchSize = 100;
        let inserted = 0;
        for (let j = 0; j < data.length; j += batchSize) {
          const batch = data.slice(j, j + batchSize);
          
          const { error: insertError } = await targetSupabase
            .from(table)
            .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

          if (!insertError) {
            inserted += batch.length;
          } else {
            addLog(`  ⚠️  Batch error: ${insertError.message.substring(0, 100)}`);
          }
        }

        addLog(`  ✅ Inserted ${inserted}/${data.length} rows`);
        migratedTables++;
        totalRows += inserted;
        addLog('');

      } catch (error: any) {
        addLog(`  ❌ Error: ${error.message}`);
        addLog('');
      }
    }

    addLog(`📊 Data: ${migratedTables} tables, ${totalRows} rows migrated`);
    addLog('');

    // ===== STEP 2: Storage Migration =====
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    addLog('💾 STEP 2: Migrating storage...');
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    addLog('');

    const buckets = ['chat-attachments', 'store-assets', 'products', 'flow-images'];
    progressInfo.stage = 'Storage Migration';
    progressInfo.total = buckets.length;
    let migratedBuckets = 0;
    let totalFiles = 0;

    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];

      try {
        progressInfo.current = i + 1;
        progressInfo.currentItem = bucket;
        progressInfo.percentage = 60 + ((i + 1) / buckets.length) * 40;

        addLog(`🗂️  Bucket: ${bucket}`);

        // List files
        const { data: files, error: listError } = await sourceSupabase
          .storage
          .from(bucket)
          .list();

        if (listError) {
          addLog(`  ⚠️  List error: ${listError.message}`);
          addLog('');
          continue;
        }

        if (!files || files.length === 0) {
          addLog(`  ℹ️  No files`);
          addLog('');
          continue;
        }

        addLog(`  📋 Found ${files.length} files`);

        // Create bucket on target
        const { error: createError } = await targetSupabase
          .storage
          .createBucket(bucket, { public: true });

        if (createError && !createError.message.includes('already exists')) {
          addLog(`  ⚠️  Create error: ${createError.message}`);
          addLog('');
          continue;
        }

        addLog(`  ✅ Bucket ready`);

        // Transfer files
        let uploaded = 0;
        for (const file of files) {
          if (file.name === '.emptyFolderPlaceholder') continue;

          try {
            const { data: fileData } = await sourceSupabase
              .storage
              .from(bucket)
              .download(file.name);

            if (fileData) {
              await targetSupabase
                .storage
                .from(bucket)
                .upload(file.name, fileData, { upsert: true });
              
              uploaded++;
            }
          } catch {
            // Continue on file errors
          }
        }

        addLog(`  ✅ Uploaded ${uploaded}/${files.length} files`);
        migratedBuckets++;
        totalFiles += uploaded;
        addLog('');

      } catch (error: any) {
        addLog(`  ❌ Error: ${error.message}`);
        addLog('');
      }
    }

    addLog(`💾 Storage: ${migratedBuckets} buckets, ${totalFiles} files`);
    addLog('');

    // ===== SUMMARY =====
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    addLog('✨ MIGRATION COMPLETE');
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    addLog(`📊 Schema: ${existingCount}/${tables.length} tables ready`);
    addLog(`✅ Data: ${migratedTables} tables, ${totalRows} rows`);
    addLog(`✅ Storage: ${migratedBuckets} buckets, ${totalFiles} files`);
    
    if (missingTables.length > 0) {
      addLog('');
      addLog(`⚠️  ${missingTables.length} tables need manual setup:`);
      missingTables.forEach((t: string) => addLog(`   - ${t}`));
    }

    return new Response(
      JSON.stringify({
        success: missingTables.length === 0,
        summary: {
          schema: `${existingCount}/${tables.length}`,
          data: `${migratedTables} tables, ${totalRows} rows`,
          storage: `${migratedBuckets} buckets, ${totalFiles} files`,
          missing: missingTables
        },
        logs: migrationLog
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: error.message, details: error.toString() }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// SQL execution removed for security - schema must be created manually via migrations
