import { FileCheck2, FilePlus2, PencilLine } from "lucide-react";
import { api } from "@/api/endpoints";
import type { StatementDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatEUR } from "@/lib/format";
import { PdfActionLink, OpenPdfLink, VersionBadge } from "./HistoryActions";
import type { MonthGroup } from "./historyHelpers";

/** Expense statement column of a month: latest version, actions and history. */
export function StatementMonthPanel({
  group,
  statement,
  onCreate,
  onReload,
}: {
  group: MonthGroup;
  statement: StatementDto | null;
  onCreate: (month: string) => void;
  onReload: (statement: StatementDto) => void;
}) {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-copper-soft text-copper">
            <FileCheck2 size={17} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold text-ink">
              Note de frais d’occupation
            </h3>
            {statement ? (
              <p className="text-xs text-ink-soft">
                Version {statement.version ?? 1} ·{" "}
                {formatDateTime(statement.createdAt)}
                {statement.templateName
                  ? ` · ${statement.templateName} v${statement.templateVersion ?? 1}`
                  : ""}
              </p>
            ) : (
              <p className="text-xs text-ink-soft">
                Aucune version pour ce mois.
              </p>
            )}
          </div>
        </div>
        {statement ? (
          <p className="font-display text-xl text-ink number">
            {formatEUR(statement.total)}
          </p>
        ) : null}
      </div>

      {statement ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {statement.id ? (
            <>
              <PdfActionLink
                href={api.expenseStatements.pdfUrl(statement.id, false)}
                label="Note seule"
                dataCy={`btn-telecharger-note-${group.month}`}
              />
              <PdfActionLink
                href={api.expenseStatements.zipUrl(statement.id)}
                label="Note complète (ZIP)"
                dataCy={`btn-telecharger-note-complete-${group.month}`}
              />
              <OpenPdfLink
                href={api.expenseStatements.pdfUrl(statement.id, true)}
              />
            </>
          ) : null}
          <Button
            variant="ghost"
            small
            icon={<PencilLine size={13} />}
            onClick={() => onReload(statement)}
            data-cy={`btn-rouvrir-note-${group.month}`}
          >
            Rouvrir et modifier
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          small
          icon={<FilePlus2 size={13} />}
          className="mt-4"
          onClick={() => onCreate(group.month)}
        >
          Générer la note
        </Button>
      )}

      {group.statements.length > 1 ? (
        <details className="mt-4 rounded-xl border border-line bg-paper/35 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
            Toutes les versions ({group.statements.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {group.statements.map((version) => (
              <li
                key={version.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-xs"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <VersionBadge
                    version={version.version ?? 1}
                    active={version.status === "ACTIVE"}
                  />
                  <span className="text-ink-soft">
                    {formatDateTime(version.createdAt)}
                  </span>
                  <span className="font-medium text-ink number">
                    {formatEUR(version.total)}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  {version.id ? (
                    <>
                      <PdfActionLink
                        href={api.expenseStatements.pdfUrl(version.id, false)}
                        label="PDF"
                      />
                      <PdfActionLink
                        href={api.expenseStatements.pdfUrl(version.id, true)}
                        label="Complète"
                      />
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-lg px-1.5 py-1 text-[11px] font-medium text-accent transition hover:bg-accent-soft"
                    onClick={() => onReload(version)}
                  >
                    Charger
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
