import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import type { Auth } from 'firebase/auth';
import Constants from 'expo-constants';

// Firebase設定（環境変数から読み込み）
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || ""
};

// Expo Goかどうかを判定
export const isExpoGo = Constants.appOwnership === 'expo';

// Firebaseアプリの初期化（重複初期化を防ぐ）
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Auth を動的に遅延初期化（開発ビルドのみ）
let _auth: Auth | null = null;
let _authPromise: Promise<Auth | null> | null = null;

export const getFirebaseAuth = async (): Promise<Auth | null> => {
  // Expo Goではnullを返す（モック認証を使用）
  if (isExpoGo) {
    console.log('Expo Go detected - using mock auth');
    return null;
  }
  
  if (_auth) return _auth;
  if (_authPromise) return _authPromise;
  
  _authPromise = (async () => {
    try {
      const { getAuth } = await import('firebase/auth');
      _auth = getAuth(app);
      return _auth;
    } catch (error) {
      console.error('Firebase Auth init error:', error);
      return null;
    }
  })();
  
  return _authPromise;
};

export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

export default app;
