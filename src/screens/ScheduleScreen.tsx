import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useAuthContext } from '../context/AuthContext';
import { scale, verticalScale, fontSize as fs } from '../utils/responsive';
import { ScheduleService, ScheduledWorkout, CalendarEvent } from '../services/scheduleService';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';
import { theme } from '../constants/theme';
import { Calendar, Clock, Plus, Check, X, ChevronLeft, ChevronRight } from 'lucide-react-native';

export function ScheduleScreen() {
  const { session } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<ScheduledWorkout[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [workoutName, setWorkoutName] = useState<string>('');

  useEffect(() => {
    loadScheduleData();
  }, [session, currentDate]);

  const loadScheduleData = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const [eventsResult, upcomingResult] = await Promise.all([
        ScheduleService.getCalendarEvents(session.user.id, startOfMonth, endOfMonth),
        ScheduleService.getUpcomingWorkouts(session.user.id),
      ]);

      setEvents(eventsResult.data);
      setUpcomingWorkouts(upcomingResult.data);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleScheduleWorkout = async () => {
    if (!session?.user?.id || !workoutName || !selectedDate) return;

    try {
      await ScheduleService.scheduleWorkout(
        session.user.id,
        'custom',
        workoutName,
        selectedDate,
        selectedTime,
        selectedDuration
      );
      setShowScheduleModal(false);
      setWorkoutName('');
      setSelectedDate('');
      setSelectedTime('09:00');
      setSelectedDuration(30);
      loadScheduleData();
    } catch (error) {
      console.error('Error scheduling workout:', error);
    }
  };

  const handleCompleteWorkout = async (workoutId: string) => {
    try {
      await ScheduleService.completeWorkout(workoutId);
      loadScheduleData();
    } catch (error) {
      console.error('Error completing workout:', error);
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    try {
      await ScheduleService.deleteScheduledWorkout(workoutId);
      loadScheduleData();
    } catch (error) {
      console.error('Error deleting workout:', error);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDayEmpty} />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(e => {
        const eventDateStr = e.start.toISOString().split('T')[0];
        return eventDateStr === dateStr;
      });
      const hasEvent = dayEvents.length > 0;
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isToday && styles.calendarDayToday,
            hasEvent && styles.calendarDayHasEvent,
          ]}
          onPress={() => setSelectedDate(dateStr)}
        >
          <Text style={[
            styles.calendarDayText,
            isToday && styles.calendarDayTextToday,
          ]}>
            {day}
          </Text>
          {hasEvent && (
            <View style={styles.eventIndicator} />
          )}
        </TouchableOpacity>
      );
    }

    return (
      <Card variant="default" style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
            <ChevronLeft size={20} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
            <ChevronRight size={20} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.weekdays}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={styles.weekdayText}>{day}</Text>
          ))}
        </View>
        
        <View style={styles.calendarGrid}>
          {days}
        </View>
      </Card>
    );
  };

  const renderUpcomingWorkouts = () => {
    if (upcomingWorkouts.length === 0) {
      return (
        <Card variant="glass" style={styles.emptyCard}>
          <Calendar size={32} color={theme.colors.textDimmed} />
          <Text style={styles.emptyTitle}>No upcoming workouts</Text>
          <Text style={styles.emptySubtext}>Schedule your first workout</Text>
        </Card>
      );
    }

    return upcomingWorkouts.map(workout => (
      <Card key={workout.id} variant="glass" style={styles.workoutCard}>
        <View style={styles.workoutCardHeader}>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutName}>{workout.workout_name}</Text>
            <View style={styles.workoutMeta}>
              <Clock size={14} color={theme.colors.textDimmed} />
              <Text style={styles.workoutMetaText}>
                {new Date(workout.scheduled_date).toLocaleDateString()} at {workout.scheduled_time}
              </Text>
            </View>
            <Text style={styles.workoutDuration}>{workout.duration} min</Text>
          </View>
          {workout.completed ? (
            <Check size={24} color={theme.colors.success} />
          ) : (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => handleCompleteWorkout(workout.id)}
            >
              <Check size={20} color={theme.colors.background} />
            </TouchableOpacity>
          )}
        </View>
        {!workout.completed && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteWorkout(workout.id)}
          >
            <X size={16} color={theme.colors.danger} />
            <Text style={styles.deleteButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </Card>
    ));
  };

  const renderScheduleModal = () => {
    return (
      <Modal
        visible={showScheduleModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card variant="default" style={styles.modalContent}>
            <Text style={styles.modalTitle}>Schedule Workout</Text>
            
            <Text style={styles.inputLabel}>WORKOUT NAME</Text>
            <TextInput
              style={styles.input}
              value={workoutName}
              onChangeText={setWorkoutName}
              placeholder="Enter workout name"
              placeholderTextColor={theme.colors.textDimmed + '60'}
            />
            
            <Text style={styles.inputLabel}>DATE</Text>
            <TextInput
              style={styles.input}
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textDimmed + '60'}
            />
            
            <Text style={styles.inputLabel}>TIME</Text>
            <TextInput
              style={styles.input}
              value={selectedTime}
              onChangeText={setSelectedTime}
              placeholder="HH:MM"
              placeholderTextColor={theme.colors.textDimmed + '60'}
            />
            
            <Text style={styles.inputLabel}>DURATION (MINUTES)</Text>
            <TextInput
              style={styles.input}
              value={selectedDuration.toString()}
              onChangeText={(text) => setSelectedDuration(parseInt(text) || 30)}
              placeholder="30"
              placeholderTextColor={theme.colors.textDimmed + '60'}
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setShowScheduleModal(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Schedule"
                onPress={handleScheduleWorkout}
                style={styles.modalButton}
              />
            </View>
          </Card>
        </View>
      </Modal>
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
      <SectionHeader title="SCHEDULE" />

      {/* Calendar */}
      {renderCalendar()}

      {/* Schedule Button */}
      <TouchableOpacity
        style={styles.scheduleButton}
        onPress={() => setShowScheduleModal(true)}
      >
        <Plus size={20} color={theme.colors.background} />
        <Text style={styles.scheduleButtonText}>Schedule Workout</Text>
      </TouchableOpacity>

      {/* Upcoming Workouts */}
      <SectionHeader title="UPCOMING WORKOUTS" />
      {renderUpcomingWorkouts()}

      <View style={styles.spacer} />
      {renderScheduleModal()}
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
  calendarCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.text.primary,
    letterSpacing: 1,
  },
  navButton: {
    padding: theme.spacing.sm,
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textDimmed,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayEmpty: {
    width: '14.28%',
    height: 40,
  },
  calendarDay: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: theme.spacing.xs,
  },
  calendarDayToday: {
    backgroundColor: theme.colors.primary,
  },
  calendarDayHasEvent: {
    borderWidth: 1,
    borderColor: theme.colors.tertiary,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  calendarDayTextToday: {
    color: theme.colors.background,
    fontWeight: '800',
  },
  eventIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.tertiary,
    marginTop: 2,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.border.radius.lg,
  },
  scheduleButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.background,
    marginLeft: theme.spacing.sm,
  },
  emptyCard: {
    marginHorizontal: theme.spacing.md,
    padding: theme.spacing.xl,
    alignItems: 'center',
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
  workoutCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  workoutMetaText: {
    fontSize: 12,
    color: theme.colors.textDimmed,
    marginLeft: theme.spacing.xs,
  },
  workoutDuration: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: theme.colors.success,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  deleteButtonText: {
    fontSize: 12,
    color: theme.colors.danger,
    marginLeft: theme.spacing.xs,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    zIndex: 1000,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: theme.spacing.xl,
    backgroundColor: '#1a1a1a',
    zIndex: 1001,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
    letterSpacing: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textDimmed,
    marginBottom: theme.spacing.sm,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: theme.colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: theme.spacing.lg,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    minWidth: 100,
  },
  spacer: {
    height: theme.spacing.xl,
  },
});
