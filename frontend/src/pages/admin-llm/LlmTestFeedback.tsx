import "./LlmTestFeedback.css";
import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import type { AdminLlmController } from "./useAdminLlmPage";

/** Error and result of the last connection test. */
export function LlmTestFeedback({ c }: { c: AdminLlmController }) {
  const { t } = useTranslation();

  return (
    <>
      {c.testError ? (
        <p className="llm-test-feedback-error" role="alert">
          {c.testError}
        </p>
      ) : null}

      {c.testResult ? (
        <div
          className={cn(
            "llm-test-feedback-result",
            c.testResult.success
              ? "llm-test-feedback-result-success"
              : "llm-test-feedback-result-failure",
          )}
          role={c.testResult.success ? "status" : "alert"}
          data-cy="llm-test-result"
        >
          <div className="llm-test-feedback-heading">
            {c.testResult.success ? (
              <CheckCircle2
                size={17}
                className="llm-test-feedback-icon-success"
                aria-hidden="true"
              />
            ) : (
              <XCircle
                size={17}
                className="llm-test-feedback-icon-failure"
                aria-hidden="true"
              />
            )}
            <p
              className={cn(
                "llm-test-feedback-title",
                c.testResult.success
                  ? "llm-test-feedback-title-success"
                  : "llm-test-feedback-title-failure",
              )}
            >
              {c.testResult.success
                ? t("adminLlm.test.successTitle")
                : t("adminLlm.test.failureTitle")}
              {typeof c.testResult.durationMs === "number"
                ? t("adminLlm.test.duration", {
                    duration: (c.testResult.durationMs / 1000).toFixed(1),
                  })
                : ""}
            </p>
          </div>
          <p className="llm-test-feedback-message">{c.testResult.message}</p>
          {c.testResult.detectedAmount ? (
            <p className="llm-test-feedback-amount">
              {t("adminLlm.test.detectedAmount")}{" "}
              <span className="llm-test-feedback-amount-value">
                {c.testResult.detectedAmount} €
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
