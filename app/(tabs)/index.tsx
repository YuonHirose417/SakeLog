import { Pressable, StyleSheet, Text, View } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ホーム</Text>

      {/* 合計支出・予算残・プリセットは Phase 1 の後続で実装する */}

      <Link href="/record/new" asChild>
        <Pressable style={styles.fab} accessibilityRole="button" accessibilityLabel="記録を追加">
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#1D4ED8',
  },
});
