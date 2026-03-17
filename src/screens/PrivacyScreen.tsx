import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function PrivacyScreen() {
  const navigation = useNavigation<any>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    const routeNames: string[] = navigation.getState?.()?.routeNames || [];
    if (routeNames.includes('Main')) {
      navigation.navigate('Main');
      return;
    }
    if (routeNames.includes('OrganizationSetup')) {
      navigation.navigate('OrganizationSetup');
      return;
    }
    if (routeNames.includes('Login')) {
      navigation.navigate('Login');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プライバシーポリシー</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.lastUpdated}>最終更新日: 2026年3月9日</Text>

        <Text style={styles.intro}>
          デジタル民主主義アプリ（以下「本アプリ」）は、ユーザーの皆様のプライバシーを尊重し、個人情報の保護に努めています。本プライバシーポリシーでは、収集する情報の種類、利用目的、および保護方法について説明します。
        </Text>

        <Text style={styles.sectionTitle}>1. 収集する情報</Text>
        <Text style={styles.paragraph}>
          本アプリでは、以下の情報を収集します：{'\n\n'}
          <Text style={styles.bold}>（1）アカウント情報</Text>{'\n'}
          ・氏名{'\n'}
          ・メールアドレス{'\n'}
          ・認証プロバイダー情報（Apple/Google）{'\n\n'}
          <Text style={styles.bold}>（2）本人確認情報</Text>{'\n'}
          ・身分証明書の画像{'\n'}
          ・顔写真{'\n\n'}
          <Text style={styles.bold}>（3）利用情報</Text>{'\n'}
          ・投稿した意見{'\n'}
          ・投票履歴{'\n'}
          ・アプリの利用状況
        </Text>

        <Text style={styles.sectionTitle}>2. 情報の利用目的</Text>
        <Text style={styles.paragraph}>
          収集した情報は、以下の目的で利用します：{'\n\n'}
          ・本人確認の実施{'\n'}
          ・サービスの提供および改善{'\n'}
          ・不正利用の防止{'\n'}
          ・ユーザーサポートの提供{'\n'}
          ・サービスに関する通知の送信
        </Text>

        <Text style={styles.sectionTitle}>3. 情報の保管</Text>
        <Text style={styles.paragraph}>
          ・個人情報はFirebaseのセキュアなサーバーに暗号化して保管されます{'\n'}
          ・本人確認用の画像は、確認完了後も記録として保管されます{'\n'}
          ・アカウント削除時には、関連するすべてのデータが削除されます
        </Text>

        <Text style={styles.sectionTitle}>4. 情報の共有</Text>
        <Text style={styles.paragraph}>
          ユーザーの個人情報は、以下の場合を除き、第三者に提供することはありません：{'\n\n'}
          ・ユーザーの同意がある場合{'\n'}
          ・法令に基づく場合{'\n'}
          ・人の生命、身体または財産の保護のために必要な場合{'\n'}
          ・サービス提供に必要な業務委託先への提供
        </Text>

        <Text style={styles.sectionTitle}>5. 組織内での情報共有</Text>
        <Text style={styles.paragraph}>
          ・投稿された意見は、投稿者名とともに組織内で共有されます{'\n'}
          ・投票は匿名で行われ、他のユーザーには公開されません{'\n'}
          ・管理者は、本人確認のために提出された情報を閲覧できます
        </Text>

        <Text style={styles.sectionTitle}>6. セキュリティ</Text>
        <Text style={styles.paragraph}>
          ・通信はすべてSSL/TLSで暗号化されています{'\n'}
          ・パスワードはハッシュ化して保存されます{'\n'}
          ・定期的なセキュリティ監査を実施しています
        </Text>

        <Text style={styles.sectionTitle}>7. Cookieおよびトラッキング</Text>
        <Text style={styles.paragraph}>
          本アプリでは、サービス改善のためにアプリの利用状況を収集することがあります。これらのデータは統計的に処理され、個人を特定することはできません。
        </Text>

        <Text style={styles.sectionTitle}>8. ユーザーの権利</Text>
        <Text style={styles.paragraph}>
          ユーザーは以下の権利を有します：{'\n\n'}
          ・自己の個人情報へのアクセス{'\n'}
          ・個人情報の訂正または削除の要求{'\n'}
          ・アカウントの削除{'\n'}
          ・データの持ち運び（エクスポート）
        </Text>

        <Text style={styles.sectionTitle}>9. 子どもの個人情報</Text>
        <Text style={styles.paragraph}>
          本アプリは、16歳未満の方を対象としていません。16歳未満の方の個人情報を意図的に収集することはありません。
        </Text>

        <Text style={styles.sectionTitle}>10. ポリシーの変更</Text>
        <Text style={styles.paragraph}>
          本プライバシーポリシーは、必要に応じて変更されることがあります。重要な変更がある場合は、アプリ内でお知らせします。
        </Text>

        <Text style={styles.sectionTitle}>11. お問い合わせ</Text>
        <Text style={styles.paragraph}>
          プライバシーに関するご質問やご要望は、アプリ内のお問い合わせ機能またはサポートメールアドレスまでご連絡ください。
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>以上</Text>
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#888',
    marginBottom: 20,
  },
  intro: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
});
