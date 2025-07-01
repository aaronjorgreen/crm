import React, { useState, useEffect } from 'react';
import { Client, ClientFilters, ClientStats } from '../types/project';
import { clientService } from '../lib/clients';
import MainLayout from '../components/layout/MainLayout';
import ClientList from '../components/clients/ClientList';
import PermissionGate from '../components/demo/PermissionGate';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { 
  Plus, Search, Building, TrendingUp, DollarSign,
  Users, AlertTriangle, Eye, Star
} from 'lucide-react';

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ClientFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClients();
    fetchStats();
  }, [filters]);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await clientService.getClients({
      ...filters,
      search: searchTerm || undefined
    });
    
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setClients(data || []);
    }
    
    setLoading(false);
  };

  const fetchStats = async () => {
    const { data } = await clientService.getClientStats();
    setStats(data);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value || undefined }));
  };

  const handleFilterChange = (key: keyof ClientFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClientSelect = (client: Client) => {
    // TODO: Open client detail modal/page
    console.log('View client:', client);
  };

  const handleClientEdit = (client: Client) => {
    // TODO: Open client edit modal
    console.log('Edit client:', client);
  };

  const handleClientDelete = async (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      const { error } = await clientService.deleteClient(clientId);
      if (!error) {
        fetchClients();
        fetchStats();
      }
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

  if (error) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">Error loading clients: {error}</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        <PermissionGate permission="clients.view">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-neutral-900">Client Management</h1>
              <p className="text-neutral-600">
                Manage your client relationships and track business opportunities
              </p>
            </div>
            <PermissionGate permission="clients.create" showFallback={false}>
              <Button variant="primary" icon={Plus}>
                Add Client
              </Button>
            </PermissionGate>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Total Clients</p>
                    <p className="text-2xl font-bold text-neutral-900">{stats.totalClients}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600 font-medium">+12%</span>
                  <span className="text-neutral-500 ml-1">from last month</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Active Clients</p>
                    <p className="text-2xl font-bold text-green-600">{stats.activeClients}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600 font-medium">+8%</span>
                  <span className="text-neutral-500 ml-1">from last month</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Total Value</p>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalValue)}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-purple-500 mr-1" />
                  <span className="text-purple-600 font-medium">+15%</span>
                  <span className="text-neutral-500 ml-1">from last month</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Retention Rate</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.clientRetentionRate}%</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Star className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-orange-500 mr-1" />
                  <span className="text-orange-600 font-medium">+2%</span>
                  <span className="text-neutral-500 ml-1">from last month</span>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 max-w-md">
                <Input
                  placeholder="Search clients..."
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="prospect">Prospect</option>
                  <option value="archived">Archived</option>
                </select>

                <select
                  value={filters.companySize?.[0] || 'all'}
                  onChange={(e) => handleFilterChange('companySize', e.target.value === 'all' ? undefined : [e.target.value])}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Sizes</option>
                  <option value="startup">Startup</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="enterprise">Enterprise</option>
                </select>

                <select
                  value={filters.industry?.[0] || 'all'}
                  onChange={(e) => handleFilterChange('industry', e.target.value === 'all' ? undefined : [e.target.value])}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Industries</option>
                  <option value="technology">Technology</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="finance">Finance</option>
                  <option value="education">Education</option>
                  <option value="retail">Retail</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Client List */}
          <ClientList
            clients={clients}
            loading={loading}
            onClientSelect={handleClientSelect}
            onClientEdit={handleClientEdit}
            onClientDelete={handleClientDelete}
          />
        </PermissionGate>
      </div>
    </MainLayout>
  );
};

export default ClientsPage;