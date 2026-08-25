import { StyleSheet, Text, View } from 'react-native';

import type { MonthlyTrend } from '@/features/analytics/build-monthly-trend';

import { RatioBar } from '@/components/RatioBar';

import { formatYen } from '@/lib/currency';

/**
 * 月別推移（要件定義 §4.4）。
 * ネイティブ依存を増やさないため、RatioBar（View の幅比率）を流用した横棒で描く。
 */
export function MonthlyTrendCard({ trend }: { trend: MonthlyTrend }) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>月別推移</Text>

      {trend.points.length === 0 ? (
        <Text style={styles.empty}>表示できる月がありません。</Text>
      ) : (
        trend.points.map((point) => (
          <View key={point.month} style={styles.row}>
            <Text style={styles.month}>{point.monthNumber}月</Text>

            <View style={styles.barArea}>
              <RatioBar
                ratio={trend.maxAmount === 0 ? 0 : point.totalAmount / trend.maxAmount}
                color="#1D4ED8"
              />
            </View>

            <Text style={styles.amount}>
              {point.totalAmount === 0 ? '—' : `¥${formatYen(point.totalAmount)}`}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 16, borderRadius: 12, backgroundColor: '#F4F4F5' },
  heading: { fontSize: 15, fontWeight: '600', color: '#18181B' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  month: { width: 34, fontSize: 12, color: '#52525B', textAlign: 'right' },
  barArea: { flex: 1 },
  amount: { width: 76, fontSize: 12, color: '#3F3F46', textAlign: 'right' },
  empty: { fontSize: 13, color: '#71717A' },
});
