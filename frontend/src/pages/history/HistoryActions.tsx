import "./HistoryActions.css";
import { Download, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

/** PDF download link of a history entry. */
export function PdfActionLink({
  href,
  label: labelText,
  dataCy,
}: {
  href: string;
  label: string;
  dataCy?: string;
}) {
  return (
    <a href={href} className="history-actions-pdf-link" data-cy={dataCy}>
      <Download size={12} aria-hidden="true" />
      {labelText}
    </a>
  );
}

/** Opens a document PDF in a new tab. */
export function OpenPdfLink({ href }: { href: string }) {
  const { t } = useTranslation();

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="history-actions-open-link"
    >
      <ExternalLink size={12} aria-hidden="true" />
      {t("history.actions.open")}
    </a>
  );
}

/** Active/archived badge of a document version. */
export function VersionBadge({
  version,
  active,
}: {
  version: number;
  active: boolean;
}) {
  return active ? (
    <span className="badge badge-accent">v{version}</span>
  ) : (
    <span className="badge badge-neutral">v{version}</span>
  );
}
