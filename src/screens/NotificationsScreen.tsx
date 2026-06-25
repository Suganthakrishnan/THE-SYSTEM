import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useAuthContext } from '../context/AuthContext';
import { NotificationService, Notification, NotificationPreferences } from '../services/notificationService';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';
import { scale, verticalScale, fontSize as fs } from '../utils/responsive';
import { theme } from '../constants/theme';
import { Bell, Check, Trash2, Settings, Clock, Trophy, Flame, Zap, Info } from 'lucide-react-native';

export function NotificationsScreen() {
  const { session } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    loadNotificationsData();
  }, [session]);

  const loadNotificationsData = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const [notificationsResult, unreadResult, prefsResult] = await Promise.all([
        NotificationService.getUserNotifications(session.user.id, 50),
        NotificationService.getUnreadCount(session.user.id),
        NotificationService.getNotificationPreferences(session.user.id),
      ]);

      setNotifications(notificationsResult.data);
      setUnreadCount(unreadResult.count);
      setPreferences(prefsResult.data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
      loadNotificationsData();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!session?.user?.id) return;
    try {
      await NotificationService.markAllAsRead(session.user.id);
      loadNotificationsData();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await NotificationService.deleteNotification(notificationId);
      loadNotificationsData();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleUpdatePreference = async (key: keyof NotificationPreferences, value: any) => {
    if (!session?.user?.id || !preferences) return;

    try {
      await NotificationService.updateNotificationPreferences(session.user.id, {
        [key]: value,
      });
      setPreferences({ ...preferences, [key]: value });
    } catch (error) {
      console.error('Error updating preference:', error);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'workout_reminder':
        return <Clock size={20} color={theme.colors.primary} />;
      case 'quest_complete':
        return <Check size={20} color={theme.colors.success} />;
      case 'achievement_unlocked':
        return <Trophy size={20} color={theme.colors.warning} />;
      case 'streak_milestone':
        return <Flame size={20} color={theme.colors.danger} />;
      case 'level_up':
        return <Zap size={20} color={theme.colors.tertiary} />;
      default:
        return <Info size={20} color={theme.colors.textDimmed} />;
    }
  };

  const renderNotificationItem = (notification: Notification) => {
    return (
      <TouchableOpacity
        key={notification.id}
        style={[
          styles.notificationItem,
          !notification.read && styles.notificationUnread,
        ]}
        onPress={() => !notification.read && handleMarkAsRead(notification.id)}
      >
        <View style={styles.notificationIcon}>
          {getNotificationIcon(notification.type)}
        </View>
        <View style={styles.notificationContent}>
          <Text style={[
            styles.notificationTitle,
            !notification.read && styles.notificationTitleUnread,
          ]}>
            {notification.title}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {notification.body}
          </Text>
          <Text style={styles.notificationTime}>
            {new Date(notification.created_at).toLocaleString()}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteNotification(notification.id)}
        >
          <Trash2 size={16} color={theme.colors.textDimmed} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderPreferences = () => {
    if (!preferences) return null;

    return (
      <Card variant="default" style={styles.preferencesCard}>
        <View style={styles.preferencesHeader}>
          <Settings size={20} color={theme.colors.primary} />
          <Text style={styles.preferencesTitle}>Notification Preferences</Text>
        </View>

        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>Workout Reminders</Text>
          <Switch
            value={preferences.workout_reminders}
            onValueChange={(value) => handleUpdatePreference('workout_reminders', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={preferences.workout_reminders ? theme.colors.background : theme.colors.textDimmed}
          />
        </View>

        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>Quest Notifications</Text>
          <Switch
            value={preferences.quest_notifications}
            onValueChange={(value) => handleUpdatePreference('quest_notifications', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={preferences.quest_notifications ? theme.colors.background : theme.colors.textDimmed}
          />
        </View>

        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>Achievement Notifications</Text>
          <Switch
            value={preferences.achievement_notifications}
            onValueChange={(value) => handleUpdatePreference('achievement_notifications', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={preferences.achievement_notifications ? theme.colors.background : theme.colors.textDimmed}
          />
        </View>

        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>Streak Alerts</Text>
          <Switch
            value={preferences.streak_alerts}
            onValueChange={(value) => handleUpdatePreference('streak_alerts', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={preferences.streak_alerts ? theme.colors.background : theme.colors.textDimmed}
          />
        </View>

        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>Level Up Notifications</Text>
          <Switch
            value={preferences.level_up_notifications}
            onValueChange={(value) => handleUpdatePreference('level_up_notifications', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={preferences.level_up_notifications ? theme.colors.background : theme.colors.textDimmed}
          />
        </View>

        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>System Notifications</Text>
          <Switch
            value={preferences.system_notifications}
            onValueChange={(value) => handleUpdatePreference('system_notifications', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={preferences.system_notifications ? theme.colors.background : theme.colors.textDimmed}
          />
        </View>
      </Card>
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
      <SectionHeader title="NOTIFICATIONS" />

      {/* Header with unread count */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bell size={24} color={theme.colors.primary} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>{unreadCount} unread</Text>
          </View>
        </View>
        {unreadCount > 0 && (
          <Button
            title="Mark All Read"
            onPress={handleMarkAllAsRead}
            variant="secondary"
            style={styles.markAllButton}
          />
        )}
      </View>

      {/* Preferences Toggle */}
      <TouchableOpacity
        style={styles.preferencesToggle}
        onPress={() => setShowPreferences(!showPreferences)}
      >
        <Settings size={20} color={theme.colors.primary} />
        <Text style={styles.preferencesToggleText}>
          {showPreferences ? 'Hide Preferences' : 'Show Preferences'}
        </Text>
      </TouchableOpacity>

      {/* Preferences */}
      {showPreferences && renderPreferences()}

      {/* Notifications List */}
      <Card variant="default" style={styles.notificationsCard}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={48} color={theme.colors.textDimmed} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtext}>You're all caught up!</Text>
          </View>
        ) : (
          notifications.map(renderNotificationItem)
        )}
      </Card>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textDimmed,
  },
  markAllButton: {
    paddingHorizontal: theme.spacing.md,
  },
  preferencesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceContainerHighest,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.border.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  preferencesToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  preferencesCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  preferencesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  preferencesTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.sm,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  notificationsCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  notificationUnread: {
    backgroundColor: 'rgba(109, 221, 255, 0.05)',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  notificationTitleUnread: {
    color: theme.colors.primary,
  },
  notificationBody: {
    fontSize: 13,
    color: theme.colors.textDimmed,
    marginBottom: theme.spacing.xs,
  },
  notificationTime: {
    fontSize: 11,
    color: theme.colors.textDimmed,
  },
  deleteButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textDimmed,
    marginTop: theme.spacing.xs,
  },
  spacer: {
    height: theme.spacing.xl,
  },
});
