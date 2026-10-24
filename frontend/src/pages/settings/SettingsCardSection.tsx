import "./SettingsCardSection.css";
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
    <section className="card settings-card-section">
      <div className="settings-card-section-header">
        <span className="settings-card-section-icon">
          <IconComponent size={17} aria-hidden="true" />
        </span>
        <div>
          <h2 className="settings-card-section-title">{title}</h2>
          <p className="settings-card-section-description">{description}</p>
        </div>
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
