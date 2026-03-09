import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { signOut } from '../services/authService';

export default function ProfileScreen() {
  const { user, setUser } = useStore();
  const navigation = useNavigation<any>();

  const handleSignOut = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              setUser(null);
            } catch (error) {
              Alert.alert('エラー', 'ログアウトに失敗しました');
            }
          },
        },
      ]
    );
  };

  const getStatusText = () => {
    switch (user?.status) {
      case 'approved':
        return { text: '承認済み', color: '#34C759' };
      case 'pending':
        return { text: '承認待ち', color: '#FF9500' };
      case 'rejected':
        return { text: '却下', color: '#FF3B30' };
      default:
        return { text: '未申請', color: '#888' };
    }
  };

  const status = getStatusText();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>プロフィール</Text>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>名前</Text>
          <Text style={styles.value}>{user?.name || '未設定'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.label}>メールアドレス</Text>
          <Text style={styles.value}>{user?.email || '未設定'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.label}>ログイン方法</Text>
          <Text style={styles.value}>
            {user?.authProvider === 'apple' ? 'Apple' : 'Google'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.label}>ステータス</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Text style={styles.statusText}>{status.text}</Text>
          </View>
        </View>

        {user?.status === 'approved' && user?.approvedAt && (
          <>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.label}>承認日</Text>
              <Text style={styles.value}>
                {new Date(user.approvedAt).toLocaleDateString('ja-JP')}
              </Text>
            </View>
          </>
        )}
      </View>

      {user?.status === 'approved' && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>あなたの活動</Text>
          <Text style={styles.statsDescription}>
            このアプリでの活動状況が表示されます
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>ログアウト</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.legalSection}>
        <TouchableOpacity 
          style={styles.legalButton} 
          onPress={() => navigation.navigate('Terms')}
        >
          <Text style={styles.legalButtonText}>利用規約</Text>
          <Text style={styles.legalArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.legalButton} 
          onPress={() => navigation.navigate('Privacy')}
        >
          <Text style={styles.legalButtonText}>プライバシーポリシー</Text>
          <Text style={styles.legalArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>バージョン 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  label: {
    fontSize: 15,
    color: '#666',
  },
  value: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statsDescription: {
    fontSize: 14,
    color: '#888',
  },
  actions: {
    marginTop: 20,
  },
  signOutButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  legalSection: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  legalButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  legalButtonText: {
    fontSize: 15,
    color: '#333',
  },
  legalArrow: {
    fontSize: 20,
    color: '#ccc',
  },
  version: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
});
