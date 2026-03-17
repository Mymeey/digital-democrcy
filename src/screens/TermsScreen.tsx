import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function TermsScreen() {
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
        <Text style={styles.headerTitle}>利用規約</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.lastUpdated}>最終更新日: 2026年3月9日</Text>

        <Text style={styles.sectionTitle}>第1条（目的）</Text>
        <Text style={styles.paragraph}>
          本利用規約（以下「本規約」）は、デジタル民主主義アプリ（以下「本アプリ」）の利用条件を定めるものです。ユーザーの皆様には、本規約に従って本アプリをご利用いただきます。
        </Text>

        <Text style={styles.sectionTitle}>第2条（定義）</Text>
        <Text style={styles.paragraph}>
          1. 「本サービス」とは、本アプリを通じて提供される意見投稿、投票、および関連するすべての機能を指します。{'\n'}
          2. 「ユーザー」とは、本アプリを利用するすべての個人を指します。{'\n'}
          3. 「組織」とは、本アプリを導入している企業、団体、その他の組織を指します。
        </Text>

        <Text style={styles.sectionTitle}>第3条（アカウント登録）</Text>
        <Text style={styles.paragraph}>
          1. ユーザーは、AppleまたはGoogleアカウントを使用してサインインする必要があります。{'\n'}
          2. ユーザーは、本人確認のため、身分証明書および顔写真の提出が求められる場合があります。{'\n'}
          3. 提出された情報は、本人確認の目的にのみ使用されます。
        </Text>

        <Text style={styles.sectionTitle}>第4条（禁止事項）</Text>
        <Text style={styles.paragraph}>
          ユーザーは、以下の行為を行ってはなりません：{'\n\n'}
          1. 法令または公序良俗に違反する行為{'\n'}
          2. 他のユーザーに対する誹謗中傷、嫌がらせ{'\n'}
          3. 虚偽の情報の投稿{'\n'}
          4. 本サービスの運営を妨害する行為{'\n'}
          5. 他のユーザーになりすます行為{'\n'}
          6. 不正アクセスまたはその試み{'\n'}
          7. その他、運営者が不適切と判断する行為
        </Text>

        <Text style={styles.sectionTitle}>第5条（投稿内容）</Text>
        <Text style={styles.paragraph}>
          1. ユーザーが投稿した意見の著作権は、当該ユーザーに帰属します。{'\n'}
          2. ユーザーは、投稿した意見が組織内で共有されることに同意します。{'\n'}
          3. 運営者は、禁止事項に該当する投稿を削除する権利を有します。
        </Text>

        <Text style={styles.sectionTitle}>第6条（匿名性）</Text>
        <Text style={styles.paragraph}>
          1. 投稿された意見には投稿者名が表示されます。{'\n'}
          2. 投票は匿名で行われ、誰がどの意見に投票したかは他のユーザーには公開されません。{'\n'}
          3. 管理者は、不正行為の調査のために必要に応じてログを確認する場合があります。
        </Text>

        <Text style={styles.sectionTitle}>第7条（サービスの変更・停止）</Text>
        <Text style={styles.paragraph}>
          1. 運営者は、事前の通知なく本サービスの内容を変更または停止することがあります。{'\n'}
          2. サービスの変更・停止によりユーザーに生じた損害について、運営者は責任を負いません。
        </Text>

        <Text style={styles.sectionTitle}>第8条（免責事項）</Text>
        <Text style={styles.paragraph}>
          1. 運営者は、本サービスの完全性、正確性、有用性について保証しません。{'\n'}
          2. ユーザー間のトラブルについて、運営者は責任を負いません。{'\n'}
          3. 本サービスの利用により生じたいかなる損害についても、運営者は責任を負いません。
        </Text>

        <Text style={styles.sectionTitle}>第9条（規約の変更）</Text>
        <Text style={styles.paragraph}>
          運営者は、必要に応じて本規約を変更することができます。変更後の規約は、本アプリ内に掲示した時点で効力を生じるものとします。
        </Text>

        <Text style={styles.sectionTitle}>第10条（準拠法・管轄裁判所）</Text>
        <Text style={styles.paragraph}>
          本規約の解釈には日本法が適用され、本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
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
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
});
