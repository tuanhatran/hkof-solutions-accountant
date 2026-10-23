import { FilePlus2, FileText } from "lucide-react";
import { api } from "@/api/endpoints";
import type { RentReceiptDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatEUR } from "@/lib/format";
import { PdfActionLink, OpenPdfLink, VersionBadge } from "./HistoryActions";
import { pairLabel, sortRentReceiptsDesc, type MonthGroup } from "./historyHelpers";

/** Rent receipt column of a month: latest version, actions and full history. */
export function RentReceiptMonthPanel({
  group,
  rentReceipt,
  onCreate,
}: {
  group: MonthGroup;
  rentReceipt: RentReceiptDto | null;
  onCreate: (month: string) => void;
}) {
  const rentReceiptHistory = sortRentReceiptsDesc(group.rentReceipts);

  return (
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
              <PdfActionLink
                href={api.rentReceipts.pdfUrl(rentReceipt.id)}
                label="Télécharger le PDF"
                dataCy={`btn-telecharger-quittance-${group.month}`}
              />
              <OpenPdfLink href={api.rentReceipts.pdfUrl(rentReceipt.id)} />
            </>
          ) : null}
        </div>
      ) : (
        <Button
          variant="secondary"
          small
          icon={<FilePlus2 size={13} />}
          className="mt-4"
          onClick={() => onCreate(group.month)}
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
            Toutes les quittances du mois ({group.rentReceipts.length})
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
                  <span className="text-ink">{pairLabel(version)}</span>
                  <span className="text-ink-soft">
                    {formatDateTime(version.createdAt)}
                  </span>
                  <span className="font-medium text-ink number">
                    {formatEUR(version.total)}
                  </span>
                </span>
                {version.id ? (
                  <PdfActionLink
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
  );
}
