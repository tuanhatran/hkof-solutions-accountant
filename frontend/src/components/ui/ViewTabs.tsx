import "./ViewTabs.css";
import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface ViewTab {
  value: string;
  label: string;
  /** Shows a small update dot, used when a fresh preview is available. */
  updated?: boolean;
  /** Extra classes for the tab button. */
  className?: string;
  /** E2E hook placed on the tab button. */
  dataCy?: string;
  /** Id of the panel controlled by this tab, exposed as `aria-controls`. */
  panelId?: string;
}

interface ViewTabsProps {
  ariaLabel: string;
  idPrefix: string;
  tabs: ViewTab[];
  active: string;
  onChange: (value: string) => void;
}

/** Two-panel switcher shown below 1024 px on the generation pages. */
export function ViewTabs({
  ariaLabel,
  idPrefix,
  tabs,
  active,
  onChange,
}: ViewTabsProps) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight":
        nextIndex = (index + 1) % tabs.length;
        break;
      case "ArrowLeft":
        nextIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    buttons.current[nextIndex]?.focus();
    onChange(tabs[nextIndex].value);
  }

  return (
    <div className="segmented view-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab, index) => (
        <button
          key={tab.value}
          ref={(element) => {
            buttons.current[index] = element;
          }}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${tab.value}`}
          aria-selected={active === tab.value}
          aria-controls={tab.panelId}
          tabIndex={active === tab.value ? 0 : -1}
          onClick={() => onChange(tab.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          data-cy={tab.dataCy}
          className={cn(
            "segmented-item view-tabs-item",
            tab.className,
            active === tab.value && "segmented-item-active",
          )}
        >
          {tab.label}
          {tab.updated ? (
            <span className="view-tabs-dot" aria-hidden="true" />
          ) : null}
        </button>
      ))}
    </div>
  );
}
