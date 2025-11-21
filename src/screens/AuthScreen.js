import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

const ROLES = [
  { label: 'Select Role', value: '' },
  { label: 'Management (Company)', value: 'management' },
  { label: 'Project Manager', value: 'project_manager' },
  { label: 'Accounts', value: 'accounts' },
  { label: 'Store Incharge', value: 'store_incharge' },
  { label: 'Worker', value: 'worker' },
  { label: 'Sales Executive', value: 'sales_executive' },
  { label: 'NPD', value: 'npd' },
];

export default function AuthScreen({ navigation }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: '',
    company_id: '',
    company_name: '',
    gst_number: '',
  });

  // Fetch companies when component mounts
  React.useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { companiesAPI } = require('../config/api');
      const response = await companiesAPI.getAll();
      setCompanies(response.data.companies);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.email || !formData.password || !formData.role) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!isLogin && !formData.name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);

    try {
      // Import authAPI
      const { authAPI } = require('../config/api');

      // Additional validation for non-management roles
      if (!isLogin && formData.role !== 'management' && !formData.company_id) {
        Alert.alert('Error', 'Please select a company');
        return;
      }

      // Additional validation for management role
      if (!isLogin && formData.role === 'management' && !formData.company_name) {
        Alert.alert('Error', 'Please enter company name');
        return;
      }

      if (isLogin) {
        // Login
        const response = await authAPI.login(
          formData.email,
          formData.password,
          formData.role
        );
        
        console.log('Login successful:', response.data);
        
        // Store token for future requests
        // TODO: await AsyncStorage.setItem('token', response.data.token);
        
        // Navigate to dashboard
        navigation.replace('Dashboard', { user: response.data.user });
        
      } else {
        // Signup
        const response = await authAPI.signup(
          formData.name,
          formData.email,
          formData.password,
          formData.role,
          formData.company_id,
          formData.company_name,
          formData.gst_number
        );
        
        console.log('Signup successful:', response.data);
        Alert.alert(
          'Success',
          `Account created successfully! Welcome, ${response.data.user.name}!`,
          [{ 
            text: 'OK', 
            onPress: () => {
              // Navigate to dashboard
              navigation.replace('Dashboard', { user: response.data.user });
            }
          }]
        );
      }
    } catch (error) {
      console.error('Auth error:', error);
      
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data.error || errorMessage;
      } else if (error.request) {
        // No response from server
        errorMessage = 'Cannot connect to server. Please check:\n\n1. Backend server is running\n2. Your IP address is correct in api.js\n3. Phone and computer are on same WiFi';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      role: '',
      company_id: '',
      company_name: '',
      gst_number: '',
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>GST Management</Text>
          <Text style={styles.subtitle}>{isLogin ? 'Login' : 'Sign Up'}</Text>

          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            secureTextEntry
          />

          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
              secureTextEntry
            />
          )}

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
              style={styles.picker}
            >
              {ROLES.map((role) => (
                <Picker.Item key={role.value} label={role.label} value={role.value} />
              ))}
            </Picker>
          </View>

          {!isLogin && formData.role === 'management' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Company Name"
                value={formData.company_name}
                onChangeText={(text) => setFormData({ ...formData, company_name: text })}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="GST Number (Optional)"
                value={formData.gst_number}
                onChangeText={(text) => setFormData({ ...formData, gst_number: text.toUpperCase() })}
                autoCapitalize="characters"
                maxLength={15}
              />
            </>
          )}

          {!isLogin && formData.role && formData.role !== 'management' && (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.company_id}
                onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                style={styles.picker}
              >
                <Picker.Item label="Select Company" value="" />
                {companies.map((company) => (
                  <Picker.Item 
                    key={company.id} 
                    label={company.name} 
                    value={company.id.toString()} 
                  />
                ))}
              </Picker>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleAuthMode} style={styles.toggleButton}>
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fafafa',
  },
  picker: {
    height: 50,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  toggleButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    color: '#007AFF',
    fontSize: 16,
  },
});
