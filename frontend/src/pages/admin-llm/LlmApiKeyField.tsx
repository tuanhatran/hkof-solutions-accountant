import "./LlmApiKeyField.css";
import { KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { AdminLlmController } from "./useAdminLlmPage";

/** Optional API key block; the stored key is never returned by the server. */
export function LlmApiKeyField({ c }: { c: AdminLlmController }) {
  const { t } = useTranslation();

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
            <p className="llm-api-key-field-title">
              {t("adminLlm.apiKey.title")}
            </p>
            <p className="llm-api-key-field-hint">
              {t("adminLlm.apiKey.hint")}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "badge",
            c.config.data?.apiKeyConfigured ? "badge-accent" : "badge-neutral",
          )}
        >
          {c.config.data?.apiKeyConfigured
            ? t("adminLlm.apiKey.configured")
            : t("adminLlm.apiKey.none")}
        </span>
      </div>
      <div className="llm-api-key-field-grid">
        <FieldGroup
          id="llm-cle-api"
          label={t("adminLlm.apiKey.newKey")}
          error={c.errors.apiKey?.message}
        >
          <input
            id="llm-cle-api"
            type="password"
            autoComplete="new-password"
            className="field"
            placeholder={
              c.config.data?.apiKeyConfigured
                ? t("adminLlm.apiKey.placeholderConfigured")
                : t("adminLlm.apiKey.placeholderNone")
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
                {t("adminLlm.apiKey.deleteTitle")}
              </span>
              <span className="llm-api-key-field-delete-text">
                {t("adminLlm.apiKey.deleteText")}
              </span>
            </span>
          </label>
        ) : null}
      </div>
    </div>
  );
}
