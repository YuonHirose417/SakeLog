import { Pressable, StyleSheet, Text, View } from 'react-native';

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** 一覧が空のときの表示。次にとれる行動を1つだけ示す。 */
export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {description !== undefined && <Text style={styles.description}>{description}</Text>}

      {actionLabel !== undefined && onAction !== undefined && (
        <Pressable onPress={onAction} style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonLabel}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 32,
  },
  title: { fontSize: 16, fontWeight: '600', color: '#18181B' },
  description: { fontSize: 14, lineHeight: 21, color: '#71717A', textAlign: 'center' },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#1D4ED8',
  },
  buttonLabel: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
