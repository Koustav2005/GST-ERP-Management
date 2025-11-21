import React from 'react';
import { Alert } from 'react-native';
import ManagementDashboard from './dashboards/ManagementDashboard';
import ProjectManagerDashboard from './dashboards/ProjectManagerDashboard';
import AccountsDashboard from './dashboards/AccountsDashboard';
import StoreInchargeDashboard from './dashboards/StoreInchargeDashboard';
import WorkerDashboard from './dashboards/WorkerDashboard';
import SalesExecutiveDashboard from './dashboards/SalesExecutiveDashboard';
import NPDDashboard from './dashboards/NPDDashboard';

export default function DashboardScreen({ route, navigation }) {
  const { user } = route.params;

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            // TODO: Clear stored token
            // await AsyncStorage.removeItem('token');
            navigation.replace('Auth');
          },
        },
      ]
    );
  };

  // Route to appropriate dashboard based on role
  const renderDashboard = () => {
    switch (user.role) {
      case 'management':
        return <ManagementDashboard user={user} onLogout={handleLogout} />;
      case 'project_manager':
        return <ProjectManagerDashboard user={user} onLogout={handleLogout} />;
      case 'accounts':
        return <AccountsDashboard user={user} onLogout={handleLogout} />;
      case 'store_incharge':
        return <StoreInchargeDashboard user={user} onLogout={handleLogout} />;
      case 'worker':
        return <WorkerDashboard user={user} onLogout={handleLogout} />;
      case 'sales_executive':
        return <SalesExecutiveDashboard user={user} onLogout={handleLogout} />;
      case 'npd':
        return <NPDDashboard user={user} onLogout={handleLogout} />;
      default:
        return <ManagementDashboard user={user} onLogout={handleLogout} />;
    }
  };

  return renderDashboard();
}
