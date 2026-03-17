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
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { signInWithApple, signInWithGoogleAccessToken } from '../services/authService';
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
  const isGoogleConfigured = Boolean(googleIosClientId);
  const isAuthConfigured = isFirebaseConfigured && isGoogleConfigured;

  const getFriendlyAuthError = (error: any): string => {
    const code = error?.code || error?.message || '';

    if (!isFirebaseConfigured) {
      return `Firebase設定が不足しています: ${firebaseConfigMissingKeys.join(', ')}`;
    }
    if (!isGoogleConfigured) {
      return 'Googleログイン設定が不足しています（EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID）。';
    }
    if (String(code).includes('auth/invalid-credential')) {
      return '認証設定に不一致があります。Google/Apple/Firebaseの連携設定をご確認ください。';
    }
    if (String(code).includes('auth/network-request-failed')) {
      return 'ネットワークエラーが発生しました。通信環境をご確認のうえ再度お試しください。';
    }
    return 'サインインに失敗しました。時間をおいて再度お試しください。';
  };

  const reversedClientId = googleIosClientId
    ? googleIosClientId.split('.').reverse().join('.')
    : undefined;

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: googleIosClientId || 'dummy',
    scopes: ['openid', 'profile', 'email'],
    redirectUri: reversedClientId
      ? makeRedirectUri({ scheme: reversedClientId })
      : undefined,
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
      const accessToken = response.authentication?.accessToken;
      if (!accessToken) {
        Alert.alert('エラー', 'Google認証トークンを取得できませんでした');
        return;
      }
      handleGoogleToken(accessToken);
      return;
    }

    if (response.type === 'error') {
      Alert.alert('エラー', 'Google認証に失敗しました。設定をご確認ください。');
    }
  }, [response]);

  const handleGoogleToken = async (accessToken: string) => {
    setIsLoading(true);
    try {
      const user = await signInWithGoogleAccessToken(accessToken);
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
            : 'Googleログイン設定が不足しています（EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID）。'
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
        {isExpoGo && (
          <Text style={styles.expoGoNotice}>
            Expo Goでは認証できません。開発ビルドまたは本番アプリでサインインしてください。
          </Text>
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
  expoGoNotice: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
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
