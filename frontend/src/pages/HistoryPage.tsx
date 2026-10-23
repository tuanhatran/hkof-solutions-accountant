import {
  Archive,
  Download,
  ExternalLink,
  FileCheck2,
  FilePlus2,
  FileText,
  History,
  PencilLine,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { useStatements, useRentReceipts } from "@/api/queries";
import type { StatementDto, RentReceiptDto } from "@/api/types";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LoadingState, ErrorState, EmptyState } from "@/components/States";
import { PageHeader } from "@/components/PageHeader";
import { formatDateTime, formatEUR, formatMonth } from "@/lib/format";
import { useStatementDraft } from "@/state/statementDraft";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { toast } from "@/state/toasts";

interface MonthGroup {
  month: string;
  rentReceipts: RentReceiptDto[];
  statements: StatementDto[];
}

function current<T extends { status?: string }>(documents: T[]): T | null {
  return (
    documents.find((document) => document.status === "ACTIVE") ??
    documents[0] ??
    null
  );
}

/** Latest receipt of a month, whatever landlord+tenant pairs coexist. */
function latestReceipt(documents: RentReceiptDto[]): RentReceiptDto | null {
  return (
    [...documents].sort((left, right) => {
      const byDate = (right.createdAt ?? "").localeCompare(
        left.createdAt ?? "",
      );
      return byDate !== 0 ? byDate : (right.id ?? 0) - (left.id ?? 0);
    })[0] ?? null
  );
}

function pairLabel(document: RentReceiptDto): string {
  return `${document.landlordName ?? "Bailleur inconnu"} → ${
    document.tenantName ?? "Locataire inconnu"
  }`;
}

function VersionBadge({
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

function ActionsPdf({
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

export function HistoryPage() {
  const navigate = useNavigate();
  const rentReceiptsQuery = useRentReceipts();
  const statementsQuery = useStatements();
  const [statementToReload, setStatementToReload] =
    useState<StatementDto | null>(null);

  const groups = useMemo<MonthGroup[]>(() => {
    const byMonth = new Map<string, MonthGroup>();
    for (const rentReceipt of rentReceiptsQuery.data ?? []) {
      if (!rentReceipt.month) {
        continue;
      }
      const group = byMonth.get(rentReceipt.month) ?? {
        month: rentReceipt.month,
        rentReceipts: [],
        statements: [],
      };
      group.rentReceipts.push(rentReceipt);
      byMonth.set(rentReceipt.month, group);
    }
    for (const statement of statementsQuery.data ?? []) {
      if (!statement.month) {
        continue;
      }
      const group = byMonth.get(statement.month) ?? {
        month: statement.month,
        rentReceipts: [],
        statements: [],
      };
      group.statements.push(statement);
      byMonth.set(statement.month, group);
    }
    return [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month));
  }, [rentReceiptsQuery.data, statementsQuery.data]);

  const loading = rentReceiptsQuery.isPending || statementsQuery.isPending;
  const errorText = rentReceiptsQuery.isError
    ? errorMessage(rentReceiptsQuery.error)
    : statementsQuery.isError
      ? errorMessage(statementsQuery.error)
      : null;

  function reload() {
    void rentReceiptsQuery.refetch();
    void statementsQuery.refetch();
  }

  function createRentReceipt(month: string) {
    useRentReceiptDraft.getState().changeMonth(month);
    navigate("/generer/quittance");
  }

  function createStatement(month: string) {
    useStatementDraft.getState().changeMonth(month);
    navigate("/generer/note-frais");
  }

  function confirmReload() {
    if (!statementToReload?.month) {
      return;
    }
    const rentReceipt = current(
      groups.find((group) => group.month === statementToReload.month)
        ?.rentReceipts ?? [],
    );
    useStatementDraft
      .getState()
      .loadFromStatement(statementToReload, rentReceipt?.id ?? null);
    setStatementToReload(null);
    toast.info(
      `Lignes de ${formatMonth(statementToReload.month)} rechargées dans le brouillon.`,
    );
    navigate("/generer/note-frais");
  }

  return (
    <>
      <PageHeader
        eyebrow="Suivi"
        title="Historique"
        description="Toutes les versions de vos quittances et notes de frais, classées par mois. Les versions archivées restent téléchargeables et consultables."
        actions={
          <span className="badge badge-neutral">
            <History size={12} aria-hidden="true" />
            {groups.length} mois suivi{groups.length > 1 ? "s" : ""}
          </span>
        }
      />

      {errorText ? (
        <div className="mb-4">
          <ErrorState message={errorText} onRetry={reload} />
        </div>
      ) : null}

      {loading && groups.length === 0 ? (
        <LoadingState message="Chargement de l’historique…" />
      ) : groups.length === 0 && !errorText ? (
        <EmptyState
          title="Aucun document pour le moment"
          description="Générez une quittance ou une note de frais : elle apparaîtra ici, avec toutes ses versions."
          icon={<Archive size={22} aria-hidden="true" />}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="primary"
                onClick={() => navigate("/generer/quittance")}
              >
                Générer une quittance
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate("/generer/note-frais")}
              >
                Générer une note de frais
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-4" data-cy="historique">
          {groups.map((group) => {
            const rentReceipt = latestReceipt(group.rentReceipts);
            const rentReceiptHistory = [...group.rentReceipts].sort(
              (left, right) => {
                const byDate = (right.createdAt ?? "").localeCompare(
                  left.createdAt ?? "",
                );
                return byDate !== 0
                  ? byDate
                  : (right.id ?? 0) - (left.id ?? 0);
              },
            );
            const statement = current(group.statements);
            return (
              <section
                key={group.month}
                className="card overflow-hidden"
                data-cy={`historique-mois-${group.month}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper/45 px-5 py-3.5 sm:px-6">
                  <div>
                    <p className="eyebrow">Mois</p>
                    <h2 className="mt-1 text-[22px] text-ink">
                      {formatMonth(group.month)}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={
                        rentReceipt
                          ? "badge badge-accent"
                          : "badge badge-neutral"
                      }
                    >
                      Quittance{" "}
                      {group.rentReceipts.length > 1
                        ? `(${group.rentReceipts.length})`
                        : rentReceipt
                          ? `v${rentReceipt.version ?? 1}`
                          : "non générée"}
                    </span>
                    <span
                      className={
                        statement ? "badge badge-accent" : "badge badge-neutral"
                      }
                    >
                      Note{" "}
                      {statement ? `v${statement.version ?? 1}` : "non générée"}
                    </span>
                  </div>
                </div>

                <div className="grid divide-y divide-line lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
                          <FileText size={17} aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="text-[15px] font-semibold text-ink">
                            Quittance de loyer
                          </h3>
                          {rentReceipt ? (
                            <>
                              <p className="text-xs text-ink-soft">
                                Version {rentReceipt.version ?? 1} ·{" "}
                                {formatDateTime(rentReceipt.createdAt)}
                              </p>
                              <p
                                className="text-xs text-ink-soft"
                                data-cy={`quittance-active-${group.month}`}
                              >
                                {pairLabel(rentReceipt)}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-ink-soft">
                              Aucune version pour ce mois.
                            </p>
                          )}
                        </div>
                      </div>
                      {rentReceipt ? (
                        <p className="font-display text-xl text-ink number">
                          {formatEUR(rentReceipt.total)}
                        </p>
                      ) : null}
                    </div>

                    {rentReceipt ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {rentReceipt.id ? (
                          <>
                            <ActionsPdf
                              href={api.rentReceipts.pdfUrl(rentReceipt.id)}
                              label="Télécharger le PDF"
                              dataCy={`btn-telecharger-quittance-${group.month}`}
                            />
                            <a
                              href={api.rentReceipts.pdfUrl(rentReceipt.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-medium text-ink-soft transition hover:bg-paper-deep hover:text-ink"
                            >
                              <ExternalLink size={12} aria-hidden="true" />
                              Ouvrir
                            </a>
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        small
                        icon={<FilePlus2 size={13} />}
                        className="mt-4"
                        onClick={() => createRentReceipt(group.month)}
                      >
                        Générer la quittance
                      </Button>
                    )}

                    {group.rentReceipts.length > 1 ? (
                      <details
                        className="mt-4 rounded-xl border border-line bg-paper/35 px-3 py-2"
                        data-cy={`quittances-mois-${group.month}`}
                      >
                        <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
                          Toutes les quittances du mois (
                          {group.rentReceipts.length})
                        </summary>
                        <ul className="mt-2 space-y-1.5">
                          {rentReceiptHistory.map((version) => (
                            <li
                              key={version.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-xs"
                              data-cy={`historique-quittance-${version.id}`}
                            >
                              <span className="flex flex-wrap items-center gap-2">
                                <VersionBadge
                                  version={version.version ?? 1}
                                  active={version.status === "ACTIVE"}
                                />
                                <span className="text-ink">
                                  {pairLabel(version)}
                                </span>
                                <span className="text-ink-soft">
                                  {formatDateTime(version.createdAt)}
                                </span>
                                <span className="font-medium text-ink number">
                                  {formatEUR(version.total)}
                                </span>
                              </span>
                              {version.id ? (
                                <ActionsPdf
                                  href={api.rentReceipts.pdfUrl(version.id)}
                                  label="PDF"
                                />
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </div>

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
                            <ActionsPdf
                              href={api.expenseStatements.pdfUrl(
                                statement.id,
                                false,
                              )}
                              label="Note seule"
                              dataCy={`btn-telecharger-note-${group.month}`}
                            />
                            <ActionsPdf
                              href={api.expenseStatements.zipUrl(statement.id)}
                              label="Note complète (ZIP)"
                              dataCy={`btn-telecharger-note-complete-${group.month}`}
                            />
                            <a
                              href={api.expenseStatements.pdfUrl(
                                statement.id,
                                true,
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-medium text-ink-soft transition hover:bg-paper-deep hover:text-ink"
                            >
                              <ExternalLink size={12} aria-hidden="true" />
                              Ouvrir
                            </a>
                          </>
                        ) : null}
                        <Button
                          variant="ghost"
                          small
                          icon={<PencilLine size={13} />}
                          onClick={() => setStatementToReload(statement)}
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
                        onClick={() => createStatement(group.month)}
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
                                    <ActionsPdf
                                      href={api.expenseStatements.pdfUrl(
                                        version.id,
                                        false,
                                      )}
                                      label="PDF"
                                    />
                                    <ActionsPdf
                                      href={api.expenseStatements.pdfUrl(
                                        version.id,
                                        true,
                                      )}
                                      label="Complète"
                                    />
                                  </>
                                ) : null}
                                <button
                                  type="button"
                                  className="rounded-lg px-1.5 py-1 text-[11px] font-medium text-accent transition hover:bg-accent-soft"
                                  onClick={() => setStatementToReload(version)}
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
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={statementToReload !== null}
        title="Rouvrir cette note ?"
        message={
          statementToReload ? (
            <>
              Les lignes de la version {statementToReload.version ?? 1} de{" "}
              {formatMonth(statementToReload.month)} remplaceront le brouillon
              de ce mois dans l’onglet Note de frais. Les brouillons des autres
              mois sont conservés.
            </>
          ) : null
        }
        confirmLabel="Charger les lignes"
        onConfirm={confirmReload}
        onCancel={() => setStatementToReload(null)}
        dataCy="dialogue-rouvrir-note"
      />
    </>
  );
}
