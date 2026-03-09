import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// 通知のデフォルト動作設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 通知権限の取得
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('通知権限が許可されていません');
    return false;
  }

  // Android用のチャンネル設定
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });
  }

  return true;
}

// プッシュトークンの取得（本番環境用）
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.log('EAS Project ID not configured');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return token.data;
  } catch (error) {
    console.error('プッシュトークンの取得に失敗:', error);
    return null;
  }
}

// ローカル通知を送信
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // 即時送信
  });
}

// 意見投稿時の通知
export async function notifyOpinionPosted(opinionTitle: string): Promise<void> {
  await sendLocalNotification(
    '📝 新しい意見が投稿されました',
    opinionTitle,
    { type: 'opinion_posted' }
  );
}

// 票が一定数集まった時の通知
export async function notifyThresholdReached(
  opinionTitle: string,
  voteCount: number
): Promise<void> {
  await sendLocalNotification(
    '🎉 投票目標達成！',
    `「${opinionTitle}」が${voteCount}票を獲得し、提出可能になりました`,
    { type: 'threshold_reached' }
  );
}

// 意見が提出された時の通知
export async function notifyOpinionSubmitted(opinionTitle: string): Promise<void> {
  await sendLocalNotification(
    '📬 意見が提出されました',
    `「${opinionTitle}」がリーダーに提出されました`,
    { type: 'opinion_submitted' }
  );
}

// 意見が採用された時の通知
export async function notifyOpinionResolved(
  opinionTitle: string,
  response?: string
): Promise<void> {
  await sendLocalNotification(
    '✅ 意見が採用されました',
    response 
      ? `「${opinionTitle}」\n返答: ${response}` 
      : `「${opinionTitle}」が採用されました`,
    { type: 'opinion_resolved' }
  );
}

// 本人確認が承認された時の通知
export async function notifyVerificationApproved(): Promise<void> {
  await sendLocalNotification(
    '🎊 本人確認が完了しました',
    '意見の投稿が可能になりました',
    { type: 'verification_approved' }
  );
}

// 本人確認が却下された時の通知
export async function notifyVerificationRejected(reason?: string): Promise<void> {
  await sendLocalNotification(
    '❌ 本人確認が却下されました',
    reason || '再度お試しください',
    { type: 'verification_rejected' }
  );
}

// 通知リスナーの設定
export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
): () => void {
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    onNotificationReceived
  );
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    onNotificationResponse
  );

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
