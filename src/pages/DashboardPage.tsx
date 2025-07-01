import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import GreetingPanel from '../components/dashboard/GreetingPanel';
import DashboardOverview from '../components/dashboard/DashboardOverview';

const DashboardPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        {/* Greeting Panel */}
        <GreetingPanel />
        
        {/* Dashboard Overview */}
        <DashboardOverview />
      </div>
    </MainLayout>
  );
};

export default DashboardPage;