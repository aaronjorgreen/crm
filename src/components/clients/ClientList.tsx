import React, { useState } from 'react';
import { Client } from '../../types/project';
import { 
  Building, Mail, Phone, Globe, MapPin, Calendar,
  DollarSign, TrendingUp, MoreHorizontal, Eye, Edit,
  Users, Briefcase, Star, Clock
} from 'lucide-react';
import Button from '../ui/Button';

interface ClientListProps {
  clients: Client[];
  loading: boolean;
  onClientSelect: (client: Client) => void;
  onClientEdit: (client: Client) => void;
  onClientDelete: (clientId: string) => void;
}

const ClientList: React.FC<ClientListProps> = ({
  clients,
  loading,
  onClientSelect,
  onClientEdit,
  onClientDelete
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const getStatusColor = (status: Client['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-neutral-100 text-neutral-800';
      case 'prospect': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-neutral-100 text-neutral-800';
    }
  };

  const getCompanySizeIcon = (size?: Client['companySize']) => {
    switch (size) {
      case 'startup': return '🚀';
      case 'small': return '🏢';
      case 'medium': return '🏬';
      case 'large': return '🏭';
      case 'enterprise': return '🌆';
      default: return '🏢';
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-neutral-200 p-6 animate-pulse">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-neutral-200 rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                  <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-neutral-200 rounded"></div>
                <div className="h-3 bg-neutral-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building className="h-8 w-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">No clients found</h3>
        <p className="text-neutral-600 mb-6">Start building relationships by adding your first client</p>
        <Button variant="primary" icon={Building}>
          Add Client
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' 
                ? 'bg-primary-100 text-primary-600' 
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <div className="grid grid-cols-2 gap-1 w-4 h-4">
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
            </div>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' 
                ? 'bg-primary-100 text-primary-600' 
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <div className="space-y-1 w-4 h-4">
              <div className="bg-current h-1 rounded-sm"></div>
              <div className="bg-current h-1 rounded-sm"></div>
              <div className="bg-current h-1 rounded-sm"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
            >
              {/* Client Header */}
              <div className="p-6 border-b border-neutral-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-primary-600">
                        {client.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 
                        className="font-semibold text-neutral-900 hover:text-primary-600 cursor-pointer transition-colors"
                        onClick={() => onClientSelect(client)}
                      >
                        {client.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(client.status)}`}>
                          {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                        </span>
                        {client.companySize && (
                          <span className="text-xs text-neutral-500">
                            {getCompanySizeIcon(client.companySize)} {client.companySize}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-neutral-600">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Client Details */}
              <div className="p-6 space-y-4">
                {/* Contact Info */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-neutral-600">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center space-x-2 text-sm text-neutral-600">
                      <Phone className="h-4 w-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.website && (
                    <div className="flex items-center space-x-2 text-sm text-neutral-600">
                      <Globe className="h-4 w-4" />
                      <a 
                        href={client.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 truncate"
                      >
                        {client.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                  <div className="text-center">
                    <div className="text-lg font-bold text-neutral-900">
                      {client.projects.length}
                    </div>
                    <div className="text-xs text-neutral-500">Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(client.totalValue)}
                    </div>
                    <div className="text-xs text-neutral-500">Total Value</div>
                  </div>
                </div>

                {/* Last Contact */}
                <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>Last contact: {formatDate(client.lastContactDate)}</span>
                  </div>
                </div>

                {/* Tags */}
                {client.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {client.tags.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-700"
                      >
                        {tag}
                      </span>
                    ))}
                    {client.tags.length > 2 && (
                      <span className="text-xs text-neutral-500">
                        +{client.tags.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Eye}
                    onClick={() => onClientSelect(client)}
                    className="text-neutral-600 hover:text-primary-600"
                  >
                    View Details
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Edit}
                      onClick={() => onClientEdit(client)}
                      className="text-neutral-600 hover:text-primary-600"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Projects
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Last Contact
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-primary-600">
                            {client.name.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div 
                            className="text-sm font-semibold text-neutral-900 hover:text-primary-600 cursor-pointer"
                            onClick={() => onClientSelect(client)}
                          >
                            {client.name}
                          </div>
                          <div className="text-sm text-neutral-500">{client.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(client.status)}`}>
                        {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {client.industry || 'Not specified'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      {client.projects.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(client.totalValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {formatDate(client.lastContactDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Eye}
                          onClick={() => onClientSelect(client)}
                          className="text-neutral-600 hover:text-primary-600"
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Edit}
                          onClick={() => onClientEdit(client)}
                          className="text-neutral-600 hover:text-primary-600"
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientList;