import React, { useState, useEffect } from 'react';
import { usePermissions } from '../../hooks/useUsers';
import { userService } from '../../lib/users';
import { UserProfile, Permission } from '../../types/user';
import Button from '../ui/Button';
import { X, Shield, Check } from 'lucide-react';

interface UserPermissionsModalProps {
  userId: string;
  onClose: () => void;
}

const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({ userId, onClose }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { permissions, updateUserPermissions } = usePermissions();

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const { data, error } = await userService.getUserById(userId);
      if (data && !error) {
        setUser(data);
        setSelectedPermissions(data.permissions.map(p => p.id));
      } else {
        setError(error?.message || 'Failed to load user');
      }
      setLoading(false);
    };

    fetchUser();
  }, [userId]);

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const { error: saveError } = await updateUserPermissions(userId, selectedPermissions);

    if (saveError) {
      setError(saveError.message);
    } else {
      onClose();
    }

    setSaving(false);
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const categoryLabels = {
    dashboard: 'Dashboard',
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Loading user permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Manage Permissions</h2>
            {user && (
              <p className="text-sm text-neutral-600 mt-1">
                {user.firstName} {user.lastName} ({user.email})
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{categoryIcons[category as keyof typeof categoryIcons]}</span>
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 gap-3 ml-6">
                  {categoryPermissions.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex items-start space-x-3 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition-colors duration-150"
                    >
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission.id)}
                          onChange={() => handlePermissionToggle(permission.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-neutral-900">
                            {permission.name.split('.')[1]?.replace('_', ' ') || permission.name}
                          </p>
                          {selectedPermissions.includes(permission.id) && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          {permission.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-neutral-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            fullWidth
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            loading={saving}
            fullWidth
          >
            Save Permissions
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserPermissionsModal;