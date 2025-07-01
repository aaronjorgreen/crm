import React, { useState } from 'react';
import { CreateUserInvitationData } from '../../types/user';
import { userService } from '../../lib/users';
import { usePermissions } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { X, Mail, Shield, Send, Users, Crown } from 'lucide-react';

interface UserInvitationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const UserInvitationModal: React.FC<UserInvitationModalProps> = ({ 
  onClose, 
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateUserInvitationData>({
    email: '',
    role: 'member',
    permissions: []
  });

  const { permissions } = usePermissions();
  const { authState } = useAuth();
  
  // Determine available roles based on current user's role
  const currentUserRole = authState.user?.role || 'member';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: inviteError } = await userService.createInvitation(formData);

      if (inviteError) {
        setError(inviteError.message);
      } else {
        // Log the activity
        await userService.logActivity('user_invited', 'user', formData.email, {
          role: formData.role,
          permissions: formData.permissions,
          targetWorkspaceId: formData.targetWorkspaceId
        });
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions?.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...(prev.permissions || []), permissionId]
    }));
  };

  const availableRoles = currentUserRole === 'super_admin' 
    ? [
        { value: 'member', label: 'Member', icon: Users, description: 'Standard user access' },
        { value: 'admin', label: 'Administrator', icon: Shield, description: 'User management and team oversight' },
        { value: 'super_admin', label: 'Super Administrator', icon: Crown, description: 'Full platform control and analytics' }
      ]
    : [
        { value: 'member', label: 'Member', icon: Users, description: 'Standard user access' },
        { value: 'admin', label: 'Administrator', icon: Shield, description: 'User management and team oversight' }
      ];

  // Get available workspaces from user memberships
  const availableWorkspaces = authState.user?.memberships?.map(m => m.workspace) || [];

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const categoryLabels = {
    dashboard: 'Dashboard & Overview',
    boards: 'Boards & Projects',
    clients: 'Client Management',
    apps: 'Applications & Integrations',
    admin: 'Administration'
  };

  const categoryIcons = {
    dashboard: '📊',
    boards: '📋',
    clients: '👥',
    apps: '🔗',
    admin: '⚙️'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Send className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Invite New User</h2>
              <p className="text-sm text-neutral-600">Send a secure invitation to join the platform</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Email Input */}
          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            icon={Mail}
            placeholder="user@company.com"
            required
            fullWidth
            helperText="The user will receive a secure invitation link via email"
          />

          {/* Role Selection */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-neutral-700">
              User Role
            </label>
            <div className="grid grid-cols-1 gap-3">
              {availableRoles.map((role) => {
                const RoleIcon = role.icon;
                return (
                  <label
                    key={role.value}
                    className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      formData.role === role.value
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={formData.role === role.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className={`p-2 rounded-lg mr-4 ${
                      formData.role === role.value
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      <RoleIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-neutral-900">{role.label}</div>
                      <div className="text-sm text-neutral-600">{role.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Workspace Selection (Optional) */}
          {availableWorkspaces.length > 1 && (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-neutral-700">
                Target Workspace (Optional)
              </label>
              <select
                name="targetWorkspaceId"
                value={formData.targetWorkspaceId || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Create new workspace for user</option>
                {availableWorkspaces.map((workspace) => (
                  <option key={workspace?.id} value={workspace?.id}>
                    {workspace?.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-neutral-600">
                If left empty, a new workspace will be created for the user. If selected, they'll be added to the chosen workspace for collaboration.
              </p>
            </div>
          )}

          {/* Custom Permissions (Optional) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-neutral-700">
                Custom Permissions (Optional)
              </label>
              <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
                {formData.permissions?.length || 0} selected
              </span>
            </div>
            <p className="text-sm text-neutral-600">
              Leave empty to use default permissions for the selected role, or customize access levels.
            </p>
            
            <div className="space-y-4 max-h-60 overflow-y-auto border border-neutral-200 rounded-xl p-4">
              {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{categoryIcons[category as keyof typeof categoryIcons]}</span>
                    <h4 className="text-sm font-semibold text-neutral-700">
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 ml-6">
                    {categoryPermissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.permissions?.includes(permission.id) || false}
                          onChange={() => handlePermissionToggle(permission.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-neutral-900">
                            {permission.name.split('.')[1]?.replace('_', ' ') || permission.name}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {permission.description}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-blue-900">Security Notice</div>
                <div className="text-blue-700 mt-1">
                  • Invitation links expire in 7 days<br/>
                  • Users must verify their email before first login<br/>
                  • You can modify permissions after they join<br/>
                  • All invitation activity is logged for security<br/>
                  • Each user gets their own default workspace upon acceptance
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              icon={Send}
              fullWidth
            >
              Send Invitation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserInvitationModal;