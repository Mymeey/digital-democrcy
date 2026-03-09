import * as AppleAuthentication from 'expo-apple-authentication';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseAuth, db, isExpoGo } from '../config/firebase';
import { User } from '../types';

// ID生成関数
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
};

// モックユーザー（Expo Goテスト用）
// この ID を 'mock_user_001' に合わせることで運営者として動作
const MOCK_USER: User = {
  id: 'mock_user_001',
  email: 'test@example.com',
  name: 'テスト運営者',
  authProvider: 'apple',
  role: 'operator',
  status: 'approved',
  createdAt: Date.now(),
};

// Expo Go用モックサインイン
export const signInWithMock = async (): Promise<User> => {
  console.log('Mock sign-in for Expo Go');
  return MOCK_USER;
};

// Appleでサインイン
export const signInWithApple = async (): Promise<User | null> => {
  // Expo Goではモック認証を使用
  if (isExpoGo) {
    return signInWithMock();
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Firebase認証（動的インポート）
    const { signInWithCredential, OAuthProvider } = await import('firebase/auth');
    const provider = new OAuthProvider('apple.com');
    const firebaseCredential = provider.credential({
      idToken: credential.identityToken!,
    });
    
    const auth = await getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth not available');
    
    const userCredential = await signInWithCredential(auth, firebaseCredential);
    const firebaseUser = userCredential.user;

    // Firestoreからユーザー情報を取得または作成
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return userDoc.data() as User;
    }

    // 新規ユーザー作成
    const newUser: User = {
      id: firebaseUser.uid,
      email: credential.email || firebaseUser.email || '',
      name: credential.fullName?.givenName 
        ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`
        : 'ユーザー',
      authProvider: 'apple',
      role: 'member',
      status: 'pending',
      createdAt: Date.now(),
    };

    await setDoc(userRef, newUser);
    return newUser;
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      return null;
    }
    throw error;
  }
};

// Google IDトークンでサインイン（expo-auth-sessionから呼ばれる）
export const signInWithGoogleIdToken = async (idToken: string): Promise<User | null> => {
  // Expo Goではモック認証を使用
  if (isExpoGo) {
    return signInWithMock();
  }

  try {
    // Firebase認証（動的インポート）
    const { signInWithCredential, GoogleAuthProvider } = await import('firebase/auth');
    const googleCredential = GoogleAuthProvider.credential(idToken);
    const auth = await getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth not available');
    
    const userCredential = await signInWithCredential(auth, googleCredential);
    const firebaseUser = userCredential.user;

    // Firestoreからユーザー情報を取得または作成
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return userDoc.data() as User;
    }

    // 新規ユーザー作成
    const newUser: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: firebaseUser.displayName || 'ユーザー',
      authProvider: 'google',
      role: 'member',
      status: 'pending',
      createdAt: Date.now(),
    };

    await setDoc(userRef, newUser);
    return newUser;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

// サインアウト
export const signOut = async (): Promise<void> => {
  // Expo Goではモック認証なので何もしない
  if (isExpoGo) {
    console.log('Mock sign-out for Expo Go');
    return;
  }

  try {
    const { signOut: firebaseSignOut } = await import('firebase/auth');
    const auth = await getFirebaseAuth();
    if (auth) {
      await firebaseSignOut(auth);
    }
  } catch (error) {
    console.error('Sign Out Error:', error);
    throw error;
  }
};

// 現在のユーザー情報を取得
export const getCurrentUser = async (): Promise<User | null> => {
  // Expo Goではnullを返す（リアルタイム認証状態を持たない）
  if (isExpoGo) {
    return null;
  }

  const auth = await getFirebaseAuth();
  if (!auth) return null;
  
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;

  const userRef = doc(db, 'users', firebaseUser.uid);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    return userDoc.data() as User;
  }

  return null;
};
