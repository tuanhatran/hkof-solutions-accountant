import "./LlmAdvancedSection.css";
import { RotateCcw, Server, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { AdminLlmController } from "./useAdminLlmPage";

/** Collapsible advanced extraction settings (sampling, OCR, prompt). */
export function LlmAdvancedSection({ c }: { c: AdminLlmController }) {
  return (
    <details className="card group llm-advanced-section">
      <summary className="card-header llm-advanced-section-summary">
        <div className="llm-advanced-section-heading">
          <span className="llm-advanced-section-icon">
            <Sparkles size={16} aria-hidden="true" />
          </span>
          <div>
            <h2 className="llm-advanced-section-title">Paramètres avancés</h2>
            <p className="llm-advanced-section-subtitle">
              Délai, température, contexte, pages analysées, OCR et prompt
              d’extraction.
            </p>
          </div>
        </div>
        <span className="llm-advanced-section-more">Afficher</span>
        <span className="llm-advanced-section-less">Masquer</span>
      </summary>

      <div className="card-body llm-advanced-section-body">
        <div className="llm-advanced-section-grid">
          <FieldGroup
            id="llm-timeout"
            label="Délai (secondes)"
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
            label="Température"
            error={c.errors.temperature?.message}
            help="0 = réponses déterministes, recommandé."
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
            label="Contexte (num_ctx)"
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
            label="Pages max analysées"
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
              OCR Tesseract en secours
            </span>
            <span className="llm-advanced-section-ocr-text">
              À activer si Tesseract est installé sur le serveur : extrait le
              texte des justificatifs image ou scannés avant l’analyse.
            </span>
          </span>
        </label>

        <div>
          <div className="llm-advanced-section-prompt-header">
            <label htmlFor="llm-prompt" className="field-label">
              Prompt d’extraction
            </label>
            <Button
              variant="secondary"
              small
              icon={<RotateCcw size={13} />}
              loading={c.promptInProgress}
              onClick={() => void c.resetPrompt()}
              data-cy="btn-reinitialiser-prompt"
            >
              Réinitialiser le prompt par défaut
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
            <p className="hint">
              Le prompt système interdit au modèle d’obéir aux instructions
              contenues dans un document et impose un JSON validé par le
              serveur. Le modèle ne calcule jamais de montant.
            </p>
          )}
        </div>

        <div className="llm-advanced-section-note">
          <Server
            size={15}
            className="llm-advanced-section-note-icon"
            aria-hidden="true"
          />
          <p>
            Les valeurs par défaut conviennent à un usage local : 120 s,
            température 0, contexte 8 192 et 5 pages. Un délai trop court
            interrompt l’analyse sans bloquer la saisie manuelle.
          </p>
        </div>
      </div>
    </details>
  );
}
