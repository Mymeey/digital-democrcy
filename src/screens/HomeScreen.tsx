import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { useStore } from '../store/useStore';
import { Opinion } from '../types';

type SortOption = 'newest' | 'votes' | 'deadline';
type FilterOption = 'all' | 'pending' | 'submitted' | 'resolved' | 'rejected';
type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';

export default function HomeScreen() {
  const { opinions, user, settings, loadOpinions, voteOpinion, opposeOpinion, unvoteOpinion, reportOpinion, deleteOpinion } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedOpinionForReport, setSelectedOpinionForReport] = useState<Opinion | null>(null);
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  useEffect(() => {
    loadOpinions();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOpinions();
    setRefreshing(false);
  };

  // 期限切れチェック
  const isExpired = (opinion: Opinion) => {
    return opinion.status === 'pending' && Date.now() > opinion.votingDeadline;
  };

  // フィルタリング
  const filteredOpinions = opinions.filter((o) => {
    if (filterBy === 'all') return true;
    if (filterBy === 'rejected') return o.status === 'rejected' || isExpired(o);
    return o.status === filterBy;
  });

  // ソート
  const sortedOpinions = [...filteredOpinions].sort((a, b) => {
    switch (sortBy) {
      case 'votes':
        return b.votes.length - a.votes.length;
      case 'deadline':
        return a.votingDeadline - b.votingDeadline;
      default:
        return b.createdAt - a.createdAt;
    }
  });

  // セクション分け
  const pendingOpinions = sortedOpinions.filter((o) => o.status === 'pending' && !isExpired(o));
  const submittedOpinions = sortedOpinions.filter((o) => o.status === 'submitted');
  const resolvedOpinions = sortedOpinions.filter((o) => o.status === 'resolved');
  const rejectedOpinions = sortedOpinions.filter((o) => o.status === 'rejected' || isExpired(o));

  const sections = [
    { title: '🗳️ 投票中の意見', data: pendingOpinions, type: 'pending' },
    { title: '� 審議中の意見', data: submittedOpinions, type: 'submitted' },
    { title: '✅ 採用された意見', data: resolvedOpinions, type: 'resolved' },
    { title: '❌ 却下・期限切れ', data: rejectedOpinions, type: 'rejected' },
  ].filter((section) => section.data.length > 0);

  const handleVote = (opinion: Opinion) => {
    if (!user) return;
    if (isExpired(opinion)) return;
    
    if (opinion.votes.includes(user.id)) {
      unvoteOpinion(opinion.id);
    } else {
      voteOpinion(opinion.id);
    }
  };

  const handleOppose = (opinion: Opinion) => {
    if (!user) return;
    if (isExpired(opinion)) return;
    
    if ((opinion.opposeVotes || []).includes(user.id)) {
      unvoteOpinion(opinion.id);
    } else {
      opposeOpinion(opinion.id);
    }
  };

  // 残り時間を計算
  const getTimeRemaining = (deadline: number) => {
    const diff = deadline - Date.now();
    if (diff <= 0) return '期限切れ';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `残り${days}日${hours}時間`;
    return `残り${hours}時間`;
  };

  const openReportModal = (opinion: Opinion) => {
    if (!user) return;
    // 既に通報済みかチェック
    const alreadyReported = (opinion.reports || []).some((r) => r.reporterId === user.id);
    if (alreadyReported) {
      Alert.alert('通報済み', 'この意見は既に通報済みです');
      return;
    }
    setSelectedOpinionForReport(opinion);
    setReportModalVisible(true);
  };

  const handleReport = async (reason: ReportReason) => {
    if (!selectedOpinionForReport) return;
    await reportOpinion(selectedOpinionForReport.id, reason);
    setReportModalVisible(false);
    setSelectedOpinionForReport(null);
    Alert.alert('通報完了', 'ご報告ありがとうございます。確認いたします。');
  };

  const handleDelete = (opinion: Opinion) => {
    Alert.alert(
      '意見を削除',
      'この意見を削除しますか？\nこの操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteOpinion(opinion.id);
            if (success) {
              Alert.alert('削除完了', '意見を削除しました');
            } else {
              Alert.alert('エラー', '削除できませんでした');
            }
          },
        },
      ]
    );
  };

  const renderOpinion = ({ item }: { item: Opinion }) => {
    const hasVoted = user ? item.votes.includes(user.id) : false;
    const hasOpposed = user ? (item.opposeVotes || []).includes(user.id) : false;
    const voteCount = item.votes.length;
    const opposeCount = (item.opposeVotes || []).length;
    const totalMembers = settings.totalMembers || 100;
    
    const votePercentage = (voteCount / totalMembers) * 100;
    const opposePercentage = (opposeCount / totalMembers) * 100;
    const canSubmit = votePercentage >= settings.voteThreshold && opposePercentage < settings.opposeThreshold;
    const isBlocked = opposePercentage >= settings.opposeThreshold;
    const expired = isExpired(item);

    return (
      <View style={[styles.opinionCard, expired && styles.expiredCard, isBlocked && styles.blockedCard]}>
        <View style={styles.opinionHeader}>
          <Text style={styles.opinionTitle}>{item.title}</Text>
          {item.status === 'resolved' && (
            <Text style={styles.resolvedBadge}>採用</Text>
          )}
          {item.status === 'submitted' && (
            <Text style={styles.submittedBadge}>審議中</Text>
          )}
          {item.status === 'rejected' && (
            <Text style={styles.rejectedBadge}>却下</Text>
          )}
          {expired && (
            <Text style={styles.expiredBadge}>期限切れ</Text>
          )}
        </View>
        
        <Text style={styles.opinionDescription}>{item.description}</Text>
        
        {/* 添付画像 */}
        {item.imageUrls && item.imageUrls.length > 0 && (
          <View style={styles.imageContainer}>
            {item.imageUrls.map((url, index) => (
              <Image key={index} source={{ uri: url }} style={styles.attachedImage} />
            ))}
          </View>
        )}
        
        <Text style={styles.authorText}>投稿者: {item.authorName}</Text>

        {item.status === 'pending' && !expired && (
          <>
            {/* 投票期限 */}
            <Text style={styles.deadlineText}>
              ⏰ {getTimeRemaining(item.votingDeadline)}
            </Text>
            
            {/* 賛成票プログレス */}
            <View style={styles.voteStatsContainer}>
              <View style={styles.voteStat}>
                <Text style={styles.voteLabel}>👍 賛成</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(votePercentage, 100)}%` },
                      canSubmit && styles.progressReached,
                    ]}
                  />
                </View>
                <Text style={styles.voteCountText}>
                  {voteCount}票 ({votePercentage.toFixed(1)}%)
                </Text>
              </View>
              
              <View style={styles.voteStat}>
                <Text style={styles.voteLabel}>👎 反対</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFillOppose,
                      { width: `${Math.min(opposePercentage, 100)}%` },
                      isBlocked && styles.progressBlocked,
                    ]}
                  />
                </View>
                <Text style={styles.voteCountText}>
                  {opposeCount}票 ({opposePercentage.toFixed(1)}%)
                </Text>
              </View>
            </View>

            {isBlocked && (
              <Text style={styles.blockedText}>⚠️ 反対票が10%を超えたため提出不可</Text>
            )}

            <View style={styles.voteButtonsRow}>
              <TouchableOpacity
                style={[styles.voteButton, hasVoted && styles.votedButton]}
                onPress={() => handleVote(item)}
                disabled={hasOpposed}
              >
                <Text style={[styles.voteButtonText, hasVoted && styles.votedButtonText]}>
                  {hasVoted ? '✓ 賛成済み' : '👍 賛成'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.opposeButton, hasOpposed && styles.opposedButton]}
                onPress={() => handleOppose(item)}
                disabled={hasVoted}
              >
                <Text style={[styles.opposeButtonText, hasOpposed && styles.opposedButtonText]}>
                  {hasOpposed ? '✓ 反対済み' : '👎 反対'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* 提出済み - 審議中・回答期限表示 */}
        {item.status === 'submitted' && (
          <View style={styles.submittedStatusContainer}>
            <Text style={styles.submittedStatusText}>📋 審議中</Text>
            {item.responseDeadline && (
              <Text style={styles.responseDueText}>
                回答まで{getTimeRemaining(item.responseDeadline)}
              </Text>
            )}
          </View>
        )}

        {(item.status === 'resolved' || item.status === 'rejected') && item.response && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseLabel}>返答:</Text>
            <Text style={styles.responseText}>{item.response}</Text>
          </View>
        )}
        
        {/* 票数サマリ（完了済み意見用） */}
        {(item.status === 'resolved' || item.status === 'rejected' || item.status === 'submitted') && (
          <Text style={styles.votesSummary}>
            賛成 {voteCount}票 / 反対 {opposeCount}票
          </Text>
        )}
        
        {/* 通報ボタン */}
        {user && item.authorId !== user.id && (
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => openReportModal(item)}
          >
            <Text style={styles.reportButtonText}>⚠️ 通報</Text>
          </TouchableOpacity>
        )}
        
        {/* 削除ボタン（自分の意見でpendingのみ） */}
        {user && item.authorId === user.id && item.status === 'pending' && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.deleteButtonText}>🗑️ 削除</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string; type: string } }) => (
    <View style={[
      styles.sectionHeader,
      section.type === 'resolved' && styles.sectionHeaderResolved,
      section.type === 'rejected' && styles.sectionHeaderRejected,
    ]}>
      <Text style={[
        styles.sectionHeaderText,
        section.type === 'resolved' && styles.sectionHeaderTextResolved,
        section.type === 'rejected' && styles.sectionHeaderTextRejected,
      ]}>
        {section.title}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>みんなの意見</Text>
        <Text style={styles.headerSubtitle}>
          {settings.voteThreshold}%以上の賛成で提出 / {settings.opposeThreshold}%以上の反対で却下
        </Text>
      </View>

      {/* ソート・フィルターコントロール */}
      <View style={styles.controlsContainer}>
        <View style={styles.sortContainer}>
          <Text style={styles.controlLabel}>並び替え:</Text>
          <View style={styles.sortButtons}>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'newest' && styles.sortButtonActive]}
              onPress={() => setSortBy('newest')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'newest' && styles.sortButtonTextActive]}>新着</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'votes' && styles.sortButtonActive]}
              onPress={() => setSortBy('votes')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'votes' && styles.sortButtonTextActive]}>票数</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'deadline' && styles.sortButtonActive]}
              onPress={() => setSortBy('deadline')}
            >
              <Text style={[styles.sortButtonText, sortBy === 'deadline' && styles.sortButtonTextActive]}>期限</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {opinions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>まだ意見がありません</Text>
          <Text style={styles.emptySubtext}>
            「投稿」タブから最初の意見を投稿しましょう
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item: Opinion) => item.id}
          renderItem={renderOpinion}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* 通報モーダル */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.reportModalOverlay}>
          <View style={styles.reportModalContent}>
            <Text style={styles.reportModalTitle}>通報理由を選択</Text>
            
            <TouchableOpacity
              style={styles.reportReasonButton}
              onPress={() => handleReport('spam')}
            >
              <Text style={styles.reportReasonText}>📧 スパム・宣伝</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.reportReasonButton}
              onPress={() => handleReport('harassment')}
            >
              <Text style={styles.reportReasonText}>😡 ハラスメント・攻撃的</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.reportReasonButton}
              onPress={() => handleReport('inappropriate')}
            >
              <Text style={styles.reportReasonText}>🚫 不適切なコンテンツ</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.reportReasonButton}
              onPress={() => handleReport('other')}
            >
              <Text style={styles.reportReasonText}>❓ その他</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.reportCancelButton}
              onPress={() => setReportModalVisible(false)}
            >
              <Text style={styles.reportCancelText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    borderBottomWidth: 0,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  sectionHeader: {
    backgroundColor: '#e8e8e8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionHeaderResolved: {
    backgroundColor: '#d4edda',
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  sectionHeaderTextResolved: {
    color: '#155724',
  },
  opinionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  opinionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  opinionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  resolvedBadge: {
    backgroundColor: '#34C759',
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  opinionDescription: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 8,
  },
  authorText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressReached: {
    backgroundColor: '#34C759',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  voteButton: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cce5ff',
  },
  votedButton: {
    backgroundColor: '#007AFF',
  },
  voteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  votedButtonText: {
    color: '#fff',
  },
  responseContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  responseLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  // 新しいスタイル
  controlsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 8,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  sortButtonActive: {
    backgroundColor: '#007AFF',
  },
  sortButtonText: {
    fontSize: 13,
    color: '#666',
  },
  sortButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  expiredCard: {
    opacity: 0.7,
    backgroundColor: '#f5f5f5',
  },
  blockedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff3b30',
  },
  rejectedBadge: {
    backgroundColor: '#ff3b30',
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  expiredBadge: {
    backgroundColor: '#888',
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  submittedBadge: {
    backgroundColor: '#ff9500',
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  submittedStatusContainer: {
    backgroundColor: '#fff8e6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9500',
  },
  submittedStatusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ff9500',
    marginBottom: 4,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  attachedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  deadlineText: {
    fontSize: 13,
    color: '#ff9500',
    fontWeight: '500',
    marginBottom: 8,
  },
  voteStatsContainer: {
    marginBottom: 12,
  },
  voteStat: {
    marginBottom: 8,
  },
  voteLabel: {
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
  },
  voteCountText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  progressFillOppose: {
    height: '100%',
    backgroundColor: '#ff9500',
    borderRadius: 4,
  },
  progressBlocked: {
    backgroundColor: '#ff3b30',
  },
  blockedText: {
    fontSize: 13,
    color: '#ff3b30',
    fontWeight: '600',
    marginBottom: 8,
  },
  voteButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  opposeButton: {
    flex: 1,
    backgroundColor: '#fff0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  opposedButton: {
    backgroundColor: '#ff3b30',
    borderColor: '#ff3b30',
  },
  opposeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ff3b30',
  },
  opposedButtonText: {
    color: '#fff',
  },
  responseDueText: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 8,
  },
  votesSummary: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  sectionHeaderRejected: {
    backgroundColor: '#f8d7da',
  },
  sectionHeaderTextRejected: {
    color: '#721c24',
  },
  // 通報関連スタイル
  reportButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  reportButtonText: {
    fontSize: 13,
    color: '#888',
  },
  deleteButton: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  deleteButtonText: {
    fontSize: 13,
    color: '#ff3b30',
  },
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
  },
  reportReasonButton: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 10,
  },
  reportReasonText: {
    fontSize: 15,
    color: '#333',
  },
  reportCancelButton: {
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  reportCancelText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
});
