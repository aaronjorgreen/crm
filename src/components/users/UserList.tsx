import React from 'react';
import { UserProfile } from '../../types/user';
import Button from '../ui/Button';
import { Edit, Trash2, Shield, User, Settings, Crown, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface UserListProps {
  users: UserProfile[];
  loading: boolean;
  onEdit: (userId: string) => void;
  onDelete: (userId: string) => Promise<{ error: any }>;
  onManagePermissions: (userId: string) => void;
  currentUserRole: 'super_admin' | 'admin' | 'member';
}

const UserList: React.FC<UserListProps> = ({
  users,
  loading,
  onEdit,
  onDelete,
  onManagePermissions,
  currentUserRole
}) => {
  const handleDelete = async (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to deactivate ${userName}? They will lose access to the system.`)) {
      await onDelete(userId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLastLogin = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    
    return formatDate(dateString);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return Crown;
      case 'admin':
        return Shield;
      default:
        return User;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const canEditUser = (user: UserProfile) => {
    if (currentUserRole === 'super_admin') return true;
    if (currentUserRole === 'admin' && user.role !== 'super_admin') return true;
    return false;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading users...</p>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
        <div className="p-8 text-center">
          <User className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-600 font-medium">No users found</p>
          <p className="text-sm text-neutral-500 mt-1">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Verification
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Permissions
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {users.map((user) => {
              const RoleIcon = getRoleIcon(user.role);
              const isLocked = user.lockedUntil && new Date(user.lockedUntil) > new Date();
              
              return (
                <tr key={user.id} className="hover:bg-neutral-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.avatarUrl ? (
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={user.avatarUrl}
                            alt={`${user.firstName} ${user.lastName}`}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary-700">
                              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-neutral-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {user.email}
                        </div>
                        {isLocked && (
                          <div className="flex items-center mt-1">
                            <AlertTriangle className="h-3 w-3 text-red-500 mr-1" />
                            <span className="text-xs text-red-600 font-medium">Account Locked</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <RoleIcon className="h-4 w-4 mr-2" />
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role === 'super_admin' ? 'Super Admin' : 
                         user.role === 'admin' ? 'Administrator' : 'Member'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {user.failedLoginAttempts > 0 && (
                        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                          {user.failedLoginAttempts} failed attempts
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.emailVerified ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm text-green-600 font-medium">Verified</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500 mr-1" />
                          <span className="text-sm text-red-600 font-medium">Unverified</span>
                        </>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-neutral-600">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatLastLogin(user.lastLogin)}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                    {formatDate(user.createdAt)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                    <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded-full">
                      {user.permissions.length} permissions
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {canEditUser(user) && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Settings}
                            onClick={() => onManagePermissions(user.id)}
                            className="text-neutral-600 hover:text-primary-600"
                          >
                            Permissions
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Edit}
                            onClick={() => onEdit(user.id)}
                            className="text-neutral-600 hover:text-primary-600"
                          >
                            Edit
                          </Button>
                          {user.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleDelete(user.id, `${user.firstName} ${user.lastName}`)}
                              className="text-neutral-600 hover:text-red-600"
                            >
                              Deactivate
                            </Button>
                          )}
                        </>
                      )}
                      {!canEditUser(user) && (
                        <span className="text-xs text-neutral-400 italic">Restricted</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserList;