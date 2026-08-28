import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { router } from 'expo-router';

import { FREE_HISTORY_MONTHS } from '@/features/billing/plan-limits';
import { useRecordList } from '@/features/records/use-record-list';

import { EmptyState } from '@/components/EmptyState';
import { SwipeToDeleteRow } from '@/components/SwipeToDeleteRow';
import { useToast } from '@/components/ToastProvider';

import { formatYen } from '@/lib/currency';
import { CATEGORY_LABELS, DRINK_TYPE_LABELS } from '@/lib/labels';

import type { SpendingRecordWithCompanions } from '@/types/record';

/**
 * 履歴のリスト表示。カレンダー表示を追加するにあたって画面から切り出したもので、
 * 挙動は変えていない（日別グルーピング・スワイプ削除・無料版のロック行）。
 */
export function HistoryListView() {
  const { sections, loading, loadingMore, error, loadMore, lockedOlderCount, remove, restore } =
    useRecordList();
  const { showToast } = useToast();

  const handleDelete = async (record: SpendingRecordWithCompanions) => {
    const deleted = await remove(record);

    if (!deleted) {
      return;
    }

    showToast({
      message: '削除しました',
      action: {
        label: '取り消す',
        onPress: () => {
          void restore(record).then(() => {
            showToast({ message: '元に戻しました', durationMs: 2500 });
          });
        },
      },
    });
  };

  if (loading && sections.length === 0) {
    return <ActivityIndicator style={styles.loading} />;
  }

  if (sections.length === 0) {
    return (
      <EmptyState
        title="まだ記録がありません"
        description="お酒に使った金額を記録すると、ここに履歴が並びます。"
        actionLabel="記録を追加"
        onAction={() => router.push('/record/new')}
      />
    );
  }

  return (
    <View style={styles.container}>
      {error !== null && <Text style={styles.error}>{error}</Text>}

      <SectionList
        sections={sections}
        keyExtractor={(record) => `${record.id}`}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionDate}>{formatSectionDate(section.date)}</Text>
            <Text style={styles.sectionTotal}>¥{formatYen(section.dayTotal)}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <SwipeToDeleteRow
            onDelete={() => void handleDelete(item)}
            accessibilityLabel={`${item.amount}円の記録を削除`}
          >
            <Pressable
              onPress={() => router.push(`/record/${item.id}`)}
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel={`${item.amount}円 ${CATEGORY_LABELS[item.category]} を編集`}
            >
              <View style={styles.rowMain}>
                <Text style={styles.rowAmount}>¥{formatYen(item.amount)}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {CATEGORY_LABELS[item.category]}
                  {item.drinkType !== null && ` ・ ${DRINK_TYPE_LABELS[item.drinkType]}`}
                  {item.isSolo && ' ・ 一人'}
                  {item.companions.length > 0 &&
                    ` ・ ${item.companions.map((companion) => companion.name).join(', ')}`}
                </Text>
              </View>

              {item.memo !== null && (
                <Text style={styles.rowMemo} numberOfLines={1}>
                  {item.memo}
                </Text>
              )}
            </Pressable>
          </SwipeToDeleteRow>
        )}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footer} />
          ) : lockedOlderCount > 0 ? (
            // 無料版は直近3ヶ月まで。タップして初めて Paywall へ進む（要件定義 §5.3）
            <Pressable
              onPress={() => router.push('/paywall')}
              style={styles.lockedRow}
              accessibilityRole="button"
              accessibilityLabel={`これ以前の${lockedOlderCount}件を見るには Pro が必要です`}
            >
              <Text style={styles.lockedTitle}>これ以前の記録は Pro で表示できます</Text>
              <Text style={styles.lockedMeta}>
                直近{FREE_HISTORY_MONTHS}ヶ月より前に {lockedOlderCount} 件あります
              </Text>
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}

/** '2026-08-24' → '8/24（月）' */
function formatSectionDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);

  if (year === undefined || month === undefined || day === undefined) {
    return date;
  }

  const weekday = ['日', '月', '火', '水', '木', '金', '土'][
    new Date(year, month - 1, day).getDay()
  ];

  return `${month}/${day}（${weekday}）`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { marginTop: 32 },
  content: { paddingBottom: 32 },
  error: { padding: 16, fontSize: 13, color: '#B91C1C' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  sectionDate: { fontSize: 13, fontWeight: '600', color: '#52525B' },
  sectionTotal: { fontSize: 13, color: '#71717A' },
  row: {
    gap: 2,
    minHeight: 60,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
  },
  rowMain: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  rowAmount: { fontSize: 17, fontWeight: '600', color: '#18181B' },
  // 同行者が多いときに金額を押し出さないよう、メタ情報側を縮める
  rowMeta: { flexShrink: 1, marginLeft: 12, fontSize: 13, color: '#71717A', textAlign: 'right' },
  rowMemo: { fontSize: 12, color: '#A1A1AA' },
  footer: { paddingVertical: 16 },
  lockedRow: {
    gap: 4,
    marginTop: 12,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    backgroundColor: '#FAFAFA',
  },
  lockedTitle: { fontSize: 14, fontWeight: '600', color: '#18181B' },
  lockedMeta: { fontSize: 12, color: '#71717A' },
});
