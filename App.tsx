import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { doc, getDoc } from 'firebase/firestore';

import AppNavigator from './src/navigation/AppNavigator';
import { getFirebaseAuth, db, isExpoGo } from './src/config/firebase';
import { useStore } from './src/store/useStore';
import { User } from './src/types';
import { requestNotificationPermissions } from './src/services/notificationService';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { setUser, loadSettings } = useStore();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const initAuth = async () => {
      try {
        // 通知権限をリクエスト
        try {
          await requestNotificationPermissions();
        } catch (e) {
          console.log('Notification permissions not available');
        }

        // Expo Goでは認証状態監視をスキップ
        if (isExpoGo) {
          console.log('Expo Go mode - skipping Firebase Auth listener');
          setIsLoading(false);
          return;
        }

        // Firebase認証（動的インポート）
        const { onAuthStateChanged } = await import('firebase/auth');
        const auth = await getFirebaseAuth();
        
        if (!auth) {
          console.log('Firebase Auth not available');
          try {
            await loadSettings();
          } catch (e) {
            console.log('Using default settings');
          }
          setIsLoading(false);
          return;
        }
        
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            // Firestoreからユーザー情報を取得
            try {
              const userRef = doc(db, 'users', firebaseUser.uid);
              const userDoc = await getDoc(userRef);
              
              if (userDoc.exists()) {
                setUser(userDoc.data() as User);
              }
            } catch (e) {
              console.log('Could not fetch user from Firestore');
            }
          } else {
            setUser(null);
          }
          
          // 設定を読み込み
          try {
            await loadSettings();
          } catch (e) {
            console.log('Using default settings');
          }
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Firebase init error:', error);
        setIsLoading(false);
      }
    };
    
    initAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});
