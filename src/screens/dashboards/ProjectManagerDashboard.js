import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { projectsAPI } from '../../config/api';

export default function ProjectManagerDashboard({ user, onLogout, navigation }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('regular');

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getMyProjects(user.id);
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error('Error fetching projects in PM dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProjects();
  }, []);

  // Compute dynamic stats
  const getProjectType = (project) => project.project_type || 'regular';
  const regularProjects = projects.filter(project => getProjectType(project) !== 'external_job_work');
  const externalJobWorks = projects.filter(project => getProjectType(project) === 'external_job_work');
  const visibleProjects = activeTab === 'external_job_work' ? externalJobWorks : regularProjects;
  const totalProjects = regularProjects.length;
  const activeProjects = regularProjects.filter(p => p.status === 'in_progress' || p.status === 'pending').length;
  const completedProjects = regularProjects.filter(p => p.status === 'completed').length;

  const menuItems = [
    { title: 'My Projects', icon: '📁', action: 'ProjectList' },
    { title: 'Team Members', icon: '👥' },
    { title: 'Task Management', icon: '✅' },
    { title: 'Reports', icon: '📊' },
  ];

  const handleMenuPress = (item) => {
    if (item.action) {
      navigation.navigate(item.action, { user });
    } else {
      console.log('Pressed:', item.title);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28A745';
      case 'in_progress': return '#007AFF';
      case 'on_hold': return '#FFC107';
      case 'pending': return '#6C757D';
      default: return '#6C757D';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#DC3545';
      case 'high': return '#FD7E14';
      case 'medium': return '#007AFF';
      case 'low': return '#28A745';
      default: return '#6C757D';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome Back,</Text>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.role}>Project Manager</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#007AFF' }]}>{totalProjects}</Text>
          <Text style={styles.statLabel}>Total Projects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#FF9500' }]}>{activeProjects}</Text>
          <Text style={styles.statLabel}>Active Projects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#34C759' }]}>{completedProjects}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>My Work</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'regular' && styles.activeTabButton]}
          onPress={() => setActiveTab('regular')}
        >
          <Text style={[styles.tabText, activeTab === 'regular' && styles.activeTabText]}>
            Projects ({regularProjects.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'external_job_work' && styles.activeTabButton]}
          onPress={() => setActiveTab('external_job_work')}
        >
          <Text style={[styles.tabText, activeTab === 'external_job_work' && styles.activeTabText]}>
            External Job Work ({externalJobWorks.length})
          </Text>
        </TouchableOpacity>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#34C759" />
        </View>
      ) : visibleProjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {activeTab === 'external_job_work' ? 'No external job work assigned to you yet.' : 'No projects assigned to you yet.'}
          </Text>
        </View>
      ) : (
        visibleProjects.slice(0, 5).map((project) => (
          <TouchableOpacity 
            key={project.id} 
            style={styles.projectCard}
            onPress={() => navigation.navigate('ProjectDetails', { project, user })}
          >
            <View style={styles.projectHeader}>
              <Text style={styles.projectName}>{project.name}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(project.priority) }]}>
                <Text style={styles.badgeText}>{project.priority?.toUpperCase()}</Text>
              </View>
            </View>
            
            {project.description ? (
              <Text style={styles.projectDesc} numberOfLines={2}>
                {project.description}
              </Text>
            ) : null}
            
            <View style={styles.projectFooter}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) }]}>
                <Text style={styles.badgeText}>{project.status?.replace('_', ' ').toUpperCase()}</Text>
              </View>
              {project.created_by_name && (
                <Text style={styles.createdByText}>By: {project.created_by_name}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))
      )}

      {visibleProjects.length > 5 && (
        <TouchableOpacity 
          style={styles.viewAllButton} 
          onPress={() => navigation.navigate('ProjectList', { user })}
        >
          <Text style={styles.viewAllText}>View All ({visibleProjects.length})</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.menuGrid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.menuItem}
            onPress={() => handleMenuPress(item)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuTitle}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#34C759',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    color: 'white',
    fontSize: 16,
    opacity: 0.9,
  },
  name: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  role: {
    color: 'white',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 5,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
    marginTop: 10,
    marginBottom: 10,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginBottom: 10,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeTabButton: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  tabText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeTabText: {
    color: 'white',
  },
  projectCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  projectDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    lineHeight: 18,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  createdByText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  viewAllButton: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 15,
  },
  viewAllText: {
    color: '#34C759',
    fontWeight: '600',
    fontSize: 14,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  menuItem: {
    width: '48%',
    backgroundColor: 'white',
    margin: '1%',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});
