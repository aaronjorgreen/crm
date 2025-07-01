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
    currentWorkspaceId: null
  });

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured. Please connect to Supabase first.' } };
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
        return { error };
      }

      return {};
    } catch (err: any) {
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
        options: { data: userData }
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
      setAuthState({ user: null, loading: false, error: null, currentWorkspaceId: null });
      return;
    }

    setAuthState(prev => ({ ...prev, loading: true }));

    try {
      await supabase.auth.signOut();
      setAuthState({ user: null, loading: false, error: null, currentWorkspaceId: null });
    } catch {
      setAuthState({ user: null, loading: false, error: null, currentWorkspaceId: null });
    }
  };

  const refreshUser = async () => {
    if (!supabase) {
      setAuthState(prev => ({ ...prev, loading: false, error: 'Supabase not configured' }));
      return;
    }

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setAuthState(prev => ({ ...prev, loading: false, error: authError?.message || null }));
        return;
      }

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
            workspace:workspaces(id, name, owner_id, created_at)
          ),
          user_permissions:user_permissions!user_permissions_user_id_fkey(
            id,
            permission_id,
            granted_at,
            permission:permissions(id, name, description, category)
          )
        `)
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile) {
        setAuthState(prev => ({ ...prev, loading: false, error: profileError?.message || 'User profile not found' }));
        return;
      }

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

      setAuthState({ user: transformedUser, loading: false, error: null, currentWorkspaceId: transformedUser.defaultWorkspaceId || null });

    } catch (err: any) {
      setAuthState(prev => ({ user: null, loading: false, error: err.message, currentWorkspaceId: null }));
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    if (!supabase || !authState.user) return;
    setAuthState(prev => ({ ...prev, currentWorkspaceId: workspaceId }));
  };

  const hasPermission = (permission: string): boolean => {
    if (!authState.user) return false;
    if (authState.user.role === 'super_admin') return true;
    if (authState.user.role === 'admin') {
      const superAdminOnlyPermissions = ['admin.super'];
      return !superAdminOnlyPermissions.includes(permission);
    }
    return authState.user.permissions?.some(p => p.name === permission) || false;
  };

  useEffect(() => {
    if (!supabase) {
      setAuthState({ user: null, loading: false, error: 'Supabase not configured', currentWorkspaceId: null });
      return;
    }

    let isSubscribed = true;
    const loadingTimeout = setTimeout(() => {
      if (isSubscribed && authState.loading && !authState.user) {
        setAuthState(prev => ({ ...prev, loading: false, error: 'Authentication timeout - please refresh the page' }));
      }
    }, 15000);

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.user) {
          if (isSubscribed) setAuthState(prev => ({ ...prev, loading: false, error: error?.message || null }));
          return;
        }
        if (isSubscribed) await refreshUser();
      } catch (error: any) {
        if (isSubscribed) setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
      } finally {
        clearTimeout(loadingTimeout);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      clearTimeout(loadingTimeout);
      if (!isSubscribed) return;
      if (event === 'SIGNED_IN' && session?.user) await refreshUser();
      else if (event === 'SIGNED_OUT') setAuthState({ user: null, loading: false, error: null, currentWorkspaceId: null });
      else if (event === 'TOKEN_REFRESHED' && session?.user) await refreshUser();
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
