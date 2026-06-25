import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal,
} from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { theme } from '../../constants/theme';
import { scale, verticalScale, fontSize as fs } from '../../utils/responsive';
import { useAuthContext } from '../../context/AuthContext';
import {
  WorkoutPlannerService, CustomWorkoutPlan, WorkoutSession, CompletedExercise,
} from '../../services/workoutPlannerService';
import { StatsService, DailyProgressService } from '../../services/statsService';
import { Timer, X, Flame, Dumbbell } from 'lucide-react-native';

type RouteParams = { workoutId: string };

export function WorkoutSessionScreen({ route, navigation }: { route: { params: RouteParams }; navigation: any }) {
  const { user } = useAuthContext();
  const workoutId = route.params?.workoutId;

  const [workout, setWorkout] = useState<CustomWorkoutPlan | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<CompletedExercise[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const initSession = async () => {
      try {
        await WorkoutPlannerService.initialize(user?.id);
        const plan = WorkoutPlannerService.getWorkoutById(workoutId);
        if (!plan) {
          Alert.alert('ERROR', 'Workout not found', [{ text: 'OK', onPress: () => navigation.goBack() }]);
          return;
        }
        setWorkout(plan);
        const s = WorkoutPlannerService.startSession(workoutId);
        if (!s) {
          console.error('[WorkoutSessionScreen] startSession returned null for', workoutId);
          Alert.alert('SESSION ERROR', 'Unable to start workout session.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
          return;
        }
        setSession(s);
        setCompletedExercises(
          plan.exercises.map(ex => ({ ...ex, completed: false })),
        );

        timerRef.current = setInterval(() => {
          setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);
      } catch (err) {
        console.error('[WorkoutSessionScreen] initSession failed', err);
        Alert.alert('SESSION ERROR', 'An unexpected error occurred while starting the session.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    };

    initSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (restRef.current) clearInterval(restRef.current);
    };
  }, [workoutId, navigation, user?.id]);

  const currentExercise = workout?.exercises?.[exerciseIndex];
  const totalSets = currentExercise?.sets ?? 1;
  const restDuration = currentExercise?.restTime ?? workout?.restTime ?? 60;

  const startRest = (seconds: number) => {
    setIsResting(true);
    setRestSecondsLeft(seconds);
    if (restRef.current) clearInterval(restRef.current);
    restRef.current = setInterval(() => {
      setRestSecondsLeft(prev => {
        if (prev <= 1) {
          if (restRef.current) clearInterval(restRef.current);
          setIsResting(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const skipRest = () => {
    if (restRef.current) clearInterval(restRef.current);
    setIsResting(false);
    setRestSecondsLeft(0);
  };

  const advanceSetOrExercise = () => {
    if (!workout || !currentExercise) return;

    const nextSet = setIndex + 1;
    if (currentExercise.sets && nextSet < currentExercise.sets) {
      setSetIndex(nextSet);
      startRest(restDuration);
      return;
    }

    const updated = [...completedExercises];
    updated[exerciseIndex] = { ...updated[exerciseIndex], completed: true };
    setCompletedExercises(updated);

    const nextEx = exerciseIndex + 1;
    if (nextEx < workout.exercises.length) {
      setExerciseIndex(nextEx);
      setSetIndex(0);
      startRest(restDuration);
    } else {
      finishSession(updated);
    }
  };

  const finishSession = async (finalExercises: CompletedExercise[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSessionDone(true);

    const durationMin = Math.max(1, Math.round(elapsedSec / 60));
    const totalCalories = finalExercises.reduce((s, e) => s + (e.calories ?? 0), 0);

    if (session) {
      WorkoutPlannerService.completeSession(session.id, {
        totalDuration: durationMin,
        exercises: finalExercises,
        rating: 4,
      });
    }

    if (user?.id) {
      await StatsService.addXP(user.id, Math.min(100, 15 + durationMin));
      const { data: progress } = await DailyProgressService.getTodayProgress(user.id);
      await DailyProgressService.updateTodayProgress(user.id, {
        workout_minutes_current: (progress?.workout_minutes_current ?? 0) + durationMin,
        workouts_completed: (progress?.workouts_completed ?? 0) + 1,
      });
    }

    Alert.alert(
      'WORKOUT COMPLETE',
      `${durationMin} min · ~${totalCalories} kcal · +XP earned`,
      [{ text: 'DONE', onPress: () => navigation.goBack() }],
    );
  };

  const handleCompleteSet = () => advanceSetOrExercise();
  const handleSkipExercise = () => {
    if (!workout) return;
    const updated = [...completedExercises];
    updated[exerciseIndex] = { ...updated[exerciseIndex], completed: true };
    setCompletedExercises(updated);
    const nextEx = exerciseIndex + 1;
    if (nextEx < workout.exercises.length) {
      setExerciseIndex(nextEx);
      setSetIndex(0);
    } else {
      finishSession(updated);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!workout || !currentExercise) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>LOADING SESSION...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const exerciseCount = workout?.exercises?.length ?? 1;
  const progress = exerciseCount > 0
    ? (exerciseIndex + (setIndex + 1) / totalSets) / exerciseCount
    : 0;

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => {
            Alert.alert('END SESSION?', 'Progress will not be saved.', [
              { text: 'CANCEL', style: 'cancel' },
              { text: 'END', style: 'destructive', onPress: () => navigation.goBack() },
            ]);
          }}>
            <X color={theme.colors.danger} size={theme.iconSizes.xxl} />
          </TouchableOpacity>
          <Text style={styles.workoutName}>{workout.name}</Text>
          <Text style={styles.timerText}>{formatTime(elapsedSec)}</Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.exerciseLabel}>
            EXERCISE {exerciseIndex + 1} / {workout.exercises.length}
          </Text>
          <Text style={styles.exerciseName}>{currentExercise.name}</Text>

          {currentExercise.instructions ? (
            <Text style={styles.instructions}>{currentExercise.instructions}</Text>
          ) : null}

          <Card style={styles.setCard}>
            <Text style={styles.setLabel}>
              SET {setIndex + 1} OF {totalSets}
            </Text>
            <Text style={styles.setDetail}>
              {currentExercise.sets && currentExercise.reps
                ? `${currentExercise.reps} reps`
                : currentExercise.duration
                  ? `${currentExercise.duration}s hold`
                  : 'Complete when ready'}
            </Text>
            {currentExercise.weight ? (
              <Text style={styles.setDetail}>{currentExercise.weight} kg</Text>
            ) : null}
          </Card>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Flame color={theme.colors.warning} size={theme.iconSizes.sm} />
              <Text style={styles.metaText}>{currentExercise.calories ?? 0} kcal</Text>
            </View>
            <View style={styles.metaItem}>
              <Timer color={theme.colors.primary} size={theme.iconSizes.sm} />
              <Text style={styles.metaText}>Rest {restDuration}s</Text>
            </View>
          </View>

          {!sessionDone && (
            <>
              <Button title="COMPLETE SET" onPress={handleCompleteSet} style={styles.primaryBtn} />
              <Button
                title="SKIP EXERCISE"
                variant="outline"
                onPress={handleSkipExercise}
                style={styles.skipBtn}
              />
            </>
          )}

          <Text style={styles.upNextTitle}>UP NEXT</Text>
          {workout.exercises.slice(exerciseIndex + 1, exerciseIndex + 4).map((ex, i) => (
            <View key={ex.id} style={styles.upNextItem}>
              <Dumbbell color={theme.colors.textDimmed} size={theme.iconSizes.sm} />
              <Text style={styles.upNextName}>{ex.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <Modal visible={isResting} transparent animationType="fade">
        <View style={styles.restOverlay}>
          <Timer color={theme.colors.primary} size={scale(48)} />
          <Text style={styles.restTitle}>REST</Text>
          <Text style={styles.restTimer}>{restSecondsLeft}s</Text>
          <Text style={styles.restNext}>Next: {currentExercise.name}</Text>
          <Button title="SKIP REST" variant="outline" onPress={skipRest} style={{ marginTop: theme.spacing.xl }} />
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: theme.colors.textDimmed, letterSpacing: scale(2) },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  workoutName: { flex: 1, fontSize: fs(14), fontWeight: '700', color: theme.colors.text.primary, letterSpacing: scale(1) },
  timerText: { fontSize: fs(16), fontWeight: '900', color: theme.colors.primary },
  progressTrack: { height: verticalScale(3), backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: theme.spacing.lg },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary },
  content: { flex: 1, padding: theme.spacing.lg },
  exerciseLabel: { fontSize: fs(10), color: theme.colors.textDimmed, letterSpacing: scale(2) },
  exerciseName: { fontSize: fs(28), fontWeight: '900', color: theme.colors.text.primary, marginVertical: theme.spacing.sm },
  instructions: { fontSize: fs(13), color: theme.colors.textDimmed, lineHeight: fs(20), marginBottom: theme.spacing.lg },
  setCard: { padding: theme.spacing.lg, marginBottom: theme.spacing.md, alignItems: 'center' },
  setLabel: { fontSize: fs(12), color: theme.colors.secondary, letterSpacing: scale(2) },
  setDetail: { fontSize: fs(24), fontWeight: '900', color: theme.colors.primary, marginTop: theme.spacing.sm },
  metaRow: { flexDirection: 'row', gap: theme.spacing.lg, marginBottom: theme.spacing.lg },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  metaText: { fontSize: fs(12), color: theme.colors.textDimmed },
  primaryBtn: { marginBottom: theme.spacing.sm },
  skipBtn: { marginBottom: theme.spacing.xl },
  upNextTitle: { fontSize: fs(10), fontWeight: '700', color: theme.colors.textDimmed, letterSpacing: scale(2), marginBottom: theme.spacing.sm },
  upNextItem: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  upNextName: { fontSize: fs(13), color: theme.colors.textDimmed },
  restOverlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 14, 16, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  restTitle: { fontSize: fs(14), fontWeight: '700', color: theme.colors.textDimmed, letterSpacing: scale(3), marginTop: theme.spacing.lg },
  restTimer: { fontSize: fs(72), fontWeight: '900', color: theme.colors.primary, marginVertical: theme.spacing.md },
  restNext: { fontSize: fs(12), color: theme.colors.textDimmed },
});