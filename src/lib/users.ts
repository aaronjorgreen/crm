import { supabase } from './supabase';
import { 
  UserProfile, 
  Permission, 
  CreateUserInvitationData, 
  AcceptInvitationData,
  UpdateUserData, 
  UserFilters, 
  UserStats,
  UserInvitation,
  UserActivity,
  AnalyticsData,
  Workspace,
  Membership
} from '../types/user';

export const userService = {
  // Get all users with filters
  async getUsers(filters: UserFilters = {}): Promise<{ data: UserProfile[] | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    let query = supabase
      .from('user_profiles')
      .select(`
        *,
        user_permissions!user_permissions_user_id_fkey(
          permissions!user_permissions_permission_id_fkey(*)
        ),
        memberships!memberships_user_id_fkey(
          *,
          workspace:workspaces(*)
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.role && filters.role !== 'all') {
      query = query.eq('role', filters.role);
    }

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters.emailVerified !== undefined) {
      query = query.eq('email_verified', filters.emailVerified);
    }

    if (filters.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) return { data: null, error };

    // Transform the data to match our interface
    const transformedData = data?.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      avatarUrl: user.avatar_url,
      isActive: user.is_active,
      emailVerified: user.email_verified || false,
      failedLoginAttempts: user.failed_login_attempts || 0,
      lockedUntil: user.locked_until,
      lastLogin: user.last_login,
      lastActivity: user.last_activity,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      createdBy: user.created_by,
      aiPreferences: user.ai_preferences || {},
      defaultWorkspaceId: user.default_workspace_id,
      permissions: user.user_permissions?.map((up: any) => up.permissions) || [],
      memberships: user.memberships?.map((m: any) => ({
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
    })) || [];

    return { data: transformedData, error: null };
  },

  // Get single user by ID
  async getUserById(id: string): Promise<{ data: UserProfile | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        user_permissions!user_permissions_user_id_fkey(
          permissions!user_permissions_permission_id_fkey(*)
        ),
        memberships!memberships_user_id_fkey(
          *,
          workspace:workspaces(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) return { data: null, error };

    const transformedData = {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      role: data.role,
      avatarUrl: data.avatar_url,
      isActive: data.is_active,
      emailVerified: data.email_verified || false,
      failedLoginAttempts: data.failed_login_attempts || 0,
      lockedUntil: data.locked_until,
      lastLogin: data.last_login,
      lastActivity: data.last_activity,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      aiPreferences: data.ai_preferences || {},
      defaultWorkspaceId: data.default_workspace_id,
      permissions: data.user_permissions?.map((up: any) => up.permissions) || [],
      memberships: data.memberships?.map((m: any) => ({
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

    return { data: transformedData, error: null };
  },

  // Create user invitation
  async createInvitation(invitationData: CreateUserInvitationData): Promise<{ data: UserInvitation | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase.rpc('create_user_invitation', {
      p_email: invitationData.email,
      p_role: invitationData.role,
      p_permissions: JSON.stringify(invitationData.permissions || []),
      p_target_workspace_id: invitationData.targetWorkspaceId || null
    });

    if (error) return { data: null, error };

    // Fetch the created invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('user_invitations')
      .select(`
        *,
        inviter:user_profiles!user_invitations_invited_by_fkey(*)
      `)
      .eq('id', data)
      .single();

    if (fetchError) return { data: null, error: fetchError };

    const transformedData = {
      id: invitation.id,
      email: invitation.email,
      invitedBy: invitation.invited_by,
      role: invitation.role,
      permissions: invitation.permissions || [],
      invitationToken: invitation.invitation_token,
      expiresAt: invitation.expires_at,
      acceptedAt: invitation.accepted_at,
      createdAt: invitation.created_at,
      metadata: invitation.metadata || {},
      workspaceId: invitation.workspace_id,
      inviter: invitation.inviter ? {
        id: invitation.inviter.id,
        email: invitation.inviter.email,
        firstName: invitation.inviter.first_name,
        lastName: invitation.inviter.last_name,
        role: invitation.inviter.role,
        avatarUrl: invitation.inviter.avatar_url,
        isActive: invitation.inviter.is_active,
        emailVerified: invitation.inviter.email_verified || false,
        failedLoginAttempts: invitation.inviter.failed_login_attempts || 0,
        lockedUntil: invitation.inviter.locked_until,
        lastLogin: invitation.inviter.last_login,
        lastActivity: invitation.inviter.last_activity,
        createdAt: invitation.inviter.created_at,
        updatedAt: invitation.inviter.updated_at,
        createdBy: invitation.inviter.created_by,
        aiPreferences: invitation.inviter.ai_preferences || {},
        permissions: []
      } : undefined
    };

    return { data: transformedData, error: null };
  },

  // Get pending invitations
  async getPendingInvitations(): Promise<{ data: UserInvitation[] | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase
      .from('user_invitations')
      .select(`
        *,
        inviter:user_profiles!user_invitations_invited_by_fkey(*),
        workspace:workspaces(*)
      `)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    const transformedData = data?.map(invitation => ({
      id: invitation.id,
      email: invitation.email,
      invitedBy: invitation.invited_by,
      role: invitation.role,
      permissions: invitation.permissions || [],
      invitationToken: invitation.invitation_token,
      expiresAt: invitation.expires_at,
      acceptedAt: invitation.accepted_at,
      createdAt: invitation.created_at,
      metadata: invitation.metadata || {},
      workspaceId: invitation.workspace_id,
      inviter: invitation.inviter ? {
        id: invitation.inviter.id,
        email: invitation.inviter.email,
        firstName: invitation.inviter.first_name,
        lastName: invitation.inviter.last_name,
        role: invitation.inviter.role,
        avatarUrl: invitation.inviter.avatar_url,
        isActive: invitation.inviter.is_active,
        emailVerified: invitation.inviter.email_verified || false,
        failedLoginAttempts: invitation.inviter.failed_login_attempts || 0,
        lockedUntil: invitation.inviter.locked_until,
        lastLogin: invitation.inviter.last_login,
        lastActivity: invitation.inviter.last_activity,
        createdAt: invitation.inviter.created_at,
        updatedAt: invitation.inviter.updated_at,
        createdBy: invitation.inviter.created_by,
        aiPreferences: invitation.inviter.ai_preferences || {},
        permissions: []
      } : undefined,
      workspace: invitation.workspace ? {
        id: invitation.workspace.id,
        name: invitation.workspace.name,
        ownerId: invitation.workspace.owner_id,
        createdAt: invitation.workspace.created_at
      } : undefined
    })) || [];

    return { data: transformedData, error: null };
  },

  // Accept invitation
  async acceptInvitation(acceptData: AcceptInvitationData): Promise<{ data: any; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase.rpc('accept_invitation', {
      p_token: acceptData.token,
      p_password: acceptData.password,
      p_first_name: acceptData.firstName,
      p_last_name: acceptData.lastName
    });

    return { data, error };
  },

  // Update user
  async updateUser(id: string, updates: UpdateUserData): Promise<{ data: UserProfile | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const updateData: any = {};
    if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
    if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;
    if (updates.aiPreferences !== undefined) updateData.ai_preferences = updates.aiPreferences;

    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', id);

    if (error) return { data: null, error };

    return this.getUserById(id);
  },

  // Delete user (deactivate)
  async deleteUser(id: string): Promise<{ error: any }> {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } };
    }

    // Deactivate instead of hard delete
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: false })
      .eq('id', id);

    return { error };
  },

  // Get all permissions
  async getPermissions(): Promise<{ data: Permission[] | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    return { data, error };
  },

  // Update user permissions
  async updateUserPermissions(userId: string, permissionIds: string[]): Promise<{ error: any }> {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } };
    }

    // Remove existing permissions
    await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);

    // Add new permissions
    if (permissionIds.length > 0) {
      const { error } = await supabase
        .from('user_permissions')
        .insert(
          permissionIds.map(permissionId => ({
            user_id: userId,
            permission_id: permissionId
          }))
        );

      return { error };
    }

    return { error: null };
  },

  // Get user stats
  async getUserStats(): Promise<{ data: UserStats | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('role, is_active, created_at, locked_until');

    const { data: invitations, error: invitationsError } = await supabase
      .from('user_invitations')
      .select('accepted_at, expires_at')
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString());

    if (usersError || invitationsError) {
      return { data: null, error: usersError || invitationsError };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats: UserStats = {
      totalUsers: users?.length || 0,
      activeUsers: users?.filter(u => u.is_active).length || 0,
      superAdminUsers: users?.filter(u => u.role === 'super_admin' && u.is_active).length || 0,
      adminUsers: users?.filter(u => u.role === 'admin' && u.is_active).length || 0,
      memberUsers: users?.filter(u => u.role === 'member' && u.is_active).length || 0,
      recentSignups: users?.filter(u => new Date(u.created_at) > thirtyDaysAgo).length || 0,
      pendingInvitations: invitations?.length || 0,
      lockedAccounts: users?.filter(u => u.locked_until && new Date(u.locked_until) > now).length || 0
    };

    return { data: stats, error: null };
  },

  // Get user activity logs
  async getUserActivity(userId?: string, limit: number = 50): Promise<{ data: UserActivity[] | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    let query = supabase
      .from('user_activity_logs')
      .select(`
        *,
        user:user_profiles!user_activity_logs_user_id_fkey(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) return { data: null, error };

    const transformedData = data?.map(activity => ({
      id: activity.id,
      userId: activity.user_id,
      action: activity.action,
      resourceType: activity.resource_type,
      resourceId: activity.resource_id,
      metadata: activity.metadata || {},
      ipAddress: activity.ip_address,
      userAgent: activity.user_agent,
      createdAt: activity.created_at,
      workspaceId: activity.workspace_id,
      user: activity.user ? {
        id: activity.user.id,
        email: activity.user.email,
        firstName: activity.user.first_name,
        lastName: activity.user.last_name,
        role: activity.user.role,
        avatarUrl: activity.user.avatar_url,
        isActive: activity.user.is_active,
        emailVerified: activity.user.email_verified || false,
        failedLoginAttempts: activity.user.failed_login_attempts || 0,
        lockedUntil: activity.user.locked_until,
        lastLogin: activity.user.last_login,
        lastActivity: activity.user.last_activity,
        createdAt: activity.user.created_at,
        updatedAt: activity.user.updated_at,
        createdBy: activity.user.created_by,
        aiPreferences: activity.user.ai_preferences || {},
        permissions: []
      } : undefined
    })) || [];

    return { data: transformedData, error: null };
  },

  // Get analytics data for super admins
  async getAnalyticsData(): Promise<{ data: AnalyticsData | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    // Get recent activity
    const { data: activity, error: activityError } = await this.getUserActivity(undefined, 100);
    
    if (activityError) return { data: null, error: activityError };

    // Calculate performance metrics
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyActiveUsers = new Set(
      activity?.filter(a => new Date(a.createdAt) > oneDayAgo).map(a => a.userId)
    ).size;

    const weeklyActiveUsers = new Set(
      activity?.filter(a => new Date(a.createdAt) > oneWeekAgo).map(a => a.userId)
    ).size;

    const monthlyActiveUsers = new Set(
      activity?.filter(a => new Date(a.createdAt) > oneMonthAgo).map(a => a.userId)
    ).size;

    // Calculate top actions
    const actionCounts = activity?.reduce((acc, a) => {
      acc[a.action] = (acc[a.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const topActions = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    const analyticsData: AnalyticsData = {
      userActivity: activity || [],
      performanceMetrics: {
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyActiveUsers,
        averageSessionDuration: 0, // Would need session tracking
        topActions
      },
      systemHealth: {
        uptime: 99.9,
        responseTime: 150,
        errorRate: 0.1
      }
    };

    return { data: analyticsData, error: null };
  },

  // Log user activity
  async logActivity(
    action: string, 
    resourceType?: string, 
    resourceId?: string, 
    metadata?: Record<string, any>, 
    workspaceId?: string
  ): Promise<{ error: any }> {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'User not authenticated' } };
    }

    const { error } = await supabase.rpc('log_user_activity', {
      p_user_id: user.id,
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_metadata: JSON.stringify(metadata || {}),
      p_workspace_id: workspaceId
    });

    return { error };
  },

  // Get user workspaces
  async getUserWorkspaces(userId?: string): Promise<{ data: Workspace[] | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;

    if (!targetUserId) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get user's role to determine access level
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user?.id)
      .single();

    if (userError) {
      return { data: null, error: userError };
    }

    let query = supabase
      .from('workspaces')
      .select(`
        *,
        owner:user_profiles!workspaces_owner_id_fkey(*)
      `);

    // If super_admin or admin, they can see all workspaces
    if (userProfile.role !== 'super_admin' && userProfile.role !== 'admin') {
      // Regular users can only see workspaces they're members of
      query = query.or(`owner_id.eq.${targetUserId},id.in.(${
        supabase
          .from('memberships')
          .select('workspace_id')
          .eq('user_id', targetUserId)
          .toString()
      })`);
    }

    const { data, error } = await query;

    if (error) return { data: null, error };

    const transformedData = data?.map(workspace => ({
      id: workspace.id,
      name: workspace.name,
      ownerId: workspace.owner_id,
      createdAt: workspace.created_at,
      owner: workspace.owner ? {
        id: workspace.owner.id,
        email: workspace.owner.email,
        firstName: workspace.owner.first_name,
        lastName: workspace.owner.last_name,
        role: workspace.owner.role,
        avatarUrl: workspace.owner.avatar_url,
        isActive: workspace.owner.is_active,
        emailVerified: workspace.owner.email_verified || false,
        createdAt: workspace.owner.created_at,
        updatedAt: workspace.owner.updated_at,
        permissions: []
      } : undefined
    })) || [];

    return { data: transformedData, error: null };
  },

  // Get workspace members
  async getWorkspaceMembers(workspaceId: string): Promise<{ data: Membership[] | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase
      .from('memberships')
      .select(`
        *,
        user:user_profiles!memberships_user_id_fkey(*),
        workspace:workspaces!memberships_workspace_id_fkey(*)
      `)
      .eq('workspace_id', workspaceId);

    if (error) return { data: null, error };

    const transformedData = data?.map(membership => ({
      id: membership.id,
      userId: membership.user_id,
      workspaceId: membership.workspace_id,
      role: membership.role,
      joinedAt: membership.joined_at,
      user: membership.user ? {
        id: membership.user.id,
        email: membership.user.email,
        firstName: membership.user.first_name,
        lastName: membership.user.last_name,
        role: membership.user.role,
        avatarUrl: membership.user.avatar_url,
        isActive: membership.user.is_active,
        emailVerified: membership.user.email_verified || false,
        createdAt: membership.user.created_at,
        updatedAt: membership.user.updated_at,
        permissions: []
      } : undefined,
      workspace: membership.workspace ? {
        id: membership.workspace.id,
        name: membership.workspace.name,
        ownerId: membership.workspace.owner_id,
        createdAt: membership.workspace.created_at
      } : undefined
    })) || [];

    return { data: transformedData, error: null };
  },

  // Create workspace
  async createWorkspace(name: string): Promise<{ data: Workspace | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        name,
        owner_id: user.id
      })
      .select()
      .single();

    if (error) return { data: null, error };

    // Add creator as workspace owner
    await supabase
      .from('memberships')
      .insert({
        workspace_id: data.id,
        user_id: user.id,
        role: 'owner'
      });

    // Log activity
    await this.logActivity('workspace_created', 'workspace', data.id, {
      workspaceName: name
    });

    return { 
      data: {
        id: data.id,
        name: data.name,
        ownerId: data.owner_id,
        createdAt: data.created_at
      }, 
      error: null 
    };
  },

  // Add user to workspace
  async addUserToWorkspace(
    workspaceId: string, 
    userId: string, 
    role: 'owner' | 'admin' | 'member' = 'member'
  ): Promise<{ data: Membership | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase
      .from('memberships')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        role
      })
      .select()
      .single();

    if (error) return { data: null, error };

    // Log activity
    await this.logActivity('user_added_to_workspace', 'workspace', workspaceId, {
      userId,
      role
    }, workspaceId);

    return { 
      data: {
        id: data.id,
        userId: data.user_id,
        workspaceId: data.workspace_id,
        role: data.role,
        joinedAt: data.joined_at
      }, 
      error: null 
    };
  }
};