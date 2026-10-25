import "./CompanyIdentityView.css";
import { Building2 } from "lucide-react";
import type { CompanyDto } from "@/api/types";
import { SectionHeader } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";

function orDash(value: string | null | undefined): string {
  return value && value.trim() !== "" ? value : "—";
}

/** Read-only identity of the selected company, shown in the "Info générale" tab. */
export function CompanyIdentityView({
  company,
  onEdit,
}: {
  company: CompanyDto;
  onEdit: () => void;
}) {
  const rows: { label: string; value: string | null | undefined }[] = [
    { label: "Raison sociale", value: company.name },
    { label: "Forme juridique", value: company.legalForm },
    { label: "SIREN", value: company.siren },
    { label: "Adresse", value: company.address },
    { label: "Gérant", value: company.managerName },
    { label: "Lieu d’émission", value: company.issuePlace },
  ];

  return (
    <section className="card company-identity-view">
      <SectionHeader
        icon={Building2}
        title="Identité de la société"
        description="Valeurs utilisées en en-tête des quittances et notes de frais."
        action={
          <Button
            variant="secondary"
            small
            onClick={onEdit}
            data-cy="btn-modifier-societe"
          >
            Modifier
          </Button>
        }
      />
      <dl
        className="card-body company-identity-view-body"
        data-cy="info-societe"
      >
        {rows.map((row) => (
          <div key={row.label} className="company-identity-view-row">
            <dt className="company-identity-view-row-label">{row.label}</dt>
            <dd className="company-identity-view-row-value">
              {orDash(row.value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
