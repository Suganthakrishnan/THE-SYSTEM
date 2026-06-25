import { scale, verticalScale, moderateScale, fontSize as fs } from '../utils/responsive';

export const theme = {
  colors: {
    // Backgrounds
    bg: {
      base: '#080B12',
      surface: '#080B12',
      glass: 'rgba(255,255,255,0.04)',
      glassBorder: 'rgba(255,255,255,0.08)',
    },
    // Primary colours
    primary: '#00E5FF',
    secondary: '#ffffff',
    gold: '#FFD60A',
    danger: '#FF3B5C',
    success: '#30D158',
    warning: '#FF9F0A',
    // Stat colours
    stats: {
      strength: '#FF453A',
      intelligence: '#00E5FF',
      stamina: '#30D158',
      codeKnowledge: '#BF5AF2',
      agility: '#FFD60A',
      communication: '#FF9F0A',
    },
    // Text
    text: {
      primary: '#FFFFFF',
      secondary: '#FFFFFF',
    },
    // Legacy compatibility
    background: '#000000',
    card: '#000000',
    cardGlass: 'rgba(255, 252, 252, 0.04)',
    primaryHover: '#00C4D4',
    tertiary: '#BF5AF2',
    textDimmed: '#8B95A8',
    glow: 'rgba(0,229,255,0.4)',
    border: 'rgba(255,255,255,0.08)',
    ghostBorder: 'rgba(0,229,255,0.3)',
    surfaceContainerHighest: '#ffffff',
    surfaceContainerLowest: '#FFFFFF',
  },
  spacing: {
    xs: scale(4),
    sm: scale(8),
    md: scale(16),
    lg: scale(24),
    xl: scale(32),
    xxl: scale(48),
  },
  touch: {
    buttonMinHeight: verticalScale(52),
    tabBarHeight: verticalScale(64),
    fabSize: scale(60),
    inputHeight: verticalScale(52),
    listRowMinHeight: verticalScale(56),
    chipHeight: verticalScale(36),
  },
  border: {
    radius: {
      sm: scale(8),
      md: scale(12),
      lg: scale(16),
      xl: scale(24),
    },
    width: 1,
  },
  glow: {
    cyan: {
      shadowColor: '#00E5FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: scale(10),
      elevation: 5,
    },
    violet: {
      shadowColor: '#BF5AF2',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: scale(10),
      elevation: 5,
    },
    gold: {
      shadowColor: '#FFD60A',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: scale(10),
      elevation: 5,
    },
    danger: {
      shadowColor: '#FF3B5C',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: scale(10),
      elevation: 5,
    }
  },
  fonts: {
    heading: 'Rajdhani-Bold',
    body: 'System',
  },
  // ─── Responsive Helpers ─────────────────────────────────────
  // Pre-calculated font sizes for common text styles
  // Used as: fontSize: theme.fontSizes.sm
  fontSizes: {
    xs: fs(8),
    sm: fs(10),
    md: fs(12),
    lg: fs(14),
    xl: fs(16),
    xxl: fs(20),
    xxxl: fs(24),
    display: fs(28),
    hero: fs(32),
  },
  // Pre-calculated icon sizes for common icon sizes
  iconSizes: {
    sm: Math.round(scale(14)),
    md: Math.round(scale(16)),
    lg: Math.round(scale(20)),
    xl: Math.round(scale(22)),
    xxl: Math.round(scale(24)),
    xxxl: Math.round(scale(28)),
    huge: Math.round(scale(32)),
  },
};
