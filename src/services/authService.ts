import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  getFirebaseAuth,
  db,
  isExpoGo,
  isFirebaseConfigured,
  firebaseConfigMissingKeys,
} from '../config/firebase';
import { User } from '../types';

// Apple Sign-In/Firebase連携で必要なnonce
const generateNonce = (): string => {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

// Appleでサインイン
export const signInWithApple = async (): Promise<User | null> => {
  if (isExpoGo) {
    throw new Error('Apple sign-in is not supported in Expo Go');
  }

  if (!isFirebaseConfigured) {
    throw new Error(`Firebase config is missing: ${firebaseConfigMissingKeys.join(', ')}`);
  }

  try {
    const rawNonce = generateNonce();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      throw new Error('Apple identity token is missing');
    }

    // Firebase認証（動的インポート）
    const { signInWithCredential, OAuthProvider } = await import('firebase/auth');
    const provider = new OAuthProvider('apple.com');
    const firebaseCredential = provider.credential({
      idToken: credential.identityToken,
      rawNonce,
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
    console.error('Apple Sign-In Error:', error?.code || error?.message || error);
    throw error;
  }
};

// Googleアクセストークンでサインイン（expo-auth-sessionから呼ばれる）
export const signInWithGoogleAccessToken = async (accessToken: string): Promise<User | null> => {
  if (isExpoGo) {
    throw new Error('Google sign-in is not supported in Expo Go');
  }

  if (!isFirebaseConfigured) {
    throw new Error(`Firebase config is missing: ${firebaseConfigMissingKeys.join(', ')}`);
  }

  if (!accessToken?.trim()) {
    throw new Error('Google accessToken is empty');
  }

  try {
    // Firebase認証（動的インポート）
    const { signInWithCredential, GoogleAuthProvider } = await import('firebase/auth');
    const googleCredential = GoogleAuthProvider.credential(null, accessToken);
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
    console.error('Google Sign-In Error:', error?.code || error?.message || error);
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

// 現在のアカウントを削除
export const deleteCurrentAccount = async (): Promise<void> => {
  // Expo Goではモック認証なので何もしない
  if (isExpoGo) {
    console.log('Mock account delete for Expo Go');
    return;
  }

  const auth = await getFirebaseAuth();
  const firebaseUser = auth?.currentUser;

  if (!auth || !firebaseUser) {
    throw new Error('現在のログイン情報を取得できません');
  }

  try {
    // Firestore上のユーザー情報を先に削除
    await deleteDoc(doc(db, 'users', firebaseUser.uid));

    const { deleteUser } = await import('firebase/auth');
    await deleteUser(firebaseUser);
  } catch (error: any) {
    console.error('Delete Account Error:', error?.code || error?.message || error);
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
