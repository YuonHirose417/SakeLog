import { StyleSheet, Text, View } from 'react-native';

import { formatYen } from '@/lib/currency';

import type { CompanionStat, YearlySummary } from '@/types/analytics';

/**
 * 年次サマリー（要件定義 §4.4）。
 *
 * 「最も高くついた相手」の金額は頭割りしていない値なので、
 * 月次の人別集計と同じ注記を出す。
 */
export function YearlySummaryCard({ summary }: { summary: YearlySummary }) {
  const { mostFrequentCompanion, mostExpensiveCompanion } = summary;
  const hasCompanionStats = mostFrequentCompanion !== null || mostExpensiveCompanion !== null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.totalBlock}>
        <Text style={styles.label}>総支出</Text>
        <Text style={styles.total}>¥{formatYen(summary.totalAmount)}</Text>
        <Text style={styles.count}>{summary.recordCount}件の記録</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>今年よく飲んだ相手</Text>

        {hasCompanionStats ? (
          <>
            <CompanionHighlight
              label="最も回数の多かった相手"
              stat={mostFrequentCompanion}
              render={(stat) => `${stat.visitCount}回 ・ ¥${formatYen(stat.totalAmount)}`}
            />
            <CompanionHighlight
              label="最も高くついた相手"
              stat={mostExpensiveCompanion}
              render={(stat) => `¥${formatYen(stat.totalAmount)} ・ ${stat.visitCount}回`}
            />
            <Text style={styles.disclaimer}>※ 合計は総支出と一致しません</Text>
          </>
        ) : (
          <Text style={styles.empty}>
            この年は同行者の記録がありません。記録に「誰と」を入れると集計されます。
          </Text>
        )}
      </View>
    </View>
  );
}

function CompanionHighlight({
  label,
  stat,
  render,
}: {
  label: string;
  stat: CompanionStat | null;
  render: (stat: CompanionStat) => string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>

      {stat === null ? (
        <Text style={styles.rowValueMuted}>—</Text>
      ) : (
        <View style={styles.rowRight}>
          <Text style={styles.rowName} numberOfLines={1}>
            {stat.name}
          </Text>
          {/* 回数は必ず併記する（要件定義 §4.4） */}
          <Text style={styles.rowMeta}>{render(stat)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 16 },
  totalBlock: { gap: 4 },
  label: { fontSize: 13, color: '#52525B' },
  total: { fontSize: 36, fontWeight: '700', color: '#18181B' },
  count: { fontSize: 13, color: '#71717A' },
  card: { gap: 10, padding: 16, borderRadius: 12, backgroundColor: '#F4F4F5' },
  heading: { fontSize: 15, fontWeight: '600', color: '#18181B' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: { flexShrink: 1, fontSize: 13, color: '#52525B' },
  rowRight: { alignItems: 'flex-end' },
  rowName: { fontSize: 15, fontWeight: '600', color: '#18181B' },
  rowMeta: { fontSize: 12, color: '#71717A' },
  rowValueMuted: { fontSize: 15, color: '#A1A1AA' },
  disclaimer: { fontSize: 12, color: '#71717A' },
  empty: { fontSize: 13, lineHeight: 20, color: '#71717A' },
});
