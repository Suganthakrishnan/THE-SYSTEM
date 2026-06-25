import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView, Text, StyleSheet, View, TouchableOpacity, Animated, Platform, AccessibilityInfo,
} from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { HudContainer } from '../../components/ui/HudContainer';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { StatBar } from '../../components/ui/StatBar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import { theme } from '../../constants/theme';
import { scale, verticalScale, fontSize } from '../../utils/responsive';
import { useAuthContext } from '../../context/AuthContext';
import { useIsFocused } from '@react-navigation/native';
import { StatsService, DailyProgressService } from '../../services/statsService';
import { TaskService } from '../../services/taskService';
import type { UserStats, DailyProgress } from '../../services/statsService';
import type { DailyTask } from '../../services/taskService';
import {
  Shield, Swords, Brain, Zap, Code, Wind, MessageCircle,
  Flame, Timer, Droplets, Dumbbell, Utensils, Moon,
  ChevronRight, CheckCircle, Circle, Activity,
} from 'lucide-react-native';

// ─── Mock Data ───────────────────────────────────────────────
const PLAYER = {
  level: 7,
  xp: 2340,
  xpToNext: 3000,
  dayCount: 47,
};

const STATS = [
  { key: 'str', label: 'Strength',      value: 24, max: 100, icon: Swords,        color: theme.colors.stats.strength },
  { key: 'int', label: 'Intelligence',  value: 31, max: 100, icon: Brain,         color: theme.colors.stats.intelligence },
  { key: 'sta', label: 'Stamina',       value: 18, max: 100, icon: Zap,           color: theme.colors.stats.stamina },
  { key: 'code',label: 'Code Knowledge',value: 42, max: 100, icon: Code,          color: theme.colors.stats.codeKnowledge },
  { key: 'agi', label: 'Agility',       value: 15, max: 100, icon: Wind,          color: theme.colors.stats.agility },
  { key: 'com', label: 'Communication', value: 20, max: 100, icon: MessageCircle, color: theme.colors.stats.communication },
];

const DAILY_PROGRESS = {
  calories:  { current: 1240, goal: 2000 },
  workout:   { current: 45,   goal: 60 },
  water:     { current: 6,    goal: 8 },
};

const QUESTS = [
  { id: '1', title: '100 Push-ups',   xp: 50,  done: true },
  { id: '2', title: 'Run 5 km',       xp: 80,  done: false },
  { id: '3', title: 'Read 20 pages',  xp: 30,  done: false },
];

const QUICK_ACTIONS = [
  { key: 'workout', label: 'START\nWORKOUT', icon: Dumbbell, route: 'WorkoutPlanner', color: theme.colors.primary },
  { key: 'meal',    label: 'LOG\nMEAL',      icon: Utensils, route: null, color: theme.colors.secondary },
  { key: 'sleep',   label: 'TRACK\nSLEEP',   icon: Moon,     route: 'SleepTracker', color: theme.colors.gold },
];

// ─── Helpers ─────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'LATE NIGHT';
  if (h < 12) return 'GOOD MORNING';
  if (h < 17) return 'GOOD AFTERNOON';
  if (h < 21) return 'GOOD EVENING';
  return 'GOOD NIGHT';
}

function formatDate(dayCount: number): string {
  const d = new Date();
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `DAY ${dayCount} // ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ─── Component ───────────────────────────────────────────────
export const HomeDashboard = React.memo(function HomeDashboard({ navigation }: any) {
  const { user } = useAuthContext();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const isInitialFocus = useRef(true);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  
  // State for real data
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(null);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [deadlineTasks, setDeadlineTasks] = useState<DailyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Refresh data every time the screen comes into focus (navigating back from DailyTasks, Workout, etc.)
  const isFocused = useIsFocused();
  useEffect(() => {
    // Skip the first mount — loadDashboardData() is already called by the mount effect above
    if (isInitialFocus.current) {
      isInitialFocus.current = false;
      return;
    }
    if (isFocused && user?.id) {
      loadDashboardData();
    }
  }, [isFocused]);

  const loadDashboardData = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      // Load user stats
      const { data: stats } = await StatsService.getUserStats(user.id);

      // Load today's progress
      const { data: progress } = await DailyProgressService.getTodayProgress(user.id);

      // Load daily tasks
      const today = new Date().toISOString().split('T')[0];
      const { data: dailyData } = await TaskService.getUserTasks(user.id, today);
      const { data: deadlineData } = await TaskService.getDeadlineTasks(user.id);

      // Update daily streak
      await StatsService.updateDailyStreak(user.id);

      setUserStats(stats);
      setDailyProgress(progress);
      setDailyTasks(dailyData?.filter(t => t.task_type === 'daily') || []);
      setDeadlineTasks(deadlineData || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get display data (fallback to defaults if no data)
  const getPlayerData = React.useCallback(() => {
    if (userStats) {
      return {
        level: userStats.level,
        xp: userStats.current_xp,
        xpToNext: userStats.xp_to_next_level,
        dayCount: userStats.total_days_active,
      };
    }

    // Fallback defaults
    return {
      level: 1,
      xp: 0,
      xpToNext: 100,
      dayCount: 0,
    };
  }, [userStats]);

  const getStatsData = React.useCallback(() => {
    if (userStats) {
      return [
        { key: 'str', label: 'Strength',      value: userStats.strength, max: 100, icon: Swords,        color: theme.colors.stats.strength },
        { key: 'int', label: 'Intelligence',  value: userStats.intelligence, max: 100, icon: Brain,         color: theme.colors.stats.intelligence },
        { key: 'sta', label: 'Stamina',       value: userStats.stamina, max: 100, icon: Zap,           color: theme.colors.stats.stamina },
        { key: 'code',label: 'Code Knowledge',value: userStats.code_knowledge, max: 100, icon: Code,          color: theme.colors.stats.codeKnowledge },
        { key: 'agi', label: 'Agility',       value: userStats.agility, max: 100, icon: Wind,          color: theme.colors.stats.agility },
        { key: 'com', label: 'Communication', value: userStats.communication, max: 100, icon: MessageCircle, color: theme.colors.stats.communication },
      ];
    }
    
    // Fallback defaults
    return [
      { key: 'str', label: 'Strength',      value: 10, max: 100, icon: Swords,        color: theme.colors.stats.strength },
      { key: 'int', label: 'Intelligence',  value: 10, max: 100, icon: Brain,         color: theme.colors.stats.intelligence },
      { key: 'sta', label: 'Stamina',       value: 10, max: 100, icon: Zap,           color: theme.colors.stats.stamina },
      { key: 'code',label: 'Code Knowledge',value: 10, max: 100, icon: Code,          color: theme.colors.stats.codeKnowledge },
      { key: 'agi', label: 'Agility',       value: 10, max: 100, icon: Wind,          color: theme.colors.stats.agility },
      { key: 'com', label: 'Communication', value: 10, max: 100, icon: MessageCircle, color: theme.colors.stats.communication },
    ];
  }, [userStats]);

  const getProgressData = React.useCallback(() => {
    if (dailyProgress) {
      return {
        calories: { current: dailyProgress.calories_current, goal: dailyProgress.calories_goal },
        workout:  { current: dailyProgress.workout_minutes_current, goal: dailyProgress.workout_minutes_goal },
        water:    { current: dailyProgress.water_current, goal: dailyProgress.water_goal },
      };
    }
    
    // Fallback defaults
    return {
      calories: { current: 0, goal: 2000 },
      workout:  { current: 0, goal: 60 },
      water:    { current: 0, goal: 8 },
    };
  }, [dailyProgress]);

  const getQuestsData = React.useCallback(() => {
    const allTasks = [...dailyTasks, ...deadlineTasks];
    if (allTasks.length > 0) {
      return allTasks.slice(0, 3).map(task => ({
        id: task.id,
        title: task.title,
        xp: task.xp_reward,
        done: task.completed,
        current: task.completed ? 1 : 0,
        target: 1,
      }));
    }

    // Fallback defaults
    return [
      { id: '1', title: 'Complete onboarding', xp: 50, done: true, current: 1, target: 1 },
      { id: '2', title: 'Start your first workout', xp: 30, done: false, current: 0, target: 1 },
      { id: '3', title: 'Log your daily progress', xp: 20, done: false, current: 0, target: 1 },
    ];
  }, [dailyTasks, deadlineTasks]);

  useEffect(() => {
    // Check for reduced motion preference
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion: boolean) => {
        setReduceMotionEnabled(reduceMotion);
      });
    }

    // Pulse for status indicator (only if reduce motion is disabled)
    if (!reduceMotionEnabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }
    // Fade in the whole screen (only if reduce motion is disabled)
    if (!reduceMotionEnabled) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(1);
    }
  }, [reduceMotionEnabled]);

  const displayName = React.useMemo(() => user?.email?.split('@')[0]?.toUpperCase() || 'PLAYER', [user?.email]);
  const playerData = getPlayerData();
  const statsData = getStatsData();
  const progressData = getProgressData();
  const questsData = getQuestsData();

  const handleQuestPress = React.useCallback((quest: any) => {
    navigation.navigate('DailyTasks');
  }, [navigation]);

  const handleQuickAction = React.useCallback((route: string | null) => {
    if (route) {
      navigation.navigate(route);
    }
  }, [navigation]);

  return (
    <ScreenWrapper>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ══════ PLAYER HEADER ══════ */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.appName}>SYSTEM.FIT</Text>
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.playerName}>{displayName}</Text>
              </View>
              <View style={styles.levelBanner}>
                <ProgressRing
                  size={Math.round(scale(100))}
                  strokeWidth={Math.round(scale(8))}
                  progress={playerData.xp / playerData.xpToNext}
                  color={theme.colors.primary}
                  value={`${playerData.level}`}
                  label="LEVEL"
                />
              </View>
            </View>
            <Text style={styles.dateText}>{formatDate(playerData.dayCount)}</Text>

            {/* XP to next level */}
            <View style={styles.xpSection}>
              <View style={styles.xpLabelRow}>
                <Animated.View style={[styles.statusDot, { opacity: pulseAnim }]} />
                <Text style={styles.systemActive}>SYSTEM ACTIVE</Text>
                <Text style={styles.xpText}>
                  {playerData.xp} / {playerData.xpToNext} XP
                </Text>
              </View>
              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: `${(playerData.xp / playerData.xpToNext) * 100}%` }]} />
              </View>
            </View>
          </View>

          {/* ══════ STAT GRID (3×2) ══════ */}
          <SectionHeader
            title="Player Stats"
            icon={<Shield color={theme.colors.primary} size={theme.iconSizes.md} />}
          />
          <View style={styles.statGrid}>
            {statsData.map((stat) => {
              const Icon = stat.icon;
              return (
                <HudContainer key={stat.key} style={styles.statCard}>
                  <View style={styles.statHeader}>
                    <View style={[styles.statIconWrap, { borderColor: stat.color + '40' }]}>
                      <Icon color={stat.color} size={theme.iconSizes.md} />
                    </View>
                    <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  </View>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <View style={styles.miniBar}>
                    <View
                      style={[
                        styles.miniBarFill,
                        {
                          width: `${(stat.value / stat.max) * 100}%`,
                          backgroundColor: stat.color,
                          shadowColor: stat.color,
                        },
                      ]}
                    />
                  </View>
                </HudContainer>
              );
            })}
          </View>

          {/* ══════ TODAY'S PROGRESS RINGS ══════ */}
          <SectionHeader
            title="Today's Progress"
            icon={<Flame color={theme.colors.primary} size={theme.iconSizes.md} />}
          />
          <HudContainer style={styles.progressCard}>
            <View style={styles.ringsRow}>
              <ProgressRing
                size={Math.round(scale(90))}
                strokeWidth={Math.round(scale(8))}
                progress={progressData.calories.current / progressData.calories.goal}
                color={theme.colors.danger}
                value={`${progressData.calories.current}`}
                label="KCAL"
              />
              <ProgressRing
                size={Math.round(scale(90))}
                strokeWidth={Math.round(scale(8))}
                progress={progressData.workout.current / progressData.workout.goal}
                color={theme.colors.primary}
                value={`${progressData.workout.current}`}
                label="MIN"
              />
              <ProgressRing
                size={Math.round(scale(90))}
                strokeWidth={Math.round(scale(8))}
                progress={progressData.water.current / progressData.water.goal}
                color={theme.colors.success}
                value={`${progressData.water.current}`}
                label="GLASSES"
              />
            </View>
            <View style={styles.ringsLegend}>
              <LegendDot color={theme.colors.danger} label="Calories" />
              <LegendDot color={theme.colors.primary} label="Workout" />
              <LegendDot color={theme.colors.success} label="Water" />
            </View>
          </HudContainer>

          {/* ══════ DAILY QUESTS PREVIEW ══════ */}
          <SectionHeader
            title="Active Quests"
            icon={<CheckCircle color={theme.colors.primary} size={theme.iconSizes.md} />}
            actionLabel="VIEW ALL"
            onAction={() => navigation.navigate('DailyTasks')}
          />
          <View style={styles.questsCard}>
            {questsData.map((q: any, index: number) => {
            const difficultyColor = q.xp >= 80 ? theme.colors.danger : q.xp >= 50 ? theme.colors.gold : theme.colors.success;
            return (
              <HudContainer
                key={q.id}
                style={[styles.questCard, { borderLeftWidth: verticalScale(3), borderLeftColor: difficultyColor }]}
                accentColor={difficultyColor}
              >
                <TouchableOpacity
                  style={styles.questRow}
                  onPress={() => handleQuestPress(q)}
                  activeOpacity={0.7}
                  accessibilityLabel={q.title}
                  accessibilityHint={q.done ? 'Quest completed' : `Tap to complete quest and earn ${q.xp} XP`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: q.done }}
                >
                  <View style={styles.questLeft}>
                    {q.done ? (
                      <CheckCircle color={theme.colors.success} size={theme.iconSizes.xxl} />
                    ) : (
                      <View style={styles.questProgressContainer}>
                        <Circle color={theme.colors.text.secondary} size={theme.iconSizes.xxl} />
                        <Text style={styles.progressNumbers}>{q.current}/{q.target}</Text>
                      </View>
                    )}
                    <Text style={[styles.questTitle, q.done && styles.questDone]}>{q.title}</Text>
                  </View>
                  <View style={styles.xpBadge}>
                    <Text style={styles.xpBadgeText}>+{q.xp} XP</Text>
                  </View>
                </TouchableOpacity>
              </HudContainer>
            );
          })}
          </View>

          {/* ══════ QUICK ACTIONS ══════ */}
          <SectionHeader
            title="Quick Actions"
            icon={<Zap color={theme.colors.primary} size={theme.iconSizes.md} />}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
          >
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <TouchableOpacity
                  key={action.key}
                  style={[styles.quickCard, { borderColor: action.color }]}
                  activeOpacity={0.7}
                  onPress={() => handleQuickAction(action.route)}
                  accessibilityLabel={action.label}
                  accessibilityHint={action.route ? `Navigate to ${action.label}` : 'Quick action'}
                  accessibilityRole="button"
                >
                  <View style={[styles.quickIconWrap, { borderColor: action.color, backgroundColor: action.color + '15' }]}>
                    <Icon color={action.color} size={theme.iconSizes.xl} />
                  </View>
                  <Text style={styles.quickLabel}>{action.label}</Text>
                  <ChevronRight color={action.color} size={theme.iconSizes.sm} style={{ marginTop: scale(6) }} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={{ height: verticalScale(32) }} />
        </ScrollView>
      </Animated.View>
    </ScreenWrapper>
  );
});

// ─── Legend Helper ────────────────────────────────────────────
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: {
    padding: theme.spacing.lg,
  },

  // Header
  header: {
    marginBottom: theme.spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appName: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: scale(3),
    fontFamily: theme.fonts.heading,
  },
  greeting: {
    fontSize: theme.fontSizes.md,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    letterSpacing: scale(2),
    marginTop: theme.spacing.xs,
  },
  playerName: {
    fontSize: theme.fontSizes.display,
    fontWeight: '900',
    color: theme.colors.text.primary,
    letterSpacing: scale(3),
    marginTop: verticalScale(2),
    fontFamily: theme.fonts.heading,
  },
  levelBanner: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    letterSpacing: scale(2),
    marginTop: theme.spacing.md,
  },

  // XP bar
  xpSection: {
    marginTop: theme.spacing.md,
  },
  xpLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  statusDot: {
    width: scale(6),
    height: scale(6),
    backgroundColor: theme.colors.success,
    marginRight: scale(6),
    borderRadius: scale(3),
  },
  systemActive: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '700',
    color: theme.colors.success,
    letterSpacing: scale(1.5),
    flex: 1,
  },
  xpText: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: scale(1),
  },
  xpTrack: {
    height: scale(6),
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: scale(3),
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: scale(3),
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: scale(4),
    elevation: 3,
  },

  // Stat Grid
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: theme.spacing.md,
    padding: 0,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(8),
  },
  statIconWrap: {
    width: scale(32),
    height: scale(32),
    borderWidth: 1,
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: theme.fontSizes.xxxl,
    fontWeight: '900',
    fontFamily: theme.fonts.heading,
  },
  statLabel: {
    fontSize: theme.fontSizes.xs,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: scale(1.5),
    textTransform: 'uppercase',
    marginBottom: scale(8),
  },
  miniBar: {
    height: scale(4),
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: scale(2),
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: scale(2),
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: scale(3),
    elevation: 2,
  },

  // Progress Rings
  progressCard: {
    paddingVertical: theme.spacing.xl,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  ringsLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    marginRight: scale(6),
  },
  legendText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    letterSpacing: scale(1),
  },

  // Quests Preview
  questsCard: {
    gap: theme.spacing.sm,
  },
  questCard: {
    marginBottom: 0,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  questTitle: {
    color: theme.colors.text.primary,
    fontSize: theme.fontSizes.lg,
    fontWeight: '500',
    marginLeft: theme.spacing.md,
    letterSpacing: scale(0.5),
  },
  questDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.text.secondary,
  },
  xpBadge: {
    backgroundColor: theme.colors.gold + '15',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    borderWidth: 1,
    borderColor: theme.colors.gold + '40',
  },
  xpBadgeText: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '700',
    color: theme.colors.gold,
    letterSpacing: scale(1),
  },

  // Quick Actions
  quickRow: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  quickCard: {
    width: scale(110),
    minHeight: theme.touch.buttonMinHeight,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bg.glass,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.border.radius.md,
    alignItems: 'center',
  },
  quickIconWrap: {
    width: scale(44),
    height: scale(44),
    borderWidth: 1,
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  quickLabel: {
    fontSize: theme.fontSizes.xs,
    fontWeight: '800',
    color: theme.colors.text.primary,
    letterSpacing: scale(1.5),
    textAlign: 'center',
    lineHeight: fontSize(14),
  },
  
  // Quest progress styles
  questProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  progressNumbers: {
    position: 'absolute',
    fontSize: theme.fontSizes.xs,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
});