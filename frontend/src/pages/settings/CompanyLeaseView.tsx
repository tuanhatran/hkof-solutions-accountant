import "./CompanyLeaseView.css";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div className="company-lease-view">
      {lease ? (
        <div className="company-lease-view-details" data-cy="bail-societe-lie">
          <p className="company-lease-view-details-meta">
            {t("settings.company.leaseView.surfaces", {
              businessArea: decimalFormatter(lease.businessArea) || "—",
              totalArea: decimalFormatter(lease.totalArea) || "—",
            })}
          </p>
          <p className="company-lease-view-details-meta">
            {t("settings.company.leaseView.proRata", {
              percentage: formatPercentage(proRataBase),
            })}
          </p>
        </div>
      ) : (
        <p className="company-lease-view-empty" data-cy="aucun-bail-societe">
          {t("settings.company.leaseView.empty")}
        </p>
      )}
    </div>
  );
}
