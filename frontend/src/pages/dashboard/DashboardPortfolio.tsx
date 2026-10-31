import { FileText, Home, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AddressDto, LeaseDto } from "@/api/types";
import { formatEUR } from "@/lib/format";

export interface DashboardLandlord {
  name: string;
  phone: string | null;
  propertyAddress?: string;
}

interface DashboardPortfolioProps {
  addressList: AddressDto[];
  leaseList: LeaseDto[];
  landlords: DashboardLandlord[];
}

export function DashboardPortfolio({
  addressList,
  leaseList,
  landlords,
}: DashboardPortfolioProps) {
  const { t } = useTranslation();

  return (
    <section className="dashboard-portfolio">
      <h2 className="dashboard-portfolio-title">
        {t("dashboard.portfolio.title")}
      </h2>
      <div className="dashboard-portfolio-grid">
        <div className="dashboard-portfolio-card">
          <h3 className="dashboard-section-header">
            <Home size={16} aria-hidden="true" />
            {t("dashboard.portfolio.propertiesTitle")}
          </h3>
          {addressList.length === 0 ? (
            <p className="dashboard-empty">
              {t("dashboard.portfolio.propertiesEmpty")}
            </p>
          ) : (
            <div className="dashboard-list">
              {addressList.slice(0, 6).map((addr) => {
                const count = leaseList.filter(
                  (l) => l.addressId === addr.id,
                ).length;
                return (
                  <div key={addr.id} className="dashboard-list-item">
                    <span className="dashboard-list-primary">{addr.label}</span>
                    <span className="dashboard-list-secondary">
                      {count}{" "}
                      {count > 1
                        ? t("dashboard.kpis.leasesUnitPlural")
                        : t("dashboard.kpis.leasesUnit")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="dashboard-portfolio-card">
          <h3 className="dashboard-section-header">
            <Users size={16} aria-hidden="true" />
            {t("dashboard.portfolio.landlordsTitle")}
          </h3>
          {landlords.length === 0 ? (
            <p className="dashboard-empty">
              {t("dashboard.portfolio.landlordsEmpty")}
            </p>
          ) : (
            <div className="dashboard-list">
              {landlords.slice(0, 6).map((l) => (
                <div key={l.name} className="dashboard-list-item">
                  <span className="dashboard-list-primary">{l.name}</span>
                  {l.phone ? (
                    <span className="dashboard-list-secondary">{l.phone}</span>
                  ) : null}
                  {l.propertyAddress ? (
                    <span className="dashboard-list-secondary">
                      {l.propertyAddress}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-portfolio-card">
          <h3 className="dashboard-section-header">
            <FileText size={16} aria-hidden="true" />
            {t("dashboard.portfolio.tenantsTitle")}
          </h3>
          {leaseList.length === 0 ? (
            <p className="dashboard-empty">
              {t("dashboard.portfolio.tenantsEmpty")}
            </p>
          ) : (
            <div className="dashboard-list">
              {leaseList.slice(0, 6).map((lease) => {
                const total =
                  (Number(lease.rentExclCharges) || 0) +
                  (Number(lease.charges) || 0);
                const isColoc = Boolean(
                  lease.tenantIds && lease.tenantIds.length > 1,
                );
                return (
                  <div key={lease.id} className="dashboard-list-item">
                    <span className="dashboard-list-primary">
                      {lease.tenantName ||
                        lease.companyName ||
                        t("dashboard.portfolio.headers.tenant")}
                    </span>
                    <span className="dashboard-list-secondary">
                      {formatEUR(total)} — {lease.propertyAddress}
                    </span>
                    <span className="dashboard-list-tag">
                      {isColoc
                        ? t("dashboard.portfolio.colocation")
                        : t("dashboard.portfolio.individual")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
