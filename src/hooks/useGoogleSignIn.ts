/**
 * Google Sign-In — Native Account Picker
 * =======================================
 * 
 * Uses @react-native-google-signin/google-signin to show the native
 * Google account picker (one-tap from saved Gmail accounts) — no WebView.
 *
 * ── Google Cloud Console Setup (do this first) ─────────────────────
 * 
 * 1. Go to https://console.cloud.google.com → APIs & Services → Credentials
 * 
 * 2. Create an OAuth 2.0 Client ID for EACH platform:
 * 
 *    ┌────────────────────────────────────────────────────────────────┐
 *    │  ANDROID Client ID                                            │
 *    ├────────────────────────────────────────────────────────────────┤
 *    │  Application type: Android                                    │
 *    │  Package name:    com.Ascend.app                              │
 *    │  SHA-1 fingerprint:                                           │
 *    │    Run: cd android && ./gradlew signingReport                 │
 *    │    Copy the SHA-1 from the "debug" variant                    │
 *    │                                                               │
 *    │  Where does it go? → GOOGLE CLOUD CONSOLE (no .env needed)    │
 *    │  The Android library resolves it automatically from the       │
 *    │  SHA-1 + package name you register above.                     │
 *    └────────────────────────────────────────────────────────────────┘
 * 
 *    ┌────────────────────────────────────────────────────────────────┐
 *    │  iOS Client ID                                                │
 *    ├────────────────────────────────────────────────────────────────┤
 *    │  Application type: iOS                                        │
 *    │  Bundle ID:       com.Ascend.app                              │
 *    └────────────────────────────────────────────────────────────────┘
 * 
 *    ┌────────────────────────────────────────────────────────────────┐
 *    │  WEB Client ID  ← REQUIRED FOR SUPABASE + .env                │
 *    ├────────────────────────────────────────────────────────────────┤
 *    │  Application type: Web application                            │
 *    │  Authorized redirect URIs:                                    │
 *    │    https://<your-project>.supabase.co/auth/v1/callback        │
 *    │                                                               │
 *    │  Where does it go? → .env  (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) │
 *    │  AND Supabase Dashboard:                                      │
 *    │    Authentication → Providers → Google → Client ID            │
 *    └────────────────────────────────────────────────────────────────┘
 * 
 * 3. Enable the Google Sign-In API for your project (if prompted).
 *
 * ── Environment Variables ──────────────────────────────────────────
 *   # Required (Web Client ID — used for token exchange with Supabase)
 *   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
 *   
 *   # Optional (Android Client ID — only needed if the auto-resolve
 *   # fails. Most apps don't need this.)
 *   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxxxx.apps.googleusercontent.com
 * ===================================================================
 */

import { useState, useCallback } from 'react';
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';
import { supabase } from '../services/supabase';

interface GoogleSignInResult {
  success: boolean;
  error?: string | null;
  cancelled?: boolean;
}

/**
 * Configure GoogleSignin at app startup (call from App.tsx).
 */
export function configureGoogleSignIn(webClientId: string) {
  GoogleSignin.configure({
    webClientId,           // Web Client ID — REQUIRED for Supabase token exchange
    scopes: ['email', 'profile'],
    offlineAccess: true,
  });
}

/**
 * useGoogleSignIn — React hook for the native Google sign-in flow.
 *
 * Returns:
 *   - signIn:       () => Promise<GoogleSignInResult>
 *   - signOut:      () => Promise<void>
 *   - isSigningIn:  boolean
 *   - error:        string | null
 *
 * Usage:
 *   const { signIn, isSigningIn, error } = useGoogleSignIn();
 *   const result = await signIn();
 */
export function useGoogleSignIn() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async (): Promise<GoogleSignInResult> => {
    setIsSigningIn(true);
    setError(null);

    try {
      // 1. Check Google Play Services (Android) / availability
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // 2. Present native account picker
      const userInfo = await GoogleSignin.signIn();

      // 3. Extract idToken
      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        throw new Error('No idToken returned from Google Sign-In');
      }

      // 4. Exchange Google token for Supabase session
      const { error: supabaseError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (supabaseError) {
        throw supabaseError;
      }

      // Success — navigation is handled automatically by AppNavigator
      // via the onAuthStateChange listener in useAuth.ts
      setIsSigningIn(false);
      return { success: true, error: null };
    } catch (err: any) {
      setIsSigningIn(false);

      // Handle user-cancelled flow gracefully
      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            return { success: false, cancelled: true, error: null };
          case statusCodes.IN_PROGRESS:
            setError('Sign-in already in progress');
            return { success: false, error: 'Sign-in already in progress' };
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setError('Google Play Services are not available on this device');
            return { success: false, error: 'Google Play Services are not available on this device' };
        }
      }

      // Network / supabase errors
      const message = err?.message || 'Google sign-in failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Silently fail — user is already signed out of Supabase
    }
  }, []);

  return { signIn, signOut, isSigningIn, error };
}