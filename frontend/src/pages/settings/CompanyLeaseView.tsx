import "./CompanyLeaseView.css";
import type { LeaseDto } from "@/api/types";
import { decimalFormatter } from "@/components/settings/settingsMoney";
import { formatPercentage } from "@/lib/format";

/**
 * Lease details of the company in the "Baux & Frais" tab: the inline expanded
 * region of the selected lease, or the French no-lease sentence when none is
 * selected. The pro-rata always comes from the backend, never recomputed here.
 */
export function CompanyLeaseView({
  lease,
  proRataBase,
}: {
  lease: LeaseDto | null;
  proRataBase: string | null;
}) {
  return (
    <div className="company-lease-view">
      {lease ? (
        <div className="company-lease-view-details" data-cy="bail-societe-lie">
          <p className="company-lease-view-details-meta">
            Surface professionnelle{" "}
            {decimalFormatter(lease.businessArea) || "—"} m² · Surface totale{" "}
            {decimalFormatter(lease.totalArea) || "—"} m²
          </p>
          <p className="company-lease-view-details-meta">
            Quote-part professionnelle {formatPercentage(proRataBase)}
          </p>
        </div>
      ) : (
        <p className="company-lease-view-empty" data-cy="aucun-bail-societe">
          Aucun bail sélectionné : la société n’a pas de quote-part
          professionnelle.
        </p>
      )}
    </div>
  );
}
