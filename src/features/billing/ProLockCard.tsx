import { Pressable, StyleSheet, Text, View } from 'react-native';

import { router } from 'expo-router';

type ProLockCardProps = {
  title: string;
  description: string;
  /** ボタンの文言。既定は「Pro を見る」。 */
  actionLabel?: string;
};

/**
 * Pro 限定機能のロック表示（要件定義 §5.3）。
 *
 * **タップして初めて Paywall へ遷移する。** マウント時に自動で開かないこと。
 * 起動直後のモーダル表示は要件で禁止されている。
 */
export function ProLockCard({ title, description, actionLabel = 'Pro を見る' }: ProLockCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      <Pressable
        onPress={() => router.push('/paywall')}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
      >
        <Text style={styles.buttonLabel}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    backgroundColor: '#FAFAFA',
  },
  title: { fontSize: 15, fontWeight: '600', color: '#18181B' },
  description: { fontSize: 13, lineHeight: 20, color: '#71717A' },
  button: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#1D4ED8',
  },
  buttonLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
