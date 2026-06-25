import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exercise, WorkoutPlan } from '../types/exercise';
import { ExerciseDatabaseService } from './exerciseDatabase';
import {
  fetchCloudWorkouts,
  fetchCloudSessions,
  pushWorkoutToCloud,
  deleteWorkoutFromCloud,
  pushSessionToCloud,
  mergeWorkouts,
} from './workoutCloudSync';

const STORAGE_WORKOUTS = '@systemfit/custom_workouts';
const STORAGE_SESSIONS = '@systemfit/workout_sessions';

// ─── Workout Planner Types ───────────────────────────────────────
export interface CustomWorkoutPlan extends WorkoutPlan {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: 'strength' | 'cardio' | 'mixed' | 'custom' | 'hiit' | 'yoga' | 'pilates';
  duration: number;
  exercises: CustomExercise[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  targetMuscles: string[];
  estimatedCalories: number;
  equipment: string[];
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  scheduledDays?: string[]; // ['monday', 'wednesday', 'friday']
  restTime?: number; // seconds between exercises
  warmupDuration?: number; // minutes
  cooldownDuration?: number; // minutes
  notes?: string;
}

export interface CustomExercise extends Exercise {
  order: number;
  sets?: number;
  reps?: number;
  duration?: number;
  weight?: number; // kg or lbs
  restTime?: number; // seconds between sets
  tempo?: string; // e.g., "2-0-2" (2 seconds down, 0 pause, 2 seconds up)
  intensity?: number; // 1-10 scale
  notes?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  exercises: Omit<CustomExercise, 'order'>[];
  tags: string[];
  isPremium?: boolean;
  rating?: number;
  uses: number;
}

export interface WorkoutSession {
  id: string;
  workoutPlanId: string;
  date: string;
  completed: boolean;
  exercises: CompletedExercise[];
  totalDuration: number;
  totalCalories: number;
  notes?: string;
  rating?: number; // 1-5 stars
}

export interface CompletedExercise extends CustomExercise {
  actualSets?: number;
  actualReps?: number;
  actualDuration?: number;
  actualWeight?: number;
  completed: boolean;
  notes?: string;
}

// ─── Workout Planner Service ───────────────────────────────────────
export class WorkoutPlannerService {
  private static customWorkouts: CustomWorkoutPlan[] = [];
  private static templates: WorkoutTemplate[] = [];
  private static sessions: WorkoutSession[] = [];

  private static syncUserId: string | null = null;

  // Initialize workout planner with sample templates
  static async initialize(userId?: string): Promise<void> {
    await this.loadTemplates();
    await this.loadFromStorage();
    if (userId) {
      this.syncUserId = userId;
      await this.syncFromCloud(userId);
    }
    if (this.customWorkouts.length === 0) {
      this.loadSampleWorkouts();
    }
  }

  /** Merge local AsyncStorage data with Supabase cloud backup */
  static async syncFromCloud(userId: string): Promise<void> {
    try {
      const [cloudWorkouts, cloudSessions] = await Promise.all([
        fetchCloudWorkouts(userId),
        fetchCloudSessions(userId),
      ]);
      this.customWorkouts = mergeWorkouts(this.customWorkouts, cloudWorkouts);
      if (cloudSessions.length > 0) {
        const sessionMap = new Map(this.sessions.map(s => [s.id, s]));
        cloudSessions.forEach(s => sessionMap.set(s.id, s));
        this.sessions = Array.from(sessionMap.values());
      }
      await this.persist();
    } catch (e) {
      console.warn('[WorkoutPlanner] cloud sync failed:', e);
    }
  }

  private static async loadFromStorage(): Promise<void> {
    try {
      const [workoutsJson, sessionsJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_WORKOUTS),
        AsyncStorage.getItem(STORAGE_SESSIONS),
      ]);
      if (workoutsJson) this.customWorkouts = JSON.parse(workoutsJson);
      if (sessionsJson) this.sessions = JSON.parse(sessionsJson);
    } catch (e) {
      console.warn('[WorkoutPlanner] Storage load failed:', e);
    }
  }

  private static async persist(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_WORKOUTS, JSON.stringify(this.customWorkouts)),
        AsyncStorage.setItem(STORAGE_SESSIONS, JSON.stringify(this.sessions)),
      ]);
    } catch (e) {
      console.warn('[WorkoutPlanner] Storage save failed:', e);
    }
  }

  private static async persistAndSync(workout?: CustomWorkoutPlan): Promise<void> {
    await this.persist();
    if (workout && this.syncUserId) {
      void pushWorkoutToCloud(workout);
    }
  }

  // Load workout templates
  private static async loadTemplates(): Promise<void> {
    this.templates = [
      {
        id: 'template_1',
        name: 'Full Body Strength',
        description: 'Complete full body workout targeting all major muscle groups',
        category: 'strength',
        difficulty: 'intermediate',
        duration: 45,
        exercises: [
          {
            id: 'squat',
            name: 'Squats',
            type: 'strength',
            sets: 4,
            reps: 12,
            calories: 15,
            instructions: 'Stand with feet shoulder-width apart, lower body until thighs are parallel to floor',
            restTime: 90,
            tempo: '3-0-1',
          },
          {
            id: 'pushup',
            name: 'Push-ups',
            type: 'strength',
            sets: 3,
            reps: 15,
            calories: 12,
            instructions: 'Start in plank position, lower body until chest nearly touches floor',
            restTime: 60,
            tempo: '2-0-1',
          },
          {
            id: 'deadlift',
            name: 'Deadlifts',
            type: 'strength',
            sets: 3,
            reps: 10,
            weight: 135,
            calories: 20,
            instructions: 'Bend at hips and knees, grip bar, lift by extending hips and knees',
            restTime: 120,
            tempo: '2-1-1',
          },
        ],
        tags: ['full body', 'strength', 'compound'],
        rating: 4.5,
        uses: 1250,
      },
      {
        id: 'template_2',
        name: 'HIIT Cardio Blast',
        description: 'High-intensity interval training for maximum calorie burn',
        category: 'hiit',
        difficulty: 'advanced',
        duration: 30,
        exercises: [
          {
            id: 'burpees',
            name: 'Burpees',
            type: 'cardio',
            duration: 45,
            calories: 18,
            instructions: 'From standing, drop to plank, do push-up, jump feet to hands, jump up',
            restTime: 15,
          },
          {
            id: 'mountain_climbers',
            name: 'Mountain Climbers',
            type: 'cardio',
            duration: 30,
            calories: 12,
            instructions: 'In plank position, alternate bringing knees to chest quickly',
            restTime: 15,
          },
          {
            id: 'jumping_jacks',
            name: 'Jumping Jacks',
            type: 'cardio',
            duration: 60,
            calories: 10,
            instructions: 'Jump while spreading legs and raising arms overhead',
            restTime: 30,
          },
        ],
        tags: ['cardio', 'hiit', 'fat loss'],
        rating: 4.8,
        uses: 890,
      },
      {
        id: 'template_3',
        name: 'Yoga Flow',
        description: 'Gentle yoga flow for flexibility and mindfulness',
        category: 'yoga',
        difficulty: 'beginner',
        duration: 60,
        exercises: [
          {
            id: 'sun_salutation',
            name: 'Sun Salutation',
            type: 'flexibility',
            duration: 300,
            calories: 8,
            instructions: 'Flow through series of yoga poses, breathing with each movement',
            restTime: 30,
          },
          {
            id: 'warrior_pose',
            name: 'Warrior Pose',
            type: 'flexibility',
            duration: 60,
            calories: 5,
            instructions: 'Step one foot back, bend front knee, arms extended',
            restTime: 30,
          },
        ],
        tags: ['yoga', 'flexibility', 'recovery'],
        rating: 4.3,
        uses: 650,
      },
    ];
  }

  // Load sample custom workouts
  private static loadSampleWorkouts(): void {
    this.customWorkouts = [
      {
        id: 'custom_1',
        userId: 'demo_user',
        name: 'My Morning Routine',
        description: 'Quick morning workout to start the day',
        type: 'mixed',
        duration: 20,
        exercises: [
          {
            id: 'jumping_jacks',
            name: 'Jumping Jacks',
            type: 'cardio',
            order: 1,
            duration: 60,
            calories: 10,
            instructions: 'Jump while spreading legs and raising arms',
            restTime: 30,
          },
          {
            id: 'pushup',
            name: 'Push-ups',
            type: 'strength',
            order: 2,
            sets: 2,
            reps: 10,
            calories: 8,
            instructions: 'Standard push-up form',
            restTime: 45,
          },
        ].map((ex, i) => ({ ...ex, id: ex.id ?? `ex_sample_${Date.now()}_${i}` })),
        difficulty: 'beginner',
        targetMuscles: ['full_body'],
        estimatedCalories: 180,
        equipment: ['body only'],
        tags: ['morning', 'quick', 'home'],
        isPublic: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scheduledDays: ['monday', 'wednesday', 'friday'],
        restTime: 30,
        warmupDuration: 5,
        cooldownDuration: 5,
      },
    ];
  }

  // Get all workout templates
  static getTemplates(): WorkoutTemplate[] {
    return this.templates;
  }

  // Get templates by category
  static getTemplatesByCategory(category: string): WorkoutTemplate[] {
    return this.templates.filter(template => template.category === category);
  }

  // Get templates by difficulty
  static getTemplatesByDifficulty(difficulty: string): WorkoutTemplate[] {
    return this.templates.filter(template => template.difficulty === difficulty);
  }

  // Search templates
  static searchTemplates(query: string): WorkoutTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.templates.filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // Create custom workout from template
  static createWorkoutFromTemplate(templateId: string, userId: string, customName?: string): CustomWorkoutPlan {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) throw new Error('Template not found');

    const customWorkout: CustomWorkoutPlan = {
      id: `custom_${Date.now()}`,
      userId,
      name: customName || template.name,
      description: template.description,
      type: template.category as any,
      duration: template.duration,
      exercises: template.exercises.map((exercise, index) => ({
        ...exercise,
        id: (exercise as any).id ?? `ex_${Date.now()}_${index}`,
        order: index + 1,
      })),
      difficulty: template.difficulty,
      targetMuscles: ['full_body'], // Would be calculated from exercises
      estimatedCalories: template.exercises.reduce((sum, ex) => sum + (ex.calories || 0), 0),
      equipment: ['body only'], // Would be calculated from exercises
      tags: template.tags,
      isPublic: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      restTime: 60,
      warmupDuration: 5,
      cooldownDuration: 5,
    };

    this.customWorkouts.push(customWorkout);
    void this.persistAndSync(customWorkout);
    return customWorkout;
  }

  static saveCustomWorkout(workout: Omit<CustomWorkoutPlan, 'id' | 'createdAt' | 'updatedAt'>): CustomWorkoutPlan {
    const newWorkout: CustomWorkoutPlan = {
      ...workout,
      id: `custom_${Date.now()}`,
      exercises: workout.exercises?.map((ex, i) => ({ ...ex, id: (ex as any).id ?? `ex_${Date.now()}_${i}` })) || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.customWorkouts.push(newWorkout);
    void this.persistAndSync(newWorkout);
    return newWorkout;
  }

  // Update custom workout
  static updateCustomWorkout(id: string, updates: Partial<CustomWorkoutPlan>): CustomWorkoutPlan | null {
    const index = this.customWorkouts.findIndex(workout => workout.id === id);
    if (index === -1) return null;

    this.customWorkouts[index] = {
      ...this.customWorkouts[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    void this.persistAndSync(this.customWorkouts[index]);
    return this.customWorkouts[index];
  }

  static deleteCustomWorkout(id: string): boolean {
    const index = this.customWorkouts.findIndex(workout => workout.id === id);
    if (index === -1) return false;

    this.customWorkouts.splice(index, 1);
    void this.persist();
    void deleteWorkoutFromCloud(id);
    return true;
  }

  // Get user's custom workouts
  static getUserWorkouts(userId: string): CustomWorkoutPlan[] {
    return this.customWorkouts.filter(workout => workout.userId === userId);
  }

  // Get workout by ID
  static getWorkoutById(id: string): CustomWorkoutPlan | null {
    return this.customWorkouts.find(workout => workout.id === id) || null;
  }

  // Add exercise to workout
  static addExerciseToWorkout(workoutId: string, exercise: Omit<CustomExercise, 'order'>): CustomWorkoutPlan | null {
    const workout = this.getWorkoutById(workoutId);
    if (!workout) return null;

    const newExercise: CustomExercise = {
      ...exercise,
      id: (exercise as any).id ?? `ex_${Date.now()}_${workout.exercises.length + 1}`,
      order: workout.exercises.length + 1,
    };

    workout.exercises.push(newExercise);
    workout.estimatedCalories += exercise.calories || 0;
    workout.updatedAt = new Date().toISOString();

    return workout;
  }

  // Remove exercise from workout
  static removeExerciseFromWorkout(workoutId: string, exerciseId: string): CustomWorkoutPlan | null {
    const workout = this.getWorkoutById(workoutId);
    if (!workout) return null;

    const exerciseIndex = workout.exercises.findIndex(ex => ex.id === exerciseId);
    if (exerciseIndex === -1) return null;

    const removedExercise = workout.exercises[exerciseIndex];
    workout.exercises.splice(exerciseIndex, 1);
    
    // Reorder remaining exercises
    workout.exercises.forEach((ex, index) => {
      ex.order = index + 1;
    });

    workout.estimatedCalories -= removedExercise.calories || 0;
    workout.updatedAt = new Date().toISOString();

    return workout;
  }

  // Reorder exercises in workout
  static reorderExercises(workoutId: string, exerciseIds: string[]): CustomWorkoutPlan | null {
    const workout = this.getWorkoutById(workoutId);
    if (!workout) return null;

    const reorderedExercises: CustomExercise[] = [];
    exerciseIds.forEach((id, index) => {
      const exercise = workout.exercises.find(ex => ex.id === id);
      if (exercise) {
        exercise.order = index + 1;
        reorderedExercises.push(exercise);
      }
    });

    workout.exercises = reorderedExercises;
    workout.updatedAt = new Date().toISOString();

    return workout;
  }

  // Duplicate workout
  static duplicateWorkout(workoutId: string, newName?: string): CustomWorkoutPlan | null {
    const original = this.getWorkoutById(workoutId);
    if (!original) return null;

    const duplicate: CustomWorkoutPlan = {
      ...original,
      id: `custom_${Date.now()}`,
      name: newName || `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.customWorkouts.push(duplicate);
    void this.persistAndSync(duplicate);
    return duplicate;
  }

  // ─── Workout sessions ─────────────────────────────────────────

  static startSession(workoutPlanId: string): WorkoutSession | null {
    const plan = this.getWorkoutById(workoutPlanId);
    if (!plan) return null;

    const session: WorkoutSession = {
      id: `session_${Date.now()}`,
      workoutPlanId: plan.id,
      date: new Date().toISOString(),
      completed: false,
      exercises: plan.exercises.map(ex => ({
        ...ex,
        completed: false,
        actualSets: ex.sets,
        actualReps: ex.reps,
        actualDuration: ex.duration,
      })),
      totalDuration: 0,
      totalCalories: 0,
    };

    this.sessions.push(session);
    void this.persist();
    return session;
  }

  static getSession(sessionId: string): WorkoutSession | null {
    return this.sessions.find(s => s.id === sessionId) ?? null;
  }

  static completeSession(
    sessionId: string,
    updates: { totalDuration: number; exercises: CompletedExercise[]; rating?: number; notes?: string },
  ): WorkoutSession | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    session.completed = true;
    session.exercises = updates.exercises;
    session.totalDuration = updates.totalDuration;
    session.totalCalories = updates.exercises.reduce((sum, ex) => sum + (ex.calories ?? 0), 0);
    session.rating = updates.rating;
    session.notes = updates.notes;

    void this.persist();
    const plan = this.getWorkoutById(session.workoutPlanId);
    if (plan && this.syncUserId) {
      void pushSessionToCloud(session, this.syncUserId);
    }
    return session;
  }

  static getUserSessions(userId: string): WorkoutSession[] {
    const userPlanIds = new Set(
      this.customWorkouts.filter(w => w.userId === userId).map(w => w.id),
    );
    return this.sessions
      .filter(s => userPlanIds.has(s.workoutPlanId) && s.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Get workout recommendations based on user preferences
  static getRecommendations(preferences: {
    difficulty?: string;
    duration?: number;
    targetMuscles?: string[];
    equipment?: string[];
    categories?: string[];
  }): WorkoutTemplate[] {
    let recommendations = [...this.templates];

    if (preferences.difficulty) {
      recommendations = recommendations.filter(t => t.difficulty === preferences.difficulty);
    }

    if (preferences.duration) {
      recommendations = recommendations.filter(t => 
        Math.abs(t.duration - preferences.duration!) <= 15
      );
    }

    if (preferences.categories && preferences.categories.length > 0) {
      recommendations = recommendations.filter(t => 
        preferences.categories!.includes(t.category)
      );
    }

    if (preferences.equipment && preferences.equipment.length > 0) {
      recommendations = recommendations.filter(t => 
        t.exercises.some(ex => 
          ex.weight === undefined || preferences.equipment!.includes('body only')
        )
      );
    }

    // Sort by rating and usage
    return recommendations.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  // Calculate workout statistics
  static calculateWorkoutStats(workout: CustomWorkoutPlan): {
    totalSets: number;
    totalReps: number;
    totalWeight: number;
    estimatedDuration: number;
    muscleGroups: string[];
    equipmentNeeded: string[];
  } {
    const stats = {
      totalSets: 0,
      totalReps: 0,
      totalWeight: 0,
      estimatedDuration: workout.duration,
      muscleGroups: [] as string[],
      equipmentNeeded: [] as string[],
    };

    workout.exercises.forEach(exercise => {
      if (exercise.sets) stats.totalSets += exercise.sets;
      if (exercise.reps) stats.totalReps += exercise.sets! * exercise.reps;
      if (exercise.weight && exercise.sets) {
        stats.totalWeight += exercise.weight * exercise.sets * (exercise.reps || 0);
      }
    });

    return stats;
  }
}
