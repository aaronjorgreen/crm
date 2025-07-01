import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import PermissionGate from '../demo/PermissionGate';
import { 
  Users, FolderOpen, Mail, Calendar, TrendingUp, 
  Clock, MessageSquare, Bell, Activity, BarChart3,
  ArrowRight, Plus, Eye, Edit, Send
} from 'lucide-react';

const DashboardOverview: React.FC = () => {
  const { hasPermission } = useAuth();

  const clientsData = [
    { name: 'TechCorp Inc.', status: 'Active', lastContact: '2 hours ago', projects: 3 },
    { name: 'StartupXYZ', status: 'Pending', lastContact: '1 day ago', projects: 1 },
    { name: 'Enterprise Solutions', status: 'Active', lastContact: '3 hours ago', projects: 2 },
    { name: 'Digital Innovations', status: 'Active', lastContact: '5 hours ago', projects: 4 }
  ];

  const projectsData = [
    { name: 'Website Redesign', client: 'TechCorp Inc.', progress: 75, dueDate: '2025-01-20', status: 'On Track' },
    { name: 'Mobile App Development', client: 'StartupXYZ', progress: 45, dueDate: '2025-02-15', status: 'In Progress' },
    { name: 'Brand Identity', client: 'Enterprise Solutions', progress: 90, dueDate: '2025-01-10', status: 'Almost Done' },
    { name: 'E-commerce Platform', client: 'Digital Innovations', progress: 30, dueDate: '2025-03-01', status: 'Starting' }
  ];

  const recentEmails = [
    { from: 'john@techcorp.com', subject: 'Project Update Required', time: '10 min ago', unread: true },
    { from: 'sarah@startupxyz.com', subject: 'Meeting Confirmation', time: '1 hour ago', unread: true },
    { from: 'mike@enterprise.com', subject: 'Final Review Complete', time: '2 hours ago', unread: false },
    { from: 'lisa@digital.com', subject: 'New Requirements', time: '3 hours ago', unread: true }
  ];

  const upcomingEvents = [
    { title: 'Client Presentation', time: '2:00 PM', client: 'TechCorp Inc.' },
    { title: 'Team Standup', time: '3:30 PM', client: 'Internal' },
    { title: 'Project Review', time: '4:00 PM', client: 'StartupXYZ' },
    { title: 'Strategy Meeting', time: '5:00 PM', client: 'Enterprise Solutions' }
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': case 'on track': case 'almost done':
        return 'bg-green-100 text-green-800';
      case 'pending': case 'in progress': case 'starting':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Clients Overview */}
      <PermissionGate permission="clients.view">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-neutral-900">Recent Clients</h3>
            </div>
            <button className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors duration-200">
              <span>View All</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {clientsData.map((client, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-semibold text-sm">
                        {client.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-neutral-900">{client.name}</div>
                      <div className="text-sm text-neutral-500">Last contact: {client.lastContact}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(client.status)}`}>
                      {client.status}
                    </span>
                    <span className="text-sm text-neutral-500">{client.projects} projects</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PermissionGate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Projects Overview */}
        <PermissionGate permission="boards.view">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FolderOpen className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-neutral-900">Active Projects</h3>
              </div>
              <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors duration-200">
                <Plus className="h-4 w-4" />
                <span>New Project</span>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {projectsData.map((project, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-neutral-900">{project.name}</div>
                        <div className="text-sm text-neutral-500">{project.client}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-600">Progress</span>
                        <span className="font-semibold text-neutral-900">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-neutral-500">Due: {project.dueDate}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PermissionGate>

        {/* Gmail Integration */}
        <PermissionGate permission="apps.gmail">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-neutral-900">Recent Emails</h3>
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                  3
                </span>
              </div>
              <button className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium text-sm transition-colors duration-200">
                <Send className="h-4 w-4" />
                <span>Compose</span>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {recentEmails.map((email, index) => (
                  <div key={index} className={`p-3 rounded-lg border transition-colors duration-200 hover:bg-neutral-50 ${
                    email.unread ? 'border-red-200 bg-red-50/30' : 'border-neutral-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {email.unread && (
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                        <div>
                          <div className={`text-sm ${email.unread ? 'font-semibold text-neutral-900' : 'text-neutral-700'}`}>
                            {email.from}
                          </div>
                          <div className={`text-sm ${email.unread ? 'font-medium text-neutral-800' : 'text-neutral-600'}`}>
                            {email.subject}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-neutral-500">{email.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PermissionGate>
      </div>

      {/* Calendar & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Schedule */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-neutral-900">Today's Schedule</h3>
            </div>
            <button className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 font-medium text-sm transition-colors duration-200">
              <Eye className="h-4 w-4" />
              <span>Full Calendar</span>
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {upcomingEvents.map((event, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 bg-purple-50 rounded-lg">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-neutral-900">{event.title}</div>
                    <div className="text-sm text-neutral-600">{event.client}</div>
                  </div>
                  <div className="text-sm font-semibold text-purple-600">{event.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-neutral-900">Recent Activity</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Edit className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-900">Project updated</div>
                  <div className="text-xs text-neutral-500">Website Redesign progress updated to 75%</div>
                  <div className="text-xs text-neutral-400">2 hours ago</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-900">New message</div>
                  <div className="text-xs text-neutral-500">Client feedback received for Brand Identity</div>
                  <div className="text-xs text-neutral-400">3 hours ago</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-900">Meeting scheduled</div>
                  <div className="text-xs text-neutral-500">Strategy meeting with Enterprise Solutions</div>
                  <div className="text-xs text-neutral-400">4 hours ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;