import { Download, ExternalLink } from "lucide-react";

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
    <a
      href={href}
      className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-medium text-accent transition hover:bg-accent-soft"
      data-cy={dataCy}
    >
      <Download size={12} aria-hidden="true" />
      {labelText}
    </a>
  );
}

/** Opens a document PDF in a new tab. */
export function OpenPdfLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-medium text-ink-soft transition hover:bg-paper-deep hover:text-ink"
    >
      <ExternalLink size={12} aria-hidden="true" />
      Ouvrir
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
    <span className="badge badge-accent">v{version} · active</span>
  ) : (
    <span className="badge badge-neutral">v{version} · archivée</span>
  );
}
