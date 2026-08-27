import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

import { usePaywall } from '@/features/billing/use-paywall';

import { useToast } from '@/components/ToastProvider';

import { useIsPro } from '@/store/use-app-store';

export default function SettingsScreen() {
  const isPro = useIsPro();
  const { restore, processing, available } = usePaywall();
  const { showToast } = useToast();

  const handleRestore = async () => {
    const outcome = await restore();

    if (outcome === 'restored') {
      showToast({ message: '購入を復元しました', durationMs: 3000 });
      return;
    }

    if (outcome === 'not-found') {
      showToast({ message: '購入履歴が見つかりません', durationMs: 3000 });
      return;
    }

    showToast({ message: '復元に失敗しました', durationMs: 3000 });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>予算</Text>

      <View style={styles.group}>
        <Pressable
          onPress={() => router.push('/settings/budget')}
          style={styles.row}
          accessibilityRole="button"
        >
          <Text style={styles.rowLabel}>月予算の設定</Text>
          <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Pro版</Text>

      <View style={styles.group}>
        <Pressable
          onPress={() => router.push('/paywall')}
          style={styles.row}
          accessibilityRole="button"
        >
          <Text style={styles.rowLabel}>{isPro ? 'Pro を利用中' : 'Pro について'}</Text>
          <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
        </Pressable>

        {/* 非消耗型では「購入を復元」が審査必須。Paywall と設定の両方に置く（要件定義 §5.5） */}
        <Pressable
          onPress={() => void handleRestore()}
          disabled={processing || !available}
          style={[styles.row, styles.rowBordered]}
          accessibilityRole="button"
          accessibilityState={{ disabled: processing || !available }}
        >
          <Text style={[styles.rowLabel, (processing || !available) && styles.rowLabelDisabled]}>
            {processing ? '処理中…' : '購入を復元'}
          </Text>
        </Pressable>
      </View>

      {/* プリセット管理・同行者管理・注意喚起リンクは後続フェーズで追加する */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 8 },
  sectionLabel: { marginTop: 12, fontSize: 13, color: '#52525B' },
  group: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    overflow: 'hidden',
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  rowBordered: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E4E4E7' },
  rowLabel: { fontSize: 15, color: '#18181B' },
  rowLabelDisabled: { color: '#A1A1AA' },
});
