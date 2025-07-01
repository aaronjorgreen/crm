import { supabase } from './supabase';
import { 
  Project, 
  Task, 
  ProjectTemplate, 
  ProjectFilters, 
  ProjectStats,
  ProjectMember,
  TaskComment
} from '../types/project';
import { userService } from './users';

export const projectService = {
  // Get all projects with filters
  async getProjects(filters: ProjectFilters = {}): Promise<{ data: Project[] | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    let query = supabase
      .from('projects')
      .select(`
        *,
        client:clients(*),
        project_members!project_members_project_id_fkey(
          *,
          user:user_profiles(*)
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority);
    }

    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.dateRange) {
      query = query.gte('start_date', filters.dateRange.start)
                  .lte('start_date', filters.dateRange.end);
    }

    const { data, error } = await query;

    if (error) return { data: null, error };

    // Transform the data
    const transformedData = data?.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      clientId: project.client_id,
      client: project.client ? {
        id: project.client.id,
        name: project.client.name,
        email: project.client.email,
        phone: project.client.phone,
        website: project.client.website,
        industry: project.client.industry,
        companySize: project.client.company_size,
        address: project.client.address,
        contacts: [],
        projects: [],
        totalValue: project.client.total_value || 0,
        status: project.client.status,
        tags: project.client.tags || [],
        notes: project.client.notes || '',
        createdBy: project.client.created_by,
        createdAt: project.client.created_at,
        updatedAt: project.client.updated_at,
        lastContactDate: project.client.last_contact_date,
        nextFollowUpDate: project.client.next_follow_up_date,
        workspaceId: project.client.workspace_id
      } : undefined,
      teamMembers: project.project_members?.map((member: any) => ({
        id: member.id,
        userId: member.user_id,
        projectId: member.project_id,
        role: member.role,
        joinedAt: member.joined_at,
        user: {
          id: member.user.id,
          firstName: member.user.first_name,
          lastName: member.user.last_name,
          email: member.user.email,
          avatarUrl: member.user.avatar_url
        }
      })) || [],
      startDate: project.start_date,
      endDate: project.end_date,
      estimatedHours: project.estimated_hours || 0,
      actualHours: project.actual_hours || 0,
      budget: project.budget,
      spentBudget: project.spent_budget || 0,
      progress: project.progress || 0,
      tags: project.tags || [],
      attachments: project.attachments || [],
      createdBy: project.created_by,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      workspaceId: project.workspace_id
    })) || [];

    return { data: transformedData, error: null };
  },

  // Get single project by ID
  async getProjectById(id: string): Promise<{ data: Project | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(*),
        project_members!project_members_project_id_fkey(
          *,
          user:user_profiles(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) return { data: null, error };

    const transformedData = {
      id: data.id,
      name: data.name,
      description: data.description,
      status: data.status,
      priority: data.priority,
      clientId: data.client_id,
      client: data.client ? {
        id: data.client.id,
        name: data.client.name,
        email: data.client.email,
        phone: data.client.phone,
        website: data.client.website,
        industry: data.client.industry,
        companySize: data.client.company_size,
        address: data.client.address,
        contacts: [],
        projects: [],
        totalValue: data.client.total_value || 0,
        status: data.client.status,
        tags: data.client.tags || [],
        notes: data.client.notes || '',
        createdBy: data.client.created_by,
        createdAt: data.client.created_at,
        updatedAt: data.client.updated_at,
        lastContactDate: data.client.last_contact_date,
        nextFollowUpDate: data.client.next_follow_up_date,
        workspaceId: data.client.workspace_id
      } : undefined,
      teamMembers: data.project_members?.map((member: any) => ({
        id: member.id,
        userId: member.user_id,
        projectId: member.project_id,
        role: member.role,
        joinedAt: member.joined_at,
        user: {
          id: member.user.id,
          firstName: member.user.first_name,
          lastName: member.user.last_name,
          email: member.user.email,
          avatarUrl: member.user.avatar_url
        }
      })) || [],
      startDate: data.start_date,
      endDate: data.end_date,
      estimatedHours: data.estimated_hours || 0,
      actualHours: data.actual_hours || 0,
      budget: data.budget,
      spentBudget: data.spent_budget || 0,
      progress: data.progress || 0,
      tags: data.tags || [],
      attachments: data.attachments || [],
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      workspaceId: data.workspace_id
    };

    return { data: transformedData, error: null };
  },

  // Create new project
  async createProject(projectData: Partial<Project>): Promise<{ data: Project | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get user's default workspace if no workspace specified
    let workspaceId = projectData.workspaceId;
    if (!workspaceId) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single();
      
      workspaceId = userProfile?.default_workspace_id;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        description: projectData.description,
        status: projectData.status || 'planning',
        priority: projectData.priority || 'medium',
        client_id: projectData.clientId,
        start_date: projectData.startDate,
        end_date: projectData.endDate,
        estimated_hours: projectData.estimatedHours || 0,
        budget: projectData.budget,
        tags: projectData.tags || [],
        workspace_id: workspaceId,
        created_by: user.id
      })
      .select()
      .single();

    if (error) return { data: null, error };

    // Add creator as project owner
    await supabase
      .from('project_members')
      .insert({
        project_id: data.id,
        user_id: user.id,
        role: 'owner'
      });

    // Log activity
    await userService.logActivity('project_created', 'project', data.id, {
      projectName: projectData.name,
      clientId: projectData.clientId
    }, workspaceId);

    return this.getProjectById(data.id);
  },

  // Update project
  async updateProject(id: string, updates: Partial<Project>): Promise<{ data: Project | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
    if (updates.estimatedHours !== undefined) updateData.estimated_hours = updates.estimatedHours;
    if (updates.actualHours !== undefined) updateData.actual_hours = updates.actualHours;
    if (updates.budget !== undefined) updateData.budget = updates.budget;
    if (updates.spentBudget !== undefined) updateData.spent_budget = updates.spentBudget;
    if (updates.progress !== undefined) updateData.progress = updates.progress;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.workspaceId !== undefined) updateData.workspace_id = updates.workspaceId;

    const { error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id);

    if (error) return { data: null, error };

    // Get the project to log activity with workspace context
    const { data: project } = await supabase
      .from('projects')
      .select('workspace_id')
      .eq('id', id)
      .single();

    // Log activity
    if (project) {
      await userService.logActivity('project_updated', 'project', id, {
        updates: Object.keys(updateData)
      }, project.workspace_id);
    }

    return this.getProjectById(id);
  },

  // Delete project
  async deleteProject(id: string): Promise<{ error: any }> {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } };
    }

    // Get the project to log activity with workspace context
    const { data: project } = await supabase
      .from('projects')
      .select('workspace_id, name')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (!error && project) {
      // Log activity
      await userService.logActivity('project_deleted', 'project', id, {
        projectName: project.name
      }, project.workspace_id);
    }

    return { error };
  },

  // Get project tasks
  async getProjectTasks(projectId: string): Promise<{ data: Task[] | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:user_profiles(*),
        task_comments!task_comments_task_id_fkey(
          *,
          user:user_profiles(*)
        )
      `)
      .eq('project_id', projectId)
      .order('position', { ascending: true });

    if (error) return { data: null, error };

    const transformedData = data?.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      projectId: task.project_id,
      assigneeId: task.assignee_id,
      assignee: task.assignee ? {
        id: task.assignee.id,
        firstName: task.assignee.first_name,
        lastName: task.assignee.last_name,
        email: task.assignee.email,
        avatarUrl: task.assignee.avatar_url
      } : undefined,
      createdBy: task.created_by,
      dueDate: task.due_date,
      estimatedHours: task.estimated_hours,
      actualHours: task.actual_hours,
      tags: task.tags || [],
      attachments: task.attachments || [],
      comments: task.task_comments?.map((comment: any) => ({
        id: comment.id,
        taskId: comment.task_id,
        userId: comment.user_id,
        content: comment.content,
        attachments: comment.attachments || [],
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        user: {
          id: comment.user.id,
          firstName: comment.user.first_name,
          lastName: comment.user.last_name,
          avatarUrl: comment.user.avatar_url
        }
      })) || [],
      dependencies: task.dependencies || [],
      position: task.position,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      workspaceId: task.workspace_id
    })) || [];

    return { data: transformedData, error: null };
  },

  // Create task
  async createTask(taskData: Partial<Task>): Promise<{ data: Task | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get project's workspace_id
    let workspaceId = taskData.workspaceId;
    if (!workspaceId && taskData.projectId) {
      const { data: project } = await supabase
        .from('projects')
        .select('workspace_id')
        .eq('id', taskData.projectId)
        .single();
      
      workspaceId = project?.workspace_id;
    }

    // Get the next position
    const { data: lastTask } = await supabase
      .from('tasks')
      .select('position')
      .eq('project_id', taskData.projectId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (lastTask?.position || 0) + 1;

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        description: taskData.description,
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        project_id: taskData.projectId,
        assignee_id: taskData.assigneeId,
        due_date: taskData.dueDate,
        estimated_hours: taskData.estimatedHours,
        tags: taskData.tags || [],
        dependencies: taskData.dependencies || [],
        position: nextPosition,
        workspace_id: workspaceId,
        created_by: user.id
      })
      .select()
      .single();

    if (error) return { data: null, error };

    // Log activity
    await userService.logActivity('task_created', 'task', data.id, {
      taskTitle: taskData.title,
      projectId: taskData.projectId
    }, workspaceId);

    return this.getTaskById(data.id);
  },

  // Get single task
  async getTaskById(id: string): Promise<{ data: Task | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:user_profiles(*),
        task_comments!task_comments_task_id_fkey(
          *,
          user:user_profiles(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) return { data: null, error };

    const transformedData = {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      projectId: data.project_id,
      assigneeId: data.assignee_id,
      assignee: data.assignee ? {
        id: data.assignee.id,
        firstName: data.assignee.first_name,
        lastName: data.assignee.last_name,
        email: data.assignee.email,
        avatarUrl: data.assignee.avatar_url
      } : undefined,
      createdBy: data.created_by,
      dueDate: data.due_date,
      estimatedHours: data.estimated_hours,
      actualHours: data.actual_hours,
      tags: data.tags || [],
      attachments: data.attachments || [],
      comments: data.task_comments?.map((comment: any) => ({
        id: comment.id,
        taskId: comment.task_id,
        userId: comment.user_id,
        content: comment.content,
        attachments: comment.attachments || [],
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        user: {
          id: comment.user.id,
          firstName: comment.user.first_name,
          lastName: comment.user.last_name,
          avatarUrl: comment.user.avatar_url
        }
      })) || [],
      dependencies: data.dependencies || [],
      position: data.position,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      workspaceId: data.workspace_id
    };

    return { data: transformedData, error: null };
  },

  // Update task
  async updateTask(id: string, updates: Partial<Task>): Promise<{ data: Task | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.assigneeId !== undefined) updateData.assignee_id = updates.assigneeId;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
    if (updates.estimatedHours !== undefined) updateData.estimated_hours = updates.estimatedHours;
    if (updates.actualHours !== undefined) updateData.actual_hours = updates.actualHours;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.dependencies !== undefined) updateData.dependencies = updates.dependencies;
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.workspaceId !== undefined) updateData.workspace_id = updates.workspaceId;

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id);

    if (error) return { data: null, error };

    // Get the task to log activity with workspace context
    const { data: task } = await supabase
      .from('tasks')
      .select('workspace_id, title')
      .eq('id', id)
      .single();

    // Log activity
    if (task) {
      await userService.logActivity('task_updated', 'task', id, {
        taskTitle: task.title,
        updates: Object.keys(updateData)
      }, task.workspace_id);
    }

    return this.getTaskById(id);
  },

  // Add team member to project
  async addProjectMember(projectId: string, userId: string, role: ProjectMember['role'] = 'member'): Promise<{ data: ProjectMember | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    // Get project's workspace_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('workspace_id')
      .eq('id', projectId)
      .single();

    if (projectError) {
      return { data: null, error: projectError };
    }

    // Add user to project's workspace if they're not already a member
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        user_id: userId,
        workspace_id: project.workspace_id,
        role: 'member'
      })
      .on_conflict(['user_id', 'workspace_id'])
      .ignore();

    // Add user to project
    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: userId,
        role: role
      })
      .select()
      .single();

    if (error) return { data: null, error };

    // Log activity
    await userService.logActivity('project_member_added', 'project', projectId, {
      userId: userId,
      role: role
    }, project.workspace_id);

    return { data, error: null };
  },

  // Get project templates
  async getProjectTemplates(): Promise<{ data: ProjectTemplate[] | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    return { data, error: null };
  },

  // Get project statistics
  async getProjectStats(): Promise<{ data: ProjectStats | null; error: any }> {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('status, estimated_hours, actual_hours, budget, spent_budget, progress');

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('status, due_date')
      .lt('due_date', new Date().toISOString())
      .neq('status', 'completed');

    if (projectsError || tasksError) {
      return { data: null, error: projectsError || tasksError };
    }

    const stats: ProjectStats = {
      totalProjects: projects?.length || 0,
      activeProjects: projects?.filter(p => p.status === 'active').length || 0,
      completedProjects: projects?.filter(p => p.status === 'completed').length || 0,
      overdueTasks: tasks?.length || 0,
      totalHours: projects?.reduce((sum, p) => sum + (p.actual_hours || 0), 0) || 0,
      totalBudget: projects?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0,
      averageProgress: projects && projects.length > 0 
        ? projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length 
        : 0
    };

    return { data: stats, error: null };
  }
};