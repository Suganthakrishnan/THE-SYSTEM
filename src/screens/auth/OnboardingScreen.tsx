import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Zap, CheckCircle, Target, Trophy, Clock, ChevronRight } from 'lucide-react-native';
import { theme } from '../../constants/theme';
import { scale, verticalScale, fontSize as fs } from '../../utils/responsive';
import { Button } from '../../components/ui/Button';
import { GlowInput } from '../../components/ui/GlowInput';
import { HudContainer } from '../../components/ui/HudContainer';
import { useAuthContext } from '../../context/AuthContext';
import { saveOnboardingData } from '../../services/profileService';

const FEATURES = [
  { icon: <Zap color={theme.colors.primary} size={theme.iconSizes.xxl} />, title: 'Gamified Fitness', desc: 'Level up your real-life stats through daily quests' },
  { icon: <Shield color={theme.colors.secondary} size={theme.iconSizes.xxl} />, title: 'Complete Tracking', desc: 'Workouts, sleep, screen time — all in one place' },
  { icon: <CheckCircle color={theme.colors.success} size={theme.iconSizes.xxl} />, title: 'Achievement System', desc: 'Unlock badges and climb the leaderboards' },
];

const GOALS = [
  { id: 'weight_loss', label: 'Weight Loss', icon: <Target color={theme.colors.primary} size={theme.iconSizes.xl} />, desc: 'Burn calories and shed excess weight' },
  { id: 'muscle_gain', label: 'Muscle Gain', icon: <Trophy color={theme.colors.primary} size={theme.iconSizes.xl} />, desc: 'Build strength and increase muscle mass' },
  { id: 'maintenance', label: 'Maintenance', icon: <Shield color={theme.colors.primary} size={theme.iconSizes.xl} />, desc: 'Maintain current fitness level' },
  { id: 'endurance', label: 'Endurance', icon: <Zap color={theme.colors.primary} size={theme.iconSizes.xl} />, desc: 'Improve stamina and cardiovascular health' },
];

const FITNESS_LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: 'New to fitness or returning after a long break' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Regular exercise routine, comfortable with basics' },
  { id: 'advanced', label: 'Advanced', desc: 'Experienced athlete looking for intense challenges' },
];

const GENDER_OPTIONS = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const TOTAL_STEPS = 5;

export function OnboardingScreen() {
  const { user, completeOnboarding } = useAuthContext();
  console.log('[Ascend] OnboardingScreen rendered. User:', user?.id, 'Email:', user?.email);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));
  
  // Onboarding data state
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [workoutReminderEnabled, setWorkoutReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [questReminderEnabled, setQuestReminderEnabled] = useState(true);

  // Animation for step transitions
  const animateStepChange = (newStep: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev =>
      prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]
    );
  };

  const validateStep = (): boolean => {
    if (currentStep === 1) {
      if (selectedGoals.length === 0) {
        Alert.alert('REQUIRED', 'Please select at least one goal.');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!fitnessLevel) {
        Alert.alert('REQUIRED', 'Please select your fitness level.');
        return false;
      }
    }
    if (currentStep === 3) {
      const ageNum = parseInt(age, 10);
      const weightNum = parseFloat(weight);
      const heightNum = parseFloat(height);
      if (!age || isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
        Alert.alert('REQUIRED', 'Enter a valid age (13–120).');
        return false;
      }
      if (!weight || isNaN(weightNum) || weightNum <= 0) {
        Alert.alert('REQUIRED', 'Enter a valid weight.');
        return false;
      }
      if (!height || isNaN(heightNum) || heightNum <= 0) {
        Alert.alert('REQUIRED', 'Enter a valid height.');
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    
    if (currentStep < TOTAL_STEPS - 1) {
      animateStepChange(currentStep + 1);
      setCurrentStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      animateStepChange(currentStep - 1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user?.id) {
      Alert.alert('SYSTEM ERROR', 'No authenticated user. Please sign in again.');
      return;
    }

    setIsLoading(true);
    try {
      // Convert weight and height to metric for storage
      const weightInKg = weightUnit === 'lbs' ? parseFloat(weight) * 0.453592 : parseFloat(weight);
      const heightInCm = heightUnit === 'ft' ? parseFloat(height) * 30.48 : parseFloat(height);

      console.log('Starting onboarding save...');
      const { error: saveError } = await saveOnboardingData(user.id, {
        goals: selectedGoals,
        fitness_level: fitnessLevel,
        age: parseInt(age, 10),
        weight_kg: weightInKg,
        height_cm: heightInCm,
        gender: gender || undefined,
        notifications_enabled: workoutReminderEnabled,
        reminder_time: reminderTime,
        quest_reminders_enabled: questReminderEnabled,
      });

      if (saveError) {
        setIsLoading(false);
        console.log('Save error details:', saveError);
        console.log('Save error message:', (saveError as any).message);
        console.log('Save error stringified:', JSON.stringify(saveError));
        console.log('Save error keys:', Object.keys(saveError as any));
        
        // Handle Supabase errors which might have different structure
        let errorMessage = 'Unknown error occurred';
        if (saveError instanceof Error) {
          errorMessage = saveError.message;
        } else if (typeof saveError === 'object' && saveError !== null) {
          errorMessage = (saveError as any).message || JSON.stringify(saveError);
        } else {
          errorMessage = String(saveError);
        }
        
        Alert.alert(
          'SYSTEM ERROR',
          errorMessage.includes('column')
            ? 'Database schema needs update. Please run the migration in Supabase SQL Editor.'
            : errorMessage,
          [{ text: 'RETRY', onPress: handleComplete }],
        );
        return;
      }

      console.log('Onboarding saved, completing...');
      const { error } = await completeOnboarding();
      
      if (error) {
        setIsLoading(false);
        Alert.alert('SYSTEM ERROR', 'Could not complete onboarding. Please retry.', [
          { text: 'RETRY', onPress: handleComplete },
        ]);
      }
    } catch (err: unknown) {
      console.log('Catch error details:', err);
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      setIsLoading(false);
      Alert.alert('SYSTEM ERROR', message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
            <Text style={styles.stepTitle}>WELCOME TO Ascend</Text>
            <Text style={styles.stepSubtitle}>Transform your fitness journey into an epic adventure</Text>
            <View style={styles.divider} />
            <View style={styles.featureList}>
              {FEATURES.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={styles.featureIcon}>{f.icon}</View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.divider} />
            {user?.email ? <Text style={styles.accountNote}>Logged in as {user.email}</Text> : null}
          </Animated.View>
        );
      case 1:
        return (
          <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
            <Text style={styles.stepTitle}>SELECT YOUR GOALS</Text>
            <Text style={styles.stepSubtitle}>Choose all that apply (multi-select)</Text>
            <View style={styles.divider} />
            <ScrollView showsVerticalScrollIndicator={false} style={styles.optionsContainer} keyboardShouldPersistTaps="handled">
              <View style={styles.optionsGrid}>
                {GOALS.map((goal) => (
                  <TouchableOpacity
                    key={goal.id}
                    style={[styles.optionCard, selectedGoals.includes(goal.id) && styles.optionCardSelected]}
                    onPress={() => toggleGoal(goal.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionIcon}>{goal.icon}</View>
                    <Text style={styles.optionLabel}>{goal.label}</Text>
                    <Text style={styles.optionDesc}>{goal.desc}</Text>
                    {selectedGoals.includes(goal.id) && (
                      <CheckCircle color={theme.colors.primary} size={theme.iconSizes.xl} style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        );
      case 2:
        return (
          <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
            <Text style={styles.stepTitle}>FITNESS LEVEL</Text>
            <Text style={styles.stepSubtitle}>Select your current fitness level</Text>
            <View style={styles.divider} />
            <ScrollView showsVerticalScrollIndicator={false} style={styles.optionsContainer} keyboardShouldPersistTaps="handled">
              <View style={styles.optionsList}>
                {FITNESS_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level.id}
                    style={[styles.levelOption, fitnessLevel === level.id && styles.levelOptionSelected]}
                    onPress={() => setFitnessLevel(level.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.levelContent}>
                      <Text style={styles.levelLabel}>{level.label}</Text>
                      <Text style={styles.levelDesc}>{level.desc}</Text>
                    </View>
                    {fitnessLevel === level.id && <CheckCircle color={theme.colors.primary} size={theme.iconSizes.xxl} />}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        );
      case 3:
        return (
          <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
            <Text style={styles.stepTitle}>PERSONAL STATS</Text>
            <Text style={styles.stepSubtitle}>Enter your stats to personalize your experience</Text>
            <View style={styles.divider} />
            <ScrollView showsVerticalScrollIndicator={false} style={styles.optionsContainer} keyboardShouldPersistTaps="handled">
              <GlowInput
                label="AGE"
                value={age}
                onChangeText={setAge}
                placeholder="e.g. 25"
                keyboardType="number-pad"
                blurOnSubmit={false}
                returnKeyType="next"
                onSubmitEditing={() => {}}
              />
              <View style={styles.unitRow}>
                <View style={{ flex: 1 }}>
                  <GlowInput
                    label={`WEIGHT (${weightUnit})`}
                    value={weight}
                    onChangeText={setWeight}
                    placeholder={weightUnit === 'kg' ? 'e.g. 70' : 'e.g. 154'}
                    keyboardType="decimal-pad"
                    blurOnSubmit={false}
                    returnKeyType="next"
                    onSubmitEditing={() => {}}
                  />
                </View>
                <View style={styles.unitToggleGroup}>
                  {(['kg', 'lbs'] as const).map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitChip, weightUnit === u && styles.unitChipActive]}
                      onPress={() => setWeightUnit(u)}
                    >
                      <Text style={[styles.unitChipText, weightUnit === u && styles.unitChipTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.unitRow}>
                <View style={{ flex: 1 }}>
                  <GlowInput
                    label={`HEIGHT (${heightUnit})`}
                    value={height}
                    onChangeText={setHeight}
                    placeholder={heightUnit === 'cm' ? 'e.g. 175' : 'e.g. 5.9'}
                    keyboardType="decimal-pad"
                    blurOnSubmit={false}
                    returnKeyType="done"
                    onSubmitEditing={() => {}}
                  />
                </View>
                <View style={styles.unitToggleGroup}>
                  {(['cm', 'ft'] as const).map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitChip, heightUnit === u && styles.unitChipActive]}
                      onPress={() => setHeightUnit(u)}
                    >
                      <Text style={[styles.unitChipText, heightUnit === u && styles.unitChipTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <Text style={styles.sectionTitle}>GENDER (OPTIONAL)</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.genderChip, gender === opt.id && styles.genderChipActive]}
                    onPress={() => setGender(gender === opt.id ? '' : opt.id)}
                  >
                    <Text style={[styles.genderChipText, gender === opt.id && styles.genderChipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        );
      case 4:
        return (
          <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
            <Text style={styles.stepTitle}>NOTIFICATIONS</Text>
            <Text style={styles.stepSubtitle}>Set your reminder preferences</Text>
            <View style={styles.divider} />
            <ScrollView showsVerticalScrollIndicator={false} style={styles.optionsContainer}>
              <View style={styles.optionsList}>
                <TouchableOpacity
                  style={styles.levelOption}
                  onPress={() => setWorkoutReminderEnabled(!workoutReminderEnabled)}
                >
                  <View style={styles.levelContent}>
                    <Text style={styles.levelLabel}>Daily Workout Reminder</Text>
                    <Text style={styles.levelDesc}>Get reminded to work out every day</Text>
                  </View>
                  <View style={[styles.toggle, workoutReminderEnabled ? styles.toggleOn : null]}>
                    <Text style={styles.toggleText}>{workoutReminderEnabled ? 'ON' : 'OFF'}</Text>
                  </View>
                </TouchableOpacity>
                
                {workoutReminderEnabled && (
                  <View style={styles.timePickerContainer}>
                    <Text style={styles.sectionTitle}>REMINDER TIME</Text>
                    <TouchableOpacity
                      style={styles.timePickerButton}
                      onPress={() => {
                        Alert.alert('Set Time', 'Enter time in HH:MM format (24-hour)', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'OK',
                            onPress: () => {
                              const times = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
                              const currentIndex = times.indexOf(reminderTime);
                              const nextIndex = (currentIndex + 1) % times.length;
                              setReminderTime(times[nextIndex]);
                            },
                          },
                        ]);
                      }}
                    >
                      <Clock color={theme.colors.primary} size={theme.iconSizes.xxl} />
                      <Text style={styles.timePickerText}>{reminderTime}</Text>
                      <ChevronRight color={theme.colors.textDimmed} size={theme.iconSizes.xl} />
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.levelOption}
                  onPress={() => setQuestReminderEnabled(!questReminderEnabled)}
                >
                  <View style={styles.levelContent}>
                    <Text style={styles.levelLabel}>Quest Reminders</Text>
                    <Text style={styles.levelDesc}>Get notified about daily quests</Text>
                  </View>
                  <View style={[styles.toggle, questReminderEnabled ? styles.toggleOn : null]}>
                    <Text style={styles.toggleText}>{questReminderEnabled ? 'ON' : 'OFF'}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(0,240,255,0.1)', 'transparent', 'rgba(69,162,158,0.06)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.corner, styles.cTL]} /><View style={[styles.corner, styles.cTR]} />
      <View style={[styles.corner, styles.cBL]} /><View style={[styles.corner, styles.cBR]} />

      <View style={styles.content}>
        <View style={styles.badge}>
          <Shield color={theme.colors.primary} size={theme.iconSizes.huge} />
        </View>

        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>STEP {currentStep + 1} OF {TOTAL_STEPS}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%` }]} />
          </View>
        </View>

        <View style={styles.stepContainer}>{renderStep()}</View>

        <View style={styles.navigationContainer}>
          {currentStep > 0 && (
            <Button title="PREVIOUS" onPress={handlePrevious} style={styles.previousButton} variant="secondary" />
          )}
          <Button
            title={currentStep === TOTAL_STEPS - 1 ? 'INITIALIZE TRAINING SEQUENCE' : 'NEXT STEP'}
            onPress={handleNext}
            isLoading={isLoading}
            style={styles.nextButton}
          />
        </View>

        <Text style={styles.hint}>
          {currentStep === TOTAL_STEPS - 1
            ? 'Your personalized training system will be ready after this step.'
            : 'All data is securely stored and can be changed later in Profile.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg.base },
  corner: { position: 'absolute', width: scale(22), height: scale(22), borderColor: theme.colors.primary, opacity: 0.5 },
  cTL: { top: scale(22), left: scale(22), borderTopWidth: 2, borderLeftWidth: 2 },
  cTR: { top: scale(22), right: scale(22), borderTopWidth: 2, borderRightWidth: 2 },
  cBL: { bottom: scale(22), left: scale(22), borderBottomWidth: 2, borderLeftWidth: 2 },
  cBR: { bottom: scale(22), right: scale(22), borderBottomWidth: 2, borderRightWidth: 2 },
  content: { flex: 1, padding: theme.spacing.lg, justifyContent: 'space-between' },
  badge: {
    width: scale(80), height: scale(80), borderRadius: scale(20),
    backgroundColor: theme.colors.bg.glass, borderWidth: 1, borderColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: theme.spacing.lg,
    ...theme.glow.cyan,
  },
  progressContainer: { alignItems: 'center', marginBottom: theme.spacing.md },
  progressText: { fontSize: fs(10), color: theme.colors.text.secondary, letterSpacing: 2, marginBottom: theme.spacing.xs },
  progressBar: { width: scale(120), height: verticalScale(3), backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: scale(2) },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: scale(2) },
  stepContainer: { flex: 1, justifyContent: 'center' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: fs(24), fontWeight: '900', color: theme.colors.primary, letterSpacing: 3, textAlign: 'center', marginBottom: theme.spacing.sm, fontFamily: theme.fonts.heading },
  stepSubtitle: { fontSize: fs(14), color: theme.colors.text.secondary, textAlign: 'center', lineHeight: fs(22), marginBottom: theme.spacing.md },
  optionsContainer: { flex: 1 },
  sectionTitle: { fontSize: fs(12), color: theme.colors.secondary, letterSpacing: 2, marginBottom: theme.spacing.sm },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme.spacing.sm },
  optionsList: { gap: theme.spacing.sm },
  optionCard: {
    width: '48%', backgroundColor: theme.colors.bg.glass, borderWidth: 1, borderColor: theme.colors.bg.glassBorder,
    borderRadius: theme.border.radius.md, padding: theme.spacing.md, alignItems: 'center', marginBottom: theme.spacing.sm,
  },
  optionCardSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '15' },
  optionIcon: {
    width: scale(40), height: scale(40), borderRadius: scale(10),
    backgroundColor: theme.colors.bg.base, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.xs,
  },
  optionLabel: { fontSize: fs(12), fontWeight: '700', color: theme.colors.text.primary, textAlign: 'center', marginBottom: verticalScale(2) },
  optionDesc: { fontSize: fs(10), color: theme.colors.text.secondary, textAlign: 'center', lineHeight: fs(14) },
  levelOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.bg.glass, borderWidth: 1, borderColor: theme.colors.bg.glassBorder,
    borderRadius: theme.border.radius.md, padding: theme.spacing.md,
  },
  levelOptionSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '15' },
  levelContent: { flex: 1 },
  levelLabel: { fontSize: fs(14), fontWeight: '700', color: theme.colors.text.primary, marginBottom: verticalScale(2) },
  levelDesc: { fontSize: fs(12), color: theme.colors.text.secondary },
  toggle: {
    width: scale(40), height: verticalScale(20), borderRadius: scale(10),
    backgroundColor: theme.colors.bg.glassBorder, justifyContent: 'center', alignItems: 'center',
  },
  toggleOn: { backgroundColor: theme.colors.primary },
  toggleText: { fontSize: fs(8), fontWeight: '700', color: theme.colors.text.primary },
  unitRow: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  unitToggleGroup: { flexDirection: 'row', gap: scale(4), paddingBottom: theme.spacing.md },
  unitChip: {
    paddingHorizontal: scale(10), paddingVertical: verticalScale(6),
    borderWidth: 1, borderColor: theme.colors.bg.glassBorder, borderRadius: scale(4),
  },
  unitChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '15' },
  unitChipText: { fontSize: fs(10), fontWeight: '700', color: theme.colors.text.secondary },
  unitChipTextActive: { color: theme.colors.primary },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  genderChip: {
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderWidth: 1, borderColor: theme.colors.bg.glassBorder, borderRadius: theme.border.radius.md,
  },
  genderChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '15' },
  genderChipText: { fontSize: fs(11), fontWeight: '600', color: theme.colors.text.secondary },
  genderChipTextActive: { color: theme.colors.primary },
  navigationContainer: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg, zIndex: 10 },
  previousButton: { flex: 1, minWidth: scale(100) },
  nextButton: { flex: 2, minWidth: scale(120) },
  divider: { width: scale(50), height: verticalScale(1.5), backgroundColor: theme.colors.primary, marginVertical: theme.spacing.lg, opacity: 0.5, alignSelf: 'center' },
  featureList: { alignSelf: 'stretch', gap: theme.spacing.md },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    backgroundColor: theme.colors.bg.glass, borderWidth: 1, borderColor: theme.colors.bg.glassBorder,
    borderRadius: theme.border.radius.md, padding: theme.spacing.md,
  },
  featureIcon: {
    width: scale(44), height: scale(44), borderRadius: scale(12),
    backgroundColor: theme.colors.bg.base, justifyContent: 'center', alignItems: 'center',
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: fs(14), fontWeight: '700', color: theme.colors.text.primary, marginBottom: verticalScale(2) },
  featureDesc: { fontSize: fs(12), color: theme.colors.text.secondary },
  accountNote: { fontSize: fs(12), color: theme.colors.text.secondary, marginBottom: theme.spacing.md, textAlign: 'center' },
  hint: { fontSize: fs(11), color: theme.colors.text.secondary + '80', textAlign: 'center', marginTop: theme.spacing.sm },
  checkIcon: { position: 'absolute', top: scale(8), right: scale(8) },
  timePickerContainer: { marginTop: theme.spacing.md, marginBottom: theme.spacing.md },
  timePickerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.bg.glass, borderWidth: 1, borderColor: theme.colors.bg.glassBorder,
    borderRadius: theme.border.radius.md, padding: theme.spacing.md,
  },
  timePickerText: { fontSize: fs(16), fontWeight: '700', color: theme.colors.text.primary },
});