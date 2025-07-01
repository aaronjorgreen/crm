import React, { useState, useEffect } from 'react';
import { userService } from '../../lib/users';
import { UserInvitation } from '../../types/user';
import Button from '../ui/Button';
import { 
  Mail, Clock, User, Shield, Crown, RotateCcw, 
  Copy, ExternalLink, Trash2, CheckCircle 
} from 'lucide-react';

interface PendingInvitationsProps {
  onRefresh: () => void;
}

const PendingInvitations: React.FC<PendingInvitationsProps> = ({ onRefresh }) => {
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = async () => {
    setLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await userService.getPendingInvitations();
    
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setInvitations(data || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleCopyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/accept-invitation?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    // You could add a toast notification here
  };

  const handleResendInvitation = async (invitationId: string) => {
    // Implementation for resending invitation
    console.log('Resend invitation:', invitationId);
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    // Implementation for revoking invitation
    console.log('Revoke invitation:', invitationId);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return Crown;
      case 'admin':
        return Shield;
      default:
        return User;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffInHours = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours <= 0) return 'Expired';
    if (diffInHours < 24) return `${diffInHours}h remaining`;
    
    const days = Math.ceil(diffInHours / 24);
    return `${days}d remaining`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading invitations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
        <div className="p-8 text-center">
          <div className="text-red-500 mb-4">
            <Mail className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-red-600 font-medium">Error loading invitations</p>
          <p className="text-sm text-neutral-500 mt-1">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvitations}
            className="mt-4"
            icon={RotateCcw}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
        <div className="p-8 text-center">
          <Mail className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-600 font-medium">No pending invitations</p>
          <p className="text-sm text-neutral-500 mt-1">All invitations have been accepted or expired</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Pending Invitations</h3>
          <p className="text-sm text-neutral-600">{invitations.length} invitation(s) awaiting response</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchInvitations}
          icon={RotateCcw}
        >
          Refresh
        </Button>
      </div>

      {/* Invitations List */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-neutral-200">
          {invitations.map((invitation) => {
            const RoleIcon = getRoleIcon(invitation.role);
            const timeRemaining = formatTimeRemaining(invitation.expiresAt);
            const isExpiringSoon = new Date(invitation.expiresAt).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000;
            
            return (
              <div key={invitation.id} className="p-6 hover:bg-neutral-50 transition-colors duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <Mail className="h-6 w-6 text-primary-600" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-neutral-900">{invitation.email}</h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getRoleColor(invitation.role)}`}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {invitation.role.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1 text-sm text-neutral-500">
                        <span>Invited by {invitation.inviter?.firstName} {invitation.inviter?.lastName}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span className={isExpiringSoon ? 'text-orange-600 font-medium' : ''}>
                            {timeRemaining}
                          </span>
                        </div>
                      </div>
                      
                      {invitation.permissions && invitation.permissions.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-neutral-500">
                            Custom permissions: {invitation.permissions.length} assigned
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyInviteLink(invitation.invitationToken)}
                      icon={Copy}
                      className="text-neutral-600 hover:text-primary-600"
                    >
                      Copy Link
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResendInvitation(invitation.id)}
                      icon={RotateCcw}
                      className="text-neutral-600 hover:text-blue-600"
                    >
                      Resend
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeInvitation(invitation.id)}
                      icon={Trash2}
                      className="text-neutral-600 hover:text-red-600"
                    >
                      Revoke
                    </Button>
                  </div>
                </div>

                {isExpiringSoon && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-orange-800">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">Expiring soon!</span>
                      <span className="text-sm">This invitation will expire in less than 24 hours.</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PendingInvitations;