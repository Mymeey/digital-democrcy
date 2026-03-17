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
// SDK 50+では appOwnership は非推奨のため executionEnvironment を優先使用
export const isExpoGo =
  Constants.executionEnvironment === 'storeClient' ||
  Constants.appOwnership === 'expo';

const requiredFirebaseKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
] as const;

export const firebaseConfigMissingKeys = requiredFirebaseKeys.filter(
  (key) => !firebaseConfig[key] || !firebaseConfig[key].trim()
);

export const isFirebaseConfigured = firebaseConfigMissingKeys.length === 0;

if (!isExpoGo && !isFirebaseConfigured) {
  console.error(
    `Firebase env is missing: ${firebaseConfigMissingKeys.join(', ')}`
  );
}

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

  if (!isFirebaseConfigured) {
    throw new Error(
      `Firebase configuration is incomplete: ${firebaseConfigMissingKeys.join(', ')}`
    );
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
