import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { PersistenceProvider } from './src/context/PersistenceContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { WorkoutPlannerService } from './src/services/workoutPlannerService';
import { configureGoogleSignIn } from './src/hooks/useGoogleSignIn';

function ErrorFallback({ error }: { error: Error }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
    </View>
  );
}

export default function App() {
  // Initialize WorkoutPlannerService globally
  WorkoutPlannerService.initialize().catch(console.error);

  // Configure Google Sign-In with the Web Client ID from env
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (googleWebClientId) {
    configureGoogleSignIn(googleWebClientId);
  }

  return (
    <AuthProvider>
      <PersistenceProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </PersistenceProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#080B12',
    padding: 20,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorMessage: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
  },
});
