import React from 'react';
import { theme } from '../../constants/theme';
import { scale, verticalScale, fontSize } from '../../utils/responsive';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'fab';
  isLoading?: boolean;
  disabled?: boolean;
  style?: object;
  textStyle?: object;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  isLoading = false, 
  disabled = false,
  style,
  textStyle,
  icon,
  accessibilityLabel,
  accessibilityHint
}: ButtonProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };
  
  const renderContent = () => (
    <>
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? '#080B12' : theme.colors.primary} />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          {variant !== 'fab' && (
            <Text style={[getTextStyle(), textStyle]} numberOfLines={1} ellipsizeMode="tail">
              {title}
            </Text>
          )}
        </View>
      )}
    </>
  );

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return [styles.text, styles.primaryText];
      case 'secondary':
        return [styles.text, styles.secondaryText];
      case 'outline':
        return [styles.text, styles.outlineText];
      case 'ghost':
        return [styles.text, styles.ghostText];
      case 'fab':
        return styles.text;
    }
  };

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
  };

  if (variant === 'fab') {
    return (
      <Animated.View style={[animatedStyle, styles.fabWrapper, style]}>
        <TouchableOpacity 
          style={[styles.fab, (disabled || isLoading) && styles.disabled]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || isLoading}
          activeOpacity={1}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={accessibilityLabel || title}
          accessibilityHint={accessibilityHint || (variant === 'fab' ? 'Floating action button' : 'Tap to perform action')}
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || isLoading }}
        >
          {renderContent()}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (variant === 'primary') {
    return (
      <Animated.View style={[animatedStyle, style]}>
        <TouchableOpacity 
          style={[(disabled || isLoading) && styles.disabled]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || isLoading}
          activeOpacity={1}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={accessibilityLabel || title}
          accessibilityHint={accessibilityHint || 'Tap to perform action'}
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || isLoading }}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryHover]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.container, styles.primaryContainer]}
          >
            {renderContent()}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const getContainerStyle = () => {
    switch (variant) {
      case 'secondary':
        return [styles.container, styles.secondaryContainer];
      case 'outline':
        return [styles.container, styles.outlineContainer];
      case 'ghost':
        return [styles.container, styles.ghostContainer];
    }
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity 
        style={[
          getContainerStyle(), 
          (disabled || isLoading) && styles.disabled,
        ]} 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || isLoading}
        activeOpacity={1}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint || 'Tap to perform action'}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || isLoading }}
      >
        {renderContent()}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: theme.touch.buttonMinHeight,
    minWidth: scale(80),
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.border.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: theme.fontSizes.lg,
    fontWeight: '700',
    letterSpacing: scale(1),
    textTransform: 'uppercase',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: theme.spacing.sm,
  },
  // Variants
  primaryContainer: {
    backgroundColor: theme.colors.primary,
  },
  primaryText: {
    color: '#080B12',
  },
  secondaryContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  secondaryText: {
    color: theme.colors.secondary,
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  outlineText: {
    color: theme.colors.primary,
  },
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: theme.colors.text.secondary,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: verticalScale(24),
    right: scale(24),
  },
  fab: {
    width: theme.touch.fabSize,
    height: theme.touch.fabSize,
    borderRadius: theme.touch.fabSize / 2,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.glow.cyan,
  },
});

