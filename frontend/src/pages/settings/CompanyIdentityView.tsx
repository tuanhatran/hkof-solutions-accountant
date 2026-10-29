import "./CompanyIdentityView.css";
import { Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const rows: { label: string; value: string | null | undefined }[] = [
    { label: t("settings.company.identity.fields.name"), value: company.name },
    {
      label: t("settings.company.identity.fields.legalForm"),
      value: company.legalForm,
    },
    {
      label: t("settings.company.identity.fields.siren"),
      value: company.siren,
    },
    {
      label: t("settings.company.identity.fields.address"),
      value: company.address,
    },
    {
      label: t("settings.company.identity.fields.managerName"),
      value: company.managerName,
    },
    {
      label: t("settings.company.identity.fields.issuePlace"),
      value: company.issuePlace,
    },
  ];

  return (
    <section className="company-identity-view">
      <SectionHeader
        icon={Building2}
        title={t("settings.company.identity.sectionTitle")}
        description={t("settings.company.identity.viewDescription")}
        action={
          <Button
            variant="secondary"
            small
            onClick={onEdit}
            data-cy="btn-modifier-societe"
          >
            {t("settings.company.identity.edit")}
          </Button>
        }
      />
      <dl
        className="card-body company-identity-view-body"
        data-cy="company-information"
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
