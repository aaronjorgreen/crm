import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Button from './ui/Button';
import { AlertTriangle, CheckCircle, RefreshCw, Database, Wifi } from 'lucide-react';

const SupabaseDiagnostic: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<{
    configCheck: 'pending' | 'success' | 'error';
    connectionCheck: 'pending' | 'success' | 'error';
    authCheck: 'pending' | 'success' | 'error';
    databaseCheck: 'pending' | 'success' | 'error';
    details: string[];
    errors: string[];
  }>({
    configCheck: 'pending',
    connectionCheck: 'pending',
    authCheck: 'pending',
    databaseCheck: 'pending',
    details: [],
    errors: []
  });

  const [running, setRunning] = useState(false);

  const addDetail = (detail: string) => {
    setDiagnostics(prev => ({
      ...prev,
      details: [...prev.details, `${new Date().toLocaleTimeString()}: ${detail}`]
    }));
  };

  const addError = (error: string) => {
    setDiagnostics(prev => ({
      ...prev,
      errors: [...prev.errors, `${new Date().toLocaleTimeString()}: ${error}`]
    }));
  };

  const runDiagnostics = async () => {
    setRunning(true);
    setDiagnostics({
      configCheck: 'pending',
      connectionCheck: 'pending',
      authCheck: 'pending',
      databaseCheck: 'pending',
      details: [],
      errors: []
    });

    try {
      // 1. Configuration Check
      addDetail('Checking Supabase configuration...');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        setDiagnostics(prev => ({ ...prev, configCheck: 'error' }));
        addError('Missing Supabase URL or Key in environment variables');
        return;
      }
      
      if (!supabase) {
        setDiagnostics(prev => ({ ...prev, configCheck: 'error' }));
        addError('Supabase client not initialized');
        return;
      }
      
      setDiagnostics(prev => ({ ...prev, configCheck: 'success' }));
      addDetail(`✅ Config OK - URL: ${supabaseUrl.substring(0, 30)}...`);

      // 2. Basic Connection Check
      addDetail('Testing basic connection to Supabase...');
      try {
        const connectionPromise = fetch(supabaseUrl + '/rest/v1/', {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        );
        
        const response = await Promise.race([connectionPromise, timeoutPromise]) as Response;
        
        if (response.ok || response.status === 401) { // 401 is expected without proper auth
          setDiagnostics(prev => ({ ...prev, connectionCheck: 'success' }));
          addDetail(`✅ Connection OK - Status: ${response.status}`);
        } else {
          setDiagnostics(prev => ({ ...prev, connectionCheck: 'error' }));
          addError(`Connection failed - Status: ${response.status}`);
          return;
        }
      } catch (connErr: any) {
        setDiagnostics(prev => ({ ...prev, connectionCheck: 'error' }));
        addError(`Connection error: ${connErr.message}`);
        return;
      }

      // 3. Auth Service Check
      addDetail('Testing Supabase Auth service...');
      try {
        const authPromise = supabase.auth.getSession();
        const authTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 8000)
        );
        
        const { data, error } = await Promise.race([authPromise, authTimeoutPromise]) as any;
        
        if (error) {
          setDiagnostics(prev => ({ ...prev, authCheck: 'error' }));
          addError(`Auth service error: ${error.message}`);
        } else {
          setDiagnostics(prev => ({ ...prev, authCheck: 'success' }));
          addDetail(`✅ Auth service OK - Session: ${data.session ? 'Active' : 'None'}`);
        }
      } catch (authErr: any) {
        setDiagnostics(prev => ({ ...prev, authCheck: 'error' }));
        addError(`Auth service timeout: ${authErr.message}`);
      }

      // 4. Database Check
      addDetail('Testing database access...');
      try {
        const dbPromise = supabase
          .from('user_profiles')
          .select('count')
          .limit(1);
        
        const dbTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 8000)
        );
        
        const { data, error } = await Promise.race([dbPromise, dbTimeoutPromise]) as any;
        
        if (error) {
          setDiagnostics(prev => ({ ...prev, databaseCheck: 'error' }));
          addError(`Database error: ${error.message} (Code: ${error.code})`);
        } else {
          setDiagnostics(prev => ({ ...prev, databaseCheck: 'success' }));
          addDetail(`✅ Database OK - Query successful`);
        }
      } catch (dbErr: any) {
        setDiagnostics(prev => ({ ...prev, databaseCheck: 'error' }));
        addError(`Database timeout: ${dbErr.message}`);
      }

    } catch (err: any) {
      addError(`Diagnostic error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Database className="h-8 w-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-neutral-900">Supabase Connection Diagnostic</h1>
          </div>
          <p className="text-neutral-600">Testing connection to your Supabase project...</p>
        </div>

        {/* Diagnostic Results */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neutral-900">Connection Tests</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={runDiagnostics}
                loading={running}
                icon={RefreshCw}
              >
                Run Again
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Test Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-4 rounded-lg border border-neutral-200">
                {getStatusIcon(diagnostics.configCheck)}
                <div>
                  <div className={`font-semibold ${getStatusColor(diagnostics.configCheck)}`}>
                    Configuration Check
                  </div>
                  <div className="text-sm text-neutral-600">Environment variables</div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 rounded-lg border border-neutral-200">
                {getStatusIcon(diagnostics.connectionCheck)}
                <div>
                  <div className={`font-semibold ${getStatusColor(diagnostics.connectionCheck)}`}>
                    Network Connection
                  </div>
                  <div className="text-sm text-neutral-600">HTTP connectivity</div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 rounded-lg border border-neutral-200">
                {getStatusIcon(diagnostics.authCheck)}
                <div>
                  <div className={`font-semibold ${getStatusColor(diagnostics.authCheck)}`}>
                    Auth Service
                  </div>
                  <div className="text-sm text-neutral-600">Authentication API</div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 rounded-lg border border-neutral-200">
                {getStatusIcon(diagnostics.databaseCheck)}
                <div>
                  <div className={`font-semibold ${getStatusColor(diagnostics.databaseCheck)}`}>
                    Database Access
                  </div>
                  <div className="text-sm text-neutral-600">Table queries</div>
                </div>
              </div>
            </div>

            {/* Details Log */}
            {diagnostics.details.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-neutral-900">Diagnostic Details</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                  {diagnostics.details.map((detail, index) => (
                    <div key={index} className="text-sm text-green-800 font-mono">
                      {detail}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors Log */}
            {diagnostics.errors.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-neutral-900">Errors</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                  {diagnostics.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-800 font-mono">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {diagnostics.errors.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Troubleshooting Steps</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Check if your Supabase project is paused (free tier projects pause after inactivity)</li>
                  <li>• Verify your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct</li>
                  <li>• Try refreshing the page or restarting the development server</li>
                  <li>• Check your internet connection</li>
                  <li>• Visit your Supabase dashboard to ensure the project is active</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/login'}
            >
              Return to Login
            </Button>
            <Button
              variant="primary"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </div>
          <p className="text-sm text-neutral-500">
            If issues persist, check your Supabase project dashboard
          </p>
        </div>
      </div>
    </div>
  );
};

export default SupabaseDiagnostic;