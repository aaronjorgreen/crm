import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Logo from '../ui/Logo';
import { 
  Home, Users, Settings, Zap, Mail, Brain, BarChart3, 
  FolderOpen, Calendar, MessageSquare, Bell, Search,
  ChevronLeft, ChevronRight, LogOut, User, Shield, Building,
  Crown, ChevronDown, Briefcase
} from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  permission?: string;
  badge?: number;
  children?: SidebarItem[];
}

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate }) => {
  const { authState, signOut, hasPermission } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['main']);

  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/dashboard',
      permission: 'dashboard.view'
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderOpen,
      path: '/projects',
      permission: 'boards.view',
      badge: 8
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: Building,
      path: '/clients',
      permission: 'clients.view',
      badge: 12
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      path: '/calendar',
      permission: 'dashboard.view'
    },
    {
      id: 'apps',
      label: 'Apps & Integrations',
      icon: Zap,
      path: '/apps',
      permission: 'apps.gmail',
      children: [
        {
          id: 'gmail',
          label: 'Gmail',
          icon: Mail,
          path: '/apps/gmail',
          permission: 'apps.gmail',
          badge: 12
        },
        {
          id: 'ai',
          label: 'AI Assistant',
          icon: Brain,
          path: '/apps/ai',
          permission: 'apps.ai'
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          path: '/apps/analytics',
          permission: 'apps.analytics'
        }
      ]
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: Settings,
      path: '/tools',
      permission: 'dashboard.view',
      children: [
        {
          id: 'reports',
          label: 'Report Generator',
          icon: BarChart3,
          path: '/tools/reports',
          permission: 'dashboard.analytics'
        },
        {
          id: 'templates',
          label: 'Templates',
          icon: FolderOpen,
          path: '/tools/templates',
          permission: 'boards.create'
        }
      ]
    },
    {
      id: 'admin',
      label: 'Administration',
      icon: Shield,
      path: '/admin',
      permission: 'admin.users',
      children: [
        {
          id: 'users',
          label: 'User Management',
          icon: Users,
          path: '/users',
          permission: 'admin.users'
        },
        {
          id: 'email-setup',
          label: 'Email Setup',
          icon: Mail,
          path: '/admin/email-setup',
          permission: 'admin.system'
        },
        {
          id: 'system',
          label: 'System Settings',
          icon: Settings,
          path: '/admin/system',
          permission: 'admin.system'
        }
      ]
    }
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const renderSidebarItem = (item: SidebarItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.includes(item.id);
    const isActive = currentPath === item.path;
    // Default to true for basic navigation items if auth is still loading
    const hasAccess = authState.loading ? true : !item.permission || hasPermission(item.permission);

    if (!hasAccess) return null;

    return (
      <div key={item.id} className="space-y-1">
        <button
          onClick={() => {
            if (hasChildren) {
              toggleSection(item.id);
            } else {
              onNavigate(item.path);
            }
          }}
          className={`
            w-full flex items-center justify-between px-3 py-3 rounded-xl text-left transition-all duration-200 group
            ${level > 0 ? 'ml-4 pl-8' : ''}
            ${isActive 
              ? 'bg-primary-100 text-primary-800 shadow-sm' 
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }
          `}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <item.icon className={`
              h-5 w-5 flex-shrink-0 transition-colors duration-200
              ${isActive ? 'text-primary-600' : 'text-neutral-500 group-hover:text-neutral-700'}
            `} />
            {!isCollapsed && (
              <>
                <span className="font-medium text-sm truncate">{item.label}</span>
                {item.badge && (
                  <span className="bg-primary-500 text-white text-xs px-2 py-1 rounded-full font-semibold min-w-[20px] text-center">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </div>
          
          {!isCollapsed && hasChildren && (
            <ChevronRight className={`
              h-4 w-4 text-neutral-400 transition-transform duration-200
              ${isExpanded ? 'rotate-90' : ''}
            `} />
          )}
        </button>

        {hasChildren && isExpanded && !isCollapsed && (
          <div className="space-y-1">
            {item.children?.map(child => renderSidebarItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`
      bg-white border-r border-neutral-200 flex flex-col transition-all duration-300 ease-in-out
      ${isCollapsed ? 'w-20' : 'w-72'}
    `}>
      {/* Header */}
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <Logo variant="primary" size="md" showText={true} />
          )}
          {isCollapsed && (
            <Logo variant="primary" size="md" showText={false} />
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-neutral-500" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-neutral-500" />
            )}
          </button>
        </div>
      </div>

      {/* User Info */}
      {!isCollapsed && authState.user && (
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              authState.user.role === 'super_admin' ? 'bg-purple-100 text-purple-600' :
              authState.user.role === 'admin' ? 'bg-blue-100 text-blue-600' : 
              'bg-green-100 text-green-600'
            }`}>
              {authState.user.role === 'super_admin' ? (
                <Crown className="h-4 w-4" />
              ) : authState.user.role === 'admin' ? (
                <Shield className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-neutral-900 truncate">
                {authState.user.firstName} {authState.user.lastName}
              </div>
              <div className="text-xs text-neutral-500 truncate">
                {authState.user.role === 'super_admin' ? 'Super Administrator' :
                 authState.user.role === 'admin' ? 'Administrator' : 'Member'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-2">
          {sidebarItems.map(item => renderSidebarItem(item))}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-200">
        <button
          onClick={signOut}
          className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-all duration-200"
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span className="font-medium text-sm">Sign Out</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;