import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Modal, TextInput, Switch, Animated, Keyboard,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { HudContainer } from '../../components/ui/HudContainer';
import { Button } from '../../components/ui/Button';
import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { GlowInput } from '../../components/ui/GlowInput';
import { theme } from '../../constants/theme';
import { scale, verticalScale, fontSize as fs } from '../../utils/responsive';
import { useAuthContext } from '../../context/AuthContext';
import { StatsService, PreferencesService, DailyProgressService } from '../../services/statsService';
import { QuestService } from '../../services/questService';
import { updateProfile } from '../../services/profileService';
import { DataExportService } from '../../services/dataExportService';
import type { UserStats, UserPreferences } from '../../services/statsService';
import type { UserQuest } from '../../services/questService';
import {
  User, Mail, Award, Flame, Dumbbell, Star, Target, Trophy,
  Lock, Bell, Palette, Ruler, ShieldCheck, Info,
  ChevronRight, LogOut, Crown, Zap, Edit2, X, Plus,
  Download, Trash2, FileText,
} from 'lucide-react-native';

const BADGES = [
  { id: '1', name: 'First Blood',     icon: Zap,     unlocked: true },
  { id: '2', name: '7-Day Streak',    icon: Flame,   unlocked: true },
  { id: '3', name: 'Heavy Lifter',    icon: Dumbbell,unlocked: true },
  { id: '4', name: 'Marathon Runner', icon: Target,  unlocked: false },
  { id: '5', name: 'Night Owl',       icon: Star,    unlocked: false },
  { id: '6', name: 'Champion',        icon: Crown,   unlocked: false },
];

const SETTINGS_ITEMS = [
  { key: 'notifications', label: 'Notification Preferences', icon: Bell },
  { key: 'appearance',    label: 'Appearance & Theme',       icon: Palette },
  { key: 'units',         label: 'Units & Measurements',     icon: Ruler },
  { key: 'privacy',       label: 'Privacy & Data',           icon: ShieldCheck },
  { key: 'legal',         label: 'Legal Information',       icon: FileText },
  { key: 'about',         label: 'About Ascend',          icon: Info },
];

// ─── Component ───────────────────────────────────────────────
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || 'AG';
}

export const Profile = React.memo(function Profile() {
  const { user, signOut, isDemoMode } = useAuthContext();
  const navigation = useNavigation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showAttributesModal, setShowAttributesModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Screen entry animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);
  
  // User data
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [completedQuests, setCompletedQuests] = useState<UserQuest[]>([]);
  const [dailyProgress, setDailyProgress] = useState<any>(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    character_name: '',
    age: '',
    weight: '',
    height: '',
    gender: '',
  });
  
  // Settings state
  const [settingsState, setSettingsState] = useState({
    workout_reminders: true,
    nutrition_reminders: true,
    sleep_reminders: true,
    achievement_notifications: true,
    profile_public: false,
    share_achievements: true,
  });

  const [unitsState, setUnitsState] = useState({
    weight_unit: 'kg' as 'kg' | 'lbs',
    height_unit: 'cm' as 'cm' | 'ft',
    distance_unit: 'km' as 'km' | 'miles',
  });

  const [privacyState, setPrivacyState] = useState({
    profile_public: false,
    share_achievements: true,
  });

  // Load user data
  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      // Load user stats
      const { data: stats } = await StatsService.getUserStats(user.id);
      
      // Load user preferences
      const { data: preferences } = await PreferencesService.getUserPreferences(user.id);
      
      // Load completed quests
      const { data: quests } = await QuestService.getCompletedQuests(user.id, 100);
      
      // Load today's progress for workout count
      const { data: progress } = await DailyProgressService.getTodayProgress(user.id);
      
      // Load progress history for total workouts
      const { data: history } = await DailyProgressService.getProgressHistory(user.id, 365);
      
      setUserStats(stats);
      setUserPreferences(preferences);
      setCompletedQuests(quests || []);
      setDailyProgress(progress);
      
      // Update settings state
      if (preferences) {
        setSettingsState({
          workout_reminders: preferences.workout_reminders ?? false,
          nutrition_reminders: preferences.nutrition_reminders ?? false,
          sleep_reminders: preferences.sleep_reminders ?? false,
          achievement_notifications: preferences.achievement_notifications ?? false,
          profile_public: preferences.profile_public ?? false,
          share_achievements: preferences.share_achievements ?? false,
        });
        setUnitsState({
          weight_unit: (preferences.weight_unit as 'kg' | 'lbs') || 'kg',
          height_unit: (preferences.height_unit as 'cm' | 'ft') || 'cm',
          distance_unit: (preferences.distance_unit as 'km' | 'miles') || 'km',
        });
        setPrivacyState({
          profile_public: preferences.profile_public ?? false,
          share_achievements: preferences.share_achievements ?? false,
        });

        // Update edit form
        setEditForm({
          character_name: stats?.character_name || '',
          age: preferences.age?.toString() || '',
          weight: preferences.weight?.toString() || '',
          height: preferences.height?.toString() || '',
          gender: preferences.gender || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = React.useCallback(() => {
    if (!userStats) {
      return {
        totalWorkouts: 0,
        currentStreak: 0,
        totalXp: 0,
        achievements: 0,
        totalAchievements: 6,
        memberSince: 'Unknown',
        rank: 'E-RANK',
        hunterClass: 'RECRUIT',
      };
    }
    
    // Calculate rank based on level
    const level = userStats.level;
    let rank = 'E-RANK';
    let hunterClass = 'RECRUIT';
    
    if (level >= 50) { rank = 'S-RANK'; hunterClass = 'HUNTER'; }
    else if (level >= 40) { rank = 'A-RANK'; hunterClass = 'ELITE'; }
    else if (level >= 30) { rank = 'B-RANK'; hunterClass = 'VETERAN'; }
    else if (level >= 20) { rank = 'C-RANK'; hunterClass = 'ADVANCED'; }
    else if (level >= 10) { rank = 'D-RANK'; hunterClass = 'INTERMEDIATE'; }
    
    return {
      totalWorkouts: dailyProgress?.workouts_completed || 0,
      currentStreak: userStats.day_streak,
      totalXp: userStats.total_xp_earned,
      achievements: completedQuests.length,
      totalAchievements: 24, // This could be calculated from total available quests
      memberSince: new Date(user?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      rank,
      hunterClass,
    };
  }, [userStats, dailyProgress, completedQuests, user?.created_at]);

  const displayName = React.useMemo(() => userStats?.character_name || user?.email?.split('@')[0]?.toUpperCase() || 'AGENT', [userStats?.character_name, user?.email]);
  const email = React.useMemo(() => user?.email ?? (isDemoMode ? 'demo@systemfit.app' : '—'), [user?.email, isDemoMode]);
  const playerStats = calculateStats();
  const xpProgress = React.useMemo(() => userStats
    ? userStats.current_xp / Math.max(userStats.xp_to_next_level, 1)
    : 0, [userStats]);
  const initials = React.useMemo(() => getInitials(displayName), [displayName]);

  const handleLogout = React.useCallback(async () => {
    Alert.alert(
      'LOG OUT',
      isDemoMode ? 'Exit demo mode and return to login?' : 'Terminate current system session?',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'CONFIRM',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            await signOut();
            setIsLoggingOut(false);
          },
        },
      ],
    );
  }, [isDemoMode, signOut]);

  const handleEditProfile = React.useCallback(() => {
    setShowEditModal(true);
  }, []);

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await updateProfile(user.id, {
        character_name: editForm.character_name || undefined,
        age: editForm.age ? parseInt(editForm.age, 10) : undefined,
        weight: editForm.weight ? parseFloat(editForm.weight) : undefined,
        height: editForm.height ? parseFloat(editForm.height) : undefined,
        gender: editForm.gender || undefined,
      });

      if (error) {
        Alert.alert('ERROR', error.message);
      } else {
        Alert.alert('SUCCESS', 'Profile updated successfully!');
        setShowEditModal(false);
        loadProfileData();
      }
    } catch {
      Alert.alert('ERROR', 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await PreferencesService.updateUserPreferences(user.id, settingsState);
      
      if (error) {
        Alert.alert('ERROR', 'Failed to update settings.');
      } else {
        Alert.alert('SUCCESS', 'Settings updated successfully!');
        setShowSettingsModal(false);
        loadProfileData();
      }
    } catch (error) {
      Alert.alert('ERROR', 'Something went wrong.');
    }
  };

  const handleSaveUnits = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    const { error } = await PreferencesService.updateUserPreferences(user.id, unitsState);
    setIsSaving(false);
    if (error) {
      Alert.alert('ERROR', 'Failed to update units.');
    } else {
      Alert.alert('SUCCESS', 'Units updated.');
      setShowUnitsModal(false);
      loadProfileData();
    }
  };

  const handleSavePrivacy = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    const { error } = await PreferencesService.updateUserPreferences(user.id, privacyState);
    setIsSaving(false);
    if (error) {
      Alert.alert('ERROR', 'Failed to update privacy settings.');
    } else {
      Alert.alert('SUCCESS', 'Privacy settings updated.');
      setShowPrivacyModal(false);
      loadProfileData();
    }
  };

  const handleSettingPress = React.useCallback((key: string) => {
    switch (key) {
      case 'notifications':
        setShowSettingsModal(true);
        break;
      case 'units':
        setShowUnitsModal(true);
        break;
      case 'privacy':
        setShowPrivacyModal(true);
        break;
      case 'legal':
        setShowLegalModal(true);
        break;
      case 'about':
        setShowAboutModal(true);
        break;
      case 'appearance':
        Alert.alert('COMING SOON', 'Light theme will be available in a future update.');
        break;
      default:
        break;
    }
  }, []);

  const handleAllocatePoint = async (attribute: 'strength' | 'intelligence' | 'stamina' | 'code_knowledge' | 'agility' | 'communication') => {
    if (!user?.id || !userStats) return;

    if (userStats.points_available <= 0) {
      Alert.alert('NO POINTS', 'You have no points available to allocate. Level up to earn more points!');
      return;
    }

    try {
      const { data, error } = await StatsService.allocatePoint(user.id, attribute);
      if (error) {
        Alert.alert('ERROR', 'Failed to allocate point.');
      } else {
        setUserStats(data);
      }
    } catch (error) {
      Alert.alert('ERROR', 'Something went wrong.');
    }
  };

  const handleExportData = async () => {
    if (!user?.id) return;

    Alert.alert(
      'EXPORT DATA',
      'This will export all your data as a JSON file for your records. Continue?',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'EXPORT',
          style: 'default',
          onPress: async () => {
            setIsExporting(true);
            try {
              const { data, error } = await DataExportService.exportUserData(user.id, user.email || null);
              if (error) {
                Alert.alert('ERROR', 'Failed to export data.');
              } else if (data) {
                const json = DataExportService.formatAsJSON(data);
                Alert.alert(
                  'DATA EXPORTED',
                  'Your data has been exported successfully. Copy the data below:',
                  [
                    { text: 'COPY', onPress: () => {
                      // In a real app, you would copy to clipboard
                      Alert.alert('COPIED', 'Data copied to clipboard (simulated)');
                    }},
                    { text: 'OK' },
                  ]
                );
                console.log('Exported data:', json);
              }
            } catch (error) {
              Alert.alert('ERROR', 'Something went wrong.');
            } finally {
              setIsExporting(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    Alert.alert(
      'DELETE ACCOUNT',
      'This action is irreversible. All your data will be permanently deleted. Are you sure?',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'DELETE',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'FINAL CONFIRMATION',
              'This will delete your account and all associated data. This cannot be undone. Continue?',
              [
                { text: 'CANCEL', style: 'cancel' },
                {
                  text: 'DELETE ACCOUNT',
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeleting(true);
                    try {
                      const { success, error } = await DataExportService.deleteAccount(user.id);
                      if (error) {
                        Alert.alert('ERROR', 'Failed to delete account.');
                      } else if (success) {
                        Alert.alert(
                          'ACCOUNT DELETED',
                          'Your account has been deleted successfully.',
                          [{ text: 'OK', onPress: async () => await signOut() }]
                        );
                      }
                    } catch (error) {
                      Alert.alert('ERROR', 'Something went wrong.');
                    } finally {
                      setIsDeleting(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>LOADING PROFILE...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ══════ PROFILE HEADER ══════ */}
        <HudContainer style={styles.header}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={handleEditProfile} activeOpacity={0.7}>
              <Edit2 color={theme.colors.primary} size={14} />
            </TouchableOpacity>
          </View>

          <Text style={styles.playerName}>{displayName}</Text>
          <View style={styles.emailRow}>
            <Mail color={theme.colors.text.secondary} size={12} />
            <Text style={styles.email}>{email}</Text>
          </View>

          {/* Rank Badge */}
          <View style={styles.rankBadge}>
            <Crown color={theme.colors.gold} size={12} />
            <Text style={styles.rankText}>{playerStats.rank} {playerStats.hunterClass}</Text>
          </View>

          <Text style={styles.memberSince}>Member since {playerStats.memberSince}</Text>

          {userStats && (
            <View style={styles.levelSection}>
              <View style={styles.levelRow}>
                <Text style={styles.levelLabel}>LEVEL {userStats.level}</Text>
              </View>
              <Text style={styles.xpText}>
                {userStats.current_xp} / {userStats.xp_to_next_level} XP
              </Text>
              <View style={styles.xpBarTrack}>
                <View style={[styles.xpBarFill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
              </View>
            </View>
          )}
        </HudContainer>

        {/* ══════ POINTS AVAILABLE ══════ */}
        <TouchableOpacity onPress={() => setShowAttributesModal(true)} activeOpacity={0.7}>
          <HudContainer style={styles.pointsCard}>
            <View style={styles.pointsLeft}>
              <Star color={theme.colors.primary} size={20} />
              <View>
                <Text style={styles.pointsLabel}>POINTS AVAILABLE</Text>
                <Text style={styles.pointsValue}>{userStats?.points_available || 0}</Text>
              </View>
            </View>
            <ChevronRight color={theme.colors.textDimmed} size={16} />
          </HudContainer>
        </TouchableOpacity>

        {/* ══════ STATS GRID ══════ */}
        <SectionHeader
          title="Stats Overview"
          icon={<Award color={theme.colors.primary} size={14} />}
        />
        <View style={styles.statsGrid}>
          <HudContainer style={styles.statCard}>
            <Dumbbell color="#FF6B6B" size={16} />
            <AnimatedCounter value={playerStats.totalWorkouts} color="#FF6B6B" style={styles.statNumber} />
            <Text style={styles.statLabel}>WORKOUTS</Text>
          </HudContainer>
          <HudContainer style={styles.statCard}>
            <Flame color="#FFD93D" size={16} />
            <AnimatedCounter value={playerStats.currentStreak} color="#FFD93D" style={styles.statNumber} />
            <Text style={styles.statLabel}>DAY STREAK</Text>
          </HudContainer>
          <HudContainer style={styles.statCard}>
            <Star color={theme.colors.primary} size={16} />
            <AnimatedCounter value={playerStats.totalXp} color={theme.colors.primary} style={styles.statNumber} />
            <Text style={styles.statLabel}>TOTAL XP</Text>
          </HudContainer>
          <HudContainer style={styles.statCard}>
            <Trophy color="#AC89FF" size={16} />
            <Text style={styles.achievementText}>
              <Text style={{ color: '#AC89FF', fontWeight: '900', fontSize: 22 }}>{playerStats.achievements}</Text>
              <Text style={{ color: theme.colors.textDimmed }}> / {playerStats.totalAchievements}</Text>
            </Text>
            <Text style={styles.statLabel}>BADGES</Text>
          </HudContainer>
        </View>

        {/* ══════ ATTRIBUTES ══════ */}
        <SectionHeader
          title="Character Attributes"
          icon={<Zap color={theme.colors.primary} size={14} />}
          actionLabel="ALLOCATE"
          onAction={() => setShowAttributesModal(true)}
        />
        <Card style={styles.attributesCard}>
          <AttributeRow label="STRENGTH" value={userStats?.strength || 5} color="#FF6B6B" />
          <AttributeRow label="INTELLIGENCE" value={userStats?.intelligence || 5} color="#6DDDFF" />
          <AttributeRow label="STAMINA" value={userStats?.stamina || 5} color="#00FF99" />
          <AttributeRow label="CODE KNOWLEDGE" value={userStats?.code_knowledge || 5} color="#AC89FF" />
          <AttributeRow label="AGILITY" value={userStats?.agility || 5} color="#FFD93D" />
          <AttributeRow label="COMMUNICATION" value={userStats?.communication || 5} color="#FF716C" />
        </Card>

        {/* ══════ ACHIEVEMENTS ══════ */}
        <SectionHeader
          title="Achievements"
          icon={<Trophy color={theme.colors.primary} size={14} />}
          actionLabel="VIEW ALL"
          onAction={() => setShowAchievementsModal(true)}
        />
        <View style={styles.badgesGrid}>
          {BADGES.map((badge) => {
            const Icon = badge.icon;
            return (
              <TouchableOpacity
                key={badge.id}
                style={[styles.badgeCard, !badge.unlocked && styles.badgeLocked]}
                onPress={() => setShowAchievementsModal(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.badgeIconWrap, !badge.unlocked && styles.badgeIconLocked]}>
                  <Icon
                    color={badge.unlocked ? theme.colors.primary : theme.colors.text.secondary}
                    size={24}
                  />
                  {!badge.unlocked && <Lock color={theme.colors.text.secondary} size={14} style={styles.lockIcon} />}
                </View>
                <Text style={styles.badgeName}>{badge.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ══════ USER INFO ══════ */}
        <SectionHeader
          title="Personal Information"
          icon={<User color={theme.colors.primary} size={14} />}
          actionLabel="EDIT"
          onAction={handleEditProfile}
        />
        <HudContainer style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>AGE</Text>
            <Text style={styles.infoValue}>{userPreferences?.age || 'Not set'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>WEIGHT</Text>
            <Text style={styles.infoValue}>
              {userPreferences?.weight ? `${userPreferences.weight} ${userPreferences.weight_unit || 'kg'}` : 'Not set'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>HEIGHT</Text>
            <Text style={styles.infoValue}>
              {userPreferences?.height ? `${userPreferences.height} ${userPreferences.height_unit || 'cm'}` : 'Not set'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>PRIMARY GOAL</Text>
            <Text style={styles.infoValue}>
              {userPreferences?.primary_goal ? userPreferences.primary_goal.replace('_', ' ').toUpperCase() : 'Not set'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>FITNESS LEVEL</Text>
            <Text style={styles.infoValue}>
              {userPreferences?.fitness_level ? userPreferences.fitness_level.toUpperCase() : 'Not set'}
            </Text>
          </View>
        </HudContainer>

        {/* ══════ SETTINGS ══════ */}
        <SectionHeader title="Settings" />
        <HudContainer style={styles.settingsCard}>
          {SETTINGS_ITEMS.map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.settingItem,
                  index < SETTINGS_ITEMS.length - 1 && styles.settingBorder,
                ]}
                onPress={() => handleSettingPress(item.key)}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <Icon color={theme.colors.text.secondary} size={16} />
                  <Text style={styles.settingLabel}>{item.label}</Text>
                </View>
                <ChevronRight color={theme.colors.text.secondary} size={16} />
              </TouchableOpacity>
            );
          })}
        </HudContainer>

        {/* ══════ DATA MANAGEMENT ══════ */}
        <SectionHeader title="Data Management" />
        <HudContainer style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleExportData}
            activeOpacity={0.7}
            disabled={isExporting}
          >
            <View style={styles.settingLeft}>
              <Download color={theme.colors.primary} size={16} />
              <Text style={styles.settingLabel}>Export My Data</Text>
            </View>
            <ChevronRight color={theme.colors.text.secondary} size={16} />
          </TouchableOpacity>
          <View style={styles.settingBorder} />
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
            disabled={isDeleting}
          >
            <View style={styles.settingLeft}>
              <Trash2 color={theme.colors.danger} size={16} />
              <Text style={[styles.settingLabel, styles.dangerText]}>Delete My Account</Text>
            </View>
            <ChevronRight color={theme.colors.text.secondary} size={16} />
          </TouchableOpacity>
        </HudContainer>

        {/* ══════ LOGOUT ══════ */}
        <Button
          title={isLoggingOut ? 'TERMINATING...' : 'LOG OUT'}
          variant="outline"
          onPress={handleLogout}
          isLoading={isLoggingOut}
          style={styles.logoutBtn}
        />

        <View style={{ height: verticalScale(32) }} />
      </ScrollView>
      </Animated.View>
      
      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <BlurView tint="dark" intensity={80} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>EDIT PROFILE</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X color={theme.colors.text.secondary} size={22} />
              </TouchableOpacity>
            </View>
            
            <GlowInput
              label="USERNAME"
              placeholder="Enter your username"
              value={editForm.character_name}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, character_name: text }))}
              autoCapitalize="words"
              blurOnSubmit={false}
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            <GlowInput
              label="AGE"
              placeholder="Enter age"
              value={editForm.age}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, age: text }))}
              keyboardType="numeric"
              blurOnSubmit={false}
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            <GlowInput
              label={`WEIGHT (${userPreferences?.weight_unit || 'kg'})`}
              placeholder="Enter weight"
              value={editForm.weight}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, weight: text }))}
              keyboardType="numeric"
              blurOnSubmit={false}
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            <GlowInput
              label={`HEIGHT (${userPreferences?.height_unit || 'cm'})`}
              placeholder="Enter height"
              value={editForm.height}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, height: text }))}
              keyboardType="numeric"
              blurOnSubmit={false}
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            <GlowInput
              label="GENDER"
              placeholder="Enter gender (optional)"
              value={editForm.gender}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, gender: text }))}
              blurOnSubmit={false}
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            
            <Button
              title="SAVE PROFILE"
              onPress={handleSaveProfile}
              isLoading={isSaving}
              style={{ marginTop: theme.spacing.lg }}
            />
          </View>
        </BlurView>
      </Modal>
      
      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent animationType="slide">
        <BlurView tint="dark" intensity={80} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>NOTIFICATION SETTINGS</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <X color={theme.colors.text.secondary} size={22} />
              </TouchableOpacity>
            </View>
            
            {Object.entries(settingsState).map(([key, value]) => (
              <View key={key} style={styles.settingToggleRow}>
                <View style={styles.settingToggleLeft}>
                  <Text style={styles.settingToggleLabel}>
                    {key.replace('_', ' ').toUpperCase()}
                  </Text>
                  <Text style={styles.settingToggleDesc}>
                    {getSettingDescription(key)}
                  </Text>
                </View>
                <Switch
                  value={value}
                  onValueChange={(newValue) => 
                    setSettingsState(prev => ({ ...prev, [key]: newValue }))
                  }
                  trackColor={{ false: theme.colors.bg.glassBorder, true: theme.colors.primary }}
                  thumbColor={theme.colors.text.primary}
                />
              </View>
            ))}
            
            <Button
              title="SAVE SETTINGS"
              onPress={handleSaveSettings}
              style={{ marginTop: theme.spacing.lg }}
            />
          </View>
        </BlurView>
      </Modal>
      
      {/* Attributes Allocation Modal */}
      <Modal visible={showAttributesModal} transparent animationType="slide">
        <BlurView tint="dark" intensity={80} style={styles.modalOverlay}>
          <View style={styles.modalContentCompact}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ALLOCATE POINTS</Text>
              <TouchableOpacity onPress={() => setShowAttributesModal(false)}>
                <X color={theme.colors.text.secondary} size={22} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.pointsAvailableBanner}>
              <Star color={theme.colors.primary} size={16} />
              <Text style={styles.pointsAvailableText}>
                {userStats?.points_available || 0} POINTS AVAILABLE
              </Text>
            </View>
            
            <AttributeAllocationRow
              label="STRENGTH"
              value={userStats?.strength || 5}
              color="#FF6B6B"
              onAllocate={() => handleAllocatePoint('strength')}
              pointsAvailable={userStats?.points_available || 0}
            />
            <AttributeAllocationRow
              label="INTELLIGENCE"
              value={userStats?.intelligence || 5}
              color="#6DDDFF"
              onAllocate={() => handleAllocatePoint('intelligence')}
              pointsAvailable={userStats?.points_available || 0}
            />
            <AttributeAllocationRow
              label="STAMINA"
              value={userStats?.stamina || 5}
              color="#00FF99"
              onAllocate={() => handleAllocatePoint('stamina')}
              pointsAvailable={userStats?.points_available || 0}
            />
            <AttributeAllocationRow
              label="CODE KNOWLEDGE"
              value={userStats?.code_knowledge || 5}
              color="#AC89FF"
              onAllocate={() => handleAllocatePoint('code_knowledge')}
              pointsAvailable={userStats?.points_available || 0}
            />
            <AttributeAllocationRow
              label="AGILITY"
              value={userStats?.agility || 5}
              color="#FFD93D"
              onAllocate={() => handleAllocatePoint('agility')}
              pointsAvailable={userStats?.points_available || 0}
            />
            <AttributeAllocationRow
              label="COMMUNICATION"
              value={userStats?.communication || 5}
              color="#FF716C"
              onAllocate={() => handleAllocatePoint('communication')}
              pointsAvailable={userStats?.points_available || 0}
            />
          </View>
        </BlurView>
      </Modal>
      
      {/* Units Modal */}
      <Modal visible={showUnitsModal} transparent animationType="slide">
        <BlurView tint="dark" intensity={80} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>UNITS & MEASUREMENTS</Text>
              <TouchableOpacity onPress={() => setShowUnitsModal(false)}>
                <X color={theme.colors.text.secondary} size={22} />
              </TouchableOpacity>
            </View>
            <UnitPickerRow
              label="WEIGHT"
              options={['kg', 'lbs'] as const}
              value={unitsState.weight_unit}
              onChange={(v) => setUnitsState(prev => ({ ...prev, weight_unit: v }))}
            />
            <UnitPickerRow
              label="HEIGHT"
              options={['cm', 'ft'] as const}
              value={unitsState.height_unit}
              onChange={(v) => setUnitsState(prev => ({ ...prev, height_unit: v }))}
            />
            <UnitPickerRow
              label="DISTANCE"
              options={['km', 'miles'] as const}
              value={unitsState.distance_unit}
              onChange={(v) => setUnitsState(prev => ({ ...prev, distance_unit: v }))}
            />
            <Button title="SAVE UNITS" onPress={handleSaveUnits} isLoading={isSaving} style={{ marginTop: theme.spacing.lg }} />
          </View>
        </BlurView>
      </Modal>

      {/* Privacy Modal */}
      <Modal visible={showPrivacyModal} transparent animationType="slide">
        <BlurView tint="dark" intensity={80} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>PRIVACY & DATA</Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                <X color={theme.colors.text.secondary} size={22} />
              </TouchableOpacity>
            </View>
            {(['profile_public', 'share_achievements'] as const).map((key) => (
              <View key={key} style={styles.settingToggleRow}>
                <View style={styles.settingToggleLeft}>
                  <Text style={styles.settingToggleLabel}>{key.replace('_', ' ').toUpperCase()}</Text>
                  <Text style={styles.settingToggleDesc}>{getSettingDescription(key)}</Text>
                </View>
                <Switch
                  value={privacyState[key]}
                  onValueChange={(v) => setPrivacyState(prev => ({ ...prev, [key]: v }))}
                  trackColor={{ false: theme.colors.bg.glassBorder, true: theme.colors.primary }}
                  thumbColor={theme.colors.text.primary}
                />
              </View>
            ))}
            <Button title="SAVE PRIVACY" onPress={handleSavePrivacy} isLoading={isSaving} style={{ marginTop: theme.spacing.lg }} />
          </View>
        </BlurView>
      </Modal>

      {/* About Modal */}
      <Modal visible={showAboutModal} transparent animationType="slide">
        <BlurView tint="dark" intensity={80} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ABOUT ASCEND</Text>
              <TouchableOpacity onPress={() => setShowAboutModal(false)}>
                <X color={theme.colors.text.secondary} size={22} />
              </TouchableOpacity>
            </View>
            <Text style={styles.aboutText}>Ascend v0.1.0 (Alpha)</Text>
            <Text style={styles.aboutDesc}>
              Gamified health and fitness coaching. Track workouts, complete daily quests, and level up your real-life stats.
            </Text>
            <Text style={styles.aboutDesc}>
              Built with React Native, Expo, and Supabase.
            </Text>
          </View>
        </BlurView>
      </Modal>

      {/* Legal Modal */}
      <Modal visible={showLegalModal} transparent animationType="slide">
        <BlurView tint="dark" intensity={80} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>LEGAL INFORMATION</Text>
              <TouchableOpacity onPress={() => setShowLegalModal(false)}>
                <X color={theme.colors.text.secondary} size={22} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.legalLinkItem}
              onPress={() => {
                setShowLegalModal(false);
                (navigation as any).navigate('TermsOfService');
              }}
              activeOpacity={0.7}
            >
              <FileText color={theme.colors.primary} size={18} />
              <Text style={styles.legalLinkText}>Terms of Service</Text>
              <ChevronRight color={theme.colors.text.secondary} size={16} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.legalLinkItem}
              onPress={() => {
                setShowLegalModal(false);
                (navigation as any).navigate('PrivacyPolicy');
              }}
              activeOpacity={0.7}
            >
              <ShieldCheck color={theme.colors.primary} size={18} />
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
              <ChevronRight color={theme.colors.text.secondary} size={16} />
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>

      {/* Achievements Modal */}
      <Modal visible={showAchievementsModal} transparent animationType="slide">
        <BlurView tint="dark" intensity={80} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ACHIEVEMENTS</Text>
              <TouchableOpacity onPress={() => setShowAchievementsModal(false)}>
                <X color={theme.colors.text.secondary} size={22} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.achievementsGrid}>
              {BADGES.map((badge) => {
                const Icon = badge.icon;
                return (
                  <View
                    key={badge.id}
                    style={[styles.achievementCard, !badge.unlocked && styles.achievementCardLocked]}
                  >
                    <View style={[styles.achievementIconWrap, !badge.unlocked && styles.achievementIconLocked]}>
                      <Icon
                        color={badge.unlocked ? theme.colors.primary : theme.colors.textDimmed}
                        size={28}
                      />
                      {!badge.unlocked && <Lock color={theme.colors.textDimmed} size={14} style={styles.lockIcon} />}
                    </View>
                    <Text style={[styles.achievementName, !badge.unlocked && styles.achievementNameLocked]}>
                      {badge.name}
                    </Text>
                    <Text style={styles.achievementStatus}>
                      {badge.unlocked ? 'UNLOCKED' : 'LOCKED'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </BlurView>
      </Modal>
    </ScreenWrapper>
  );
});

function UnitPickerRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.unitPickerSection}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.unitPickerRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.unitPickerChip, value === opt && styles.unitPickerChipActive]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.unitPickerChipText, value === opt && styles.unitPickerChipTextActive]}>
              {opt.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const getSettingDescription = (key: string) => {
  const descriptions: Record<string, string> = {
    workout_reminders: 'Daily workout notifications',
    nutrition_reminders: 'Meal and water reminders',
    sleep_reminders: 'Bedtime and quality reminders',
    achievement_notifications: 'Level up and milestone alerts',
    profile_public: 'Allow others to see your achievements',
    share_achievements: 'Post milestones to your profile',
  };
  return descriptions[key] || '';
};

// Attribute Row Component
function AttributeRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.attributeRow}>
      <Text style={styles.attributeLabel}>{label}</Text>
      <View style={styles.attributeValueContainer}>
        <Text style={[styles.attributeValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

// Attribute Allocation Row Component
function AttributeAllocationRow({ 
  label, 
  value, 
  color, 
  onAllocate, 
  pointsAvailable 
}: { 
  label: string; 
  value: number; 
  color: string; 
  onAllocate: () => void;
  pointsAvailable: number;
}) {
  return (
    <View style={styles.attributeAllocationRow}>
      <View style={styles.attributeAllocationLeft}>
        <Text style={styles.attributeAllocationLabel}>{label}</Text>
        <Text style={[styles.attributeAllocationValue, { color }]}>{value}</Text>
      </View>
      <TouchableOpacity
        style={[styles.allocateButton, pointsAvailable <= 0 && styles.allocateButtonDisabled]}
        onPress={onAllocate}
        disabled={pointsAvailable <= 0}
        activeOpacity={0.7}
      >
        <Plus color={pointsAvailable > 0 ? theme.colors.primary : theme.colors.textDimmed} size={16} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { padding: theme.spacing.lg },

  // Header
  header: { alignItems: 'center', marginBottom: theme.spacing.lg, padding: theme.spacing.lg },
  avatarOuter: {
    padding: 3,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...theme.glow.cyan,
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: scale(88),
    height: scale(88),
    backgroundColor: theme.colors.bg.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(44),
  },
  avatarInitials: {
    fontSize: fs(32),
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 2,
    fontFamily: theme.fonts.heading,
  },
  levelSection: {
    width: '100%',
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  levelLabel: {
    fontSize: fs(12),
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 2,
  },
  xpText: {
    fontSize: fs(11),
    color: theme.colors.text.secondary,
    letterSpacing: 1,
    marginTop: 2,
    marginBottom: theme.spacing.sm,
  },
  xpBarTrack: {
    height: verticalScale(6),
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: scale(3),
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  playerName: {
    fontSize: fs(24),
    fontWeight: '900',
    color: theme.colors.text.primary,
    letterSpacing: 3,
    fontFamily: theme.fonts.heading,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  email: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.gold + '40',
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.gold + '15',
    borderRadius: theme.border.radius.sm,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.gold,
    letterSpacing: 2,
  },
  memberSince: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    letterSpacing: 1,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    padding: 0,
  },
  statNumber: {
    fontSize: 22,
    marginTop: 6,
    marginBottom: 2,
    fontFamily: theme.fonts.heading,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  achievementText: {
    marginTop: 6,
    marginBottom: 2,
  },

  // Badges
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.lg,
  },
  badgeCard: {
    alignItems: 'center',
    width: '31%',
    marginBottom: theme.spacing.sm,
  },
  badgeLocked: {
    opacity: 0.4,
  },
  badgeIconWrap: {
    width: scale(48),
    height: scale(48),
    borderWidth: 1,
    borderColor: theme.colors.bg.glassBorder,
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: theme.colors.bg.glass,
  },
  badgeIconLocked: {
    borderColor: 'transparent',
  },
  badgeName: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Settings
  settingsCard: {
    padding: 0,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  settingBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bg.glassBorder,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },

  // Logout
  logoutBtn: {
    marginTop: theme.spacing.xl,
    borderColor: theme.colors.danger,
  },
  
  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: theme.colors.text.secondary, fontSize: 14, fontWeight: '600', letterSpacing: 2 },
  
  // Edit button
  editBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Info card
  infoCard: {
    padding: 0,
    marginBottom: theme.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bg.glassBorder,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: 1.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
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
  modalContentCompact: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: theme.colors.bg.glassBorder,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    maxHeight: '80%',
    zIndex: 1001,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.text.primary,
    letterSpacing: 2,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: 1.5,
    marginTop: theme.spacing.md,
  },
  
  // Settings toggle
  settingToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bg.glassBorder,
  },
  settingToggleLeft: {
    flex: 1,
  },
  settingToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  settingToggleDesc: {
    fontSize: 11,
    color: theme.colors.text.secondary,
  },

  // Points card
  pointsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  pointsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  pointsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: 1.5,
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 2,
    fontFamily: theme.fonts.heading,
  },

  // Attributes card
  attributesCard: {
    padding: 0,
    marginBottom: theme.spacing.lg,
  },
  attributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bg.glassBorder,
  },
  attributeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: 1.5,
  },
  attributeValueContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  attributeValue: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: theme.fonts.heading,
  },

  lockIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },

  // Points available banner
  pointsAvailableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
    borderRadius: theme.border.radius.md,
    marginBottom: theme.spacing.lg,
  },
  pointsAvailableText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 1,
  },

  // Attribute allocation
  attributeAllocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bg.glassBorder,
  },
  attributeAllocationLeft: {
    flex: 1,
  },
  attributeAllocationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: 1.5,
    marginBottom: 1,
  },
  attributeAllocationValue: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: theme.fonts.heading,
  },
  allocateButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.glow.cyan,
  },
  allocateButtonDisabled: {
    backgroundColor: theme.colors.border,
    ...theme.glow.danger,
  },

  // Achievements grid
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  achievementCard: {
    width: '48%',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: theme.colors.ghostBorder,
  },
  achievementCardLocked: {
    opacity: 0.4,
    borderColor: theme.colors.border,
  },
  achievementIconWrap: {
    width: scale(56),
    height: scale(56),
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    ...theme.glow.cyan,
  },
  achievementIconLocked: {
    borderColor: theme.colors.border,
  },
  achievementName: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  achievementNameLocked: {
    color: theme.colors.text.secondary,
  },
  achievementStatus: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  unitPickerSection: { marginTop: theme.spacing.md },
  unitPickerRow: { flexDirection: 'row', gap: theme.spacing.sm },
  unitPickerChip: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  unitPickerChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(109, 221, 255, 0.1)',
  },
  unitPickerChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textDimmed,
    letterSpacing: 1,
  },
  unitPickerChipTextActive: { color: theme.colors.primary },
  aboutText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 2,
    marginBottom: theme.spacing.md,
  },
  aboutDesc: {
    fontSize: 13,
    color: theme.colors.textDimmed,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  dangerText: { color: theme.colors.danger },
  legalLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bg.glassBorder,
  },
  legalLinkText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
});
