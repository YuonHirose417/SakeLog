import { StyleSheet, Text, View } from 'react-native';

import { RatioBar } from '@/components/RatioBar';

import { formatYen } from '@/lib/currency';
import { CATEGORY_LABELS } from '@/lib/labels';

import type { CategoryBreakdown } from '@/types/analytics';
import type { Category } from '@/types/record';

const CATEGORY_COLORS: Readonly<Record<Category, string>> = {
  convenience: '#1D4ED8',
  supermarket: '#0F766E',
  bar: '#B45309',
  other: '#71717A',
};

/** カテゴリ別内訳（要件定義 §4.4）。金額の大きい順に横棒で示す。 */
export function CategoryBreakdownCard({ breakdown }: { breakdown: CategoryBreakdown[] }) {
  const total = breakdown.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>カテゴリ別</Text>

      {breakdown.map((item) => (
        <View key={item.category} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.name}>{CATEGORY_LABELS[item.category]}</Text>
            <Text style={styles.amount}>
              ¥{formatYen(item.totalAmount)}
              <Text style={styles.count}> ・ {item.recordCount}件</Text>
            </Text>
          </View>

          <RatioBar
            ratio={total === 0 ? 0 : item.totalAmount / total}
            color={CATEGORY_COLORS[item.category]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: 12, backgroundColor: '#F4F4F5' },
  heading: { fontSize: 15, fontWeight: '600', color: '#18181B' },
  row: { gap: 6 },
  rowHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  name: { fontSize: 14, color: '#3F3F46' },
  amount: { fontSize: 14, fontWeight: '600', color: '#18181B' },
  count: { fontSize: 12, fontWeight: '400', color: '#71717A' },
});
