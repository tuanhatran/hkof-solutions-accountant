import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AdminLlmController } from "./useAdminLlmPage";

/** Error and result of the last connection test. */
export function LlmTestFeedback({ c }: { c: AdminLlmController }) {
  return (
    <>
      {c.testError ? (
        <p
          className="rounded-lg border border-danger/20 bg-danger-soft/60 p-3 text-xs text-danger"
          role="alert"
        >
          {c.testError}
        </p>
      ) : null}

      {c.testResult ? (
        <div
          className={cn(
            "rounded-xl border p-4",
            c.testResult.success
              ? "border-accent/20 bg-accent-soft/50"
              : "border-danger/20 bg-danger-soft/50",
          )}
          role={c.testResult.success ? "status" : "alert"}
          data-cy="resultat-test-llm"
        >
          <div className="flex items-center gap-2">
            {c.testResult.success ? (
              <CheckCircle2
                size={17}
                className="text-accent"
                aria-hidden="true"
              />
            ) : (
              <XCircle size={17} className="text-danger" aria-hidden="true" />
            )}
            <p
              className={cn(
                "text-sm font-semibold",
                c.testResult.success ? "text-accent" : "text-danger",
              )}
            >
              {c.testResult.success ? "Connexion réussie" : "Test échoué"}
              {typeof c.testResult.durationMs === "number"
                ? ` en ${(c.testResult.durationMs / 1000).toFixed(1)} s`
                : ""}
            </p>
          </div>
          <p className="mt-1 text-xs text-ink-soft">{c.testResult.message}</p>
          {c.testResult.detectedAmount ? (
            <p className="mt-2 text-xs text-ink">
              Montant détecté sur le document de test :{" "}
              <span className="font-mono font-semibold">
                {c.testResult.detectedAmount} €
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
