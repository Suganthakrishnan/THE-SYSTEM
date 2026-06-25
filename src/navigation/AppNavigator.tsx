import React, { Suspense, lazy } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuthContext } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { TabNavigator } from './TabNavigator';
import { SplashLoadingScreen } from '../screens/SplashLoadingScreen';
import { theme } from '../constants/theme';

// Lazy load modal screens
const AdvancedWorkoutPlanner = lazy(() => import('../screens/main/AdvancedWorkoutPlanner').then(m => ({ default: m.AdvancedWorkoutPlanner })));
const WorkoutSession = lazy(() => import('../screens/main/WorkoutSession').then(m => ({ default: m.WorkoutSession })));
const SleepTrackerScreen = lazy(() => import('../screens/SleepTrackerScreen').then(m => ({ default: m.SleepTrackerScreen })));
const ScreenTimeTrackerScreen = lazy(() => import('../screens/ScreenTimeTrackerScreen').then(m => ({ default: m.ScreenTimeTrackerScreen })));
const AnalyticsScreen = lazy(() => import('../screens/AnalyticsScreen').then(m => ({ default: m.AnalyticsScreen })));
const AchievementsScreen = lazy(() => import('../screens/AchievementsScreen').then(m => ({ default: m.AchievementsScreen })));
const ScheduleScreen = lazy(() => import('../screens/ScheduleScreen').then(m => ({ default: m.ScheduleScreen })));
const NotificationsScreen = lazy(() => import('../screens/NotificationsScreen').then(m => ({ default: m.NotificationsScreen })));
const TermsOfServiceScreen = lazy(() => import('../screens/legal/TermsOfServiceScreen').then(m => ({ default: m.TermsOfServiceScreen })));
const PrivacyPolicyScreen = lazy(() => import('../screens/legal/PrivacyPolicyScreen').then(m => ({ default: m.PrivacyPolicyScreen })));

// Loading fallback for lazy-loaded screens
const LoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg.base }}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
  </View>
);

const RootStack = createNativeStackNavigator();

export function AppNavigator() {
  const { session, isLoading, isOnboardingComplete, isDemoMode } = useAuthContext();

  if (isLoading) return <SplashLoadingScreen />;

  const isAuthenticated = !!session || isDemoMode;

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // No session → Auth screens
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : !isOnboardingComplete ? (
          // Signed in but onboarding not complete → Onboarding
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          // Fully authenticated → Main app
          <>
            <RootStack.Screen name="MainTabs" component={TabNavigator} />
            <RootStack.Screen name="WorkoutPlanner"
              options={{ headerShown: true, headerStyle: { backgroundColor: '#080B12' }, headerTintColor: theme.colors.text.primary, title: 'WORKOUT PLANNER' }}>
              {(props) => (
                <Suspense fallback={<LoadingFallback />}>
                  <AdvancedWorkoutPlanner {...props} />
                </Suspense>
              )}
            </RootStack.Screen>
            <RootStack.Screen name="WorkoutSession"
              options={{ headerShown: false }}>
              {(props) => (
                <Suspense fallback={<LoadingFallback />}>
                  <WorkoutSession {...props} />
                </Suspense>
              )}
            </RootStack.Screen>
            <RootStack.Screen name="SleepTracker"
              options={{ headerShown: true, headerStyle: { backgroundColor: '#080B12' }, headerTintColor: theme.colors.text.primary, title: 'SLEEP TRACKER' }}>
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <SleepTrackerScreen />
                </Suspense>
              )}
            </RootStack.Screen>
            <RootStack.Screen name="ScreenTime"
              options={{ headerShown: true, headerStyle: { backgroundColor: '#080B12' }, headerTintColor: theme.colors.text.primary, title: 'SCREEN TIME' }}>
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <ScreenTimeTrackerScreen />
                </Suspense>
              )}
            </RootStack.Screen>
            <RootStack.Screen name="ProgressAnalytics"
              options={{ headerShown: true, headerStyle: { backgroundColor: '#080B12' }, headerTintColor: theme.colors.text.primary, title: 'ANALYTICS' }}>
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <AnalyticsScreen />
                </Suspense>
              )}
            </RootStack.Screen>
            <RootStack.Screen name="AchievementsRank"
              options={{ headerShown: true, headerStyle: { backgroundColor: '#080B12' }, headerTintColor: theme.colors.text.primary, title: 'ACHIEVEMENTS' }}>
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <AchievementsScreen />
                </Suspense>
              )}
            </RootStack.Screen>
            <RootStack.Screen name="CalendarSchedule"
              options={{ headerShown: true, headerStyle: { backgroundColor: '#080B12' }, headerTintColor: theme.colors.text.primary, title: 'SCHEDULE' }}>
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <ScheduleScreen />
                </Suspense>
              )}
            </RootStack.Screen>
            <RootStack.Screen name="NotificationsCenter"
              options={{ headerShown: true, headerStyle: { backgroundColor: '#080B12' }, headerTintColor: theme.colors.text.primary, title: 'NOTIFICATIONS' }}>
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <NotificationsScreen />
                </Suspense>
              )}
            </RootStack.Screen>
            <RootStack.Screen name="TermsOfService" options={{ headerShown: true, headerStyle: { backgroundColor: '#080B12' }, headerTintColor: theme.colors.text.primary, title: 'TERMS OF SERVICE' }}>
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <TermsOfServiceScreen />
                </Suspense>
              )}
            </RootStack.Screen>
            <RootStack.Screen name="PrivacyPolicy" options={{ headerShown: true, headerStyle: { backgroundColor: '#080B12' }, headerTintColor: theme.colors.text.primary, title: 'PRIVACY POLICY' }}>
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PrivacyPolicyScreen />
                </Suspense>
              )}
            </RootStack.Screen>
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
