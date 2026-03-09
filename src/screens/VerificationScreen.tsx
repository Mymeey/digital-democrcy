import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../store/useStore';

type Step = 'realName' | 'idCard' | 'selfie' | 'review';

export default function VerificationScreen() {
  const [step, setStep] = useState<Step>('realName');
  const [realName, setRealName] = useState('');
  const [idCardImage, setIdCardImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  
  const { submitVerification, isLoading, user } = useStore();

  // 身分証をギャラリーから選択
  const pickIdCard = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setIdCardImage(result.assets[0].uri);
      setStep('selfie');
    }
  };

  // 身分証をカメラで撮影
  const takeIdCardPhoto = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('カメラへのアクセスが必要です');
        return;
      }
    }
    setFacing('back');
    setIsCameraOpen(true);
  };

  // 顔写真を撮影（その場でのみ）
  const takeSelfie = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('カメラへのアクセスが必要です');
        return;
      }
    }
    setFacing('front');
    setIsCameraOpen(true);
  };

  // 写真を撮影
  const capturePhoto = async () => {
    if (!cameraRef.current) return;
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      
      if (photo) {
        if (step === 'idCard') {
          setIdCardImage(photo.uri);
          setStep('selfie');
        } else if (step === 'selfie') {
          setSelfieImage(photo.uri);
          setStep('review');
        }
      }
      setIsCameraOpen(false);
    } catch (error) {
      console.error('写真撮影エラー:', error);
      Alert.alert('撮影に失敗しました');
    }
  };

  // 本名を確定して次へ
  const handleRealNameNext = () => {
    const trimmedName = realName.trim();
    if (!trimmedName) {
      Alert.alert('エラー', '本名を入力してください');
      return;
    }
    if (trimmedName.length < 2) {
      Alert.alert('エラー', '正しい本名を入力してください');
      return;
    }
    setStep('idCard');
  };

  // 認証を提出
  const handleSubmit = async () => {
    if (!realName.trim()) {
      Alert.alert('エラー', '本名を入力してください');
      return;
    }
    if (!idCardImage || !selfieImage) {
      Alert.alert('エラー', '身分証明書と顔写真の両方が必要です');
      return;
    }

    Alert.alert(
      '確認',
      '承認申請を送信しますか？\n管理者が確認後、アプリを利用できるようになります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '送信',
          onPress: async () => {
            try {
              await submitVerification(idCardImage, selfieImage, realName.trim());
              Alert.alert(
                '申請完了',
                '承認申請を送信しました。管理者の確認をお待ちください。'
              );
            } catch (error) {
              Alert.alert('エラー', '送信に失敗しました');
            }
          },
        },
      ]
    );
  };

  // やり直し
  const handleReset = () => {
    setRealName('');
    setIdCardImage(null);
    setSelfieImage(null);
    setStep('realName');
  };

  // カメラ画面
  if (isCameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
        >
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraGuideText}>
              {step === 'idCard' 
                ? '身分証明書を枠内に収めてください' 
                : '顔全体が映るようにしてください'}
            </Text>
            
            <View style={styles.cameraFrame} />
            
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsCameraOpen(false)}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.captureButton}
                onPress={capturePhoto}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              
              <View style={{ width: 80 }} />
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  // 申請待ち状態
  if (user?.status === 'pending' && user?.submittedAt) {
    return (
      <View style={styles.container}>
        <View style={styles.pendingContainer}>
          <Text style={styles.pendingIcon}>⏳</Text>
          <Text style={styles.pendingTitle}>承認待ち</Text>
          <Text style={styles.pendingText}>
            承認申請を受け付けました。{'\n'}
            管理者が確認するまでお待ちください。
          </Text>
        </View>
      </View>
    );
  }

  // 却下された場合
  if (user?.status === 'rejected') {
    return (
      <View style={styles.container}>
        <View style={styles.rejectedContainer}>
          <Text style={styles.rejectedIcon}>❌</Text>
          <Text style={styles.rejectedTitle}>承認されませんでした</Text>
          {user.rejectionReason && (
            <Text style={styles.rejectionReason}>
              理由: {user.rejectionReason}
            </Text>
          )}
          <TouchableOpacity style={styles.retryButton} onPress={handleReset}>
            <Text style={styles.retryButtonText}>再申請する</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>本人確認</Text>
        <Text style={styles.description}>
          組織の一員であることを確認するため、{'\n'}
          以下の情報と書類が必要です
        </Text>

        {/* Step 0: 本名入力 */}
        <View style={[styles.stepContainer, step !== 'realName' && step !== 'review' && styles.completedStep]}>
          <Text style={styles.stepTitle}>
            {step === 'realName' ? '① ' : '✓ '}本名
          </Text>
          <Text style={styles.stepDescription}>
            身分証明書に記載されている氏名を入力
          </Text>
          
          {step === 'realName' ? (
            <>
              <TextInput
                style={styles.nameInput}
                placeholder="例：山田 太郎"
                placeholderTextColor="#999"
                value={realName}
                onChangeText={setRealName}
                autoCapitalize="words"
                returnKeyType="done"
              />
              <TouchableOpacity 
                style={[styles.nextButton, !realName.trim() && styles.disabledButton]} 
                onPress={handleRealNameNext}
                disabled={!realName.trim()}
              >
                <Text style={styles.nextButtonText}>次へ</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.completedNameContainer}>
              <Text style={styles.completedName}>{realName}</Text>
              {step === 'review' && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setStep('realName')}
                >
                  <Text style={styles.editButtonText}>編集</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Step 1: 身分証明書 */}
        <View style={[styles.stepContainer, step === 'realName' && styles.disabled]}>
          <Text style={styles.stepTitle}>
            {idCardImage ? '✓ ' : step === 'idCard' ? '② ' : '○ '}身分証明書
          </Text>
          <Text style={styles.stepDescription}>
            学生証・教職員証・社員証など
          </Text>
        
        {idCardImage ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: idCardImage }} style={styles.previewImage} />
            {step === 'review' && (
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => {
                  setIdCardImage(null);
                  setStep('idCard');
                }}
              >
                <Text style={styles.retakeButtonText}>撮り直す</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.photoButton} onPress={takeIdCardPhoto}>
              <Text style={styles.photoButtonText}>📷 撮影する</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={pickIdCard}>
              <Text style={styles.photoButtonText}>🖼️ 選択する</Text>
            </TouchableOpacity>
          </View>
        )}n      </View>

      {/* Step 2: 顔写真 */}
      <View style={[styles.stepContainer, (step === 'idCard' || step === 'realName') && styles.disabled]}>
        <Text style={styles.stepTitle}>
          {selfieImage ? '✓ ' : step === 'selfie' ? '③ ' : '○ '}顔写真
        </Text>
        <Text style={styles.stepDescription}>
          その場で撮影してください（ギャラリーからは選択できません）
        </Text>
        
        {selfieImage ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: selfieImage }} style={styles.previewImage} />
            {step === 'review' && (
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => {
                  setSelfieImage(null);
                  setStep('selfie');
                }}
              >
                <Text style={styles.retakeButtonText}>撮り直す</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : step !== 'idCard' && step !== 'realName' ? (
          <TouchableOpacity style={styles.selfieButton} onPress={takeSelfie}>
            <Text style={styles.selfieButtonText}>📷 顔写真を撮影</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 送信ボタン */}
      {step === 'review' && (
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>承認申請を送信</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>最初からやり直す</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 32,
  },
  stepContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  completedStep: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  // 本名入力
  nameInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  completedNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34C759',
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  photoButtonText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  selfieButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  selfieButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  imagePreview: {
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  retakeButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retakeButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  submitContainer: {
    marginTop: 16,
  },
  submitButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  resetButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#888',
    fontSize: 14,
  },
  // カメラ スタイル
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 40,
  },
  cameraGuideText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  cameraFrame: {
    width: 280,
    height: 200,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    alignSelf: 'center',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cancelButton: {
    width: 80,
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  // 待機・却下状態
  pendingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  pendingIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  pendingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  pendingText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  rejectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  rejectedIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  rejectedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 12,
  },
  rejectionReason: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
