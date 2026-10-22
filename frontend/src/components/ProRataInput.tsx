import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { parsePercentage } from "@/lib/format";

interface ProRataInputProps {
  label: string;
  /** Last valid percentage stored in the draft, e.g. "35.71". */
  value: string;
  onChange: (value: string) => void;
}

/**
 * Editable pro-rata cell of the expense line table.
 *
 * The displayed text is local to the input so a slow page re-render can never
 * overwrite characters typed in the meantime. Only parseable percentages are
 * committed to the draft; the last valid value is restored on blur when the
 * field is left empty or invalid.
 */
export function ProRataInput({ label, value, onChange }: ProRataInputProps) {
  const [text, setText] = useState(value);
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) {
      setText(value);
    }
  }, [value]);

  const valid = parsePercentage(text) !== null;

  return (
    <div className="relative w-[92px]">
      <input
        inputMode="decimal"
        className={cn(
          "field mt-0 px-2 py-1 pr-6 text-xs",
          !valid && "field-error",
        )}
        value={text}
        onChange={(event) => {
          editing.current = true;
          const next = event.target.value;
          setText(next);
          const parsed = parsePercentage(next);
          if (parsed !== null) {
            onChange(parsed);
          }
        }}
        onBlur={(event) => {
          editing.current = false;
          const parsed = parsePercentage(event.target.value);
          if (parsed === null) {
            setText(value);
            return;
          }
          setText(parsed);
          if (parsed !== value) {
            onChange(parsed);
          }
        }}
        aria-label={label}
        aria-invalid={!valid}
      />
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-ink-soft">
        %
      </span>
    </div>
  );
}
