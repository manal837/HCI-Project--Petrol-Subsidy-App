import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import type { UserProfile } from './src/lib/types';
import { getCurrentUserProfile as getMyProfile } from './src/services/auth';
import { hasLocalPin, getLocalPinEmail } from './src/services/pin';
import { WelcomeScreen, LoginScreen, RegisterScreen, ConfirmationScreen } from './src/screens/AuthScreens';
import { MainApp } from './src/screens/MainScreens';
import { theme } from './src/lib/theme';

type AuthPage = 'welcome' | 'login' | 'register' | 'confirmation';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authPage, setAuthPage] = useState<AuthPage>('welcome');
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [pinConfigured, setPinConfigured] = useState(false);
  const [pinEmail, setPinEmail] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [confirmationRequired, setConfirmationRequired] = useState(true);

  async function loadProfile() {
    try {
      const p = await getMyProfile();
      if (p) {
        setProfile(p);
        return p;
      }
    } catch (e: any) {
      console.warn('Profile load fallback:', e?.message);
    }

    // Fallback profile object if database query returns empty initially
    const fallbackProfile: UserProfile = {
      id: session?.user?.id || 'guest',
      full_name: session?.user?.user_metadata?.full_name || 'Driver',
      phone_number: session?.user?.user_metadata?.phone_number || '',
      role: 'driver',
      approval_status: 'approved',
    } as any;

    setProfile(fallbackProfile);
    return fallbackProfile;
  }

  useEffect(() => {
    let alive = true;
    let linkSubscription: { remove: () => void } | null = null;

    async function handleAuthUrl(url: string | null) {
      if (!url || Platform.OS === 'web') return;
      try {
        const hash = url.includes('#') ? url.split('#')[1] : '';
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (alive) setAuthPage('login');
        }
      } catch (e: any) {
        Alert.alert('Email verification link', e.message || 'Link process nahin ho saka.');
      }
    }

    async function initialise() {
      try {
        const [{ data }, savedPin, savedEmail] = await Promise.all([
          supabase.auth.getSession(), hasLocalPin(), getLocalPinEmail()
        ]);
        if (!alive) return;
        setSession(data.session);
        setPinConfigured(savedPin);
        setPinEmail(savedEmail);
        if (data.session) {
          const p = await getMyProfile();
          if (alive && p) setProfile(p);
        }
        if (alive) setAuthPage(savedPin || data.session ? 'login' : 'welcome');
      } catch (e: any) {
        if (alive) Alert.alert('App start error', e.message || 'Internet connection check karein.');
      } finally { 
        if (alive) setLoading(false); 
      }
    }

    void initialise();

    if (Platform.OS !== 'web') {
      void Linking.getInitialURL().then(handleAuthUrl);
      linkSubscription = Linking.addEventListener('url', event => { void handleAuthUrl(event.url); });
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) { 
        setProfile(null); 
        setUnlocked(false); 
      } else {
        setTimeout(() => { if (alive) void loadProfile(); }, 0);
      }
    });

    return () => { 
      alive = false; 
      linkSubscription?.remove(); 
      listener.subscription.unsubscribe(); 
    };
  }, []);

  async function unlockWithPin() {
    await loadProfile();
    setUnlocked(true);
  }

  async function recoveryLoginComplete() {
    await loadProfile();
    setUnlocked(true);
  }

  function lockApp() {
    setUnlocked(false);
    setAuthPage('login');
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.cream }}>
        <ActivityIndicator size="large" color={theme.colors.maroon} />
        <Text style={{ marginTop: 12, color: theme.colors.ink, fontWeight: '700' }}>AASAN PETROL load ho raha hai…</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {session && unlocked ? (
        <MainApp profile={profile || ({} as any)} onLogout={lockApp} />
      ) : authPage === 'welcome' ? (
        <WelcomeScreen onLogin={() => setAuthPage('login')} onRegister={() => setAuthPage('register')} />
      ) : authPage === 'login' ? (
        <LoginScreen
          onBack={() => setAuthPage('welcome')}
          onPinSuccess={unlockWithPin}
          onEmailSuccess={recoveryLoginComplete}
          pinEmail={pinEmail}
          pinConfigured={pinConfigured}
          onPinCreated={(email) => { setPinConfigured(true); setPinEmail(email); }}
        />
      ) : authPage === 'register' ? (
        <RegisterScreen
          onBack={() => setAuthPage('welcome')}
          onDone={(email, required) => {
            setConfirmationEmail(email);
            setConfirmationRequired(required);
            setPinConfigured(true);
            setPinEmail(email);
            setAuthPage('confirmation');
          }}
        />
      ) : (
        <ConfirmationScreen
          email={confirmationEmail}
          confirmationRequired={confirmationRequired}
          onLogin={() => setAuthPage('login')}
        />
      )}
    </>
  );
}