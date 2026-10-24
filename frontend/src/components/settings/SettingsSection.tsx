import "./SettingsSection.css";
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
      <div className="settings-section-heading">
        <span className="settings-section-icon">
          <IconComponent size={17} aria-hidden="true" />
        </span>
        <div>
          <h2 className="settings-section-title">{title}</h2>
          <p className="settings-section-description">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

/** Dashed empty state of a settings list. */
export function EmptyState({ text, dataCy }: { text: string; dataCy: string }) {
  return (
    <p className="settings-section-empty" data-cy={dataCy}>
      {text}
    </p>
  );
}
