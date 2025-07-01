import React, { useState, useEffect } from 'react';
import { Project, ProjectFilters, ProjectStats } from '../types/project';
import { projectService } from '../lib/projects';
import MainLayout from '../components/layout/MainLayout';
import ProjectList from '../components/projects/ProjectList';
import ProjectKanban from '../components/projects/ProjectKanban';
import PermissionGate from '../components/demo/PermissionGate';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { 
  Plus, Search, Filter, LayoutGrid, List, Calendar,
  TrendingUp, Clock, CheckCircle, AlertTriangle, Users
} from 'lucide-react';

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchStats();
  }, [filters]);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await projectService.getProjects({
      ...filters,
      search: searchTerm || undefined
    });
    
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProjects(data || []);
    }
    
    setLoading(false);
  };

  const fetchStats = async () => {
    const { data } = await projectService.getProjectStats();
    setStats(data);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value || undefined }));
  };

  const handleFilterChange = (key: keyof ProjectFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setViewMode('kanban');
  };

  const handleProjectEdit = (project: Project) => {
    // TODO: Open project edit modal
    console.log('Edit project:', project);
  };

  const handleProjectDelete = async (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      const { error } = await projectService.deleteProject(projectId);
      if (!error) {
        fetchProjects();
        fetchStats();
      }
    }
  };

  if (error) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">Error loading projects: {error}</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        <PermissionGate permission="boards.view">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-neutral-900">
                {selectedProject ? selectedProject.name : 'Projects'}
              </h1>
              <p className="text-neutral-600">
                {selectedProject 
                  ? 'Manage tasks and track progress'
                  : 'Manage your projects and track progress across your team'
                }
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {selectedProject && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedProject(null);
                    setViewMode('list');
                  }}
                >
                  ← Back to Projects
                </Button>
              )}
              <PermissionGate permission="boards.create" showFallback={false}>
                <Button variant="primary" icon={Plus}>
                  New Project
                </Button>
              </PermissionGate>
            </div>
          </div>

          {/* Stats Cards */}
          {!selectedProject && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Total Projects</p>
                    <p className="text-2xl font-bold text-neutral-900">{stats.totalProjects}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <LayoutGrid className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Active Projects</p>
                    <p className="text-2xl font-bold text-green-600">{stats.activeProjects}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Completed</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.completedProjects}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Overdue Tasks</p>
                    <p className="text-2xl font-bold text-red-600">{stats.overdueTasks}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <Clock className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters and View Toggle */}
          {!selectedProject && (
            <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex-1 max-w-md">
                  <Input
                    placeholder="Search projects..."
                    icon={Search}
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center space-x-3">
                  <select
                    value={filters.status?.[0] || 'all'}
                    onChange={(e) => handleFilterChange('status', e.target.value === 'all' ? undefined : [e.target.value])}
                    className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Status</option>
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <select
                    value={filters.priority?.[0] || 'all'}
                    onChange={(e) => handleFilterChange('priority', e.target.value === 'all' ? undefined : [e.target.value])}
                    className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Priority</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>

                  <div className="flex items-center space-x-2 border border-neutral-300 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'list' 
                          ? 'bg-primary-100 text-primary-600' 
                          : 'text-neutral-400 hover:text-neutral-600'
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('kanban')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'kanban' 
                          ? 'bg-primary-100 text-primary-600' 
                          : 'text-neutral-400 hover:text-neutral-600'
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          {selectedProject ? (
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 min-h-[600px]">
              <ProjectKanban 
                project={selectedProject}
                onTaskUpdate={(task) => {
                  // Handle task updates
                  console.log('Task updated:', task);
                }}
              />
            </div>
          ) : viewMode === 'list' ? (
            <ProjectList
              projects={projects}
              loading={loading}
              onProjectSelect={handleProjectSelect}
              onProjectEdit={handleProjectEdit}
              onProjectDelete={handleProjectDelete}
            />
          ) : (
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 min-h-[600px]">
              <div className="text-center py-12">
                <LayoutGrid className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Kanban View</h3>
                <p className="text-neutral-600 mb-6">Select a project to view its kanban board</p>
              </div>
            </div>
          )}
        </PermissionGate>
      </div>
    </MainLayout>
  );
};

export default ProjectsPage;