import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Configuration Check:');
console.log('URL:', supabaseUrl ? '✅ Configured' : '❌ Missing');
console.log('Key:', supabaseAnonKey ? '✅ Configured' : '❌ Missing');

// Create Supabase client
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce'
      },
      global: {
        headers: {
          'X-Client-Info': 'innovatex-labs-crm'
        }
      }
    })
  : null;

if (supabase) {
  console.log('✅ Supabase client created successfully');
} else {
  console.log('❌ Supabase client not created - missing configuration');
}