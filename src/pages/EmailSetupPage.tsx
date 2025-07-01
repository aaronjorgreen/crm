import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import EmailTestPanel from '../components/admin/EmailTestPanel';
import PermissionGate from '../components/demo/PermissionGate';

const EmailSetupPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="p-8">
        <PermissionGate permission="admin.system">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-neutral-900">Email System Setup</h1>
              <p className="text-lg text-neutral-600 mt-3">
                Configure team@innovatexlabs.com for platform notifications, user invitations, and client communications
              </p>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start space-x-3">
                  <div className="p-1 bg-blue-100 rounded">
                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Important Setup Note</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Complete this email configuration before creating your first admin account. 
                      The invitation system requires a working email setup to send secure invitation links.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <EmailTestPanel />
          </div>
        </PermissionGate>
      </div>
    </MainLayout>
  );
};

export default EmailSetupPage;