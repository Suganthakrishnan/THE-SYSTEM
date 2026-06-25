import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Modal, Animated, FlatList,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { HudContainer } from '../../components/ui/HudContainer';
import { Button } from '../../components/ui/Button';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { GlowInput } from '../../components/ui/GlowInput';
import { theme } from '../../constants/theme';
import { scale, verticalScale, fontSize as fs, lineHeight } from '../../utils/responsive';
import { useAuthContext } from '../../context/AuthContext';
import { DailyProgressService } from '../../services/statsService';
import { ExerciseDatabaseService } from '../../services/exerciseDatabase';
import type { Exercise, WorkoutPlan } from '../../types/exercise';
import {
  Plus, Play, Clock, Flame, Dumbbell, Target,
  X, ChevronRight, Zap, Search,
} from 'lucide-react-native';



// ─── Component ───────────────────────────────────────────────
export function WorkoutPlanner({ navigation }: any) {
  const { user } = useAuthContext();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutPlan | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [customWorkout, setCustomWorkout] = useState<Partial<WorkoutPlan>>({
    name: '',
    type: 'custom',
    duration: 30,
    exercises: [],
    difficulty: 'intermediate',
    estimatedCalories: 200,
  });
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [premadeWorkouts, setPremadeWorkouts] = useState<WorkoutPlan[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('all');

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const MUSCLE_GROUPS = [
    { id: 'all', label: 'All' },
    { id: 'chest', label: 'Chest' },
    { id: 'back', label: 'Back' },
    { id: 'legs', label: 'Legs' },
    { id: 'arms', label: 'Arms' },
    { id: 'core', label: 'Core' },
    { id: 'full_body', label: 'Full Body' },
  ];

  // Initialize exercise database
  useEffect(() => {
    const initializeData = async () => {
      await ExerciseDatabaseService.initialize();
      
      // Get pre-made workouts
      const workouts = ExerciseDatabaseService.getPreMadeWorkouts();
      setPremadeWorkouts(workouts);
      
      // Get all exercises
      const exercises = ExerciseDatabaseService.getAllExercises().map(ex => ({
        id: ex.id,
        name: ex.name,
        type: (ex.category === 'strength' ? 'strength' : 
              ex.category === 'cardio' ? 'cardio' : 
              ex.category === 'stretching' ? 'flexibility' : 'core') as 'strength' | 'cardio' | 'flexibility' | 'core',
        sets: ex.category === 'strength' ? 3 : undefined,
        reps: ex.category === 'strength' ? 12 : undefined,
        duration: ex.category === 'cardio' ? 60 : 
                 ex.category === 'stretching' ? 30 : undefined,
        calories: Math.round(Math.random() * 10) + 5, // Placeholder calories
        instructions: ex.instructions.slice(0, 2).join(' '),
      }));
      setAllExercises(exercises);
      setFilteredExercises(exercises);
    };
    
    initializeData();
  }, []);

  // Filter exercises based on search and filters
  useEffect(() => {
    let filtered = allExercises;
    
    if (searchQuery) {
      filtered = filtered.filter(ex => 
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(ex => ex.type === selectedCategory);
    }
    
    if (customWorkout.type && customWorkout.type !== 'custom') {
      filtered = filtered.filter(ex => ex.type === customWorkout.type);
    }
    
    setFilteredExercises(filtered);
  }, [allExercises, searchQuery, selectedCategory, customWorkout.type]);

  const handleSelectWorkout = (workout: WorkoutPlan) => {
    setSelectedWorkout(workout);
  };

  const handleStartWorkout = async () => {
    if (!selectedWorkout || !user?.id) return;
    
    setIsStartingWorkout(true);
    
    try {
      // Update today's progress with planned workout
      await DailyProgressService.updateTodayProgress(user.id, {
        workout_minutes_current: selectedWorkout.duration,
        workouts_completed: 1,
        calories_current: selectedWorkout.estimatedCalories,
      });
      
      Alert.alert(
        'WORKOUT STARTED!',
        `Starting ${selectedWorkout.name}. Good luck! 💪`,
        [{ text: 'LET\'S GO!', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('ERROR', 'Failed to start workout.');
    } finally {
      setIsStartingWorkout(false);
    }
  };

  const handleCreateCustomWorkout = () => {
    if (!customWorkout.name || selectedExercises.length === 0) {
      Alert.alert('ERROR', 'Please add workout name and at least one exercise.');
      return;
    }
    
    const totalCalories = selectedExercises.reduce((sum, ex) => sum + (ex.calories || 0), 0);
    const totalDuration = selectedExercises.reduce((sum, ex) => {
      if (ex.duration) return sum + ex.duration;
      if (ex.sets && ex.reps) return sum + (ex.sets * ex.reps * 3); // 3 seconds per rep
      return sum + 30;
    }, 0);
    
    const newWorkout: WorkoutPlan = {
      id: Date.now().toString(),
      name: customWorkout.name,
      type: customWorkout.type as any,
      duration: Math.ceil(totalDuration / 60),
      exercises: selectedExercises,
      difficulty: customWorkout.difficulty as any,
      estimatedCalories: totalCalories,
    };
    
    setSelectedWorkout(newWorkout);
    setShowCreateModal(false);
    Alert.alert('SUCCESS', 'Custom workout created successfully!');
  };

  const handleAddExercise = (exercise: Exercise) => {
    if (selectedExercises.find(ex => ex.id === exercise.id)) {
      Alert.alert('CHILL', 'chill u already selected this buddy');
    } else {
      setSelectedExercises(prev => [...prev, exercise]);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return theme.colors.success;
      case 'intermediate': return '#FFD93D';
      case 'advanced': return theme.colors.danger;
      default: return theme.colors.primary;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'strength': return <Dumbbell size={16} />;
      case 'cardio': return <Flame size={16} />;
      case 'mixed': return <Target size={16} />;
      case 'custom': return <Zap size={16} />;
      default: return <Clock size={16} />;
    }
  };

  return (
    <ScreenWrapper>
      <Animated.View style={{ opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          
          {/* ══════ QUICK START ══════ */}
          <SectionHeader
            title="Quick Start"
            icon={<Play color={theme.colors.primary} size={14} />}
          />
        
          {selectedWorkout ? (
            <HudContainer style={styles.selectedWorkoutCard}>
              <View style={styles.selectedHeader}>
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName}>{selectedWorkout.name}</Text>
                  <View style={styles.selectedMeta}>
                    <View style={styles.metaItem}>
                      {getTypeIcon(selectedWorkout.type)}
                      <Text style={styles.metaText}>{selectedWorkout.type.toUpperCase()}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock color={theme.colors.text.secondary} size={12} />
                      <Text style={styles.metaText}>{selectedWorkout.duration}m</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Flame color={theme.colors.text.secondary} size={12} />
                      <Text style={styles.metaText}>{selectedWorkout.estimatedCalories} kcal</Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(selectedWorkout.difficulty) + '20' }]}>
                <Text style={[styles.difficultyText, { color: getDifficultyColor(selectedWorkout.difficulty) }]}>
                  {selectedWorkout.difficulty.toUpperCase()}
                </Text>
              </View>
            </View>
            
            <View style={styles.exercisesList}>
              <Text style={styles.exercisesTitle}>EXERCISES ({selectedWorkout.exercises.length})</Text>
              {selectedWorkout.exercises.map((exercise, index) => (
                <View key={exercise.id} style={styles.exerciseItem}>
                  <Text style={styles.exerciseNumber}>{index + 1}</Text>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseDetails}>
                      {exercise.sets && exercise.reps ? `${exercise.sets} sets × ${exercise.reps} reps` : `${exercise.duration}s`}
                    </Text>
                  </View>
                  <Text style={styles.exerciseCalories}>{exercise.calories} kcal</Text>
                </View>
              ))}
            </View>
            
            <Button
              title={isStartingWorkout ? 'STARTING...' : 'START WORKOUT'}
              onPress={handleStartWorkout}
              isLoading={isStartingWorkout}
              style={styles.startBtn}
            />
          </HudContainer>
          ) : (
            <HudContainer style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>NO WORKOUT SELECTED</Text>
              <Text style={styles.emptySubtext}>Choose a pre-made workout or create your own</Text>
            </HudContainer>
          )}

        {/* ══════ PRE-MADE WORKOUTS ══════ */}
        <SectionHeader
          title="Pre-made Workouts"
          icon={<Target color={theme.colors.primary} size={14} />}
        />
        
          {premadeWorkouts.map((workout: WorkoutPlan) => (
            <TouchableOpacity
              key={workout.id}
              style={[
                styles.workoutCard,
                selectedWorkout?.id === workout.id && styles.workoutCardSelected
              ]}
              onPress={() => handleSelectWorkout(workout)}
              activeOpacity={0.7}
            >
              <View style={styles.workoutLeft}>
                <View style={styles.workoutIcon}>
                  {getTypeIcon(workout.type)}
                </View>
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutName}>{workout.name}</Text>
                  <View style={styles.workoutMeta}>
                    <Text style={styles.workoutDuration}>{workout.duration}m</Text>
                    <Text style={styles.workoutCalories}>{workout.estimatedCalories} kcal</Text>
                    <Text style={[styles.workoutDifficulty, { color: getDifficultyColor(workout.difficulty) }]}>
                      {workout.difficulty}
                    </Text>
                  </View>
                </View>
              </View>
              <ChevronRight color={selectedWorkout?.id === workout.id ? theme.colors.primary : theme.colors.text.secondary} size={18} />
            </TouchableOpacity>
          ))}

        {/* ══════ CREATE CUSTOM ══════ */}
        <SectionHeader
          title="Create Custom"
          icon={<Plus color={theme.colors.primary} size={14} />}
        />
        
        <TouchableOpacity
          style={styles.createCard}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.createLeft}>
            <View style={styles.createIcon}>
              <Zap color={theme.colors.primary} size={20} />
            </View>
            <View>
              <Text style={styles.createTitle}>Build Custom Workout</Text>
              <Text style={styles.createSubtext}>Create your own workout plan</Text>
            </View>
          </View>
          <ChevronRight color={theme.colors.text} size={18} />
        </TouchableOpacity>

          <View style={{ height: verticalScale(32) }} />
        </ScrollView>
      </Animated.View>
      
      {/* Create Custom Workout Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CREATE WORKOUT</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X color={theme.colors.text.secondary} size={22} />
              </TouchableOpacity>
            </View>
            
            <GlowInput
              label="WORKOUT NAME"
              value={customWorkout.name}
              onChangeText={(text) => setCustomWorkout(prev => ({ ...prev, name: text }))}
              placeholder="Enter workout name"
            />
            
            <Text style={styles.inputLabel}>WORKOUT TYPE</Text>
            <View style={styles.optionRow}>
              {['strength', 'cardio', 'mixed'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.optionBtn, customWorkout.type === type && styles.optionBtnActive]}
                  onPress={() => setCustomWorkout(prev => ({ ...prev, type: type as any }))}
                >
                  <Text style={[styles.optionText, customWorkout.type === type && styles.optionTextActive]}>
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ height: theme.spacing.lg }} />
            
            <TouchableOpacity
              style={styles.addExercisesBtn}
              onPress={() => setShowExerciseModal(true)}
            >
              <Plus color={theme.colors.text} size={18} />
              <Text style={styles.addExercisesText}>
                ADD EXERCISES ({selectedExercises.length})
              </Text>
            </TouchableOpacity>

            <View style={{ height: theme.spacing.xl }} />

            <Button
              title="CREATE WORKOUT"
              onPress={handleCreateCustomWorkout}
              style={{ marginTop: 0 }}
            />
          </View>
        </View>
      </Modal>
      
      {/* Exercise Selection Modal */}
      <Modal visible={showExerciseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SELECT EXERCISES</Text>
              <TouchableOpacity onPress={() => setShowExerciseModal(false)}>
                <X color={theme.colors.text.primary} size={22} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: verticalScale(400) }}>
              <View style={styles.searchContainer}>
                <GlowInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search exercises..."
                />
              </View>
              
              <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {MUSCLE_GROUPS.map(group => (
                    <TouchableOpacity
                      key={group.id}
                      style={[
                        styles.filterChip,
                        selectedMuscleGroup === group.id && styles.filterChipActive
                      ]}
                      onPress={() => setSelectedMuscleGroup(selectedMuscleGroup === group.id ? 'all' : group.id)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedMuscleGroup === group.id && styles.filterChipTextActive
                      ]}>
                        {group.label.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              {filteredExercises.slice(0, 50).map((exercise: Exercise) => {
                const isSelected = selectedExercises.find(ex => ex.id === exercise.id);
                return (
                  <TouchableOpacity
                    key={exercise.id}
                    style={[styles.exerciseOption, isSelected && styles.exerciseOptionSelected]}
                    onPress={() => handleAddExercise(exercise)}
                  >
                    <View style={styles.exerciseOptionLeft}>
                      <View style={[styles.exerciseTypeIcon, { backgroundColor: getDifficultyColor('intermediate') + '20' }]}>
                        {getTypeIcon(exercise.type)}
                      </View>
                      <View style={styles.exerciseOptionInfo}>
                        <Text style={styles.exerciseOptionName}>{exercise.name}</Text>
                        <Text style={styles.exerciseOptionDetails}>
                          {exercise.sets && exercise.reps ? `${exercise.sets} × ${exercise.reps}` : `${exercise.duration}s`}
                        </Text>
                        <Text style={styles.exerciseOptionCalories}>{exercise.calories} kcal</Text>
                      </View>
                    </View>
                    <View style={[styles.exerciseCheckbox, isSelected && styles.exerciseCheckboxSelected]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <Button
              title={`SELECT ${selectedExercises.length} EXERCISES`}
              onPress={() => setShowExerciseModal(false)}
              style={{ marginTop: theme.spacing.lg }}
            />
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { padding: theme.spacing.lg },
  
  // Selected workout card
  selectedWorkoutCard: { marginBottom: theme.spacing.lg },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  selectedInfo: { flex: 1 },
  selectedName: {
    fontSize: fs(18),
    fontWeight: '900',
    color: theme.colors.text.primary,
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.heading,
  },
  selectedMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: fs(10),
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: 1,
  },
  difficultyBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.border.radius.sm,
  },
  difficultyText: {
    fontSize: fs(9),
    fontWeight: '800',
    letterSpacing: 1,
  },
  
  // Exercises list
  exercisesList: { marginBottom: theme.spacing.lg },
  exercisesTitle: {
    fontSize: fs(12),
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: 1.5,
    marginBottom: theme.spacing.sm,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bg.glassBorder,
  },
  exerciseNumber: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: theme.colors.primary + '20',
    textAlign: 'center',
    lineHeight: lineHeight(fs(12)),
    fontSize: fs(12),
    fontWeight: '700',
    color: theme.colors.primary,
    marginRight: theme.spacing.md,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: {
    fontSize: fs(14),
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  exerciseDetails: {
    fontSize: fs(11),
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  exerciseCalories: {
    fontSize: fs(11),
    fontWeight: '600',
    color: theme.colors.primary,
  },
  
  // Start button
  startBtn: {
    ...theme.glow.cyan,
  },
  
  // Empty state
  emptyCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: 2,
  },
  emptySubtext: {
    fontSize: fs(11),
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  
  // Workout cards
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bg.glass,
    borderWidth: 1,
    borderColor: theme.colors.bg.glassBorder,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  workoutCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '15',
  },
  workoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workoutIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  workoutInfo: { flex: 1 },
  workoutName: {
    fontSize: fs(14),
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  workoutMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  workoutDuration: {
    fontSize: fs(10),
    color: '#FFFFFF',
  },
  workoutCalories: {
    fontSize: fs(10),
    color: '#FFFFFF',
  },
  workoutDifficulty: {
    fontSize: fs(10),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Create card
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bg.glass,
    borderWidth: 1,
    borderColor: theme.colors.bg.glassBorder,
    padding: theme.spacing.md,
  },
  createLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  createIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  createTitle: {
    fontSize: fs(14),
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  createSubtext: {
    fontSize: fs(11),
    color: '#FFFFFF',
    marginTop: 2,
  },
  
  // Modal
  dragHandle: {
    width: scale(40),
    height: verticalScale(4),
    backgroundColor: theme.colors.bg.glassBorder,
    borderRadius: scale(2),
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: theme.colors.bg.glassBorder,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    maxHeight: '90%',
    zIndex: 1001,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: fs(16),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  inputLabel: {
    fontSize: fs(10),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginBottom: 4,
    marginTop: theme.spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: 4,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.bg.glassBorder,
    alignItems: 'center',
  },
  optionBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '15',
  },
  optionText: {
    fontSize: fs(11),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  optionTextActive: {
    color: theme.colors.primary,
  },
  
  // Add exercises button
  addExercisesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.border.radius.md,
    marginTop: theme.spacing.md,
  },
  addExercisesText: {
    fontSize: fs(13),
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  
  // Exercise options
  exerciseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bg.glassBorder,
  },
  exerciseOptionSelected: {
    backgroundColor: theme.colors.primary + '15',
  },
  exerciseOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseTypeIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  exerciseOptionInfo: { flex: 1 },
  exerciseOptionName: {
    fontSize: fs(14),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  exerciseOptionDetails: {
    fontSize: fs(11),
    color: '#FFFFFF',
    marginTop: 2,
  },
  exerciseOptionCalories: {
    fontSize: fs(10),
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 2,
  },
  exerciseCheckbox: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: theme.colors.bg.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseCheckboxSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.bg.base,
    fontSize: fs(14),
    fontWeight: '700',
  },
  
  // Search and filter styles
  searchContainer: {
    marginBottom: theme.spacing.md,
  },
  filterContainer: {
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.bg.glassBorder,
    borderRadius: theme.border.radius.sm,
    marginRight: theme.spacing.sm,
  },
  filterChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '15',
  },
  filterChipText: {
    fontSize: fs(10),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  filterChipTextActive: {
    color: theme.colors.primary,
  },
});
