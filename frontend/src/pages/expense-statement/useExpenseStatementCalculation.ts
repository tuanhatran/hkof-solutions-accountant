import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage, isCancellation } from "@/api/client";
import { api } from "@/api/endpoints";
import type {
  CalculationResponse,
  LineRequest,
  StatementCalculationRequest,
  StatementPreviewRequest,
} from "@/api/types";
import { usePdfPreview } from "@/hooks/usePdfPreview";
import { toLineRequest, type DraftLine } from "@/lib/lines";

interface UseExpenseStatementCalculationOptions {
  activeCompanyId: number | null;
  selectedLeaseId: number | null;
  month: string;
  orderedLines: DraftLine[];
  complete: boolean;
  selectedTemplate: number | null;
  selectedSignatureId: number | null;
  signatureAvailable: boolean;
}

/**
 * Backend calculation and PDF preview of the current draft: the 300 ms
 * calculation debounce, its stale-response guard, the calculation signature
 * that gates generation and the 400 ms preview debounce.
 */
export function useExpenseStatementCalculation({
  activeCompanyId,
  selectedLeaseId,
  month,
  orderedLines,
  complete,
  selectedTemplate,
  selectedSignatureId,
  signatureAvailable,
}: UseExpenseStatementCalculationOptions) {
  const { t } = useTranslation();
  const requests = useMemo<{
    values: LineRequest[] | null;
    error: string | null;
  }>(() => {
    try {
      return { values: orderedLines.map(toLineRequest), error: null };
    } catch (error) {
      return {
        values: null,
        error:
          error instanceof Error
            ? error.message
            : t("expenseStatement.toasts.invalidLines"),
      };
    }
  }, [orderedLines, t]);

  const calculationSignature = useMemo(
    () =>
      JSON.stringify({
        activeCompanyId,
        selectedLeaseId,
        month,
        lines: requests.values,
      }),
    [activeCompanyId, selectedLeaseId, month, requests],
  );

  const [calculation, setCalculation] = useState<CalculationResponse | null>(
    null,
  );
  const [calculatedSignature, setCalculatedSignature] = useState<string | null>(
    null,
  );
  const [calculationInProgress, setCalculationInProgress] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (activeCompanyId === null || selectedLeaseId === null) {
      setCalculation(null);
      setCalculatedSignature(null);
      setCalculationError(null);
      setCalculationInProgress(false);
      return () => controller.abort();
    }
    if (requests.error) {
      setCalculationError(requests.error);
      setCalculationInProgress(false);
      return () => controller.abort();
    }
    if (!requests.values) {
      return () => controller.abort();
    }
    const validRequests = requests.values;
    setCalculationInProgress(true);
    setCalculationError(null);
    const timer = window.setTimeout(async () => {
      try {
        const calculationRequest: StatementCalculationRequest = {
          companyId: activeCompanyId,
          month,
          lines: validRequests,
        };
        if (selectedLeaseId !== null) {
          calculationRequest.leaseId = selectedLeaseId;
        }
        const reply = await api.expenseStatements.calculate(
          calculationRequest,
          controller.signal,
        );
        if (controller.signal.aborted) {
          return;
        }
        setCalculation(reply);
        setCalculatedSignature(calculationSignature);
        setCalculationInProgress(false);
      } catch (error) {
        if (isCancellation(error) || controller.signal.aborted) {
          return;
        }
        setCalculationError(errorMessage(error));
        setCalculationInProgress(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeCompanyId,
    selectedLeaseId,
    calculationSignature,
    month,
    requests.error,
  ]);

  const calculationUpToDate =
    calculatedSignature === calculationSignature &&
    calculation !== null &&
    calculationError === null;

  const previewRequest = useMemo<StatementPreviewRequest | null>(() => {
    if (
      activeCompanyId === null ||
      selectedLeaseId === null ||
      !requests.values ||
      orderedLines.length === 0
    ) {
      return null;
    }
    const requestBody: StatementPreviewRequest = {
      companyId: activeCompanyId,
      month,
      complete,
      lines: requests.values,
    };
    if (selectedLeaseId !== null) {
      requestBody.leaseId = selectedLeaseId;
    }
    if (selectedTemplate !== null) {
      requestBody.templateId = selectedTemplate;
    }
    if (selectedSignatureId !== null) {
      requestBody.signatureId = selectedSignatureId;
    }
    return requestBody;
  }, [
    activeCompanyId,
    selectedLeaseId,
    month,
    complete,
    selectedTemplate,
    selectedSignatureId,
    requests,
    orderedLines.length,
  ]);

  const preview = usePdfPreview(
    (signal) =>
      previewRequest
        ? api.expenseStatements.preview(previewRequest, signal)
        : Promise.reject(new DOMException("Aperçu inactif", "AbortError")),
    JSON.stringify(previewRequest ?? { inactive: true }),
    { active: previewRequest !== null && signatureAvailable, debounceMs: 400 },
  );

  return {
    requests,
    calculation,
    calculationInProgress,
    calculationError,
    calculationUpToDate,
    preview,
    previewRequest,
  };
}
