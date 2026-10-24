import "./LlmApiKeyField.css";
import { KeyRound } from "lucide-react";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { AdminLlmController } from "./useAdminLlmPage";

/** Optional API key block; the stored key is never returned by the server. */
export function LlmApiKeyField({ c }: { c: AdminLlmController }) {
  return (
    <div className="llm-api-key-field">
      <div className="llm-api-key-field-header">
        <div className="llm-api-key-field-heading">
          <KeyRound
            size={16}
            className="llm-api-key-field-icon"
            aria-hidden="true"
          />
          <div>
            <p className="llm-api-key-field-title">Clé API (facultative)</p>
            <p className="llm-api-key-field-hint">
              Jamais renvoyée par le serveur ni réaffichée. Laissez vide pour
              conserver la clé enregistrée.
            </p>
          </div>
        </div>
        <span
          className={cn(
            "badge",
            c.config.data?.apiKeyConfigured ? "badge-accent" : "badge-neutral",
          )}
        >
          {c.config.data?.apiKeyConfigured ? "Clé configurée" : "Aucune clé"}
        </span>
      </div>
      <div className="llm-api-key-field-grid">
        <FieldGroup
          id="llm-cle-api"
          label="Nouvelle clé API"
          error={c.errors.apiKey?.message}
        >
          <input
            id="llm-cle-api"
            type="password"
            autoComplete="new-password"
            className="field"
            placeholder={
              c.config.data?.apiKeyConfigured
                ? "Clé enregistrée — laisser vide"
                : "Aucune clé enregistrée"
            }
            disabled={c.removeKey}
            {...c.register("apiKey")}
            data-cy="input-llm-cle-api"
          />
        </FieldGroup>
        {c.config.data?.apiKeyConfigured ? (
          <label className="llm-api-key-field-delete">
            <input
              type="checkbox"
              className="llm-api-key-field-checkbox"
              {...c.register("deleteApiKey")}
              data-cy="checkbox-supprimer-cle"
            />
            <span>
              <span className="llm-api-key-field-delete-title">
                Supprimer la clé enregistrée
              </span>
              <span className="llm-api-key-field-delete-text">
                Envoie explicitement une clé vide. Sans cette case, une clé vide
                n’est jamais transmise.
              </span>
            </span>
          </label>
        ) : null}
      </div>
    </div>
  );
}
