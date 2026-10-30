import "./TemplatesPage.css";
import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useModuleAccess } from "@/api/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { TemplatesCard } from "./TemplatesCard";
import { TEMPLATE_CONFIGURATIONS } from "./templateTypes";

/** Dedicated templates page: one card per active document type, one sandbox notice. */
export function TemplatesPage() {
  const { t } = useTranslation();
  const access = useModuleAccess();
  const configurations = TEMPLATE_CONFIGURATIONS.filter((configuration) =>
    configuration.type === "RENT_RECEIPT"
      ? access.lmnpEnabled
      : access.companyEnabled,
  );

  return (
    <>
      <PageHeader
        eyebrow={t("templates.page.eyebrow")}
        title={t("templates.page.title")}
        description={t("templates.page.description")}
      />
      <div className="templates-page-grid">
        {configurations.map((configuration) => (
          <TemplatesCard
            key={configuration.type}
            configuration={configuration}
          />
        ))}
      </div>
      <div className="templates-page-warning">
        <ShieldCheck
          size={16}
          className="templates-page-warning-icon"
          aria-hidden="true"
        />
        <p>{t("templates.page.warning")}</p>
      </div>
    </>
  );
}
