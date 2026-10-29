import "./LmnpPage.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { LeaseSection } from "@/components/settings/LeaseSection";
import { PersonnesSection } from "@/components/settings/PersonnesSection";
import { useRentReceiptSettings } from "@/components/settings/useRentReceiptSettings";
import { cn } from "@/lib/cn";
import { RENT_RECEIPT_CONFIGURATION } from "@/pages/templates/templateTypes";
import { TemplatesTab } from "@/pages/templates/TemplatesTab";

type Tab = "baux" | "personnes" | "templates";

function LeasesTab() {
  const c = useRentReceiptSettings();
  return <LeaseSection c={c} />;
}

/** LMNP settings: leases and addresses, natural persons, rent receipt templates. */
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
      value: "personnes",
      label: t("settings.lmnp.tabs.persons"),
      dataCy: "tab-persons",
    },
    {
      value: "templates",
      label: t("settings.lmnp.tabs.templates"),
      dataCy: "tab-lmnp-templates",
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
        {tab === "personnes" ? <PersonnesSection /> : null}
        {tab === "templates" ? (
          <TemplatesTab configuration={RENT_RECEIPT_CONFIGURATION} />
        ) : null}
      </div>
    </>
  );
}
