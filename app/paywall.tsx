import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '@/features/billing/legal-links';
import { usePaywall } from '@/features/billing/use-paywall';

import { useToast } from '@/components/ToastProvider';

import { useIsPro } from '@/store/use-app-store';

/**
 * Pro で解放される機能（要件定義 §5.2）。
 *
 * **実装済みの機能だけを載せること。** 未実装の機能を並べると、
 * 購入しても使えない機能を宣伝することになる。
 * 追加予定の機能は要件定義 §5.2「将来のアップデート予定」を参照。
 */
const PRO_FEATURES: readonly string[] = [
  '履歴を全期間さかのぼって閲覧',
  '人別集計を全件表示',
  '1回あたり平均額での並び替え',
  '年次サマリー',
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const isPro = useIsPro();
  const { priceLabel, loading, processing, available, error, purchase, restore } = usePaywall();
  const { showToast } = useToast();

  const handlePurchase = async () => {
    const purchased = await purchase();

    if (purchased) {
      router.back();
      showToast({ message: '飲み代家計簿 Pro を購入しました', durationMs: 3000 });
    }
  };

  const handleRestore = async () => {
    const outcome = await restore();

    if (outcome === 'restored') {
      router.back();
      showToast({ message: '購入を復元しました', durationMs: 3000 });
      return;
    }

    if (outcome === 'not-found') {
      showToast({ message: '購入履歴が見つかりません', durationMs: 3000 });
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          accessibilityRole="button"
        >
          <Text style={styles.headerClose}>閉じる</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>飲み代家計簿 Pro</Text>
        <Text style={styles.lead}>
          買い切りです。月額の請求はありません。
          {'\n'}
          記録の登録・編集・削除は無料のままで、制限はありません。
        </Text>

        <View style={styles.card}>
          {PRO_FEATURES.map((feature) => (
            <Text key={feature} style={styles.feature}>
              ・{feature}
            </Text>
          ))}
        </View>

        {isPro ? (
          <View style={styles.purchasedBox}>
            <Text style={styles.purchasedText}>ご購入済みです。すべての機能を利用できます。</Text>
          </View>
        ) : !available ? (
          <Text style={styles.unavailable}>
            現在購入手続きを利用できません。アプリの設定が未完了の可能性があります。
          </Text>
        ) : (
          <>
            {/* 価格はストアから取得した値をそのまま表示する（要件定義 §5.5） */}
            <Text style={styles.price}>
              {loading ? '価格を取得中…' : (priceLabel ?? '価格を取得できませんでした')}
            </Text>

            <Pressable
              onPress={() => void handlePurchase()}
              disabled={processing || priceLabel === null}
              style={[
                styles.primaryButton,
                (processing || priceLabel === null) && styles.buttonDisabled,
              ]}
              accessibilityRole="button"
            >
              {processing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryLabel}>購入する</Text>
              )}
            </Pressable>
          </>
        )}

        {/* 「購入を復元」は非消耗型で必須。設定画面にも置いている（要件定義 §5.5） */}
        <Pressable
          onPress={() => void handleRestore()}
          disabled={processing || !available}
          style={styles.secondaryButton}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryLabel}>購入を復元</Text>
        </Pressable>

        {error !== null && <Text style={styles.error}>{error}</Text>}

        <View style={styles.legalRow}>
          <Pressable
            onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
            accessibilityRole="link"
          >
            <Text style={styles.legalLink}>プライバシーポリシー</Text>
          </Pressable>

          <Text style={styles.legalSeparator}>・</Text>

          <Pressable
            onPress={() => void Linking.openURL(TERMS_OF_SERVICE_URL)}
            accessibilityRole="link"
          >
            <Text style={styles.legalLink}>利用規約</Text>
          </Pressable>
        </View>

        <Text style={styles.note}>
          お支払いは App Store 経由で行われます。返金は Apple のポリシーに従います。
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 8 },
  headerButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  headerClose: { fontSize: 15, color: '#52525B' },
  content: { padding: 24, paddingBottom: 40, gap: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#18181B' },
  lead: { fontSize: 14, lineHeight: 22, color: '#52525B' },
  card: { gap: 6, padding: 16, borderRadius: 12, backgroundColor: '#F4F4F5' },
  feature: { fontSize: 14, lineHeight: 22, color: '#3F3F46' },
  price: { fontSize: 28, fontWeight: '700', color: '#18181B', textAlign: 'center' },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#1D4ED8',
  },
  buttonDisabled: { backgroundColor: '#A1A1AA' },
  primaryLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryLabel: { fontSize: 15, fontWeight: '600', color: '#1D4ED8' },
  purchasedBox: { padding: 16, borderRadius: 12, backgroundColor: '#ECFDF5' },
  purchasedText: { fontSize: 14, color: '#15803D' },
  unavailable: { fontSize: 13, lineHeight: 20, color: '#B45309' },
  error: { fontSize: 13, color: '#B91C1C', textAlign: 'center' },
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  legalLink: { fontSize: 13, color: '#1D4ED8' },
  legalSeparator: { fontSize: 13, color: '#A1A1AA' },
  note: { fontSize: 12, lineHeight: 18, color: '#71717A', textAlign: 'center' },
});
