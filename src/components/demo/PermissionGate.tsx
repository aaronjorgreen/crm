import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Lock, AlertTriangle } from 'lucide-react';

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

const PermissionGate: React.FC<PermissionGateProps> = ({ 
  permission, 
  children, 
  fallback,
  showFallback = true 
}) => {
  const { hasPermission, authState } = useAuth();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  if (!showFallback) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="p-3 bg-neutral-200 rounded-full">
          <Lock className="h-6 w-6 text-neutral-500" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-neutral-700">Access Restricted</h3>
          <p className="text-sm text-neutral-500">
            Your current role ({authState.user?.role}) doesn't have the "{permission}" permission.
          </p>
          <div className="flex items-center justify-center space-x-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mt-3">
            <AlertTriangle className="h-4 w-4" />
            <span>Contact your administrator to request access to this feature</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionGate;