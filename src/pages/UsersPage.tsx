import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import UserManagement from '../components/users/UserManagement';

const UsersPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="p-8">
        <UserManagement />
      </div>
    </MainLayout>
  );
};

export default UsersPage;