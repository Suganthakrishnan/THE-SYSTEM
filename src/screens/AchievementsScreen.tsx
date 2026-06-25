import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useAuthContext } from '../context/AuthContext';
import { AchievementsService, Achievement, RankTier, Milestone } from '../services/achievementsService';
import { StatsService } from '../services/statsService';
import { HudContainer } from '../components/ui/HudContainer';
import { SectionHeader } from '../components/ui/SectionHeader';
import { StatBar } from '../components/ui/StatBar';
import { theme } from '../constants/theme';
import { scale, verticalScale, fontSize as fs, lineHeight } from '../utils/responsive';
import { Trophy, Lock, Crown, Flame, Star, Target, Award, TrendingUp } from 'lucide-react-native';

export function AchievementsScreen() {
  const { session } = useAuthContext();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<any>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [currentRank, setCurrentRank] = useState<RankTier | null>(null);
  const [rankProgress, setRankProgress] = useState<{ currentRank: RankTier; nextRank: RankTier | null; progress: number; xpNeeded: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [achievementStats, setAchievementStats] = useState<{
    totalAchievements: number;
    unlockedAchievements: number;
    completionRate: number;
    totalXPRewards: number;
  } | null>(null);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    loadAchievementsData();
  }, [session]);

  const loadAchievementsData = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const [statsResult, achievementsResult, milestonesResult, statsData] = await Promise.all([
        StatsService.getUserStats(session.user.id),
        AchievementsService.getUserAchievements(session.user.id),
        AchievementsService.getUserMilestones(session.user.id),
        AchievementsService.getAchievementStats(session.user.id),
      ]);

      setUserStats(statsResult.data);
      setAchievements(achievementsResult.data);
      setMilestones(milestonesResult.data);
      setAchievementStats(statsData);

      if (statsResult.data) {
        const userXP = (statsResult.data as any).xp || (statsResult.data as any).totalXP || 0;
        const rank = AchievementsService.getCurrentRank(userXP);
        const progress = AchievementsService.getRankProgress(userXP);
        setCurrentRank(rank);
        setRankProgress(progress);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'workout', name: 'Workout' },
    { id: 'streak', name: 'Streak' },
    { id: 'xp', name: 'XP' },
    { id: 'milestone', name: 'Milestone' },
  ];

  const filteredAchievements = selectedCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === selectedCategory);

  const renderRankCard = () => {
    if (!currentRank || !rankProgress) return null;

    return (
      <HudContainer style={styles.rankCard}>
        <View style={styles.rankHeader}>
          <Text style={styles.rankIcon}>{currentRank.icon}</Text>
          <View style={styles.rankInfo}>
            <Text style={styles.rankName}>{currentRank.name}</Text>
            <Text style={styles.rankDescription}>{currentRank.description}</Text>
          </View>
        </View>
        
        <StatBar
          label="Rank Progress"
          current={rankProgress.progress}
          max={100}
          color={currentRank.color}
          showValues
        />
        
        {rankProgress.nextRank && (
          <View style={styles.nextRankInfo}>
            <Text style={styles.nextRankText}>
              {rankProgress.xpNeeded} XP to {rankProgress.nextRank.name}
            </Text>
            <Text style={styles.nextRankIcon}>{rankProgress.nextRank.icon}</Text>
          </View>
        )}

        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>BENEFITS</Text>
          {currentRank.benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <Star size={12} color={theme.colors.gold} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      </HudContainer>
    );
  };

  const renderAchievementGrid = () => {
    return (
      <View style={styles.achievementsGrid}>
        {filteredAchievements.map((achievement) => (
          <TouchableOpacity
            key={achievement.id}
            style={[
              styles.achievementCard,
              achievement.isUnlocked ? styles.achievementUnlocked : styles.achievementLocked,
            ]}
            activeOpacity={0.7}
          >
            <View style={styles.achievementIconContainer}>
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              {achievement.isUnlocked ? (
                <Trophy size={16} color={theme.colors.success} style={styles.achievementBadge} />
              ) : (
                <Lock size={16} color={theme.colors.textDimmed} style={styles.achievementBadge} />
              )}
            </View>
            <Text style={[
              styles.achievementName,
              !achievement.isUnlocked && styles.achievementNameLocked,
            ]}>
              {achievement.name}
            </Text>
            <Text style={styles.achievementDescription} numberOfLines={2}>
              {achievement.description}
            </Text>
            <View style={styles.achievementReward}>
              <Flame size={12} color={theme.colors.tertiary} />
              <Text style={styles.achievementRewardText}>+{achievement.xpReward} XP</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderMilestones = () => {
    return (
      <View style={styles.milestonesContainer}>
        {milestones.map((milestone) => (
          <View key={milestone.id} style={styles.milestoneItem}>
            <View style={[
              styles.milestoneIcon,
              milestone.achieved && styles.milestoneIconAchieved,
            ]}>
              <Text style={styles.milestoneEmoji}>{milestone.icon}</Text>
            </View>
            <View style={styles.milestoneInfo}>
              <Text style={[
                styles.milestoneName,
                milestone.achieved && styles.milestoneNameAchieved,
              ]}>
                {milestone.name}
              </Text>
              <Text style={styles.milestoneDescription}>{milestone.description}</Text>
              {milestone.achieved && milestone.achievedAt && (
                <Text style={styles.milestoneDate}>
                  Achieved: {new Date(milestone.achievedAt).toLocaleDateString()}
                </Text>
              )}
            </View>
            {milestone.achieved ? (
              <Award size={20} color={theme.colors.success} />
            ) : (
              <Target size={20} color={theme.colors.textDimmed} />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderStats = () => {
    if (!achievementStats) return null;

    return (
      <View style={styles.statsRow}>
        <HudContainer style={styles.statCard}>
          <Text style={styles.statLabel}>UNLOCKED</Text>
          <Text style={styles.statValue}>
            {achievementStats.unlockedAchievements}/{achievementStats.totalAchievements}
          </Text>
        </HudContainer>
        <HudContainer style={styles.statCard}>
          <Text style={styles.statLabel}>COMPLETION</Text>
          <Text style={styles.statValue}>{achievementStats.completionRate}%</Text>
        </HudContainer>
        <HudContainer style={styles.statCard}>
          <Text style={styles.statLabel}>XP REWARDS</Text>
          <Text style={styles.statValue}>{achievementStats.totalXPRewards}</Text>
        </HudContainer>
      </View>
    );
  };

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
        <SectionHeader title="ACHIEVEMENTS" />

      {/* Rank Card */}
      {renderRankCard()}

      {/* Stats */}
      {renderStats()}

      {/* Category Filter */}
      <View style={styles.categoryFilter}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === category.id && styles.categoryButtonTextActive,
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

        {/* Achievements Grid */}
        <HudContainer style={styles.badgesContainer}>
          <Text style={styles.sectionTitle}>BADGES</Text>
          {renderAchievementGrid()}
        </HudContainer>

        {/* Milestones */}
        <HudContainer style={styles.milestonesCard}>
          <Text style={styles.sectionTitle}>MILESTONES</Text>
          {renderMilestones()}
        </HudContainer>

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
  rankCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  rankIcon: {
    fontSize: fs(48),
    marginRight: theme.spacing.lg,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: fs(24),
    fontWeight: '900',
    color: theme.colors.text.primary,
    letterSpacing: 2,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.heading,
  },
  rankDescription: {
    fontSize: fs(14),
    color: theme.colors.text.secondary,
  },
  nextRankInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  nextRankText: {
    fontSize: fs(12),
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  nextRankIcon: {
    fontSize: fs(20),
  },
  benefitsContainer: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.bg.glassBorder,
  },
  benefitsTitle: {
    fontSize: fs(12),
    fontWeight: '700',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    letterSpacing: 1,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  benefitText: {
    fontSize: fs(13),
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  statLabel: {
    fontSize: fs(10),
    fontWeight: '700',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
    letterSpacing: 1,
  },
  statValue: {
    fontSize: fs(20),
    fontWeight: '900',
    color: theme.colors.primary,
    fontFamily: theme.fonts.heading,
  },
  categoryFilter: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    flexWrap: 'wrap',
  },
  categoryButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.border.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.bg.glassBorder,
    backgroundColor: theme.colors.bg.glass,
  },
  categoryButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryButtonText: {
    fontSize: fs(12),
    fontWeight: '700',
    color: theme.colors.text.secondary,
  },
  categoryButtonTextActive: {
    color: theme.colors.bg.base,
  },
  badgesContainer: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  milestonesCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: fs(14),
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
    letterSpacing: 1,
    fontFamily: theme.fonts.heading,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.sm,
  },
  achievementCard: {
    width: '48%',
    marginHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.border.radius.lg,
    borderWidth: 1,
    backgroundColor: theme.colors.bg.glass,
  },
  achievementUnlocked: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '15',
  },
  achievementLocked: {
    borderColor: theme.colors.bg.glassBorder,
    opacity: 0.6,
  },
  achievementIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  achievementIcon: {
    fontSize: fs(32),
    marginRight: theme.spacing.sm,
  },
  achievementBadge: {
    marginLeft: 'auto',
  },
  achievementName: {
    fontSize: fs(13),
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  achievementNameLocked: {
    color: theme.colors.text.secondary,
  },
  achievementDescription: {
    fontSize: fs(11),
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    lineHeight: lineHeight(fs(11)),
  },
  achievementReward: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementRewardText: {
    fontSize: fs(11),
    fontWeight: '700',
    color: theme.colors.secondary,
    marginLeft: theme.spacing.xs,
  },
  milestonesContainer: {
    paddingHorizontal: theme.spacing.sm,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bg.glassBorder,
  },
  milestoneIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: theme.colors.bg.glass,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  milestoneIconAchieved: {
    backgroundColor: theme.colors.success + '20',
  },
  milestoneEmoji: {
    fontSize: fs(20),
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneName: {
    fontSize: fs(14),
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  milestoneNameAchieved: {
    color: theme.colors.success,
  },
  milestoneDescription: {
    fontSize: fs(12),
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  milestoneDate: {
    fontSize: fs(10),
    color: theme.colors.text.secondary,
  },
  spacer: {
    height: theme.spacing.xl,
  },
});
