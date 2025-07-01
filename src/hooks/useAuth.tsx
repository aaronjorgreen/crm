import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types/user';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  currentWorkspaceId: string | null;
}

interface AuthContextType {
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const useAuthState = (): AuthContextType => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    currentWorkspaceId: null
  });

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured. Please connect to Supabase first.' } };
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('🔐 Starting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('❌ Auth error:', error);
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
        return { error };
      }

      console.log('✅ Auth successful, user ID:', data.user?.id);
      
      // Don't call refreshUser here - let the auth state change listener handle it
      return {};
    } catch (err: any) {
      console.error('❌ Sign in exception:', err);
      const errorMessage = err.message || 'An error occurred during sign in';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { error: { message: errorMessage } };
    }
  };

  const signOut = async () => {
    if (!supabase) {
      setAuthState({ user: null, loading: false, error: null, currentWorkspaceId: null });
      return;
    }

    try {
      await supabase.auth.signOut();
      setAuthState({ user: null, loading: false, error: null, currentWorkspaceId: null });
    } catch (err: any) {
      console.error('Error signing out:', err);
      // Even if there's an error, clear the local state
      setAuthState({ user: null, loading: false, error: null, currentWorkspaceId: null });
    }
  };

  const refreshUser = async () => {
    if (!supabase) {
      console.log('❌ Supabase not configured');
      setAuthState(prev => ({ ...prev, loading: false, error: 'Supabase not configured' }));
      return;
    }

    try {
      console.log('🔄 Refreshing user profile...');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ Auth error:', authError);
        setAuthState(prev => ({ ...prev, loading: false, error: authError.message }));
        return;
      }

      if (!user) {
        console.log('❌ No authenticated user found');
        setAuthState({ user: null, loading: false, error: null, currentWorkspaceId: null });
        return;
      }

      console.log('✅ Authenticated user found:', user.id, user.email);

      try {
        // Simplified profile fetch - just get the basic user profile first
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select(`
            id,
            email,
            first_name,
            last_name,
            role,
            avatar_url,
            is_active,
            email_verified,
            failed_login_attempts,
            locked_until,
            last_login,
            last_activity,
            created_at,
            updated_at,
            ai_preferences,
            default_workspace_id
          `)
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('❌ Profile fetch error:', profileError);
          setAuthState(prev => ({ 
            ...prev, 
            loading: false, 
            error: `Profile error: ${profileError.message}`
          }));
          return;
        }

        if (!userProfile) {
          console.error('❌ No user profile found');
          setAuthState(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'User profile not found'
          }));
          return;
        }

        console.log('✅ User profile loaded:', userProfile.email, 'Role:', userProfile.role);

        // Transform the profile data with minimal complexity
        const transformedUser: UserProfile = {
          id: userProfile.id,
          email: userProfile.email,
          firstName: userProfile.first_name || 'User',
          lastName: userProfile.last_name || '',
          role: userProfile.role || 'member',
          avatarUrl: userProfile.avatar_url,
          isActive: userProfile.is_active !== false,
          emailVerified: userProfile.email_verified || false,
          failedLoginAttempts: userProfile.failed_login_attempts || 0,
          lockedUntil: userProfile.locked_until,
          lastLogin: userProfile.last_login,
          lastActivity: userProfile.last_activity,
          createdAt: userProfile.created_at,
          updatedAt: userProfile.updated_at,
          aiPreferences: userProfile.ai_preferences || {},
          defaultWorkspaceId: userProfile.default_workspace_id,
          permissions: [], // Load permissions separately if needed
          memberships: [] // Load memberships separately if needed
        };

        setAuthState({ 
          user: transformedUser, 
          loading: false, 
          error: null,
          currentWorkspaceId: transformedUser.defaultWorkspaceId || null
        });

        console.log('🎉 Auth state updated successfully!');
      } catch (profileErr: any) {
        console.error('❌ Profile processing error:', profileErr);
        
        // Fallback to metadata from auth user if profile fetch fails
        const firstName = user.user_metadata?.first_name || user.user_metadata?.firstName || 'User';
        const lastName = user.user_metadata?.last_name || user.user_metadata?.lastName || '';
        const role = user.user_metadata?.role || 'member';
        
        const fallbackUser: UserProfile = {
          id: user.id,
          email: user.email || '',
          firstName,
          lastName,
          role,
          isActive: true,
          emailVerified: true,
          failedLoginAttempts: 0,
          createdAt: user.created_at || new Date().toISOString(),
          updatedAt: user.updated_at || new Date().toISOString(),
          aiPreferences: {},
          permissions: [],
          memberships: []
        };
        
        setAuthState({
          user: fallbackUser,
          loading: false,
          error: null,
          currentWorkspaceId: null
        });
        
        console.log('⚠️ Using fallback user data from auth metadata');
      }

    } catch (err: any) {
      console.error('❌ User refresh error:', err);
      setAuthState({ 
        user: null, 
        loading: false, 
        error: err.message, 
        currentWorkspaceId: null
      });
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    if (!supabase || !authState.user) return;

    try {
      setAuthState(prev => ({
        ...prev,
        currentWorkspaceId: workspaceId
      }));
    } catch (error) {
      console.error('Error switching workspace:', error);
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

  useEffect(() => {
    if (!supabase) {
      console.log('❌ Supabase not configured');
      setAuthState({ 
        user: null, 
        loading: false, 
        error: 'Supabase not configured', 
        currentWorkspaceId: null
      });
      return;
    }

    let isSubscribed = true;

    // Shorter timeout to prevent hanging
    const loadingTimeout = setTimeout(() => {
      if (isSubscribed) {
        console.log('⏰ Loading timeout - setting loading to false');
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: prev.error || 'Authentication timeout'
        }));
      }
    }, 5000); // 5 second timeout

    const initializeAuth = async () => {
      try {
        console.log('🔍 Checking existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session check error:', error);
          if (isSubscribed) {
            setAuthState({ 
              user: null, 
              loading: false, 
              error: error.message,
              currentWorkspaceId: null
            });
          }
          return;
        }
        
        if (session?.user) {
          console.log('✅ Existing session found for:', session.user.email);
          if (isSubscribed) {
            await refreshUser();
          }
        } else {
          console.log('❌ No existing session');
          if (isSubscribed) {
            setAuthState({ 
              user: null, 
              loading: false, 
              error: null,
              currentWorkspaceId: null
            });
          }
        }
      } catch (error: any) {
        console.error('❌ Auth initialization error:', error);
        if (isSubscribed) {
          setAuthState({ 
            user: null, 
            loading: false, 
            error: error.message,
            currentWorkspaceId: null
          });
        }
      } finally {
        clearTimeout(loadingTimeout);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session?.user?.email);
      clearTimeout(loadingTimeout);
      
      if (!isSubscribed) return;
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ User signed in, refreshing profile...');
        await refreshUser();
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setAuthState({ 
          user: null, 
          loading: false, 
          error: null, 
          currentWorkspaceId: null 
        });
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('🔄 Token refreshed');
        // Don't refresh user on token refresh to avoid loops
      }
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  return {
    authState,
    signIn,
    signOut,
    refreshUser,
    hasPermission,
    switchWorkspace
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authContextValue = useAuthState();
  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
}

export { AuthContext };