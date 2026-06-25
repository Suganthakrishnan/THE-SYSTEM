import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Check } from 'lucide-react-native';
import { theme } from '../../constants/theme';
import { scale, verticalScale, fontSize as fs } from '../../utils/responsive';
import { GlowInput } from '../../components/ui/GlowInput';
import { Button } from '../../components/ui/Button';
import { useAuthContext } from '../../context/AuthContext';
import { sanitizeText, validateEmail } from '../../services/securityService';

export function RegisterScreen({ navigation }: any) {
  const { signUp } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string; terms?: string; general?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required.';
    else if (!validateEmail(email)) e.email = 'Invalid email format.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 8) e.password = 'Minimum 8 characters.';
    if (password !== confirm) e.confirm = 'Passwords do not match.';
    if (!agreedToTerms) e.terms = 'You must agree to the Terms & Privacy Policy.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    
    // Sanitize email before sending
    const sanitizedEmail = sanitizeText(email);
    
    setIsLoading(true);
    const { data, error } = await signUp(sanitizedEmail, password);
    setIsLoading(false);
    if (error) { setErrors({ general: error.message || 'Registration failed.' }); return; }
    if (!data.session) {
      // Email confirmation required
      Alert.alert(
        'VERIFY EMAIL',
        'A verification link has been sent to your email. Confirm to activate your system access.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
    // If session exists, AppNavigator routes to Onboarding automatically
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <LinearGradient colors={['rgba(0,240,255,0.07)', 'transparent']} style={styles.gradientTop} />
        <View style={[styles.corner, styles.cTL]} /><View style={[styles.corner, styles.cTR]} />
        <View style={[styles.corner, styles.cBL]} /><View style={[styles.corner, styles.cBR]} />

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backBtn} 
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            accessibilityHint="Return to the previous screen"
            accessibilityRole="button"
          >
            <ChevronLeft color={theme.colors.primary} size={theme.iconSizes.xxl} />
            <Text style={styles.backText}>BACK</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>INITIALIZE</Text>
            <Text style={styles.titleAccent}>ACCOUNT</Text>
            <Text style={styles.subtitle}>Create your operator profile to begin</Text>
            <View style={styles.divider} />
          </View>

          {errors.general ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {errors.general}</Text>
            </View>
          ) : null}

          <GlowInput
            label="EMAIL ADDRESS"
            placeholder="operator@system.fit"
            value={email}
            onChangeText={(t) => { setEmail(t); setErrors(e => ({ ...e, email: undefined })); }}
            keyboardType="email-address"
            textContentType="emailAddress"
            error={errors.email}
            onSubmitEditing={() => Keyboard.dismiss()}
            accessibilityLabel="Email address input"
            accessibilityHint="Enter your email address to create an account"
          />
          <GlowInput
            label="ACCESS CODE"
            placeholder="Minimum 8 characters"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrors(e => ({ ...e, password: undefined })); }}
            secureTextEntry
            textContentType="newPassword"
            error={errors.password}
            onSubmitEditing={() => Keyboard.dismiss()}
            accessibilityLabel="Password input"
            accessibilityHint="Create a password with at least 8 characters"
          />
          <GlowInput
            label="CONFIRM ACCESS CODE"
            placeholder="Repeat your password"
            value={confirm}
            onChangeText={(t) => { setConfirm(t); setErrors(e => ({ ...e, confirm: undefined })); }}
            secureTextEntry
            textContentType="newPassword"
            error={errors.confirm}
            onSubmitEditing={() => Keyboard.dismiss()}
            accessibilityLabel="Confirm password input"
            accessibilityHint="Re-enter your password to confirm"
          />

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => { setAgreedToTerms(!agreedToTerms); setErrors(e => ({ ...e, terms: undefined })); }}
            activeOpacity={0.7}
            accessibilityLabel={agreedToTerms ? 'Terms agreed' : 'Agree to terms'}
            accessibilityHint="Tap to agree to Terms of Service and Privacy Policy"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreedToTerms }}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms && <Check color={theme.colors.bg.base} size={theme.iconSizes.md} />}
            </View>
            <View style={styles.checkboxTextContainer}>
              <Text style={styles.checkboxLabel}>I agree to the </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('TermsOfService')} 
                activeOpacity={0.7}
                accessibilityLabel="Terms of Service"
                accessibilityHint="View the Terms of Service"
                accessibilityRole="link"
              >
                <Text style={styles.linkText}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}> and </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('PrivacyPolicy')} 
                activeOpacity={0.7}
                accessibilityLabel="Privacy Policy"
                accessibilityHint="View the Privacy Policy"
                accessibilityRole="link"
              >
                <Text style={styles.linkText}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
          {errors.terms ? <Text style={styles.errorTextSmall}>{errors.terms}</Text> : null}

          <Button 
            title="INITIALIZE ACCOUNT" 
            onPress={handleSignUp} 
            isLoading={isLoading} 
            style={styles.submitBtn} 
            accessibilityLabel="Create account"
            accessibilityHint="Register your new account"
          />

          <TouchableOpacity 
            style={styles.linkRow} 
            onPress={() => navigation.navigate('Login')} 
            activeOpacity={0.7}
            accessibilityLabel="Sign in"
            accessibilityHint="Navigate to login screen"
            accessibilityRole="button"
          >
            <Text style={styles.linkPrompt}>ALREADY REGISTERED? </Text>
            <Text style={styles.linkAction}>ENTER SYSTEM</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg.base },
  gradientTop: { position: 'absolute', top: 0, left: 0, right: 0, height: verticalScale(240) },
  corner: { position: 'absolute', width: scale(22), height: scale(22), borderColor: theme.colors.primary, opacity: 0.5 },
  cTL: { top: scale(22), left: scale(22), borderTopWidth: 2, borderLeftWidth: 2 },
  cTR: { top: scale(22), right: scale(22), borderTopWidth: 2, borderRightWidth: 2 },
  cBL: { bottom: scale(22), left: scale(22), borderBottomWidth: 2, borderLeftWidth: 2 },
  cBR: { bottom: scale(22), right: scale(22), borderBottomWidth: 2, borderRightWidth: 2 },
  scroll: { flexGrow: 1, padding: theme.spacing.lg, paddingTop: theme.spacing.xl },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(4), marginBottom: theme.spacing.xl },
  backText: { color: theme.colors.primary, fontSize: fs(13), fontWeight: '700', letterSpacing: 1 },
  header: { marginBottom: theme.spacing.xxl },
  title: { fontSize: fs(34), fontWeight: '900', color: theme.colors.text.primary, letterSpacing: 3, fontFamily: theme.fonts.heading },
  titleAccent: {
    fontSize: fs(34), fontWeight: '900', color: theme.colors.primary, letterSpacing: 3,
    textShadowColor: theme.colors.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: scale(12),
    fontFamily: theme.fonts.heading,
  },
  subtitle: { fontSize: fs(13), color: theme.colors.text.secondary, marginTop: theme.spacing.sm },
  divider: { width: scale(40), height: verticalScale(1.5), backgroundColor: theme.colors.primary, marginTop: theme.spacing.md, opacity: 0.6 },
  errorBox: {
    backgroundColor: theme.colors.danger + '15', borderWidth: 1, borderColor: theme.colors.danger,
    borderRadius: theme.border.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md,
  },
  errorText: { color: theme.colors.danger, fontSize: fs(13), fontWeight: '600' },
  errorTextSmall: { color: theme.colors.danger, fontSize: fs(12), marginTop: theme.spacing.xs, marginBottom: theme.spacing.sm },
  submitBtn: { marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg },
  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: theme.spacing.sm },
  linkPrompt: { color: theme.colors.text.secondary, fontSize: fs(13), letterSpacing: 1 },
  linkAction: { color: theme.colors.primary, fontSize: fs(13), fontWeight: '700', letterSpacing: 1 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  checkbox: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(4),
    borderWidth: 2,
    borderColor: theme.colors.bg.glassBorder,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(2),
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxTextContainer: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  checkboxLabel: { color: theme.colors.text.secondary, fontSize: fs(13) },
  linkText: { color: theme.colors.primary, fontSize: fs(13), fontWeight: '600' },
});