import React, { useState, useEffect } from 'react';
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
  Modal,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Footer from '../components/Footer';

const { width, height } = Dimensions.get('window');

const ROLES = [
  { label: 'Select Role', value: '' },
  { label: 'Management (Company)', value: 'management' },
  { label: 'Accountant', value: 'accountant' },
  { label: 'Store Incharge', value: 'store_incharge' },
  { label: 'NPD', value: 'npd' },
  { label: 'Project Manager', value: 'project_manager' },
  { label: 'Worker', value: 'worker' },
];

export default function AuthScreen({ navigation }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [gstinModalVisible, setGstinModalVisible] = useState(false);
  const [gstinInput, setGstinInput] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [updatingGstin, setUpdatingGstin] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: '', // Empty by default, user must select
    company_name: '',
    new_company_name: '',
    gst_number: '',
  });

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];
  const rotateAnim = useState(new Animated.Value(0))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];
  const floatAnim1 = useState(new Animated.Value(0))[0];
  const floatAnim2 = useState(new Animated.Value(0))[0];
  const floatAnim3 = useState(new Animated.Value(0))[0];
  const shimmerAnim = useState(new Animated.Value(0))[0];
  const glowAnim = useState(new Animated.Value(0))[0];
  const waveAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Main animations on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating animations for circles
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim1, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim2, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim3, {
          toValue: 1,
          duration: 3500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim3, {
          toValue: 0,
          duration: 3500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shimmer effect
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Wave animation
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const float1Y = floatAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const float2Y = floatAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -25],
  });

  const float3Y = floatAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const waveTranslate = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 360],
  });

  // Fetch companies when component mounts
  React.useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { companiesAPI } = require('../config/api');
      const response = await companiesAPI.getAll();
      setCompanies(response.data.companies || []);
    } catch (error) {
      console.log('⚠️ Could not fetch companies. This is normal if no companies exist yet.');
      // Set empty array so the app doesn't crash
      setCompanies([]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.email || !formData.password) {
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

    if (!isLogin && !formData.role) {
      Alert.alert('Error', 'Please select a role');
      return;
    }

    // Additional validation for company name during signup
    if (!isLogin && !formData.company_name) {
      Alert.alert('Error', 'Please select a company');
      return;
    }

    // Additional validation when creating new company
    if (!isLogin && formData.company_name === '__CREATE_NEW__' && !formData.new_company_name) {
      Alert.alert('Error', 'Please enter new company name');
      return;
    }

    setLoading(true);

    try {
      // Import authAPI
      const { authAPI } = require('../config/api');

      if (isLogin) {
        // Login
        const response = await authAPI.login(
          formData.email,
          formData.password
        );

        console.log('Login successful:', response.data);

        // Store token for future requests
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));

        // Navigate to dashboard
        navigation.replace('Dashboard', { user: response.data.user });

      } else {
        // Signup
        // Determine the actual company name to send
        const actualCompanyName = formData.company_name === '__CREATE_NEW__'
          ? formData.new_company_name
          : formData.company_name;

        const response = await authAPI.signup(
          formData.name,
          formData.email,
          formData.password,
          formData.role,
          actualCompanyName,
          formData.gst_number
        );

        console.log('Signup successful:', response.data);

        // Check if employee signup (pending approval)
        if (response.data.pending_approval) {
          Alert.alert(
            'Account Created',
            response.data.message || 'Your account has been created and is waiting for management approval. You will be notified once approved.',
            [{
              text: 'OK',
              onPress: () => {
                setIsLogin(true);
                setFormData({
                  email: '',
                  password: '',
                  confirmPassword: '',
                  name: '',
                  role: '',
                  company_name: '',
                  new_company_name: '',
                  gst_number: '',
                });
              },
            }]
          );
        } else {
          // Management signup - auto-approved
          Alert.alert(
            'Success',
            `Account created successfully! Welcome, ${response.data.user.name}!`,
            [{
              text: 'OK',
              onPress: () => {
                // Navigate to dashboard
                navigation.replace('Dashboard', { user: response.data.user });
              },
            }]
          );
        }
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

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setSendingReset(true);
    try {
      const { authAPI } = require('../config/api');
      await authAPI.forgotPassword(resetEmail);

      Alert.alert(
        'Email Sent',
        'If an account with that email exists, a password reset link has been sent. Please check your email.',
        [{
          text: 'OK',
          onPress: () => {
            setForgotPasswordModalVisible(false);
            setResetEmail('');
          }
        }]
      );
    } catch (error) {
      console.error('Forgot password error:', error);
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    } finally {
      setSendingReset(false);
    }
  };

  const handleUpdateGSTIN = async () => {
    if (!gstinInput.trim()) {
      Alert.alert('Error', 'Please enter GSTIN number');
      return;
    }

    // Validate GSTIN format (15 characters)
    if (gstinInput.trim().length !== 15) {
      Alert.alert('Error', 'GSTIN must be exactly 15 characters');
      return;
    }

    setUpdatingGstin(true);
    try {
      const { authAPI } = require('../config/api');
      const response = await authAPI.updateGSTIN(pendingUser.id, gstinInput.trim().toUpperCase());

      // Store token for future requests
      // TODO: await AsyncStorage.setItem('token', response.data.token);

      Alert.alert('Success', 'GSTIN updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setGstinModalVisible(false);
            setGstinInput('');
            // Navigate to dashboard with updated user
            navigation.replace('Dashboard', {
              user: response.data.user
            });
          }
        }
      ]);
    } catch (error) {
      console.error('Error updating GSTIN:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update GSTIN');
    } finally {
      setUpdatingGstin(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      role: 'management',
      company_name: '__CREATE_NEW__',
      new_company_name: '',
      gst_number: '',
    });
  };

  const handleLoginPress = () => {
    setIsLogin(true);
    setShowAuthForm(true);
  };

  const handleSignUpPress = () => {
    setIsLogin(false);
    setShowAuthForm(true);
  };

  const handleBackToLanding = () => {
    setShowAuthForm(false);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      role: 'management',
      company_name: '__CREATE_NEW__',
      new_company_name: '',
      gst_number: '',
    });
  };

  // If showing auth form, render the form
  if (showAuthForm) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContentForm}
          showsVerticalScrollIndicator={false}
        >
          {/* Animated Background */}
          <View style={styles.formBackground}>
            <Animated.View
              style={[
                styles.gradientCircle1,
                {
                  transform: [
                    { translateY: float1Y },
                    { rotate: rotateInterpolate },
                  ],
                  opacity: glowOpacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.gradientCircle2,
                {
                  transform: [
                    { translateY: float2Y },
                    { rotate: rotateInterpolate },
                  ],
                  opacity: glowOpacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.gradientCircle3,
                {
                  transform: [
                    { translateY: float3Y },
                    { rotate: rotateInterpolate },
                  ],
                },
              ]}
            />
          </View>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.formBackButton}
            onPress={handleBackToLanding}
            activeOpacity={0.7}
          >
            <View style={styles.formBackButtonContainer}>
              <Text style={styles.formBackButtonText}>←</Text>
              <Text style={styles.formBackButtonLabel}>Back</Text>
            </View>
          </TouchableOpacity>

          {/* Logo Section */}
          <Animated.View
            style={[
              styles.formLogoContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.formLogoCircle}>
              <Animated.View
                style={[
                  styles.logoGlow,
                  {
                    opacity: glowOpacity,
                  },
                ]}
              />
              <View style={styles.formLogoInnerCircle}>
                <Image
                  source={require('../../assets/SVCE-LOGO.jpg')}
                  style={styles.formLogoImage}
                  resizeMode="contain"
                />
              </View>
              <Animated.View
                style={[
                  styles.logoRing,
                  {
                    transform: [{ rotate: rotateInterpolate }],
                  },
                ]}
              />
            </View>
          </Animated.View>

          {/* Auth Form Section */}
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>{isLogin ? 'Welcome Back' : 'Get Started'}</Text>
              <View style={styles.formTitleUnderline} />
              <Text style={styles.formSubtitle}>
                {isLogin ? 'Sign in to continue to your dashboard' : 'Create your account to begin'}
              </Text>
            </View>

            {!isLogin && (
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#94A3B8"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                autoCapitalize="words"
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#94A3B8"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#94A3B8"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry
            />

            {isLogin && (
              <TouchableOpacity
                onPress={() => setForgotPasswordModalVisible(true)}
                style={{ alignSelf: 'flex-end', marginTop: -8, marginBottom: 8 }}
              >
                <Text style={{ color: '#667eea', fontSize: 14, fontWeight: '600' }}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            )}

            {!isLogin && (
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#94A3B8"
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                secureTextEntry
              />
            )}

            {!isLogin && (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.role}
                  onValueChange={(value) => {
                    setFormData({
                      ...formData,
                      role: value,
                      company_name: value === 'management' ? '__CREATE_NEW__' : '',
                      new_company_name: '',
                      gst_number: ''
                    });
                  }}
                  style={styles.picker}
                >
                  {ROLES.map((role) => (
                    <Picker.Item key={role.value} label={role.label} value={role.value} />
                  ))}
                </Picker>
              </View>
            )}

            {!isLogin && formData.role && (
              <>
                {/* Company Dropdown for non-management roles only */}
                {formData.role !== 'management' && (
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.company_name}
                      onValueChange={(value) => setFormData({ ...formData, company_name: value })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Company" value="" />
                      {companies.map((company) => (
                        <Picker.Item key={company.id} label={company.name} value={company.name} />
                      ))}
                    </Picker>
                  </View>
                )}

                {/* Direct inputs for Management (Always creates new) */}
                {formData.role === 'management' && (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Company Name"
                      placeholderTextColor="#94A3B8"
                      value={formData.new_company_name || ''}
                      onChangeText={(text) => setFormData({ ...formData, new_company_name: text })}
                      autoCapitalize="words"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="GST Number (Optional)"
                      placeholderTextColor="#94A3B8"
                      value={formData.gst_number}
                      onChangeText={(text) => setFormData({ ...formData, gst_number: text.toUpperCase() })}
                      autoCapitalize="characters"
                      maxLength={15}
                    />
                  </>
                )}
              </>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.buttonText}>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              onPress={toggleAuthMode}
              style={styles.toggleButton}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleText}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.toggleTextBold}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* Forgot Password Modal */}
        <Modal
          visible={forgotPasswordModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setForgotPasswordModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <Text style={styles.modalSubtitle}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#94A3B8"
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#E2E8F0', marginRight: 10 }]}
                  onPress={() => {
                    setForgotPasswordModalVisible(false);
                    setResetEmail('');
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: '#1E293B' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={handleForgotPassword}
                  disabled={sendingReset}
                >
                  {sendingReset ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.modalButtonText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* GSTIN Collection Modal for Existing Vendors */}
        <Modal
          visible={gstinModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => { }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>GSTIN Required</Text>
              <Text style={styles.modalSubtitle}>
                Please provide your GSTIN number to continue. This is required for vendor accounts.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter GSTIN Number (15 characters)"
                placeholderTextColor="#94A3B8"
                value={gstinInput}
                onChangeText={(text) => setGstinInput(text.toUpperCase().trim())}
                autoCapitalize="characters"
                maxLength={15}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={handleUpdateGSTIN}
                  disabled={updatingGstin}
                >
                  {updatingGstin ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.modalButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <Footer />
      </KeyboardAvoidingView>
    );
  }

  // Landing Screen
  return (
    <ScrollView
      style={styles.landingContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.landingScrollContent}
    >
      {/* Hero Landing Section */}
      <Animated.View
        style={[
          styles.heroSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.heroBackground}>
          {/* Animated gradient circles */}
          <Animated.View
            style={[
              styles.gradientCircle1,
              {
                transform: [
                  { translateY: float1Y },
                  { rotate: rotateInterpolate },
                ],
                opacity: glowOpacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.gradientCircle2,
              {
                transform: [
                  { translateY: float2Y },
                  { rotate: rotateInterpolate },
                ],
                opacity: glowOpacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.gradientCircle3,
              {
                transform: [
                  { translateY: float3Y },
                  { rotate: rotateInterpolate },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.gradientCircle4,
              {
                transform: [
                  { translateY: float1Y },
                  { rotate: rotateInterpolate },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.gradientCircle5,
              {
                transform: [
                  { translateY: float2Y },
                  { rotate: rotateInterpolate },
                ],
              },
            ]}
          />

          {/* Grid pattern overlay */}
          <View style={styles.gridOverlay} />

          {/* Glowing particles */}
          <View style={styles.particleContainer}>
            <Animated.View
              style={[
                styles.particle,
                styles.particle1,
                {
                  transform: [
                    { translateY: float1Y },
                    { rotate: rotateInterpolate },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.particle,
                styles.particle2,
                {
                  transform: [
                    { translateY: float2Y },
                    { rotate: rotateInterpolate },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.particle,
                styles.particle3,
                {
                  transform: [
                    { translateY: float3Y },
                    { rotate: rotateInterpolate },
                  ],
                },
              ]}
            />
          </View>
        </View>

        <Animated.View
          style={[
            styles.heroContent,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={styles.logoCircle}>
              <Animated.View
                style={[
                  styles.logoGlow,
                  {
                    opacity: glowOpacity,
                  },
                ]}
              />
              <View style={styles.logoInnerCircle}>
                <Image
                  source={require('../../assets/SVCE-LOGO.jpg')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Animated.View
                style={[
                  styles.logoRing,
                  {
                    transform: [{ rotate: rotateInterpolate }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.logoRing2,
                  {
                    transform: [{ rotate: rotateInterpolate }],
                  },
                ]}
              />
            </View>
          </Animated.View>

          <View style={styles.titleContainer}>
            <Text style={styles.heroTitle}>GST Management</Text>
            <View style={styles.titleUnderline} />
          </View>
          <Text style={styles.heroSubtitle}>
            Streamline your business operations with intelligent GST tracking and inventory management
          </Text>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✨ Premium</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🚀 Fast</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🔐 Secure</Text>
            </View>
          </View>

          {/* Stats Section */}
          <Animated.View
            style={[
              styles.statsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.statCard,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>✓</Text>
              </View>
              <Text style={styles.statNumber}>100%</Text>
              <Text style={styles.statLabel}>Compliant</Text>
            </Animated.View>
            <Animated.View
              style={[
                styles.statCard,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>🕐</Text>
              </View>
              <Text style={styles.statNumber}>24/7</Text>
              <Text style={styles.statLabel}>Support</Text>
            </Animated.View>
            <Animated.View
              style={[
                styles.statCard,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>⚡</Text>
              </View>
              <Text style={styles.statNumber}>99.9%</Text>
              <Text style={styles.statLabel}>Uptime</Text>
            </Animated.View>
          </Animated.View>

          <View style={styles.featureGrid}>
            <View style={styles.featureItem}>
              <Animated.View
                style={[
                  styles.featureIconContainer,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <Text style={styles.featureIcon}>📊</Text>
              </Animated.View>
              <Text style={styles.featureText}>Real-time Tracking</Text>
              <Text style={styles.featureDescription}>Live updates on all transactions</Text>
            </View>
            <View style={styles.featureItem}>
              <Animated.View
                style={[
                  styles.featureIconContainer,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <Text style={styles.featureIcon}>🔒</Text>
              </Animated.View>
              <Text style={styles.featureText}>Secure & Reliable</Text>
              <Text style={styles.featureDescription}>Bank-level encryption</Text>
            </View>
            <View style={styles.featureItem}>
              <Animated.View
                style={[
                  styles.featureIconContainer,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <Text style={styles.featureIcon}>⚡</Text>
              </Animated.View>
              <Text style={styles.featureText}>Fast & Efficient</Text>
              <Text style={styles.featureDescription}>Lightning-fast processing</Text>
            </View>
          </View>
        </Animated.View>
      </Animated.View>

      {/* Features Section as Tiles */}
      <View style={styles.featuresSection}>
        <View style={styles.benefitsGrid}>
          <View style={styles.benefitTile}>
            <View style={styles.benefitIconTile}>
              <Text style={styles.benefitIconText}>📋</Text>
            </View>
            <Text style={styles.benefitTitle}>Automated GST Filing</Text>
            <Text style={styles.benefitDescription}>
              Save hours with automated GST return filing and compliance management
            </Text>
          </View>

          <View style={styles.benefitTile}>
            <View style={styles.benefitIconTile}>
              <Text style={styles.benefitIconText}>📦</Text>
            </View>
            <Text style={styles.benefitTitle}>Inventory Management</Text>
            <Text style={styles.benefitDescription}>
              Complete inventory tracking with QR codes and real-time stock updates
            </Text>
          </View>

          <View style={styles.benefitTile}>
            <View style={styles.benefitIconTile}>
              <Text style={styles.benefitIconText}>👥</Text>
            </View>
            <Text style={styles.benefitTitle}>Multi-User Access</Text>
            <Text style={styles.benefitDescription}>
              Role-based access for management, accounts, store incharge, and more
            </Text>
          </View>

          <View style={styles.benefitTile}>
            <View style={styles.benefitIconTile}>
              <Text style={styles.benefitIconText}>📊</Text>
            </View>
            <Text style={styles.benefitTitle}>Comprehensive Reports</Text>
            <Text style={styles.benefitDescription}>
              Generate detailed GST reports, financial statements, and analytics
            </Text>
          </View>
        </View>
      </View>

      {/* Trust Indicators */}
      <View style={styles.trustSection}>
        <Text style={styles.trustTitle}>Trusted by Businesses</Text>
        <View style={styles.trustBadges}>
          <View style={styles.trustBadge}>
            <Text style={styles.trustBadgeIcon}>🏆</Text>
            <Text style={styles.trustBadgeText}>Industry Leader</Text>
          </View>
          <View style={styles.trustBadge}>
            <Text style={styles.trustBadgeIcon}>🔐</Text>
            <Text style={styles.trustBadgeText}>GDPR Compliant</Text>
          </View>
          <View style={styles.trustBadge}>
            <Text style={styles.trustBadgeIcon}>⭐</Text>
            <Text style={styles.trustBadgeText}>5-Star Rated</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons at Bottom */}
      <View style={styles.actionButtonsContainer}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <TouchableOpacity
            style={[styles.actionButton, styles.loginButton]}
            onPress={handleLoginPress}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Sign In</Text>
            <Text style={styles.actionButtonSubtext}>Access your dashboard</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <TouchableOpacity
            style={[styles.actionButton, styles.signUpButton]}
            onPress={handleSignUpPress}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionButtonText, styles.signUpButtonText]}>Create Account</Text>
            <Text style={[styles.actionButtonSubtext, styles.signUpButtonSubtext]}>Start your free trial</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  landingContainer: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  landingScrollContent: {
    flexGrow: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  scrollContentForm: {
    flexGrow: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    position: 'relative',
  },
  formBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  formBackButton: {
    marginBottom: 20,
    padding: 12,
    alignSelf: 'flex-start',
    zIndex: 10,
  },
  formBackButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  formBackButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  formBackButtonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  formLogoContainer: {
    alignItems: 'center',
    marginBottom: 32,
    zIndex: 5,
  },
  formLogoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  formLogoInnerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    zIndex: 2,
    overflow: 'hidden',
  },
  formLogoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  // Hero Section Styles
  heroSection: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  gradientCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#1E3A8A',
    opacity: 0.3,
    top: -100,
    right: -50,
    transform: [{ scale: 1.2 }],
  },
  gradientCircle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#3B82F6',
    opacity: 0.2,
    bottom: -50,
    left: -50,
    transform: [{ scale: 1.3 }],
  },
  gradientCircle3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#60A5FA',
    opacity: 0.15,
    top: '40%',
    right: '20%',
  },
  gradientCircle4: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#8B5CF6',
    opacity: 0.15,
    bottom: '10%',
    left: '10%',
  },
  gradientCircle5: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#EC4899',
    opacity: 0.12,
    top: '60%',
    left: '5%',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
    backgroundSize: '50px 50px',
  },
  particleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle: {
    position: 'absolute',
    borderRadius: 50,
  },
  particle1: {
    width: 8,
    height: 8,
    backgroundColor: '#60A5FA',
    top: '20%',
    left: '15%',
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  particle2: {
    width: 6,
    height: 6,
    backgroundColor: '#8B5CF6',
    top: '50%',
    right: '20%',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  particle3: {
    width: 10,
    height: 10,
    backgroundColor: '#EC4899',
    bottom: '30%',
    left: '25%',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    zIndex: 0,
  },
  logoInnerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
    zIndex: 2,
    overflow: 'hidden',
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
  },
  logoRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderStyle: 'dashed',
    zIndex: 1,
  },
  logoRing2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    zIndex: 0,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1.5,
    textShadowColor: 'rgba(59, 130, 246, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
    marginBottom: 12,
  },
  titleUnderline: {
    width: 120,
    height: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 24,
    marginBottom: 32,
    fontWeight: '500',
  },
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  badge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 18,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(59, 130, 246, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  featureGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2.5,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '500',
  },
  featuresSection: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  benefitTile: {
    width: (width - 64) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    alignItems: 'center',
  },
  benefitIconTile: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  benefitIconText: {
    fontSize: 28,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  benefitDescription: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  trustSection: {
    padding: 28,
    paddingBottom: 50,
    backgroundColor: 'rgba(10, 14, 39, 0.8)',
  },
  trustTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  trustBadges: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 16,
  },
  trustBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    minWidth: 110,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  trustBadgeIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  trustBadgeText: {
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  // Action Buttons Container
  actionButtonsContainer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: 'transparent',
    gap: 16,
  },
  actionButton: {
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  signUpButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#3B82F6',
    shadowColor: '#FFFFFF',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  actionButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  signUpButtonText: {
    color: '#3B82F6',
    textShadowColor: 'transparent',
  },
  signUpButtonSubtext: {
    color: '#64748B',
    fontWeight: '600',
  },
  // Form Container Styles
  formContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 32,
    padding: 32,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    backdropFilter: 'blur(10px)',
    zIndex: 5,
  },
  formHeader: {
    marginBottom: 32,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -1,
    textAlign: 'center',
    textShadowColor: 'rgba(59, 130, 246, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  formTitleUnderline: {
    width: 100,
    height: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#CBD5E1',
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  input: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    fontWeight: '500',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  pickerContainer: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    marginBottom: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  picker: {
    height: 56,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
    borderColor: '#94A3B8',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleText: {
    color: '#CBD5E1',
    fontSize: 15,
  },
  toggleTextBold: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  retryButton: {
    marginTop: 10,
    padding: 10,
    alignItems: 'center',
  },
  retryText: {
    color: '#007AFF',
    fontSize: 14,
  },
  infoBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderLeftWidth: 5,
    borderLeftColor: '#3B82F6',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  infoText: {
    fontSize: 15,
    color: '#E2E8F0',
    lineHeight: 22,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 39, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    marginTop: 24,
  },
  modalButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#1E293B',
  },
});
