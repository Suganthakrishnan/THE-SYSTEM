import React from 'react';
import { View, Text } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { theme } from '../../constants/theme';
import { scale, verticalScale, fontSize as fs } from '../../utils/responsive';

export function GenericPlaceholder({ route }: any) {
  const name = route.name || 'UNKNOWN MODULE';

  return (
    <ScreenWrapper style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ 
        color: theme.colors.primary, 
        fontSize: fs(24), 
        fontWeight: '900',
        textShadowColor: theme.colors.primary,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: scale(10),
        marginBottom: scale(16)
      }}>
        {name.toUpperCase()}
      </Text>
      <Text style={{ color: theme.colors.textDimmed, letterSpacing: 2, fontSize: fs(12) }}>
        MODULE UNDER CONSTRUCTION
      </Text>
    </ScreenWrapper>
  );
}