import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { MIN_VISITS_THRESHOLD } from '@/features/analytics/use-companion-ranking';

import { formatYen } from '@/lib/currency';

import type { CompanionSortKey, CompanionStat } from '@/types/analytics';

type CompanionRankingCardProps = {
  /** 見出し。月次「誰と飲んだか」／年次「誰と飲んだか（年間）」。 */
  title: string;
  stats: CompanionStat[];
  loading: boolean;
  sortKey: CompanionSortKey;
  onSortKeyChange: (key: CompanionSortKey) => void;
  minVisitsOnly: boolean;
  onMinVisitsOnlyChange: (value: boolean) => void;
  /** 無料版で隠されている人数。0 より大きいとき、ぼかし行と Paywall 導線を出す。 */
  lockedCount?: number;
  /** 平均額ソートが Pro 限定でロックされているか。 */
  averageSortLocked?: boolean;
  /** ロックされた要素がタップされたとき（Paywall へ遷移する）。 */
  onLockedPress?: () => void;
};

const SORT_OPTIONS: readonly { value: CompanionSortKey; label: string }[] = [
  { value: 'total', label: '合計額' },
  { value: 'average', label: '平均額' },
];

/**
 * 人別集計（要件定義 §4.4、このアプリの差別化の核）。
 *
 * 金額は頭割りしていない。1件の記録金額が紐づく全同行者にそれぞれ丸ごと計上されているため、
 * 全員分を足しても総支出とは一致しない。その旨の注記を必ず表示する。
 *
 * 回数は必ず併記する（1回だけの相手が平均額トップに来る誤解を防ぐため）。
 */
export function CompanionRankingCard({
  title,
  stats,
  loading,
  sortKey,
  onSortKeyChange,
  minVisitsOnly,
  onMinVisitsOnlyChange,
  lockedCount = 0,
  averageSortLocked = false,
  onLockedPress,
}: CompanionRankingCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.disclaimer}>※ 合計は総支出と一致しません</Text>

      <View style={styles.controls}>
        <View style={styles.sortGroup} accessibilityRole="radiogroup" accessibilityLabel="並び替え">
          {SORT_OPTIONS.map((option) => {
            const selected = option.value === sortKey;
            // 平均額ソートは Pro 限定。ロック中はタップで Paywall へ誘導する
            const locked = option.value === 'average' && averageSortLocked;

            return (
              <Pressable
                key={option.value}
                onPress={() => (locked ? onLockedPress?.() : onSortKeyChange(option.value))}
                style={[styles.sortButton, selected && styles.sortButtonSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={locked ? `${option.label}（Pro 限定）` : option.label}
              >
                <Text
                  style={[
                    styles.sortLabel,
                    selected && styles.sortLabelSelected,
                    locked && styles.sortLabelLocked,
                  ]}
                >
                  {locked ? `${option.label} 🔒` : option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>{MIN_VISITS_THRESHOLD}回以上のみ</Text>
          <Switch
            value={minVisitsOnly}
            onValueChange={onMinVisitsOnlyChange}
            accessibilityLabel={`${MIN_VISITS_THRESHOLD}回以上のみ表示`}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loading} />
      ) : stats.length === 0 ? (
        <Text style={styles.empty}>
          {minVisitsOnly
            ? `${MIN_VISITS_THRESHOLD}回以上一緒に飲んだ相手はいません。`
            : 'この月は同行者の記録がありません。記録に「誰と」を入れると、ここに集計されます。'}
        </Text>
      ) : (
        stats.map((stat) => (
          <View key={stat.companionId} style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {stat.name}
            </Text>

            <View style={styles.rowRight}>
              <Text style={styles.amount}>¥{formatYen(stat.totalAmount)}</Text>
              {/* 回数は必ず併記する（要件定義 §4.4 の表示ルール） */}
              <Text style={styles.meta}>
                {stat.visitCount}回 ・ 平均 ¥{formatYen(Math.round(stat.avgAmount))}
              </Text>
            </View>
          </View>
        ))
      )}

      {/*
        無料版で隠れている人。名前と金額は伏せ、タップして初めて Paywall へ進む。
        本物のブラー（expo-blur）はネイティブ依存が増えるため使わず、
        伏せ字と透明度で表現している。
      */}
      {lockedCount > 0 && (
        <Pressable
          onPress={onLockedPress}
          accessibilityRole="button"
          accessibilityLabel={`他 ${lockedCount} 人を見るには Pro が必要です`}
        >
          <View style={[styles.row, styles.lockedRow]}>
            <Text style={styles.name}>●●●●</Text>
            <View style={styles.rowRight}>
              <Text style={styles.amount}>¥●,●●●</Text>
              <Text style={styles.meta}>●回 ・ 平均 ¥●,●●●</Text>
            </View>
          </View>

          <Text style={styles.locked}>他 {lockedCount} 人 — Pro で全員表示</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 16, borderRadius: 12, backgroundColor: '#F4F4F5' },
  heading: { fontSize: 15, fontWeight: '600', color: '#18181B' },
  disclaimer: { fontSize: 12, color: '#71717A' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortGroup: { flexDirection: 'row', gap: 6 },
  sortButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D4D4D8',
    backgroundColor: '#FFFFFF',
  },
  sortButtonSelected: { borderColor: '#1D4ED8', backgroundColor: '#E8EFFD' },
  sortLabel: { fontSize: 13, color: '#3F3F46' },
  sortLabelSelected: { color: '#1D4ED8', fontWeight: '600' },
  filterGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterLabel: { fontSize: 13, color: '#52525B' },
  loading: { marginVertical: 12 },
  empty: { fontSize: 13, lineHeight: 20, color: '#71717A' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D4D4D8',
  },
  name: { flexShrink: 1, fontSize: 15, color: '#18181B' },
  rowRight: { alignItems: 'flex-end' },
  amount: { fontSize: 15, fontWeight: '600', color: '#18181B' },
  meta: { fontSize: 12, color: '#71717A' },
  sortLabelLocked: { color: '#A1A1AA' },
  lockedRow: { opacity: 0.35 },
  locked: { paddingTop: 8, fontSize: 13, fontWeight: '600', color: '#1D4ED8' },
});
