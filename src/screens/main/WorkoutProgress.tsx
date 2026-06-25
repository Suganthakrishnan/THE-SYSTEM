import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated,
  Modal, Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { HudContainer } from '../../components/ui/HudContainer';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import { Button } from '../../components/ui/Button';
import { GlowInput } from '../../components/ui/GlowInput';
import { theme } from '../../constants/theme';
import { scale, verticalScale, fontSize as fs } from '../../utils/responsive';
import { useAuthContext } from '../../context/AuthContext';
import { DailyProgressService, StatsService } from '../../services/statsService';
import type { DailyProgress } from '../../services/statsService';
import {
  Play, Pause, StopCircle, Timer, Flame, Dumbbell,
  TrendingUp, Trophy, Calendar, ChevronRight, Zap,
  X, BarChart3, Activity, Target,
} from 'lucide-react-native';

const TODAY_SUMMARY = {
  totalTime: 45,
  caloriesBurned: 320,
  exercisesCompleted: 6,
  totalExercises: 8,
};

const RECENT_WORKOUTS = [
  { id: '1', date: 'May 9',  type: 'Strength',  duration: 52, exercises: 8, calories: 380 },
  { id: '2', date: 'May 8',  type: 'Cardio',    duration: 35, exercises: 4, calories: 410 },
  { id: '3', date: 'May 7',  type: 'Mixed',     duration: 60, exercises: 10,calories: 520 },
  { id: '4', date: 'May 5',  type: 'Strength',  duration: 45, exercises: 7, calories: 340 },
  { id: '5', date: 'May 4',  type: 'Cardio',    duration: 30, exercises: 3, calories: 290 },
];

const WEEKLY_DATA = [
  { day: 'M', minutes: 52 },
  { day: 'T', minutes: 35 },
  { day: 'W', minutes: 60 },
  { day: 'T', minutes: 0 },
  { day: 'F', minutes: 45 },
  { day: 'S', minutes: 0 },
  { day: 'S', minutes: 0 },
];

const PERSONAL_RECORDS = [
  { id: '1', exercise: 'Bench Press',  value: '80 kg',  recent: true },
  { id: '2', exercise: '5K Run',       value: '23:45',  recent: false },
  { id: '3', exercise: 'Deadlift',     value: '120 kg', recent: true },
  { id: '4', exercise: 'Plank',        value: '4:30',   recent: false },
];

const TYPE_COLORS: Record<string, string> = {
  'Strength': '#FF6B6B',
  'Cardio': '#00FF99',
  'Mixed': theme.colors.primary,
};

const MAX_BAR = Math.max(...WEEKLY_DATA.map(d => d.minutes), 1);

export const WorkoutProgress = React.memo(function WorkoutProgress() {
  const { user } = useAuthContext();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);
  
  const [todayProgress, setTodayProgress] = useState<DailyProgress | null>(null);
  const [progressHistory, setProgressHistory] = useState<DailyProgress[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [workoutSessions, setWorkoutSessions] = useState<any[]>([]);
  
  const [workoutForm, setWorkoutForm] = useState({
    type: 'strength',
    duration: 30,
    exercises: 8,
    calories: 300,
    notes: '',
  });
  
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    loadProgressData();
  }, [user]);

  const loadProgressData = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const { data: today } = await DailyProgressService.getTodayProgress(user.id);
      const { data: history } = await DailyProgressService.getProgressHistory(user.id, 30);
      const { data: stats } = await StatsService.getUserStats(user.id);
      setTodayProgress(today);
      setProgressHistory(history || []);
      setUserStats(stats);
      const sessions = generateWorkoutSessions(history || []);
      setWorkoutSessions(sessions);
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateWorkoutSessions = (history: DailyProgress[]) => {
    return history
      .filter(day => day.workouts_completed > 0)
      .slice(0, 10)
      .map((day, index) => ({
        id: day.id,
        date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        type: ['Strength', 'Cardio', 'Mixed'][index % 3],
        duration: day.workout_minutes_current || 30,
        exercises: Math.floor(Math.random() * 8) + 4,
        calories: Math.floor(day.workout_minutes_current * 8) || 240,
      }));
  };

  const calculateWeeklyData = () => {
    const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return weekDays.map((day, index) => {
      const dayData = progressHistory.filter(h => {
        const date = new Date(h.date);
        const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
        return dayIndex === index;
      });
      const totalMinutes = dayData.reduce((sum, d) => sum + (d.workout_minutes_current || 0), 0);
      return { day, minutes: totalMinutes };
    });
  };

  const calculateTodaySummary = () => {
    if (!todayProgress) return { totalTime: 0, caloriesBurned: 0, exercisesCompleted: 0, totalExercises: 8 };
    return {
      totalTime: todayProgress.workout_minutes_current || 0,
      caloriesBurned: Math.floor((todayProgress.workout_minutes_current || 0) * 8),
      exercisesCompleted: todayProgress.workouts_completed || 0,
      totalExercises: 8,
    };
  };

  const calculateAnalytics = () => {
    if (progressHistory.length === 0) return { totalWorkouts: 0, totalMinutes: 0, totalCalories: 0, avgWorkoutDuration: 0, bestDay: 'N/A', streakDays: 0, completionRate: 0 };
    const totalWorkouts = progressHistory.reduce((sum, day) => sum + (day.workouts_completed || 0), 0);
    const totalMinutes = progressHistory.reduce((sum, day) => sum + (day.workout_minutes_current || 0), 0);
    const totalCalories = Math.floor(totalMinutes * 8);
    const avgWorkoutDuration = totalWorkouts > 0 ? Math.floor(totalMinutes / totalWorkouts) : 0;
    const dayMinutes: Record<string, number> = {};
    progressHistory.forEach(day => {
      const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
      dayMinutes[dayName] = (dayMinutes[dayName] || 0) + (day.workout_minutes_current || 0);
    });
    const bestDay = Object.entries(dayMinutes).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const completedDays = progressHistory.filter(day => day.daily_goals_completed).length;
    const completionRate = progressHistory.length > 0 ? Math.round((completedDays / progressHistory.length) * 100) : 0;
    return { totalWorkouts, totalMinutes, totalCalories, avgWorkoutDuration, bestDay, streakDays: userStats?.day_streak || 0, completionRate };
  };

  const weeklyData = React.useMemo(() => calculateWeeklyData(), [progressHistory]);
  const todaySummary = React.useMemo(() => calculateTodaySummary(), [todayProgress]);
  const analytics = React.useMemo(() => calculateAnalytics(), [progressHistory, userStats]);
  const dataBarMax = React.useMemo(() => Math.max(...weeklyData.map(d => d.minutes), 1), [weeklyData]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerActive && !isPaused) {
      interval = setInterval(() => setTimerSeconds(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, isPaused]);

  useEffect(() => {
    if (isTimerActive) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ])).start();
    } else pulseAnim.setValue(0.6);
  }, [isTimerActive]);

  const formatTime = React.useCallback((s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }, []);

  const handleStartWorkout = React.useCallback(() => {
    setIsTimerActive(true);
    setIsPaused(false);
    setTimerSeconds(0);
  }, []);

  const handleEndWorkout = async () => {
    if (!user?.id) return;
    Alert.alert('COMPLETE WORKOUT', `Save this ${formatTime(timerSeconds)} workout session?`, [
      { text: 'CANCEL', style: 'cancel' },
      { text: 'NO', style: 'destructive', onPress: () => { setIsTimerActive(false); setIsPaused(false); setTimerSeconds(0); } },
      { text: 'SAVE', onPress: async () => {
        try {
          const currentMinutes = todayProgress?.workout_minutes_current || 0;
          const currentWorkouts = todayProgress?.workouts_completed || 0;
          const currentCalories = todayProgress?.calories_current || 0;
          await DailyProgressService.updateTodayProgress(user.id, {
            workout_minutes_current: currentMinutes + Math.floor(timerSeconds / 60),
            workouts_completed: currentWorkouts + 1,
            calories_current: currentCalories + Math.floor(timerSeconds / 60 * 8),
          });
          Alert.alert('SUCCESS', 'Workout saved successfully!');
          setIsTimerActive(false);
          setIsPaused(false);
          setTimerSeconds(0);
          loadProgressData();
        } catch (error) { Alert.alert('ERROR', 'Failed to save workout.'); }
      }},
    ]);
  };

  const handleSaveWorkout = async () => {
    if (!user?.id) return;
    try {
      const currentMinutes = todayProgress?.workout_minutes_current || 0;
      const currentWorkouts = todayProgress?.workouts_completed || 0;
      const currentCalories = todayProgress?.calories_current || 0;
      await DailyProgressService.updateTodayProgress(user.id, {
        workout_minutes_current: currentMinutes + workoutForm.duration,
        workouts_completed: currentWorkouts + 1,
        calories_current: currentCalories + workoutForm.calories,
      });
      Alert.alert('SUCCESS', 'Workout logged successfully!');
      setShowWorkoutModal(false);
      loadProgressData();
    } catch (error) { Alert.alert('ERROR', 'Failed to log workout.'); }
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}><Text style={styles.loadingText}>LOADING PROGRESS...</Text></View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {isTimerActive ? (
          <HudContainer active style={styles.activeBanner}>
            <View style={styles.activeHeader}>
              <Animated.View style={{ opacity: pulseAnim }}><View style={styles.liveDot} /></Animated.View>
              <Text style={styles.activeLabel}>WORKOUT IN PROGRESS</Text>
            </View>
            <Text style={styles.timerDisplay}>{formatTime(timerSeconds)}</Text>
            <Text style={styles.activeExercise}>Current: Free Workout</Text>
            <View style={styles.timerControls}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => setIsPaused(!isPaused)} activeOpacity={0.7}>
                {isPaused ? <Play color={theme.colors.success} size={theme.iconSizes.xxl} /> : <Pause color={theme.colors.primary} size={theme.iconSizes.xxl} />}
                <Text style={styles.controlLabel}>{isPaused ? 'RESUME' : 'PAUSE'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlBtn, styles.endBtn]} onPress={handleEndWorkout} activeOpacity={0.7}>
                <StopCircle color={theme.colors.danger} size={theme.iconSizes.xxl} />
                <Text style={[styles.controlLabel, { color: theme.colors.danger }]}>END</Text>
              </TouchableOpacity>
            </View>
          </HudContainer>
        ) : (
          <TouchableOpacity onPress={handleStartWorkout} activeOpacity={0.8}>
            <HudContainer style={styles.startCard}>
              <View style={styles.startRow}>
                <View style={styles.startIconWrap}><Play color={theme.colors.primary} size={theme.iconSizes.xxl} /></View>
                <View><Text style={styles.startTitle}>START WORKOUT</Text><Text style={styles.startSub}>Tap to begin a new session</Text></View>
                <ChevronRight color={theme.colors.text.secondary} size={theme.iconSizes.xl} />
              </View>
            </HudContainer>
          </TouchableOpacity>
        )}

        <SectionHeader title="Today's Summary" icon={<Flame color={theme.colors.primary} size={theme.iconSizes.sm} />} actionLabel="LOG" onAction={() => setShowWorkoutModal(true)} />
        <HudContainer style={styles.summaryCard}>
          <View style={styles.ringsRow}>
            <ProgressRing size={Math.round(scale(80))} strokeWidth={Math.round(scale(6))} progress={todaySummary.totalTime / 60} color={theme.colors.primary} value={`${todaySummary.totalTime}`} label="MIN" />
            <ProgressRing size={Math.round(scale(80))} strokeWidth={Math.round(scale(6))} progress={todaySummary.caloriesBurned / 500} color="#FF6B6B" value={`${todaySummary.caloriesBurned}`} label="KCAL" />
            <ProgressRing size={Math.round(scale(80))} strokeWidth={Math.round(scale(6))} progress={todaySummary.exercisesCompleted / todaySummary.totalExercises} color="#00FF99" value={`${todaySummary.exercisesCompleted}/${todaySummary.totalExercises}`} label="DONE" />
          </View>
        </HudContainer>

        <SectionHeader title="Weekly Volume" icon={<Calendar color={theme.colors.primary} size={theme.iconSizes.sm} />} actionLabel="ANALYTICS" onAction={() => setShowAnalyticsModal(true)} />
        <HudContainer style={styles.chartCard}>
          <View style={styles.barsContainer}>
            {weeklyData.map((d, i) => {
              const barHeight = d.minutes > 0 ? (d.minutes / dataBarMax) * 80 : 2;
              const isToday = i === new Date().getDay() - 1;
              return (
                <View key={i} style={styles.barColumn}>
                  <Text style={styles.barValue}>{d.minutes > 0 ? `${d.minutes}` : ''}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.bar, { height: Math.max(barHeight, 2), backgroundColor: isToday ? theme.colors.primary : 'rgba(109, 221, 255, 0.3)' }]} />
                  </View>
                  <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>{d.day}</Text>
                </View>
              );
            })}
          </View>
        </HudContainer>

        <SectionHeader title="Recent Sessions" icon={<Dumbbell color={theme.colors.primary} size={theme.iconSizes.sm} />} />
        {workoutSessions.map(w => (
          <View key={w.id} style={styles.recentCard}>
            <View style={[styles.recentDot, { backgroundColor: TYPE_COLORS[w.type] || theme.colors.primary }]} />
            <View style={styles.recentBody}><Text style={styles.recentDate}>{w.date}</Text><Text style={styles.recentType}>{w.type.toUpperCase()}</Text></View>
            <View style={styles.recentStats}>
              <View style={styles.recentStatItem}><Timer color={theme.colors.text.secondary} size={theme.iconSizes.sm} /><Text style={styles.recentStatText}>{w.duration}m</Text></View>
              <View style={styles.recentStatItem}><Flame color={theme.colors.text.secondary} size={theme.iconSizes.sm} /><Text style={styles.recentStatText}>{w.calories}</Text></View>
              <View style={styles.recentStatItem}><Dumbbell color={theme.colors.text.secondary} size={theme.iconSizes.sm} /><Text style={styles.recentStatText}>{w.exercises}</Text></View>
            </View>
          </View>
        ))}

        <SectionHeader title="Performance Stats" icon={<Trophy color={theme.colors.primary} size={theme.iconSizes.sm} />} />
        <View style={styles.prGrid}>
          <HudContainer style={styles.prCard}><Text style={styles.prExercise}>TOTAL WORKOUTS</Text><AnimatedCounter value={analytics.totalWorkouts} color={theme.colors.primary} style={styles.prValue} /></HudContainer>
          <HudContainer style={styles.prCard}><Text style={styles.prExercise}>TOTAL MINUTES</Text><AnimatedCounter value={analytics.totalMinutes} color="#FF6B6B" style={styles.prValue} /></HudContainer>
          <HudContainer style={styles.prCard}><Text style={styles.prExercise}>CALORIES BURNED</Text><AnimatedCounter value={analytics.totalCalories} color="#00FF99" style={styles.prValue} /></HudContainer>
          <HudContainer style={styles.prCard}><Text style={styles.prExercise}>CURRENT STREAK</Text><AnimatedCounter value={analytics.streakDays} color={theme.colors.primary} style={styles.prValue} /></HudContainer>
        </View>
        <View style={{ height: verticalScale(32) }} />
      </ScrollView>
      </Animated.View>
    </ScreenWrapper>
  );
});

const styles = StyleSheet.create({
  container: { padding: theme.spacing.lg },
  activeBanner: { marginBottom: theme.spacing.lg, padding: theme.spacing.lg },
  activeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  liveDot: { width: scale(8), height: scale(8), backgroundColor: theme.colors.danger, marginRight: scale(8) },
  activeLabel: { fontSize: fs(11), fontWeight: '800', color: theme.colors.danger, letterSpacing: 2 },
  timerDisplay: { fontSize: fs(48), fontWeight: '900', color: theme.colors.text.primary, textAlign: 'center', fontFamily: theme.fonts.heading },
  activeExercise: { textAlign: 'center', fontSize: fs(12), color: theme.colors.text.secondary, letterSpacing: 1, marginTop: verticalScale(4) },
  timerControls: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.xl, marginTop: theme.spacing.lg },
  controlBtn: { alignItems: 'center', borderWidth: 1, borderColor: theme.colors.bg.glassBorder, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
  controlLabel: { fontSize: fs(9), fontWeight: '700', color: theme.colors.primary, letterSpacing: 1.5, marginTop: verticalScale(4) },
  endBtn: { borderColor: theme.colors.danger + '40' },
  startCard: { marginBottom: 0, padding: theme.spacing.md },
  startRow: { flexDirection: 'row', alignItems: 'center' },
  startIconWrap: { width: scale(48), height: scale(48), borderWidth: 1, borderColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary + '15', marginRight: theme.spacing.md },
  startTitle: { fontSize: fs(14), fontWeight: '900', color: theme.colors.text.primary, letterSpacing: 2 },
  startSub: { fontSize: fs(11), color: theme.colors.text.secondary, marginTop: verticalScale(2) },
  summaryCard: { paddingVertical: theme.spacing.xl },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  chartCard: { paddingVertical: theme.spacing.lg },
  barsContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: verticalScale(120), paddingHorizontal: theme.spacing.sm },
  barColumn: { alignItems: 'center', flex: 1 },
  barValue: { fontSize: fs(9), color: theme.colors.text.secondary, marginBottom: verticalScale(4), fontWeight: '600' },
  barTrack: { height: verticalScale(80), justifyContent: 'flex-end', width: scale(18) },
  bar: { width: '100%', elevation: 2 },
  barLabel: { fontSize: fs(10), fontWeight: '700', color: theme.colors.text.secondary, marginTop: verticalScale(6), letterSpacing: 1 },
  barLabelToday: { color: theme.colors.primary },
  recentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.bg.glass, borderWidth: 1, borderColor: theme.colors.bg.glassBorder, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  recentDot: { width: scale(4), height: verticalScale(36), marginRight: theme.spacing.md },
  recentBody: { flex: 1 },
  recentDate: { fontSize: fs(13), fontWeight: '600', color: theme.colors.text.primary },
  recentType: { fontSize: fs(10), fontWeight: '700', color: theme.colors.text.secondary, letterSpacing: 1.5, marginTop: verticalScale(2) },
  recentStats: { flexDirection: 'row', gap: theme.spacing.md },
  recentStatItem: { flexDirection: 'row', alignItems: 'center', gap: scale(3) },
  recentStatText: { fontSize: fs(11), color: theme.colors.text.secondary, fontWeight: '600' },
  prGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  prCard: { width: '48%', marginBottom: theme.spacing.md, padding: theme.spacing.md },
  prExercise: { fontSize: fs(10), fontWeight: '700', color: theme.colors.text.secondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: verticalScale(4) },
  prValue: { fontSize: fs(20), fontWeight: '900', color: theme.colors.text.primary, fontFamily: theme.fonts.heading },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: theme.colors.text.secondary, fontSize: fs(14), fontWeight: '600', letterSpacing: 2 },
});