import "./LmnpPage.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { LandlordsSection } from "@/components/settings/LandlordsSection";
import { LeaseSection } from "@/components/settings/LeaseSection";
import { TenantsSection } from "@/components/settings/TenantsSection";
import { useRentReceiptSettings } from "@/components/settings/useRentReceiptSettings";
import { cn } from "@/lib/cn";
import { AgencySection } from "./AgencySection";

type Tab = "baux" | "bailleurs" | "locataires" | "agence";

function LeasesTab() {
  const c = useRentReceiptSettings();
  return <LeaseSection c={c} />;
}

/** LMNP settings: leases and addresses, landlords, tenants and the agency. */
export function LmnpPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("baux");
  const tabs = [
    {
      value: "baux",
      label: t("settings.lmnp.tabs.leases"),
      dataCy: "tab-leases",
    },
    {
      value: "bailleurs",
      label: t("settings.lmnp.tabs.landlords"),
      dataCy: "tab-landlords",
    },
    {
      value: "locataires",
      label: t("settings.lmnp.tabs.tenants"),
      dataCy: "tab-tenants",
    },
    {
      value: "agence",
      label: t("settings.lmnp.tabs.agency"),
      dataCy: "tab-agency",
    },
  ] as const;

  return (
    <>
      <PageHeader
        eyebrow={t("settings.lmnp.eyebrow")}
        title={t("settings.lmnp.title")}
        description={t("settings.lmnp.description")}
      />

      <div
        className="segmented lmnp-page-tabs"
        role="tablist"
        aria-label={t("settings.lmnp.tabsAria")}
      >
        {tabs.map((candidate) => (
          <button
            key={candidate.value}
            type="button"
            role="tab"
            aria-selected={tab === candidate.value}
            onClick={() => setTab(candidate.value)}
            className={cn(
              "segmented-item lmnp-page-tab",
              tab === candidate.value && "segmented-item-active",
            )}
            data-cy={candidate.dataCy}
          >
            {candidate.label}
          </button>
        ))}
      </div>

      <div className="lmnp-page-sections">
        {tab === "baux" ? <LeasesTab /> : null}
        {tab === "bailleurs" ? <LandlordsSection /> : null}
        {tab === "locataires" ? <TenantsSection /> : null}
        {tab === "agence" ? <AgencySection /> : null}
      </div>
    </>
  );
}
