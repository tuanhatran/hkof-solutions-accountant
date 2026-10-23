import { cn } from "@/lib/cn";

export interface ViewTab {
  value: string;
  label: string;
  /** Shows a small update dot, used when a fresh preview is available. */
  updated?: boolean;
  /** Extra classes for the tab button. */
  className?: string;
}

interface ViewTabsProps {
  ariaLabel: string;
  tabs: ViewTab[];
  active: string;
  onChange: (value: string) => void;
}

/** Two-panel switcher shown below 1024 px on the generation pages. */
export function ViewTabs({ ariaLabel, tabs, active, onChange }: ViewTabsProps) {
  return (
    <div className="segmented w-full" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={active === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "segmented-item flex-1",
            tab.className,
            active === tab.value && "segmented-item-active",
          )}
        >
          {tab.label}
          {tab.updated ? (
            <span
              className="h-1.5 w-1.5 rounded-full bg-accent"
              aria-hidden="true"
            />
          ) : null}
        </button>
      ))}
    </div>
  );
}
