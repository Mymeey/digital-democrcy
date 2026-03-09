import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useStore } from '../store/useStore';

export default function OrganizationSetupScreen() {
  const {
    user,
    createOrganization,
    joinOrganization,
    loadOrganizations,
    isLoading,
  } = useStore();

  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');

  useEffect(() => {
    loadOrganizations();
  }, []);

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      Alert.alert('エラー', '組織名を入力してください');
      return;
    }

    try {
      const org = await createOrganization(orgName.trim());
      Alert.alert(
        '組織を作成しました',
        `組織コード: ${org.code}\n\nこのコードを組織メンバーに共有してください。`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('エラー', '組織の作成に失敗しました');
    }
  };

  const handleJoinOrganization = async () => {
    if (!orgCode.trim()) {
      Alert.alert('エラー', '組織コードを入力してください');
      return;
    }

    const success = await joinOrganization(orgCode.trim().toUpperCase());
    
    if (success) {
      Alert.alert(
        '参加申請完了',
        '本人確認書類を提出してください。運営者の承認後、組織に参加できます。',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('エラー', '組織コードが見つかりません');
    }
  };

  // モード選択画面
  if (mode === 'select') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🏢</Text>
            <Text style={styles.headerTitle}>組織設定</Text>
            <Text style={styles.headerSubtitle}>
              組織を作成するか、既存の組織に参加してください
            </Text>
          </View>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setMode('create')}
          >
            <Text style={styles.optionIcon}>➕</Text>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>新しい組織を作成</Text>
              <Text style={styles.optionDescription}>
                あなたが組織の管理者として、メンバーからの意見を受け付けます
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setMode('join')}
          >
            <Text style={styles.optionIcon}>🔗</Text>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>組織に参加</Text>
              <Text style={styles.optionDescription}>
                組織コードを使って既存の組織に参加します
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>💡 組織とは？</Text>
            <Text style={styles.infoText}>
              会社、団体、コミュニティなど、メンバーが意見を交換するグループです。{'\n\n'}
              <Text style={styles.infoBold}>組織管理者:</Text> 提出された意見に対して返答します{'\n'}
              <Text style={styles.infoBold}>メンバー:</Text> 意見を投稿・投票します
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 組織作成画面
  if (mode === 'create') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setMode('select')}
            >
              <Text style={styles.backButtonText}>← 戻る</Text>
            </TouchableOpacity>

            <View style={styles.formHeader}>
              <Text style={styles.formIcon}>🏗️</Text>
              <Text style={styles.formTitle}>新しい組織を作成</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>組織名</Text>
              <TextInput
                style={styles.input}
                placeholder="例: 株式会社サンプル"
                value={orgName}
                onChangeText={setOrgName}
                autoFocus
              />
            </View>

            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                ✓ あなたは組織の管理者になります{'\n'}
                ✓ 参加用の組織コードが自動生成されます{'\n'}
                ✓ メンバーからの意見に返答する責任があります
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, !orgName.trim() && styles.submitButtonDisabled]}
              onPress={handleCreateOrganization}
              disabled={!orgName.trim() || isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? '作成中...' : '組織を作成'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // 組織参加画面
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setMode('select')}
          >
            <Text style={styles.backButtonText}>← 戻る</Text>
          </TouchableOpacity>

          <View style={styles.formHeader}>
            <Text style={styles.formIcon}>🔗</Text>
            <Text style={styles.formTitle}>組織に参加</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>組織コード</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="例: ABCD1234"
              value={orgCode}
              onChangeText={(text) => setOrgCode(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              autoFocus
            />
            <Text style={styles.inputHint}>
              組織の管理者から共有された8文字のコードを入力してください
            </Text>
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              ✓ 参加後、本人確認が必要です{'\n'}
              ✓ 運営者の承認後にメンバーになれます{'\n'}
              ✓ 審査には数日かかる場合があります
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, orgCode.length !== 8 && styles.submitButtonDisabled]}
            onPress={handleJoinOrganization}
            disabled={orgCode.length !== 8 || isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? '処理中...' : '参加申請'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  headerIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  infoBold: {
    fontWeight: 'bold',
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  formIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  noteBox: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  noteText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 24,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
