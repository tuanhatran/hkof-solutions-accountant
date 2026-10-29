import "./TemplatesPage.css";
import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { TemplatesCard } from "./TemplatesCard";
import { TEMPLATE_CONFIGURATIONS } from "./templateTypes";

/** Dedicated templates page: one card per document type, one sandbox notice. */
export function TemplatesPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        eyebrow={t("templates.page.eyebrow")}
        title={t("templates.page.title")}
        description={t("templates.page.description")}
      />
      <div className="templates-page-grid">
        {TEMPLATE_CONFIGURATIONS.map((configuration) => (
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
