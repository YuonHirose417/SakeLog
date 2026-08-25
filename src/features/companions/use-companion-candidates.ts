import { useEffect, useState } from 'react';

import { findAllCompanions } from '@/repositories/companion-repository';

import { useDataRevision } from '@/store/use-app-store';

import type { Companion } from '@/types/companion';

type UseCompanionCandidatesResult = {
  candidates: Companion[];
  loading: boolean;
};

/**
 * 同行者の候補一覧（要件定義 §4.2）。
 *
 * 並び順はリポジトリの ORDER BY（last_used_at 降順）をそのまま使う。
 * UI 側で並べ替えないこと。直近に飲んだ人が上位に来るのが要件。
 *
 * 記録を保存すると use_count / last_used_at が変わるため、dataRevision を購読して引き直す。
 */
export function useCompanionCandidates(): UseCompanionCandidatesResult {
  const dataRevision = useDataRevision();
  const [candidates, setCandidates] = useState<Companion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const rows = await findAllCompanions();

        if (!cancelled) {
          setCandidates(rows);
        }
      } catch {
        // 候補が引けなくても記録自体は続けられるので、握りつぶして空のまま進む
        if (!cancelled) {
          setCandidates([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [dataRevision]);

  return { candidates, loading };
}
