import "./LlmConnectionSection.css";
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
    <section className="card llm-connection-section">
      <div className="card-header">
        <div className="llm-connection-section-heading">
          <span className="llm-connection-section-icon">
            <Bot size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 className="llm-connection-section-title">Connexion Ollama</h2>
            <p className="llm-connection-section-subtitle">
              Fournisseur local, URL, modèle et authentification éventuelle.
            </p>
          </div>
        </div>
        <div className="llm-connection-section-status">
          <span className="llm-connection-section-status-text">
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

      <div className="card-body llm-connection-section-body">
        {!c.active ? (
          <div className="llm-connection-section-notice">
            <AlertTriangle
              size={15}
              className="llm-connection-section-notice-icon"
              aria-hidden="true"
            />
            Quand l’IA est désactivée, aucun justificatif n’est envoyé. Toute la
            saisie manuelle reste disponible.
          </div>
        ) : null}

        <div className="llm-connection-section-grid">
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
                aria-label="Actualiser la liste des modèles"
                data-cy="btn-refresh-models"
              >
                Actualiser
              </Button>
            </div>
          </FieldGroup>
        </div>

        <div className="llm-connection-section-grid">
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
              <div className="llm-connection-section-manual">
                <input
                  id="llm-modele"
                  className={cn("field mt-0", c.errors.model && "field-error")}
                  placeholder="qwen2.5:7b"
                  autoComplete="off"
                  spellCheck={false}
                  {...c.register("model")}
                  data-cy="input-llm-modele"
                />
                {c.models.data && c.models.data.length > 0 ? (
                  <button
                    type="button"
                    className="llm-connection-section-manual-link"
                    onClick={() => c.setManualMode(false)}
                  >
                    Choisir dans la liste
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
                Support des images
              </p>
              <p className="llm-connection-section-vision-text">
                {c.selectedModel?.vision
                  ? "Ce modèle accepte les images : les photos et scans peuvent être analysés."
                  : "Ce modèle n’est pas signalé comme multimodal. Les PDF texte restent analysables ; les images nécessitent un modèle vision ou l’OCR."}
              </p>
            </div>
            {c.selectedModel && c.selectedModel.configure ? (
              <p className="llm-connection-section-vision-warning">
                Ce modèle configuré n’apparaît pas dans la liste du serveur.
                Vérifiez qu’il est installé.
              </p>
            ) : null}
          </div>
        </div>

        {c.modelsError || c.models.isError ? (
          <div className="llm-connection-section-error" role="alert">
            <p className="llm-connection-section-error-title">
              Liste des modèles indisponible.
            </p>
            <p className="llm-connection-section-error-message">
              {c.modelsError ?? errorMessage(c.models.error)}
            </p>
            <p className="llm-connection-section-error-hint">
              Saisissez le nom du modèle manuellement, puis testez la connexion.
            </p>
          </div>
        ) : null}

        <LlmApiKeyField c={c} />

        <div className="llm-connection-section-footer">
          <p className="llm-connection-section-footer-note">
            « Tester la connexion » enregistre d’abord les réglages affichés,
            puis interroge le serveur.
          </p>
          <div className="llm-connection-section-actions">
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
