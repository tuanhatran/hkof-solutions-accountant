import "./AdminLlmPage.css";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { LlmAdvancedSection } from "./LlmAdvancedSection";
import { LlmConnectionSection } from "./LlmConnectionSection";
import { LlmRemoteWarning } from "./LlmRemoteWarning";
import { LlmSaveBar } from "./LlmSaveBar";
import { LlmStatusCard } from "./LlmStatusCard";
import { useAdminLlmPage } from "./useAdminLlmPage";

/** LLM administration page (local Ollama configuration and connection test). */
export function AdminLlmPage() {
  const { t } = useTranslation();
  const c = useAdminLlmPage();

  if (c.config.isPending) {
    return (
      <>
        <PageHeader
          eyebrow={t("adminLlm.page.eyebrow")}
          title={t("adminLlm.page.title")}
        />
        <LoadingState message={t("adminLlm.page.loading")} />
      </>
    );
  }

  if (c.config.isError) {
    return (
      <>
        <PageHeader
          eyebrow={t("adminLlm.page.eyebrow")}
          title={t("adminLlm.page.title")}
        />
        <ErrorState
          message={errorMessage(c.config.error)}
          onRetry={() => void c.config.refetch()}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={t("adminLlm.page.eyebrow")}
        title={t("adminLlm.page.title")}
        description={t("adminLlm.page.description")}
      />

      <LlmStatusCard c={c} />

      {c.remoteUrl ? <LlmRemoteWarning /> : null}

      <form
        id="form-llm"
        className="admin-llm-page-form"
        onSubmit={c.handleSubmit((submittedValues) =>
          c.save.mutate(submittedValues),
        )}
        noValidate
      >
        <LlmConnectionSection c={c} />
        <LlmAdvancedSection c={c} />

        {c.save.isError ? (
          <p className="admin-llm-page-error" role="alert">
            {errorMessage(c.save.error)}
          </p>
        ) : null}

        <LlmSaveBar c={c} />
      </form>
    </>
  );
}
