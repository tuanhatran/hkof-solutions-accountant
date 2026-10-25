import "./SettingsPage.css";
import { PageHeader } from "@/components/layout/PageHeader";
import { CompanySection } from "./CompanySection";

/** Enterprise settings: companies, employees and expense items. */
export function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Réglages · Configuration"
        title="Entreprise"
        description="Gérez vos sociétés, leurs salariés signataires et leurs postes de frais. Les calculs restent effectués par le backend."
      />
      <CompanySection />
    </>
  );
}
