import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const AuthTest: React.FC = () => {
  const { authState, signIn, signOut } = useAuth();
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('password123');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    // Check if Supabase is configured
    const checkSupabase = async () => {
      try {
        if (!supabase) {
          setSupabaseStatus('error');
          return;
        }
        
        const { data, error } = await supabase.from('permissions').select('count');
        if (error) {
          console.error('Supabase connection test error:', error);
          setSupabaseStatus('error');
        } else {
          console.log('Supabase connection test success:', data);
          setSupabaseStatus('connected');
        }
      } catch (err) {
        console.error('Supabase connection test exception:', err);
        setSupabaseStatus('error');
      }
    };
    
    checkSupabase();
  }, []);

  const handleTestSignIn = async () => {
    setTestResult(null);
    try {
      const result = await signIn(testEmail, testPassword);
      if (result.error) {
        setTestResult(`Sign in failed: ${result.error.message}`);
      } else {
        setTestResult('Sign in successful!');
      }
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-8 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Authentication Test</h2>
      
      <div className="mb-6 p-4 rounded-lg bg-neutral-50">
        <h3 className="font-semibold mb-2">Current Auth State:</h3>
        <div className="space-y-1 text-sm">
          <p><span className="font-medium">Loading:</span> {authState.loading ? 'Yes' : 'No'}</p>
          <p><span className="font-medium">User:</span> {authState.user ? authState.user.email : 'Not logged in'}</p>
          <p><span className="font-medium">Role:</span> {authState.user?.role || 'N/A'}</p>
          <p><span className="font-medium">Error:</span> {authState.error || 'None'}</p>
          <p><span className="font-medium">Bootstrap Needed:</span> {authState.needsBootstrap ? 'Yes' : 'No'}</p>
          <p><span className="font-medium">Workspace ID:</span> {authState.currentWorkspaceId || 'None'}</p>
        </div>
      </div>
      
      <div className="mb-6 p-4 rounded-lg bg-neutral-50">
        <h3 className="font-semibold mb-2">Supabase Connection:</h3>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            supabaseStatus === 'checking' ? 'bg-yellow-500' :
            supabaseStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span>{
            supabaseStatus === 'checking' ? 'Checking connection...' :
            supabaseStatus === 'connected' ? 'Connected to Supabase' : 'Connection error'
          }</span>
        </div>
        <div className="mt-2 text-xs text-neutral-500">
          <p>URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Configured' : '❌ Missing'}</p>
          <p>Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Configured' : '❌ Missing'}</p>
        </div>
      </div>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Test Email</label>
          <input 
            type="email" 
            value={testEmail} 
            onChange={(e) => setTestEmail(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Test Password</label>
          <input 
            type="password" 
            value={testPassword} 
            onChange={(e) => setTestPassword(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
          />
        </div>
      </div>
      
      <div className="flex space-x-3">
        <button 
          onClick={handleTestSignIn}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          disabled={authState.loading}
        >
          Test Sign In
        </button>
        <button 
          onClick={signOut}
          className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300"
          disabled={authState.loading || !authState.user}
        >
          Test Sign Out
        </button>
      </div>
      
      {testResult && (
        <div className={`mt-4 p-3 rounded-lg ${
          testResult.includes('successful') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {testResult}
        </div>
      )}
    </div>
  );
};

export default AuthTest;