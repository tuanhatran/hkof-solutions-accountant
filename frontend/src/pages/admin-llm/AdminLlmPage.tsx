import "./AdminLlmPage.css";
import { Activity, Save } from "lucide-react";
import { errorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
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
  const c = useAdminLlmPage();

  if (c.config.isPending) {
    return (
      <>
        <PageHeader eyebrow="Réglages" title="Admin IA" />
        <LoadingState message="Chargement de la configuration IA…" />
      </>
    );
  }

  if (c.config.isError) {
    return (
      <>
        <PageHeader eyebrow="Réglages" title="Admin IA" />
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
        eyebrow="Réglages"
        title="Admin IA"
        description="Ollama reste local par défaut. Le modèle ne fait que proposer une extraction : tous les montants sont vérifiés et calculés par le backend."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Activity size={15} />}
              loading={c.testInProgress}
              onClick={() => void c.runTest()}
              data-cy="btn-test-llm"
            >
              Tester la connexion
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="form-llm"
              icon={<Save size={15} />}
              loading={c.save.isPending}
              data-cy="btn-enregistrer-llm"
            >
              Enregistrer
            </Button>
          </>
        }
      />

      <LlmStatusCard />

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
