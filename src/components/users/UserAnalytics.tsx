import React, { useState, useEffect } from 'react';
import { userService } from '../../lib/users';
import { AnalyticsData, UserActivity } from '../../types/user';
import { 
  Activity, Users, TrendingUp, Clock, 
  BarChart3, Eye, Filter, Calendar,
  Shield, Crown, User, AlertTriangle
} from 'lucide-react';

const UserAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await userService.getAnalyticsData();
      
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setAnalyticsData(data);
      }
      
      setLoading(false);
    };

    fetchAnalytics();
  }, [timeRange]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'user_login':
        return Shield;
      case 'user_logout':
        return Shield;
      case 'user_invited':
        return Users;
      case 'user_registered':
        return User;
      default:
        return Activity;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'user_login':
        return 'text-green-600 bg-green-100';
      case 'user_logout':
        return 'text-blue-600 bg-blue-100';
      case 'user_invited':
        return 'text-purple-600 bg-purple-100';
      case 'user_registered':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-neutral-600 bg-neutral-100';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Error loading analytics</p>
            <p className="text-sm text-neutral-500 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 flex items-center space-x-2">
            <Crown className="h-5 w-5 text-purple-600" />
            <span>Super Admin Analytics</span>
          </h3>
          <p className="text-sm text-neutral-600">Platform-wide insights and user activity</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-neutral-500" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">Daily Active Users</p>
              <p className="text-2xl font-bold text-green-600">{analyticsData.performanceMetrics.dailyActiveUsers}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600 font-medium">+12%</span>
            <span className="text-neutral-500 ml-1">vs yesterday</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">Weekly Active Users</p>
              <p className="text-2xl font-bold text-blue-600">{analyticsData.performanceMetrics.weeklyActiveUsers}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
            <span className="text-blue-600 font-medium">+8%</span>
            <span className="text-neutral-500 ml-1">vs last week</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">Monthly Active Users</p>
              <p className="text-2xl font-bold text-purple-600">{analyticsData.performanceMetrics.monthlyActiveUsers}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-purple-500 mr-1" />
            <span className="text-purple-600 font-medium">+15%</span>
            <span className="text-neutral-500 ml-1">vs last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">System Health</p>
              <p className="text-2xl font-bold text-green-600">{analyticsData.systemHealth.uptime}%</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-neutral-500">Response time: {analyticsData.systemHealth.responseTime}ms</span>
          </div>
        </div>
      </div>

      {/* Top Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
          <div className="p-6 border-b border-neutral-200">
            <h4 className="text-lg font-semibold text-neutral-900">Top User Actions</h4>
            <p className="text-sm text-neutral-600">Most frequent activities across the platform</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analyticsData.performanceMetrics.topActions.slice(0, 8).map((action, index) => {
                const ActionIcon = getActionIcon(action.action);
                return (
                  <div key={action.action} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getActionColor(action.action)}`}>
                        <ActionIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-neutral-900">
                          {action.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-sm text-neutral-500">#{index + 1} most frequent</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-neutral-900">{action.count}</div>
                      <div className="text-sm text-neutral-500">times</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
          <div className="p-6 border-b border-neutral-200">
            <h4 className="text-lg font-semibold text-neutral-900">Recent Activity</h4>
            <p className="text-sm text-neutral-600">Latest user actions across the platform</p>
          </div>
          <div className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {analyticsData.userActivity.slice(0, 20).map((activity) => {
                const ActionIcon = getActionIcon(activity.action);
                return (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${getActionColor(activity.action)} flex-shrink-0`}>
                      <ActionIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-neutral-900">
                          {activity.user?.firstName} {activity.user?.lastName}
                        </span>
                        <span className="text-sm text-neutral-500">
                          {activity.action.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-neutral-500">
                        {formatDate(activity.createdAt)}
                      </div>
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <div className="text-xs text-neutral-400 mt-1">
                          {JSON.stringify(activity.metadata, null, 0).slice(0, 100)}...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* System Health Details */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
        <div className="p-6 border-b border-neutral-200">
          <h4 className="text-lg font-semibold text-neutral-900">System Health Overview</h4>
          <p className="text-sm text-neutral-600">Real-time platform performance metrics</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {analyticsData.systemHealth.uptime}%
              </div>
              <div className="text-sm font-medium text-neutral-700">Uptime</div>
              <div className="text-xs text-neutral-500 mt-1">Last 30 days</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {analyticsData.systemHealth.responseTime}ms
              </div>
              <div className="text-sm font-medium text-neutral-700">Avg Response Time</div>
              <div className="text-xs text-neutral-500 mt-1">API endpoints</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {analyticsData.systemHealth.errorRate}%
              </div>
              <div className="text-sm font-medium text-neutral-700">Error Rate</div>
              <div className="text-xs text-neutral-500 mt-1">Last 24 hours</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAnalytics;