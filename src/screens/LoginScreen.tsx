import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { signInWithApple, signInWithGoogleIdToken, signInWithMock } from '../services/authService';
import { useStore } from '../store/useStore';
import { isExpoGo, isFirebaseConfigured, firebaseConfigMissingKeys } from '../config/firebase';

// Required for Google Auth session
WebBrowser.maybeCompleteAuthSession();

// メインカラー
const PRIMARY_COLOR = '#007AFF';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(Platform.OS === 'ios');
  const setUser = useStore((state) => state.setUser);
  const navigation = useNavigation<any>();

  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const isGoogleConfigured = Boolean(googleIosClientId || googleWebClientId);
  const isAuthConfigured = isFirebaseConfigured && isGoogleConfigured;

  const getFriendlyAuthError = (error: any): string => {
    const code = error?.code || error?.message || '';

    if (!isFirebaseConfigured) {
      return `Firebase設定が不足しています: ${firebaseConfigMissingKeys.join(', ')}`;
    }
    if (!isGoogleConfigured) {
      return 'Googleログイン設定が不足しています（EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID / EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID）。';
    }
    if (String(code).includes('auth/invalid-credential')) {
      return '認証設定に不一致があります。Google/Apple/Firebaseの連携設定をご確認ください。';
    }
    if (String(code).includes('auth/network-request-failed')) {
      return 'ネットワークエラーが発生しました。通信環境をご確認のうえ再度お試しください。';
    }
    return 'サインインに失敗しました。時間をおいて再度お試しください。';
  };

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: googleIosClientId || 'dummy',
    webClientId: googleWebClientId || 'dummy',
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    const checkAvailability = async () => {
      if (Platform.OS !== 'ios') return;
      const available = await AppleAuthentication.isAvailableAsync();
      setIsAppleAvailable(available);
    };
    checkAvailability();
  }, []);

  // Handle Google Sign-In response
  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const idToken = response.params?.id_token || response.authentication?.idToken;
      if (!idToken) {
        Alert.alert('エラー', 'Google認証トークンを取得できませんでした');
        return;
      }
      handleGoogleToken(idToken);
      return;
    }

    if (response.type === 'error') {
      Alert.alert('エラー', 'Google認証に失敗しました。設定をご確認ください。');
    }
  }, [response]);

  const handleGoogleToken = async (idToken: string) => {
    setIsLoading(true);
    try {
      const user = await signInWithGoogleIdToken(idToken);
      if (user) {
        setUser(user);
      }
    } catch (error: any) {
      Alert.alert('エラー', getFriendlyAuthError(error));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (!isFirebaseConfigured) {
      Alert.alert('設定エラー', `Firebase設定が不足しています: ${firebaseConfigMissingKeys.join(', ')}`);
      return;
    }

    setIsLoading(true);
    try {
      const user = await signInWithApple();
      if (user) {
        setUser(user);
      }
    } catch (error: any) {
      Alert.alert('エラー', getFriendlyAuthError(error));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      if (!isAuthConfigured) {
        Alert.alert(
          '設定エラー',
          !isFirebaseConfigured
            ? `Firebase設定が不足しています: ${firebaseConfigMissingKeys.join(', ')}`
            : 'Googleログイン設定が不足しています（EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID / EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID）。'
        );
        return;
      }
      if (!request) {
        Alert.alert('エラー', 'Google認証の初期化中です。少し待ってから再度お試しください。');
        return;
      }
      await promptAsync({
        showInRecents: true,
      });
    } catch (error: any) {
      Alert.alert('エラー', getFriendlyAuthError(error));
      console.error(error);
    }
  };

  // Expo Go用テストログイン
  const handleDevLogin = async () => {
    setIsLoading(true);
    try {
      const user = await signInWithMock();
      setUser(user);
    } catch (error) {
      Alert.alert('エラー', 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>サインイン中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>デジタル民主主義</Text>
        <Text style={styles.subtitle}>
          組織の意見を集め、{'\n'}一定の賛同が集まれば{'\n'}リーダーに提出できます
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        {/* Expo Go用のテストログイン */}
        {isExpoGo && (
          <View style={styles.devSection}>
            <Text style={styles.devSectionTitle}>🧪 テスト用</Text>
            <TouchableOpacity style={styles.devButton} onPress={handleDevLogin}>
              <Text style={styles.devButtonText}>サインイン</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 本番用の認証ボタン（Expo Go以外で表示） */}
        {!isExpoGo && isAppleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={8}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        )}

        {!isExpoGo && (
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
            <Text style={styles.googleButtonText}>Googleでサインイン</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>サインインすると</Text>
        <View style={styles.linkRow}>
          <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
            <Text style={styles.linkText}>利用規約</Text>
          </TouchableOpacity>
          <Text style={styles.footerText}>と</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
            <Text style={styles.linkText}>プライバシーポリシー</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footerText}>に同意したものとみなされます</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 16,
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  devSection: {
    gap: 10,
  },
  devSectionTitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 2,
    fontWeight: '600',
  },
  devButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  linkText: {
    fontSize: 12,
    color: '#007AFF',
    textDecorationLine: 'underline',
    marginHorizontal: 4,
  },
});
