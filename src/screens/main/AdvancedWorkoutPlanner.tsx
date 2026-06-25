import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Modal, TextInput, Animated, FlatList, PanResponder,
} from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { HudContainer } from '../../components/ui/HudContainer';
import { Button } from '../../components/ui/Button';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { theme } from '../../constants/theme';
import { scale, verticalScale, fontSize as fs, lineHeight } from '../../utils/responsive';
import { useAuthContext } from '../../context/AuthContext';
import { WorkoutPlannerService } from '../../services/workoutPlannerService';
import { ComprehensiveGymDatabase } from '../../services/comprehensiveGymDatabase';
import type { CustomWorkoutPlan, WorkoutTemplate, CustomExercise } from '../../services/workoutPlannerService';
import type { Exercise } from '../../types/exercise';
import {
  Plus, Play, Clock, Flame, Dumbbell, Target, Calendar,
  X, ChevronRight, Zap, Timer, BarChart3, Search, Filter,
  GripVertical, Edit3, Trash2, Copy, Star, Users, Heart,
  TrendingUp, Award, Settings, ChevronDown, ChevronUp,
} from 'lucide-react-native';

// ─── Component ───────────────────────────────────────────────
export function AdvancedWorkoutPlanner({ navigation }: any) {
  const { user } = useAuthContext();
  
  // Main state
  const [activeTab, setActiveTab] = useState<'myWorkouts' | 'templates' | 'create'>('myWorkouts');
  const [customWorkouts, setCustomWorkouts] = useState<CustomWorkoutPlan[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<CustomWorkoutPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create workout state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
  const [customWorkout, setCustomWorkout] = useState<Partial<CustomWorkoutPlan>>({
    name: '',
    description: '',
    type: 'custom',
    duration: 30,
    exercises: [],
    difficulty: 'intermediate',
    targetMuscles: [],
    estimatedCalories: 0,
    equipment: [],
    tags: [],
    isPublic: false,
    restTime: 60,
    warmupDuration: 5,
    cooldownDuration: 5,
  });
  const [allExercises, setAllExercises] = useState<CustomExercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<CustomExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  // Separate filter state for templates tab to avoid conflicts with exercise library filter
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('');
  
  // UI state
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<CustomExercise | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [recentSessions, setRecentSessions] = useState<ReturnType<typeof WorkoutPlannerService.getUserSessions>>([]);
  const [showExerciseEditModal, setShowExerciseEditModal] = useState(false);
  const [editingExerciseData, setEditingExerciseData] = useState<{
    sets: number;
    reps: number;
    weight: number;
    restTime: number;
  }>({
    sets: 3,
    reps: 12,
    weight: 0,
    restTime: 60,
  });

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        
        // Initialize services
        await WorkoutPlannerService.initialize(user?.id);
        await ComprehensiveGymDatabase.initialize();
        
        // Load data
        const userWorkouts = user ? WorkoutPlannerService.getUserWorkouts(user.id) : [];
        const allTemplates = WorkoutPlannerService.getTemplates();
        const exercises = ComprehensiveGymDatabase.getAllExercises().map((ex, index) => ({
          id: ex.id,
          name: ex.name,
          type: ex.type,
          order: index + 1,
          sets: ex.sets,
          reps: ex.reps,
          duration: ex.duration,
          calories: ex.calories,
          instructions: ex.instructions,
          equipmentType: ex.equipmentType,
        }));
        
        setCustomWorkouts(userWorkouts);
        setRecentSessions(user ? WorkoutPlannerService.getUserSessions(user.id).slice(0, 5) : []);
        setTemplates(allTemplates);
        setAllExercises(exercises);
        setFilteredExercises(exercises);
        
      } catch (error) {
        console.error('Error initializing workout planner:', error);
        Alert.alert('ERROR', 'Failed to load workout data');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, [user]);

  useEffect(() => {
    const unsub = navigation?.addListener?.('focus', () => {
      if (!user?.id) return;
      setCustomWorkouts(WorkoutPlannerService.getUserWorkouts(user.id));
      setRecentSessions(WorkoutPlannerService.getUserSessions(user.id).slice(0, 5));
    });
    return unsub;
  }, [navigation, user?.id]);

  // Filter exercises
  useEffect(() => {
    let filtered = allExercises;
    
    if (searchQuery) {
      filtered = filtered.filter(ex => 
        ex.name.toLowerCase().includes(searchQuery)
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(ex => ex.type === selectedCategory);
    }
    
    if (selectedEquipment) {
      filtered = filtered.filter(ex =>
        (ex as any).equipmentType === selectedEquipment,
      );
    }
    
    setFilteredExercises(filtered);
  }, [allExercises, searchQuery, selectedCategory, selectedEquipment]);

  // Filter templates by category
  const filteredTemplates = React.useMemo(() => {
    if (!templateCategoryFilter) return templates;
    return templates.filter(t => t.category === templateCategoryFilter);
  }, [templates, templateCategoryFilter]);

  // Create workout
  const handleCreateWorkout = () => {
    if (!customWorkout.name || customWorkout.exercises!.length === 0) {
      Alert.alert('ERROR', 'Please add workout name and at least one exercise');
      return;
    }
    
    if (!user) {
      Alert.alert('ERROR', 'Please login to create workouts');
      return;
    }
    
    try {
      const newWorkout = WorkoutPlannerService.saveCustomWorkout({
        userId: user.id,
        name: customWorkout.name!,
        description: customWorkout.description,
        type: customWorkout.type ?? 'custom',
        duration: customWorkout.duration ?? 30,
        exercises: customWorkout.exercises!,
        difficulty: customWorkout.difficulty ?? 'intermediate',
        targetMuscles: customWorkout.targetMuscles ?? [],
        estimatedCalories: customWorkout.estimatedCalories ?? 0,
        equipment: customWorkout.equipment ?? [],
        tags: customWorkout.tags ?? [],
        isPublic: false,
        restTime: customWorkout.restTime ?? 60,
        warmupDuration: customWorkout.warmupDuration ?? 5,
        cooldownDuration: customWorkout.cooldownDuration ?? 5,
      });
      
      setCustomWorkouts(prev => [...prev, newWorkout]);
      setShowCreateModal(false);
      setCustomWorkout({
        name: '',
        description: '',
        type: 'custom',
        duration: 30,
        exercises: [],
        difficulty: 'intermediate',
        targetMuscles: [],
        estimatedCalories: 0,
        equipment: [],
        tags: [],
        isPublic: false,
        restTime: 60,
        warmupDuration: 5,
        cooldownDuration: 5,
      });
      
      Alert.alert('SUCCESS', 'Workout created successfully!');
    } catch (error) {
      Alert.alert('ERROR', 'Failed to create workout');
    }
  };

  // Add exercise to workout
  const handleAddExercise = (exercise: Exercise) => {
    if (customWorkout.exercises?.find(ex => ex.id === exercise.id)) {
      Alert.alert('CHILL', 'chill u already selected this buddy');
      return;
    }

    const customExercise: CustomExercise = {
      ...exercise,
      order: customWorkout.exercises!.length + 1,
      sets: exercise.type === 'strength' ? 3 : undefined,
      reps: exercise.type === 'strength' ? 12 : undefined,
      duration: exercise.type === 'cardio' ? 60 : 
               exercise.type === 'flexibility' ? 30 : undefined,
      restTime: 60,
    };
    
    setCustomWorkout(prev => ({
      ...prev,
      exercises: [...(prev.exercises || []), customExercise],
      estimatedCalories: (prev.estimatedCalories || 0) + (exercise.calories || 0),
    }));
  };

  // Remove exercise from workout
  const handleRemoveExercise = (exerciseId: string) => {
    const exercise = customWorkout.exercises?.find(ex => ex.id === exerciseId);
    if (!exercise) return;
    
    setCustomWorkout(prev => ({
      ...prev,
      exercises: prev.exercises?.filter(ex => ex.id !== exerciseId) || [],
      estimatedCalories: Math.max(0, (prev.estimatedCalories || 0) - (exercise.calories || 0)),
    }));
  };

  // Edit exercise in workout
  const handleEditExercise = (exercise: CustomExercise) => {
    setEditingExercise(exercise);
    setEditingExerciseData({
      sets: exercise.sets || 3,
      reps: exercise.reps || 12,
      weight: (exercise as any).weight || 0,
      restTime: exercise.restTime || 60,
    });
    setShowExerciseEditModal(true);
  };

  // Save edited exercise
  const handleSaveExerciseEdit = () => {
    if (!editingExercise) return;
    
    setCustomWorkout(prev => ({
      ...prev,
      exercises: prev.exercises?.map(ex => 
        ex.id === editingExercise.id 
          ? { 
              ...ex, 
              sets: editingExerciseData.sets, 
              reps: editingExerciseData.reps,
              restTime: editingExerciseData.restTime,
              ...(editingExerciseData.weight > 0 && { weight: editingExerciseData.weight })
            } 
          : ex
      ) || [],
    }));
    
    setShowExerciseEditModal(false);
    setEditingExercise(null);
  };

  // Create workout from template
  const handleCreateFromTemplate = (template: WorkoutTemplate) => {
    if (!user) {
      Alert.alert('ERROR', 'Please login to create workouts');
      return;
    }
    
    try {
      const newWorkout = WorkoutPlannerService.createWorkoutFromTemplate(template.id, user.id);
      setCustomWorkouts([...customWorkouts, newWorkout]);
      Alert.alert('SUCCESS', 'Workout created from template!');
    } catch (error) {
      Alert.alert('ERROR', 'Failed to create workout from template');
    }
  };

  // Start workout — navigate to live session with rest timer
  const handleStartWorkout = (workout: CustomWorkoutPlan) => {
    if (!workout.exercises.length) {
      Alert.alert('ERROR', 'Add exercises before starting this workout.');
      return;
    }
    navigation.navigate('WorkoutSession', { workoutId: workout.id });
  };

  // Delete workout
  const handleDeleteWorkout = (workoutId: string) => {
    Alert.alert(
      'DELETE WORKOUT',
      'Are you sure you want to delete this workout?',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'DELETE',
          style: 'destructive',
          onPress: () => {
            const success = WorkoutPlannerService.deleteCustomWorkout(workoutId);
            if (success) {
              setCustomWorkouts(customWorkouts.filter(w => w.id !== workoutId));
              Alert.alert('SUCCESS', 'Workout deleted');
            } else {
              Alert.alert('ERROR', 'Failed to delete workout');
            }
          },
        },
      ]
    );
  };

  // Duplicate workout
  const handleDuplicateWorkout = (workout: CustomWorkoutPlan) => {
    const duplicate = WorkoutPlannerService.duplicateWorkout(workout.id);
    if (duplicate && user) {
      duplicate.userId = user.id;
      setCustomWorkouts([...customWorkouts, duplicate]);
      Alert.alert('SUCCESS', 'Workout duplicated');
    }
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>LOADING WORKOUT PLANNER...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>WORKOUT PLANNER</Text>
          <Text style={styles.subtitle}>Create custom workouts from 800+ exercises</Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { key: 'myWorkouts', label: 'My Workouts', icon: Dumbbell },
            { key: 'templates', label: 'Templates', icon: Target },
            { key: 'create', label: 'Create', icon: Plus },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive,
              ]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <tab.icon
                size={16}
                color={activeTab === tab.key ? theme.colors.primary : theme.colors.textDimmed}
              />
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* My Workouts Tab */}
          {activeTab === 'myWorkouts' && (
            <View>
              {recentSessions.length > 0 && (
                <>
                  <SectionHeader title="Recent Sessions" icon={<BarChart3 color={theme.colors.primary} size={14} />} />
                  {recentSessions.map(sess => {
                    const plan = WorkoutPlannerService.getWorkoutById(sess.workoutPlanId);
                    return (
                      <Card key={sess.id} style={styles.sessionCard}>
                        <Text style={styles.sessionName}>{plan?.name ?? 'Workout'}</Text>
                        <Text style={styles.sessionMeta}>
                          {new Date(sess.date).toLocaleDateString()} · {sess.totalDuration}m · {sess.totalCalories} kcal
                        </Text>
                      </Card>
                    );
                  })}
                </>
              )}
              {customWorkouts.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>NO WORKOUTS YET</Text>
                  <Text style={styles.emptySubtext}>Create your first custom workout</Text>
                  <Button
                    title="CREATE WORKOUT"
                    onPress={() => setActiveTab('create')}
                    style={styles.emptyButton}
                  />
                </Card>
              ) : (
                customWorkouts.map(workout => (
                  <Card key={workout.id} style={styles.workoutCard}>
                    <View style={styles.workoutHeader}>
                      <View style={styles.workoutInfo}>
                        <Text style={styles.workoutName}>{workout.name}</Text>
                        <Text style={styles.workoutDescription}>{workout.description}</Text>
                        <View style={styles.workoutMeta}>
                          <View style={styles.metaItem}>
                            <Clock color={theme.colors.textDimmed} size={12} />
                            <Text style={styles.metaText}>{workout.duration}m</Text>
                          </View>
                          <View style={styles.metaItem}>
                            <Flame color={theme.colors.textDimmed} size={12} />
                            <Text style={styles.metaText}>{workout.estimatedCalories} kcal</Text>
                          </View>
                          <View style={styles.metaItem}>
                            <Dumbbell color={theme.colors.textDimmed} size={12} />
                            <Text style={styles.metaText}>{workout.exercises.length} exercises</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.workoutActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleStartWorkout(workout)}
                        >
                          <Play color={theme.colors.primary} size={16} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDuplicateWorkout(workout)}
                        >
                          <Copy color={theme.colors.textDimmed} size={16} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDeleteWorkout(workout.id)}
                        >
                          <Trash2 color={theme.colors.danger} size={16} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    {expandedWorkout === workout.id && (
                      <View style={styles.workoutDetails}>
                        <Text style={styles.exercisesTitle}>EXERCISES</Text>
                        {workout.exercises.map((exercise, index) => (
                          <View key={exercise.id} style={styles.exerciseItem}>
                            <Text style={styles.exerciseNumber}>{index + 1}</Text>
                            <View style={styles.exerciseInfo}>
                              <Text style={styles.exerciseName}>{exercise.name}</Text>
                              <Text style={styles.exerciseDetails}>
                                {exercise.sets && exercise.reps ? `${exercise.sets} × ${exercise.reps}` : `${exercise.duration}s`}
                              </Text>
                            </View>
                            <Text style={styles.exerciseCalories}>{exercise.calories} kcal</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    <TouchableOpacity
                      style={styles.expandButton}
                      onPress={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}
                    >
                      {expandedWorkout === workout.id ? (
                        <ChevronUp color={theme.colors.textDimmed} size={16} />
                      ) : (
                        <ChevronDown color={theme.colors.textDimmed} size={16} />
                      )}
                    </TouchableOpacity>
                  </Card>
                ))
              )}
            </View>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <View>
              <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['all', 'strength', 'cardio', 'hiit', 'yoga', 'pilates'].map(category => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.filterChip,
                        templateCategoryFilter === category && styles.filterChipActive,
                      ]}
                      onPress={() => setTemplateCategoryFilter(category === 'all' ? '' : category)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        templateCategoryFilter === category && styles.filterChipTextActive,
                      ]}>
                        {category.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {filteredTemplates.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>NO TEMPLATES FOUND</Text>
                  <Text style={styles.emptySubtext}>Try selecting a different category</Text>
                </Card>
              ) : (
                filteredTemplates.map(template => (
                  <Card key={template.id} style={styles.templateCard}>
                    <View style={styles.templateHeader}>
                      <View style={styles.templateInfo}>
                        <Text style={styles.templateName}>{template.name}</Text>
                        <Text style={styles.templateDescription}>{template.description}</Text>
                        <View style={styles.templateMeta}>
                          <View style={styles.metaItem}>
                            <Clock color={theme.colors.textDimmed} size={12} />
                            <Text style={styles.metaText}>{template.duration}m</Text>
                          </View>
                          <View style={styles.metaItem}>
                            <Star color={theme.colors.warning} size={12} />
                            <Text style={styles.metaText}>{template.rating}</Text>
                          </View>
                          <View style={styles.metaItem}>
                            <Users color={theme.colors.textDimmed} size={12} />
                            <Text style={styles.metaText}>{template.uses}</Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.templateCreateButton}
                        onPress={() => handleCreateFromTemplate(template)}
                      >
                        <Plus color={theme.colors.primary} size={20} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.templateTags}>
                      {template.tags.map(tag => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </Card>
                ))
              )}
            </View>
          )}

          {/* Create Tab */}
          {activeTab === 'create' && (
            <View>
              <Card style={styles.createCard}>
                <Text style={styles.createTitle}>CREATE CUSTOM WORKOUT</Text>
                
                <Text style={styles.inputLabel}>WORKOUT NAME</Text>
                <TextInput
                  style={styles.input}
                  value={customWorkout.name}
                  onChangeText={(text) => setCustomWorkout(prev => ({ ...prev, name: text }))}
                  placeholder="Enter workout name"
                  placeholderTextColor={theme.colors.textDimmed + '60'}
                />
                
                <Text style={styles.inputLabel}>DESCRIPTION</Text>
                <TextInput
                  style={[styles.input, { height: verticalScale(60) }]}
                  value={customWorkout.description}
                  onChangeText={(text) => setCustomWorkout(prev => ({ ...prev, description: text }))}
                  placeholder="Describe your workout"
                  placeholderTextColor={theme.colors.textDimmed + '60'}
                  multiline
                />
                
                <View style={styles.row}>
                  <View style={styles.half}>
                    <Text style={styles.inputLabel}>TYPE</Text>
                    <View style={styles.optionRow}>
                      {['strength', 'cardio', 'mixed', 'hiit', 'yoga'].map(type => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.optionBtn,
                            customWorkout.type === type && styles.optionBtnActive,
                          ]}
                          onPress={() => setCustomWorkout(prev => ({ ...prev, type: type as any }))}
                        >
                          <Text style={[
                            styles.optionText,
                            customWorkout.type === type && styles.optionTextActive,
                          ]}>
                            {type.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                </View>
                
                <View style={styles.row}>
                  <View style={styles.half}>
                    <Text style={styles.inputLabel}>DURATION (MIN)</Text>
                    <TextInput
                      style={styles.input}
                      value={customWorkout.duration?.toString()}
                      onChangeText={(text) => setCustomWorkout(prev => ({ ...prev, duration: parseInt(text) || 0 }))}
                      placeholder="30"
                      placeholderTextColor={theme.colors.textDimmed + '60'}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.half}>
                    <Text style={styles.inputLabel}>REST BETWEEN SETS (SEC)</Text>
                    <TextInput
                      style={styles.input}
                      value={String(customWorkout.restTime ?? 60)}
                      onChangeText={(text) => setCustomWorkout(prev => ({ ...prev, restTime: parseInt(text) || 60 }))}
                      placeholder="60"
                      placeholderTextColor={theme.colors.textDimmed + '60'}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.addExercisesBtn}
                  onPress={() => setShowExerciseLibrary(true)}
                >
                  <Plus color={theme.colors.primary} size={16} />
                  <Text style={styles.addExercisesText}>
                    ADD EXERCISES ({customWorkout.exercises?.length || 0})
                  </Text>
                </TouchableOpacity>
                
                {customWorkout.exercises && customWorkout.exercises.length > 0 && (
                  <View style={styles.exercisesPreview}>
                    <Text style={styles.exercisesPreviewTitle}>EXERCISES</Text>
                    {customWorkout.exercises.map((exercise, index) => (
                      <View key={exercise.id} style={styles.exercisePreviewItem}>
                        <Text style={styles.exercisePreviewNumber}>{index + 1}</Text>
                        <View style={styles.exercisePreviewInfo}>
                          <Text style={styles.exercisePreviewName}>{exercise.name}</Text>
                          <Text style={styles.exercisePreviewDetails}>
                            {exercise.sets && exercise.reps ? `${exercise.sets} × ${exercise.reps}` : `${exercise.duration}s`}
                            {(exercise as any).weight && ` @ ${(exercise as any).weight}kg`}
                            {exercise.restTime && ` · ${exercise.restTime}s rest`}
                          </Text>
                        </View>
                        <View style={styles.exercisePreviewActions}>
                          <TouchableOpacity
                            style={styles.editExerciseBtn}
                            onPress={() => handleEditExercise(exercise)}
                          >
                            <Edit3 color={theme.colors.primary} size={14} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.removeExerciseBtn}
                            onPress={() => handleRemoveExercise(exercise.id)}
                          >
                            <X color={theme.colors.danger} size={12} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                
                <Button
                  title="CREATE WORKOUT"
                  variant="outline"
                  onPress={handleCreateWorkout}
                  style={styles.createButton}
                />
              </Card>
            </View>
          )}
        </ScrollView>
      </View>
      
      {/* Exercise Library Modal */}
      <Modal visible={showExerciseLibrary} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>EXERCISE LIBRARY</Text>
              <TouchableOpacity onPress={() => setShowExerciseLibrary(false)}>
                <X color={theme.colors.textDimmed} size={22} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Search color={theme.colors.textDimmed} size={16} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search exercises..."
                  placeholderTextColor={theme.colors.textDimmed + '60'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>
            
            <View style={styles.filterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['strength', 'cardio', 'flexibility', 'core', 'hiit', 'yoga', 'pilates'].map(category => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterChip,
                      selectedCategory === category && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedCategory(selectedCategory === category ? '' : category)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedCategory === category && styles.filterChipTextActive,
                    ]}>
                      {category.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <ScrollView style={{ maxHeight: verticalScale(400) }}>
              {filteredExercises.slice(0, 50).map((exercise: Exercise) => {
                const isSelected = customWorkout.exercises?.find(ex => ex.id === exercise.id);
                return (
                  <TouchableOpacity
                    key={exercise.id}
                    style={[styles.exerciseOption, isSelected && styles.exerciseOptionSelected]}
                    onPress={() => handleAddExercise(exercise)}
                  >
                    <View style={styles.exerciseOptionLeft}>
                      <View style={styles.exerciseTypeIcon}>
                        <Dumbbell color={theme.colors.primary} size={16} />
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
          </View>
        </View>
      </Modal>

      {/* Exercise Edit Modal */}
      <Modal visible={showExerciseEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>EDIT EXERCISE</Text>
              <TouchableOpacity onPress={() => setShowExerciseEditModal(false)}>
                <X color={theme.colors.textDimmed} size={22} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.exerciseName}>{editingExercise?.name}</Text>
            
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.inputLabel}>SETS</Text>
                <TextInput
                  style={styles.input}
                  value={String(editingExerciseData.sets)}
                  onChangeText={(text) => setEditingExerciseData(prev => ({ ...prev, sets: parseInt(text) || 0 }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.inputLabel}>REPS</Text>
                <TextInput
                  style={styles.input}
                  value={String(editingExerciseData.reps)}
                  onChangeText={(text) => setEditingExerciseData(prev => ({ ...prev, reps: parseInt(text) || 0 }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.inputLabel}>WEIGHT (KG)</Text>
                <TextInput
                  style={styles.input}
                  value={String(editingExerciseData.weight)}
                  onChangeText={(text) => setEditingExerciseData(prev => ({ ...prev, weight: parseInt(text) || 0 }))}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.inputLabel}>REST TIME (SEC)</Text>
                <TextInput
                  style={styles.input}
                  value={String(editingExerciseData.restTime)}
                  onChangeText={(text) => setEditingExerciseData(prev => ({ ...prev, restTime: parseInt(text) || 60 }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <Button
              title="SAVE CHANGES"
              onPress={handleSaveExerciseEdit}
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
  container: { flex: 1 },
  
  // Header
  header: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: fs(24),
    fontWeight: '900',
    color: theme.colors.text.primary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: fs(12),
    color: theme.colors.textDimmed,
    marginTop: theme.spacing.xs,
  },
  
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.border.radius.md,
    padding: theme.spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.border.radius.sm,
    gap: theme.spacing.xs,
  },
  tabActive: {
    backgroundColor: 'rgba(109, 221, 255, 0.1)',
  },
  tabText: {
    fontSize: fs(10),
    fontWeight: '700',
    color: theme.colors.textDimmed,
    letterSpacing: 1,
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  
  // Content
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textDimmed,
    fontSize: fs(14),
    fontWeight: '600',
    letterSpacing: 2,
  },
  
  // Empty state
  emptyCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginTop: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    color: theme.colors.textDimmed,
    letterSpacing: 2,
  },
  emptySubtext: {
    fontSize: fs(11),
    color: theme.colors.textDimmed,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  emptyButton: {
    marginTop: theme.spacing.md,
  },
  
  // Workout cards
  workoutCard: {
    marginBottom: theme.spacing.md,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: fs(16),
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  workoutDescription: {
    fontSize: fs(12),
    color: theme.colors.textDimmed,
    marginBottom: theme.spacing.sm,
  },
  workoutMeta: {
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
    fontWeight: '600',
    color: theme.colors.textDimmed,
  },
  workoutActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Workout details
  workoutDetails: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  exercisesTitle: {
    fontSize: fs(12),
    fontWeight: '700',
    color: theme.colors.textDimmed,
    letterSpacing: 1.5,
    marginBottom: theme.spacing.sm,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  exerciseNumber: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: theme.colors.primary + '20',
    textAlign: 'center',
    lineHeight: lineHeight(fs(10)),
    fontSize: fs(10),
    fontWeight: '700',
    color: theme.colors.primary,
    marginRight: theme.spacing.md,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: fs(12),
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  exerciseDetails: {
    fontSize: fs(10),
    color: theme.colors.textDimmed,
    marginTop: 2,
  },
  exerciseCalories: {
    fontSize: fs(10),
    fontWeight: '600',
    color: theme.colors.primary,
  },
  expandButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  
  // Template cards  
  templateCard: {
    marginBottom: theme.spacing.md,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: fs(16),
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  templateDescription: {
    fontSize: fs(12),
    color: theme.colors.textDimmed,
    marginBottom: theme.spacing.sm,
  },
  templateMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  templateCreateButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: 'rgba(109, 221, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginLeft: theme.spacing.md,
  },
  templateTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  tag: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(109, 221, 255, 0.1)',
    borderRadius: theme.border.radius.sm,
  },
  tagText: {
    fontSize: fs(9),
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  
  // Create workout
  createCard: {
    padding: theme.spacing.lg,
  },
  createTitle: {
    fontSize: fs(18),
    fontWeight: '900',
    color: theme.colors.text.primary,
    letterSpacing: 2,
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: fs(10),
    fontWeight: '700',
    color: theme.colors.textDimmed,
    letterSpacing: 1.5,
    marginBottom: 4,
    marginTop: theme.spacing.md,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    color: theme.colors.text.primary,
    fontSize: fs(14),
    paddingVertical: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  half: {
    flex: 1,
  },
  optionRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: 4,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    borderRadius: theme.border.radius.sm,
  },
  optionBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(109, 221, 255, 0.1)',
  },
  optionText: {
    fontSize: fs(8),
    fontWeight: '700',
    color: theme.colors.textDimmed,
    letterSpacing: 1,
  },
  optionTextActive: {
    color: theme.colors.primary,
  },
  addExercisesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.border.radius.md,
    marginTop: theme.spacing.md,
  },
  addExercisesText: {
    fontSize: fs(12),
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  
  // Exercises preview
  exercisesPreview: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  exercisesPreviewTitle: {
    fontSize: fs(12),
    fontWeight: '700',
    color: theme.colors.textDimmed,
    letterSpacing: 1.5,
    marginBottom: theme.spacing.sm,
  },
  exercisePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  exercisePreviewNumber: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: theme.colors.primary + '20',
    textAlign: 'center',
    lineHeight: lineHeight(fs(10)),
    fontSize: fs(10),
    fontWeight: '700',
    color: theme.colors.primary,
    marginRight: theme.spacing.md,
  },
  exercisePreviewInfo: {
    flex: 1,
  },
  exercisePreviewName: {
    fontSize: fs(12),
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  exercisePreviewDetails: {
    fontSize: fs(10),
    color: theme.colors.textDimmed,
    marginTop: 2,
  },
  exercisePreviewActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  editExerciseBtn: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: 'rgba(109, 221, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeExerciseBtn: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Filters
  filterContainer: {
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.border.radius.sm,
    marginRight: theme.spacing.sm,
  },
  filterChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(109, 221, 255, 0.1)',
  },
  filterChipText: {
    fontSize: fs(10),
    fontWeight: '700',
    color: theme.colors.textDimmed,
    letterSpacing: 1,
  },
  filterChipTextActive: {
    color: theme.colors.primary,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopWidth: 2,
    borderTopColor: theme.colors.primary,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    maxHeight: '90%',
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
    color: theme.colors.text.primary,
    letterSpacing: 2,
  },
  
  // Search
  searchContainer: {
    marginBottom: theme.spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.border.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: fs(14),
  },
  
  // Exercise options
  exerciseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  exerciseOptionSelected: {
    backgroundColor: 'rgba(109, 221, 255, 0.05)',
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
    backgroundColor: 'rgba(109, 221, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  exerciseOptionInfo: {
    flex: 1,
  },
  exerciseOptionName: {
    fontSize: fs(14),
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  exerciseOptionDetails: {
    fontSize: fs(11),
    color: theme.colors.textDimmed,
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
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseCheckboxSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.background,
    fontSize: fs(14),
    fontWeight: '700',
  },
  sessionCard: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  sessionName: {
    fontSize: fs(13),
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  sessionMeta: {
    fontSize: fs(11),
    color: theme.colors.textDimmed,
    marginTop: 4,
  },
  createButton: {
    width: '100%',
    marginTop: theme.spacing.lg,
  },
});