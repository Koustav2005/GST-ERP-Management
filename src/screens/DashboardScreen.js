import React from 'react';
import ManagementDashboard from './dashboards/ManagementDashboard';
import AccountantDashboard from './dashboards/AccountantDashboard';
import StoreInchargeDashboard from './dashboards/StoreInchargeDashboard';
import NPDDashboard from './dashboards/NPDDashboard';
import ProjectManagerDashboard from './dashboards/ProjectManagerDashboard';
import WorkerDashboard from './dashboards/WorkerDashboard';
import { authAPI } from '../config/api';

export default function DashboardScreen({ route, navigation }) {
  const { user } = route.params;

  const handleLogout = async () => {
    // Record logout time in attendance
    try {
      await authAPI.logout(user.id);
    } catch (error) {
      console.error('Error recording logout:', error);
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  };

  // Route to appropriate dashboard based on role
  const renderDashboard = () => {
    switch (user.role) {
      case 'management':
        return <ManagementDashboard user={user} onLogout={handleLogout} navigation={navigation} />;
      case 'accountant':
        return <AccountantDashboard user={user} onLogout={handleLogout} navigation={navigation} />;
      case 'store_incharge':
        return <StoreInchargeDashboard user={user} onLogout={handleLogout} navigation={navigation} />;
      case 'npd':
        return <NPDDashboard user={user} onLogout={handleLogout} navigation={navigation} />;
      case 'project_manager':
        return <ProjectManagerDashboard user={user} onLogout={handleLogout} navigation={navigation} />;
      case 'worker':
        return <WorkerDashboard user={user} onLogout={handleLogout} navigation={navigation} />;
      default:
        return <ManagementDashboard user={user} onLogout={handleLogout} navigation={navigation} />;
    }
  };

  return renderDashboard();
}
