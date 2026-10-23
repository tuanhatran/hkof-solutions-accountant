import { RotateCcw, Server, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { AdminLlmController } from "./useAdminLlmPage";

/** Collapsible advanced extraction settings (sampling, OCR, prompt). */
export function LlmAdvancedSection({ c }: { c: AdminLlmController }) {
  return (
    <details className="card group overflow-hidden">
      <summary className="card-header cursor-pointer list-none">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-paper-deep text-ink-soft">
            <Sparkles size={16} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl text-ink">Paramètres avancés</h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              Délai, température, contexte, pages analysées, OCR et prompt
              d’extraction.
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-ink-soft group-open:hidden">
          Afficher
        </span>
        <span className="hidden text-xs font-medium text-ink-soft group-open:inline">
          Masquer
        </span>
      </summary>

      <div className="card-body space-y-5 border-t border-line">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              className={cn(
                "field",
                c.errors.timeoutSeconds && "field-error",
              )}
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

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper/35 p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-line accent-[#1b5b49]"
            {...c.register("ocrActive")}
          />
          <span>
            <span className="block text-sm font-medium text-ink">
              OCR Tesseract en secours
            </span>
            <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-soft">
              À activer si Tesseract est installé sur le serveur : extrait le
              texte des justificatifs image ou scannés avant l’analyse.
            </span>
          </span>
        </label>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
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
              "field resize-y font-mono text-[12.5px] leading-relaxed",
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

        <div className="flex items-start gap-2 rounded-xl border border-line bg-paper/30 p-3 text-[11.5px] leading-relaxed text-ink-soft">
          <Server
            size={15}
            className="mt-0.5 shrink-0 text-accent"
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
