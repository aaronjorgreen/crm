import React, { useState, useEffect } from 'react';
import { UpdateUserData } from '../../types/user';
import { userService } from '../../lib/users';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { X, User, Mail, Shield, Crown, Users } from 'lucide-react';

interface UserFormProps {
  userId?: string;
  onSubmit: (data: UpdateUserData) => Promise<{ data: any; error: any }>;
  onClose: () => void;
  currentUserRole: 'super_admin' | 'admin' | 'member';
}

const UserForm: React.FC<UserFormProps> = ({ userId, onSubmit, onClose, currentUserRole }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    role: 'member' as 'super_admin' | 'admin' | 'member',
    isActive: true,
    avatarUrl: ''
  });

  const isEditing = !!userId;

  useEffect(() => {
    if (isEditing) {
      const fetchUser = async () => {
        const { data, error } = await userService.getUserById(userId);
        if (data && !error) {
          setFormData({
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role,
            isActive: data.isActive,
            avatarUrl: data.avatarUrl || ''
          });
        }
      };
      fetchUser();
    }
  }, [userId, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData: UpdateUserData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        isActive: formData.isActive,
        avatarUrl: formData.avatarUrl || undefined
      };

      const { error: submitError } = await onSubmit(submitData);

      if (submitError) {
        setError(submitError.message);
      } else {
        // Log the activity
        await userService.logActivity('user_updated', 'user', userId, {
          changes: submitData
        });
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-bold text-neutral-900">
            Edit User
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              icon={User}
              placeholder="John"
              required
              fullWidth
            />
            <Input
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Doe"
              required
              fullWidth
            />
          </div>

          <Input
            label="Avatar URL (Optional)"
            name="avatarUrl"
            value={formData.avatarUrl}
            onChange={handleChange}
            placeholder="https://example.com/avatar.jpg"
            fullWidth
            helperText="URL to user's profile picture"
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

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
            />
            <label htmlFor="isActive" className="ml-3 text-sm font-medium text-neutral-700">
              Active User
            </label>
            <p className="ml-2 text-xs text-neutral-500">
              Inactive users cannot access the platform
            </p>
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
              fullWidth
            >
              Update User
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;