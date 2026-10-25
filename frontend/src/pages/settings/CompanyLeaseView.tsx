import "./CompanyLeaseView.css";
import { KeyRound } from "lucide-react";
import type { LeaseDto } from "@/api/types";
import { decimalFormatter } from "@/components/settings/settingsMoney";
import { SectionHeader } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { formatEUR, formatPercentage } from "@/lib/format";

/** Read-only lease of the selected company, shown in the "Bail & Frais" tab. */
export function CompanyLeaseView({
  lease,
  proRataBase,
  onEdit,
}: {
  lease: LeaseDto | null;
  proRataBase: string | null;
  onEdit: () => void;
}) {
  return (
    <section className="card company-lease-view">
      <SectionHeader
        icon={KeyRound}
        title="Bail de la société"
        description="Le bail lié fixe l’adresse du logement et la quote-part professionnelle calculée par le backend."
        action={
          <Button
            variant="secondary"
            small
            onClick={onEdit}
            data-cy="btn-modifier-bail-societe"
          >
            Modifier
          </Button>
        }
      />
      <div className="card-body company-lease-view-body">
        {lease ? (
          <div
            className="company-lease-view-details"
            data-cy="bail-societe-lie"
          >
            <p className="company-lease-view-details-address">
              {lease.propertyAddress ?? "—"}
            </p>
            <p className="company-lease-view-details-meta">
              Loyer {formatEUR(lease.rentExclCharges)} · Charges{" "}
              {formatEUR(lease.charges)}
            </p>
            <p className="company-lease-view-details-meta">
              Surface professionnelle{" "}
              {decimalFormatter(lease.businessArea) || "—"} m² · Surface totale{" "}
              {decimalFormatter(lease.totalArea) || "—"} m²
            </p>
          </div>
        ) : (
          <p className="company-lease-view-empty" data-cy="aucun-bail-societe">
            Aucun bail sélectionné : la société n’a pas de quote-part
            professionnelle.
          </p>
        )}
        <p className="company-lease-view-prorata">
          <span className="company-lease-view-prorata-label">
            Quote-part professionnelle
          </span>
          <span
            className="company-lease-view-prorata-value"
            data-cy="prorata-bail-societe"
          >
            {formatPercentage(proRataBase)}
          </span>
        </p>
      </div>
    </section>
  );
}
