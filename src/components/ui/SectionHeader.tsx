import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { theme } from '../../constants/theme';
import { scale, verticalScale } from '../../utils/responsive';

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  style?: object;
}

export function SectionHeader({ title, icon, actionLabel, onAction, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        <View style={styles.accentLine} />
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <Text style={styles.title}>{title}</Text>
      </View>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} style={styles.action} activeOpacity={0.6}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <ChevronRight color={theme.colors.primary} size={theme.iconSizes.md} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accentLine: {
    width: scale(3),
    height: scale(16),
    backgroundColor: theme.colors.primary,
    marginRight: theme.spacing.sm,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: scale(4),
    elevation: 3,
  },
  iconWrap: {
    marginRight: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSizes.md,
    fontWeight: '800',
    color: theme.colors.text.primary,
    letterSpacing: scale(2),
    textTransform: 'uppercase',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: theme.fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    letterSpacing: scale(1),
    marginRight: scale(2),
  },
});
