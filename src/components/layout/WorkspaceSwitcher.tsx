import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../lib/users';
import { Workspace } from '../../types/user';
import { ChevronDown, Building, Plus, Check } from 'lucide-react';

const WorkspaceSwitcher: React.FC = () => {
  const { authState, switchWorkspace } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authState.user) {
      fetchWorkspaces();
    } else {
      setWorkspaces([]);
    } else {
      setWorkspaces([]);
    }
  }, [authState.user]);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const { data, error } = await userService.getUserWorkspaces();
      if (!error && data) {
        setWorkspaces(data);
      } else {
        console.error('Error fetching workspaces:', error);
      }
    } catch (err) {
      console.error('Exception fetching workspaces:', err);
        setWorkspaces(data);
      } else {
        console.error('Error fetching workspaces:', error);
      }
    } catch (err) {
      console.error('Exception fetching workspaces:', err);
    }
    setLoading(false);
  };

  const handleWorkspaceSwitch = async (workspaceId: string) => {
    await switchWorkspace(workspaceId);
    setIsOpen(false);
  };

  const currentWorkspace = workspaces.find(w => w.id === authState.currentWorkspaceId) || 
                          workspaces.find(w => w.id === authState.user?.defaultWorkspaceId);

  // Don't show for regular members unless they have multiple workspaces
  if (!authState.user || (authState.user?.role === 'member' && workspaces.length <= 1)) {
    return null;
  }

  // Show a simplified version while loading
  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg min-w-0">
        <Building className="h-4 w-4 text-neutral-600 flex-shrink-0" />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-medium text-neutral-900 truncate">
            Loading workspaces...
          </div>
        </div>
      </div>
    );
  }

  // Show a simplified version while loading
  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg min-w-0">
        <Building className="h-4 w-4 text-neutral-600 flex-shrink-0" />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-medium text-neutral-900 truncate">
            Loading workspaces...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200 min-w-0"
      >
        <Building className="h-4 w-4 text-neutral-600 flex-shrink-0" />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-medium text-neutral-900 truncate">
            {currentWorkspace?.name || 'Select Workspace'}
          </div>
          {authState.user?.role !== 'member' && (
            <div className="text-xs text-neutral-500">
              {authState.user?.role === 'super_admin' ? 'Super Admin' : 'Admin'} • {workspaces.length} workspaces
            </div>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-neutral-200 z-20 max-h-64 overflow-y-auto">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Available Workspaces
              </div>
              
              {loading ? (
                <div className="px-3 py-2 text-sm text-neutral-500">Loading...</div>
              ) : (
                <>
                  {workspaces.map((workspace) => (
                    <button
                      key={workspace.id}
                      onClick={() => handleWorkspaceSwitch(workspace.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-neutral-50 rounded-md transition-colors duration-150"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <Building className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-neutral-900 truncate">
                            {workspace.name}
                          </div>
                          {workspace.owner && (
                            <div className="text-xs text-neutral-500 truncate">
                              Owner: {workspace.owner.firstName} {workspace.owner.lastName}
                            </div>
                          )}
                        </div>
                      </div>
                      {workspace.id === authState.currentWorkspaceId && (
                        <Check className="h-4 w-4 text-primary-600" />
                      )}
                    </button>
                  ))}
                  
                  {workspaces.length === 0 && (
                    <div className="px-3 py-2 text-sm text-neutral-500">
                      No workspaces available
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WorkspaceSwitcher;