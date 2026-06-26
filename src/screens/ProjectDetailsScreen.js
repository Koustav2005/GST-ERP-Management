import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { projectsAPI, getApiUrl, enquiriesAPI } from '../config/api';
import Footer from '../components/Footer';

export default function ProjectDetailsScreen({ route, navigation }) {
  const { project, user } = route.params;
  const [materials, setMaterials] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [sketchModalVisible, setSketchModalVisible] = useState(false);
  const [pmModalVisible, setPmModalVisible] = useState(false);
  const emptyBOMRow = { material_name: '', quantity: '', unit: 'pcs', hsn: '' };
  const [bulkMaterialRows, setBulkMaterialRows] = useState([{ ...emptyBOMRow }, { ...emptyBOMRow }, { ...emptyBOMRow }]);
  const [sketchUrl, setSketchUrl] = useState(project.sketch_url || '');
  const [sketchImage, setSketchImage] = useState(null);
  const [currentStatus, setCurrentStatus] = useState(project.status);
  const [imageSource, setImageSource] = useState('url'); // 'url', 'camera', 'gallery'
  const [projectManagers, setProjectManagers] = useState([]);
  // Only pre-select if assigned to a Project Manager, not NPD
  const isAssignedToPM = project.assigned_to_role === 'project_manager';
  const isAssignedToNPD = project.assigned_to_role === 'npd';
  const [selectedPM, setSelectedPM] = useState(isAssignedToPM ? (project.assigned_to?.toString() || '') : '');
  const currentPM = isAssignedToPM ? (project.assigned_to_name || 'Not Assigned') : 'Not Assigned';
  const assignedNPD = isAssignedToNPD ? (project.assigned_to_name || 'NPD') : null;

  // Revisions state
  const [revisions, setRevisions] = useState([]);
  const [revisionModalVisible, setRevisionModalVisible] = useState(false);
  const [revisionSketchUrl, setRevisionSketchUrl] = useState('');
  const [revisionSketchImage, setRevisionSketchImage] = useState(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionBOMRows, setRevisionBOMRows] = useState([{ material_name: '', quantity: '', unit: 'pcs', hsn: '' }, { material_name: '', quantity: '', unit: 'pcs', hsn: '' }, { material_name: '', quantity: '', unit: 'pcs', hsn: '' }]);
  const [selectedRevision, setSelectedRevision] = useState(null);
  const [revisionBOMItems, setRevisionBOMItems] = useState([]);
  const [revisionViewModalVisible, setRevisionViewModalVisible] = useState(false);
  const [revisionSketchEditModalVisible, setRevisionSketchEditModalVisible] = useState(false);
  const [newRevisionSketch, setNewRevisionSketch] = useState(null);
  const [latestRevision, setLatestRevision] = useState(null);
  const [latestRevisionBOM, setLatestRevisionBOM] = useState([]);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [materialUsageModalVisible, setMaterialUsageModalVisible] = useState(false);
  const [usedMaterials, setUsedMaterials] = useState([]);
  const [accountants, setAccountants] = useState([]);
  const [selectedAccountantId, setSelectedAccountantId] = useState('');
  const [usageNotes, setUsageNotes] = useState('');
  const [stockInfo, setStockInfo] = useState({});
  const [checkingStock, setCheckingStock] = useState(false);
  const stockCheckTimeoutRef = useRef(null);
  const [inventoryItems, setInventoryItems] = useState([]); // for BOM autocomplete
  const [activeSuggestionRow, setActiveSuggestionRow] = useState(null); // which row is showing suggestions
  const [activeRevisionSuggestionRow, setActiveRevisionSuggestionRow] = useState(null); // for revision BOM

  const [projectWorkers, setProjectWorkers] = useState([]);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [selectedWorkerForAssign, setSelectedWorkerForAssign] = useState('');
  const [selectedWorkerForRequest, setSelectedWorkerForRequest] = useState('');
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  const [storeRequests, setStoreRequests] = useState([]);
  const [expandedRequests, setExpandedRequests] = useState({});
  const [loadingRequests, setLoadingRequests] = useState(false);

  const fetchStoreRequests = async () => {
    try {
      setLoadingRequests(true);
      const response = await projectsAPI.getProjectStoreRequests(project.id);
      setStoreRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching project store requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const toggleRequestExpand = (requestId) => {
    setExpandedRequests(prev => ({
      ...prev,
      [requestId]: !prev[requestId]
    }));
  };

  const [statusHistory, setStatusHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedNextPhase, setSelectedNextPhase] = useState('Cutting');

  // --- JOB WORK STATES & HELPERS ---
  const [jobWorkModalVisible, setJobWorkModalVisible] = useState(false);
  const [jobWorkType, setJobWorkType] = useState('Laser Cutting');
  const [jobWorkPurpose, setJobWorkPurpose] = useState('');
  const [loadedWeight, setLoadedWeight] = useState('');
  const [unloadedWeight, setUnloadedWeight] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [jobWorkImages, setJobWorkImages] = useState([]); // array of { uri, name, type }
  const [jobWorkItems, setJobWorkItems] = useState([{ material_name: '', hsn: '', quantity: '', unit: 'pcs' }]);
  const [selectedStoreInchargeForJobWork, setSelectedStoreInchargeForJobWork] = useState('');
  const [selectedAccountantForJobWork, setSelectedAccountantForJobWork] = useState('');
  const [storeInchargeUsers, setStoreInchargeUsers] = useState([]);

  const pickJobWorkImages = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Camera roll permission is required to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selected = result.assets.map(asset => {
        const uri = asset.uri;
        const uriParts = uri.split('/');
        const fileName = uriParts[uriParts.length - 1];
        return {
          uri,
          name: fileName,
          type: asset.mimeType || 'image/jpeg'
        };
      });
      setJobWorkImages(prev => [...prev, ...selected]);
    }
  };

  const removeJobWorkImage = (index) => {
    setJobWorkImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleJobWorkSubmit = async () => {
    if (!jobWorkType) {
      Alert.alert('Error', 'Please select Job Work type.');
      return;
    }
    if (jobWorkType === 'Others' && !jobWorkPurpose) {
      Alert.alert('Error', 'Please enter purpose for others.');
      return;
    }
    if (!loadedWeight || !unloadedWeight) {
      Alert.alert('Error', 'Please fill vehicle weight details.');
      return;
    }

    const actualWeight = parseFloat(loadedWeight) - parseFloat(unloadedWeight);
    if (actualWeight <= 0) {
      Alert.alert('Error', 'Loaded weight must be greater than unloaded weight.');
      return;
    }

    if (!selectedStoreInchargeForJobWork) {
      Alert.alert('Error', 'Please select a Store Incharge.');
      return;
    }

    const invalidItems = jobWorkItems.filter(item => !item.material_name || !item.quantity || parseFloat(item.quantity) <= 0);
    if (invalidItems.length > 0) {
      Alert.alert('Error', 'Please ensure all items have a name and quantity.');
      return;
    }

    try {
      setLoadingHistory(true);
      const formData = new FormData();
      formData.append('project_id', project.id);
      formData.append('job_work_type', jobWorkType);
      formData.append('purpose', jobWorkType === 'Others' ? jobWorkPurpose : '');
      formData.append('loaded_vehicle_weight', loadedWeight);
      formData.append('unloaded_vehicle_weight', unloadedWeight);
      formData.append('vehicle_no', vehicleNo);
      formData.append('actual_vehicle_weight', actualWeight.toString());
      formData.append('store_incharge_id', selectedStoreInchargeForJobWork);
      formData.append('items', JSON.stringify(jobWorkItems));

      jobWorkImages.forEach((img, index) => {
        formData.append('images', {
          uri: Platform.OS === 'ios' ? img.uri.replace('file://', '') : img.uri,
          name: img.name || `image_${index}.jpg`,
          type: img.type || 'image/jpeg'
        });
      });

      const response = await projectsAPI.submitJobWork(formData);
      Alert.alert('Success', `Job Work submitted successfully!\nJob ID: ${response.data.jobId}`);

      setJobWorkModalVisible(false);
      setJobWorkType('Laser Cutting');
      setJobWorkPurpose('');
      setLoadedWeight('');
      setUnloadedWeight('');
      setVehicleNo('');
      setJobWorkImages([]);
      setJobWorkItems([{ material_name: '', hsn: '', quantity: '', unit: 'pcs' }]);
      setSelectedStoreInchargeForJobWork('');
      setSelectedAccountantForJobWork('');
      setSelectedNextPhase('');

      fetchStatusHistory();
      fetchProjectDetails();
    } catch (error) {
      console.error('Error submitting job work:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit Job Work.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const [internalReports, setInternalReports] = useState([]);
  const [uploadingReport, setUploadingReport] = useState(false);

  const fetchInternalReports = async () => {
    try {
      const response = await projectsAPI.getInternalReports(project.id);
      setInternalReports(response.data.reports || []);
    } catch (error) {
      console.error('Error fetching internal reports:', error);
    }
  };

  const handlePickAndUploadReport = async (phaseName, reportIndex) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.type === 'cancel' || result.canceled) {
        return;
      }

      const file = result.assets ? result.assets[0] : result;
      if (!file) return;

      setUploadingReport(true);
      const formData = new FormData();
      formData.append('phase_name', phaseName);
      formData.append('report_index', reportIndex.toString());
      formData.append('report', {
        uri: file.uri,
        type: 'application/pdf',
        name: file.name,
      });

      await projectsAPI.uploadInternalReport(project.id, formData);
      Alert.alert('Success', `Report ${reportIndex} uploaded successfully for phase: ${phaseName}`);
      fetchInternalReports();
    } catch (error) {
      console.error('Error uploading report:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to upload report');
    } finally {
      setUploadingReport(false);
    }
  };

  const viewReportPDF = async (report) => {
    try {
      const apiUrl = getApiUrl();
      const token = await AsyncStorage.getItem('token');
      const pdfUrl = `${apiUrl.replace('/api', '')}${report.file_path}${token ? `?token=${token}` : ''}`;
      
      await WebBrowser.openBrowserAsync(pdfUrl, {
        toolbarColor: '#007AFF',
        enableBarCollapsing: true,
        showTitle: true,
      });
    } catch (error) {
      console.error('Error viewing Report PDF:', error);
      Alert.alert('Error', 'Failed to open PDF report');
    }
  };
  const renderTimelineReports = (entry) => {
    const status = entry.new_status;
    if (status !== 'Fit Up' && status !== 'Welding' && status !== 'Inspection') {
      return null;
    }

    const maxReports = status === 'Inspection' ? 2 : 1;
    const slots = [];

    for (let i = 1; i <= maxReports; i++) {
      const report = internalReports.find(
        (r) => r.phase_name === status && r.report_index === i
      );
      slots.push({ index: i, report });
    }

    return (
      <View style={styles.timelineReportsContainer}>
        {slots.map((slot) => {
          const report = slot.report;
          return (
            <View key={slot.index} style={styles.reportSlotRow}>
              {report ? (
                <View style={styles.reportActiveRow}>
                  <TouchableOpacity
                    style={styles.viewReportBtn}
                    onPress={() => viewReportPDF(report)}
                  >
                    <Text style={styles.viewReportBtnText}>
                      📄 {status} Report {slot.index} ({report.file_name})
                    </Text>
                  </TouchableOpacity>
                  {user.role === 'project_manager' && (
                    <TouchableOpacity
                      style={styles.reuploadReportBtn}
                      onPress={() => handlePickAndUploadReport(status, slot.index)}
                    >
                      <Text style={styles.reuploadReportBtnText}>Change</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.reportEmptyRow}>
                  {user.role === 'project_manager' ? (
                    <TouchableOpacity
                      style={styles.uploadReportBtn}
                      onPress={() => handlePickAndUploadReport(status, slot.index)}
                    >
                      <Text style={styles.uploadReportBtnText}>
                        📤 Upload {status} Report {slot.index} (PDF)
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.noReportText}>
                      ⚠️ No {status} Report {slot.index} uploaded yet
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };
  const fetchStatusHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await projectsAPI.getHistory(project.id);
      setStatusHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching status history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStartProject = async () => {
    try {
      setLoadingHistory(true);
      await projectsAPI.addHistory(project.id, {
        new_status: 'Started',
        changed_by: user.id,
        old_status: null,
        notes: 'Project started by Project Manager'
      });
      Alert.alert('Success', 'Project started successfully!');
      fetchStatusHistory();
      fetchProjectDetails();
    } catch (error) {
      console.error('Error starting project:', error);
      Alert.alert('Error', 'Failed to start project.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleMoveToNextPhase = async () => {
    if (!selectedNextPhase) {
      Alert.alert('Error', 'Please select a phase.');
      return;
    }

    if (selectedNextPhase === 'Job Work') {
      setJobWorkModalVisible(true);
      return;
    }

    // Check if the current phase requires PDF uploads before moving to next phase
    const currentLatestStatus = statusHistory.length > 0 ? statusHistory[0].new_status : 'Started';
    const phasesRequiringPDF = ['Fit Up', 'Dressing/Finishing', 'Inspection'];
    
    if (phasesRequiringPDF.includes(currentLatestStatus)) {
      // Check if required PDFs are uploaded for the current phase
      let requiredPDFCount = 1; // Default 1 PDF
      if (currentLatestStatus === 'Inspection') {
        requiredPDFCount = 2; // Inspection requires 2 PDFs
      }
      
      const uploadedPDFs = internalReports.filter(
        (r) => r.phase_name === currentLatestStatus
      ).length;
      
      if (uploadedPDFs < requiredPDFCount) {
        Alert.alert(
          'Missing PDF Report',
          `${currentLatestStatus} phase requires ${requiredPDFCount} PDF report(s) to be uploaded before proceeding to the next phase.`
        );
        return;
      }
    }

    try {
      setLoadingHistory(true);
      await projectsAPI.addHistory(project.id, {
        new_status: selectedNextPhase,
        changed_by: user.id,
        old_status: currentLatestStatus,
        notes: `Project moved to ${selectedNextPhase} phase`
      });
      Alert.alert('Success', `Project successfully transitioned to ${selectedNextPhase} phase.`);
      fetchStatusHistory();
      fetchProjectDetails();
    } catch (error) {
      console.error('Error moving to next phase:', error);
      Alert.alert('Error', 'Failed to update phase.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchProjectWorkers = async () => {
    try {
      const response = await projectsAPI.getProjectWorkers(project.id);
      const workers = response.data.workers || [];
      setProjectWorkers(workers);
      if (workers.length > 0) {
        setSelectedWorkerForRequest(workers[0].worker_id.toString());
      } else {
        setSelectedWorkerForRequest('');
      }
    } catch (error) {
      console.error('Error fetching project workers:', error);
    }
  };

  const fetchCompanyWorkers = async () => {
    try {
      const response = await projectsAPI.getWorkers(user.company_id);
      setAvailableWorkers(response.data.workers || []);
      if (response.data.workers && response.data.workers.length > 0) {
        setSelectedWorkerForAssign(response.data.workers[0].id.toString());
      }
    } catch (error) {
      console.error('Error fetching company workers:', error);
    }
  };

  const handleAssignWorker = async () => {
    if (!selectedWorkerForAssign) {
      Alert.alert('Error', 'Please select a worker first.');
      return;
    }
    
    const isAlreadyAssigned = projectWorkers.some(w => w.worker_id === parseInt(selectedWorkerForAssign));
    if (isAlreadyAssigned) {
      Alert.alert('Info', 'This worker is already assigned to the project.');
      return;
    }

    try {
      setLoadingWorkers(true);
      await projectsAPI.addProjectWorker(project.id, parseInt(selectedWorkerForAssign));
      Alert.alert('Success', 'Worker added to project successfully!');
      
      const remainingWorkers = availableWorkers.filter(
        w => w.id !== parseInt(selectedWorkerForAssign) && !projectWorkers.some(pw => pw.worker_id === w.id)
      );
      if (remainingWorkers.length > 0) {
        setSelectedWorkerForAssign(remainingWorkers[0].id.toString());
      } else {
        setSelectedWorkerForAssign('');
      }

      await fetchProjectWorkers();
    } catch (error) {
      console.error('Error adding project worker:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to add worker.');
    } finally {
      setLoadingWorkers(false);
    }
  };

  const handleRemoveWorker = async (workerId) => {
    Alert.alert(
      'Remove Worker',
      'Are you sure you want to remove this worker from the project?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingWorkers(true);
              await projectsAPI.removeProjectWorker(project.id, workerId);
              Alert.alert('Success', 'Worker removed from project.');
              await fetchProjectWorkers();
              await fetchCompanyWorkers();
            } catch (error) {
              console.error('Error removing project worker:', error);
              Alert.alert('Error', 'Failed to remove worker.');
            } finally {
              setLoadingWorkers(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    fetchProjectDetails();
    fetchBOM();
    fetchStoreRequests();
    fetchStatusHistory();
    fetchInternalReports();
    if (user.role === 'npd') {
      fetchProjectManagers();
      fetchRevisions();
    } else if (user.role === 'project_manager') {
      // Project Manager should see latest revision
      fetchLatestRevision();
      fetchAccountants();
      fetchStoreIncharge();
      fetchProjectWorkers();
      fetchCompanyWorkers();
    }
  }, []);

  useEffect(() => {
    if (modalVisible) {
      fetchInventoryItems();
    }
  }, [modalVisible]);

  const fetchProjectDetails = async () => {
    try {
      const response = await projectsAPI.getProjectDetails(project.id);
      // Update local state if needed, though 'project' prop is initial source
      // If we want to refresh the view with new data (like sketch_url), we might need to update a local state object for project
      // For now, let's just update the specific fields we care about refreshing
      if (response.data.project) {
        setSketchUrl(response.data.project.sketch_url);
        setCurrentStatus(response.data.project.status);
        // Also update other fields if they might change
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
  };

  const fetchBOM = async () => {
    try {
      const response = await projectsAPI.getBOM(project.id);
      setMaterials(response.data.materials);
    } catch (error) {
      console.error('Error fetching BOM:', error);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      if (!user.company_id) {
        console.log('No company_id for inventory fetch');
        return;
      }
      console.log('Fetching inventory for BOM autocomplete, company_id:', user.company_id);
      const response = await projectsAPI.getInventory(user.company_id);
      const items = response.data.inventory || [];
      console.log(`Fetched ${items.length} inventory items`);
      setInventoryItems(items);
    } catch (error) {
      console.error('Error fetching inventory for BOM:', error);
    }
  };

  const fetchProjectManagers = async () => {
    try {
      const response = await projectsAPI.getProjectManagers(user.company_id);
      setProjectManagers(response.data.projectManagers);
    } catch (error) {
      console.error('Error fetching project managers:', error);
      Alert.alert('Error', 'Failed to load project managers');
    }
  };

  const fetchRevisions = async () => {
    try {
      const response = await projectsAPI.getRevisions(project.id);
      setRevisions(response.data.revisions);
    } catch (error) {
      console.error('Error fetching revisions:', error);
    }
  };

  const fetchAccountants = async () => {
    try {
      const response = await projectsAPI.getAccountants(user.company_id);
      setAccountants(response.data.accountants || []);
    } catch (error) {
      console.error('Error fetching accountants:', error);
    }
  };

  const fetchStoreIncharge = async () => {
    try {
      const response = await projectsAPI.getStoreIncharge(user.company_id);
      setStoreInchargeUsers(response.data.storeIncharge || []);
    } catch (error) {
      console.error('Error fetching store incharge users:', error);
    }
  };

  const fetchLatestRevision = async () => {
    try {
      const response = await projectsAPI.getRevisions(project.id);
      if (response.data.revisions && response.data.revisions.length > 0) {
        // Get the latest revision (highest revision number)
        const latest = response.data.revisions.sort((a, b) => b.revision_number - a.revision_number)[0];
        setLatestRevision(latest);

        // Fetch BOM items for latest revision
        const revisionResponse = await projectsAPI.getRevision(project.id, latest.id);
        setLatestRevisionBOM(revisionResponse.data.bomItems || []);
      }
    } catch (error) {
      console.error('Error fetching latest revision:', error);
    }
  };

  const handleViewRevision = async (revisionId) => {
    try {
      const response = await projectsAPI.getRevision(project.id, revisionId);
      setSelectedRevision(response.data.revision);
      setRevisionBOMItems(response.data.bomItems);
      setRevisionViewModalVisible(true);
    } catch (error) {
      console.error('Error fetching revision:', error);
      Alert.alert('Error', 'Failed to load revision details');
    }
  };

  const handleCreateRevision = async () => {
    const hasRevisionBOMData = revisionBOMRows.some(row => row.material_name.trim());
    if (!revisionSketchUrl && !revisionSketchImage && !hasRevisionBOMData) {
      Alert.alert('Error', 'Please add at least a sketch or BOM items');
      return;
    }

    try {
      // Handle sketch upload if it's a local file
      let finalSketchUrl = revisionSketchUrl;
      if (revisionSketchImage && (revisionSketchImage.startsWith('file://') || revisionSketchImage.startsWith('content://'))) {
        const formData = new FormData();
        formData.append('sketch', {
          uri: revisionSketchImage,
          name: 'revision_sketch.jpg',
          type: 'image/jpeg',
        });

        const uploadResponse = await projectsAPI.uploadSketch(formData);
        finalSketchUrl = uploadResponse.data.url;
      } else if (revisionSketchImage) {
        // If it's already a URL (e.g. from previous edit, though less likely for new revision)
        finalSketchUrl = revisionSketchImage;
      }

      // Build BOM items from table rows
      let bomItems = revisionBOMRows
        .filter(row => row.material_name.trim())
        .map(row => ({
          material_name: row.material_name.trim(),
          quantity: row.quantity.trim(),
          unit: row.unit || 'pcs',
          hsn: row.hsn.trim() || null
        }));

      const revisionData = {
        sketch_url: finalSketchUrl || null,
        notes: revisionNotes || null,
        bom_items: bomItems,
        created_by: user.id
      };

      await projectsAPI.createRevision(project.id, revisionData);
      Alert.alert('Success', 'Revision created successfully!');
      setRevisionModalVisible(false);
      setRevisionSketchUrl('');
      setRevisionSketchImage(null);
      setRevisionNotes('');
      setRevisionBOMRows([{ material_name: '', quantity: '', unit: 'pcs', hsn: '' }, { material_name: '', quantity: '', unit: 'pcs', hsn: '' }, { material_name: '', quantity: '', unit: 'pcs', hsn: '' }]);
      fetchRevisions();
    } catch (error) {
      console.error('Error creating revision:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create revision');
    }
  };

  const handleAssignPM = async () => {
    if (!selectedPM) {
      Alert.alert('Error', 'Please select a project manager');
      return;
    }

    try {
      // When NPD assigns to PM, set npd_user_id to track NPD responsibility
      // This ensures the project remains visible to NPD even after assigning to PM
      const updateData = {
        assigned_to: selectedPM,
        npd_user_id: user.id  // Track which NPD user is responsible
      };

      console.log('Assigning PM:', { projectId: project.id, updateData });

      await projectsAPI.update(project.id, updateData);

      const selectedPMData = projectManagers.find(pm => pm.id === parseInt(selectedPM));

      Alert.alert('Success', `Project assigned to ${selectedPMData?.name || 'Project Manager'} successfully!`);
      setPmModalVisible(false);

      // Update the project object to reflect the change
      const updatedProject = {
        ...project,
        assigned_to: selectedPM,
        assigned_to_name: selectedPMData?.name,
        assigned_to_role: 'project_manager'
      };

      // Navigate back to refresh the dashboard
      navigation.goBack();
    } catch (error) {
      console.error('Error assigning PM:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to assign project manager');
    }
  };

  const checkStockAvailability = async (materials) => {
    if (!materials || materials.length === 0) {
      console.log('No materials to check');
      return;
    }

    if (!user.company_id) {
      console.log('No company_id found for user:', user);
      Alert.alert('Info', 'Company ID not found. Stock checking unavailable.');
      return;
    }

    try {
      setCheckingStock(true);
      console.log('Checking stock for materials:', materials);
      console.log('Company ID:', user.company_id);

      const response = await projectsAPI.checkStock(user.company_id, materials);
      console.log('Stock check response:', response.data);

      const stockData = {};

      if (response.data && response.data.stock_info) {
        response.data.stock_info.forEach(item => {
          if (item.material_name) {
            const materialKey = item.material_name.toLowerCase().trim();
            const stockValue = {
              available_quantity: item.available_quantity || 0,
              in_stock: item.in_stock || false,
              unit: item.unit || 'pcs'
            };
            // Store with lowercase key for case-insensitive lookup
            stockData[materialKey] = stockValue;
            // Also store with original name for exact match
            stockData[item.material_name] = stockValue;
          }
        });
      }

      console.log('Stock data processed:', stockData);
      setStockInfo(stockData);
    } catch (error) {
      console.error('Error checking stock:', error);
      console.error('Error details:', error.response?.data || error.message);
      Alert.alert('Error', `Failed to check stock: ${error.response?.data?.error || error.message}`);
      setStockInfo({});
    } finally {
      setCheckingStock(false);
    }
  };

  const updateBulkMaterialRow = (index, field, value) => {
    const newRows = [...bulkMaterialRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setBulkMaterialRows(newRows);

    // Show/hide autocomplete suggestions
    if (field === 'material_name') {
      setActiveSuggestionRow(value.trim().length > 0 ? index : null);

      // Debounce stock check when material_name changes
      if (stockCheckTimeoutRef.current) {
        clearTimeout(stockCheckTimeoutRef.current);
      }
      const materialsToCheck = newRows
        .filter(row => row.material_name.trim())
        .map(row => ({ material_name: row.material_name.trim(), unit: row.unit || 'pcs' }));

      if (materialsToCheck.length > 0 && user.company_id) {
        stockCheckTimeoutRef.current = setTimeout(() => {
          checkStockAvailability(materialsToCheck);
        }, 800);
      } else {
        setStockInfo({});
      }
    }
  };

  const selectInventoryItem = (index, item) => {
    const newRows = [...bulkMaterialRows];
    newRows[index] = {
      ...newRows[index],
      material_name: item.item_name,
      hsn: item.hsn || newRows[index].hsn,
      unit: item.unit || newRows[index].unit,
    };
    setBulkMaterialRows(newRows);
    setActiveSuggestionRow(null);
    // Trigger stock check for the auto-filled name
    checkStockAvailability([{ material_name: item.item_name, unit: item.unit || 'pcs' }]);
  };

  const addBulkMaterialRow = () => {
    setBulkMaterialRows([...bulkMaterialRows, { material_name: '', quantity: '', unit: 'pcs', hsn: '' }]);
  };

  const removeBulkMaterialRow = (index) => {
    if (bulkMaterialRows.length <= 1) return;
    const newRows = bulkMaterialRows.filter((_, i) => i !== index);
    setBulkMaterialRows(newRows);
  };

  const updateRevisionBOMRow = (index, field, value) => {
    const newRows = [...revisionBOMRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRevisionBOMRows(newRows);

    if (field === 'material_name') {
      setActiveRevisionSuggestionRow(value.trim().length > 0 ? index : null);

      if (stockCheckTimeoutRef.current) {
        clearTimeout(stockCheckTimeoutRef.current);
      }
      const materialsToCheck = newRows
        .filter(row => row.material_name.trim())
        .map(row => ({ material_name: row.material_name.trim(), unit: row.unit || 'pcs' }));

      if (materialsToCheck.length > 0 && user.company_id) {
        stockCheckTimeoutRef.current = setTimeout(() => {
          checkStockAvailability(materialsToCheck);
        }, 800);
      }
    }
  };

  const selectRevisionInventoryItem = (index, item) => {
    const newRows = [...revisionBOMRows];
    newRows[index] = {
      ...newRows[index],
      material_name: item.item_name,
      hsn: item.hsn || newRows[index].hsn,
      unit: item.unit || newRows[index].unit,
    };
    setRevisionBOMRows(newRows);
    setActiveRevisionSuggestionRow(null);
    checkStockAvailability([{ material_name: item.item_name, unit: item.unit || 'pcs' }]);
  };

  const addRevisionBOMRow = () => {
    setRevisionBOMRows([...revisionBOMRows, { material_name: '', quantity: '', unit: 'pcs', hsn: '' }]);
  };

  const removeRevisionBOMRow = (index) => {
    if (revisionBOMRows.length <= 1) return;
    const newRows = revisionBOMRows.filter((_, i) => i !== index);
    setRevisionBOMRows(newRows);
  };

  const handleAddBulkMaterials = async () => {
    const materialsToAdd = bulkMaterialRows
      .filter(row => row.material_name.trim() && row.quantity.trim())
      .map(row => ({
        material_name: row.material_name.trim(),
        quantity: row.quantity.trim(),
        unit: row.unit || 'pcs',
        hsn: row.hsn.trim() || null,
      }));

    if (materialsToAdd.length === 0) {
      Alert.alert('Error', 'Please fill in at least one material with name and quantity.');
      return;
    }

    try {
      for (const material of materialsToAdd) {
        await projectsAPI.addBOM(project.id, material);
      }

      Alert.alert('Success', `${materialsToAdd.length} materials added to BOM!`);
      setModalVisible(false);
      setBulkMaterialRows([{ material_name: '', quantity: '', unit: 'pcs', hsn: '' }, { material_name: '', quantity: '', unit: 'pcs', hsn: '' }, { material_name: '', quantity: '', unit: 'pcs', hsn: '' }]);
      setStockInfo({});
      if (stockCheckTimeoutRef.current) {
        clearTimeout(stockCheckTimeoutRef.current);
      }
      fetchBOM();
    } catch (error) {
      Alert.alert('Error', 'Failed to add materials');
    }
  };

  const handleDeleteMaterial = (materialId) => {
    Alert.alert(
      'Delete Material',
      'Are you sure you want to delete this material?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await projectsAPI.deleteBOM(project.id, materialId);
              Alert.alert('Success', 'Material deleted');
              fetchBOM();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete material');
            }
          },
        },
      ]
    );
  };

  const pickImageFromGallery = async () => {
    try {
      // Check if the function exists
      if (!ImagePicker || !ImagePicker.requestMediaLibraryPermissionsAsync) {
        Alert.alert(
          'Not Available',
          'Gallery access is not available yet. Please:\n\n1. Stop the app\n2. Run: fix-image-picker.bat\n3. Restart with: npx expo start --clear\n\nOr use URL option for now.'
        );
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow gallery access to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSketchImage(result.assets[0].uri);
        setSketchUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert(
        'Error',
        'Failed to open gallery.\n\nPlease run fix-image-picker.bat and restart the app.\n\nOr use URL option for now.'
      );
    }
  };

  const takePhoto = async () => {
    try {
      // Check if the function exists
      if (!ImagePicker || !ImagePicker.requestCameraPermissionsAsync) {
        Alert.alert(
          'Not Available',
          'Camera access is not available yet. Please:\n\n1. Stop the app\n2. Run: fix-image-picker.bat\n3. Restart with: npx expo start --clear\n\nOr use URL option for now.'
        );
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow camera access to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSketchImage(result.assets[0].uri);
        setSketchUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert(
        'Error',
        'Failed to open camera.\n\nPlease run fix-image-picker.bat and restart the app.\n\nOr use URL option for now.'
      );
    }
  };

  const handleUpdateSketch = async () => {
    try {
      if (imageSource === 'url' && !sketchUrl) {
        Alert.alert('Error', 'Please enter image URL');
        return;
      }

      let finalUrl = sketchUrl;

      // If it's a local file (from camera/gallery), upload it first
      if (sketchUrl && (sketchUrl.startsWith('file://') || sketchUrl.startsWith('content://'))) {
        const formData = new FormData();
        formData.append('sketch', {
          uri: sketchUrl,
          name: 'sketch.jpg',
          type: 'image/jpeg',
        });

        const uploadResponse = await projectsAPI.uploadSketch(formData);
        finalUrl = uploadResponse.data.url;
      }

      await projectsAPI.updateSketch(project.id, finalUrl);
      Alert.alert('Success', 'Sketch updated!');
      setSketchModalVisible(false);
      fetchProjectDetails(); // Refresh to show new image
    } catch (error) {
      console.error('Update sketch error:', error);
      Alert.alert('Error', 'Failed to update sketch');
    }
  };

  const [hsnModalVisible, setHsnModalVisible] = useState(false);
  const [hsnCode, setHsnCode] = useState('');

  const handleUpdateStatus = async (newStatus) => {
    if (newStatus === 'completed') {
      setHsnModalVisible(true);
      return;
    }
    try {
      await projectsAPI.update(project.id, { status: newStatus });
      setCurrentStatus(newStatus);
      Alert.alert('Success', 'Status updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleCompleteProject = async () => {
    if (!hsnCode.trim()) {
      Alert.alert('Error', 'Please enter HSN Code');
      return;
    }
    try {
      const response = await projectsAPI.completeProject(project.id, hsnCode);
      setCurrentStatus('completed');
      setHsnModalVisible(false);
      Alert.alert('Success', `Project completed! Added to Sales Inventory.\nFinal Price: ₹${response.data.price}`);
    } catch (error) {
      console.error('Error completing project:', error);
      const errorMessage = error.response?.data?.error || 'Failed to complete project';
      Alert.alert('Error', errorMessage);
    }
  };

  const viewPODocument = async () => {
    try {
      if (!project.po_path && !project.po_filename) {
        Alert.alert('Error', 'No Purchase Order file associated with this project');
        return;
      }

      const API_BASE_URL = getApiUrl();

      // Extract filename from path if filename is not directly available
      let filename = project.po_filename;
      if (!filename && project.po_path) {
        const parts = project.po_path.split(/[\\/]/);
        filename = parts[parts.length - 1];
      }

      const poUrl = `${API_BASE_URL}/enquiries/download-po-file/${filename}`;

      console.log('Opening PO URL:', poUrl);
      await WebBrowser.openBrowserAsync(poUrl);
    } catch (error) {
      console.error('Error viewing PO:', error);
      Alert.alert('Error', 'Could not open Purchase Order document');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#FF3B30';
      case 'high': return '#FF9500';
      case 'medium': return '#007AFF';
      case 'low': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#34C759';
      case 'in_progress': return '#007AFF';
      case 'on_hold': return '#FF9500';
      case 'pending': return '#8E8E93';
      default: return '#8E8E93';
    }
  };



  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Project Info */}
        <View style={styles.card}>
          <Text style={styles.projectName}>{project.name}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: getPriorityColor(project.priority) }]}>
              <Text style={styles.badgeText}>{project.priority}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getStatusColor(currentStatus) }]}>
              <Text style={styles.badgeText}>{currentStatus.replace('_', ' ')}</Text>
            </View>
          </View>
          {project.description && (
            <Text style={styles.description}>{project.description}</Text>
          )}
        </View>

        {/* NPD Assignment Info (if assigned to NPD) */}
        {assignedNPD && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Assigned to NPD</Text>
            </View>
            <View style={styles.pmInfo}>
              <Text style={styles.pmLabel}>NPD Responsible:</Text>
              <Text style={styles.pmName}>{assignedNPD}</Text>
            </View>
          </View>
        )}

        {/* Assign Project Manager (NPD Only) */}
        {user.role === 'npd' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Project Manager</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setPmModalVisible(true)}
              >
                <Text style={styles.addButtonText}>
                  {currentPM === 'Not Assigned' ? '+ Assign' : '✏️ Change'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pmInfo}>
              <Text style={styles.pmLabel}>Assigned To:</Text>
              <Text style={styles.pmName}>{currentPM}</Text>
            </View>
          </View>
        )}

        {/* Purchase Order View - Not visible for Project Manager */}
        {(project.po_filename || project.po_path) && user.role !== 'project_manager' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Purchase Order</Text>
            </View>
            <TouchableOpacity
              style={styles.poViewButton}
              onPress={viewPODocument}
            >
              <Text style={styles.poViewButtonText}>📄 View Purchase Order PDF</Text>
            </TouchableOpacity>
          </View>
        )}


        {/* Assigned Workers (Project Manager only) */}
        {user.role === 'project_manager' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Assigned Workers</Text>
            
            {projectWorkers.length === 0 ? (
              <Text style={styles.emptyText}>No workers assigned to this project yet.</Text>
            ) : (
              projectWorkers.map((worker) => (
                <View key={worker.worker_id} style={styles.workerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.workerNameText}>{worker.name}</Text>
                    <Text style={styles.workerEmailText}>{worker.email}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeWorkerBtn}
                    onPress={() => handleRemoveWorker(worker.worker_id)}
                  >
                    <Text style={styles.removeWorkerText}>✕ Remove</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            <View style={styles.addWorkerSection}>
              <Text style={styles.addWorkerLabel}>Assign a Worker:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedWorkerForAssign}
                  onValueChange={(itemValue) => setSelectedWorkerForAssign(itemValue)}
                  style={styles.picker}
                >
                  {availableWorkers.filter(w => !projectWorkers.some(pw => pw.worker_id === w.id)).length === 0 ? (
                    <Picker.Item label="No workers available to assign" value="" />
                  ) : (
                    availableWorkers
                      .filter(w => !projectWorkers.some(pw => pw.worker_id === w.id))
                      .map((worker) => (
                        <Picker.Item key={worker.id} label={worker.name} value={worker.id.toString()} />
                      ))
                  )}
                </Picker>
              </View>
              <TouchableOpacity
                style={styles.addWorkerBtn}
                onPress={handleAssignWorker}
                disabled={loadingWorkers || availableWorkers.filter(w => !projectWorkers.some(pw => pw.worker_id === w.id)).length === 0}
              >
                <Text style={styles.addWorkerBtnText}>+ Assign Worker</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Store Requests Status (Project Manager only) */}
        {user.role === 'project_manager' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Store Requests Status</Text>
              {loadingRequests && <ActivityIndicator size="small" color="#007AFF" />}
            </View>
            {storeRequests.length === 0 ? (
              <Text style={styles.emptyText}>No store requests created yet.</Text>
            ) : (
              storeRequests.map((req) => {
                const isExpanded = !!expandedRequests[req.id];
                const dateStr = new Date(req.request_date).toLocaleDateString();
                
                // Determine status badge colors and labels
                let statusLabel = 'PENDING';
                let statusColor = '#FF9500'; // Orange
                let statusBg = '#FFF5E6';
                if (req.status === 'fulfilled') {
                  statusLabel = 'COLLECTED ✅';
                  statusColor = '#34C759'; // Green
                  statusBg = '#E8F5E9';
                } else if (req.status === 'partially_allocated') {
                  statusLabel = 'PARTIALLY COLLECTED ⚠️';
                  statusColor = '#FF9500'; // Orange
                  statusBg = '#FFF5E6';
                } else if (req.status === 'rejected') {
                  statusLabel = 'REJECTED ❌';
                  statusColor = '#FF3B30'; // Red
                  statusBg = '#FFEBEE';
                }

                return (
                  <View key={req.id} style={styles.storeReqItem}>
                    <TouchableOpacity
                      style={styles.storeReqHeader}
                      onPress={() => toggleRequestExpand(req.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.storeReqDate}>Requested on: {dateStr}</Text>
                        <Text style={styles.storeReqWorker}>
                          Worker: {req.allocated_to_worker_name || 'Not Specified'}
                        </Text>
                      </View>
                      <View style={[styles.storeReqStatusBadge, { backgroundColor: statusBg }]}>
                        <Text style={[styles.storeReqStatusText, { color: statusColor }]}>
                          {statusLabel}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.storeReqDetails}>
                        <Text style={styles.storeReqDetailsTitle}>Requested Items:</Text>
                        {req.items && req.items.map((item) => {
                          const reqQty = parseFloat(item.quantity) || 0;
                          const allocQty = parseFloat(item.allocated_quantity) || 0;
                          let itemStatus = 'Pending Collection';
                          let itemStatusColor = '#FF9500';
                          if (allocQty >= reqQty) {
                            itemStatus = 'Collected';
                            itemStatusColor = '#34C759';
                          } else if (allocQty > 0) {
                            itemStatus = 'Partially Collected';
                            itemStatusColor = '#007AFF';
                          }

                          return (
                            <View key={item.id} style={styles.storeReqDetailRow}>
                              <View style={{ flex: 2 }}>
                                <Text style={styles.storeReqItemName}>{item.material_name}</Text>
                                <Text style={styles.storeReqItemQty}>
                                  Qty: {allocQty} / {reqQty} {item.unit}
                                </Text>
                              </View>
                              <Text style={[styles.storeReqItemStatus, { color: itemStatusColor }]}>
                                {itemStatus}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Status of Project */}
        {(user.role === 'project_manager' || user.role === 'npd' || user.role === 'management') && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Status of Project</Text>
              {loadingHistory && <ActivityIndicator size="small" color="#007AFF" />}
            </View>

            {/* Timeline View */}
            {statusHistory.length === 0 ? (
              <View style={styles.emptyTimelineContainer}>
                <Text style={styles.emptyText}>Project has not been started yet.</Text>
                {user.role === 'project_manager' && (
                  <TouchableOpacity
                    style={styles.startProjectBtn}
                    onPress={handleStartProject}
                    disabled={loadingHistory}
                  >
                    <Text style={styles.startProjectBtnText}>🚀 Start the Project</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={{ marginTop: 10 }}>
                {/* Shopping App delivery style timeline */}
                <View style={styles.timelineList}>
                  {[...statusHistory].reverse().map((entry, index, arr) => {
                    const isLast = index === arr.length - 1;
                    const dateStr = new Date(entry.changed_at).toLocaleString();
                    return (
                      <View key={entry.id} style={styles.timelineRow}>
                        <View style={styles.timelineLeftColumn}>
                          {/* Circle dot */}
                          <View style={[
                            styles.timelineDot,
                            isLast ? styles.timelineDotActive : styles.timelineDotPassed
                          ]}>
                            {isLast && <View style={styles.timelineDotInnerActive} />}
                          </View>
                          {/* Vertical connector line */}
                          {!isLast && <View style={styles.timelineLine} />}
                        </View>

                        <View style={styles.timelineRightColumn}>
                          <Text style={[
                            styles.timelineStatusText,
                            isLast ? styles.timelineStatusTextActive : styles.timelineStatusTextPassed
                          ]}>
                            {entry.new_status}
                          </Text>
                          <Text style={styles.timelineTimeText}>{dateStr}</Text>
                          {entry.changed_by_name && (
                            <Text style={styles.timelineUserText}>Updated by: {entry.changed_by_name}</Text>
                          )}
                          {entry.notes && (
                            <Text style={styles.timelineNotesText}>Note: {entry.notes}</Text>
                          )}
                          {renderTimelineReports(entry)}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Dropdown for next phase (Project Manager only) */}
                {user.role === 'project_manager' && statusHistory[0]?.new_status !== 'Completed' && (
                  <View style={styles.nextPhaseContainer}>
                    <Text style={styles.nextPhaseLabel}>Select Next Phase:</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={selectedNextPhase}
                        onValueChange={(itemValue) => setSelectedNextPhase(itemValue)}
                        style={styles.picker}
                      >
                        <Picker.Item label="Cutting" value="Cutting" />
                        <Picker.Item label="Preparation" value="Preparation" />
                        <Picker.Item label="Fit Up" value="Fit Up" />
                        <Picker.Item label="Welding" value="Welding" />
                        <Picker.Item label="Dressing/Finishing" value="Dressing/Finishing" />
                        <Picker.Item label="Inspection" value="Inspection" />
                        <Picker.Item label="Fabrication" value="Fabrication" />
                        <Picker.Item label="Machining" value="Machining" />
                        <Picker.Item label="Job Work" value="Job Work" />
                        <Picker.Item label="Completed" value="Completed" />
                      </Picker>
                    </View>
                    <TouchableOpacity
                      style={styles.nextPhaseBtn}
                      onPress={handleMoveToNextPhase}
                      disabled={loadingHistory}
                    >
                      <Text style={styles.nextPhaseBtnText}>Go to Next Phase ➡️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Sketch */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Product Sketch</Text>
            {/* Only NPD and Management can edit sketch */}
            {(user.role === 'npd' || user.role === 'management') && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setSketchModalVisible(true)}
              >
                <Text style={styles.addButtonText}>
                  {sketchUrl ? '✏️ Edit' : '+ Add'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {/* For Project Manager: Show latest revision sketch OR original sketch */}
          {user.role === 'project_manager' ? (
            latestRevision ? (
              // Show Revision Sketch
              latestRevision.sketch_url ? (
                <>
                  <View style={styles.revisionInfoHeader}>
                    <Text style={styles.revisionInfoText}>
                      Revision {latestRevision.revision_number} • {new Date(latestRevision.created_at).toLocaleString()}
                    </Text>
                  </View>
                  {(() => {
                    let imageUri = latestRevision.sketch_url;
                    if (imageUri && imageUri.startsWith('file://')) {
                      return (
                        <View style={styles.imageContainer}>
                          <View style={styles.imageErrorContainer}>
                            <Text style={styles.imageErrorText}>⚠️ Image file not found</Text>
                            <Text style={styles.imageErrorSubtext}>
                              The sketch image was saved as a local file that is no longer available.
                              Please ask NPD to re-upload the sketch.
                            </Text>
                          </View>
                        </View>
                      );
                    }
                    if (imageUri && !imageUri.startsWith('http://') && !imageUri.startsWith('https://')) {
                      const baseUrl = getApiUrl().replace('/api', '');
                      imageUri = `${baseUrl}${imageUri.startsWith('/') ? imageUri : '/' + imageUri}`;
                    }
                    if (!imageUri) {
                      return (
                        <View style={styles.imageContainer}>
                          <Text style={styles.emptyText}>No sketch image available</Text>
                        </View>
                      );
                    }
                    return (
                      <View style={styles.imageContainer}>
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.sketchImage}
                          resizeMode="contain"
                        />
                      </View>
                    );
                  })()}
                </>
              ) : (
                <Text style={styles.emptyText}>No revision sketch available yet</Text>
              )
            ) : (
              // Show Original Sketch (Fallback)
              <>
                <View style={styles.revisionInfoHeader}>
                  <Text style={styles.revisionInfoText}>Original Project Sketch</Text>
                </View>
                {project.sketch_url ? (
                  (() => {
                    let imageUri = project.sketch_url;
                    if (imageUri && imageUri.startsWith('file://')) {
                      return (
                        <View style={styles.imageContainer}>
                          <View style={styles.imageErrorContainer}>
                            <Text style={styles.imageErrorText}>⚠️ Image file not found</Text>
                          </View>
                        </View>
                      );
                    }
                    if (imageUri && !imageUri.startsWith('http://') && !imageUri.startsWith('https://')) {
                      const baseUrl = getApiUrl().replace('/api', '');
                      imageUri = `${baseUrl}${imageUri.startsWith('/') ? imageUri : '/' + imageUri}`;
                    }
                    return (
                      <View style={styles.imageContainer}>
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.sketchImage}
                          resizeMode="contain"
                        />
                      </View>
                    );
                  })()
                ) : (
                  <Text style={styles.emptyText}>No original sketch uploaded</Text>
                )}
              </>
            )
          ) : (
            /* For NPD/Management: Show original sketch */
            sketchUrl ? (
              (() => {
                // Construct full image URL if it's a relative path
                let imageUri = sketchUrl;

                // Check if it's a local file path that may not exist
                if (imageUri && imageUri.startsWith('file://')) {
                  return (
                    <View style={styles.imageContainer}>
                      <View style={styles.imageErrorContainer}>
                        <Text style={styles.imageErrorText}>⚠️ Image file not found</Text>
                        <Text style={styles.imageErrorSubtext}>
                          The sketch image was saved as a local file that is no longer available.
                          Please re-upload the sketch using a URL or upload it to the server.
                        </Text>
                      </View>
                    </View>
                  );
                }

                if (imageUri && !imageUri.startsWith('http://') && !imageUri.startsWith('https://')) {
                  // If it's a relative path, prepend the base URL
                  const baseUrl = getApiUrl().replace('/api', '');
                  imageUri = `${baseUrl}${imageUri.startsWith('/') ? imageUri : '/' + imageUri}`;
                }

                return (
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.sketchImage}
                      resizeMode="contain"
                      onError={(error) => {
                        const errorMessage = error?.nativeEvent?.error || error?.nativeEvent?.message || 'Failed to load image';
                        console.error('Error loading sketch image:', errorMessage);
                        console.log('Image URL:', imageUri);
                      }}
                      onLoad={() => {
                        console.log('Sketch image loaded successfully:', imageUri);
                      }}
                    />
                  </View>
                );
              })()
            ) : (
              <Text style={styles.emptyText}>No sketch uploaded yet</Text>
            )
          )}
        </View>

        {/* Bill of Materials */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Bill of Materials</Text>
            <View style={styles.cardHeaderButtons}>
              {/* Request Items and Send to Accounts buttons for Project Managers */}
              {user.role === 'project_manager' && (
                <>
                  <TouchableOpacity
                    style={[styles.addButton, styles.requestButton]}
                    onPress={() => {
                      // Determine which BOM to use (Revision or Original)
                      const bomToUse = latestRevision ? latestRevisionBOM : materials;

                      // Pre-select all items
                      const itemsToSelect = bomToUse.map(item => ({
                        id: item.id,
                        material_name: item.material_name,
                        quantity: item.quantity,
                        unit: item.unit,
                        hsn: item.hsn
                      }));
                      setSelectedItems(itemsToSelect);
                      setRequestModalVisible(true);
                    }}
                  >
                    <Text style={styles.addButtonText}>📦 Request Items</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addButton, styles.sendToAccountsButton]}
                    onPress={() => {
                      // Determine which BOM to use (Revision or Original)
                      const bomToUse = latestRevision ? latestRevisionBOM : materials;
                      // Initialize used materials from the determined BOM
                      const initialUsedMaterials = bomToUse.map(item => ({
                        id: item.id,
                        material_name: item.material_name,
                        quantity: item.quantity,
                        unit: item.unit,
                        hsn: item.hsn,
                        used_quantity: '',
                        estimated_cost: item.estimated_cost || ''
                      }));
                      setUsedMaterials(initialUsedMaterials);
                      setMaterialUsageModalVisible(true);
                    }}
                  >
                    <Text style={styles.addButtonText}>📋 Send to Accounts</Text>
                  </TouchableOpacity>
                </>
              )}
              {/* Only NPD and Management can add/edit BOM */}
              {(user.role === 'npd' || user.role === 'management') && (
                <>
                  <TouchableOpacity
                    style={[styles.addButton, { marginRight: 10, backgroundColor: '#FF9500' }]}
                    onPress={() => {
                      const outOfStockItems = materials.filter(m => !m.in_stock);

                      navigation.navigate('SendRequirements', {
                        user,
                        projectId: project.id,
                        prefillItems: outOfStockItems.map(item => ({
                          item_name: item.material_name,
                          quantity: item.quantity.toString(),
                          hsn: item.hsn || ''
                        }))
                      });
                    }}
                  >
                    <Text style={styles.addButtonText}>📋 Send Req</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                      setModalVisible(true);
                      setStockInfo({});
                      setBulkMaterialRows([{ material_name: '', quantity: '', unit: 'pcs', hsn: '' }, { material_name: '', quantity: '', unit: 'pcs', hsn: '' }, { material_name: '', quantity: '', unit: 'pcs', hsn: '' }]);
                    }}
                  >
                    <Text style={styles.addButtonText}>+ Add</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* For Project Manager: Show latest revision BOM OR original BOM */}
          {user.role === 'project_manager' ? (
            latestRevision ? (
              // Show Revision BOM
              latestRevisionBOM && latestRevisionBOM.length > 0 ? (
                <>
                  <View style={styles.revisionInfoHeader}>
                    <Text style={styles.revisionInfoText}>
                      Revision {latestRevision.revision_number} • {new Date(latestRevision.created_at).toLocaleString()}
                    </Text>
                  </View>
                  {latestRevisionBOM.map((item) => (
                    <View key={item.id} style={styles.materialItem}>
                      <View style={styles.materialInfo}>
                        <View style={styles.materialHeader}>
                          <Text style={styles.materialSerial}>#{item.serial_number}</Text>
                          <Text style={styles.materialName}>{item.material_name}</Text>
                        </View>
                        <Text style={styles.materialDetails}>
                          {item.quantity} {item.unit}
                          {item.hsn && ` • HSN: ${item.hsn}`}
                          {item.estimated_cost && ` • ₹${item.estimated_cost}`}
                        </Text>
                        {item.supplier && (
                          <Text style={styles.materialSupplier}>Supplier: {item.supplier}</Text>
                        )}
                        {item.notes && (
                          <Text style={styles.materialNotes}>{item.notes}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={styles.emptyText}>No revision BOM available yet</Text>
              )
            ) : (
              // Show Original BOM (Fallback)
              materials && materials.length > 0 ? (
                <>
                  <View style={styles.revisionInfoHeader}>
                    <Text style={styles.revisionInfoText}>Original Bill of Materials</Text>
                  </View>
                  {materials.map((material, index) => (
                    <View key={material.id} style={styles.materialItem}>
                      <View style={styles.materialInfo}>
                        <View style={styles.materialHeader}>
                          <Text style={styles.materialSerial}>#{index + 1}</Text>
                          <Text style={styles.materialName}>{material.material_name}</Text>
                        </View>
                        <Text style={styles.materialDetails}>
                          {material.quantity} {material.unit}
                          {material.hsn && ` • HSN: ${material.hsn}`}
                        </Text>
                        {/* Stock Availability Indicator */}
                        <View style={[
                          styles.stockBadge,
                          material.in_stock ? styles.inStockBadge : styles.outOfStockBadge
                        ]}>
                          <Text style={[
                            styles.stockText,
                            material.in_stock ? styles.inStockText : styles.outOfStockText
                          ]}>
                            {material.in_stock
                              ? `In Stock: ${material.available_quantity} ${material.unit}`
                              : 'Out of Stock'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={styles.emptyText}>No original BOM items added yet</Text>
              )
            )
          ) : (
            /* For NPD/Management: Show original BOM */
            materials.length === 0 ? (
              <Text style={styles.emptyText}>No materials added yet</Text>
            ) : (
              <>
                {materials.map((material, index) => (
                  <View key={material.id} style={styles.materialItem}>
                    <View style={styles.materialInfo}>
                      <View style={styles.materialHeader}>
                        <Text style={styles.materialSerial}>#{index + 1}</Text>
                        <Text style={styles.materialName}>{material.material_name}</Text>
                      </View>
                      <Text style={styles.materialDetails}>
                        {material.quantity} {material.unit}
                        {material.hsn && ` • HSN: ${material.hsn}`}
                      </Text>
                      {/* Stock Availability Indicator */}
                      <View style={[
                        styles.stockBadge,
                        material.in_stock ? styles.inStockBadge : styles.outOfStockBadge
                      ]}>
                        <Text style={[
                          styles.stockBadgeText,
                          material.in_stock ? styles.inStockText : styles.outOfStockText
                        ]}>
                          {material.in_stock
                            ? `✓ In Stock (${material.available_quantity} ${material.unit})`
                            : '⚠️ Out of Stock'}
                        </Text>
                      </View>
                    </View>
                    {/* Only NPD and Management can delete BOM items */}
                    {(user.role === 'npd' || user.role === 'management') && (
                      <TouchableOpacity
                        onPress={() => handleDeleteMaterial(material.id)}
                        style={styles.deleteButton}
                      >
                        <Text style={styles.deleteText}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </>
            )
          )}
        </View>

        {/* Revisions Section (NPD Only) */}
        {user.role === 'npd' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Revisions</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setRevisionModalVisible(true)}
              >
                <Text style={styles.addButtonText}>+ New Revision</Text>
              </TouchableOpacity>
            </View>

            {revisions.length === 0 ? (
              <Text style={styles.emptyText}>No revisions yet</Text>
            ) : (
              <>
                {revisions.map((revision) => (
                  <TouchableOpacity
                    key={revision.id}
                    style={styles.revisionItem}
                    onPress={() => handleViewRevision(revision.id)}
                  >
                    <View style={styles.revisionHeader}>
                      <Text style={styles.revisionNumber}>
                        Revision {revision.revision_number}
                      </Text>
                      <Text style={styles.revisionDate}>
                        {new Date(revision.created_at).toLocaleString()}
                      </Text>
                    </View>
                    {revision.created_by_name && (
                      <Text style={styles.revisionBy}>
                        Created by: {revision.created_by_name}
                      </Text>
                    )}
                    {revision.notes && (
                      <Text style={styles.revisionNotes} numberOfLines={2}>
                        {revision.notes}
                      </Text>
                    )}
                    <View style={styles.revisionBadges}>
                      {revision.sketch_url && (
                        <View style={styles.revisionBadge}>
                          <Text style={styles.revisionBadgeText}>📐 Sketch</Text>
                        </View>
                      )}
                      <View style={styles.revisionBadge}>
                        <Text style={styles.revisionBadgeText}>📋 BOM</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Materials Modal (Bulk Entry) */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setActiveSuggestionRow(null);
        }}
        onShow={fetchInventoryItems}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Materials</Text>
            <Text style={styles.modalSubtitle}>
              Tap material name to search from inventory
            </Text>

            {/* Table Header */}
            <View style={styles.bomTableHeader}>
              <Text style={[styles.bomTableHeaderText, { flex: 3 }]}>Material Name</Text>
              <Text style={[styles.bomTableHeaderText, { flex: 1.2 }]}>Qty</Text>
              <Text style={[styles.bomTableHeaderText, { flex: 1.5 }]}>Unit</Text>
              <Text style={[styles.bomTableHeaderText, { flex: 1.8 }]}>HSN</Text>
              <Text style={[styles.bomTableHeaderText, { width: 32 }]}></Text>
            </View>

            {/* Table Rows */}
            <ScrollView style={styles.bomTableScrollArea} nestedScrollEnabled>
              {bulkMaterialRows.map((row, index) => {
                const materialKey = row.material_name.toLowerCase().trim();
                const stock = stockInfo[materialKey] || stockInfo[row.material_name];
                return (
                    <View key={index}>
                      <View style={styles.bomTableRow}>
                        {/* Material Name with autocomplete */}
                        <View style={[{ flex: 3 }, styles.autocompleteWrapper]}>
                          <TextInput
                            style={[styles.bomTableInput, { flex: 1 }]}
                            placeholder="Name"
                            value={row.material_name}
                            onChangeText={(val) => updateBulkMaterialRow(index, 'material_name', val)}
                            onFocus={() => setActiveSuggestionRow(index)}
                            onBlur={() => setTimeout(() => setActiveSuggestionRow(null), 300)}
                          />
                          {activeSuggestionRow === index && (() => {
                            const query = row.material_name.toLowerCase().trim();
                            const suggestions = query.length === 0
                              ? inventoryItems.slice(0, 20)
                              : inventoryItems.filter(item =>
                                item.item_name && item.item_name.toLowerCase().includes(query)
                              ).slice(0, 15);
                              
                            return suggestions.length > 0 ? (
                              <View style={styles.suggestionDropdown}>
                                {suggestions.map((item, sIdx) => (
                                  <TouchableOpacity
                                    key={sIdx}
                                    style={styles.suggestionItem}
                                    onPress={() => selectInventoryItem(index, item)}
                                  >
                                    <Text style={styles.suggestionItemName}>{item.item_name}</Text>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                      <Text style={styles.suggestionItemMeta}>
                                        Stock: {item.quantity} {item.unit}
                                      </Text>
                                      {item.hsn && (
                                        <Text style={styles.suggestionItemMeta}>HSN: {item.hsn}</Text>
                                      )}
                                    </View>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            ) : query.length > 0 ? (
                              <View style={styles.suggestionDropdown}>
                                <View style={styles.suggestionItem}>
                                  <Text style={[styles.suggestionItemName, { color: '#666' }]}>"{row.material_name}" not in inventory</Text>
                                  <Text style={[styles.suggestionItemMeta, { color: '#FF3B30' }]}>Stock: 0</Text>
                                </View>
                              </View>
                            ) : null;
                          })()}
                        </View>
                      <TextInput
                        style={[styles.bomTableInput, { flex: 1.2 }]}
                        placeholder="Qty"
                        value={row.quantity}
                        onChangeText={(val) => updateBulkMaterialRow(index, 'quantity', val)}
                        keyboardType="numeric"
                      />
                      <View style={[styles.bomTablePickerWrap, { flex: 1.5 }]}>
                        <Picker
                          selectedValue={row.unit}
                          onValueChange={(val) => updateBulkMaterialRow(index, 'unit', val)}
                          style={styles.bomTablePicker}
                        >
                          <Picker.Item label="Pieces (pcs)" value="pcs" />
                          <Picker.Item label="Numbers (nos)" value="nos" />
                          <Picker.Item label="Set" value="set" />
                          <Picker.Item label="Pair" value="pair" />
                          <Picker.Item label="Dozen (dzn)" value="dozen" />
                          <Picker.Item label="Gross" value="gross" />
                          <Picker.Item label="Box" value="box" />
                          <Picker.Item label="Bag" value="bag" />
                          <Picker.Item label="Bundle" value="bundle" />
                          <Picker.Item label="Roll" value="roll" />
                          <Picker.Item label="Sheet" value="sheet" />
                          <Picker.Item label="Coil" value="coil" />
                          <Picker.Item label="Drum" value="drum" />
                          <Picker.Item label="Gram (g)" value="g" />
                          <Picker.Item label="Kilogram (kg)" value="kg" />
                          <Picker.Item label="Quintal (qtl)" value="quintal" />
                          <Picker.Item label="Metric Ton (MT)" value="MT" />
                          <Picker.Item label="Ton" value="ton" />
                          <Picker.Item label="Millilitre (ml)" value="ml" />
                          <Picker.Item label="Litre (l)" value="l" />
                          <Picker.Item label="Kilolitre (kl)" value="kl" />
                          <Picker.Item label="Millimetre (mm)" value="mm" />
                          <Picker.Item label="Centimetre (cm)" value="cm" />
                          <Picker.Item label="Metre (m)" value="m" />
                          <Picker.Item label="Feet (ft)" value="ft" />
                          <Picker.Item label="Inch" value="inch" />
                          <Picker.Item label="Square Metre (sqm)" value="sqm" />
                          <Picker.Item label="Square Feet (sqft)" value="sqft" />
                          <Picker.Item label="Cubic Feet (cft)" value="cft" />
                        </Picker>
                      </View>
                      <TextInput
                        style={[styles.bomTableInput, { flex: 1.8 }]}
                        placeholder="HSN"
                        value={row.hsn}
                        onChangeText={(val) => updateBulkMaterialRow(index, 'hsn', val)}
                      />
                      <TouchableOpacity
                        style={styles.bomTableDeleteBtn}
                        onPress={() => removeBulkMaterialRow(index)}
                      >
                        <Text style={styles.bomTableDeleteText}>❌</Text>
                      </TouchableOpacity>
                    </View>
                    {/* Stock badge per row */}
                    {stock && row.material_name.trim() !== '' && (
                      <View style={styles.bomTableStockBadge}>
                        {stock.in_stock ? (
                          <Text style={styles.bomTableStockGreen}>✓ In stock: {stock.available_quantity} {stock.unit}</Text>
                        ) : (
                          <Text style={styles.bomTableStockRed}>⚠️ Stock: 0 ({row.unit})</Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Add Row Button */}
            <TouchableOpacity style={styles.bomTableAddBtn} onPress={addBulkMaterialRow}>
              <Text style={styles.bomTableAddBtnText}>+ Add Row</Text>
            </TouchableOpacity>

            {/* Refresh Stock Button */}
            {bulkMaterialRows.some(r => r.material_name.trim()) && (
              <TouchableOpacity
                style={styles.bomTableRefreshStock}
                onPress={() => {
                  const materialsToCheck = bulkMaterialRows
                    .filter(r => r.material_name.trim())
                    .map(r => ({ material_name: r.material_name.trim(), unit: r.unit || 'pcs' }));
                  if (materialsToCheck.length > 0) {
                    checkStockAvailability(materialsToCheck);
                  }
                }}
                disabled={checkingStock}
              >
                <Text style={styles.bomTableRefreshStockText}>
                  {checkingStock ? '⏳ Checking Stock...' : '📦 Check Stock Availability'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddBulkMaterials}
              >
                <Text style={styles.saveButtonText}>Add All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sketch Modal */}
      <Modal
        visible={sketchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSketchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Product Sketch</Text>

            <View style={styles.imageSourceButtons}>
              <TouchableOpacity
                style={[styles.sourceButton, imageSource === 'camera' && styles.activeSource]}
                onPress={() => {
                  setImageSource('camera');
                  takePhoto();
                }}
              >
                <Text style={styles.sourceButtonText}>📷 Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sourceButton, imageSource === 'gallery' && styles.activeSource]}
                onPress={() => {
                  setImageSource('gallery');
                  pickImageFromGallery();
                }}
              >
                <Text style={styles.sourceButtonText}>🖼️ Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sourceButton, imageSource === 'url' && styles.activeSource]}
                onPress={() => setImageSource('url')}
              >
                <Text style={styles.sourceButtonText}>🔗 URL</Text>
              </TouchableOpacity>
            </View>

            {imageSource === 'url' && (
              <TextInput
                style={styles.input}
                placeholder="https://example.com/sketch.jpg"
                value={sketchUrl}
                onChangeText={setSketchUrl}
                autoCapitalize="none"
              />
            )}

            {sketchImage && (
              <Image source={{ uri: sketchImage }} style={styles.previewImage} />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setSketchModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateSketch}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Project Manager Modal */}
      <Modal
        visible={pmModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Project Manager</Text>
            <Text style={styles.modalSubtitle}>
              Select a Project Manager to work on this project.{'\n'}
              {assignedNPD && `(Project is assigned to NPD: ${assignedNPD})`}
            </Text>

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedPM}
                onValueChange={(value) => setSelectedPM(value)}
                style={styles.picker}
              >
                <Picker.Item label="Select Project Manager..." value="" />
                {projectManagers.map((pm) => (
                  <Picker.Item key={pm.id} label={pm.name} value={pm.id.toString()} />
                ))}
              </Picker>
            </View>

            {selectedPM ? (
              <Text style={{ textAlign: 'center', marginTop: 10, fontWeight: 'bold', color: '#333' }}>
                Selected: {projectManagers.find(pm => pm.id.toString() === selectedPM)?.name}
              </Text>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setPmModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAssignPM}
              >
                <Text style={styles.saveButtonText}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Revision Modal (NPD Only) */}
      {user.role === 'npd' && (
        <Modal
          visible={revisionModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setRevisionModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create New Revision</Text>
              <Text style={styles.modalSubtitle}>
                Upload new sketch and/or BOM items for this revision
              </Text>

              {/* Revision Sketch */}
              <Text style={styles.sectionLabel}>Revision Sketch (Optional)</Text>
              <View style={styles.imageSourceButtons}>
                <TouchableOpacity
                  style={styles.sourceButton}
                  onPress={async () => {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') {
                      Alert.alert('Permission Needed', 'Please allow camera access.');
                      return;
                    }
                    const result = await ImagePicker.launchCameraAsync({
                      allowsEditing: true,
                      aspect: [4, 3],
                      quality: 0.8,
                    });
                    if (!result.canceled && result.assets && result.assets.length > 0) {
                      setRevisionSketchImage(result.assets[0].uri);
                    }
                  }}
                >
                  <Text style={styles.sourceButtonText}>📷 Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sourceButton}
                  onPress={async () => {
                    const result = await ImagePicker.launchImageLibraryAsync({
                      allowsEditing: true,
                      aspect: [4, 3],
                      quality: 0.8,
                    });
                    if (!result.canceled && result.assets && result.assets.length > 0) {
                      setRevisionSketchImage(result.assets[0].uri);
                    }
                  }}
                >
                  <Text style={styles.sourceButtonText}>🖼️ Gallery</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Or enter sketch URL"
                value={revisionSketchUrl}
                onChangeText={setRevisionSketchUrl}
              />
              {revisionSketchImage && (
                <Image source={{ uri: revisionSketchImage }} style={styles.previewImage} />
              )}

              {/* Revision BOM */}
              <Text style={styles.sectionLabel}>Bill of Materials (Optional)</Text>

              {/* Table Header */}
              <View style={styles.bomTableHeader}>
                <Text style={[styles.bomTableHeaderText, { flex: 3 }]}>Material Name</Text>
                <Text style={[styles.bomTableHeaderText, { flex: 1.2 }]}>Qty</Text>
                <Text style={[styles.bomTableHeaderText, { flex: 1.5 }]}>Unit</Text>
                <Text style={[styles.bomTableHeaderText, { flex: 1.8 }]}>HSN</Text>
                <Text style={[styles.bomTableHeaderText, { width: 32 }]}></Text>
              </View>

              {/* Table Rows */}
              <ScrollView style={[styles.bomTableScrollArea, { maxHeight: 200 }]} nestedScrollEnabled>
                  {revisionBOMRows.map((row, index) => {
                    const materialKey = row.material_name.toLowerCase().trim();
                    const stock = stockInfo[materialKey] || stockInfo[row.material_name];
                    return (
                      <View key={index}>
                        <View style={styles.bomTableRow}>
                          <View style={[{ flex: 3 }, styles.autocompleteWrapper]}>
                            <TextInput
                              style={[styles.bomTableInput, { flex: 1 }]}
                              placeholder="Name"
                              value={row.material_name}
                              onChangeText={(val) => updateRevisionBOMRow(index, 'material_name', val)}
                              onFocus={() => setActiveRevisionSuggestionRow(index)}
                              onBlur={() => setTimeout(() => setActiveRevisionSuggestionRow(null), 300)}
                            />
                            {activeRevisionSuggestionRow === index && (() => {
                              const query = row.material_name.toLowerCase().trim();
                              const suggestions = query.length === 0
                                ? inventoryItems.slice(0, 20)
                                : inventoryItems.filter(item =>
                                  item.item_name && item.item_name.toLowerCase().includes(query)
                                ).slice(0, 15);
                                
                              return suggestions.length > 0 ? (
                                <View style={styles.suggestionDropdown}>
                                  {suggestions.map((item, sIdx) => (
                                    <TouchableOpacity
                                      key={sIdx}
                                      style={styles.suggestionItem}
                                      onPress={() => selectRevisionInventoryItem(index, item)}
                                    >
                                      <Text style={styles.suggestionItemName}>{item.item_name}</Text>
                                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={styles.suggestionItemMeta}>
                                          Stock: {item.quantity} {item.unit}
                                        </Text>
                                        {item.hsn && (
                                          <Text style={styles.suggestionItemMeta}>HSN: {item.hsn}</Text>
                                        )}
                                      </View>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              ) : query.length > 0 ? (
                                <View style={styles.suggestionDropdown}>
                                  <View style={styles.suggestionItem}>
                                    <Text style={[styles.suggestionItemName, { color: '#666' }]}>"{row.material_name}" not in inventory</Text>
                                    <Text style={[styles.suggestionItemMeta, { color: '#FF3B30' }]}>Stock: 0</Text>
                                  </View>
                                </View>
                              ) : null;
                            })()}
                          </View>
                          <TextInput
                            style={[styles.bomTableInput, { flex: 1.2 }]}
                            placeholder="Qty"
                            value={row.quantity}
                            onChangeText={(val) => updateRevisionBOMRow(index, 'quantity', val)}
                            keyboardType="numeric"
                          />
                          <View style={[styles.bomTablePickerWrap, { flex: 1.5 }]}>
                            <Picker
                              selectedValue={row.unit}
                              onValueChange={(val) => updateRevisionBOMRow(index, 'unit', val)}
                              style={styles.bomTablePicker}
                            >
                              <Picker.Item label="Pieces (pcs)" value="pcs" />
                              <Picker.Item label="Numbers (nos)" value="nos" />
                              <Picker.Item label="Set" value="set" />
                              <Picker.Item label="Pair" value="pair" />
                              <Picker.Item label="Dozen (dzn)" value="dozen" />
                              <Picker.Item label="Gross" value="gross" />
                              <Picker.Item label="Box" value="box" />
                              <Picker.Item label="Bag" value="bag" />
                              <Picker.Item label="Bundle" value="bundle" />
                              <Picker.Item label="Roll" value="roll" />
                              <Picker.Item label="Sheet" value="sheet" />
                              <Picker.Item label="Coil" value="coil" />
                              <Picker.Item label="Drum" value="drum" />
                              <Picker.Item label="Gram (g)" value="g" />
                              <Picker.Item label="Kilogram (kg)" value="kg" />
                              <Picker.Item label="Quintal (qtl)" value="quintal" />
                              <Picker.Item label="Metric Ton (MT)" value="MT" />
                              <Picker.Item label="Ton" value="ton" />
                              <Picker.Item label="Millilitre (ml)" value="ml" />
                              <Picker.Item label="Litre (l)" value="l" />
                              <Picker.Item label="Kilolitre (kl)" value="kl" />
                              <Picker.Item label="Millimetre (mm)" value="mm" />
                              <Picker.Item label="Centimetre (cm)" value="cm" />
                              <Picker.Item label="Metre (m)" value="m" />
                              <Picker.Item label="Feet (ft)" value="ft" />
                              <Picker.Item label="Inch" value="inch" />
                              <Picker.Item label="Square Metre (sqm)" value="sqm" />
                              <Picker.Item label="Square Feet (sqft)" value="sqft" />
                              <Picker.Item label="Cubic Feet (cft)" value="cft" />
                            </Picker>
                          </View>
                          <TextInput
                            style={[styles.bomTableInput, { flex: 1.8 }]}
                            placeholder="HSN"
                            value={row.hsn}
                            onChangeText={(val) => updateRevisionBOMRow(index, 'hsn', val)}
                          />
                          <TouchableOpacity
                            style={styles.bomTableDeleteBtn}
                            onPress={() => removeRevisionBOMRow(index)}
                          >
                            <Text style={styles.bomTableDeleteText}>❌</Text>
                          </TouchableOpacity>
                        </View>
                        {/* Stock badge per row */}
                        {stock && row.material_name.trim() !== '' && (
                          <View style={styles.bomTableStockBadge}>
                            {stock.in_stock ? (
                              <Text style={styles.bomTableStockGreen}>✓ In stock: {stock.available_quantity} {stock.unit}</Text>
                            ) : (
                              <Text style={styles.bomTableStockRed}>⚠️ Stock: 0 ({row.unit})</Text>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
              </ScrollView>

              {/* Add Row Button */}
              <TouchableOpacity style={styles.bomTableAddBtn} onPress={addRevisionBOMRow}>
                <Text style={styles.bomTableAddBtnText}>+ Add Row</Text>
              </TouchableOpacity>

              {/* Revision Notes */}
              <Text style={styles.sectionLabel}>Revision Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add notes about this revision..."
                value={revisionNotes}
                onChangeText={setRevisionNotes}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setRevisionModalVisible(false);
                    setRevisionSketchUrl('');
                    setRevisionSketchImage(null);
                    setRevisionNotes('');
                    setRevisionBOMRows([{ material_name: '', quantity: '', unit: 'pcs', hsn: '' }, { material_name: '', quantity: '', unit: 'pcs', hsn: '' }, { material_name: '', quantity: '', unit: 'pcs', hsn: '' }]);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleCreateRevision}
                >
                  <Text style={styles.saveButtonText}>Create Revision</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* View Revision Details Modal */}
      <Modal
        visible={revisionViewModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRevisionViewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Revision {selectedRevision?.revision_number}
            </Text>
            {selectedRevision && (
              <>
                <Text style={styles.modalSubtitle}>
                  Created: {new Date(selectedRevision.created_at).toLocaleString()}
                  {selectedRevision.created_by_name && `\nBy: ${selectedRevision.created_by_name}`}
                </Text>

                {selectedRevision.sketch_url ? (
                  <>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionLabel}>Sketch</Text>
                      {(user.role === 'npd' || user.role === 'management') && (
                        <TouchableOpacity
                          onPress={() => setRevisionSketchEditModalVisible(true)}
                        >
                          <Text style={styles.editLink}>Edit</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {(() => {
                      let imageUri = selectedRevision.sketch_url;
                      if (imageUri && !imageUri.startsWith('http://') && !imageUri.startsWith('https://') && !imageUri.startsWith('file://') && !imageUri.startsWith('content://')) {
                        const baseUrl = getApiUrl().replace('/api', '');
                        imageUri = `${baseUrl}${imageUri.startsWith('/') ? imageUri : '/' + imageUri}`;
                      }

                      return (
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.previewImage}
                          resizeMode="contain"
                          onError={(e) => console.log('Error loading revision sketch:', e.nativeEvent.error)}
                        />
                      );
                    })()}
                  </>
                ) : (
                  (user.role === 'npd' || user.role === 'management') && (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => setRevisionSketchEditModalVisible(true)}
                    >
                      <Text style={styles.addButtonText}>+ Add Sketch</Text>
                    </TouchableOpacity>
                  )
                )}

                {selectedRevision.notes && (
                  <>
                    <Text style={styles.sectionLabel}>Notes</Text>
                    <Text style={styles.revisionNotes}>{selectedRevision.notes}</Text>
                  </>
                )}

                {revisionBOMItems.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Bill of Materials</Text>
                    <ScrollView style={styles.revisionBOMList}>
                      {revisionBOMItems.map((item) => (
                        <View key={item.id} style={styles.revisionBOMItem}>
                          <View style={styles.revisionBOMHeader}>
                            <Text style={styles.revisionBOMSerial}>
                              #{item.serial_number}
                            </Text>
                            <Text style={styles.revisionBOMMaterial}>
                              {item.material_name}
                            </Text>
                          </View>
                          <Text style={styles.revisionBOMDetails}>
                            {item.quantity} {item.unit}
                            {item.hsn && ` • HSN: ${item.hsn}`}
                            {item.estimated_cost && ` • ₹${item.estimated_cost}`}
                          </Text>
                          {/* Stock Availability Indicator */}
                          <View style={[
                            styles.stockBadge,
                            item.in_stock ? styles.inStockBadge : styles.outOfStockBadge
                          ]}>
                            <Text style={[
                              styles.stockBadgeText,
                              item.in_stock ? styles.inStockText : styles.outOfStockText
                            ]}>
                              {item.in_stock
                                ? `✓ In Stock (${item.available_quantity} ${item.unit})`
                                : '⚠️ Out of Stock'}
                            </Text>
                          </View>
                          {item.supplier && (
                            <Text style={styles.revisionBOMSupplier}>
                              Supplier: {item.supplier}
                            </Text>
                          )}
                          {item.notes && (
                            <Text style={styles.revisionBOMNotes}>{item.notes}</Text>
                          )}
                        </View>
                      ))}
                    </ScrollView>
                  </>
                )}

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={() => setRevisionViewModalVisible(false)}
                >
                  <Text style={styles.saveButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Revision Sketch Edit Modal */}
      <Modal
        visible={revisionSketchEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRevisionSketchEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Revision Sketch</Text>

            <View style={styles.imageSourceButtons}>
              <TouchableOpacity
                style={styles.sourceButton}
                onPress={async () => {
                  const { status } = await ImagePicker.requestCameraPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert('Permission Needed', 'Please allow camera access.');
                    return;
                  }
                  const result = await ImagePicker.launchCameraAsync({
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                  });
                  if (!result.canceled && result.assets && result.assets.length > 0) {
                    setNewRevisionSketch(result.assets[0].uri);
                  }
                }}
              >
                <Text style={styles.sourceButtonText}>📷 Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sourceButton}
                onPress={async () => {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                  });
                  if (!result.canceled && result.assets && result.assets.length > 0) {
                    setNewRevisionSketch(result.assets[0].uri);
                  }
                }}
              >
                <Text style={styles.sourceButtonText}>🖼️ Gallery</Text>
              </TouchableOpacity>
            </View>

            {newRevisionSketch && (
              <Image source={{ uri: newRevisionSketch }} style={styles.previewImage} />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRevisionSketchEditModalVisible(false);
                  setNewRevisionSketch(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={async () => {
                  if (!newRevisionSketch) {
                    Alert.alert('Error', 'Please select an image');
                    return;
                  }

                  try {
                    let finalUrl = newRevisionSketch;
                    // Upload if local file
                    if (newRevisionSketch.startsWith('file://') || newRevisionSketch.startsWith('content://')) {
                      const formData = new FormData();
                      formData.append('sketch', {
                        uri: newRevisionSketch,
                        name: 'revision_sketch_update.jpg',
                        type: 'image/jpeg',
                      });
                      const uploadResponse = await projectsAPI.uploadSketch(formData);
                      finalUrl = uploadResponse.data.url;
                    }

                    await projectsAPI.updateRevision(project.id, selectedRevision.id, {
                      sketch_url: finalUrl
                    });

                    Alert.alert('Success', 'Revision sketch updated');
                    setRevisionSketchEditModalVisible(false);
                    setNewRevisionSketch(null);

                    // Refresh revision details
                    handleViewRevision(selectedRevision.id);
                  } catch (error) {
                    console.error('Error updating revision sketch:', error);
                    Alert.alert('Error', 'Failed to update sketch');
                  }
                }}
              >
                <Text style={styles.saveButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* HSN Code Modal for Project Completion */}
      <Modal
        visible={hsnModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHsnModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Project</Text>
            <Text style={styles.modalSubtitle}>
              Please enter the HSN Code for this product to add it to Sales Inventory.
            </Text>

            <Text style={styles.sectionLabel}>HSN Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter HSN Code"
              value={hsnCode}
              onChangeText={setHsnCode}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setHsnModalVisible(false);
                  setHsnCode('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleCompleteProject}
              >
                <Text style={styles.saveButtonText}>Complete & Add to Inventory</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Request Items Modal (Project Manager Only) */}
      {user.role === 'project_manager' && (
        <Modal
          visible={requestModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setRequestModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Request Items from Store</Text>
              <Text style={styles.modalSubtitle}>
                Select items from Bill of Materials to request
              </Text>

              <Text style={[styles.sectionLabel, { marginTop: 10 }]}>Select Worker to Collect Items *</Text>
              <View style={[styles.pickerContainer, { marginBottom: 15 }]}>
                <Picker
                  selectedValue={selectedWorkerForRequest}
                  onValueChange={(itemValue) => setSelectedWorkerForRequest(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Worker..." value="" />
                  {projectWorkers.length === 0 ? (
                    <Picker.Item label="No workers assigned to project" value="" />
                  ) : (
                    projectWorkers.map((worker) => (
                      <Picker.Item key={worker.worker_id} label={worker.name} value={worker.worker_id.toString()} />
                    ))
                  )}
                </Picker>
              </View>

              <ScrollView style={styles.requestItemsList}>
                {(latestRevision ? latestRevisionBOM : materials).length === 0 ? (
                  <Text style={styles.emptyText}>No items in BOM</Text>
                ) : (
                  (latestRevision ? latestRevisionBOM : materials).map((item) => {
                    const isSelected = selectedItems.some(si => si.id === item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.requestItemCard,
                          isSelected && styles.requestItemCardSelected
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedItems(selectedItems.filter(si => si.id !== item.id));
                          } else {
                            setSelectedItems([
                              ...selectedItems,
                              {
                                id: item.id,
                                material_name: item.material_name,
                                quantity: item.quantity,
                                unit: item.unit,
                                hsn: item.hsn,
                                selected: true
                              }
                            ]);
                          }
                        }}
                      >
                        <View style={styles.requestItemCheckbox}>
                          <Text style={styles.requestItemCheckboxText}>
                            {isSelected ? '✓' : ''}
                          </Text>
                        </View>
                        <View style={styles.requestItemInfo}>
                          <Text style={styles.requestItemName}>
                            #{item.serial_number || (materials.indexOf(item) + 1)} {item.material_name}
                          </Text>
                          <Text style={styles.requestItemDetails}>
                            {item.quantity} {item.unit}
                            {item.hsn && ` • HSN: ${item.hsn}`}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setRequestModalVisible(false);
                    setSelectedItems([]);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={async () => {
                    if (!selectedWorkerForRequest) {
                      Alert.alert('Error', 'Please select a worker who will collect the items');
                      return;
                    }

                    if (selectedItems.length === 0) {
                      Alert.alert('Error', 'Please select at least one item');
                      return;
                    }

                    try {
                      const items = selectedItems.map(item => ({
                        material_name: item.material_name,
                        quantity: parseFloat(item.quantity) || 0,
                        unit: item.unit,
                        hsn: item.hsn || null
                      }));

                      // Validate items
                      const invalidItems = items.filter(item => !item.material_name || !item.unit || item.quantity <= 0);
                      if (invalidItems.length > 0) {
                        Alert.alert('Error', 'Please ensure all items have valid name, quantity, and unit');
                        return;
                      }

                      await projectsAPI.createStoreRequest({
                        project_id: project.id,
                        requested_by: user.id,
                        items: items,
                        allocated_to_worker_id: selectedWorkerForRequest ? parseInt(selectedWorkerForRequest) : null
                      });

                      Alert.alert('Success', 'Request sent to store incharge successfully!');
                      setRequestModalVisible(false);
                      setSelectedItems([]);
                      fetchStoreRequests();
                    } catch (error) {
                      console.error('Error creating store request:', error);
                      Alert.alert('Error', error.response?.data?.error || 'Failed to send request');
                    }
                  }}
                >
                  <Text style={styles.saveButtonText}>Send Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Material Usage Modal - Send to Accounts */}
      {materialUsageModalVisible && (
        <Modal
          visible={materialUsageModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setMaterialUsageModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => {
                    setMaterialUsageModalVisible(false);
                    setUsedMaterials([]);
                    setSelectedAccountantId('');
                    setUsageNotes('');
                  }}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Send Used Materials to Accounts</Text>
                <View style={styles.placeholder} />
              </View>

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                <Text style={styles.modalSectionTitle}>Select Accountant:</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedAccountantId}
                    onValueChange={(value) => setSelectedAccountantId(value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Accountant" value="" />
                    {accountants.map((accountant) => (
                      <Picker.Item
                        key={accountant.id}
                        label={accountant.name}
                        value={accountant.id.toString()}
                      />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.modalSectionTitle}>Used Materials:</Text>
                <Text style={styles.modalHint}>
                  Enter the quantity used for each material
                </Text>

                {usedMaterials.map((material, index) => (
                  <View key={material.id || index} style={styles.usedMaterialCard}>
                    <View style={styles.usedMaterialHeader}>
                      <Text style={styles.usedMaterialName}>{material.material_name}</Text>
                      <Text style={styles.usedMaterialInfo}>
                        Available: {material.quantity} {material.unit}
                        {material.hsn && ` • HSN: ${material.hsn}`}
                      </Text>
                    </View>
                    <View style={styles.usedMaterialInputRow}>
                      <Text style={styles.usedMaterialLabel}>Quantity Used:</Text>
                      <TextInput
                        style={styles.usedMaterialInput}
                        placeholder={`0 ${material.unit}`}
                        value={material.used_quantity}
                        onChangeText={(text) => {
                          const updated = [...usedMaterials];
                          updated[index].used_quantity = text;
                          setUsedMaterials(updated);
                        }}
                        keyboardType="numeric"
                      />
                    </View>
                    {material.estimated_cost && (
                      <Text style={styles.usedMaterialCost}>
                        Estimated Cost: ₹{material.estimated_cost}
                      </Text>
                    )}
                  </View>
                ))}

                <Text style={styles.modalSectionTitle}>Notes (Optional):</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add any additional notes about material usage..."
                  value={usageNotes}
                  onChangeText={setUsageNotes}
                  multiline
                  numberOfLines={4}
                />
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setMaterialUsageModalVisible(false);
                    setUsedMaterials([]);
                    setSelectedAccountantId('');
                    setUsageNotes('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={async () => {
                    if (!selectedAccountantId) {
                      Alert.alert('Error', 'Please select an accountant');
                      return;
                    }

                    // Filter materials with used quantities
                    const materialsWithUsage = usedMaterials.filter(
                      m => m.used_quantity && parseFloat(m.used_quantity) > 0
                    );

                    if (materialsWithUsage.length === 0) {
                      Alert.alert('Error', 'Please enter quantities for at least one material');
                      return;
                    }

                    // Validate quantities
                    const invalidMaterials = materialsWithUsage.filter(m => {
                      const used = parseFloat(m.used_quantity) || 0;
                      const available = parseFloat(m.quantity) || 0;
                      return used > available;
                    });

                    if (invalidMaterials.length > 0) {
                      Alert.alert(
                        'Error',
                        `Used quantity cannot exceed available quantity for: ${invalidMaterials.map(m => m.material_name).join(', ')}`
                      );
                      return;
                    }

                    try {
                      const usageData = {
                        project_id: project.id,
                        project_name: project.name,
                        sent_by: user.id,
                        sent_by_name: user.name,
                        accountant_id: selectedAccountantId,
                        materials: materialsWithUsage.map(m => ({
                          material_name: m.material_name,
                          quantity_used: parseFloat(m.used_quantity),
                          unit: m.unit,
                          hsn: m.hsn || null,
                          estimated_cost: m.estimated_cost || null
                        })),
                        notes: usageNotes || null
                      };

                      await projectsAPI.sendMaterialUsageToAccounts(usageData);

                      Alert.alert('Success', 'Material usage report sent to accounts successfully!');
                      setMaterialUsageModalVisible(false);
                      setUsedMaterials([]);
                      setSelectedAccountantId('');
                      setUsageNotes('');
                    } catch (error) {
                      console.error('Error sending material usage:', error);
                      Alert.alert('Error', error.response?.data?.error || 'Failed to send material usage report');
                    }
                  }}
                >
                  <Text style={styles.saveButtonText}>Send to Accounts</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Job Work Modal */}
      {jobWorkModalVisible && (
        <Modal
          visible={jobWorkModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => {
            setJobWorkModalVisible(false);
            setSelectedNextPhase('');
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => {
                    setJobWorkModalVisible(false);
                    setJobWorkType('Laser Cutting');
                    setJobWorkPurpose('');
                    setLoadedWeight('');
                    setUnloadedWeight('');
                    setVehicleNo('');
                    setJobWorkImages([]);
                    setJobWorkItems([{ material_name: '', hsn: '', quantity: '', unit: 'pcs' }]);
                    setSelectedAccountantForJobWork('');
                    setSelectedNextPhase('');
                  }}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Job Work Details</Text>
                <View style={styles.placeholder} />
              </View>

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={{ paddingBottom: 35 }}
              >
                {/* 1. Job Work Type Dropdown */}
                <Text style={styles.modalSectionTitle}>Select Job Work Type *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={jobWorkType}
                    onValueChange={(value) => setJobWorkType(value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Laser Cutting" value="Laser Cutting" />
                    <Picker.Item label="Bending" value="Bending" />
                    <Picker.Item label="Powder Coating" value="Powder Coating" />
                    <Picker.Item label="Galvanizing" value="Galvanizing" />
                    <Picker.Item label="Others" value="Others" />
                  </Picker>
                </View>

                {/* Purpose if "Others" is selected */}
                {jobWorkType === 'Others' && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.modalSectionTitle}>Purpose for Job Work *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Mention the purpose..."
                      value={jobWorkPurpose}
                      onChangeText={setJobWorkPurpose}
                    />
                  </View>
                )}

                {/* 2. Upload Images of the Object */}
                <Text style={[styles.modalSectionTitle, { marginTop: 15 }]}>Upload Object Images (Multiple) *</Text>
                <TouchableOpacity style={styles.uploadBtn} onPress={pickJobWorkImages}>
                  <Text style={styles.uploadBtnText}>📸 Select Images</Text>
                </TouchableOpacity>
                
                {jobWorkImages.length > 0 && (
                  <View style={styles.imageGrid}>
                    {jobWorkImages.map((img, idx) => (
                      <View key={idx} style={styles.imagePreviewContainer}>
                        <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                        <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeJobWorkImage(idx)}>
                          <Text style={styles.removeImageText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* 3. Object Weight Details */}
                <Text style={[styles.modalSectionTitle, { marginTop: 15 }]}>Vehicle Weights (kg)</Text>
                <View style={styles.weightInputsContainer}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.inputSubLabel}>Loaded Vehicle Weight *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 5000"
                      keyboardType="numeric"
                      value={loadedWeight}
                      onChangeText={setLoadedWeight}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputSubLabel}>Unloaded Vehicle Weight *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 3500"
                      keyboardType="numeric"
                      value={unloadedWeight}
                      onChangeText={setUnloadedWeight}
                    />
                  </View>
                </View>

                <View style={styles.actualWeightDisplay}>
                  <Text style={styles.actualWeightLabel}>Calculated Actual Weight:</Text>
                  <Text style={styles.actualWeightValue}>
                    {Math.max(0, (parseFloat(loadedWeight) || 0) - (parseFloat(unloadedWeight) || 0))} kg
                  </Text>
                </View>

                {/* 3.5 Vehicle Number */}
                <Text style={[styles.modalSectionTitle, { marginTop: 15 }]}>Vehicle No.</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. MH-02-AB-1234"
                  value={vehicleNo}
                  onChangeText={setVehicleNo}
                  maxLength={20}
                />
                {/* 4. Materials Dispatch Details */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 }}>
                  <Text style={styles.modalSectionTitle}>Materials Loaded</Text>
                  <TouchableOpacity 
                    style={styles.addMaterialBtn}
                    onPress={() => setJobWorkItems(prev => [...prev, { material_name: '', hsn: '', quantity: '', unit: 'pcs' }])}
                  >
                    <Text style={styles.addMaterialText}>＋ Add Item</Text>
                  </TouchableOpacity>
                </View>

                {jobWorkItems.map((item, index) => (
                  <View key={index} style={styles.materialRow}>
                    <View style={{ flex: 2, marginRight: 8 }}>
                      <Text style={styles.inputSubLabel}>Material Name *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Material Name"
                        value={item.material_name}
                        onChangeText={(txt) => {
                          const updated = [...jobWorkItems];
                          updated[index].material_name = txt;
                          setJobWorkItems(updated);
                        }}
                      />
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inputSubLabel}>HSN</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="HSN"
                        value={item.hsn}
                        onChangeText={(txt) => {
                          const updated = [...jobWorkItems];
                          updated[index].hsn = txt;
                          setJobWorkItems(updated);
                        }}
                      />
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inputSubLabel}>Qty *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Qty"
                        keyboardType="numeric"
                        value={item.quantity}
                        onChangeText={(txt) => {
                          const updated = [...jobWorkItems];
                          updated[index].quantity = txt;
                          setJobWorkItems(updated);
                        }}
                      />
                    </View>
                    <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 5 }}>
                      {jobWorkItems.length > 1 && (
                        <TouchableOpacity 
                          style={styles.removeMaterialBtn}
                          onPress={() => setJobWorkItems(prev => prev.filter((_, i) => i !== index))}
                        >
                          <Text style={styles.removeMaterialText}>🗑️</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}

                {/* 5. Select Store Incharge & Accountant */}
                <Text style={[styles.modalSectionTitle, { marginTop: 20 }]}>Select Store Incharge *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedStoreInchargeForJobWork}
                    onValueChange={(value) => setSelectedStoreInchargeForJobWork(value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Store Incharge" value="" />
                    {storeInchargeUsers.map((user) => (
                      <Picker.Item
                        key={user.id}
                        label={user.name}
                        value={user.id.toString()}
                      />
                    ))}
                  </Picker>
                </View>

              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setJobWorkModalVisible(false);
                    setJobWorkType('Laser Cutting');
                    setJobWorkPurpose('');
                    setLoadedWeight('');
                    setUnloadedWeight('');
                    setJobWorkImages([]);
                    setJobWorkItems([{ material_name: '', hsn: '', quantity: '', unit: 'pcs' }]);
                    setSelectedStoreInchargeForJobWork('');
                    setSelectedNextPhase('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleJobWorkSubmit}
                >
                  <Text style={styles.saveButtonText}>Submit to Accounts</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#AF52DE',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 5,
  },
  backText: {
    color: 'white',
    fontSize: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  projectName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardHeaderButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  requestButton: {
    backgroundColor: '#34C759',
  },
  sendToAccountsButton: {
    backgroundColor: '#FF9500',
    marginLeft: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#AF52DE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
  },
  activeStatus: {
    borderWidth: 2,
    borderColor: '#333',
  },
  statusButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  imageContainer: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  sketchImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  imageErrorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  imageErrorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
    marginBottom: 10,
    textAlign: 'center',
  },
  imageErrorSubtext: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  materialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  materialSerial: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#AF52DE',
    marginRight: 8,
    minWidth: 30,
  },
  materialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  materialDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },

  deleteButton: {
    padding: 5,
  },
  deleteText: {
    fontSize: 20,
  },
  pmInfo: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#AF52DE',
  },
  pmLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  pmName: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  imageSourceButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  sourceButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  activeSource: {
    backgroundColor: '#AF52DE',
  },
  sourceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
    resizeMode: 'contain',
    backgroundColor: '#f0f0f0',
  },
  exampleText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    marginBottom: 12,
  },
  picker: {
    height: 50,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#AF52DE',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  // Revision styles
  revisionItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#AF52DE',
  },
  revisionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  revisionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  revisionDate: {
    fontSize: 12,
    color: '#666',
  },
  revisionBy: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  revisionNotes: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  revisionBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  revisionBadge: {
    backgroundColor: '#AF52DE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  revisionBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  editLink: {
    color: '#AF52DE',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  revisionBOMList: {
    maxHeight: 300,
    marginBottom: 12,
  },
  revisionBOMItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#AF52DE',
  },
  revisionBOMHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  revisionBOMSerial: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#AF52DE',
    marginRight: 8,
    minWidth: 30,
  },
  revisionBOMMaterial: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  revisionBOMDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  revisionBOMSupplier: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  revisionBOMNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  revisionInfoHeader: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  revisionInfoText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  materialSupplier: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
  materialNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  // Request Items Modal styles
  requestItemsList: {
    maxHeight: 300,
    marginBottom: 15,
  },
  requestItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  requestItemCardSelected: {
    borderColor: '#34C759',
    backgroundColor: '#f0f9f0',
  },
  requestItemCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#34C759',
    backgroundColor: 'white',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestItemCheckboxText: {
    color: '#34C759',
    fontWeight: 'bold',
    fontSize: 16,
  },
  requestItemInfo: {
    flex: 1,
  },
  requestItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  requestItemDetails: {
    fontSize: 14,
    color: '#666',
  },
  // Material Usage Modal styles
  usedMaterialCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  usedMaterialHeader: {
    marginBottom: 10,
  },
  usedMaterialName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  usedMaterialInfo: {
    fontSize: 13,
    color: '#666',
  },
  usedMaterialInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  usedMaterialLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
    flex: 1,
  },
  usedMaterialInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: 'white',
  },
  usedMaterialCost: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '600',
    marginTop: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: 'white',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  stockInfoContainer: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  stockInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  refreshStockButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  refreshStockButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  stockLoadingContainer: {
    padding: 10,
    alignItems: 'center',
  },
  stockLoadingText: {
    fontSize: 13,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  stockInfoList: {
    maxHeight: 150,
  },
  stockInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  stockMaterialName: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    marginRight: 10,
  },
  stockAvailable: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '600',
  },
  stockUnavailable: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600',
  },
  stockChecking: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  stockInfoHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
  stockErrorText: {
    fontSize: 12,
    color: '#FF3B30',
    textAlign: 'center',
    padding: 5,
    marginTop: 5,
  },
  stockBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  inStockBadge: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  outOfStockBadge: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inStockText: {
    color: '#34C759',
  },
  outOfStockText: {
    color: '#FF3B30',
  },
  completedContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  completedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 5,
  },
  completedSubtext: {
    fontSize: 14,
    color: '#666',
  },
  poViewButton: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginVertical: 10,
  },
  poViewButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // BOM Table styles
  bomTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#AF52DE',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  bomTableHeaderText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  bomTableScrollArea: {
    maxHeight: 300,
  },
  bomTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 3,
  },
  bomTableInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#fafafa',
  },
  bomTablePickerWrap: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
    justifyContent: 'center',
    height: 38,
  },
  bomTablePicker: {
    height: 38,
    marginTop: -4,
    marginBottom: -4,
  },
  bomTableDeleteBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bomTableDeleteText: {
    fontSize: 14,
  },
  bomTableAddBtn: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#34C759',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  bomTableAddBtnText: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: '700',
  },
  bomTableStockBadge: {
    marginLeft: 4,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bomTableStockGreen: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '600',
  },
  bomTableStockRed: {
    fontSize: 11,
    color: '#FF3B30',
    fontWeight: '600',
  },
  bomTableRefreshStock: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  bomTableRefreshStockText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
  },
  autocompleteWrapper: {
    position: 'relative',
    zIndex: 100,
  },
  suggestionDropdown: {
    position: 'absolute',
    top: 38,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 10,
  },
  suggestionItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  suggestionItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  suggestionItemMeta: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  workerNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  workerEmailText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  removeWorkerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  removeWorkerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addWorkerSection: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
    paddingTop: 15,
  },
  addWorkerLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  addWorkerBtn: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  addWorkerBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  storeReqItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  storeReqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storeReqDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  storeReqWorker: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  storeReqStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  storeReqStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  storeReqDetails: {
    marginTop: 10,
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
  },
  storeReqDetailsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 6,
  },
  storeReqDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  storeReqItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  storeReqItemQty: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
  },
  storeReqItemStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyTimelineContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  startProjectBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startProjectBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timelineList: {
    paddingLeft: 10,
    marginBottom: 20,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 70,
  },
  timelineLeftColumn: {
    alignItems: 'center',
    width: 30,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    zIndex: 2,
  },
  timelineDotPassed: {
    borderColor: '#34C759',
    backgroundColor: '#34C759',
  },
  timelineDotActive: {
    borderColor: '#007AFF',
  },
  timelineDotInnerActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 4,
  },
  timelineRightColumn: {
    flex: 1,
    paddingLeft: 15,
    paddingBottom: 20,
  },
  timelineStatusText: {
    fontSize: 16,
    fontWeight: '700',
  },
  timelineStatusTextActive: {
    color: '#007AFF',
  },
  timelineStatusTextPassed: {
    color: '#1C1C1E',
  },
  timelineTimeText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  timelineUserText: {
    fontSize: 12,
    color: '#3A3A3C',
    marginTop: 2,
    fontWeight: '500',
  },
  timelineNotesText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    fontStyle: 'italic',
  },
  nextPhaseContainer: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 15,
  },
  nextPhaseLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  nextPhaseBtn: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  nextPhaseBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timelineReportsContainer: {
    marginTop: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 8,
  },
  reportSlotRow: {
    marginVertical: 4,
  },
  reportActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E5E5EA',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  viewReportBtn: {
    flex: 1,
    marginRight: 8,
  },
  viewReportBtnText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  reuploadReportBtn: {
    backgroundColor: '#FF9500',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reuploadReportBtnText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  reportEmptyRow: {
    paddingVertical: 2,
  },
  uploadReportBtn: {
    backgroundColor: 'white',
    borderColor: '#007AFF',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  uploadReportBtnText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  noReportText: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  // --- JOB WORK MODAL STYLES ---
  uploadBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginVertical: 10,
  },
  uploadBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 10,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  weightInputsContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  inputSubLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 4,
  },
  actualWeightDisplay: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    marginVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actualWeightLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  actualWeightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  materialRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
  },
  addMaterialBtn: {
    backgroundColor: '#34C759',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addMaterialText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeMaterialBtn: {
    backgroundColor: '#FF3B30',
    borderRadius: 6,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMaterialText: {
    color: 'white',
    fontSize: 14,
  },
});
