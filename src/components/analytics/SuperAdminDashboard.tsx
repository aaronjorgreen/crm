import React, { useState, useEffect } from 'react';
import { useDemoAuth } from '../../hooks/useDemoAuth';
import { projectService } from '../../lib/projects';
import { clientService } from '../../lib/clients';
import { userService } from '../../lib/users';
import PermissionGate from '../demo/PermissionGate';
import { 
  Crown, TrendingUp, Users, Building, FolderOpen, 
  DollarSign, Activity, BarChart3, Filter, Download,
  Calendar, Clock, AlertTriangle, CheckCircle
} from 'lucide-react';

interface DashboardData {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    byRole: Record<string, number>;
  };
  clients: {
    total: number;
    active: number;
    totalValue: number;
    byIndustry: Record<string, number>;
    byStatus: Record<string, number>;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    totalBudget: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  };
  performance: {
    averageProjectDuration: number;
    clientRetentionRate: number;
    projectSuccessRate: number;
    revenueGrowth: number;
  };
}

const SuperAdminDashboard: React.FC = () => {
  const { authState } = useDemoAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['users', 'clients', 'projects', 'performance']);

  useEffect(() => {
    if (authState.user?.role === 'super_admin') {
      fetchDashboardData();
    }
  }, [authState.user, dateRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch data from all services
      const [userStats, clientStats, projectStats] = await Promise.all([
        userService.getUserStats(),
        clientService.getClientStats(),
        projectService.getProjectStats()
      ]);

      // Simulate comprehensive dashboard data
      const data: DashboardData = {
        users: {
          total: userStats.data?.totalUsers || 0,
          active: userStats.data?.activeUsers || 0,
          newThisMonth: userStats.data?.recentSignups || 0,
          byRole: {
            'super_admin': userStats.data?.superAdminUsers || 0,
            'admin': userStats.data?.adminUsers || 0,
            'member': userStats.data?.memberUsers || 0
          }
        },
        clients: {
          total: clientStats.data?.totalClients || 0,
          active: clientStats.data?.activeClients || 0,
          totalValue: clientStats.data?.totalValue || 0,
          byIndustry: {
            'technology': Math.floor(Math.random() * 20) + 5,
            'healthcare': Math.floor(Math.random() * 15) + 3,
            'finance': Math.floor(Math.random() * 12) + 2,
            'education': Math.floor(Math.random() * 10) + 1,
            'other': Math.floor(Math.random() * 8) + 1
          },
          byStatus: {
            'active': clientStats.data?.activeClients || 0,
            'prospect': clientStats.data?.prospectClients || 0,
            'inactive': Math.floor(Math.random() * 5),
            'archived': Math.floor(Math.random() * 3)
          }
        },
        projects: {
          total: projectStats.data?.totalProjects || 0,
          active: projectStats.data?.activeProjects || 0,
          completed: projectStats.data?.completedProjects || 0,
          totalBudget: projectStats.data?.totalBudget || 0,
          byStatus: {
            'planning': Math.floor(Math.random() * 8) + 2,
            'active': projectStats.data?.activeProjects || 0,
            'on_hold': Math.floor(Math.random() * 3),
            'completed': projectStats.data?.completedProjects || 0,
            'cancelled': Math.floor(Math.random() * 2)
          },
          byPriority: {
            'urgent': Math.floor(Math.random() * 5) + 1,
            'high': Math.floor(Math.random() * 10) + 3,
            'medium': Math.floor(Math.random() * 15) + 5,
            'low': Math.floor(Math.random() * 8) + 2
          }
        },
        performance: {
          averageProjectDuration: 45, // days
          clientRetentionRate: clientStats.data?.clientRetentionRate || 85,
          projectSuccessRate: 92,
          revenueGrowth: 18.5
        }
      };

      setDashboardData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (authState.user?.role !== 'super_admin') {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Super Admin Access Required</h3>
        <p className="text-neutral-600">This dashboard is only available to super administrators.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5" />
          <p className="font-medium">Error loading dashboard: {error}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Crown className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Super Admin Analytics</h2>
              <p className="text-sm text-neutral-600">Comprehensive platform insights and performance metrics</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            <button className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(dashboardData.clients.totalValue)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600 font-medium">+{dashboardData.performance.revenueGrowth}%</span>
            <span className="text-neutral-500 ml-1">vs last period</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">Active Users</p>
              <p className="text-2xl font-bold text-blue-600">{dashboardData.users.active}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
            <span className="text-blue-600 font-medium">+{dashboardData.users.newThisMonth}</span>
            <span className="text-neutral-500 ml-1">new this month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">Active Projects</p>
              <p className="text-2xl font-bold text-purple-600">{dashboardData.projects.active}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <FolderOpen className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <CheckCircle className="h-4 w-4 text-purple-500 mr-1" />
            <span className="text-purple-600 font-medium">{dashboardData.performance.projectSuccessRate}%</span>
            <span className="text-neutral-500 ml-1">success rate</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">Client Retention</p>
              <p className="text-2xl font-bold text-orange-600">{dashboardData.performance.clientRetentionRate}%</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Building className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-orange-500 mr-1" />
            <span className="text-orange-600 font-medium">+2.5%</span>
            <span className="text-neutral-500 ml-1">vs last quarter</span>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Distribution */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
          <div className="p-6 border-b border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-900">User Distribution</h3>
            <p className="text-sm text-neutral-600">Breakdown by role and activity</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(dashboardData.users.byRole).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      role === 'super_admin' ? 'bg-purple-100 text-purple-600' :
                      role === 'admin' ? 'bg-blue-100 text-blue-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {role === 'super_admin' ? <Crown className="h-4 w-4" /> :
                       role === 'admin' ? <Users className="h-4 w-4" /> :
                       <Users className="h-4 w-4" />}
                    </div>
                    <span className="font-medium text-neutral-900 capitalize">
                      {role.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-neutral-900">{count}</span>
                    <div className="w-20 bg-neutral-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          role === 'super_admin' ? 'bg-purple-600' :
                          role === 'admin' ? 'bg-blue-600' :
                          'bg-green-600'
                        }`}
                        style={{ width: `${(count / dashboardData.users.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Client Analytics */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
          <div className="p-6 border-b border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-900">Client Analytics</h3>
            <p className="text-sm text-neutral-600">Industry distribution and status</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-neutral-700 mb-3">By Industry</h4>
                <div className="space-y-2">
                  {Object.entries(dashboardData.clients.byIndustry).map(([industry, count]) => (
                    <div key={industry} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-600 capitalize">{industry}</span>
                      <span className="font-semibold text-neutral-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-4 border-t border-neutral-200">
                <h4 className="text-sm font-semibold text-neutral-700 mb-3">By Status</h4>
                <div className="space-y-2">
                  {Object.entries(dashboardData.clients.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-600 capitalize">{status}</span>
                      <span className="font-semibold text-neutral-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Performance */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
        <div className="p-6 border-b border-neutral-200">
          <h3 className="text-lg font-semibold text-neutral-900">Project Performance Overview</h3>
          <p className="text-sm text-neutral-600">Comprehensive project analytics and trends</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-4">Status Distribution</h4>
              <div className="space-y-3">
                {Object.entries(dashboardData.projects.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600 capitalize">{status.replace('_', ' ')}</span>
                    <span className="font-semibold text-neutral-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-4">Priority Breakdown</h4>
              <div className="space-y-3">
                {Object.entries(dashboardData.projects.byPriority).map(([priority, count]) => (
                  <div key={priority} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        priority === 'urgent' ? 'bg-red-500' :
                        priority === 'high' ? 'bg-orange-500' :
                        priority === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></div>
                      <span className="text-sm text-neutral-600 capitalize">{priority}</span>
                    </div>
                    <span className="font-semibold text-neutral-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-4">Key Metrics</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Avg Duration</span>
                  <span className="font-semibold text-neutral-900">{dashboardData.performance.averageProjectDuration} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Success Rate</span>
                  <span className="font-semibold text-green-600">{dashboardData.performance.projectSuccessRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Total Budget</span>
                  <span className="font-semibold text-neutral-900">{formatCurrency(dashboardData.projects.totalBudget)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;