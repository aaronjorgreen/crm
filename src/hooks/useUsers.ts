import { useState, useEffect } from 'react';
import { userService } from '../lib/users';
import { UserProfile, Permission, CreateUserData, UpdateUserData, UserFilters, UserStats } from '../types/user';

export const useUsers = (filters: UserFilters = {}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await userService.getUsers(filters);
    
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setUsers(data || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [JSON.stringify(filters)]);

  const createUser = async (userData: CreateUserData) => {
    const { data, error } = await userService.createUser(userData);
    if (!error) {
      await fetchUsers(); // Refresh the list
    }
    return { data, error };
  };

  const updateUser = async (id: string, updates: UpdateUserData) => {
    const { data, error } = await userService.updateUser(id, updates);
    if (!error) {
      await fetchUsers(); // Refresh the list
    }
    return { data, error };
  };

  const deleteUser = async (id: string) => {
    const { error } = await userService.deleteUser(id);
    if (!error) {
      await fetchUsers(); // Refresh the list
    }
    return { error };
  };

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    createUser,
    updateUser,
    deleteUser
  };
};

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await userService.getPermissions();
      
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setPermissions(data || []);
      }
      
      setLoading(false);
    };

    fetchPermissions();
  }, []);

  const updateUserPermissions = async (userId: string, permissionIds: string[]) => {
    const { error } = await userService.updateUserPermissions(userId, permissionIds);
    return { error };
  };

  return {
    permissions,
    loading,
    error,
    updateUserPermissions
  };
};

export const useUserStats = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await userService.getUserStats();
      
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setStats(data);
      }
      
      setLoading(false);
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
};