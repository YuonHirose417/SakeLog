import { useState } from 'react';

import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useCompanionCandidates } from '@/features/companions/use-companion-candidates';

type CompanionInputProps = {
  /** 選択済みの同行者名。 */
  value: readonly string[];
  onChange: (names: string[]) => void;
  /** 「一人で飲んだ」が ON のときに true。入力もチップ操作も受け付けない。 */
  disabled?: boolean;
};

/**
 * 同行者の入力欄（要件定義 §4.2）。
 *
 * 挙動の要件：
 * - 候補が0件のときは候補チップを一切描画せず、通常のテキスト入力だけにする
 * - 候補が1件以上あるときは、入力欄にフォーカスが入ったら候補チップを出す
 * - 並び順は last_used_at 降順（useCompanionCandidates が返す順をそのまま使う）
 * - 複数選択でき、候補に無い名前はテキスト入力から新規追加できる
 *
 * 保存時の UPSERT はリポジトリ層が担当する。ここでは名前の配列を持つだけ。
 */
export function CompanionInput({ value, onChange, disabled = false }: CompanionInputProps) {
  const { candidates } = useCompanionCandidates();
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);

  const addName = (name: string) => {
    const trimmed = name.trim();

    if (trimmed.length === 0 || value.includes(trimmed)) {
      setDraft('');
      return;
    }

    onChange([...value, trimmed]);
    setDraft('');
  };

  const removeName = (name: string) => {
    onChange(value.filter((selected) => selected !== name));
  };

  // 選択済みの人は候補から外す
  const availableCandidates = candidates.filter((candidate) => !value.includes(candidate.name));

  // 候補が0件のときはプルダウン（候補チップ）を出さない
  const showCandidates = focused && availableCandidates.length > 0 && !disabled;

  return (
    <View style={styles.container}>
      {value.length > 0 && (
        <View style={styles.selectedRow}>
          {value.map((name) => (
            <Pressable
              key={name}
              onPress={() => !disabled && removeName(name)}
              disabled={disabled}
              style={[styles.selectedChip, disabled && styles.chipDisabled]}
              accessibilityRole="button"
              accessibilityLabel={`${name} を外す`}
            >
              <Text style={styles.selectedChipText}>{name}</Text>
              <Text style={styles.removeMark}>×</Text>
            </Pressable>
          ))}
        </View>
      )}

      <TextInput
        value={draft}
        onChangeText={setDraft}
        onFocus={() => setFocused(true)}
        // 候補チップのタップより先に blur が走らないよう、閉じるのを少し遅らせる
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onSubmitEditing={() => addName(draft)}
        submitBehavior="submit"
        editable={!disabled}
        placeholder={disabled ? '「一人で飲んだ」が選ばれています' : '名前を入力して追加'}
        placeholderTextColor="#A1A1AA"
        style={[styles.input, disabled && styles.inputDisabled]}
        accessibilityLabel="同行者"
      />

      {showCandidates && (
        <View style={styles.candidateRow}>
          {availableCandidates.map((candidate) => (
            <Pressable
              key={candidate.id}
              onPress={() => addName(candidate.name)}
              style={styles.candidateChip}
              accessibilityRole="button"
              accessibilityLabel={`${candidate.name} を追加`}
            >
              <Text style={styles.candidateChipText}>{candidate.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  selectedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#E8EFFD',
  },
  selectedChipText: { fontSize: 14, color: '#1D4ED8' },
  removeMark: { fontSize: 15, color: '#1D4ED8' },
  chipDisabled: { backgroundColor: '#F4F4F5' },
  input: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4D4D8',
    fontSize: 15,
    color: '#18181B',
  },
  inputDisabled: { backgroundColor: '#F4F4F5', color: '#A1A1AA' },
  candidateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  candidateChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D4D4D8',
  },
  candidateChipText: { fontSize: 14, color: '#3F3F46' },
});
