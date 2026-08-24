import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

export default function SettingsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>予算</Text>

      <View style={styles.group}>
        <Pressable
          onPress={() => router.push('/settings/budget')}
          style={styles.row}
          accessibilityRole="button"
        >
          <Text style={styles.rowLabel}>月予算の設定</Text>
          <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
        </Pressable>
      </View>

      {/* プリセット管理・同行者管理・購入を復元などは後続フェーズで追加する */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 8 },
  sectionLabel: { fontSize: 13, color: '#52525B' },
  group: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    overflow: 'hidden',
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  rowLabel: { fontSize: 15, color: '#18181B' },
});
