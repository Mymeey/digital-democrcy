import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../store/useStore';

interface Attachment {
  id: string;
  uri: string;
  url: string;
}

export default function PostScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { addOpinion, user, settings } = useStore();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - attachments.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newAttachments = result.assets.map((asset) => ({
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uri: asset.uri,
        url: asset.uri, // Expo Goではローカルパスをそのまま使用
      }));
      setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5));
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('権限が必要', 'カメラの使用を許可してください');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled) {
      const newAttachment = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uri: result.assets[0].uri,
        url: result.assets[0].uri,
      };
      setAttachments((prev) => [...prev, newAttachment].slice(0, 5));
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }
    if (!description.trim()) {
      Alert.alert('エラー', '内容を入力してください');
      return;
    }

    try {
      setIsUploading(true);
      const imageUris = attachments.map((a) => a.uri);
      await addOpinion(title.trim(), description.trim(), imageUris);
      setTitle('');
      setDescription('');
      setAttachments([]);
      Alert.alert('投稿完了', '意見を投稿しました。投票期間は1週間です。');
    } catch (error) {
      Alert.alert('エラー', '投稿に失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  if (user?.status !== 'approved') {
    return (
      <View style={styles.container}>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={styles.lockedTitle}>投稿できません</Text>
          <Text style={styles.lockedText}>
            本人確認が完了するまで{'\n'}意見を投稿することはできません
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>意見を投稿</Text>
        <Text style={styles.description}>
          組織をより良くするための意見を投稿しましょう
        </Text>

        {/* 投票ルール説明 */}
        <View style={styles.postLimitContainer}>
          <Text style={styles.postLimitInfo}>
            🗳️ {settings.voteThreshold}%以上の賛成で組織に提出されます
          </Text>
          <Text style={styles.postLimitInfo}>
            ⏰ 投票期間: 1週間 / 回答期限: 2週間
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>タイトル</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="例：ミーティングの時間短縮について"
            maxLength={50}
          />
          <Text style={styles.charCount}>{title.length}/50</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>内容</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="詳しい説明や提案内容を入力してください..."
            multiline
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* 画像添付セクション */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>画像添付（任意・最大5枚）</Text>
          
          {/* 添付済み画像 */}
          {attachments.length > 0 && (
            <View style={styles.attachmentsPreview}>
              {attachments.map((attachment) => (
                <View key={attachment.id} style={styles.attachmentItem}>
                  <Image source={{ uri: attachment.url }} style={styles.attachmentThumb} />
                  <TouchableOpacity
                    style={styles.removeAttachment}
                    onPress={() => removeAttachment(attachment.id)}
                  >
                    <Text style={styles.removeAttachmentText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          
          {/* 添付ボタン */}
          {attachments.length < 5 && (
            <View style={styles.attachmentButtons}>
              <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
                <Text style={styles.attachButtonText}>📁 ライブラリから選択</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachButton} onPress={takePhoto}>
                <Text style={styles.attachButtonText}>📷 写真を撮る</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!title.trim() || !description.trim() || isUploading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!title.trim() || !description.trim() || isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>投稿する</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#666',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  descriptionInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 150,
  },
  charCount: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  lockedIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  lockedText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  // 投稿ルール説明用スタイル
  postLimitContainer: {
    backgroundColor: '#e8f4f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  postLimitInfo: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 4,
  },
  attachmentsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  attachmentItem: {
    position: 'relative',
  },
  attachmentThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeAttachment: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff3b30',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAttachmentText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  attachmentButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  attachButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  attachButtonText: {
    fontSize: 14,
    color: '#333',
  },
});
