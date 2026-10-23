import { KeyRound } from "lucide-react";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { AdminLlmController } from "./useAdminLlmPage";

/** Optional API key block; the stored key is never returned by the server. */
export function LlmApiKeyField({ c }: { c: AdminLlmController }) {
  return (
    <div className="rounded-xl border border-line bg-paper/35 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <KeyRound
            size={16}
            className="mt-0.5 text-accent"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-ink">
              Clé API (facultative)
            </p>
            <p className="text-[11.5px] text-ink-soft">
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
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
          <label className="mt-1.5 flex cursor-pointer items-start gap-2 self-end rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink-soft">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-line accent-[#1b5b49]"
              {...c.register("deleteApiKey")}
              data-cy="checkbox-supprimer-cle"
            />
            <span>
              <span className="block font-medium text-ink">
                Supprimer la clé enregistrée
              </span>
              <span className="mt-0.5 block text-[11px]">
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
