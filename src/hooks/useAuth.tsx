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
      
      // The auth state change listener will handle refreshUser
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
      setAuthState({ 
        user: null, 
        loading: false, 
        error: 'Supabase not configured', 
        currentWorkspaceId: null 
      });
      return;
    }

    try {
      console.log('🔄 Refreshing user profile...');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ Auth error in getUser:', authError);
        setAuthState({ 
          user: null, 
          loading: false, 
          error: authError.message,
          currentWorkspaceId: null 
        });
        return;
      }

      if (!user) {
        console.log('❌ No authenticated user found');
        setAuthState({ 
          user: null, 
          loading: false, 
          error: null,
          currentWorkspaceId: null 
        });
        return;
      }

      console.log('✅ Authenticated user found:', user.id, user.email);

      try {
        // Get user metadata from auth - check both user_metadata and raw_user_meta_data
        const firstName = user.user_metadata?.first_name || user.raw_user_meta_data?.first_name || 'User';
        const lastName = user.user_metadata?.last_name || user.raw_user_meta_data?.last_name || '';
        const role = user.user_metadata?.role || user.raw_user_meta_data?.role || 'member';
        
        console.log('🔍 User metadata:', { firstName, lastName, role });
        console.log('🔍 Raw user metadata:', user.raw_user_meta_data);
        console.log('🔍 User metadata:', user.user_metadata);
        
        // Create a minimal user profile from auth data
        const minimalUser: UserProfile = {
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
        
        // Try to get more detailed profile from database
        try {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (userProfile) {
            console.log('✅ User profile found in database');
            // Update minimal profile with database data
            minimalUser.firstName = userProfile.first_name || minimalUser.firstName;
            minimalUser.lastName = userProfile.last_name || minimalUser.lastName;
            minimalUser.role = userProfile.role || minimalUser.role;
            minimalUser.avatarUrl = userProfile.avatar_url;
            minimalUser.isActive = userProfile.is_active !== false;
            minimalUser.emailVerified = userProfile.email_verified || false;
            minimalUser.failedLoginAttempts = userProfile.failed_login_attempts || 0;
            minimalUser.lockedUntil = userProfile.locked_until;
            minimalUser.lastLogin = userProfile.last_login;
            minimalUser.lastActivity = userProfile.last_activity;
            minimalUser.defaultWorkspaceId = userProfile.default_workspace_id;
            
            console.log('✅ Final user profile:', { 
              id: minimalUser.id, 
              role: minimalUser.role, 
              firstName: minimalUser.firstName 
            });
          }
        } catch (profileError) {
          console.warn('⚠️ Error fetching user profile, using minimal profile:', profileError);
        }
        
        // Try to get user's workspaces
        try {
          const { data: memberships } = await supabase
            .from('memberships')
            .select(`
              id,
              workspace_id,
              role,
              joined_at,
              workspace:workspaces(
                id,
                name,
                owner_id,
                created_at
              )
            `)
            .eq('user_id', user.id);
          
          if (memberships && memberships.length > 0) {
            console.log('✅ User memberships found:', memberships.length);
            minimalUser.memberships = memberships.map(m => ({
              id: m.id,
              userId: user.id,
              workspaceId: m.workspace_id,
              role: m.role,
              joinedAt: m.joined_at,
              workspace: m.workspace ? {
                id: m.workspace.id,
                name: m.workspace.name,
                ownerId: m.workspace.owner_id,
                createdAt: m.workspace.created_at
              } : undefined
            }));
          }
        } catch (membershipError) {
          console.warn('⚠️ Error fetching memberships:', membershipError);
        }
        
        // Determine current workspace ID
        let currentWorkspaceId = null;
        
        // First try default workspace from profile
        if (minimalUser.defaultWorkspaceId) {
          currentWorkspaceId = minimalUser.defaultWorkspaceId;
        } 
        // Then try first workspace from memberships
        else if (minimalUser.memberships && minimalUser.memberships.length > 0) {
          currentWorkspaceId = minimalUser.memberships[0].workspaceId;
        }
        
        console.log('✅ Setting current workspace ID:', currentWorkspaceId);
        
        // Update auth state with user profile and workspace
        setAuthState({
          user: minimalUser,
          loading: false,
          error: null,
          currentWorkspaceId
        });
        
        console.log('🎉 Auth state updated successfully!');
        
      } catch (err: any) {
        console.error('❌ Error processing user data:', err);
        
        // Create a minimal fallback user profile
        const fallbackUser: UserProfile = {
          id: user.id,
          email: user.email || '',
          firstName: user.user_metadata?.first_name || user.raw_user_meta_data?.first_name || 'User',
          lastName: user.user_metadata?.last_name || user.raw_user_meta_data?.last_name || '',
          role: user.user_metadata?.role || user.raw_user_meta_data?.role || 'super_admin',
          isActive: true,
          emailVerified: true,
          failedLoginAttempts: 0,
          createdAt: user.created_at || new Date().toISOString(),
          updatedAt: user.updated_at || new Date().toISOString(),
          aiPreferences: {},
          permissions: [],
          memberships: []
        };
        
        console.log('⚠️ Using fallback user profile:', fallbackUser);
        
        setAuthState({
          user: fallbackUser,
          loading: false,
          error: null,
          currentWorkspaceId: null
        });
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
      setAuthState(prev => ({ 
        ...prev,
        loading: false,
        error: 'Supabase not configured'
      }));
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
        } else if (isSubscribed) {
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