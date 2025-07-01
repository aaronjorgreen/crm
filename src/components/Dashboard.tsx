import React from 'react';
import { useAuth } from '../hooks/useAuth';
import Button from './ui/Button';
import Logo from './ui/Logo';
import { LogOut, Settings, Users, BarChart3, Plus, FileText, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { authState, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between items-center h-20">
            <Logo variant="primary" size="md" showText={true} />
            
            <div className="flex items-center space-x-6">
              <span className="text-sm font-medium text-neutral-600">
                Welcome back, <span className="text-neutral-900">{authState.user?.firstName} {authState.user?.lastName}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon={LogOut}
                onClick={signOut}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-8">
        <div className="space-y-12">
          {/* Page Header */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-neutral-900 tracking-tight">Dashboard</h1>
            <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl">
              Your personalized command center for InnovateX Labs
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white overflow-hidden shadow-lg rounded-2xl border border-neutral-200/60 hover:shadow-xl transition-all duration-300">
              <div className="p-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <dt className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">
                      Active Clients
                    </dt>
                    <dd className="text-3xl font-bold text-neutral-900">
                      12
                    </dd>
                    <div className="flex items-center text-sm">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-green-600 font-medium">+2.5%</span>
                      <span className="text-neutral-500 ml-1">from last month</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
                      <Users className="h-8 w-8 text-primary-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-2xl border border-neutral-200/60 hover:shadow-xl transition-all duration-300">
              <div className="p-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <dt className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">
                      Projects in Progress
                    </dt>
                    <dd className="text-3xl font-bold text-neutral-900">
                      8
                    </dd>
                    <div className="flex items-center text-sm">
                      <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
                      <span className="text-blue-600 font-medium">+12%</span>
                      <span className="text-neutral-500 ml-1">from last month</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                      <BarChart3 className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-2xl border border-neutral-200/60 hover:shadow-xl transition-all duration-300">
              <div className="p-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <dt className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">
                      Pending Tasks
                    </dt>
                    <dd className="text-3xl font-bold text-neutral-900">
                      24
                    </dd>
                    <div className="flex items-center text-sm">
                      <TrendingUp className="h-4 w-4 text-orange-500 mr-1" />
                      <span className="text-orange-600 font-medium">+8%</span>
                      <span className="text-neutral-500 ml-1">from last week</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
                      <Settings className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <div className="bg-white shadow-lg rounded-2xl border border-neutral-200/60 overflow-hidden">
              <div className="px-8 py-6 border-b border-neutral-200/60">
                <h3 className="text-xl font-bold text-neutral-900">
                  Recent Activity
                </h3>
                <p className="text-sm text-neutral-600 mt-1">
                  Latest updates from your team
                </p>
              </div>
              <div className="p-8">
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-500 font-medium">
                    Activity feed coming soon...
                  </p>
                  <p className="text-sm text-neutral-400 mt-2">
                    Track all team activities and updates here
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white shadow-lg rounded-2xl border border-neutral-200/60 overflow-hidden">
              <div className="px-8 py-6 border-b border-neutral-200/60">
                <h3 className="text-xl font-bold text-neutral-900">
                  Quick Actions
                </h3>
                <p className="text-sm text-neutral-600 mt-1">
                  Common tasks and shortcuts
                </p>
              </div>
              <div className="p-8">
                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    fullWidth 
                    icon={Plus}
                    className="justify-start h-14 text-left"
                  >
                    <div className="flex flex-col items-start ml-2">
                      <span className="font-semibold">Create New Board</span>
                      <span className="text-xs text-neutral-500">Set up a new project workspace</span>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    fullWidth 
                    icon={Users}
                    className="justify-start h-14 text-left"
                  >
                    <div className="flex flex-col items-start ml-2">
                      <span className="font-semibold">Add Client</span>
                      <span className="text-xs text-neutral-500">Register a new client profile</span>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    fullWidth 
                    icon={BarChart3}
                    className="justify-start h-14 text-left"
                  >
                    <div className="flex flex-col items-start ml-2">
                      <span className="font-semibold">Generate Report</span>
                      <span className="text-xs text-neutral-500">Create performance analytics</span>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;