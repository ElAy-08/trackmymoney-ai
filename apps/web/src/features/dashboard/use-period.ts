import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  isPeriodPreset,
  resolvePeriod,
  type PeriodPreset,
} from '@/lib/period';

const DEFAULT_PRESET: PeriodPreset = 'this-month';

export function usePeriod() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('period');
  const preset = isPeriodPreset(raw) ? raw : DEFAULT_PRESET;

  const period = useMemo(() => resolvePeriod(preset), [preset]);

  function setPreset(next: PeriodPreset) {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === DEFAULT_PRESET) {
          params.delete('period');
        } else {
          params.set('period', next);
        }
        return params;
      },
      { replace: true },
    );
  }

  return { preset, period, setPreset };
}