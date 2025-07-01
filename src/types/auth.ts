export interface User {
  id: string;
  email: string;
  role: 'admin' | 'member';
  firstName: string;
  lastName: string;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'dashboard' | 'boards' | 'apps' | 'admin' | 'clients';
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'member';
}