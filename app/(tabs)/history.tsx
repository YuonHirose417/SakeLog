import { useState } from 'react';

import { StyleSheet, View } from 'react-native';

import { CalendarView } from '@/features/records/CalendarView';
import { HistoryListView } from '@/features/records/HistoryListView';

import { SegmentedControl } from '@/components/SegmentedControl';

import type { Option } from '@/lib/labels';

type HistoryTab = 'list' | 'calendar';

const TAB_OPTIONS: readonly Option<HistoryTab>[] = [
  { value: 'list', label: 'リスト' },
  { value: 'calendar', label: 'カレンダー' },
];

export default function HistoryScreen() {
  const [tab, setTab] = useState<HistoryTab>('list');

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={setTab} label="表示の切替" />
      </View>

      {tab === 'list' ? <HistoryListView /> : <CalendarView />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  tabs: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
});
