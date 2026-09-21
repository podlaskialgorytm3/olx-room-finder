"use client";

import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { formatPln } from "@/lib/format";

interface RangeSliderFieldProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: [number | undefined, number | undefined];
  onChange: (value: [number | undefined, number | undefined]) => void;
}

export function RangeSliderField({ label, min, max, step = 50, value, onChange }: RangeSliderFieldProps) {
  const [local, setLocal] = useState<[number, number]>([value[0] ?? min, value[1] ?? max]);

  useEffect(() => {
    setLocal([value[0] ?? min, value[1] ?? max]);
  }, [value, min, max]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-xs text-muted-foreground">
          {formatPln(local[0])} — {formatPln(local[1])}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={local}
        onValueChange={(v) => setLocal([v[0], v[1]])}
        onValueCommit={(v) =>
          onChange([v[0] === min ? undefined : v[0], v[1] === max ? undefined : v[1]])
        }
      />
    </div>
  );
}
