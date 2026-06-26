import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { projectsAPI } from '../config/api';

export default function ProjectMaterialUsageScreen({ route, navigation }) {
  const { user } = route.params;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchReports();
    }, [])
  );

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getMaterialUsageReports(user.id);
      setReports(response.data.reports || []);
    } catch (error) {
      console.error('Error fetching material usage reports:', error);
      Alert.alert('Error', 'Failed to load material usage reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#34C759';
      case 'fulfilled': return '#34C759';
      case 'rejected': return '#FF3B30';
      case 'reviewed': return '#007AFF';
      case 'partially_allocated': return '#007AFF';
      case 'pending': return '#FF9500';
      default: return '#8E8E93';
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
  };

  const handleCloseDetails = () => {
    setSelectedReport(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Material Usage</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#FF9500" />
            <Text style={styles.emptyText}>Loading reports...</Text>
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No material usage reports yet</Text>
            <Text style={styles.emptySubtext}>Reports from Project Managers will appear here</Text>
          </View>
        ) : (
          reports.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={styles.reportCard}
              onPress={() => handleViewReport(report)}
            >
              <View style={styles.reportHeader}>
                <View style={styles.reportTitleRow}>
                  <Text style={styles.reportProjectName}>{report.project_name || 'N/A'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                    <Text style={styles.statusText}>{report.status}</Text>
                  </View>
                </View>
                <Text style={styles.reportFrom}>
                  From: {report.sent_by_name || 'Project Manager'}
                </Text>
              </View>

              <View style={styles.reportSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Materials:</Text>
                  <Text style={styles.summaryValue}>
                    {Array.isArray(report.materials) ? report.materials.length : 0} items
                  </Text>
                </View>
                {report.totals && (
                  <>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Base Price:</Text>
                      <Text style={styles.summaryValue}>{formatCurrency(report.totals.base_price)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>GST ({report.materials?.[0]?.gst_rate || 18}%):</Text>
                      <Text style={styles.summaryValue}>{formatCurrency(report.totals.gst_amount)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, styles.totalLabel]}>Total:</Text>
                      <Text style={[styles.summaryValue, styles.totalValue]}>
                        {formatCurrency(report.totals.total_price)}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              <Text style={styles.reportDate}>
                {new Date(report.created_at).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Report Details Modal */}
      {selectedReport && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Material Usage Details</Text>
              <TouchableOpacity onPress={handleCloseDetails}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Project:</Text>
                <Text style={styles.detailValue}>{selectedReport.project_name || 'N/A'}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>From:</Text>
                <Text style={styles.detailValue}>{selectedReport.sent_by_name || 'Project Manager'}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedReport.status) }]}>
                  <Text style={styles.statusText}>{selectedReport.status}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedReport.created_at).toLocaleString()}
                </Text>
              </View>

              {selectedReport.notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Notes:</Text>
                  <Text style={styles.detailValue}>{selectedReport.notes}</Text>
                </View>
              )}

              <Text style={styles.materialsTitle}>Materials Used:</Text>
              {Array.isArray(selectedReport.materials) && selectedReport.materials.map((material, index) => (
                <View key={index} style={styles.materialCard}>
                  <Text style={styles.materialName}>{material.material_name}</Text>
                  <View style={styles.materialDetails}>
                    <Text style={styles.materialDetail}>
                      Quantity: {material.quantity_used} {material.unit}
                    </Text>
                    {material.hsn && (
                      <Text style={styles.materialDetail}>HSN: {material.hsn}</Text>
                    )}
                    {material.unit_price !== undefined && (
                      <>
                        <Text style={styles.materialDetail}>
                          Unit Price: {formatCurrency(material.unit_price)}
                        </Text>
                        <Text style={styles.materialDetail}>
                          Base Price: {formatCurrency(material.base_price)}
                        </Text>
                        <Text style={styles.materialDetail}>
                          GST ({material.gst_rate || 18}%): {formatCurrency(material.gst_amount)}
                        </Text>
                        <Text style={[styles.materialDetail, styles.materialTotal]}>
                          Total: {formatCurrency(material.total_price)}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              ))}

              {selectedReport.totals && (
                <View style={styles.totalsCard}>
                  <Text style={styles.totalsTitle}>Summary</Text>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Base Price:</Text>
                    <Text style={styles.totalsValue}>
                      {formatCurrency(selectedReport.totals.base_price)}
                    </Text>
                  </View>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>GST Amount:</Text>
                    <Text style={styles.totalsValue}>
                      {formatCurrency(selectedReport.totals.gst_amount)}
                    </Text>
                  </View>
                  <View style={[styles.totalsRow, styles.totalsRowFinal]}>
                    <Text style={[styles.totalsLabel, styles.totalsLabelFinal]}>Grand Total:</Text>
                    <Text style={[styles.totalsValue, styles.totalsValueFinal]}>
                      {formatCurrency(selectedReport.totals.total_price)}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.closeButton} onPress={handleCloseDetails}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF9500',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  reportCard: {
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
  reportHeader: {
    marginBottom: 10,
  },
  reportTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reportProjectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  reportFrom: {
    fontSize: 13,
    color: '#666',
    marginTop: 5,
  },
  reportSummary: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalLabel: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  totalValue: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#FF9500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  reportDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 10,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  modalBody: {
    maxHeight: 500,
  },
  detailSection: {
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  materialsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  materialCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  materialName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  materialDetails: {
    gap: 5,
  },
  materialDetail: {
    fontSize: 14,
    color: '#666',
  },
  materialTotal: {
    fontWeight: 'bold',
    color: '#FF9500',
    marginTop: 5,
  },
  totalsCard: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
  },
  totalsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalsRowFinal: {
    borderTopWidth: 2,
    borderTopColor: '#FF9500',
    paddingTop: 10,
    marginTop: 10,
  },
  totalsLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalsLabelFinal: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  totalsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalsValueFinal: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#FF9500',
  },
  modalFooter: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  closeButton: {
    backgroundColor: '#FF9500',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});



