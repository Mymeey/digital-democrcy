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
import { makeRedirectUri } from 'expo-auth-session';
import { signInWithApple, signInWithGoogleIdToken, signInWithMock } from '../services/authService';
import { useStore } from '../store/useStore';
import { isExpoGo } from '../config/firebase';

// Required for Google Auth session
WebBrowser.maybeCompleteAuthSession();

// メインカラー
const PRIMARY_COLOR = '#007AFF';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const setUser = useStore((state) => state.setUser);
  const navigation = useNavigation<any>();

  // Google Auth Request with proper redirect URI
  const redirectUri = makeRedirectUri({
    scheme: 'opinionexchange',
    path: 'auth',
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: '405652056926-fqaklbis1r8h5evflnvjvv6pa4tn1m00.apps.googleusercontent.com',
    webClientId: '405652056926-0akpa0q8fivko7epm7hrlgblgpb94086.apps.googleusercontent.com',
    clientId: '405652056926-0akpa0q8fivko7epm7hrlgblgpb94086.apps.googleusercontent.com',
    redirectUri,
  });

  // Handle Google Sign-In response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        handleGoogleToken(id_token);
      }
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
      Alert.alert('エラー', 'Googleでのサインインに失敗しました');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      const user = await signInWithApple();
      if (user) {
        setUser(user);
      }
    } catch (error: any) {
      Alert.alert('エラー', 'Appleでのサインインに失敗しました');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await promptAsync();
    } catch (error: any) {
      Alert.alert('エラー', 'Googleでのサインインに失敗しました');
      console.error(error);
    } finally {
      setIsLoading(false);
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
          <TouchableOpacity style={styles.devButton} onPress={handleDevLogin}>
            <Text style={styles.devButtonText}>🧪 テストアカウントでログイン</Text>
          </TouchableOpacity>
        )}

        {/* 本番用の認証ボタン（Expo Go以外で表示） */}
        {!isExpoGo && Platform.OS === 'ios' && (
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
