import {
  Activity,
  AlertTriangle,
  Bot,
  Cpu,
  RefreshCw,
  Save,
} from "lucide-react";
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
  return (
    <section className="card overflow-hidden">
      <div className="card-header">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
            <Bot size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl text-ink">Connexion Ollama</h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              Fournisseur local, URL, modèle et authentification éventuelle.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-ink-soft">
            {c.active ? "Analyse IA activée" : "Analyse IA désactivée"}
          </span>
          <LlmToggle
            enabled={c.active}
            onChange={() =>
              c.setValue("active", !c.active, { shouldDirty: true })
            }
          />
        </div>
      </div>

      <div className="card-body space-y-5">
        {!c.active ? (
          <div className="flex items-start gap-2 rounded-xl border border-line bg-paper/45 p-3 text-xs leading-relaxed text-ink-soft">
            <AlertTriangle
              size={15}
              className="mt-0.5 shrink-0 text-warning"
              aria-hidden="true"
            />
            Quand l’IA est désactivée, aucun justificatif n’est envoyé. Toute la
            saisie manuelle reste disponible.
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <FieldGroup id="llm-fournisseur" label="Fournisseur">
            <select
              id="llm-fournisseur"
              className="field"
              value="OLLAMA"
              disabled
            >
              <option value="OLLAMA">Ollama (local)</option>
              <option value="OPENAI" disabled>
                Compatible OpenAI — phase 2
              </option>
            </select>
          </FieldGroup>

          <FieldGroup
            id="llm-url"
            label="URL du serveur Ollama"
            error={c.errors.url?.message}
            help="Par défaut : http://host.docker.internal:11434. L’URL est enregistrée automatiquement lorsque la liste des modèles est actualisée."
          >
            <div className="flex gap-2">
              <input
                id="llm-url"
                className={cn("field mt-1.5", c.errors.url && "field-error")}
                placeholder="http://host.docker.internal:11434"
                autoComplete="off"
                spellCheck={false}
                {...c.register("url")}
                onBlur={c.onUrlBlur}
                data-cy="input-llm-url"
              />
              <Button
                variant="secondary"
                className="mt-1.5 shrink-0"
                icon={
                  <RefreshCw
                    size={15}
                    className={cn(c.listLoading && "animate-spin")}
                  />
                }
                disabled={c.listLoading}
                onClick={() => void c.refreshModels(true)}
                aria-label="Actualiser la liste des modèles"
                data-cy="btn-refresh-models"
              >
                Actualiser
              </Button>
            </div>
          </FieldGroup>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <FieldGroup
            id="llm-modele"
            label="Modèle"
            error={c.errors.model?.message}
            help={
              c.selectedModel
                ? `${c.selectedModel.family || "Famille inconnue"}${c.selectedModel.parameters ? ` · ${c.selectedModel.parameters}` : ""}${c.selectedModel.vision ? " · accepte les images" : ""}`
                : "La liste est chargée depuis /api/tags. Vous pouvez saisir un nom manuellement si Ollama est injoignable."
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
                    ? "Chargement des modèles…"
                    : "Sélectionnez un modèle"}
                </option>
                {c.modelOptions.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name}
                    {model.vision ? " · vision" : ""}
                    {model.parameters ? ` · ${model.parameters}` : ""}
                    {model.configure ? " (configuré)" : ""}
                  </option>
                ))}
                <option value="__manuel__">Saisie manuelle…</option>
              </select>
            ) : null}

            {c.manualMode ? (
              <div className="mt-1.5">
                <input
                  id="llm-modele"
                  className={cn(
                    "field mt-0",
                    c.errors.model && "field-error",
                  )}
                  placeholder="qwen2.5:7b"
                  autoComplete="off"
                  spellCheck={false}
                  {...c.register("model")}
                  data-cy="input-llm-modele"
                />
                {c.models.data && c.models.data.length > 0 ? (
                  <button
                    type="button"
                    className="mt-1.5 text-xs font-medium text-accent underline decoration-accent/30 underline-offset-4"
                    onClick={() => c.setManualMode(false)}
                  >
                    Choisir dans la liste
                  </button>
                ) : null}
              </div>
            ) : null}
          </FieldGroup>

          <div className="flex flex-col justify-end gap-2">
            <div className="rounded-xl border border-line bg-paper/40 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-ink">
                <Cpu size={14} className="text-accent" aria-hidden="true" />
                Support des images
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                {c.selectedModel?.vision
                  ? "Ce modèle accepte les images : les photos et scans peuvent être analysés."
                  : "Ce modèle n’est pas signalé comme multimodal. Les PDF texte restent analysables ; les images nécessitent un modèle vision ou l’OCR."}
              </p>
            </div>
            {c.selectedModel && c.selectedModel.configure ? (
              <p className="text-[11px] text-warning">
                Ce modèle configuré n’apparaît pas dans la liste du serveur.
                Vérifiez qu’il est installé.
              </p>
            ) : null}
          </div>
        </div>

        {c.modelsError || c.models.isError ? (
          <div
            className="rounded-xl border border-warning/25 bg-warning-soft/70 p-3 text-xs text-warning"
            role="alert"
          >
            <p className="font-semibold">Liste des modèles indisponible.</p>
            <p className="mt-0.5">
              {c.modelsError ?? errorMessage(c.models.error)}
            </p>
            <p className="mt-1">
              Saisissez le nom du modèle manuellement, puis testez la connexion.
            </p>
          </div>
        ) : null}

        <LlmApiKeyField c={c} />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <p className="text-[11px] text-ink-soft">
            « Tester la connexion » enregistre d’abord les réglages affichés,
            puis interroge le serveur.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              small
              icon={<Activity size={14} />}
              loading={c.testInProgress}
              onClick={() => void c.runTest()}
              data-cy="btn-test-llm-bas"
            >
              Tester la connexion
            </Button>
            <Button
              variant="primary"
              small
              type="submit"
              icon={<Save size={14} />}
              loading={c.save.isPending}
            >
              Enregistrer
            </Button>
          </div>
        </div>

        <LlmTestFeedback c={c} />
      </div>
    </section>
  );
}
