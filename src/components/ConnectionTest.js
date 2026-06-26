import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import api from '../config/api';

export default function ConnectionTest() {
  const [status, setStatus] = useState('Testing...');
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      // Get the API URL
      const url = api.defaults.baseURL;
      setApiUrl(url);
      setStatus('Testing connection...');

      // Test the connection
      const response = await api.get('/companies');
      setStatus(`✅ Connected! Found ${response.data.companies.length} companies`);
    } catch (error) {
      setStatus(`❌ Connection failed: ${error.message}`);
      console.error('Connection test failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connection Status</Text>
      <Text style={styles.url}>API: {apiUrl}</Text>
      <Text style={styles.status}>{status}</Text>
      <TouchableOpacity style={styles.button} onPress={testConnection}>
        <Text style={styles.buttonText}>🔄 Test Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    margin: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  url: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  status: {
    fontSize: 14,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
