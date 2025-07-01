import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { useAuth } from '../../hooks/useAuth';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { authState } = useAuth();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  // Show loading state while auth is loading
  if (authState.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600 font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 flex">
      {/* Sidebar */}
      <Sidebar 
        currentPath={location.pathname}
        onNavigate={handleNavigate}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header with Workspace Switcher */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-neutral-200/60 px-6 py-4">
          <div className="flex items-center justify-between">
            <WorkspaceSwitcher />
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-neutral-600">
                Welcome back, <span className="font-semibold text-neutral-900">
                  {authState.user?.firstName} {authState.user?.lastName}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;