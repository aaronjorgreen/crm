import React, { useState } from 'react';
import { Project } from '../../types/project';
import { 
  Calendar, Users, DollarSign, TrendingUp, MoreHorizontal,
  Clock, AlertCircle, CheckCircle, Play, Pause, Eye
} from 'lucide-react';
import Button from '../ui/Button';

interface ProjectListProps {
  projects: Project[];
  loading: boolean;
  onProjectSelect: (project: Project) => void;
  onProjectEdit: (project: Project) => void;
  onProjectDelete: (projectId: string) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  loading,
  onProjectSelect,
  onProjectEdit,
  onProjectDelete
}) => {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'planning': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'active': return <Play className="h-4 w-4 text-green-500" />;
      case 'on_hold': return <Pause className="h-4 w-4 text-orange-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-neutral-500" />;
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'planning': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-neutral-100 text-neutral-800';
    }
  };

  const getPriorityColor = (priority: Project['priority']) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-neutral-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const isOverdue = (endDate?: string) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date() && projects.find(p => p.endDate === endDate)?.status !== 'completed';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-neutral-200 p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-4 bg-neutral-200 rounded w-1/3"></div>
                <div className="h-3 bg-neutral-200 rounded w-2/3"></div>
                <div className="flex space-x-4">
                  <div className="h-3 bg-neutral-200 rounded w-20"></div>
                  <div className="h-3 bg-neutral-200 rounded w-20"></div>
                  <div className="h-3 bg-neutral-200 rounded w-20"></div>
                </div>
              </div>
              <div className="h-8 w-8 bg-neutral-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="h-8 w-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">No projects found</h3>
        <p className="text-neutral-600 mb-6">Get started by creating your first project</p>
        <Button variant="primary" icon={Calendar}>
          Create Project
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <div
          key={project.id}
          className={`bg-white rounded-xl border-l-4 border-r border-t border-b border-neutral-200 shadow-sm hover:shadow-md transition-all duration-200 ${getPriorityColor(project.priority)}`}
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-4">
                {/* Project Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <h3 
                        className="text-lg font-semibold text-neutral-900 hover:text-primary-600 cursor-pointer transition-colors"
                        onClick={() => onProjectSelect(project)}
                      >
                        {project.name}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(project.status)}`}>
                        {getStatusIcon(project.status)}
                        <span className="ml-1 capitalize">{project.status.replace('_', ' ')}</span>
                      </span>
                      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                        {project.priority}
                      </span>
                    </div>
                    
                    {project.description && (
                      <p className="text-neutral-600 text-sm line-clamp-2 max-w-2xl">
                        {project.description}
                      </p>
                    )}

                    {/* Client Info */}
                    {project.client && (
                      <div className="flex items-center space-x-2 text-sm text-neutral-600">
                        <span className="font-medium">Client:</span>
                        <span>{project.client.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                      onClick={() => onProjectSelect(project)}
                    >
                      View
                    </Button>
                    <button className="text-neutral-400 hover:text-neutral-600">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Project Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-600 font-medium">Progress</span>
                      <span className="font-semibold text-neutral-900">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-neutral-600">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">Team</span>
                    </div>
                    <div className="flex -space-x-2">
                      {project.teamMembers.slice(0, 3).map((member) => (
                        <div
                          key={member.id}
                          className="w-8 h-8 rounded-full border-2 border-white bg-primary-100 flex items-center justify-center"
                          title={`${member.user.firstName} ${member.user.lastName}`}
                        >
                          {member.user.avatarUrl ? (
                            <img
                              src={member.user.avatarUrl}
                              alt={`${member.user.firstName} ${member.user.lastName}`}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-semibold text-primary-600">
                              {member.user.firstName.charAt(0)}
                              {member.user.lastName.charAt(0)}
                            </span>
                          )}
                        </div>
                      ))}
                      {project.teamMembers.length > 3 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-neutral-200 flex items-center justify-center">
                          <span className="text-xs font-semibold text-neutral-600">
                            +{project.teamMembers.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-neutral-600">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">Timeline</span>
                    </div>
                    <div className="text-sm">
                      <div className="text-neutral-900 font-medium">
                        {formatDate(project.startDate)}
                      </div>
                      {project.endDate && (
                        <div className={`text-xs ${isOverdue(project.endDate) ? 'text-red-600 font-semibold' : 'text-neutral-500'}`}>
                          Due: {formatDate(project.endDate)}
                          {isOverdue(project.endDate) && (
                            <span className="ml-1">⚠️</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Budget */}
                  {project.budget && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-neutral-600">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">Budget</span>
                      </div>
                      <div className="text-sm">
                        <div className="text-neutral-900 font-medium">
                          {formatCurrency(project.budget)}
                        </div>
                        {project.spentBudget && (
                          <div className="text-xs text-neutral-500">
                            Spent: {formatCurrency(project.spentBudget)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Project Tags */}
                {project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectList;