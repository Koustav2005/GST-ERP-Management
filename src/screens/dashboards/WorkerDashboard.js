import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { projectsAPI } from '../../config/api';

// Safe dynamic import for expo-camera
let CameraView = null;
let Camera = null;
try {
  const ExpoCamera = require('expo-camera');
  CameraView = ExpoCamera.CameraView;
  Camera = ExpoCamera.Camera;
} catch (e) {
  console.log('expo-camera not available');
}

const { width } = Dimensions.get('window');

export default function WorkerDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('projects'); // 'projects', 'collected'
  const [projectSubTab, setProjectSubTab] = useState('regular');
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Navigation states
  const [selectedProject, setSelectedProject] = useState(null);

  // QR scan states
  const [scanning, setScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [submittingCode, setSubmittingCode] = useState(false);

  const loadData = async () => {
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        projectsAPI.getWorkerProjects(user.id),
        projectsAPI.getWorkerTasks(user.id),
      ]);
      setProjects(projectsRes.data.projects || []);
      setTasks(tasksRes.data.tasks || []);
    } catch (error) {
      console.error('Error loading worker data:', error);
      Alert.alert('Error', 'Failed to load projects and tasks.');
    }
  };

  const initData = async () => {
    setLoading(true);
    await loadData();
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const getProjectType = (project) => project.project_type || 'regular';
  const regularProjects = projects.filter((project) => getProjectType(project) !== 'external_job_work');
  const externalJobWorks = projects.filter((project) => getProjectType(project) === 'external_job_work');
  const visibleProjects = projectSubTab === 'external_job_work' ? externalJobWorks : regularProjects;

  // Request camera permission
  const startScanner = async () => {
    setScanning(true);
    setManualCode('');
    if (CameraView && Camera) {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    } else {
      setHasCameraPermission(false);
    }
  };

  // QR Scanned handler
  const handleBarCodeScanned = async ({ data }) => {
    try {
      // Parse QR code payload
      const parsedData = JSON.parse(data);
      if (parsedData.type === 'allocation_task' && parsedData.id) {
        // Enforce worker matching
        if (parsedData.worker_id !== user.id) {
          Alert.alert(
            'Validation Failed',
            'Access Denied: You are not the assigned worker to collect this stock request.'
          );
          setScanning(false);
          return;
        }
        
        confirmCollectionTask(parsedData.id);
      } else {
        Alert.alert('Invalid QR Code', 'The scanned QR code is not valid for stock collection.');
      }
    } catch (error) {
      // Fallback: If not JSON, treat raw scanned string as manual QR Number (e.g. QR00000001)
      handleManualVerify(data);
    }
  };

  // Manual QR code text validation
  const handleManualVerify = async (codeToVerify) => {
    const code = codeToVerify || manualCode;
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter a valid QR code identifier.');
      return;
    }

    setSubmittingCode(true);
    try {
      // Fetch allocation task details using QR Number
      const response = await projectsAPI.getAllocationTaskByQR(code.trim().toUpperCase());
      const taskData = response.data.task;

      if (!taskData) {
        Alert.alert('Not Found', 'Stock allocation task not found. Verify the QR identifier.');
        setSubmittingCode(false);
        return;
      }

      // Enforce worker matching
      if (taskData.worker_id !== user.id) {
        Alert.alert(
          'Validation Failed',
          'Access Denied: You are not the assigned worker to collect this stock request.'
        );
        setSubmittingCode(false);
        setScanning(false);
        return;
      }

      await confirmCollectionTask(taskData.id);
    } catch (error) {
      console.error('Error fetching manual code:', error);
      Alert.alert('Error', 'Failed to retrieve allocation details.');
      setSubmittingCode(false);
    }
  };

  // Confirm task in backend
  const confirmCollectionTask = async (taskId) => {
    setSubmittingCode(true);
    try {
      const response = await projectsAPI.confirmAllocation(taskId, {
        confirmed_by: user.id,
      });

      Alert.alert('Success', response.data.message || 'Items successfully collected!');
      setScanning(false);
      setManualCode('');
      
      // Reload lists and refresh state
      await loadData();
      
      // If we are looking at a project, refresh selected project status
      if (selectedProject) {
        const updatedProj = projects.find((p) => p.id === selectedProject.id);
        if (updatedProj) setSelectedProject(updatedProj);
      }
    } catch (error) {
      console.error('Error confirming allocation:', error);
      const errMsg = error.response?.data?.error || 'Failed to confirm item collection.';
      Alert.alert('Collection Failed', errMsg);
    } finally {
      setSubmittingCode(false);
    }
  };

  // Group collected tasks by store_request_id
  const getCollectedGroups = () => {
    const confirmed = tasks.filter((t) => t.status === 'confirmed');
    const groups = {};

    confirmed.forEach((task) => {
      const key = task.store_request_id || `req-${task.id}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          project_name: task.project_name || 'N/A',
          project_manager_name: task.project_manager_name || 'N/A',
          confirmed_at: task.confirmed_at,
          items: [],
        };
      }

      const itemsList =
        typeof task.allocated_items === 'string'
          ? JSON.parse(task.allocated_items)
          : task.allocated_items || [];

      itemsList.forEach((item) => {
        groups[key].items.push({
          material_name: item.material_name,
          quantity: item.quantity,
          unit: item.unit,
        });
      });
    });

    return Object.values(groups).sort(
      (a, b) => new Date(b.confirmed_at) - new Date(a.confirmed_at)
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5856D6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // --- Sub-View: Project Details Tasks List ---
  if (selectedProject) {
    // Filter pending collection tasks for this project
    const projectPendingTasks = tasks.filter(
      (t) => t.status === 'pending' && t.project_id === selectedProject.id
    );

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedProject(null)}
          >
            <Text style={styles.backButtonText}>← Projects</Text>
          </TouchableOpacity>
          <Text style={styles.projectHeaderTitle} numberOfLines={1}>
            {selectedProject.name}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={styles.contentContainer}
          contentContainerStyle={{ paddingBottom: 30 }}
        >
          <View style={styles.projectInfoCard}>
            <Text style={styles.infoLabel}>Project Code: {selectedProject.project_code || 'N/A'}</Text>
            <Text style={styles.infoLabel}>Client: {selectedProject.client_name || 'N/A'}</Text>
            <Text style={styles.infoLabel}>Status: {selectedProject.status}</Text>
          </View>

          <Text style={styles.sectionTitle}>Pending Collections</Text>

          {projectPendingTasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>No pending collections</Text>
              <Text style={styles.emptySubtext}>
                No active material withdrawals are allocated to you for this project.
              </Text>
            </View>
          ) : (
            projectPendingTasks.map((task) => {
              const itemsList =
                typeof task.allocated_items === 'string'
                  ? JSON.parse(task.allocated_items)
                  : task.allocated_items || [];

              return (
                <View key={task.id} style={styles.collectionCard}>
                  <View style={styles.collectionCardHeader}>
                    <Text style={styles.collectionTitle}>Allocation ID: {task.qr_number}</Text>
                    <Text style={styles.pmText}>PM: {task.project_manager_name}</Text>
                  </View>

                  <View style={styles.itemsListContainer}>
                    <Text style={styles.itemsHeader}>Materials to Collect:</Text>
                    {itemsList.map((item, idx) => (
                      <View key={idx} style={styles.itemRow}>
                        <Text style={styles.itemName}>• {item.material_name}</Text>
                        <Text style={styles.itemQty}>
                          {item.quantity} {item.unit}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.scanBtn}
                    onPress={startScanner}
                  >
                    <Text style={styles.scanBtnText}>📷 Scan QR Code to Collect</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Barcode Scanner Modal */}
        <Modal
          visible={scanning}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setScanning(false)}
        >
          <View style={styles.scannerModalContainer}>
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerHeaderTitle}>Scan Store QR Code</Text>
              <TouchableOpacity
                style={styles.closeScannerBtn}
                onPress={() => setScanning(false)}
              >
                <Text style={styles.closeScannerText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {hasCameraPermission === true && CameraView ? (
              <View style={styles.cameraContainer}>
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  onBarcodeScanned={submittingCode ? undefined : handleBarCodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                />
                <View style={styles.overlayFrame}>
                  <View style={styles.scanFrame} />
                  <Text style={styles.scanGuideText}>
                    Align the Store Incharge's QR Code inside the box
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noCameraContainer}>
                <Text style={styles.noCameraIcon}>📷</Text>
                <Text style={styles.noCameraText}>Camera Access Not Available</Text>
                <Text style={styles.noCameraSub}>
                  Please permit camera access or enter the QR Code number manually.
                </Text>
              </View>
            )}

            {/* Manual QR Code entry fallback */}
            <View style={styles.manualInputSection}>
              <Text style={styles.manualLabel}>Manual Collection Entry:</Text>
              <TextInput
                style={styles.manualTextInput}
                placeholder="e.g., QR00000001"
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="characters"
                editable={!submittingCode}
              />
              <TouchableOpacity
                style={styles.manualSubmitBtn}
                onPress={() => handleManualVerify()}
                disabled={submittingCode || !manualCode.trim()}
              >
                {submittingCode ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.manualSubmitText}>Collect Items</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // --- Main Dashboard View ---
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.dashboardHeader}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.roleLabel}>Worker Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{projects.length}</Text>
          <Text style={styles.statLabel}>My Projects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#FF9500' }]}>
            {tasks.filter((t) => t.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending Collections</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#34C759' }]}>
            {tasks.filter((t) => t.status === 'confirmed').length}
          </Text>
          <Text style={styles.statLabel}>Total Collected</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'projects' && styles.activeTabButton]}
          onPress={() => setActiveTab('projects')}
        >
          <Text style={[styles.tabText, activeTab === 'projects' && styles.activeTabText]}>
            Projects ({projects.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'collected' && styles.activeTabButton]}
          onPress={() => setActiveTab('collected')}
        >
          <Text style={[styles.tabText, activeTab === 'collected' && styles.activeTabText]}>
            Collected Items ({getCollectedGroups().length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable list */}
      <ScrollView
        style={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5856D6']} />
        }
      >
        {activeTab === 'projects' ? (
          /* PROJECTS TAB */
          <View style={{ paddingBottom: 20 }}>
            <View style={styles.projectSubTabContainer}>
              <TouchableOpacity
                style={[styles.projectSubTabButton, projectSubTab === 'regular' && styles.activeProjectSubTabButton]}
                onPress={() => setProjectSubTab('regular')}
              >
                <Text style={[styles.projectSubTabText, projectSubTab === 'regular' && styles.activeProjectSubTabText]}>
                  Projects ({regularProjects.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.projectSubTabButton, projectSubTab === 'external_job_work' && styles.activeProjectSubTabButton]}
                onPress={() => setProjectSubTab('external_job_work')}
              >
                <Text style={[styles.projectSubTabText, projectSubTab === 'external_job_work' && styles.activeProjectSubTabText]}>
                  External Job Work ({externalJobWorks.length})
                </Text>
              </TouchableOpacity>
            </View>

            {visibleProjects.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🏗️</Text>
                <Text style={styles.emptyText}>
                  {projectSubTab === 'external_job_work' ? 'No External Job Work Assigned' : 'No Projects Assigned'}
                </Text>
                <Text style={styles.emptySubtext}>
                  You have not been added to any company projects yet. Contact your Project Manager.
                </Text>
              </View>
            ) : (
              visibleProjects.map((project) => (
                <TouchableOpacity
                  key={project.id}
                  style={styles.projectCard}
                  onPress={() => setSelectedProject(project)}
                >
                  <View style={styles.projectCardHeader}>
                    <Text style={styles.projectCardTitle}>{project.name}</Text>
                    {project.pending_collections_count > 0 && (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>
                          📦 {project.pending_collections_count} Pending
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.projectCardDetail}>Code: {project.project_code || 'N/A'}</Text>
                  <Text style={styles.projectCardDetail}>Client: {project.client_name || 'N/A'}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.viewTasksText}>View Tasks →</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          /* COLLECTED ITEMS TAB */
          <View style={{ paddingBottom: 20 }}>
            {getCollectedGroups().length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>No Collected Items</Text>
                <Text style={styles.emptySubtext}>
                  Items you collect from the store will appear here, grouped by request.
                </Text>
              </View>
            ) : (
              getCollectedGroups().map((group) => (
                <View key={group.id} style={styles.groupCard}>
                  <View style={styles.groupCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupProject}>{group.project_name}</Text>
                      <Text style={styles.groupPM}>PM: {group.project_manager_name}</Text>
                    </View>
                    <View style={styles.collectedBadge}>
                      <Text style={styles.collectedBadgeText}>Collected</Text>
                    </View>
                  </View>

                  <View style={styles.groupItemsContainer}>
                    {group.items.map((item, idx) => (
                      <View key={idx} style={styles.groupItemRow}>
                        <Text style={styles.groupItemName}>{item.material_name}</Text>
                        <Text style={styles.groupItemQty}>
                          {item.quantity} {item.unit}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.groupDate}>
                    Collected on: {new Date(group.confirmed_at).toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#8E8E93',
  },
  dashboardHeader: {
    backgroundColor: '#2E3A59',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#2E3A59',
    padding: 15,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  projectHeaderTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    maxWidth: width - 160,
  },
  greeting: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  name: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  roleLabel: {
    color: '#34C759',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E3A59',
  },
  statLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 8,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#2E3A59',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  projectSubTabContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  projectSubTabButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeProjectSubTabButton: {
    backgroundColor: '#5856D6',
  },
  projectSubTabText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeProjectSubTabText: {
    color: 'white',
  },
  projectCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  projectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: '#FFF2E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pendingBadgeText: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: 'bold',
  },
  projectCardDetail: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    marginTop: 10,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  viewTasksText: {
    fontSize: 13,
    color: '#5856D6',
    fontWeight: 'bold',
  },
  projectInfoCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginTop: 12,
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: '#2E3A59',
    marginBottom: 4,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  collectionCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  collectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  collectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  pmText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  itemsListContainer: {
    marginVertical: 12,
  },
  itemsHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  itemQty: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E3A59',
  },
  scanBtn: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  scanBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: 'white',
    borderRadius: 10,
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
  scannerModalContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  scannerHeader: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannerHeaderTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeScannerBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeScannerText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlayFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#34C759',
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  scanGuideText: {
    color: 'white',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  noCameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 20,
  },
  noCameraIcon: {
    fontSize: 54,
    color: '#8E8E93',
    marginBottom: 15,
  },
  noCameraText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noCameraSub: {
    color: '#8E8E93',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  manualInputSection: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  manualLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  manualTextInput: {
    backgroundColor: '#2C2C2E',
    color: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 12,
  },
  manualSubmitBtn: {
    backgroundColor: '#5856D6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualSubmitText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  groupCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  groupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    paddingBottom: 8,
    marginBottom: 10,
  },
  groupProject: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  groupPM: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  collectedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  collectedBadgeText: {
    color: '#34C759',
    fontSize: 11,
    fontWeight: 'bold',
  },
  groupItemsContainer: {
    marginBottom: 10,
  },
  groupItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  groupItemName: {
    fontSize: 14,
    color: '#3A3A3C',
    fontWeight: '500',
  },
  groupItemQty: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E3A59',
  },
  groupDate: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'right',
  },
});
