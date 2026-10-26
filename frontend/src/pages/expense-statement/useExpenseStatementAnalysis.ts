import { useEffect } from "react";
import { confidenceValid } from "@/components/llm/analysisConfidence";
import { isEuroCurrency, parseAmount } from "@/lib/format";
import { typeAlreadyAdded } from "@/lib/lines";
import { toast } from "@/state/toasts";
import type { ExpenseStatementContext } from "./useExpenseStatementContext";
import type { ExpenseStatementForm } from "./useExpenseStatementForm";

/**
 * Applies one completed AI extraction to the form. The detected amount always
 * replaces the current value (except for the rent amount, locked to the receipt
 * of the month), a suggested type only fills an empty type, and the proposal
 * stays editable and unconfirmed until the user validates it.
 */
export function useExpenseStatementAnalysis(
  context: ExpenseStatementContext,
  form: ExpenseStatementForm,
) {
  const {
    analysisPhase,
    receipt,
    lineBeingEdited,
    getValues,
    setValue,
    setAi,
  } = form;
  const { draftStore, month, expenseItemByCode, expenseItemsQuery } = context;

  useEffect(() => {
    if (analysisPhase.status !== "done" || !expenseItemsQuery.data) {
      return;
    }
    const analysis = analysisPhase.analysis;
    const analysisId = analysis.id;
    if (
      analysisId === null ||
      analysisId === undefined ||
      form.appliedAnalysis.current === analysisId
    ) {
      return;
    }
    if (analysis.receiptId !== receipt?.id) {
      return;
    }
    form.appliedAnalysis.current = analysisId;
    const extraction = analysis.result;
    if (!extraction) {
      return;
    }

    const current = getValues();
    const currentLines = (
      draftStore.getState().linesByMonth[month] ?? []
    ).filter((line) => expenseItemByCode.has(line.itemCode));
    let appliedType = false;
    let appliedAmount = false;

    const suggestedAmount = !isEuroCurrency(extraction.currency)
      ? null
      : extraction.amountInclVat
        ? parseAmount(extraction.amountInclVat)
        : null;

    // The detected amount always replaces the current value; the rent amount
    // stays locked to the receipt of the month.
    if (suggestedAmount !== null && current.itemCode !== "loyer") {
      appliedAmount = true;
    }

    const suggestedItem =
      extraction.suggestedType && extraction.suggestedType !== "loyer"
        ? (expenseItemByCode.get(extraction.suggestedType) ?? null)
        : null;
    const others = currentLines.filter((line) => line.key !== lineBeingEdited);

    if (
      !current.itemCode &&
      suggestedItem?.code &&
      (suggestedItem.multipleLinesAllowed ||
        !typeAlreadyAdded(others, suggestedItem.code))
    ) {
      appliedType = true;
      setValue("itemCode", suggestedItem.code, {
        shouldValidate: true,
        shouldDirty: true,
      });
      if (
        (current.proRataPct === "" || current.proRataPct === "100") &&
        suggestedItem.proRataPct
      ) {
        setValue("proRataPct", suggestedItem.proRataPct, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }

    if (appliedAmount && suggestedAmount) {
      setValue("amountInclVat", suggestedAmount, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }

    setAi({
      type: appliedType,
      amount: appliedAmount,
      amountConfirmed: false,
      detectedAmount: suggestedAmount,
      supplier: extraction.supplier ?? null,
      sourceExtract: extraction.sourceExcerpt ?? null,
      confidence: confidenceValid(extraction.confidence),
    });
    if (appliedAmount || appliedType) {
      toast.info(
        "Des champs ont été pré-remplis par l’IA. Vérifiez-les avant d’ajouter le frais.",
      );
    }
    // Extraction is applied once per analysis; the amount always overwrites.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisPhase, receipt?.id, expenseItemsQuery.data, lineBeingEdited]);
}
