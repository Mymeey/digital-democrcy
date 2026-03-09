// ユーザーの承認状態
export type UserStatus = 'pending' | 'approved' | 'rejected';

// ユーザーの役割
export type UserRole = 'operator' | 'org_admin' | 'member';
// operator: アプリ運営者（あなた）- 本人確認審査を行う
// org_admin: 組織管理者 - 意見への返答を行う
// member: 一般メンバー - 投稿・投票を行う

// ユーザー情報
export interface User {
  id: string;
  email: string;
  name: string;
  realName?: string;               // 本名（本人確認時に入力）
  authProvider: 'apple' | 'google';
  role: UserRole;                // ユーザーの役割
  status: UserStatus;
  idCardImageUrl?: string;       // 身分証明書の画像URL
  selfieImageUrl?: string;       // 顔写真のURL
  submittedAt?: number;          // 承認申請日時
  approvedAt?: number;           // 承認日時
  rejectedAt?: number;           // 却下日時
  rejectionReason?: string;      // 却下理由
  organizationId?: string;       // 所属団体ID
  pendingOrganizationId?: string; // 参加申請中の団体ID
  createdAt: number;
  monthlyPostCount?: number;     // 今月の投稿数
  lastPostMonth?: string;        // 最後に投稿した月 (YYYY-MM形式)
}

// 意見
export interface Opinion {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  votes: string[];               // 賛成投票したユーザーIDの配列
  opposeVotes: string[];         // 反対投票したユーザーIDの配列
  status: 'pending' | 'submitted' | 'resolved' | 'rejected' | 'expired';
  createdAt: number;
  votingDeadline: number;        // 投票期限（1週間）
  responseDeadline?: number;     // 回答期限（提出から2週間）
  submittedAt?: number;
  resolvedAt?: number;
  response?: string;             // トップからの返答
  imageUrls?: string[];          // 添付画像URLs
  fileUrls?: string[];           // 添付ファイルURLs
  reports?: Report[];            // 通報一覧
}

// 通報
export interface Report {
  id: string;
  opinionId: string;
  reporterId: string;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'other';
  description?: string;
  createdAt: number;
}

// 組織情報
export interface Organization {
  id: string;
  name: string;
  code: string;                  // 参加用コード（8文字）
  voteThreshold: number;         // 意見提出に必要な投票率（%）デフォルト15
  opposeThreshold: number;       // 反対票でブロックされる率（%）デフォルト10
  adminUserId: string;           // 組織管理者のユーザーID
  totalMembers: number;          // 組織の総メンバー数
  createdAt: number;
}

// 後方互換性のためのエイリアス
export type OrganizationSettings = Organization;

// 承認申請
export interface VerificationRequest {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;        // 申請先の組織ID
  organizationName: string;      // 申請先の組織名
  idCardImageUrl: string;
  selfieImageUrl: string;
  submittedAt: number;
  status: 'pending' | 'approved' | 'rejected';
}

// アプリ状態
export interface AppState {
  user: User | null;
  opinions: Opinion[];
  organizations: Organization[];
  currentOrganization: Organization | null;
  settings: OrganizationSettings;  // 後方互換性のため残す
  verificationRequests: VerificationRequest[];
  isLoading: boolean;
  isAuthenticated: boolean;
}
