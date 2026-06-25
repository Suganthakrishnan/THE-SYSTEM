import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { theme } from '../../constants/theme';
import { scale, verticalScale, fontSize as fs } from '../../utils/responsive';

export function PendingWorks() {
  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>PENDING DIRECTIVES</Text>

        <Card variant="glow" style={styles.card}>
          <Text style={styles.cardTitle}>URGENT (0 HOURS REMAINING)</Text>
          <View style={styles.quest}>
            <View style={styles.checkbox} />
            <Text style={styles.questText}>Drink 500ml Water</Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>DAILY TASKS</Text>
          <View style={styles.quest}>
            <View style={styles.checkbox} />
            <Text style={styles.questText}>Read 10 pages</Text>
          </View>
          <View style={styles.quest}>
            <View style={styles.checkbox} />
            <Text style={styles.questText}>10,000 Steps</Text>
          </View>
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: fs(20),
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xl,
    letterSpacing: 2,
    textShadowColor: theme.colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: scale(8),
  },
  card: {
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    color: theme.colors.primary,
    fontSize: fs(12),
    fontWeight: '700',
    marginBottom: theme.spacing.md,
    letterSpacing: 1,
  },
  quest: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  checkbox: {
    width: scale(20),
    height: scale(20),
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginRight: theme.spacing.md,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  questText: {
    color: theme.colors.text.primary,
    fontSize: fs(16),
  }
});