import "./SettingsPage.css";
import { useState } from "react";
import { SignaturesManager } from "@/components/signatures/SignaturesManager";
import { RentReceiptSettings } from "@/components/settings/RentReceiptSettings";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/cn";
import { useCompanyStore } from "@/state/company";
import { CompanySection } from "./CompanySection";

const TABS = [
  { value: "entreprise", label: "Entreprise", dataCy: "onglet-entreprise" },
  { value: "quittances", label: "Quittances", dataCy: "onglet-quittances" },
] as const;

type Tab = (typeof TABS)[number]["value"];

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>("entreprise");
  const activeCompanyId = useCompanyStore((state) => state.activeCompanyId);

  return (
    <>
      <PageHeader
        eyebrow="Réglages"
        title="Configuration"
        description="Gérez plusieurs sociétés, leurs baux, leurs salariés, leurs signatures et les données des quittances. Les calculs restent effectués par le backend."
      />

      <div
        className="segmented settings-page-tabs"
        role="tablist"
        aria-label="Sections de la configuration"
      >
        {TABS.map((candidate) => (
          <button
            key={candidate.value}
            type="button"
            role="tab"
            aria-selected={tab === candidate.value}
            onClick={() => setTab(candidate.value)}
            className={cn(
              "segmented-item settings-page-tab",
              tab === candidate.value && "segmented-item-active",
            )}
            data-cy={candidate.dataCy}
          >
            {candidate.label}
          </button>
        ))}
      </div>

      {tab === "quittances" ? (
        <div className="settings-page-sections">
          <RentReceiptSettings />
          <SignaturesManager companyId={activeCompanyId} />
        </div>
      ) : (
        <CompanySection />
      )}
    </>
  );
}
