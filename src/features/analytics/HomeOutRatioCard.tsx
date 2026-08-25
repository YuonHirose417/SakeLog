import { StyleSheet, Text, View } from 'react-native';

import { RatioBar } from '@/components/RatioBar';

import { formatYen } from '@/lib/currency';

import type { MonthlySummary } from '@/types/analytics';

/**
 * 宅飲み / 外飲み比率（要件定義 §4.4）。
 * 宅飲み = コンビニ + スーパー、外飲み = 外飲み。
 * 「その他」は宅飲みにも外飲みにも入らないため、2つの合計は総支出と一致しないことがある。
 */
export function HomeOutRatioCard({ summary }: { summary: MonthlySummary }) {
  const base = summary.homeAmount + summary.outAmount;
  const homeRatio = base === 0 ? 0 : summary.homeAmount / base;

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>宅飲み / 外飲み</Text>

      <View style={styles.row}>
        <Text style={styles.name}>宅飲み</Text>
        <Text style={styles.amount}>
          ¥{formatYen(summary.homeAmount)}
          <Text style={styles.percent}> ・ {formatPercent(homeRatio)}</Text>
        </Text>
      </View>
      <RatioBar ratio={homeRatio} color="#0F766E" />

      <View style={styles.row}>
        <Text style={styles.name}>外飲み</Text>
        <Text style={styles.amount}>
          ¥{formatYen(summary.outAmount)}
          <Text style={styles.percent}> ・ {formatPercent(base === 0 ? 0 : 1 - homeRatio)}</Text>
        </Text>
      </View>
      <RatioBar ratio={base === 0 ? 0 : 1 - homeRatio} color="#B45309" />
    </View>
  );
}

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 16, borderRadius: 12, backgroundColor: '#F4F4F5' },
  heading: { fontSize: 15, fontWeight: '600', color: '#18181B' },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  name: { fontSize: 14, color: '#3F3F46' },
  amount: { fontSize: 14, fontWeight: '600', color: '#18181B' },
  percent: { fontSize: 12, fontWeight: '400', color: '#71717A' },
});
