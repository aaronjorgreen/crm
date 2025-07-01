export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin' | 'member';
  avatarUrl?: string;
  isActive: boolean;
  emailVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil?: string;
  lastLogin?: string;
  lastActivity?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  aiPreferences: Record<string, any>;
  permissions: Permission[];
  defaultWorkspaceId?: string;
  memberships?: Membership[];
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  owner?: UserProfile;
}

export interface Membership {
  id: string;
  userId: string;
  workspaceId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  user?: UserProfile;
  workspace?: Workspace;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'dashboard' | 'boards' | 'apps' | 'admin' | 'clients';
  createdAt: string;
}

export interface UserPermission {
  id: string;
  userId: string;
  permissionId: string;
  grantedBy?: string;
  grantedAt: string;
  permission: Permission;
}

export interface UserInvitation {
  id: string;
  email: string;
  invitedBy: string;
  role: 'super_admin' | 'admin' | 'member';
  permissions: string[];
  invitationToken: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  metadata: Record<string, any>;
  workspaceId?: string;
  inviter?: UserProfile;
}

export interface CreateUserInvitationData {
  email: string;
  role: 'super_admin' | 'admin' | 'member';
  permissions?: string[];
  targetWorkspaceId?: string;
}

export interface AcceptInvitationData {
  token: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin' | 'member';
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  role?: 'super_admin' | 'admin' | 'member';
  isActive?: boolean;
  avatarUrl?: string;
  aiPreferences?: Record<string, any>;
}

export interface UserFilters {
  role?: 'super_admin' | 'admin' | 'member' | 'all';
  isActive?: boolean;
  search?: string;
  emailVerified?: boolean;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  superAdminUsers: number;
  adminUsers: number;
  memberUsers: number;
  recentSignups: number;
  pendingInvitations: number;
  lockedAccounts: number;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  workspaceId: string;
  user?: UserProfile;
}

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  ipAddress?: string;
  userAgent?: string;
  rememberMe: boolean;
  expiresAt: string;
  lastActivity: string;
  createdAt: string;
}

export interface AnalyticsData {
  userActivity: UserActivity[];
  performanceMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageSessionDuration: number;
    topActions: Array<{ action: string; count: number }>;
  };
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
}