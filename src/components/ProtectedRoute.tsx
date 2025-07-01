import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import SupabaseDiagnostic from './SupabaseDiagnostic';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  requiredPermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false,
  requireSuperAdmin = false,
  requiredPermission
}) => {
  const { authState, hasPermission } = useAuth();

  // Show diagnostic if there's an auth error (likely connection issue)
  if (authState.error && !authState.user && !authState.loading) {
    return <SupabaseDiagnostic />;
  }

  // Show loading state while checking auth
  if (authState.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600 font-medium">Loading your workspace...</p>
          <p className="text-sm text-neutral-500 mt-2">Setting up your CRM environment...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!authState.user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user account is locked
  if (authState.user.lockedUntil && new Date(authState.user.lockedUntil) > new Date()) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl border border-red-200 shadow-sm max-w-md">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13-9a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Account Locked</h3>
            <p className="text-neutral-600">Your account has been temporarily locked due to multiple failed login attempts. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if user account is inactive
  if (!authState.user.isActive) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl border border-orange-200 shadow-sm max-w-md">
          <div className="text-center">
            <div className="text-orange-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Account Inactive</h3>
            <p className="text-neutral-600">Your account has been deactivated. Please contact your administrator for assistance.</p>
          </div>
        </div>
      </div>
    );
  }

  // Check super admin requirement
  if (requireSuperAdmin && authState.user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Check admin requirement
  if (requireAdmin && !['admin', 'super_admin'].includes(authState.user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check specific permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;