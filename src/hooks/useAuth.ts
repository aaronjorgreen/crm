import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      setError(sessionError.message);
      setLoading(false);
      return;
    }

    const currentUser = session?.user;

    if (!currentUser) {
      setUser(null);
      setWorkspaceId(null);
      setLoading(false);
      return;
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role, default_workspace_id, email_verified')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !profile) {
      setError('Failed to load user profile');
      setUser(null);
      setWorkspaceId(null);
      setLoading(false);
      return;
    }

    setUser({ ...currentUser, role: profile.role });
    setWorkspaceId(profile.default_workspace_id);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUserData();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      fetchUserData();
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [fetchUserData]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setWorkspaceId(null);
  };

  const isAdmin = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'super_admin';

  return {
    user,
    workspaceId,
    loading,
    error,
    isAdmin,
    isSuperAdmin,
    signOut,
  };
}
