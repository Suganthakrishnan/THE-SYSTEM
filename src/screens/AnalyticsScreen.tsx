import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useAuthContext } from '../context/AuthContext';
import { AnalyticsService, AnalyticsSummary, WorkoutFrequencyData, XPTrendData, GoalCompletionData } from '../services/analyticsService';
import { HudContainer } from '../components/ui/HudContainer';
import { SectionHeader } from '../components/ui/SectionHeader';
import { theme } from '../constants/theme';
import { scale, verticalScale, fontSize as fs } from '../utils/responsive';
import { TrendingUp, TrendingDown, Award, Flame, Target, Zap } from 'lucide-react-native';

const screenWidth = Dimensions.get('window').width;

export function AnalyticsScreen() {
  const { session } = useAuthContext();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [workoutData, setWorkoutData] = useState<WorkoutFrequencyData[]>([]);
  const [xpData, setXpData] = useState<XPTrendData[]>([]);
  const [goalData, setGoalData] = useState<GoalCompletionData[]>([]);
  const [weeklyComparison, setWeeklyComparison] = useState<{
    thisWeek: { workouts: number; minutes: number; xp: number };
    lastWeek: { workouts: number; minutes: number; xp: number };
  } | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'workouts', label: 'Workouts' },
    { id: 'xp', label: 'XP' },
    { id: 'goals', label: 'Goals' },
  ];

  useEffect(() => {
    loadAnalyticsData();
  }, [session]);

  const loadAnalyticsData = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const [summaryResult, workoutResult, xpResult, goalResult, weeklyResult] = await Promise.all([
        AnalyticsService.getAnalyticsSummary(session.user.id, 30),
        AnalyticsService.getWorkoutFrequency(session.user.id, 30),
        AnalyticsService.getXPTrends(session.user.id, 30),
        AnalyticsService.getGoalCompletionRate(session.user.id, 30),
        AnalyticsService.getWeeklyComparison(session.user.id),
      ]);

      setSummary(summaryResult.data);
      setWorkoutData(workoutResult.data);
      setXpData(xpResult.data);
      setGoalData(goalResult.data);
      setWeeklyComparison(weeklyResult);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(109, 221, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(173, 170, 173, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
    propsForLabels: {
      fontSize: fs(10),
    },
  };

  const barChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(172, 137, 255, ${opacity})`,
    propsForLabels: {
      fontSize: fs(10),
    },
  };

  const formatChartData = (data: any[], labelKey: string, valueKey: string) => {
    const labels = data.map(item => {
      const date = new Date(item[labelKey]);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const values = data.map(item => item[valueKey]);
    return { labels, datasets: [{ data: values }] };
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const renderStatCard = (title: string, value: string, icon: any, change?: number) => (
    <HudContainer style={styles.statCard}>
      <View style={styles.statHeader}>
        {icon}
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {change !== undefined && (
        <View style={styles.changeContainer}>
          {change >= 0 ? (
            <TrendingUp size={14} color={theme.colors.success} />
          ) : (
            <TrendingDown size={14} color={theme.colors.danger} />
          )}
          <Text style={[styles.changeText, change >= 0 ? styles.positiveChange : styles.negativeChange]}>
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </Text>
        </View>
      )}
    </HudContainer>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <SectionHeader title="ANALYTICS DASHBOARD" />

        {/* Pill Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, selectedTab === tab.id && styles.tabActive]}
              onPress={() => setSelectedTab(tab.id)}
            >
              <Text style={[styles.tabText, selectedTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Summary Stats */}
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Total Workouts',
            summary?.totalWorkouts.toString() || '0',
            <Flame size={20} color={theme.colors.primary} />,
            weeklyComparison ? calculateChange(weeklyComparison.thisWeek.workouts, weeklyComparison.lastWeek.workouts) : undefined
          )}
          {renderStatCard(
            'Total XP',
            summary?.totalXPEarned.toString() || '0',
            <Zap size={20} color={theme.colors.secondary} />,
            weeklyComparison ? calculateChange(weeklyComparison.thisWeek.xp, weeklyComparison.lastWeek.xp) : undefined
          )}
          {renderStatCard(
            'Goal Completion',
            `${summary?.goalCompletionRate || 0}%`,
            <Target size={20} color={theme.colors.success} />
          )}
          {renderStatCard(
            'Current Streak',
            `${summary?.currentStreak || 0} days`,
            <Award size={20} color={theme.colors.gold} />
          )}
        </View>

        {/* Workout Frequency Chart */}
        <HudContainer style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Workout Frequency (Last 30 Days)</Text>
          {workoutData.length > 0 ? (
            <LinearGradient
              colors={['rgba(109, 221, 255, 0.1)', 'rgba(109, 221, 255, 0.02)']}
              style={styles.chartGradient}
            >
              <BarChart
                data={formatChartData(workoutData, 'date', 'workoutsCompleted')}
                width={screenWidth - 48}
                height={220}
                chartConfig={barChartConfig}
                style={styles.chart}
                showValuesOnTopOfBars
                fromZero
                yAxisLabel=""
                yAxisSuffix=""
              />
            </LinearGradient>
          ) : (
            <Text style={styles.noDataText}>No workout data available</Text>
          )}
        </HudContainer>

        {/* XP Trend Chart */}
        <HudContainer style={styles.chartContainer}>
          <Text style={styles.chartTitle}>XP Earned (Last 30 Days)</Text>
          {xpData.length > 0 ? (
            <LinearGradient
              colors={['rgba(109, 221, 255, 0.1)', 'rgba(109, 221, 255, 0.02)']}
              style={styles.chartGradient}
            >
              <LineChart
                data={formatChartData(xpData, 'date', 'xpEarned')}
                width={screenWidth - 48}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                bezier
                withDots={true}
                withInnerLines={false}
                withOuterLines={true}
                withVerticalLines={false}
              />
            </LinearGradient>
          ) : (
            <Text style={styles.noDataText}>No XP data available</Text>
          )}
        </HudContainer>

        {/* Goal Completion Rate Chart */}
        <HudContainer style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Goal Completion Rate (Last 30 Days)</Text>
          {goalData.length > 0 ? (
            <LinearGradient
              colors={['rgba(0, 255, 153, 0.1)', 'rgba(0, 255, 153, 0.02)']}
              style={styles.chartGradient}
            >
              <LineChart
                data={formatChartData(goalData, 'date', 'completionRate')}
                width={screenWidth - 48}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(0, 255, 153, ${opacity})`,
                }}
                style={styles.chart}
                bezier
                withDots={true}
                withInnerLines={false}
                withOuterLines={true}
                withVerticalLines={false}
              />
            </LinearGradient>
          ) : (
            <Text style={styles.noDataText}>No goal completion data available</Text>
          )}
        </HudContainer>

        {/* Workout Minutes Chart */}
        <HudContainer style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Workout Duration (Last 30 Days)</Text>
          {workoutData.length > 0 ? (
            <LinearGradient
              colors={['rgba(255, 217, 61, 0.1)', 'rgba(255, 217, 61, 0.02)']}
              style={styles.chartGradient}
            >
              <LineChart
                data={formatChartData(workoutData, 'date', 'workoutMinutes')}
                width={screenWidth - 48}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(255, 217, 61, ${opacity})`,
                }}
                style={styles.chart}
                bezier
                withDots={true}
                withInnerLines={false}
                withOuterLines={true}
                withVerticalLines={false}
              />
            </LinearGradient>
          ) : (
            <Text style={styles.noDataText}>No workout duration data available</Text>
          )}
        </HudContainer>

        {/* Weekly Comparison */}
        {weeklyComparison && (
          <HudContainer style={styles.comparisonCard}>
            <Text style={styles.chartTitle}>Weekly Comparison</Text>
            <View style={styles.comparisonContainer}>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>This Week</Text>
                <Text style={styles.comparisonValue}>{weeklyComparison.thisWeek.workouts} workouts</Text>
                <Text style={styles.comparisonSubValue}>{weeklyComparison.thisWeek.minutes} min</Text>
                <Text style={styles.comparisonSubValue}>{weeklyComparison.thisWeek.xp} XP</Text>
              </View>
              <View style={styles.comparisonDivider} />
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>Last Week</Text>
                <Text style={styles.comparisonValue}>{weeklyComparison.lastWeek.workouts} workouts</Text>
                <Text style={styles.comparisonSubValue}>{weeklyComparison.lastWeek.minutes} min</Text>
                <Text style={styles.comparisonSubValue}>{weeklyComparison.lastWeek.xp} XP</Text>
              </View>
            </View>
          </HudContainer>
        )}

        <View style={styles.spacer} />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg.base,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg.base,
  },
  tabsContainer: {
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  tab: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.bg.glassBorder,
    backgroundColor: theme.colors.bg.glass,
  },
  tabActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  tabText: {
    fontSize: fs(12),
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: 1,
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    width: (screenWidth - 48) / 2,
    marginRight: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statTitle: {
    fontSize: fs(12),
    fontWeight: '700',
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.sm,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: fs(24),
    fontWeight: '900',
    color: theme.colors.text.primary,
    letterSpacing: 1,
    fontFamily: theme.fonts.heading,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  changeText: {
    fontSize: fs(11),
    fontWeight: '700',
    marginLeft: theme.spacing.xs,
  },
  positiveChange: {
    color: theme.colors.success,
  },
  negativeChange: {
    color: theme.colors.danger,
  },
  chartContainer: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  chartGradient: {
    borderRadius: theme.border.radius.md,
    padding: theme.spacing.sm,
  },
  chartTitle: {
    fontSize: fs(14),
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    letterSpacing: 1,
    fontFamily: theme.fonts.heading,
  },
  chart: {
    marginVertical: theme.spacing.sm,
    borderRadius: theme.border.radius.lg,
  },
  noDataText: {
    fontSize: fs(14),
    color: theme.colors.text.secondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
  comparisonCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  comparisonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.lg,
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: fs(12),
    fontWeight: '700',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  comparisonValue: {
    fontSize: fs(20),
    fontWeight: '900',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.heading,
  },
  comparisonSubValue: {
    fontSize: fs(14),
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  comparisonDivider: {
    width: 1,
    backgroundColor: theme.colors.bg.glassBorder,
    marginHorizontal: theme.spacing.lg,
  },
  spacer: {
    height: theme.spacing.xl,
  },
});
