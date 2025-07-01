export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  clientId: string;
  client?: Client;
  teamMembers: ProjectMember[];
  startDate: string;
  endDate?: string;
  estimatedHours: number;
  actualHours: number;
  budget?: number;
  spentBudget?: number;
  progress: number;
  tags: string[];
  attachments: ProjectAttachment[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  template?: ProjectTemplate;
}

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: 'owner' | 'manager' | 'member' | 'viewer';
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  projectId: string;
  assigneeId?: string;
  assignee?: ProjectMember['user'];
  createdBy: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  attachments: TaskAttachment[];
  comments: TaskComment[];
  dependencies: string[];
  position: number;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  attachments: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ProjectAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'web_development' | 'mobile_app' | 'branding' | 'marketing' | 'consulting' | 'custom';
  tasks: TemplateTask[];
  estimatedDuration: number;
  createdBy: string;
  createdAt: string;
  isPublic: boolean;
}

export interface TemplateTask {
  title: string;
  description?: string;
  estimatedHours: number;
  dependencies: number[];
  tags: string[];
  position: number;
}

export interface ProjectFilters {
  status?: Project['status'][];
  priority?: Project['priority'][];
  clientId?: string;
  teamMemberId?: string;
  search?: string;
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  overdueTasks: number;
  totalHours: number;
  totalBudget: number;
  averageProgress: number;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  industry?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  contacts: ClientContact[];
  projects: Project[];
  totalValue: number;
  status: 'active' | 'inactive' | 'prospect' | 'archived';
  tags: string[];
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  workspaceId: string;
}

export interface ClientContact {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface ClientCommunication {
  id: string;
  clientId: string;
  type: 'email' | 'call' | 'meeting' | 'note';
  subject: string;
  content: string;
  direction: 'inbound' | 'outbound';
  contactId?: string;
  userId: string;
  attachments: CommunicationAttachment[];
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

export interface CommunicationAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  projectId?: string;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  items: InvoiceItem[];
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface ClientFilters {
  status?: Client['status'][];
  industry?: string[];
  companySize?: Client['companySize'][];
  search?: string;
  tags?: string[];
  totalValueRange?: {
    min: number;
    max: number;
  };
}

export interface ClientStats {
  totalClients: number;
  activeClients: number;
  prospectClients: number;
  totalValue: number;
  averageProjectValue: number;
  clientRetentionRate: number;
}