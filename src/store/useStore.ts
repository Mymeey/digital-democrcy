import { create } from 'zustand';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, isExpoGo } from '../config/firebase';
import { User, Opinion, Organization, OrganizationSettings, VerificationRequest, Report } from '../types';
import {
  notifyOpinionPosted,
  notifyThresholdReached,
  notifyOpinionSubmitted,
  notifyOpinionResolved,
  notifyVerificationApproved,
  notifyVerificationRejected,
} from '../services/notificationService';

// 運営者のユーザーID（あなたのFirebase UID）
// 本番環境では実際のUIDに変更してください
export const OPERATOR_USER_ID = 'mock_user_001';

// ID生成関数
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
};

// 組織コード生成関数（8文字の英数字）
const generateOrgCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

interface AppStore {
  // 状態
  user: User | null;
  opinions: Opinion[];
  organizations: Organization[];
  currentOrganization: Organization | null;
  settings: OrganizationSettings;
  verificationRequests: VerificationRequest[];
  organizationMembers: User[];    // 組織メンバー一覧
  isLoading: boolean;

  // ユーザー関連
  setUser: (user: User | null) => void;
  updateUserStatus: (userId: string, status: 'approved' | 'rejected', reason?: string) => Promise<void>;
  
  // 組織関連
  createOrganization: (name: string) => Promise<Organization>;
  joinOrganization: (code: string) => Promise<boolean>;
  loadOrganizations: () => Promise<void>;
  setCurrentOrganization: (org: Organization | null) => void;
  loadOrganizationMembers: () => Promise<void>;  // メンバー一覧読み込み
  
  // 認証申請関連
  submitVerification: (idCardUri: string, selfieUri: string, realName: string) => Promise<void>;
  loadVerificationRequests: () => Promise<void>;
  
  // 意見関連
  loadOpinions: () => Promise<void>;
  addOpinion: (title: string, description: string, imageUris?: string[]) => Promise<void>;
  voteOpinion: (opinionId: string) => Promise<void>;
  opposeOpinion: (opinionId: string) => Promise<void>;
  unvoteOpinion: (opinionId: string) => Promise<void>;
  submitOpinion: (opinionId: string) => Promise<void>;
  resolveOpinion: (opinionId: string, response?: string) => Promise<void>;
  rejectOpinion: (opinionId: string, reason?: string) => Promise<void>;
  reportOpinion: (opinionId: string, reason: 'spam' | 'harassment' | 'inappropriate' | 'other', description?: string) => Promise<void>;
  deleteOpinion: (opinionId: string) => Promise<boolean>;
  canUserPost: () => boolean;
  
  // 設定関連
  loadSettings: () => Promise<void>;
  setVoteThreshold: (threshold: number) => Promise<void>;
  
  // 画像アップロード
  uploadImage: (uri: string, path: string) => Promise<string>;
  
  // ヘルパー
  isOperator: () => boolean;
  isOrgAdmin: () => boolean;
}

// 1週間のミリ秒
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// 2週間のミリ秒
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

// デフォルト設定（後方互換性のため）
const defaultSettings: OrganizationSettings = {
  id: 'default',
  name: '組織名',
  code: 'DEFAULT1',
  voteThreshold: 15,           // 15%で提出可能
  opposeThreshold: 10,         // 10%反対でブロック
  adminUserId: '',
  totalMembers: 100,           // デフォルトメンバー数
  createdAt: Date.now(),
};

export const useStore = create<AppStore>((set, get) => ({
  user: null,
  opinions: [],
  organizations: [],
  currentOrganization: null,
  settings: defaultSettings,
  verificationRequests: [],
  organizationMembers: [],
  isLoading: false,

  setUser: (user) => set({ user }),
  
  // 運営者かどうかチェック
  isOperator: () => {
    const { user } = get();
    return user?.id === OPERATOR_USER_ID || user?.role === 'operator';
  },
  
  // 組織管理者かどうかチェック
  isOrgAdmin: () => {
    const { user, currentOrganization } = get();
    if (!user || !currentOrganization) return false;
    return user.id === currentOrganization.adminUserId || user.role === 'org_admin';
  },

  // 画像アップロード
  uploadImage: async (uri: string, path: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  },
  
  // 組織を作成（組織管理者として）
  createOrganization: async (name: string): Promise<Organization> => {
    const { user, organizations } = get();
    if (!user) throw new Error('ログインが必要です');

    const newOrg: Organization = {
      id: generateId(),
      name,
      code: generateOrgCode(),
      voteThreshold: 15,
      opposeThreshold: 10,
      adminUserId: user.id,
      totalMembers: 1,
      createdAt: Date.now(),
    };

    // ユーザーを組織管理者として更新
    const updatedUser: User = {
      ...user,
      role: 'org_admin',
      organizationId: newOrg.id,
      status: 'approved',  // 組織作成者は自動承認
    };

    // Expo Goモードではローカルのみ保存
    if (!isExpoGo) {
      try {
        await setDoc(doc(db, 'organizations', newOrg.id), newOrg);
        await setDoc(doc(db, 'users', user.id), updatedUser);
      } catch (error) {
        console.error('Failed to create organization:', error);
      }
    }

    set({
      user: updatedUser,
      organizations: [...organizations, newOrg],
      currentOrganization: newOrg,
      settings: newOrg,
    });

    return newOrg;
  },

  // 組織コードで参加申請
  joinOrganization: async (code: string): Promise<boolean> => {
    const { user, organizations } = get();
    if (!user) return false;

    // 組織を検索
    let targetOrg: Organization | undefined;
    
    if (isExpoGo) {
      // Expo Goモードではローカルから検索
      targetOrg = organizations.find((o) => o.code.toUpperCase() === code.toUpperCase());
    } else {
      // Firestoreから検索
      try {
        const q = query(collection(db, 'organizations'), where('code', '==', code.toUpperCase()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          targetOrg = snapshot.docs[0].data() as Organization;
        }
      } catch (error) {
        console.error('Failed to find organization:', error);
      }
    }

    if (!targetOrg) return false;

    // ユーザーを更新（参加申請中）
    const updatedUser: User = {
      ...user,
      role: 'member',
      pendingOrganizationId: targetOrg.id,
      status: 'pending',
    };

    if (!isExpoGo) {
      try {
        await setDoc(doc(db, 'users', user.id), updatedUser);
      } catch (error) {
        console.error('Failed to update user:', error);
      }
    }

    set({
      user: updatedUser,
      currentOrganization: targetOrg,
      settings: targetOrg,
    });

    return true;
  },

  // 組織一覧を読み込み
  loadOrganizations: async () => {
    if (isExpoGo) {
      // Expo Goモードではサンプル組織を追加
      const sampleOrg: Organization = {
        id: 'sample_org_001',
        name: 'サンプル株式会社',
        code: 'SAMPLE01',
        voteThreshold: 15,
        opposeThreshold: 10,
        adminUserId: 'mock_user_001',
        totalMembers: 100,
        createdAt: Date.now(),
      };
      set({ organizations: [sampleOrg] });
      return;
    }

    try {
      const snapshot = await getDocs(collection(db, 'organizations'));
      const orgs: Organization[] = [];
      snapshot.forEach((doc) => {
        orgs.push(doc.data() as Organization);
      });
      set({ organizations: orgs });
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  },

  // 組織メンバー一覧を読み込み
  loadOrganizationMembers: async () => {
    const { currentOrganization, user } = get();
    
    if (isExpoGo) {
      // Expo Goモードではサンプルメンバーを追加
      const sampleMembers: User[] = [
        {
          id: 'mock_user_001',
          email: 'admin@example.com',
          name: 'admin_yamada',
          realName: '山田 太郎',
          authProvider: 'apple',
          role: 'org_admin',
          status: 'approved',
          organizationId: 'sample_org_001',
          createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
          approvedAt: Date.now() - 29 * 24 * 60 * 60 * 1000,
        },
        {
          id: 'member_001',
          email: 'tanaka@example.com',
          name: 'hanako_t',
          realName: '田中 花子',
          authProvider: 'google',
          role: 'member',
          status: 'approved',
          organizationId: 'sample_org_001',
          createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
          approvedAt: Date.now() - 19 * 24 * 60 * 60 * 1000,
        },
        {
          id: 'member_002',
          email: 'suzuki@example.com',
          name: 'ichiro_s',
          realName: '鈴木 一郎',
          authProvider: 'apple',
          role: 'member',
          status: 'approved',
          organizationId: 'sample_org_001',
          createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
          approvedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
        },
        {
          id: 'member_003',
          email: 'sato@example.com',
          name: 'misaki_sato',
          realName: '佐藤 美咲',
          authProvider: 'google',
          role: 'member',
          status: 'approved',
          organizationId: 'sample_org_001',
          createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
          approvedAt: Date.now() - 9 * 24 * 60 * 60 * 1000,
        },
        {
          id: 'member_004',
          email: 'takahashi@example.com',
          name: 'kenji_t',
          realName: '高橋 健二',
          authProvider: 'apple',
          role: 'member',
          status: 'approved',
          organizationId: 'sample_org_001',
          createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
          approvedAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
        },
        {
          id: 'member_005',
          email: 'pending@example.com',
          name: 'akane_i',
          realName: '伊藤 あかね',
          authProvider: 'google',
          role: 'member',
          status: 'pending',
          pendingOrganizationId: 'sample_org_001',
          createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
        },
      ];
      set({ organizationMembers: sampleMembers });
      return;
    }

    if (!currentOrganization) {
      set({ organizationMembers: [] });
      return;
    }

    try {
      const q = query(
        collection(db, 'users'),
        where('organizationId', '==', currentOrganization.id)
      );
      const snapshot = await getDocs(q);
      const members: User[] = [];
      snapshot.forEach((doc) => {
        members.push(doc.data() as User);
      });
      set({ organizationMembers: members });
    } catch (error) {
      console.error('Failed to load organization members:', error);
    }
  },

  // 現在の組織を設定
  setCurrentOrganization: (org: Organization | null) => {
    set({
      currentOrganization: org,
      settings: org || defaultSettings,
    });
  },

  // 認証申請を提出
  submitVerification: async (idCardUri: string, selfieUri: string, realName: string) => {
    const { user, uploadImage, currentOrganization } = get();
    if (!user) return;

    set({ isLoading: true });
    try {
      // Expo Goモードでは画像をローカルURIのまま保存
      let idCardUrl = idCardUri;
      let selfieUrl = selfieUri;
      
      if (!isExpoGo) {
        // 画像をアップロード
        idCardUrl = await uploadImage(
          idCardUri, 
          `verifications/${user.id}/id_card_${Date.now()}.jpg`
        );
        selfieUrl = await uploadImage(
          selfieUri, 
          `verifications/${user.id}/selfie_${Date.now()}.jpg`
        );
      }

      // ユーザー情報を更新
      const updatedUser: User = {
        ...user,
        realName: realName,
        idCardImageUrl: idCardUrl,
        selfieImageUrl: selfieUrl,
        submittedAt: Date.now(),
        status: 'pending',
      };

      if (!isExpoGo) {
        await setDoc(doc(db, 'users', user.id), updatedUser);
      }
      
      // 認証申請を保存
      const request: VerificationRequest = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        organizationId: currentOrganization?.id || user.pendingOrganizationId || '',
        organizationName: currentOrganization?.name || '',
        idCardImageUrl: idCardUrl,
        selfieImageUrl: selfieUrl,
        submittedAt: Date.now(),
        status: 'pending',
      };
      
      if (!isExpoGo) {
        await setDoc(doc(db, 'verificationRequests', user.id), request);
      }
      
      set({ 
        user: updatedUser,
        verificationRequests: [...get().verificationRequests, request],
      });
    } finally {
      set({ isLoading: false });
    }
  },

  // 認証申請一覧を読み込み（運営者用）
  loadVerificationRequests: async () => {
    if (isExpoGo) {
      // Expo GoモードではローカルのverificationRequestsを使用
      console.log('Expo Go mode - using local verification requests');
      return;
    }
    
    const q = query(
      collection(db, 'verificationRequests'),
      where('status', '==', 'pending'),
      orderBy('submittedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const requests: VerificationRequest[] = [];
    snapshot.forEach((doc) => {
      requests.push(doc.data() as VerificationRequest);
    });
    
    set({ verificationRequests: requests });
  },

  // ユーザーの承認状態を更新（運営者用）
  updateUserStatus: async (userId: string, status: 'approved' | 'rejected', reason?: string) => {
    const { verificationRequests, organizations } = get();
    const request = verificationRequests.find((r) => r.userId === userId);
    
    // 承認時は組織IDをユーザーに設定
    const updateData: Partial<User> = {
      status,
      ...(status === 'approved' ? { 
        approvedAt: Date.now(),
        organizationId: request?.organizationId,
        pendingOrganizationId: undefined,
      } : {}),
      ...(status === 'rejected' ? { 
        rejectedAt: Date.now(), 
        rejectionReason: reason,
        pendingOrganizationId: undefined,
      } : {}),
    };
    
    if (!isExpoGo) {
      const userRef = doc(db, 'users', userId);
      const requestRef = doc(db, 'verificationRequests', userId);
      
      await updateDoc(userRef, updateData);
      await updateDoc(requestRef, { status });
      
      // 承認時は組織のメンバー数を増やす
      if (status === 'approved' && request?.organizationId) {
        const org = organizations.find((o) => o.id === request.organizationId);
        if (org) {
          await updateDoc(doc(db, 'organizations', org.id), {
            totalMembers: org.totalMembers + 1,
          });
        }
      }
    }
    
    // ローカルの申請一覧を更新
    set({
      verificationRequests: verificationRequests.filter((r) => r.userId !== userId),
    });

    // 本人確認結果の通知
    if (status === 'approved') {
      notifyVerificationApproved().catch(console.error);
    } else {
      notifyVerificationRejected(reason).catch(console.error);
    }
  },

  // 意見を読み込み
  loadOpinions: async () => {
    // Expo Goモードではローカルデータを使用
    if (isExpoGo) {
      console.log('Expo Go mode - using local opinions');
      return;
    }
    try {
      const q = query(collection(db, 'opinions'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const opinions: Opinion[] = [];
      snapshot.forEach((doc) => {
        opinions.push(doc.data() as Opinion);
      });
      set({ opinions });
    } catch (error) {
      console.error('Failed to load opinions:', error);
    }
  },

  // 今月投稿可能かチェック
  canUserPost: () => {
    const { user } = get();
    if (!user) return false;
    return user.status === 'approved';
  },

  // 意見を追加
  addOpinion: async (title: string, description: string, imageUris?: string[]): Promise<void> => {
    const { user, opinions, uploadImage } = get();
    if (!user || user.status !== 'approved') return;

    const now = Date.now();
    
    // 画像をアップロード（Expo GoモードではローカルURIをそのまま使用）
    let imageUrls: string[] = [];
    if (imageUris && imageUris.length > 0) {
      if (isExpoGo) {
        // Expo GoモードではローカルURIをそのまま使用
        imageUrls = [...imageUris];
      } else {
        try {
          for (const uri of imageUris) {
            const url = await uploadImage(uri, `opinions/${generateId()}_${Date.now()}.jpg`);
            imageUrls.push(url);
          }
        } catch (error) {
          console.error('Failed to upload images:', error);
          // アップロード失敗時もローカルURIを使用
          imageUrls = [...imageUris];
        }
      }
    }

    const newOpinion: Opinion = {
      id: generateId(),
      title,
      description,
      authorId: user.id,
      authorName: user.name,
      votes: [],
      opposeVotes: [],
      status: 'pending',
      createdAt: now,
      votingDeadline: now + ONE_WEEK_MS,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    };

    // Expo Goモードではローカルのみ保存
    if (!isExpoGo) {
      try {
        await setDoc(doc(db, 'opinions', newOpinion.id), newOpinion);
      } catch (error) {
        console.error('Failed to save opinion to Firestore:', error);
      }
    }
    
    set({ 
      opinions: [newOpinion, ...opinions],
    });

    // 投稿完了通知
    notifyOpinionPosted(title).catch(console.error);
  },

  // 賛成投票
  voteOpinion: async (opinionId: string) => {
    const { user, opinions, settings } = get();
    if (!user || user.status !== 'approved') return;

    const opinion = opinions.find((o) => o.id === opinionId);
    if (!opinion) return;
    
    // 期限切れチェック
    if (Date.now() > opinion.votingDeadline) return;
    
    // 既に投票済みまたは反対済みの場合はスキップ
    if (opinion.votes.includes(user.id) || (opinion.opposeVotes || []).includes(user.id)) return;

    const updatedVotes = [...opinion.votes, user.id];
    
    // Expo Goモードではローカルのみ更新
    if (!isExpoGo) {
      try {
        await updateDoc(doc(db, 'opinions', opinionId), { votes: updatedVotes });
      } catch (error) {
        console.error('Failed to update votes in Firestore:', error);
      }
    }

    set({
      opinions: opinions.map((o) =>
        o.id === opinionId ? { ...o, votes: updatedVotes } : o
      ),
    });

    // 賛成率が閾値に達した時に通知
    const votePercentage = (updatedVotes.length / settings.totalMembers) * 100;
    if (votePercentage >= settings.voteThreshold) {
      notifyThresholdReached(opinion.title, updatedVotes.length).catch(console.error);
    }
  },

  // 反対投票
  opposeOpinion: async (opinionId: string) => {
    const { user, opinions, settings } = get();
    if (!user || user.status !== 'approved') return;

    const opinion = opinions.find((o) => o.id === opinionId);
    if (!opinion) return;
    
    // 期限切れチェック
    if (Date.now() > opinion.votingDeadline) return;
    
    // 既に投票済みまたは反対済みの場合はスキップ
    if (opinion.votes.includes(user.id) || (opinion.opposeVotes || []).includes(user.id)) return;

    const updatedOpposeVotes = [...(opinion.opposeVotes || []), user.id];
    const opposePercentage = (updatedOpposeVotes.length / settings.totalMembers) * 100;
    
    // 反対率が10%を超えたら自動的にrejected
    const newStatus = opposePercentage >= settings.opposeThreshold ? 'rejected' : opinion.status;
    
    // Expo Goモードではローカルのみ更新
    if (!isExpoGo) {
      try {
        await updateDoc(doc(db, 'opinions', opinionId), { 
          opposeVotes: updatedOpposeVotes,
          status: newStatus,
        });
      } catch (error) {
        console.error('Failed to update oppose votes in Firestore:', error);
      }
    }

    set({
      opinions: opinions.map((o) =>
        o.id === opinionId ? { ...o, opposeVotes: updatedOpposeVotes, status: newStatus } : o
      ),
    });
  },

  // 投票取り消し
  unvoteOpinion: async (opinionId: string) => {
    const { user, opinions } = get();
    if (!user) return;

    const opinion = opinions.find((o) => o.id === opinionId);
    if (!opinion) return;
    
    // 期限切れチェック
    if (Date.now() > opinion.votingDeadline) return;

    const updatedVotes = opinion.votes.filter((id) => id !== user.id);
    const updatedOpposeVotes = (opinion.opposeVotes || []).filter((id) => id !== user.id);
    
    // Expo Goモードではローカルのみ更新
    if (!isExpoGo) {
      try {
        await updateDoc(doc(db, 'opinions', opinionId), { 
          votes: updatedVotes,
          opposeVotes: updatedOpposeVotes,
        });
      } catch (error) {
        console.error('Failed to update votes in Firestore:', error);
      }
    }

    set({
      opinions: opinions.map((o) =>
        o.id === opinionId ? { ...o, votes: updatedVotes, opposeVotes: updatedOpposeVotes } : o
      ),
    });
  },

  // 意見を提出
  submitOpinion: async (opinionId: string) => {
    const { opinions, settings } = get();
    const opinion = opinions.find((o) => o.id === opinionId);
    
    if (!opinion) return;
    
    // 15%以上の賛成票が必要
    const votePercentage = (opinion.votes.length / settings.totalMembers) * 100;
    if (votePercentage < settings.voteThreshold) return;
    
    // 10%以上の反対票があれば提出不可
    const opposePercentage = ((opinion.opposeVotes || []).length / settings.totalMembers) * 100;
    if (opposePercentage >= settings.opposeThreshold) return;

    const now = Date.now();
    
    // Expo Goモードではローカルのみ更新
    if (!isExpoGo) {
      try {
        await updateDoc(doc(db, 'opinions', opinionId), {
          status: 'submitted',
          submittedAt: now,
          responseDeadline: now + TWO_WEEKS_MS,
        });
      } catch (error) {
        console.error('Failed to submit opinion to Firestore:', error);
      }
    }

    set({
      opinions: opinions.map((o) =>
        o.id === opinionId
          ? { ...o, status: 'submitted', submittedAt: now, responseDeadline: now + TWO_WEEKS_MS }
          : o
      ),
    });

    // 提出完了通知
    notifyOpinionSubmitted(opinion.title).catch(console.error);
  },

  // 意見を解決（承認）
  resolveOpinion: async (opinionId: string, response?: string) => {
    const { opinions } = get();
    const opinion = opinions.find((o) => o.id === opinionId);

    // Expo Goモードではローカルのみ更新
    if (!isExpoGo) {
      try {
        await updateDoc(doc(db, 'opinions', opinionId), {
          status: 'resolved',
          resolvedAt: Date.now(),
          response: response || '',
        });
      } catch (error) {
        console.error('Failed to resolve opinion in Firestore:', error);
      }
    }

    set({
      opinions: opinions.map((o) =>
        o.id === opinionId
          ? { ...o, status: 'resolved', resolvedAt: Date.now(), response }
          : o
      ),
    });

    // 採用完了通知
    if (opinion) {
      notifyOpinionResolved(opinion.title, response).catch(console.error);
    }
  },

  // 意見を却下
  rejectOpinion: async (opinionId: string, reason?: string) => {
    const { opinions } = get();

    // Expo Goモードではローカルのみ更新
    if (!isExpoGo) {
      try {
        await updateDoc(doc(db, 'opinions', opinionId), {
          status: 'rejected',
          resolvedAt: Date.now(),
          response: reason || '却下されました',
        });
      } catch (error) {
        console.error('Failed to reject opinion in Firestore:', error);
      }
    }

    set({
      opinions: opinions.map((o) =>
        o.id === opinionId
          ? { ...o, status: 'rejected', resolvedAt: Date.now(), response: reason || '却下されました' }
          : o
      ),
    });
  },

  // 意見を通報
  reportOpinion: async (opinionId: string, reason: 'spam' | 'harassment' | 'inappropriate' | 'other', description?: string) => {
    const { user, opinions } = get();
    if (!user) return;

    const opinion = opinions.find((o) => o.id === opinionId);
    if (!opinion) return;

    // 既に通報済みかチェック
    const existingReports = opinion.reports || [];
    if (existingReports.some((r) => r.reporterId === user.id)) return;

    const newReport: Report = {
      id: generateId(),
      opinionId,
      reporterId: user.id,
      reason,
      description,
      createdAt: Date.now(),
    };

    const updatedReports = [...existingReports, newReport];

    // Expo Goモードではローカルのみ更新
    if (!isExpoGo) {
      try {
        await updateDoc(doc(db, 'opinions', opinionId), {
          reports: updatedReports,
        });
      } catch (error) {
        console.error('Failed to report opinion in Firestore:', error);
      }
    }

    set({
      opinions: opinions.map((o) =>
        o.id === opinionId
          ? { ...o, reports: updatedReports }
          : o
      ),
    });
  },

  // 意見を削除（投稿者のみ、pending状態のみ）
  deleteOpinion: async (opinionId: string): Promise<boolean> => {
    const { user, opinions } = get();
    if (!user) return false;

    const opinion = opinions.find((o) => o.id === opinionId);
    if (!opinion) return false;

    // 自分の意見かチェック
    if (opinion.authorId !== user.id) return false;

    // pending状態のみ削除可能
    if (opinion.status !== 'pending') return false;

    // Expo Goモードではローカルのみ削除
    if (!isExpoGo) {
      try {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'opinions', opinionId));
      } catch (error) {
        console.error('Failed to delete opinion in Firestore:', error);
      }
    }

    set({
      opinions: opinions.filter((o) => o.id !== opinionId),
    });
    return true;
  },

  // 設定を読み込み
  loadSettings: async () => {
    // Expo Goモードではデフォルト設定を使用
    if (isExpoGo) {
      console.log('Expo Go mode - using default settings');
      return;
    }
    
    try {
      const docRef = doc(db, 'settings', 'default');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        set({ settings: docSnap.data() as OrganizationSettings });
      } else {
        // デフォルト設定を作成
        await setDoc(docRef, defaultSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  // 投票閾値を設定
  setVoteThreshold: async (threshold: number) => {
    const { settings } = get();
    const updatedSettings = { ...settings, voteThreshold: threshold };
    
    // Expo Goモードではローカルのみ更新
    if (!isExpoGo) {
      try {
        await setDoc(doc(db, 'settings', 'default'), updatedSettings);
      } catch (error) {
        console.error('Failed to save settings to Firestore:', error);
      }
    }
    set({ settings: updatedSettings });
  },
}));
