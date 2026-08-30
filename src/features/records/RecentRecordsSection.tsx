import { Pressable, StyleSheet, Text, View } from 'react-native';

import { router } from 'expo-router';

import { useRecentRecords } from '@/features/records/use-recent-records';

import { formatYen } from '@/lib/currency';
import { toShortDateLabel } from '@/lib/datetime';
import { CATEGORY_LABELS } from '@/lib/labels';

/**
 * ホームの「最近の記録」。
 * 記録が1件も無いときはセクションごと出さない（見出しだけ残らないように）。
 */
export function RecentRecordsSection() {
  const { records } = useRecentRecords();

  if (records.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>最近の記録</Text>

        <Pressable
          onPress={() => router.push('/history')}
          style={styles.moreButton}
          accessibilityRole="button"
          accessibilityLabel="記録をすべて見る"
        >
          <Text style={styles.moreLabel}>すべて見る</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {records.map((record) => (
          <Pressable
            key={record.id}
            onPress={() => router.push(`/record/${record.id}`)}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={`${toShortDateLabel(record.spentAt)} ${record.amount}円 ${CATEGORY_LABELS[record.category]} を編集`}
          >
            <Text style={styles.date}>{toShortDateLabel(record.spentAt)}</Text>
            <Text style={styles.amount}>¥{formatYen(record.amount)}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {CATEGORY_LABELS[record.category]}
              {record.isSolo && ' ・ 一人'}
              {record.companions.length > 0 &&
                ` ・ ${record.companions.map((companion) => companion.name).join(', ')}`}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: 13, color: '#52525B' },
  moreButton: { minHeight: 44, justifyContent: 'center' },
  moreLabel: { fontSize: 13, fontWeight: '600', color: '#1D4ED8' },
  list: { borderRadius: 12, borderWidth: 1, borderColor: '#E4E4E7', overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E4E7',
  },
  date: { width: 44, fontSize: 12, color: '#71717A' },
  amount: { width: 76, fontSize: 15, fontWeight: '600', color: '#18181B', textAlign: 'right' },
  // 同行者が多いときに金額を押し出さないよう、メタ情報側を縮める
  meta: { flexShrink: 1, fontSize: 12, color: '#71717A' },
});
