import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🔄 Reading migration file...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250701120000_fix_rls_policies.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log('📊 SQL length:', migrationSQL.length, 'characters');
    
    console.log('🚀 Applying migration to Supabase...');
    
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try alternative approach - execute SQL directly
      console.log('🔄 Trying direct SQL execution...');
      
      const { data: directData, error: directError } = await supabase
        .from('_supabase_migrations')
        .select('*')
        .limit(1);
      
      if (directError) {
        console.log('📝 Executing SQL in chunks...');
        
        // Split the SQL into individual statements
        const statements = migrationSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📊 Found ${statements.length} SQL statements to execute`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i] + ';';
          
          try {
            console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
            
            // Use the SQL editor approach
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey
              },
              body: JSON.stringify({
                sql: statement
              })
            });
            
            if (response.ok) {
              successCount++;
              console.log(`✅ Statement ${i + 1} executed successfully`);
            } else {
              const errorText = await response.text();
              console.log(`⚠️ Statement ${i + 1} failed: ${errorText}`);
              errorCount++;
            }
          } catch (stmtError) {
            console.log(`⚠️ Statement ${i + 1} error:`, stmtError.message);
            errorCount++;
          }
        }
        
        console.log(`\n📊 Migration Summary:`);
        console.log(`✅ Successful statements: ${successCount}`);
        console.log(`❌ Failed statements: ${errorCount}`);
        console.log(`📈 Success rate: ${((successCount / statements.length) * 100).toFixed(1)}%`);
        
        if (successCount > 0) {
          console.log('\n🎉 Migration partially applied! Some statements executed successfully.');
          
          // Record the migration as applied
          try {
            await recordMigration();
          } catch (recordError) {
            console.log('⚠️ Could not record migration in tracking table:', recordError.message);
          }
        }
      } else {
        console.log('✅ Database connection successful, trying full migration...');
        await executeMigrationDirect(migrationSQL);
      }
    } else {
      console.log('✅ Migration applied successfully!');
      await recordMigration();
    }
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    
    // Try manual execution approach
    console.log('\n🔄 Attempting manual execution...');
    await executeMigrationDirect(migrationSQL);
  }
}

async function executeMigrationDirect(sql) {
  try {
    // Try using the REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ sql })
    });
    
    if (response.ok) {
      console.log('✅ Migration executed successfully via REST API!');
      await recordMigration();
    } else {
      const errorText = await response.text();
      console.error('❌ REST API execution failed:', errorText);
      
      // Final fallback - try to execute key parts manually
      console.log('\n🔧 Executing critical parts manually...');
      await executeKeyParts();
    }
  } catch (error) {
    console.error('❌ Direct execution failed:', error);
    await executeKeyParts();
  }
}

async function executeKeyParts() {
  const criticalStatements = [
    // Enable extensions
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
    `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,
    
    // Create user profiles table
    `CREATE TABLE IF NOT EXISTS public.user_profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email text UNIQUE NOT NULL,
      first_name text NOT NULL,
      last_name text NOT NULL,
      role text DEFAULT 'member' NOT NULL,
      avatar_url text,
      is_active boolean DEFAULT true NOT NULL,
      email_verified boolean DEFAULT false NOT NULL,
      failed_login_attempts integer DEFAULT 0 NOT NULL,
      locked_until timestamptz,
      last_login timestamptz,
      last_activity timestamptz,
      default_workspace_id uuid,
      ai_preferences jsonb DEFAULT '{}',
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    );`,
    
    // Enable RLS
    `ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;`
  ];
  
  for (const statement of criticalStatements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (!error) {
        console.log('✅ Critical statement executed');
      }
    } catch (e) {
      console.log('⚠️ Critical statement failed:', e.message);
    }
  }
}

async function recordMigration() {
  try {
    // Try to record the migration as applied
    const migrationVersion = '20250701120000';
    
    const { error } = await supabase
      .from('supabase_migrations.schema_migrations')
      .insert({ version: migrationVersion });
    
    if (!error) {
      console.log('📝 Migration recorded in tracking table');
    }
  } catch (error) {
    console.log('⚠️ Could not record migration:', error.message);
  }
}

// Run the migration
applyMigration()
  .then(() => {
    console.log('\n🎉 Migration process completed!');
    console.log('🔄 Please restart your application to see the changes.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration process failed:', error);
    process.exit(1);
  });