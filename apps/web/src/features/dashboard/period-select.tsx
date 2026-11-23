import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isPeriodPreset, PERIOD_LABELS, type PeriodPreset } from '@/lib/period';

export function PeriodSelect({
  value,
  onChange,
}: {
  value: PeriodPreset;
  onChange: (value: PeriodPreset) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (isPeriodPreset(next)) {
          onChange(next);
        }
      }}
    >
      <SelectTrigger className="w-44" aria-label="Period">
        <SelectValue>{PERIOD_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map((key) => (
          <SelectItem key={key} value={key}>
            {PERIOD_LABELS[key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}