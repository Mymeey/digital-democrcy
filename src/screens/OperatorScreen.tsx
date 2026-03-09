import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useStore } from '../store/useStore';
import { VerificationRequest } from '../types';

export default function OperatorScreen() {
  const {
    verificationRequests,
    loadVerificationRequests,
    updateUserStatus,
    isLoading,
    isOperator,
  } = useStore();

  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadVerificationRequests();
  }, []);

  // 運営者でない場合はアクセス拒否
  if (!isOperator()) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDenied}>
          <Text style={styles.accessDeniedIcon}>🚫</Text>
          <Text style={styles.accessDeniedTitle}>アクセス権限がありません</Text>
          <Text style={styles.accessDeniedText}>
            この画面は運営者専用です
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    Alert.alert(
      '承認確認',
      `${selectedRequest.userName}さんを承認しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '承認',
          onPress: async () => {
            await updateUserStatus(selectedRequest.userId, 'approved');
            setSelectedRequest(null);
          },
        },
      ]
    );
  };

  const handleReject = () => {
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedRequest) return;
    
    await updateUserStatus(selectedRequest.userId, 'rejected', rejectionReason);
    setShowRejectModal(false);
    setRejectionReason('');
    setSelectedRequest(null);
  };

  const renderRequest = ({ item }: { item: VerificationRequest }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => setSelectedRequest(item)}
    >
      <View style={styles.requestHeader}>
        <Text style={styles.requestName}>{item.userName}</Text>
        <Text style={styles.requestDate}>
          {new Date(item.submittedAt).toLocaleDateString('ja-JP')}
        </Text>
      </View>
      <Text style={styles.requestEmail}>{item.userEmail}</Text>
      <Text style={styles.requestOrg}>
        組織: {item.organizationName || '未設定'}
      </Text>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>審査待ち</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔐 本人確認審査</Text>
        <Text style={styles.headerSubtitle}>運営者専用画面</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : verificationRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>審査待ちの申請はありません</Text>
        </View>
      ) : (
        <FlatList
          data={verificationRequests}
          keyExtractor={(item) => item.userId}
          renderItem={renderRequest}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* 詳細モーダル */}
      <Modal
        visible={!!selectedRequest}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedRequest(null)}>
              <Text style={styles.modalClose}>閉じる</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>本人確認書類</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{selectedRequest?.userName}</Text>
              <Text style={styles.userEmail}>{selectedRequest?.userEmail}</Text>
              <Text style={styles.userOrg}>
                申請先組織: {selectedRequest?.organizationName || '未設定'}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>身分証明書</Text>
            {selectedRequest?.idCardImageUrl && (
              <Image
                source={{ uri: selectedRequest.idCardImageUrl }}
                style={styles.documentImage}
                resizeMode="contain"
              />
            )}

            <Text style={styles.sectionTitle}>自撮り写真</Text>
            {selectedRequest?.selfieImageUrl && (
              <Image
                source={{ uri: selectedRequest.selfieImageUrl }}
                style={styles.documentImage}
                resizeMode="contain"
              />
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={handleApprove}
              >
                <Text style={styles.approveButtonText}>✓ 承認</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={handleReject}
              >
                <Text style={styles.rejectButtonText}>✕ 却下</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 却下理由モーダル */}
      <Modal
        visible={showRejectModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.rejectModalOverlay}>
          <View style={styles.rejectModalContent}>
            <Text style={styles.rejectModalTitle}>却下理由</Text>
            <TextInput
              style={styles.rejectReasonInput}
              placeholder="却下理由を入力してください"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
            />
            <View style={styles.rejectModalButtons}>
              <TouchableOpacity
                style={styles.rejectModalCancel}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
              >
                <Text style={styles.rejectModalCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectModalConfirm}
                onPress={confirmReject}
              >
                <Text style={styles.rejectModalConfirmText}>却下する</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  accessDeniedIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
  },
  requestEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  requestOrg: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalClose: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  userInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userOrg: {
    fontSize: 14,
    color: '#007AFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  documentImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 40,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  approveButton: {
    backgroundColor: '#28A745',
  },
  approveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  rejectButton: {
    backgroundColor: '#DC3545',
  },
  rejectButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  rejectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  rejectModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  rejectReasonInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  rejectModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rejectModalCancel: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    marginRight: 8,
    alignItems: 'center',
  },
  rejectModalCancelText: {
    fontSize: 16,
    color: '#666',
  },
  rejectModalConfirm: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#DC3545',
    marginLeft: 8,
    alignItems: 'center',
  },
  rejectModalConfirmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
