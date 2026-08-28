import { useState } from 'react';

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

import { freeHistoryCutoffMonth } from '@/features/billing/plan-limits';
import { ProLockCard } from '@/features/billing/ProLockCard';
import { useCalendarMonth } from '@/features/records/use-calendar-month';
import { useDayRecords } from '@/features/records/use-day-records';
import type { CalendarCell, CalendarIntensity } from '@/features/records/build-calendar-month';

import { useIsPro } from '@/store/use-app-store';

import { formatYen } from '@/lib/currency';
import { localIsoOnDate, shiftMonth, toMonthKey } from '@/lib/datetime';
import { CATEGORY_LABELS, DRINK_TYPE_LABELS } from '@/lib/labels';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** 濃淡の段階に対応する背景色。0 は記録なし。 */
const INTENSITY_COLORS: Readonly<Record<CalendarIntensity, string>> = {
  0: 'transparent',
  1: '#FEF3C7',
  2: '#FDE68A',
  3: '#FBBF24',
  4: '#F59E0B',
};

/**
 * 月単位のカレンダー表示。
 * カレンダーライブラリは使わず、View と StyleSheet だけで組んでいる。
 */
export function CalendarView() {
  const currentMonth = toMonthKey(new Date());
  const [month, setMonth] = useState(currentMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const isPro = useIsPro();

  const { calendar, summary, dailyBudget, loading } = useCalendarMonth(month);
  const { records: dayRecords } = useDayRecords(selectedDate);

  const locked = !isPro && month < freeHistoryCutoffMonth(currentMonth);
  const canGoNext = month < currentMonth;

  const goToMonth = (next: string) => {
    setMonth(next);
    // 月をまたいだら選択日は解除する
    setSelectedDate(null);
  };

  const handleCellPress = (cell: CalendarCell) => {
    if (cell.date === null || cell.isFuture) {
      return;
    }

    if (cell.totalAmount > 0) {
      setSelectedDate((current) => (current === cell.date ? null : cell.date));
      return;
    }

    // 記録がない日はその日付で新規記録を開く
    router.push({ pathname: '/record/new', params: { date: cell.date } });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.monthHeader}>
        <Pressable
          onPress={() => goToMonth(shiftMonth(month, -1))}
          style={styles.monthButton}
          accessibilityRole="button"
          accessibilityLabel="前の月"
        >
          <Ionicons name="chevron-back" size={20} color="#3F3F46" />
        </Pressable>

        <View style={styles.monthLabelArea}>
          <Text style={styles.monthLabel}>{formatMonth(month)}</Text>
          {summary !== null && !locked && (
            <Text style={styles.monthSummary}>
              合計 ¥{formatYen(summary.totalAmount)}（{summary.recordCount}件）
            </Text>
          )}
        </View>

        <Pressable
          onPress={() => canGoNext && goToMonth(shiftMonth(month, 1))}
          disabled={!canGoNext}
          style={styles.monthButton}
          accessibilityRole="button"
          accessibilityLabel="次の月"
          accessibilityState={{ disabled: !canGoNext }}
        >
          <Ionicons name="chevron-forward" size={20} color={canGoNext ? '#3F3F46' : '#D4D4D8'} />
        </Pressable>
      </View>

      {locked ? (
        <ProLockCard
          title="これ以前の履歴は Pro 限定です"
          description="無料版で見られるのは直近3ヶ月までです。Pro にすると全期間をさかのぼって振り返れます。"
        />
      ) : loading && calendar === null ? (
        <ActivityIndicator style={styles.loading} />
      ) : calendar === null ? null : (
        <>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((label) => (
              <Text key={label} style={styles.weekday}>
                {label}
              </Text>
            ))}
          </View>

          {calendar.weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.week}>
              {week.map((cell, cellIndex) => (
                <CalendarDayCell
                  key={cell.date ?? `blank-${weekIndex}-${cellIndex}`}
                  cell={cell}
                  selected={cell.date !== null && cell.date === selectedDate}
                  onPress={() => handleCellPress(cell)}
                />
              ))}
            </View>
          ))}

          <Text style={styles.legend}>
            {dailyBudget === null
              ? '色の濃さは、その月で最も使った日を基準にしています'
              : `色の濃さは日割り予算（¥${formatYen(Math.round(dailyBudget))}）が基準です`}
          </Text>

          {selectedDate !== null && (
            <View style={styles.daySection}>
              <Text style={styles.dayHeading}>{formatDayHeading(selectedDate)}</Text>

              {dayRecords.map((record) => (
                <Pressable
                  key={record.id}
                  onPress={() => router.push(`/record/${record.id}`)}
                  style={styles.dayRow}
                  accessibilityRole="button"
                  accessibilityLabel={`${record.amount}円 ${CATEGORY_LABELS[record.category]} を編集`}
                >
                  <Text style={styles.dayAmount}>¥{formatYen(record.amount)}</Text>
                  <Text style={styles.dayMeta} numberOfLines={1}>
                    {CATEGORY_LABELS[record.category]}
                    {record.drinkType !== null && ` ・ ${DRINK_TYPE_LABELS[record.drinkType]}`}
                    {record.isSolo && ' ・ 一人'}
                    {record.companions.length > 0 &&
                      ` ・ ${record.companions.map((companion) => companion.name).join(', ')}`}
                  </Text>
                </Pressable>
              ))}

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/record/new',
                    params: { date: localIsoOnDate(selectedDate).slice(0, 10) },
                  })
                }
                style={styles.dayAddButton}
                accessibilityRole="button"
              >
                <Text style={styles.dayAddLabel}>この日に記録を追加</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function CalendarDayCell({
  cell,
  selected,
  onPress,
}: {
  cell: CalendarCell;
  selected: boolean;
  onPress: () => void;
}) {
  if (cell.date === null) {
    return <View style={styles.cell} />;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={cell.isFuture}
      style={[
        styles.cell,
        styles.cellFilled,
        { backgroundColor: INTENSITY_COLORS[cell.intensity] },
        selected && styles.cellSelected,
        cell.isFuture && styles.cellFuture,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: cell.isFuture }}
      accessibilityLabel={
        cell.totalAmount > 0
          ? `${cell.day}日 ${cell.totalAmount}円`
          : `${cell.day}日 記録なし。タップで記録を追加`
      }
    >
      <Text style={[styles.cellDay, cell.isFuture && styles.cellDayFuture]}>{cell.day}</Text>
      {cell.totalAmount > 0 && (
        <Text style={styles.cellAmount} numberOfLines={1}>
          {formatCompact(cell.totalAmount)}
        </Text>
      )}
    </Pressable>
  );
}

/** セルは狭いので、4桁以上は千円単位に丸める（1,200 → 1.2k）。 */
function formatCompact(amount: number): string {
  if (amount < 1000) {
    return `${amount}`;
  }

  const thousands = amount / 1000;

  return `${thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10}k`;
}

/** '2026-08' → '2026年8月' */
function formatMonth(month: string): string {
  const [year, monthPart] = month.split('-');

  if (year === undefined || monthPart === undefined) {
    return month;
  }

  return `${year}年${Number(monthPart)}月`;
}

/** '2026-08-24' → '8月24日（月）' */
function formatDayHeading(date: string): string {
  const [year, month, day] = date.split('-').map(Number);

  if (year === undefined || month === undefined || day === undefined) {
    return date;
  }

  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()];

  return `${month}月${day}日（${weekday}）`;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  monthLabelArea: { alignItems: 'center', gap: 2 },
  monthLabel: { fontSize: 16, fontWeight: '600', color: '#18181B' },
  monthSummary: { fontSize: 12, color: '#71717A' },
  loading: { marginVertical: 32 },
  weekdayRow: { flexDirection: 'row' },
  weekday: { flex: 1, fontSize: 11, color: '#71717A', textAlign: 'center' },
  week: { flexDirection: 'row', gap: 4 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 8, marginBottom: 4 },
  cellFilled: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4E4E7',
  },
  cellSelected: { borderWidth: 2, borderColor: '#1D4ED8' },
  cellFuture: { opacity: 0.35 },
  cellDay: { fontSize: 13, color: '#18181B' },
  cellDayFuture: { color: '#A1A1AA' },
  cellAmount: { fontSize: 10, color: '#52525B' },
  legend: { fontSize: 11, color: '#A1A1AA' },
  daySection: {
    gap: 8,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F4F4F5',
  },
  dayHeading: { fontSize: 14, fontWeight: '600', color: '#18181B' },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 44,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D4D4D8',
  },
  dayAmount: { fontSize: 16, fontWeight: '600', color: '#18181B' },
  dayMeta: { flexShrink: 1, fontSize: 12, color: '#71717A', textAlign: 'right' },
  dayAddButton: { minHeight: 44, justifyContent: 'center' },
  dayAddLabel: { fontSize: 14, fontWeight: '600', color: '#1D4ED8' },
});
