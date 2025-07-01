import React, { useState } from 'react';
import { useUsers, usePermissions } from '../../hooks/useUsers';
import { UserFilters } from '../../types/user';
import { useAuth } from '../../hooks/useAuth';
import UserList from './UserList';
import UserForm from './UserForm';
import UserPermissionsModal from './UserPermissionsModal';
import UserInvitationModal from './UserInvitationModal';
import PendingInvitations from './PendingInvitations';
import UserAnalytics from './UserAnalytics';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { 
  Plus, Search, Filter, Users, Shield, UserCheck, UserX, 
  Crown, Mail, Activity, TrendingUp, AlertTriangle 
} from 'lucide-react';

const UserManagement: React.FC = () => {
  const { authState } = useAuth();
  const [filters, setFilters] = useState<UserFilters>({ role: 'all', isActive: true });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'invitations' | 'analytics'>('users');

  const { users, loading, error, updateUser, deleteUser } = useUsers({
    ...filters,
    search: searchTerm || undefined
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const activeUsers = users.filter(u => u.isActive);
  const inactiveUsers = users.filter(u => !u.isActive);
  const superAdminUsers = users.filter(u => u.role === 'super_admin' && u.isActive);
  const adminUsers = users.filter(u => u.role === 'admin' && u.isActive);
  const memberUsers = users.filter(u => u.role === 'member' && u.isActive);
  const lockedUsers = users.filter(u => u.lockedUntil && new Date(u.lockedUntil) > new Date());

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">Error loading users: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'users', label: 'Users', icon: Users, count: users.length },
    { id: 'invitations', label: 'Invitations', icon: Mail, count: 0 },
    ...(authState.user?.role === 'super_admin' ? [
      { id: 'analytics', label: 'Analytics', icon: Activity, count: 0 }
    ] : [])
  ];

  return (
    <div className="max-w-7xl mx-auto py-12 px-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-neutral-900">User Management</h1>
            <p className="text-neutral-600">
              Manage team members, roles, and permissions
              {authState.user?.role === 'super_admin' && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                  <Crown className="h-3 w-3 mr-1" />
                  Super Admin
                </span>
              )}
            </p>
          </div>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setShowInviteModal(true)}
          >
            Invite User
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">Total Users</p>
                <p className="text-2xl font-bold text-neutral-900">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">Active</p>
                <p className="text-2xl font-bold text-green-600">{activeUsers.length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">Super Admins</p>
                <p className="text-2xl font-bold text-purple-600">{superAdminUsers.length}</p>
              </div>
              <Crown className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">Admins</p>
                <p className="text-2xl font-bold text-blue-600">{adminUsers.length}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">Members</p>
                <p className="text-2xl font-bold text-neutral-600">{memberUsers.length}</p>
              </div>
              <Users className="h-8 w-8 text-neutral-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">Locked</p>
                <p className="text-2xl font-bold text-red-600">{lockedUsers.length}</p>
              </div>
              <UserX className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <TabIcon className="h-5 w-5" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className="bg-neutral-100 text-neutral-600 py-0.5 px-2 rounded-full text-xs font-semibold">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && (
          <>
            {/* Filters and Search */}
            <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search users by name or email..."
                    icon={Search}
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-3">
                  <select
                    value={filters.role || 'all'}
                    onChange={(e) => handleFilterChange('role', e.target.value === 'all' ? undefined : e.target.value)}
                    className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Roles</option>
                    <option value="super_admin">Super Admins</option>
                    <option value="admin">Administrators</option>
                    <option value="member">Members</option>
                  </select>

                  <select
                    value={filters.isActive === undefined ? 'all' : filters.isActive.toString()}
                    onChange={(e) => handleFilterChange('isActive', e.target.value === 'all' ? undefined : e.target.value === 'true')}
                    className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>

                  <select
                    value={filters.emailVerified === undefined ? 'all' : filters.emailVerified.toString()}
                    onChange={(e) => handleFilterChange('emailVerified', e.target.value === 'all' ? undefined : e.target.value === 'true')}
                    className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Verification</option>
                    <option value="true">Verified</option>
                    <option value="false">Unverified</option>
                  </select>
                </div>
              </div>
            </div>

            {/* User List */}
            <UserList
              users={users}
              loading={loading}
              onEdit={setEditingUser}
              onDelete={deleteUser}
              onManagePermissions={setPermissionsUser}
              currentUserRole={authState.user?.role || 'member'}
            />
          </>
        )}

        {activeTab === 'invitations' && (
          <PendingInvitations onRefresh={() => {}} />
        )}

        {activeTab === 'analytics' && authState.user?.role === 'super_admin' && (
          <UserAnalytics />
        )}

        {/* Modals */}
        {showInviteModal && (
          <UserInvitationModal
            onClose={() => setShowInviteModal(false)}
            onSuccess={() => {}}
          />
        )}

        {editingUser && (
          <UserForm
            userId={editingUser}
            onSubmit={(data) => updateUser(editingUser, data)}
            onClose={() => setEditingUser(null)}
            currentUserRole={authState.user?.role || 'member'}
          />
        )}

        {permissionsUser && (
          <UserPermissionsModal
            userId={permissionsUser}
            onClose={() => setPermissionsUser(null)}
          />
        )}
      </div>
    </div>
  );
};

export default UserManagement;