import "./DashboardPage.css";
import {
  Banknote,
  Building2,
  FilePlus2,
  FileText,
  Home,
  PlusCircle,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  useAddresses,
  useAgency,
  useAuthState,
  useLeases,
  usePersons,
} from "@/api/queries";
import type { LeaseDto } from "@/api/types";
import { formatEUR } from "@/lib/format";
import { DashboardPortfolio } from "./DashboardPortfolio";
import { OnboardingProgressCard } from "./OnboardingProgressCard";

function uniqueTenantCount(leases: LeaseDto[]): number {
  const tenants = new Set<string>();
  for (const lease of leases) {
    if (lease.tenantIds && lease.tenantIds.length > 0) {
      for (const id of lease.tenantIds) {
        tenants.add(`id:${id}`);
      }
    } else if (lease.tenantId) {
      tenants.add(`id:${lease.tenantId}`);
    } else if (lease.tenantName) {
      tenants.add(`name:${lease.tenantName.trim().toLowerCase()}`);
    } else if (lease.companyId) {
      tenants.add(`company:${lease.companyId}`);
    }
  }
  return tenants.size;
}

function calculateTotalMonthlyRent(leases: LeaseDto[]): number {
  return leases.reduce((sum, lease) => {
    const rent = Number(lease.rentExclCharges ?? 0);
    const charges = Number(lease.charges ?? 0);
    const validRent = Number.isFinite(rent) ? rent : 0;
    const validCharges = Number.isFinite(charges) ? charges : 0;
    return sum + validRent + validCharges;
  }, 0);
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthState();
  const agencyQuery = useAgency();
  const persons = usePersons();
  const addresses = useAddresses();
  const leases = useLeases();

  const agency = agencyQuery.data;
  const isPersonal = Boolean(agency?.isPersonal);
  const addressList = addresses.data ?? [];
  const leaseList = leases.data ?? [];
  const personList = persons.data ?? [];

  const managerName =
    agency?.managerName ||
    personList[0]?.name ||
    t("dashboard.agencyProfile.notSpecified");
  const sirenSiret = isPersonal
    ? "—"
    : agency?.siret ||
      agency?.siren ||
      t("dashboard.agencyProfile.notSpecified");
  const agencyAddress = isPersonal
    ? agency?.address || t("dashboard.agencyProfile.personalManagement")
    : agency?.address || t("dashboard.agencyProfile.notSpecified");
  const agencyName =
    agency?.name ||
    (isPersonal
      ? t("dashboard.agencyProfile.personalManagement")
      : t("dashboard.agencyProfile.notSpecified"));

  const totalMonthlyRent = calculateTotalMonthlyRent(leaseList);
  const tenantsCount = uniqueTenantCount(leaseList);

  const landlords = Array.from(
    new Map(
      leaseList
        .filter((lease) => lease.landlordName)
        .map((lease) => [
          lease.landlordId ?? lease.landlordName,
          {
            name: lease.landlordName as string,
            phone:
              personList.find((p) => p.id === lease.landlordId)?.phone ?? null,
            propertyAddress: lease.propertyAddress,
          },
        ]),
    ).values(),
  );

  return (
    <div className="dashboard-page" data-cy="dashboard-page">
      <header className="dashboard-header">
        <p className="dashboard-eyebrow">{t("dashboard.eyebrow")}</p>
        <h1 className="dashboard-title">{t("dashboard.title")}</h1>
        <p className="dashboard-description">{t("dashboard.description")}</p>
      </header>

      {user?.onboardingCompleted === false ? <OnboardingProgressCard /> : null}

      <section
        className="dashboard-card"
        data-testid="agency-profile-card"
        aria-labelledby="agency-profile-heading"
      >
        <div className="dashboard-profile-header">
          <div className="dashboard-profile-icon" aria-hidden="true">
            <Building2 size={20} />
          </div>
          <h2 id="agency-profile-heading" className="dashboard-profile-title">
            {t("dashboard.agencyProfile.title")}
          </h2>
        </div>
        <div className="dashboard-profile-grid">
          <div className="dashboard-profile-item">
            <span className="dashboard-profile-label">
              {t("dashboard.agencyProfile.name")}
            </span>
            <span
              className="dashboard-profile-value"
              title={agencyName}
              data-cy="dashboard-agency-name"
            >
              {agencyName}
            </span>
          </div>
          <div className="dashboard-profile-item">
            <span className="dashboard-profile-label">
              {t("dashboard.agencyProfile.manager")}
            </span>
            <span className="dashboard-profile-value" title={managerName}>
              {managerName}
            </span>
          </div>
          <div className="dashboard-profile-item">
            <span className="dashboard-profile-label">
              {t("dashboard.agencyProfile.identifier")}
            </span>
            <span className="dashboard-profile-value" title={sirenSiret}>
              {sirenSiret}
            </span>
          </div>
          <div className="dashboard-profile-item">
            <span className="dashboard-profile-label">
              {t("dashboard.agencyProfile.address")}
            </span>
            <span className="dashboard-profile-value" title={agencyAddress}>
              {agencyAddress}
            </span>
          </div>
        </div>
      </section>

      <section
        className="dashboard-kpi-grid"
        aria-label={t("dashboard.kpis.monthlyRent")}
      >
        <div className="dashboard-kpi-card" data-testid="kpi-properties">
          <div className="dashboard-kpi-info">
            <span
              className="dashboard-kpi-value"
              data-cy="dashboard-kpi-properties"
            >
              {addressList.length}
            </span>
            <span className="dashboard-kpi-label">
              {t("dashboard.kpis.properties")}
            </span>
          </div>
          <div className="dashboard-kpi-icon" aria-hidden="true">
            <Home size={22} />
          </div>
        </div>

        <div className="dashboard-kpi-card" data-testid="kpi-leases">
          <div className="dashboard-kpi-info">
            <span
              className="dashboard-kpi-value"
              data-cy="dashboard-kpi-leases"
            >
              {leaseList.length}
            </span>
            <span className="dashboard-kpi-label">
              {t("dashboard.kpis.leases")}
            </span>
          </div>
          <div className="dashboard-kpi-icon" aria-hidden="true">
            <FileText size={22} />
          </div>
        </div>

        <div className="dashboard-kpi-card" data-testid="kpi-tenants">
          <div className="dashboard-kpi-info">
            <span
              className="dashboard-kpi-value"
              data-cy="dashboard-kpi-tenants"
            >
              {tenantsCount}
            </span>
            <span className="dashboard-kpi-label">
              {t("dashboard.kpis.tenants")}
            </span>
          </div>
          <div className="dashboard-kpi-icon" aria-hidden="true">
            <Users size={22} />
          </div>
        </div>

        <div className="dashboard-kpi-card" data-testid="kpi-rent">
          <div className="dashboard-kpi-info">
            <span className="dashboard-kpi-value" data-cy="dashboard-kpi-rent">
              {formatEUR(totalMonthlyRent)}
            </span>
            <span className="dashboard-kpi-label">
              {t("dashboard.kpis.monthlyRent")}
            </span>
          </div>
          <div className="dashboard-kpi-icon" aria-hidden="true">
            <Banknote size={22} />
          </div>
        </div>
      </section>

      <section
        className="dashboard-actions-card"
        aria-labelledby="dashboard-actions-heading"
      >
        <h2 id="dashboard-actions-heading" className="dashboard-actions-title">
          {t("dashboard.quickActions.title")}
        </h2>
        <div className="dashboard-actions-list">
          <Link
            to="/generate/rent-receipt"
            className="dashboard-action-btn-primary"
            data-cy="action-generate-receipt"
          >
            <FilePlus2 size={16} aria-hidden="true" />
            {t("dashboard.quickActions.generateReceipt")}
          </Link>
          <Link
            to="/settings/agency"
            className="dashboard-action-btn-secondary"
            data-cy="action-add-property"
          >
            <PlusCircle size={16} aria-hidden="true" />
            {t("dashboard.quickActions.addProperty")}
          </Link>
          <Link
            to="/settings/agency"
            className="dashboard-action-btn-secondary"
            data-cy="action-manage-leases"
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            {t("dashboard.quickActions.manageLeases")}
          </Link>
        </div>
      </section>

      <DashboardPortfolio
        addressList={addressList}
        leaseList={leaseList}
        landlords={landlords}
      />
    </div>
  );
}
