import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    TextInput,
    ActivityIndicator,
    Platform
} from 'react-native';
import { projectsAPI } from '../config/api';
import Footer from '../components/Footer';

export default function ProjectListScreen({ route, navigation }) {
    const { user } = route.params;
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('regular');

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            let response;
            if (user.role === 'npd') {
                response = await projectsAPI.getNPDProjects(user.id);
            } else if (user.role === 'management') {
                response = await projectsAPI.getByCompany(user.company_id);
            } else if (user.role === 'project_manager') {
                response = await projectsAPI.getMyProjects(user.id);
            } else {
                response = await projectsAPI.getByCompany(user.company_id);
            }

            const projectList = response.data.projects || [];
            setProjects(projectList);
            applyFilters(projectList, searchQuery, activeTab);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchProjects();
    };

    const getProjectType = (project) => project.project_type || 'regular';

    const applyFilters = (projectList, query, tab) => {
        const filtered = projectList.filter(project => {
            const matchesTab = tab === 'external_job_work'
                ? getProjectType(project) === 'external_job_work'
                : getProjectType(project) !== 'external_job_work';

            const normalizedQuery = query.trim().toLowerCase();
            const matchesSearch = !normalizedQuery ||
                project.name.toLowerCase().includes(normalizedQuery) ||
                (project.po_number && project.po_number.toLowerCase().includes(normalizedQuery));

            return matchesTab && matchesSearch;
        });
        setFilteredProjects(filtered);
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        applyFilters(projects, query, activeTab);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        applyFilters(projects, searchQuery, tab);
    };

    const regularProjectsCount = projects.filter(project => getProjectType(project) !== 'external_job_work').length;
    const externalJobWorkCount = projects.filter(project => getProjectType(project) === 'external_job_work').length;

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

    const renderProjectItem = ({ item }) => (
        <TouchableOpacity
            style={styles.projectCard}
            onPress={() => navigation.navigate('ProjectDetails', { project: item, user })}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.projectName}>{item.name}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                    <Text style={styles.badgeText}>{item.priority?.toUpperCase()}</Text>
                </View>
            </View>

            {item.po_number && (
                <Text style={styles.poNumber}>PO: {item.po_number}</Text>
            )}

            {getProjectType(item) === 'external_job_work' && (
                <Text style={styles.typeText}>External Job Work</Text>
            )}

            <View style={styles.cardFooter}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.badgeText}>{item.status?.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <Text style={styles.dateText}>
                    {new Date(item.created_at).toLocaleDateString()}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Projects</Text>
                <View style={{ width: 60 }} />
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or PO number..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'regular' && styles.activeTabButton]}
                    onPress={() => handleTabChange('regular')}
                >
                    <Text style={[styles.tabText, activeTab === 'regular' && styles.activeTabText]}>
                        Projects ({regularProjectsCount})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'external_job_work' && styles.activeTabButton]}
                    onPress={() => handleTabChange('external_job_work')}
                >
                    <Text style={[styles.tabText, activeTab === 'external_job_work' && styles.activeTabText]}>
                        External Job Work ({externalJobWorkCount})
                    </Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : (
                <FlatList
                    data={filteredProjects}
                    renderItem={renderProjectItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No projects found</Text>
                        </View>
                    }
                />
            )}
            <Footer />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        backgroundColor: '#FFF',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    backButton: {
        padding: 5,
    },
    backButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    searchContainer: {
        padding: 15,
        backgroundColor: '#FFF',
    },
    searchInput: {
        backgroundColor: '#F1F3F5',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 8,
        fontSize: 16,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        paddingHorizontal: 15,
        paddingBottom: 12,
        gap: 10,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: '#F1F3F5',
        alignItems: 'center',
    },
    activeTabButton: {
        backgroundColor: '#007AFF',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#555',
        textAlign: 'center',
    },
    activeTabText: {
        color: '#FFF',
    },
    listContainer: {
        padding: 15,
        paddingBottom: 100,
    },
    projectCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    projectName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    poNumber: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    typeText: {
        fontSize: 12,
        color: '#6F42C1',
        fontWeight: '700',
        marginBottom: 10,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    dateText: {
        fontSize: 12,
        color: '#999',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 50,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
});
