import "./LmnpPage.css";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LeaseSection } from "@/components/settings/LeaseSection";
import { PersonnesSection } from "@/components/settings/PersonnesSection";
import { useRentReceiptSettings } from "@/components/settings/useRentReceiptSettings";
import { cn } from "@/lib/cn";

const TABS = [
  { value: "baux", label: "Baux et adresses", dataCy: "onglet-baux" },
  { value: "personnes", label: "Personnes", dataCy: "onglet-personnes" },
] as const;

type Tab = (typeof TABS)[number]["value"];

function LeasesTab() {
  const c = useRentReceiptSettings();
  return <LeaseSection c={c} />;
}

/** LMNP settings: leases and addresses first, then natural persons. */
export function LmnpPage() {
  const [tab, setTab] = useState<Tab>("baux");

  return (
    <>
      <PageHeader
        eyebrow="Réglages"
        title="LMNP"
        description="Baux et adresses du logement, et personnes physiques bailleurs ou locataires avec leurs signatures."
      />

      <div
        className="segmented lmnp-page-tabs"
        role="tablist"
        aria-label="Sections LMNP"
      >
        {TABS.map((candidate) => (
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
        {tab === "baux" ? <LeasesTab /> : <PersonnesSection />}
      </div>
    </>
  );
}
