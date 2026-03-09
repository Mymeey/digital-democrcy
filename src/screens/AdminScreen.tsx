import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
  Share,
  FlatList,
} from 'react-native';
import { useStore } from '../store/useStore';
import { Opinion, User } from '../types';

export default function AdminScreen() {
  const { 
    user, 
    opinions, 
    currentOrganization,
    organizationMembers,
    resolveOpinion,
    rejectOpinion,
    loadOpinions,
    loadOrganizationMembers,
    isOrgAdmin,
  } = useStore();
  
  const [activeTab, setActiveTab] = useState<'opinions' | 'members' | 'info'>('opinions');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOpinion, setSelectedOpinion] = useState<Opinion | null>(null);
  const [responseText, setResponseText] = useState('');

  const isAdmin = isOrgAdmin();

  useEffect(() => {
    if (isAdmin) {
      loadOpinions();
      loadOrganizationMembers();
    }
  }, [isAdmin]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadOpinions(), loadOrganizationMembers()]);
    setRefreshing(false);
  };

  // 意見を採用
  const handleResolve = async () => {
    if (!selectedOpinion) return;
    
    await resolveOpinion(selectedOpinion.id, responseText);
    setSelectedOpinion(null);
    setResponseText('');
    Alert.alert('完了', '意見を採用し、返答しました');
  };

  // 意見を却下
  const handleReject = async () => {
    if (!selectedOpinion) return;
    
    Alert.alert(
      '却下確認',
      'この意見を却下しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '却下',
          style: 'destructive',
          onPress: async () => {
            await rejectOpinion(selectedOpinion.id, responseText || '検討の結果、今回は見送りとさせていただきます');
            setSelectedOpinion(null);
            setResponseText('');
          },
        },
      ]
    );
  };

  // 組織コードをコピー（Alertで表示）
  const copyOrgCode = () => {
    if (currentOrganization?.code) {
      Alert.alert(
        '組織コード',
        `${currentOrganization.code}\n\nこのコードをメンバーに共有してください`,
        [{ text: 'OK' }]
      );
    }
  };

  // 組織コードを共有
  const shareOrgCode = async () => {
    if (!currentOrganization) return;
    
    try {
      await Share.share({
        message: `「${currentOrganization.name}」に参加してください！\n\n組織コード: ${currentOrganization.code}\n\nアプリをダウンロードして、このコードを入力してください。`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedIcon}>🔐</Text>
          <Text style={styles.lockedTitle}>組織管理者専用</Text>
          <Text style={styles.lockedText}>
            この画面は組織の管理者のみアクセスできます
          </Text>
        </View>
      </View>
    );
  }

  const submittedOpinions = opinions.filter((o) => o.status === 'submitted');
  const approvedMembers = organizationMembers.filter((m) => m.status === 'approved');
  const pendingMembers = organizationMembers.filter((m) => m.status === 'pending');

  // メンバーの役割ラベル
  const getRoleLabel = (member: User) => {
    if (member.id === currentOrganization?.adminUserId || member.role === 'org_admin') {
      return '管理者';
    }
    return 'メンバー';
  };

  // メンバーの参加日をフォーマット
  const formatJoinDate = (timestamp?: number) => {
    if (!timestamp) return '不明';
    return new Date(timestamp).toLocaleDateString('ja-JP');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>組織管理</Text>
        <Text style={styles.headerSubtitle}>{currentOrganization?.name || '組織'}</Text>
      </View>

      {/* タブ */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'opinions' && styles.activeTab]}
          onPress={() => setActiveTab('opinions')}
        >
          <Text style={[styles.tabText, activeTab === 'opinions' && styles.activeTabText]}>
            審議中 ({submittedOpinions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.activeTab]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>
            名簿 ({approvedMembers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.activeTab]}
          onPress={() => setActiveTab('info')}
        >
          <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
            組織情報
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 審議中の意見タブ */}
        {activeTab === 'opinions' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📝 提出された意見</Text>
              <Text style={styles.sectionDescription}>
                メンバーから提出された意見に返答してください
              </Text>
            </View>

            {submittedOpinions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>✨</Text>
                <Text style={styles.emptyText}>審議待ちの意見はありません</Text>
              </View>
            ) : (
              submittedOpinions.map((opinion) => (
                <TouchableOpacity
                  key={opinion.id}
                  style={styles.opinionCard}
                  onPress={() => setSelectedOpinion(opinion)}
                >
                  <View style={styles.opinionHeader}>
                    <Text style={styles.opinionTitle}>{opinion.title}</Text>
                    <View style={styles.deadlineBadge}>
                      <Text style={styles.deadlineText}>
                        期限: {opinion.responseDeadline 
                          ? new Date(opinion.responseDeadline).toLocaleDateString('ja-JP') 
                          : '未設定'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.opinionDescription} numberOfLines={2}>
                    {opinion.description}
                  </Text>
                  <View style={styles.opinionFooter}>
                    <Text style={styles.voteCount}>
                      👍 {opinion.votes.length}票
                    </Text>
                    <Text style={styles.opposeCount}>
                      👎 {(opinion.opposeVotes || []).length}票
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* メンバー名簿タブ */}
        {activeTab === 'members' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>👥 メンバー名簿</Text>
              <Text style={styles.sectionDescription}>
                承認済み: {approvedMembers.length}名 / 申請中: {pendingMembers.length}名
              </Text>
            </View>

            {approvedMembers.length === 0 && pendingMembers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👤</Text>
                <Text style={styles.emptyText}>メンバーはまだいません</Text>
              </View>
            ) : (
              <>
                {/* 承認済みメンバー */}
                {approvedMembers.length > 0 && (
                  <View style={styles.memberSection}>
                    <Text style={styles.memberSectionTitle}>✅ 承認済みメンバー ({approvedMembers.length}名)</Text>
                    {approvedMembers.map((member) => (
                      <View key={member.id} style={styles.memberCard}>
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberAvatarText}>
                            {(member.realName || member.name).charAt(0)}
                          </Text>
                        </View>
                        <View style={styles.memberInfo}>
                          <View style={styles.memberNameRow}>
                            <Text style={styles.memberName}>{member.realName || member.name}</Text>
                            {(member.id === currentOrganization?.adminUserId || member.role === 'org_admin') && (
                              <View style={styles.adminBadge}>
                                <Text style={styles.adminBadgeText}>管理者</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.memberEmail}>{member.email}</Text>
                          <Text style={styles.memberJoinDate}>
                            参加日: {formatJoinDate(member.approvedAt)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* 申請中メンバー */}
                {pendingMembers.length > 0 && (
                  <View style={styles.memberSection}>
                    <Text style={styles.memberSectionTitle}>⏳ 承認待ち ({pendingMembers.length}名)</Text>
                    {pendingMembers.map((member) => (
                      <View key={member.id} style={[styles.memberCard, styles.pendingMemberCard]}>
                        <View style={[styles.memberAvatar, styles.pendingAvatar]}>
                          <Text style={styles.memberAvatarText}>
                            {(member.realName || member.name).charAt(0)}
                          </Text>
                        </View>
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberName}>{member.realName || member.name}</Text>
                          <Text style={styles.memberEmail}>{member.email}</Text>
                          <Text style={styles.pendingText}>
                            本人確認待ち（運営者が審査中）
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* 組織情報タブ */}
        {activeTab === 'info' && currentOrganization && (
          <>
            <View style={styles.orgInfoCard}>
              <Text style={styles.orgInfoLabel}>組織名</Text>
              <Text style={styles.orgInfoValue}>{currentOrganization.name}</Text>
            </View>

            <View style={styles.orgInfoCard}>
              <Text style={styles.orgInfoLabel}>組織コード（メンバー招待用）</Text>
              <View style={styles.codeContainer}>
                <Text style={styles.orgCode}>{currentOrganization.code}</Text>
                <View style={styles.codeActions}>
                  <TouchableOpacity style={styles.codeButton} onPress={copyOrgCode}>
                    <Text style={styles.codeButtonText}>📋 コピー</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.codeButton} onPress={shareOrgCode}>
                    <Text style={styles.codeButtonText}>📤 共有</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.orgInfoCard}>
              <Text style={styles.orgInfoLabel}>メンバー数</Text>
              <Text style={styles.orgInfoValue}>{currentOrganization.totalMembers}人</Text>
            </View>

            <View style={styles.orgInfoCard}>
              <Text style={styles.orgInfoLabel}>投票閾値</Text>
              <Text style={styles.orgInfoValue}>{currentOrganization.voteThreshold}%</Text>
              <Text style={styles.orgInfoHint}>
                この割合以上の賛成票で意見が提出されます
              </Text>
            </View>

            <View style={styles.orgInfoCard}>
              <Text style={styles.orgInfoLabel}>反対閾値</Text>
              <Text style={styles.orgInfoValue}>{currentOrganization.opposeThreshold}%</Text>
              <Text style={styles.orgInfoHint}>
                この割合以上の反対票で意見が却下されます
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* 意見の詳細モーダル */}
      <Modal
        visible={selectedOpinion !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedOpinion && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedOpinion(null)}>
                <Text style={styles.closeButton}>閉じる</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>意見の確認</Text>
              <View style={{ width: 50 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.opinionModalTitle}>{selectedOpinion.title}</Text>
              <Text style={styles.opinionModalAuthor}>
                投稿者: {selectedOpinion.authorName}
              </Text>
              <Text style={styles.opinionModalDescription}>
                {selectedOpinion.description}
              </Text>
              
              <View style={styles.voteInfoContainer}>
                <View style={styles.voteInfoBox}>
                  <Text style={styles.voteInfoLabel}>賛成</Text>
                  <Text style={styles.voteInfoValue}>{selectedOpinion.votes.length}票</Text>
                </View>
                <View style={styles.voteInfoBox}>
                  <Text style={styles.voteInfoLabel}>反対</Text>
                  <Text style={styles.voteInfoValue}>{(selectedOpinion.opposeVotes || []).length}票</Text>
                </View>
              </View>

              {selectedOpinion.responseDeadline && (
                <View style={styles.deadlineInfo}>
                  <Text style={styles.deadlineInfoLabel}>回答期限</Text>
                  <Text style={styles.deadlineInfoValue}>
                    {new Date(selectedOpinion.responseDeadline).toLocaleDateString('ja-JP')}
                  </Text>
                </View>
              )}

              <Text style={styles.responseLabel}>返答を入力</Text>
              <TextInput
                style={styles.responseInput}
                value={responseText}
                onChangeText={setResponseText}
                placeholder="メンバーへの返答を入力してください..."
                multiline
                textAlignVertical="top"
              />

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.resolveButton}
                  onPress={handleResolve}
                >
                  <Text style={styles.resolveButtonText}>✓ 採用する</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={handleReject}
                >
                  <Text style={styles.rejectButtonText}>✕ 却下する</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  lockedIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  lockedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  opinionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  opinionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  opinionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  deadlineBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deadlineText: {
    fontSize: 11,
    color: '#856404',
    fontWeight: '500',
  },
  opinionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  opinionFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  voteCount: {
    fontSize: 14,
    color: '#28A745',
  },
  opposeCount: {
    fontSize: 14,
    color: '#DC3545',
  },
  orgInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  orgInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  orgInfoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  orgInfoHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  codeContainer: {
    marginTop: 8,
  },
  orgCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 12,
  },
  codeActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  codeButton: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  codeButtonText: {
    fontSize: 14,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    color: '#007AFF',
    fontSize: 16,
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
  opinionModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  opinionModalAuthor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  opinionModalDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
  },
  voteInfoContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  voteInfoBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  voteInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  voteInfoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  deadlineInfo: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  deadlineInfoLabel: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4,
  },
  deadlineInfoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
  },
  responseLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  responseInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  resolveButton: {
    flex: 1,
    backgroundColor: '#28A745',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resolveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#DC3545',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // メンバー名簿スタイル
  memberSection: {
    marginBottom: 24,
  },
  memberSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pendingMemberCard: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pendingAvatar: {
    backgroundColor: '#FFC107',
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  adminBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  memberEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  memberJoinDate: {
    fontSize: 12,
    color: '#888',
  },
  pendingText: {
    fontSize: 12,
    color: '#F57C00',
    fontStyle: 'italic',
  },
});
