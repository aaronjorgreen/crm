import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types/user';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  currentWorkspaceId: string | null;
  needsBootstrap: boolean;
}

interface AuthContextType {
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error?: any }>;
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
      console.log('🔍 Checking if system needs bootstrap...');
      const { data, error } = await supabase.rpc('has_users');
      
      if (error && error.message) {
        console.error('❌ Bootstrap check error:', error);
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.message,
          needsBootstrap: false
        }));
      } else {
        console.log('✅ Bootstrap check result:', data ? 'Users exist' : 'No users - bootstrap needed');
        setAuthState(prev => ({ 
          ...prev,
          needsBootstrap: !data // If no users exist, bootstrap is needed
        }));
      }
    } catch (err: any) {
      console.error('❌ Bootstrap check exception:', err);
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

  const signUp = async (email: string, password: string, userData: any) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured. Please connect to Supabase first.' } };
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      
      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
        return { error };
      }

      setAuthState(prev => ({ ...prev, loading: false }));
      return {};
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred during sign up';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { error: { message: errorMessage } };
    }
  };

  const signOut = async () => {
    if (!supabase) {
      setAuthState({ user: null, loading: false, error: null, currentWorkspaceId: null, needsBootstrap: false });
      return;
    }

    setAuthState(prev => ({ ...prev, loading: true }));
    
    try {
      await supabase.auth.signOut();
      setAuthState({ user: null, loading: false, error: null, currentWorkspaceId: null, needsBootstrap: false });
    } catch (err: any) {
      console.error('Error signing out:', err);
      // Even if there's an error, clear the local state
      setAuthState({ user: null, loading: false, error: null, currentWorkspaceId: null, needsBootstrap: false });
    }
  };

  const refreshUser = async () => {
    if (!supabase) {
      console.log('❌ Supabase not configured');
      setAuthState(prev => ({ ...prev, loading: false, error: 'Supabase not configured' }));
      return;
    }

    try {
      console.log('🔄 Starting refreshUser function...');
      
      console.log('📋 Step 1: Getting authenticated user session from Supabase...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ Auth error in getUser:', authError);
        setAuthState(prev => ({ ...prev, loading: false, error: authError.message, needsBootstrap: prev.needsBootstrap }));
        return;
      }

      if (!user) {
        console.log('❌ No authenticated user found');
        setAuthState(prev => ({ ...prev, loading: false, error: null, needsBootstrap: prev.needsBootstrap }));
        return;
      }

      console.log('✅ Authenticated user found:', user.id, user.email);

      console.log('📋 Step 2: Fetching user profile from database...');
      
      try {
        // First, let's test if we can access the table at all
        console.log('🧪 Testing basic table access...');
        const { data: testData, error: testError } = await supabase
          .from('user_profiles')
          .select('count')
          .limit(1);
        
        console.log('Test query result:', { testData, testError });

        // Now try to fetch the specific user profile
        console.log('🔍 Fetching specific user profile...');
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
            default_workspace_id,
            memberships:memberships(
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
            ),
            user_permissions:user_permissions(
              id,
              permission_id,
              granted_at,
              permission:permissions(
                id,
                name,
                description,
                category
              )
            )
          `)
          .eq('id', user.id)
          .single();

        console.log('📋 Step 3: Processing profile query result...');
        console.log('Profile Error:', profileError);
        console.log('Profile Data:', userProfile);

        if (profileError) {
          console.error('❌ Profile fetch error:', profileError);
          console.error('Error details:', {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint
          });
          
          setAuthState(prev => ({ 
            ...prev, 
            loading: false, 
            error: `Profile error: ${profileError.message} (Code: ${profileError.code})`,
            needsBootstrap: prev.needsBootstrap
          }));
          return;
        }

        if (!userProfile) {
          console.error('❌ No user profile data returned');
          setAuthState(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'User profile not found in database',
            needsBootstrap: prev.needsBootstrap
          }));
          return;
        }

        console.log('✅ User profile loaded successfully:', userProfile.email, 'Role:', userProfile.role);
        console.log('📋 Step 4: Transforming profile data...');

        // Transform the profile data
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
          permissions: userProfile.user_permissions?.map((up: any) => ({
            id: up.permission.id,
            name: up.permission.name,
            description: up.permission.description,
            category: up.permission.category
          })) || [],
          memberships: userProfile.memberships?.map((m: any) => ({
            id: m.id,
            userId: m.user_id,
            workspaceId: m.workspace_id,
            role: m.role,
            joinedAt: m.joined_at,
            workspace: m.workspace ? {
              id: m.workspace.id,
              name: m.workspace.name,
              ownerId: m.workspace.owner_id,
              createdAt: m.workspace.created_at
            } : undefined
          })) || []
        };

        console.log('✅ Profile transformation completed');
        console.log('📋 Step 5: Setting auth state...');

        setAuthState({ 
          user: transformedUser, 
          loading: false, 
          error: null,
          currentWorkspaceId: transformedUser.defaultWorkspaceId || null,
          needsBootstrap: false // If we have a user, we don't need bootstrap
        });

        console.log('🎉 Auth state updated successfully!');
        console.log('Final auth state:', {
          userId: transformedUser.id,
          email: transformedUser.email,
          role: transformedUser.role,
          workspaceId: transformedUser.defaultWorkspaceId,
          needsBootstrap: false
        });

      } catch (profileErr: any) {
        console.error('❌ Profile processing error:', profileErr);
        console.error('Profile processing error details:', {
          name: profileErr.name,
          message: profileErr.message,
          stack: profileErr.stack
        });
        
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: `Processing error: ${profileErr.message}`,
          needsBootstrap: prev.needsBootstrap
        }));
      }
    } catch (err: any) {
      console.error('❌ User refresh error:', err);
      console.error('Refresh error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      setAuthState(prev => ({ 
        user: null, 
        loading: false, 
        error: err.message, 
        currentWorkspaceId: null,
        needsBootstrap: prev.needsBootstrap
      }));
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    if (!supabase || !authState.user) return;

    try {
      // Update local state immediately for better UX
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
    
    // Check specific permissions
    return authState.user.permissions?.some(p => p.name === permission) || false;
  };

  useEffect(() => {
    if (!supabase) {
      console.log('❌ Supabase not configured');
      setAuthState({ 
        user: null, 
        loading: false, 
        error: 'Supabase not configured', 
        currentWorkspaceId: null,
        needsBootstrap: false
      });
      return;
    }

    let isSubscribed = true;

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (isSubscribed) {
        console.log('⏰ Loading timeout reached - stopping loading state');
        setAuthState(prev => {
          if (prev.loading && !prev.user) {
            return { 
              ...prev, 
              loading: false, 
              error: 'Authentication timeout - please refresh the page' 
            };
          }
          return prev;
        });
      }
    }, 15000); // 15 second timeout

    // Check bootstrap status first
    const initializeAuth = async () => {
      try {
        // Check if we need to bootstrap (create first admin)
        await checkBootstrapStatus();
        
        // Check for existing session
        console.log('🔍 Checking existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session check error:', error);
          if (isSubscribed) {
            setAuthState(prev => ({ 
              ...prev, 
              loading: false, 
              error: error.message 
            }));
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
            setAuthState(prev => ({ ...prev, loading: false }));
          }
        }
      } catch (error: any) {
        console.error('❌ Auth initialization error:', error);
        if (isSubscribed) {
          setAuthState(prev => ({ 
            ...prev, 
            loading: false, 
            error: error.message 
          }));
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
        setAuthState(prev => ({ 
          ...prev, 
          user: null, 
          loading: false, 
          error: null, 
          currentWorkspaceId: null 
        }));
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('🔄 Token refreshed, updating profile...');
        await refreshUser();
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
    signUp,
    signOut,
    refreshUser,
    hasPermission,
    switchWorkspace
  };
};

export { AuthContext };