import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import type { Auth } from 'firebase/auth';
import Constants from 'expo-constants';

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyBHL0C_YEUXT5vBe-NyfayydpefOanDQWU",
  authDomain: "opinion-exchange-app.firebaseapp.com",
  projectId: "opinion-exchange-app",
  storageBucket: "opinion-exchange-app.firebasestorage.app",
  messagingSenderId: "405652056926",
  appId: "1:405652056926:ios:bc77aac48ca0440a5f3dcf"
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
