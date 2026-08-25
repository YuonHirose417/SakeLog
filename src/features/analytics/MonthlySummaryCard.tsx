import { StyleSheet, Text, View } from 'react-native';

import { formatYen } from '@/lib/currency';

import type { MonthlySummary } from '@/types/analytics';

/** 月次サマリー（要件定義 §4.4）。合計金額と記録件数。 */
export function MonthlySummaryCard({ summary }: { summary: MonthlySummary }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>合計</Text>
      <Text style={styles.total}>¥{formatYen(summary.totalAmount)}</Text>
      <Text style={styles.count}>{summary.recordCount}件の記録</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4 },
  label: { fontSize: 13, color: '#52525B' },
  total: { fontSize: 36, fontWeight: '700', color: '#18181B' },
  count: { fontSize: 13, color: '#71717A' },
});
