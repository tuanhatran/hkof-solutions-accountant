import "./LlmConnectionSection.css";
import {
  Activity,
  AlertTriangle,
  Bot,
  Cpu,
  RefreshCw,
  Save,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { AdminLlmController } from "./useAdminLlmPage";
import { LlmApiKeyField } from "./LlmApiKeyField";
import { LlmTestFeedback } from "./LlmTestFeedback";
import { LlmToggle } from "./LlmToggle";

/** Main Ollama connection card of the LLM admin page. */
export function LlmConnectionSection({ c }: { c: AdminLlmController }) {
  const { t } = useTranslation();

  return (
    <section className="card llm-connection-section">
      <div className="card-header">
        <div className="llm-connection-section-heading">
          <span className="llm-connection-section-icon">
            <Bot size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 className="llm-connection-section-title">
              {t("adminLlm.connection.title")}
            </h2>
            <p className="llm-connection-section-subtitle">
              {t("adminLlm.connection.subtitle")}
            </p>
          </div>
        </div>
        <div className="llm-connection-section-status">
          <span className="llm-connection-section-status-text">
            {c.active
              ? t("adminLlm.connection.enabled")
              : t("adminLlm.connection.disabled")}
          </span>
          <LlmToggle
            enabled={c.active}
            onChange={() =>
              c.setValue("active", !c.active, { shouldDirty: true })
            }
          />
        </div>
      </div>

      <div className="card-body llm-connection-section-body">
        {!c.active ? (
          <div className="llm-connection-section-notice">
            <AlertTriangle
              size={15}
              className="llm-connection-section-notice-icon"
              aria-hidden="true"
            />
            {t("adminLlm.connection.notice")}
          </div>
        ) : null}

        <div className="llm-connection-section-grid">
          <FieldGroup
            id="llm-fournisseur"
            label={t("adminLlm.connection.provider")}
          >
            <select
              id="llm-fournisseur"
              className="field"
              value="OLLAMA"
              disabled
            >
              <option value="OLLAMA">
                {t("adminLlm.connection.providerOllama")}
              </option>
              <option value="OPENAI" disabled>
                {t("adminLlm.connection.providerOpenAi")}
              </option>
            </select>
          </FieldGroup>

          <FieldGroup
            id="llm-url"
            label={t("adminLlm.connection.urlLabel")}
            error={c.errors.url?.message}
            help={t("adminLlm.connection.urlHelp")}
          >
            <div className="llm-connection-section-url-row">
              <input
                id="llm-url"
                className={cn("field", c.errors.url && "field-error")}
                placeholder="http://host.docker.internal:11434"
                autoComplete="off"
                spellCheck={false}
                {...c.register("url")}
                onBlur={c.onUrlBlur}
                data-cy="input-llm-url"
              />
              <Button
                variant="secondary"
                className="llm-connection-section-refresh"
                icon={
                  <RefreshCw
                    size={15}
                    className={cn(c.listLoading && "animate-spin")}
                  />
                }
                disabled={c.listLoading}
                onClick={() => void c.refreshModels(true)}
                aria-label={t("adminLlm.connection.refreshAria")}
                data-cy="btn-refresh-models"
              >
                {t("adminLlm.connection.refresh")}
              </Button>
            </div>
          </FieldGroup>
        </div>

        <div className="llm-connection-section-grid">
          <FieldGroup
            id="llm-modele"
            label={t("adminLlm.connection.modelLabel")}
            error={c.errors.model?.message}
            help={
              c.selectedModel
                ? `${c.selectedModel.family || t("adminLlm.connection.unknownFamily")}${c.selectedModel.parameters ? ` · ${c.selectedModel.parameters}` : ""}${c.selectedModel.vision ? t("adminLlm.connection.visionSuffix") : ""}`
                : t("adminLlm.connection.modelHelp")
            }
          >
            {!c.manualMode ? (
              <select
                id="llm-modele"
                className={cn("field", c.errors.model && "field-error")}
                value={c.values.model}
                onChange={(event) => {
                  const choice = event.target.value;
                  if (choice === "__manuel__") {
                    c.setManualMode(true);
                    return;
                  }
                  c.setValue("model", choice, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                disabled={c.listLoading && c.modelOptions.length === 0}
                data-cy="select-llm-model"
              >
                <option value="" disabled>
                  {c.listLoading && c.modelOptions.length === 0
                    ? t("adminLlm.connection.loadingModels")
                    : t("adminLlm.connection.selectModel")}
                </option>
                {c.modelOptions.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name}
                    {model.vision ? t("adminLlm.connection.visionTag") : ""}
                    {model.parameters ? ` · ${model.parameters}` : ""}
                    {model.configure
                      ? t("adminLlm.connection.configuredTag")
                      : ""}
                  </option>
                ))}
                <option value="__manuel__">
                  {t("adminLlm.connection.manualEntry")}
                </option>
              </select>
            ) : null}

            {c.manualMode ? (
              <div className="llm-connection-section-manual">
                <input
                  id="llm-modele"
                  className={cn("field mt-0", c.errors.model && "field-error")}
                  placeholder="qwen2.5:7b"
                  autoComplete="off"
                  spellCheck={false}
                  {...c.register("model")}
                  data-cy="input-llm-model"
                />
                {c.models.data && c.models.data.length > 0 ? (
                  <button
                    type="button"
                    className="llm-connection-section-manual-link"
                    onClick={() => c.setManualMode(false)}
                  >
                    {t("adminLlm.connection.chooseFromList")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </FieldGroup>

          <div className="llm-connection-section-vision-column">
            <div className="llm-connection-section-vision">
              <p className="llm-connection-section-vision-title">
                <Cpu
                  size={14}
                  className="llm-connection-section-vision-icon"
                  aria-hidden="true"
                />
                {t("adminLlm.connection.visionTitle")}
              </p>
              <p className="llm-connection-section-vision-text">
                {c.selectedModel?.vision
                  ? t("adminLlm.connection.visionAccepted")
                  : t("adminLlm.connection.visionRejected")}
              </p>
            </div>
            {c.selectedModel && c.selectedModel.configure ? (
              <p className="llm-connection-section-vision-warning">
                {t("adminLlm.connection.configuredWarning")}
              </p>
            ) : null}
          </div>
        </div>

        {c.modelsError || c.models.isError ? (
          <div className="llm-connection-section-error" role="alert">
            <p className="llm-connection-section-error-title">
              {t("adminLlm.connection.modelsErrorTitle")}
            </p>
            <p className="llm-connection-section-error-message">
              {c.modelsError ?? errorMessage(c.models.error)}
            </p>
            <p className="llm-connection-section-error-hint">
              {t("adminLlm.connection.modelsErrorHint")}
            </p>
          </div>
        ) : null}

        <LlmApiKeyField c={c} />

        <div className="llm-connection-section-footer">
          <p className="llm-connection-section-footer-note">
            {t("adminLlm.connection.footerNote")}
          </p>
          <div className="llm-connection-section-actions">
            <Button
              variant="secondary"
              icon={<Activity size={14} />}
              loading={c.testInProgress}
              onClick={() => void c.runTest()}
              data-cy="btn-test-basic-llm"
            >
              {t("adminLlm.connection.testConnection")}
            </Button>
            <Button
              variant="primary"
              type="submit"
              icon={<Save size={14} />}
              loading={c.save.isPending}
            >
              {t("adminLlm.connection.save")}
            </Button>
          </div>
        </div>

        <LlmTestFeedback c={c} />
      </div>
    </section>
  );
}
