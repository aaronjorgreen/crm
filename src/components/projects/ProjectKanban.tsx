import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Task, Project } from '../../types/project';
import { projectService } from '../../lib/projects';
import { 
  Plus, MoreHorizontal, Calendar, User, Clock, 
  AlertCircle, CheckCircle, ArrowRight, Tag
} from 'lucide-react';
import Button from '../ui/Button';

interface ProjectKanbanProps {
  project: Project;
  onTaskUpdate?: (task: Task) => void;
}

const ProjectKanban: React.FC<ProjectKanbanProps> = ({ project, onTaskUpdate }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-neutral-100 text-neutral-700' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100 text-blue-700' },
    { id: 'review', title: 'Review', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'completed', title: 'Completed', color: 'bg-green-100 text-green-700' }
  ];

  useEffect(() => {
    fetchTasks();
  }, [project.id]);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await projectService.getProjectTasks(project.id);
    
    if (error) {
      setError(error.message);
    } else {
      setTasks(data || []);
    }
    
    setLoading(false);
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const task = tasks.find(t => t.id === draggableId);
    if (!task) return;

    // Update task status if moved to different column
    if (source.droppableId !== destination.droppableId) {
      const newStatus = destination.droppableId as Task['status'];
      
      const { data: updatedTask, error } = await projectService.updateTask(task.id, {
        status: newStatus
      });

      if (error) {
        console.error('Failed to update task:', error);
        return;
      }

      if (updatedTask && onTaskUpdate) {
        onTaskUpdate(updatedTask);
      }
    }

    // Update local state
    const newTasks = Array.from(tasks);
    const [reorderedTask] = newTasks.splice(source.index, 1);
    reorderedTask.status = destination.droppableId as Task['status'];
    newTasks.splice(destination.index, 0, reorderedTask);
    
    setTasks(newTasks);
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-neutral-500';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        Error loading tasks: {error}
      </div>
    );
  }

  return (
    <div className="h-full">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">
          {columns.map((column) => (
            <div key={column.id} className="flex flex-col h-full">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h3 className="font-semibold text-neutral-900">{column.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${column.color}`}>
                    {getTasksByStatus(column.id).length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Plus}
                  className="text-neutral-500 hover:text-primary-600"
                >
                  Add
                </Button>
              </div>

              {/* Column Content */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-3 p-3 rounded-xl transition-colors duration-200 ${
                      snapshot.isDraggingOver 
                        ? 'bg-primary-50 border-2 border-primary-200' 
                        : 'bg-neutral-50 border-2 border-transparent'
                    }`}
                  >
                    {getTasksByStatus(column.id).map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white rounded-xl border border-neutral-200 p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                              snapshot.isDragging ? 'rotate-3 shadow-lg' : ''
                            }`}
                          >
                            {/* Task Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
                                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                                  {task.priority}
                                </span>
                              </div>
                              <button className="text-neutral-400 hover:text-neutral-600">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Task Title */}
                            <h4 className="font-semibold text-neutral-900 mb-2 line-clamp-2">
                              {task.title}
                            </h4>

                            {/* Task Description */}
                            {task.description && (
                              <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                                {task.description}
                              </p>
                            )}

                            {/* Task Tags */}
                            {task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {task.tags.slice(0, 2).map((tag, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-700"
                                  >
                                    <Tag className="h-3 w-3 mr-1" />
                                    {tag}
                                  </span>
                                ))}
                                {task.tags.length > 2 && (
                                  <span className="text-xs text-neutral-500">
                                    +{task.tags.length - 2} more
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Task Meta */}
                            <div className="space-y-2">
                              {/* Due Date */}
                              {task.dueDate && (
                                <div className={`flex items-center space-x-2 text-xs ${
                                  isOverdue(task.dueDate) 
                                    ? 'text-red-600' 
                                    : 'text-neutral-500'
                                }`}>
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatDate(task.dueDate)}</span>
                                  {isOverdue(task.dueDate) && (
                                    <AlertCircle className="h-3 w-3 text-red-500" />
                                  )}
                                </div>
                              )}

                              {/* Assignee */}
                              {task.assignee && (
                                <div className="flex items-center space-x-2">
                                  {task.assignee.avatarUrl ? (
                                    <img
                                      src={task.assignee.avatarUrl}
                                      alt={`${task.assignee.firstName} ${task.assignee.lastName}`}
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                                      <span className="text-xs font-semibold text-primary-600">
                                        {task.assignee.firstName.charAt(0)}
                                        {task.assignee.lastName.charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                  <span className="text-xs text-neutral-600">
                                    {task.assignee.firstName} {task.assignee.lastName}
                                  </span>
                                </div>
                              )}

                              {/* Time Estimate */}
                              {task.estimatedHours && (
                                <div className="flex items-center space-x-2 text-xs text-neutral-500">
                                  <Clock className="h-3 w-3" />
                                  <span>{task.estimatedHours}h estimated</span>
                                </div>
                              )}

                              {/* Comments Count */}
                              {task.comments.length > 0 && (
                                <div className="flex items-center space-x-2 text-xs text-neutral-500">
                                  <span>{task.comments.length} comments</span>
                                </div>
                              )}
                            </div>

                            {/* Progress Indicator */}
                            {task.status === 'in_progress' && (
                              <div className="mt-3 pt-3 border-t border-neutral-100">
                                <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
                                  <span>Progress</span>
                                  <span>75%</span>
                                </div>
                                <div className="w-full bg-neutral-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: '75%' }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {/* Empty State */}
                    {getTasksByStatus(column.id).length === 0 && (
                      <div className="text-center py-8 text-neutral-400">
                        <div className="w-12 h-12 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Plus className="h-6 w-6" />
                        </div>
                        <p className="text-sm">No tasks yet</p>
                        <p className="text-xs">Drag tasks here or click + to add</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default ProjectKanban;