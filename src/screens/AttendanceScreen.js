import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Platform
} from 'react-native';
import { attendanceAPI } from '../config/api';

export default function AttendanceScreen({ route, navigation }) {
  const { user } = route.params || {};
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (d) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return d.toLocaleDateString('en-IN', options);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return null;
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const fetchAttendance = useCallback(async () => {
    try {
      const dateStr = formatDate(selectedDate);
      const response = await attendanceAPI.getByCompany(user.company_id, dateStr);
      setAttendance(response.data.attendance || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendance([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.company_id, selectedDate]);

  useEffect(() => {
    setLoading(true);
    fetchAttendance();
  }, [fetchAttendance]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance();
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    // Don't go into the future
    if (newDate > new Date()) return;
    setSelectedDate(newDate);
  };

  const isToday = formatDate(selectedDate) === formatDate(new Date());

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'management': return '#007AFF';
      case 'accountant': return '#34C759';
      case 'store_incharge': return '#FF9500';
      case 'npd': return '#AF52DE';
      case 'project_manager': return '#5856D6';
      case 'worker': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'management': return 'Management';
      case 'accountant': return 'Accountant';
      case 'store_incharge': return 'Store Incharge';
      case 'npd': return 'NPD';
      case 'project_manager': return 'Project Manager';
      case 'worker': return 'Worker';
      default: return role;
    }
  };

  // Group attendance by employee
  const groupedAttendance = {};
  attendance.forEach((record) => {
    const userId = record.user_id;
    if (!groupedAttendance[userId]) {
      groupedAttendance[userId] = {
        name: record.employee_name,
        email: record.employee_email,
        role: record.employee_role,
        sessions: [],
      };
    }
    groupedAttendance[userId].sessions.push({
      login_time: record.login_time,
      logout_time: record.logout_time,
    });
  });

  const employees = Object.values(groupedAttendance);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Employee Attendance</Text>
          <Text style={styles.headerSubtitle}>{user?.company?.name || 'Your Company'}</Text>
        </View>
      </View>

      {/* Date Picker */}
      <View style={styles.datePickerContainer}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
          <Text style={styles.dateArrowText}>◀</Text>
        </TouchableOpacity>
        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>
          {isToday && <Text style={styles.todayBadge}>Today</Text>}
        </View>
        <TouchableOpacity
          onPress={() => changeDate(1)}
          style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
          disabled={isToday}
        >
          <Text style={[styles.dateArrowText, isToday && styles.dateArrowTextDisabled]}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{employees.length}</Text>
          <Text style={styles.summaryLabel}>Employees</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#34C759' }]}>
            {employees.filter(e => e.sessions.some(s => !s.logout_time)).length}
          </Text>
          <Text style={styles.summaryLabel}>Active Now</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#8E8E93' }]}>
            {employees.filter(e => e.sessions.every(s => s.logout_time)).length}
          </Text>
          <Text style={styles.summaryLabel}>Checked Out</Text>
        </View>
      </View>

      {/* Attendance List */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading attendance...</Text>
          </View>
        ) : employees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Attendance Records</Text>
            <Text style={styles.emptySubtitle}>
              No employees logged in on {formatDisplayDate(selectedDate)}
            </Text>
          </View>
        ) : (
          employees.map((employee, index) => {
            const isActive = employee.sessions.some(s => !s.logout_time);
            return (
              <View key={index} style={styles.employeeCard}>
                <View style={styles.employeeHeader}>
                  <View style={[styles.statusDot, isActive ? styles.statusActive : styles.statusInactive]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.employeeName}>{employee.name}</Text>
                    <Text style={styles.employeeEmail}>{employee.email}</Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(employee.role) }]}>
                    <Text style={styles.roleBadgeText}>{getRoleLabel(employee.role)}</Text>
                  </View>
                </View>

                {/* Sessions */}
                {employee.sessions.map((session, sIndex) => (
                  <View key={sIndex} style={styles.sessionRow}>
                    <View style={styles.sessionTime}>
                      <Text style={styles.sessionLabel}>Login</Text>
                      <Text style={styles.sessionValue}>{formatTime(session.login_time)}</Text>
                    </View>
                    <View style={styles.sessionArrow}>
                      <Text style={styles.sessionArrowText}>→</Text>
                    </View>
                    <View style={styles.sessionTime}>
                      <Text style={styles.sessionLabel}>Logout</Text>
                      {session.logout_time ? (
                        <Text style={styles.sessionValue}>{formatTime(session.logout_time)}</Text>
                      ) : (
                        <Text style={[styles.sessionValue, styles.activeText]}>🟢 Active</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backBtnText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: -10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateArrowDisabled: {
    backgroundColor: '#E5E5EA',
  },
  dateArrowText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateArrowTextDisabled: {
    color: '#C7C7CC',
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  todayBadge: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 2,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 12,
    color: '#8E8E93',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  employeeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusActive: {
    backgroundColor: '#34C759',
  },
  statusInactive: {
    backgroundColor: '#C7C7CC',
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  employeeEmail: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  sessionTime: {
    flex: 1,
    alignItems: 'center',
  },
  sessionLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 2,
  },
  sessionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  activeText: {
    color: '#34C759',
  },
  sessionArrow: {
    paddingHorizontal: 8,
  },
  sessionArrowText: {
    fontSize: 16,
    color: '#C7C7CC',
  },
});
