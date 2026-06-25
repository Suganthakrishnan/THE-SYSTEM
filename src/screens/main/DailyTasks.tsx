import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator, Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { HudContainer } from '../../components/ui/HudContainer';
import { Button } from '../../components/ui/Button';
import { StatBar } from '../../components/ui/StatBar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { GlowInput } from '../../components/ui/GlowInput';
import { theme } from '../../constants/theme';
import { scale, verticalScale, fontSize } from '../../utils/responsive';
import { useAuthContext } from '../../context/AuthContext';
import { TaskService, DailyTask, TaskDifficulty, TaskType, XP_REWARDS } from '../../services/taskService';
import { StatsService } from '../../services/statsService';
import {
  Plus, CheckCircle, Circle, Trash2, X, Trophy, Calendar, Edit3, Filter,
} from 'lucide-react-native';

const DIFFICULTY_LABELS: Record<TaskDifficulty, string> = {
  easy: 'EASY',
  medium: 'INTERMEDIATE',
  hard: 'HARD',
};

export const DailyTasks = React.memo(function DailyTasks() {
  const { user } = useAuthContext();
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [deadlineTasks, setDeadlineTasks] = useState<DailyTask[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDateChip, setSelectedDateChip] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'daily' | 'deadline'>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Screen entry animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDifficulty, setNewTaskDifficulty] = useState<TaskDifficulty>('medium');
  const [newTaskType, setNewTaskType] = useState<TaskType>('daily');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');

  // Edit task form state
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskDifficulty, setEditTaskDifficulty] = useState<TaskDifficulty>('medium');
  const [editTaskDeadline, setEditTaskDeadline] = useState('');

  useEffect(() => {
    loadTasks();
  }, [user, selectedDate]);

  const loadTasks = async () => {
    if (!user?.id) {
      setDailyTasks([]);
      setDeadlineTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const today = new Date().toISOString().split('T')[0];
      if (selectedDate === today) {
        const { totalPenalty, error: penaltyError } = await TaskService.processOverdueTaskPenalties(user.id);
        if (penaltyError) {
          console.error('Error applying overdue penalties:', penaltyError);
        } else if (totalPenalty > 0) {
          Alert.alert('XP PENALTY APPLIED', `-${totalPenalty} XP for unfinished quests from previous day.`);
        }

        const { error: defaultTaskError } = await TaskService.ensureDefaultLoginTask(user.id, selectedDate);
        if (defaultTaskError) {
          console.error('Error ensuring default login quest:', defaultTaskError);
        }
      }

      const { data: dailyData } = await TaskService.getUserTasks(user.id, selectedDate);
      const { data: deadlineData } = await TaskService.getDeadlineTasks(user.id);
      setDailyTasks(dailyData.filter(t => t.task_type === 'daily'));
      setDeadlineTasks(deadlineData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completedDailyTasks = React.useMemo(() => dailyTasks.filter(t => t.completed), [dailyTasks]);
  const completedDailyCount = React.useMemo(() => completedDailyTasks.length, [completedDailyTasks]);
  const totalDailyXPEarned = React.useMemo(() => completedDailyTasks.reduce((sum, t) => sum + t.xp_reward, 0), [completedDailyTasks]);

  const completedDeadlineTasks = React.useMemo(() => deadlineTasks.filter(t => t.completed), [deadlineTasks]);
  const completedDeadlineCount = React.useMemo(() => completedDeadlineTasks.length, [completedDeadlineTasks]);
  const totalDeadlineXPEarned = React.useMemo(() => completedDeadlineTasks.reduce((sum, t) => sum + t.xp_reward, 0), [completedDeadlineTasks]);

  const totalCompletedCount = React.useMemo(() => completedDailyCount + completedDeadlineCount, [completedDailyCount, completedDeadlineCount]);
  const totalXPEarned = React.useMemo(() => totalDailyXPEarned + totalDeadlineXPEarned, [totalDailyXPEarned, totalDeadlineXPEarned]);

  const openTaskCompletion = React.useCallback((task: DailyTask) => {
    if (task.completed) return;
    setSelectedTask(task);
  }, []);

  const markSelectedTaskAsFinished = async () => {
    if (!user?.id || !selectedTask) return;

    try {
      // Mark task as completed in the database
      await TaskService.completeTask(selectedTask.id, user.id);
      
      // Add the XP reward to the user's actual stats so level can progress
      await StatsService.addXP(user.id, selectedTask.xp_reward);
      
      Alert.alert('QUEST COMPLETE!', `You earned +${selectedTask.xp_reward} XP!`);
      setSelectedTask(null);
      loadTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('ERROR', 'Could not mark quest as finished. Please try again.');
    }
  };

  const deleteTask = async (taskId: string) => {
    Alert.alert(
      'DELETE TASK',
      'Are you sure you want to delete this task?',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'DELETE',
          style: 'destructive',
          onPress: async () => {
            try {
              await TaskService.deleteTask(taskId, user?.id);
              loadTasks();
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('ERROR', 'Could not delete task. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleAddTask = async () => {
    if (!user?.id || !newTaskTitle.trim()) {
      Alert.alert('ERROR', 'Please enter a task title');
      return;
    }

    if (newTaskType === 'deadline' && !newTaskDeadline) {
      Alert.alert('ERROR', 'Please select a deadline date');
      return;
    }

    try {
      const xpReward = XP_REWARDS[newTaskDifficulty];
      await TaskService.createTask(user.id, {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || null,
        difficulty: newTaskDifficulty,
        xp_reward: xpReward,
        task_date: newTaskType === 'daily' ? selectedDate : newTaskDeadline,
        deadline_date: newTaskType === 'deadline' ? newTaskDeadline : null,
        task_type: newTaskType,
      });

      // Reset form
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDifficulty('medium');
      setNewTaskType('daily');
      setNewTaskDeadline('');
      setShowAddModal(false);
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('ERROR', 'Could not create task. Please try again.');
    }
  };

  const getDifficultyColor = React.useCallback((difficulty: TaskDifficulty) => {
    switch (difficulty) {
      case 'easy': return theme.colors.success;
      case 'medium': return theme.colors.gold;
      case 'hard': return theme.colors.danger;
    }
  }, []);

  // Generate date chips (last 7 days)
  const getDateChips = () => {
    const chips = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      chips.push({
        date: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      });
    }
    return chips;
  };

  const dateChips = React.useMemo(() => getDateChips(), []);

  const openEditModal = (task: DailyTask) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || '');
    setEditTaskDifficulty(task.difficulty);
    setEditTaskDeadline(task.deadline_date || '');
    setShowEditModal(true);
  };

  const handleEditTask = async () => {
    if (!user?.id || !editingTask || !editTaskTitle.trim()) {
      Alert.alert('ERROR', 'Please enter a task title');
      return;
    }

    if (editingTask.task_type === 'deadline' && !editTaskDeadline) {
      Alert.alert('ERROR', 'Please select a deadline date');
      return;
    }

    try {
      const xpReward = XP_REWARDS[editTaskDifficulty];
      await TaskService.updateTask(editingTask.id, {
        title: editTaskTitle.trim(),
        description: editTaskDescription.trim() || null,
        difficulty: editTaskDifficulty,
        xp_reward: xpReward,
        deadline_date: editingTask.task_type === 'deadline' ? editTaskDeadline : null,
      }, user.id);

      setShowEditModal(false);
      setEditingTask(null);
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('ERROR', 'Could not update task. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>LOADING TASKS...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const allComplete = (dailyTasks.length > 0 && dailyTasks.every(t => t.completed)) &&
                     (deadlineTasks.length > 0 && deadlineTasks.every(t => t.completed));

  // FIX 2: Only show "All Complete" banner when no modal is open
  const showAllCompleteBanner = allComplete && !showAddModal && !showEditModal && !selectedTask;

  return (
    <ScreenWrapper>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* Date Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateChipsRow}
          >
            {dateChips.map((chip, index) => (
              <TouchableOpacity
                key={chip.date}
                style={[
                  styles.dateChip,
                  selectedDateChip === index && styles.dateChipActive,
                ]}
                onPress={() => {
                  setSelectedDateChip(index);
                  setSelectedDate(chip.date);
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dateChipText,
                  selectedDateChip === index && styles.dateChipTextActive,
                ]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Category Filter Chips */}
          <View style={styles.categoryChipsRow}>
            {[
              { key: 'all', label: 'ALL', color: '#00E5FF' },
              { key: 'daily', label: 'DAILY', color: '#BF5AF2' },
              { key: 'deadline', label: 'DEADLINE', color: '#FF9F0A' },
            ].map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.key && { borderColor: cat.color, backgroundColor: cat.color + '15' },
                ]}
                onPress={() => setSelectedCategory(cat.key as any)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === cat.key && { color: cat.color },
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Progress Summary */}
          <HudContainer active style={styles.summaryHud}>
            <View style={styles.summaryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>QUESTS COMPLETED</Text>
                <Text style={styles.summaryValue}>
                  {totalCompletedCount} <Text style={styles.summaryMax}>/ {dailyTasks.length + deadlineTasks.length}</Text>
                </Text>
              </View>
              <View style={styles.xpEarned}>
                <Text style={styles.xpEarnedValue}>+{totalXPEarned}</Text>
                <Text style={styles.xpEarnedLabel}>XP</Text>
              </View>
            </View>
            <StatBar
              label="Progress"
              current={totalCompletedCount}
              max={dailyTasks.length + deadlineTasks.length || 1}
              color={theme.colors.primary}
              showValues={false}
              style={{ marginTop: theme.spacing.sm, marginBottom: 0 }}
            />
          </HudContainer>

          {/* All Complete State — hidden when any modal is open */}
          {showAllCompleteBanner && (
            <HudContainer style={styles.completeCard} accentColor={theme.colors.success}>
              <Trophy color={theme.colors.success} size={theme.iconSizes.huge} />
              <Text style={styles.completeTitle}>ALL TASKS COMPLETE</Text>
              <Text style={styles.completeSubtitle}>BONUS XP EARNED: +{Math.round(totalXPEarned * 0.2)}</Text>
            </HudContainer>
          )}

          {/* Daily Tasks Section */}
          {(selectedCategory === 'all' || selectedCategory === 'daily') && (
            <>
              <SectionHeader
                title="Daily Tasks"
                icon={<Calendar color={theme.colors.primary} size={theme.iconSizes.md} />}
              />
              {dailyTasks.length > 0 ? (
                dailyTasks.map((item, index) => (
                  <Animated.View
                    key={item.id}
                    style={{
                      opacity: fadeAnim,
                      transform: [{
                        translateY: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [scale(16 * (index % 5)), 0],
                        }),
                      }],
                    }}
                  >
                    <TaskCard
                      task={item}
                      onPress={() => openTaskCompletion(item)}
                      onDelete={() => deleteTask(item.id)}
                      onEdit={() => openEditModal(item)}
                      getDifficultyColor={getDifficultyColor}
                    />
                  </Animated.View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>NO DAILY TASKS</Text>
                </View>
              )}
            </>
          )}

          {/* Deadline Tasks Section */}
          {(selectedCategory === 'all' || selectedCategory === 'deadline') && (
            <>
              <SectionHeader
                title="Deadline Tasks"
                icon={<Calendar color={theme.colors.warning} size={theme.iconSizes.md} />}
              />
              {deadlineTasks.length > 0 ? (
                deadlineTasks.map((item, index) => (
                  <Animated.View
                    key={item.id}
                    style={{
                      opacity: fadeAnim,
                      transform: [{
                        translateY: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [scale(16 * (index % 5)), 0],
                        }),
                      }],
                    }}
                  >
                    <TaskCard
                      task={item}
                      onPress={() => openTaskCompletion(item)}
                      onDelete={() => deleteTask(item.id)}
                      onEdit={() => openEditModal(item)}
                      getDifficultyColor={getDifficultyColor}
                      showDeadline
                    />
                  </Animated.View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>NO DEADLINE TASKS</Text>
                </View>
              )}
            </>
          )}

          <View style={{ height: verticalScale(80) }} />
        </ScrollView>

        {/* Add Task FAB */}
        <Button
          variant="fab"
          title=""
          icon={<Plus color="#080B12" size={theme.iconSizes.xxxl} />}
          onPress={() => setShowAddModal(true)}
        />

        {/* Add Task Modal */}
        <Modal
          visible={showAddModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
        >
          <BlurView style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Drag Handle */}
              <View style={styles.dragHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>NEW TASK</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X color={theme.colors.text.secondary} size={theme.iconSizes.xxl} />
                </TouchableOpacity>
              </View>

              <GlowInput
                label="TITLE *"
                placeholder="Enter task title"
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                autoFocus
              />

              <GlowInput
                label="DESCRIPTION"
                placeholder="Optional description"
                value={newTaskDescription}
                onChangeText={setNewTaskDescription}
                multiline
                numberOfLines={3}
                style={styles.textAreaInput}
              />

              <Text style={styles.inputLabel}>TASK TYPE</Text>
              <View style={styles.optionRow}>
                {(['daily', 'deadline'] as TaskType[]).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.optionBtn,
                      newTaskType === type && styles.optionBtnActive,
                      { borderColor: type === 'daily' ? '#00E5FF' : '#FF9F0A' },
                      newTaskType === type && { backgroundColor: (type === 'daily' ? '#00E5FF' : '#FF9F0A') + '20' },
                    ]}
                    onPress={() => setNewTaskType(type)}
                    activeOpacity={1}
                  >
                    <Text style={[
                      styles.optionText,
                      newTaskType === type && styles.optionTextActive,
                      { color: newTaskType === type ? (type === 'daily' ? '#00E5FF' : '#FF9F0A') : theme.colors.text.secondary },
                    ]}>
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {newTaskType === 'deadline' && (
                <GlowInput
                  label="DEADLINE DATE"
                  placeholder="YYYY-MM-DD"
                  value={newTaskDeadline}
                  onChangeText={setNewTaskDeadline}
                />
              )}

              <Text style={styles.inputLabel}>DIFFICULTY</Text>
              <View style={styles.optionRow}>
                {(['easy', 'medium', 'hard'] as TaskDifficulty[]).map(diff => (
                  <TouchableOpacity
                    key={diff}
                    style={[
                      styles.optionBtn,
                      newTaskDifficulty === diff && styles.optionBtnActive,
                      { borderColor: getDifficultyColor(diff) },
                      newTaskDifficulty === diff && { backgroundColor: getDifficultyColor(diff) + '20' },
                    ]}
                    onPress={() => setNewTaskDifficulty(diff)}
                    activeOpacity={1}
                  >
                    <Text style={[
                      styles.optionText,
                      newTaskDifficulty === diff && styles.optionTextActive,
                      { color: newTaskDifficulty === diff ? getDifficultyColor(diff) : theme.colors.text.secondary },
                    ]}>
                      {DIFFICULTY_LABELS[diff]}
                    </Text>
                    <Text style={styles.xpPreview}>+{XP_REWARDS[diff]} XP</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title="CREATE TASK"
                onPress={handleAddTask}
                style={styles.createButton}
              />
            </View>
          </BlurView>
        </Modal>

        {/* Task Completion Modal — centered, not bottom-sheet */}
        <Modal
          visible={!!selectedTask}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedTask(null)}
        >
          <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
            <View style={styles.finishModalContent}>
              <Text style={styles.finishModalTitle}>FINISH QUEST?</Text>
              <Text style={styles.finishTaskTitle}>{selectedTask?.title}</Text>
              {!!selectedTask?.description && (
                <Text style={styles.finishTaskDescription}>{selectedTask.description}</Text>
              )}
              <Text style={styles.finishXpText}>Reward: +{selectedTask?.xp_reward ?? 0} XP</Text>

              <View style={styles.finishActions}>
                <Button
                  title="CANCEL"
                  variant="secondary"
                  onPress={() => setSelectedTask(null)}
                  style={styles.finishActionButton}
                />
                <Button
                  title="FINISHED"
                  onPress={markSelectedTaskAsFinished}
                  style={styles.finishActionButton}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Task Modal */}
        <Modal
          visible={showEditModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Drag Handle */}
              <View style={styles.dragHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>EDIT TASK</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <X color={theme.colors.text.secondary} size={theme.iconSizes.xxl} />
                </TouchableOpacity>
              </View>

              <GlowInput
                label="TITLE *"
                placeholder="Enter task title"
                value={editTaskTitle}
                onChangeText={setEditTaskTitle}
              />

              <GlowInput
                label="DESCRIPTION"
                placeholder="Optional description"
                value={editTaskDescription}
                onChangeText={setEditTaskDescription}
                multiline
                numberOfLines={3}
                style={styles.textAreaInput}
              />

              {editingTask?.task_type === 'deadline' && (
                <GlowInput
                  label="DEADLINE DATE"
                  placeholder="YYYY-MM-DD"
                  value={editTaskDeadline}
                  onChangeText={setEditTaskDeadline}
                />
              )}

              <Text style={styles.inputLabel}>DIFFICULTY</Text>
              <View style={styles.optionRow}>
                {(['easy', 'medium', 'hard'] as TaskDifficulty[]).map(diff => (
                  <TouchableOpacity
                    key={diff}
                    style={[
                      styles.optionBtn,
                      editTaskDifficulty === diff && styles.optionBtnActive,
                      { borderColor: getDifficultyColor(diff) },
                      editTaskDifficulty === diff && { backgroundColor: getDifficultyColor(diff) + '20' },
                    ]}
                    onPress={() => setEditTaskDifficulty(diff)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.optionText,
                      editTaskDifficulty === diff && styles.optionTextActive,
                      { color: editTaskDifficulty === diff ? getDifficultyColor(diff) : theme.colors.text.secondary },
                    ]}>
                      {DIFFICULTY_LABELS[diff]}
                    </Text>
                    <Text style={styles.xpPreview}>+{XP_REWARDS[diff]} XP</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title="UPDATE TASK"
                onPress={handleEditTask}
                style={styles.createButton}
              />
            </View>
          </View>
        </Modal>
      </Animated.View>
    </ScreenWrapper>
  );
});

// Task Card Component
function TaskCard({
  task,
  onPress,
  onDelete,
  onEdit,
  getDifficultyColor,
  showDeadline = false,
}: {
  task: DailyTask;
  onPress: () => void;
  onDelete: () => void;
  onEdit?: () => void;
  getDifficultyColor: (diff: TaskDifficulty) => string;
  showDeadline?: boolean;
}) {
  const difficultyColor = getDifficultyColor(task.difficulty);

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.taskCard, { borderLeftWidth: verticalScale(3), borderLeftColor: difficultyColor }]}>
        <View style={styles.taskCheckArea}>
          {task.completed ? (
            <CheckCircle color={theme.colors.success} size={theme.iconSizes.xxl} />
          ) : (
            <Circle color={theme.colors.text.secondary} size={theme.iconSizes.xxl} />
          )}
        </View>

        <View style={styles.taskBody}>
          <View style={[styles.taskTextBackground, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <View style={styles.taskTitleRow}>
              <Text
                style={[
                  styles.taskTitle,
                  task.completed && styles.taskTitleDone,
                ]}
                numberOfLines={2}
              >
                {task.title}
              </Text>
              <View style={[styles.taskDifficultyBadge, { backgroundColor: difficultyColor + '20' }]}>
                <Text style={[styles.taskDifficultyText, { color: difficultyColor }]}>
                  {DIFFICULTY_LABELS[task.difficulty]}
                </Text>
              </View>
            </View>
            {task.description ? (
              <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>
            ) : null}
            {showDeadline && task.deadline_date ? (
              <Text style={styles.deadlineText}>
                Due: {new Date(task.deadline_date).toLocaleDateString()}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.taskRight}>
          <View style={[styles.taskXpBadge, task.completed && { opacity: 0.4 }]}>
            <Text style={styles.taskXpText}>+{task.xp_reward}</Text>
          </View>
          {onEdit && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={onEdit}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Edit3 color={theme.colors.primary} size={theme.iconSizes.md} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Trash2 color={theme.colors.text.secondary} size={theme.iconSizes.md} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.lg },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    color: theme.colors.text.secondary,
    fontSize: theme.fontSizes.lg,
    fontWeight: '600',
    letterSpacing: scale(2),
    marginTop: theme.spacing.md,
  },

  // Date Chips
  dateChipsRow: {
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  dateChip: {
    height: theme.touch.chipHeight,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.border.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.bg.glassBorder,
    backgroundColor: theme.colors.bg.glass,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '15',
  },
  dateChipText: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: scale(1),
  },
  dateChipTextActive: {
    color: theme.colors.primary,
  },

  // Category Chips
  categoryChipsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  categoryChip: {
    height: theme.touch.chipHeight,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.border.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.bg.glassBorder,
    backgroundColor: theme.colors.bg.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: scale(1),
  },

  // Summary HUD
  summaryHud: { marginBottom: theme.spacing.lg },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: scale(1.5),
  },
  summaryValue: {
    fontSize: theme.fontSizes.display,
    fontWeight: '900',
    color: theme.colors.text.primary,
    marginTop: verticalScale(2),
    fontFamily: theme.fonts.heading,
  },
  summaryMax: { color: theme.colors.text.secondary, fontWeight: '400' },
  xpEarned: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.bg.glassBorder,
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.border.radius.md,
  },
  xpEarnedValue: {
    fontSize: theme.fontSizes.xxl,
    fontWeight: '900',
    color: theme.colors.primary,
    fontFamily: theme.fonts.heading,
  },
  xpEarnedLabel: {
    fontSize: theme.fontSizes.xs,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: scale(2),
  },

  // Complete state
  completeCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  completeTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: '900',
    color: theme.colors.success,
    letterSpacing: scale(2),
    marginTop: theme.spacing.md,
  },
  completeSubtitle: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    letterSpacing: scale(1),
    marginTop: theme.spacing.xs,
  },

  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: theme.spacing.md,
    borderRadius: theme.border.radius.md,
  },
  taskCheckArea: { marginRight: theme.spacing.md, justifyContent: 'center' },
  taskBody: { flex: 1 },
  taskTextBackground: {
    padding: theme.spacing.sm,
    borderRadius: theme.border.radius.sm,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(4),
    gap: theme.spacing.xs,
  },
  taskTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '600',
    color: theme.colors.text.primary,
    letterSpacing: scale(0.5),
    flex: 1,
  },
  taskTitleDone: { textDecorationLine: 'line-through', color: theme.colors.text.secondary },
  taskDesc: { fontSize: theme.fontSizes.sm, color: theme.colors.text.secondary, marginTop: verticalScale(2) },
  taskRight: { alignItems: 'flex-end', marginLeft: theme.spacing.sm },
  taskXpBadge: {
    backgroundColor: theme.colors.gold + '15',
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderWidth: 1,
    borderColor: theme.colors.gold + '40',
    borderRadius: scale(4),
  },
  taskXpText: { fontSize: theme.fontSizes.sm, fontWeight: '700', color: theme.colors.gold, letterSpacing: scale(1) },
  taskDifficultyBadge: {
    paddingHorizontal: scale(4),
    paddingVertical: verticalScale(1),
    borderRadius: scale(4),
  },
  taskDifficultyText: {
    fontSize: theme.fontSizes.xs,
    fontWeight: '700',
    letterSpacing: scale(1),
  },
  deadlineText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.warning,
    marginTop: verticalScale(4),
  },
  deleteButton: { marginTop: verticalScale(4) },
  editButton: {
    marginTop: verticalScale(4),
    marginRight: theme.spacing.xs,
  },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: theme.spacing.xxl },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: theme.fontSizes.lg,
    fontWeight: '700',
    letterSpacing: scale(2),
  },

  // Modal overlay with zIndex so it always renders above background content
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 999,
    elevation: 999,
  },
  dragHandle: {
    width: scale(40),
    height: verticalScale(4),
    backgroundColor: theme.colors.bg.glassBorder,
    borderRadius: scale(2),
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.bg.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.bg.glassBorder,
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
    fontSize: theme.fontSizes.xl,
    fontWeight: '900',
    color: theme.colors.text.primary,
    letterSpacing: scale(2),
  },
  inputLabel: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: scale(1.5),
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
    textTransform: 'uppercase',
  },
  optionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  optionBtn: {
    flex: 1,
    height: theme.touch.chipHeight,
    borderWidth: 1,
    borderRadius: theme.border.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: verticalScale(2),
  },
  optionBtnActive: {},
  optionText: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '700',
    letterSpacing: scale(1),
  },
  optionTextActive: {},
  xpPreview: {
    fontSize: theme.fontSizes.xs,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  createButton: {
    marginTop: theme.spacing.lg,
  },
  textAreaInput: {
    minHeight: verticalScale(80),
    textAlignVertical: 'top',
  },
  finishModalContent: {
    backgroundColor: theme.colors.bg.base,
    borderWidth: 1,
    borderColor: theme.colors.bg.glassBorder,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
  finishModalTitle: {
    fontSize: theme.fontSizes.xxl,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: scale(2),
    marginBottom: theme.spacing.md,
  },
  finishTaskTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  finishTaskDescription: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  finishXpText: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '700',
    color: theme.colors.gold,
    marginBottom: theme.spacing.lg,
  },
  finishActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  finishActionButton: {
    flex: 1,
  },
});