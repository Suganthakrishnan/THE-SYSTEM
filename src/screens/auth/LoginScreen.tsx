import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import { scale, verticalScale, fontSize as fs } from '../../utils/responsive';
import { GlowInput } from '../../components/ui/GlowInput';
import { Button } from '../../components/ui/Button';
import { useAuthContext } from '../../context/AuthContext';
import { resetPassword } from '../../services/authService';
import { sanitizeText, validateEmail } from '../../services/securityService';
import { useGoogleSignIn } from '../../hooks/useGoogleSignIn';

export function LoginScreen({ navigation }: any) {
  const { signIn, enterDemoMode } = useAuthContext();
  const { signIn: googleSignIn, isSigningIn: isGoogleSigningIn, error: googleError } = useGoogleSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(0.7)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.timing(scanAnim, { toValue: 1, duration: 3500, useNativeDriver: true })
    ).start();
  }, []);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('All fields are required.');
      return;
    }

    // Sanitize and validate email
    const sanitizedEmail = sanitizeText(email);
    if (!validateEmail(sanitizedEmail)) {
      setError('Invalid email format.');
      return;
    }

    setError(null);
    setIsLoading(true);
    const { error } = await signIn(sanitizedEmail, password);
    if (error) setError(error.message || 'Authentication failed. Try again.');
    setIsLoading(false);
    // Navigation is handled automatically by AppNavigator auth state
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const result = await googleSignIn();
    if (result.error && !result.cancelled) {
      setError(result.error);
    }
    // On success, navigation is handled automatically by AppNavigator
    // via the onAuthStateChange listener in useAuth.ts
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('EMAIL REQUIRED', 'Please enter your email address first.', [
        { text: 'OK' }
      ]);
      return;
    }

    Alert.alert(
      'RESET ACCESS CODE',
      `Send password reset link to ${email.trim()}?`,
      [
        { text: 'CANCEL', style: 'cancel' },
        { 
          text: 'SEND', 
          onPress: async () => {
            try {
              const { error } = await resetPassword(email.trim());
              if (error) {
                Alert.alert('ERROR', 'Failed to send reset email. Please try again.');
              } else {
                Alert.alert(
                  'RESET EMAIL SENT',
                  'Check your email for the password reset link.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              Alert.alert('ERROR', 'Something went wrong. Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <LinearGradient colors={['rgba(0,240,255,0.09)', 'transparent']} style={styles.gradientTop} />
        <Animated.View
          style={[styles.scanLine, {
            transform: [{ translateY: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-verticalScale(10), verticalScale(850)] }) }],
          }]}
        />
        {/* HUD corners */}
        <View style={[styles.corner, styles.cTL]} /><View style={[styles.corner, styles.cTR]} />
        <View style={[styles.corner, styles.cBL]} /><View style={[styles.corner, styles.cBR]} />

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>⚡</Text>
            </View>
            <Animated.Text style={[styles.logoText, { opacity: pulseAnim }]}>ASCEND</Animated.Text>
            <Text style={styles.logoSub}>AUTHENTICATION PROTOCOL v2.0</Text>
            <View style={styles.divider} />
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          {/* Form */}
          <GlowInput
            label="ACCESS EMAIL"
            placeholder="operator@system.fit"
            value={email}
            onChangeText={(t) => { setEmail(t); setError(null); }}
            keyboardType="email-address"
            textContentType="emailAddress"
            onSubmitEditing={() => Keyboard.dismiss()}
            accessibilityLabel="Email address input"
            accessibilityHint="Enter your email address to sign in"
          />
          <GlowInput
            label="ACCESS CODE"
            placeholder="••••••••"
            value={password}
            onChangeText={(t) => { setPassword(t); setError(null); }}
            secureTextEntry
            textContentType="password"
            onSubmitEditing={handleSignIn}
            accessibilityLabel="Password input"
            accessibilityHint="Enter your password to sign in"
          />

          <TouchableOpacity 
            style={styles.forgotBtn} 
            onPress={handleForgotPassword}
            accessibilityLabel="Forgot password"
            accessibilityHint="Reset your password via email"
            accessibilityRole="button"
          >
            <Text style={styles.forgotText}>FORGOT ACCESS CODE?</Text>
          </TouchableOpacity>

          <Button 
            title="ENTER SYSTEM" 
            onPress={handleSignIn} 
            isLoading={isLoading} 
            style={styles.primaryBtn} 
            accessibilityLabel="Sign in"
            accessibilityHint="Sign in to your account"
          />

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          <TouchableOpacity 
            style={[styles.googleBtn, (isLoading || isGoogleSigningIn) && { opacity: 0.6 }]} 
            onPress={handleGoogleSignIn} 
            activeOpacity={0.8}
            disabled={isLoading || isGoogleSigningIn}
            accessibilityLabel="Continue with Google"
            accessibilityHint="Sign in using your Google account"
            accessibilityRole="button"
          >
            <Text style={styles.googleG}>G</Text>
            <Text style={[styles.googleText, (isLoading || isGoogleSigningIn) && { opacity: 0.6 }]}>
              {isGoogleSigningIn ? 'SIGNING IN...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkRow} 
            onPress={() => navigation.navigate('Register')} 
            activeOpacity={0.7}
            accessibilityLabel="Create new account"
            accessibilityHint="Navigate to registration screen"
            accessibilityRole="button"
          >
            <Text style={styles.linkPrompt}>NEW OPERATOR? </Text>
            <Text style={styles.linkAction}>SYNC NEW USER</Text>
          </TouchableOpacity>

          {/* Demo Mode Bypass */}
          <TouchableOpacity 
            style={styles.demoBtn} 
            onPress={enterDemoMode} 
            activeOpacity={0.7}
            accessibilityLabel="Enter demo mode"
            accessibilityHint="Preview the app without creating an account"
            accessibilityRole="button"
          >
            <Text style={styles.demoText}>⚡ ENTER DEMO MODE</Text>
            <Text style={styles.demoSub}>Preview all screens without account</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg.base },
  gradientTop: { position: 'absolute', top: 0, left: 0, right: 0, height: verticalScale(280) },
  scanLine: { position: 'absolute', left: 0, right: 0, height: verticalScale(1), backgroundColor: theme.colors.primary, opacity: 0.07 },
  corner: { position: 'absolute', width: scale(22), height: scale(22), borderColor: theme.colors.primary, opacity: 0.5 },
  cTL: { top: scale(22), left: scale(22), borderTopWidth: 2, borderLeftWidth: 2 },
  cTR: { top: scale(22), right: scale(22), borderTopWidth: 2, borderRightWidth: 2 },
  cBL: { bottom: scale(22), left: scale(22), borderBottomWidth: 2, borderLeftWidth: 2 },
  cBR: { bottom: scale(22), right: scale(22), borderBottomWidth: 2, borderRightWidth: 2 },
  scroll: { flexGrow: 1, padding: theme.spacing.lg, justifyContent: 'center' },
  logoSection: { alignItems: 'center', marginBottom: theme.spacing.xxl },
  badge: {
    width: scale(64), height: scale(64), borderRadius: scale(16),
    backgroundColor: theme.colors.bg.glass, borderWidth: 1, borderColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.md,
    ...theme.glow.cyan,
  },
  badgeIcon: { fontSize: fs(28) },
  logoText: {
    fontSize: fs(36), fontWeight: '900', color: theme.colors.primary, letterSpacing: 6,
    textShadowColor: theme.colors.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: scale(16),
    fontFamily: theme.fonts.heading,
  },
  logoSub: { fontSize: fs(9), color: theme.colors.text.secondary, letterSpacing: 2, marginTop: theme.spacing.xs },
  divider: { width: scale(40), height: verticalScale(1.5), backgroundColor: theme.colors.primary, marginTop: theme.spacing.md, opacity: 0.6 },
  errorBox: {
    backgroundColor: theme.colors.danger + '15', borderWidth: 1, borderColor: theme.colors.danger,
    borderRadius: theme.border.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md,
  },
  errorText: { color: theme.colors.danger, fontSize: fs(13), fontWeight: '600' },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: theme.spacing.lg, marginTop: -theme.spacing.sm },
  forgotText: { fontSize: fs(11), color: theme.colors.secondary, letterSpacing: 1 },
  primaryBtn: { marginBottom: theme.spacing.md },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: theme.spacing.md, gap: theme.spacing.md },
  orLine: { flex: 1, height: verticalScale(1), backgroundColor: theme.colors.bg.glassBorder },
  orText: { color: theme.colors.text.secondary, fontSize: fs(12), letterSpacing: 2 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.bg.glass, borderWidth: 1, borderColor: theme.colors.bg.glassBorder,
    borderRadius: theme.border.radius.md, paddingVertical: theme.spacing.md, marginBottom: theme.spacing.lg, gap: theme.spacing.sm,
  },
  googleG: { fontSize: fs(18), fontWeight: '900', color: '#4285F4' },
  googleText: { color: theme.colors.text.primary, fontSize: fs(15), fontWeight: '600' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: theme.spacing.sm },
  linkPrompt: { color: theme.colors.text.secondary, fontSize: fs(13), letterSpacing: 1 },
  linkAction: { color: theme.colors.primary, fontSize: fs(13), fontWeight: '700', letterSpacing: 1 },
  demoBtn: {
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
    borderRadius: theme.border.radius.md,
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '15',
  },
  demoText: { 
    fontSize: fs(12), 
    fontWeight: '700', 
    color: theme.colors.primary, 
    letterSpacing: 1.5,
    marginBottom: theme.spacing.xs,
  },
  demoSub: { 
    fontSize: fs(10), 
    color: theme.colors.text.secondary, 
    letterSpacing: 1,
  },
});