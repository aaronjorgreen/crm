import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DemoAuthState {
  user: any | null;
  loading: boolean;
  error: string | null;
  currentWorkspaceId: string | null;
  needsBootstrap: boolean;
}

export const useDemoAuth = () => {
  const [authState, setAuthState] = useState<DemoAuthState>({
    user: null,
    loading: true,
    error: null,
    currentWorkspaceId: null,
    needsBootstrap: false
  });

  const checkBootstrapStatus = async () => {
    if (!supabase) {
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Supabase not configured',
        needsBootstrap: false
      }));
      return;
    }

    try {
      const { data, error } = await supabase.rpc('has_users');
      
      if (error) {
        console.error('Error checking bootstrap status:', error);
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.message,
          needsBootstrap: false
        }));
      } else {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false,
          needsBootstrap: !data // If no users exist, need bootstrap
        }));
      }
    } catch (err: any) {
      console.error('Exception checking bootstrap status:', err);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: err.message,
        needsBootstrap: false
      }));
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } };
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
        return { error };
      }

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        setAuthState(prev => ({ ...prev, loading: false, error: profileError.message }));
        return { error: profileError };
      }

      setAuthState(prev => ({ 
        ...prev, 
        user: profile, 
        loading: false,
        currentWorkspaceId: profile.default_workspace_id
      }));
      
      return {};
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred during sign in';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { error: { message: errorMessage } };
    }
  };

  const signOut = async () => {
    if (!supabase) {
      setAuthState({ 
        user: null, 
        loading: false, 
        error: null, 
        currentWorkspaceId: null,
        needsBootstrap: false
      });
      return;
    }

    try {
      await supabase.auth.signOut();
      setAuthState({ 
        user: null, 
        loading: false, 
        error: null, 
        currentWorkspaceId: null,
        needsBootstrap: false
      });
    } catch (err: any) {
      console.error('Error signing out:', err);
      setAuthState({ 
        user: null, 
        loading: false, 
        error: null, 
        currentWorkspaceId: null,
        needsBootstrap: false
      });
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!authState.user) return false;
    
    // Super admins have all permissions
    if (authState.user.role === 'super_admin') return true;
    
    // Admins have most permissions except super admin specific ones
    if (authState.user.role === 'admin') {
      const superAdminOnlyPermissions = ['admin.super'];
      if (superAdminOnlyPermissions.includes(permission)) return false;
      return true;
    }
    
    // Members have basic permissions
    const memberPermissions = [
      'dashboard.view',
      'boards.view',
      'clients.view'
    ];
    
    return memberPermissions.includes(permission);
  };

  const switchWorkspace = async (workspaceId: string) => {
    setAuthState(prev => ({
      ...prev,
      currentWorkspaceId: workspaceId
    }));
  };

  useEffect(() => {
    checkBootstrapStatus();
  }, []);

  return {
    authState,
    signIn,
    signOut,
    hasPermission,
    switchWorkspace
  };
};