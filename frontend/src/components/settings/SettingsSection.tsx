import type { ReactNode } from "react";
import type { Landmark } from "lucide-react";

/** Shared card header of the settings sections. */
export function SectionHeader({
  icon: IconComponent,
  title,
  description,
  action,
}: {
  icon: typeof Landmark;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="card-header">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
          <IconComponent size={17} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl text-ink">{title}</h2>
          <p className="mt-0.5 text-xs text-ink-soft">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

/** Dashed empty state of a settings list. */
export function EmptyState({ text, dataCy }: { text: string; dataCy: string }) {
  return (
    <p
      className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-soft"
      data-cy={dataCy}
    >
      {text}
    </p>
  );
}
