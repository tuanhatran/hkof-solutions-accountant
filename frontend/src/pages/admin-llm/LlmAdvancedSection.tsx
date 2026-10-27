import "./LlmAdvancedSection.css";
import { RotateCcw, Server, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { AdminLlmController } from "./useAdminLlmPage";

/** Collapsible advanced extraction settings (sampling, OCR, prompt). */
export function LlmAdvancedSection({ c }: { c: AdminLlmController }) {
  const { t } = useTranslation();

  return (
    <details className="card group llm-advanced-section">
      <summary className="card-header llm-advanced-section-summary">
        <div className="llm-advanced-section-heading">
          <span className="llm-advanced-section-icon">
            <Sparkles size={16} aria-hidden="true" />
          </span>
          <div>
            <h2 className="llm-advanced-section-title">
              {t("adminLlm.advanced.title")}
            </h2>
            <p className="llm-advanced-section-subtitle">
              {t("adminLlm.advanced.subtitle")}
            </p>
          </div>
        </div>
        <span className="llm-advanced-section-more">
          {t("adminLlm.advanced.show")}
        </span>
        <span className="llm-advanced-section-less">
          {t("adminLlm.advanced.hide")}
        </span>
      </summary>

      <div className="card-body llm-advanced-section-body">
        <div className="llm-advanced-section-grid">
          <FieldGroup
            id="llm-timeout"
            label={t("adminLlm.advanced.timeoutLabel")}
            error={c.errors.timeoutSeconds?.message}
          >
            <input
              id="llm-timeout"
              type="number"
              min={5}
              max={600}
              step={1}
              className={cn("field", c.errors.timeoutSeconds && "field-error")}
              {...c.register("timeoutSeconds", { valueAsNumber: true })}
            />
          </FieldGroup>
          <FieldGroup
            id="llm-temperature"
            label={t("adminLlm.advanced.temperatureLabel")}
            error={c.errors.temperature?.message}
            help={t("adminLlm.advanced.temperatureHelp")}
          >
            <input
              id="llm-temperature"
              className={cn("field", c.errors.temperature && "field-error")}
              inputMode="decimal"
              {...c.register("temperature")}
            />
          </FieldGroup>
          <FieldGroup
            id="llm-numctx"
            label={t("adminLlm.advanced.numCtxLabel")}
            error={c.errors.numCtx?.message}
          >
            <input
              id="llm-numctx"
              type="number"
              min={1024}
              max={131072}
              step={1024}
              className={cn("field", c.errors.numCtx && "field-error")}
              {...c.register("numCtx", { valueAsNumber: true })}
            />
          </FieldGroup>
          <FieldGroup
            id="llm-pages"
            label={t("adminLlm.advanced.maxPagesLabel")}
            error={c.errors.maxPages?.message}
          >
            <input
              id="llm-pages"
              type="number"
              min={1}
              max={20}
              step={1}
              className={cn("field", c.errors.maxPages && "field-error")}
              {...c.register("maxPages", { valueAsNumber: true })}
            />
          </FieldGroup>
        </div>

        <label className="llm-advanced-section-ocr">
          <input
            type="checkbox"
            className="llm-advanced-section-checkbox"
            {...c.register("ocrActive")}
          />
          <span>
            <span className="llm-advanced-section-ocr-title">
              {t("adminLlm.advanced.ocrTitle")}
            </span>
            <span className="llm-advanced-section-ocr-text">
              {t("adminLlm.advanced.ocrText")}
            </span>
          </span>
        </label>

        <div>
          <div className="llm-advanced-section-prompt-header">
            <label htmlFor="llm-prompt" className="field-label">
              {t("adminLlm.advanced.promptLabel")}
            </label>
            <Button
              variant="secondary"
              small
              icon={<RotateCcw size={13} />}
              loading={c.promptInProgress}
              onClick={() => void c.resetPrompt()}
              data-cy="btn-reinitialiser-prompt"
            >
              {t("adminLlm.advanced.resetPrompt")}
            </Button>
          </div>
          <textarea
            id="llm-prompt"
            rows={12}
            spellCheck={false}
            className={cn(
              "field llm-advanced-section-prompt",
              c.errors.extractionPrompt && "field-error",
            )}
            {...c.register("extractionPrompt")}
            data-cy="input-llm-prompt"
          />
          {c.errors.extractionPrompt ? (
            <p className="error-text" role="alert">
              {c.errors.extractionPrompt.message}
            </p>
          ) : (
            <p className="hint">{t("adminLlm.advanced.promptHint")}</p>
          )}
        </div>

        <div className="llm-advanced-section-note">
          <Server
            size={15}
            className="llm-advanced-section-note-icon"
            aria-hidden="true"
          />
          <p>{t("adminLlm.advanced.defaultsNote")}</p>
        </div>
      </div>
    </details>
  );
}
