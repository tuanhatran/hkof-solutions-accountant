import { Building2 } from "lucide-react";
import type { ReactNode } from "react";

/** Card section of the company configuration, with its icon header. */
export function SettingsCardSection({
  icon: IconComponent,
  title,
  description,
  bodyClassName,
  children,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  bodyClassName: string;
  children: ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
          <IconComponent size={17} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg text-ink">{title}</h2>
          <p className="mt-0.5 text-xs text-ink-soft">{description}</p>
        </div>
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
