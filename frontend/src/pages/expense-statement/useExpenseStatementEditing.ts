import { useState, type Dispatch, type SetStateAction } from "react";
import type { StatementDto } from "@/api/types";
import { parseAmount, parsePercentage } from "@/lib/format";
import { newKey, typeAlreadyAdded, type DraftLine } from "@/lib/lines";
import type { ExpenseFormValues } from "@/lib/validation";
import { toast } from "@/state/toasts";
import type { AttachedFile } from "./expenseStatementTypes";
import type { ExpenseStatementContext } from "./useExpenseStatementContext";
import type { ExpenseStatementForm } from "./useExpenseStatementForm";

/**
 * Draft line editing actions of the expense statement: month and type changes,
 * edition of an existing line and add/update/remove of the form line. Every
 * action keeps the same upload-sequence cancellation and reset semantics.
 */
export function useExpenseStatementEditing(
  context: ExpenseStatementContext,
  form: ExpenseStatementForm,
  setResult: Dispatch<SetStateAction<StatementDto | null>>,
) {
  const {
    draft,
    month,
    rentReceipt,
    expenseItemByCode,
    companyLines,
    setMobilePanel,
  } = context;
  const [lineToRemove, setLineToRemove] = useState<DraftLine | null>(null);

  function changeMonth(value: string) {
    if (!value || value === month) {
      return;
    }
    form.uploadSequence.current += 1;
    void form.cancel(true);
    form.resetStatement();
    if (form.receipt) {
      form.releaseIfNotAttached(form.receipt);
    }
    form.resetForm();
    setResult(null);
    setMobilePanel("input");
    draft.changeMonth(value);
  }

  function changeType(code: string) {
    const old = form.getValues("itemCode");
    const expenseItem = expenseItemByCode.get(code) ?? null;
    form.setValue("itemCode", code, {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("proRataPct", expenseItem?.proRataPct ?? "100", {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setAi((previous) => ({ ...previous, type: false }));

    if (code === "loyer" && old !== "loyer") {
      if (!form.lineBeingEdited) {
        form.removeFile();
      } else {
        void form.cancel(true);
        form.resetStatement();
      }
      form.setValue("amountInclVat", rentReceipt.data?.total ?? "", {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else if (code !== "loyer" && old === "loyer") {
      form.setValue("amountInclVat", "", {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }

  function editLine(line: DraftLine) {
    form.uploadSequence.current += 1;
    void form.cancel(true);
    form.resetStatement();
    form.appliedAnalysis.current = null;
    form.setLineBeingEdited(line.key);
    const file: AttachedFile | null = line.receiptId
      ? {
          id: line.receiptId,
          name: line.receiptName ?? "Justificatif",
          size: null,
          mimeType: null,
        }
      : null;
    form.originalReceipt.current = file;
    form.setReceipt(file);
    form.setFileError(null);
    form.reset({
      itemCode: line.itemCode,
      amountInclVat:
        line.itemCode === "loyer" && rentReceipt.data?.total
          ? rentReceipt.data.total
          : line.amountInclVat,
      proRataPct: line.proRataPct,
    });
    form.setAi({
      type: false,
      amount: line.amountSource === "AI",
      amountConfirmed: true,
      detectedAmount: line.aiDetectedAmount,
      supplier: line.detectedSupplier,
      sourceExtract: null,
      confidence: line.aiConfidence,
    });
    setResult(null);
    form.formCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    form.focusType();
  }

  function cancelEdit() {
    form.uploadSequence.current += 1;
    void form.cancel(true);
    form.resetStatement();
    if (form.receipt) {
      form.releaseIfNotAttached(form.receipt);
    }
    form.resetForm();
    form.focusType();
  }

  function saveExpense(submittedValues: ExpenseFormValues) {
    if (form.amountConfirmationPending) {
      toast.info(
        "Confirmez le montant détecté par IA avant d’ajouter le frais.",
      );
      return;
    }
    const expenseItem = expenseItemByCode.get(submittedValues.itemCode);
    if (!expenseItem?.code) {
      form.setError("itemCode", {
        type: "manual",
        message: "Sélectionnez un type de frais.",
      });
      return;
    }
    const others = companyLines.filter(
      (line) => line.key !== form.lineBeingEdited,
    );
    if (
      !expenseItem.multipleLinesAllowed &&
      typeAlreadyAdded(others, expenseItem.code)
    ) {
      form.setError("itemCode", {
        type: "manual",
        message:
          "Ce type est déjà présent. Modifiez la ligne existante ou autorisez plusieurs lignes.",
      });
      return;
    }
    const rentLine = expenseItem.code === "loyer";
    if (rentLine && !form.availableRent) {
      form.setFileError(
        "Ajoutez d’abord la quittance du mois pour utiliser ce type.",
      );
      return;
    }
    if (!rentLine && !form.receipt) {
      form.setFileError(
        "Le justificatif est obligatoire pour ce type de frais.",
      );
      return;
    }

    const amountInclVat = parseAmount(submittedValues.amountInclVat);
    const proRataPct = parsePercentage(submittedValues.proRataPct);
    if (amountInclVat === null || proRataPct === null) {
      return;
    }

    const line: DraftLine = {
      key: form.lineBeingEdited ?? newKey(),
      itemCode: expenseItem.code,
      amountInclVat: amountInclVat,
      proRataPct: proRataPct,
      receiptId: rentLine ? null : (form.receipt?.id ?? null),
      receiptName: rentLine ? null : (form.receipt?.name ?? null),
      amountSource: form.ai.amount ? "AI" : "MANUAL",
      aiDetectedAmount: form.ai.detectedAmount,
      aiConfidence: form.ai.confidence,
      detectedSupplier: form.ai.supplier,
    };

    if (form.lineBeingEdited) {
      draft.updateLine(form.lineBeingEdited, line);
      toast.success("Frais modifié.");
    } else {
      draft.addLine(line);
      toast.success("Frais ajouté.");
    }

    if (
      rentLine &&
      form.receipt &&
      form.originalReceipt.current?.id !== form.receipt.id
    ) {
      form.releaseIfNotAttached(form.receipt);
    }
    form.uploadSequence.current += 1;
    void form.cancel(true);
    form.resetStatement();
    form.resetForm();
    setResult(null);
    form.focusType();
  }

  function removeLine() {
    if (!lineToRemove) {
      return;
    }
    const key = lineToRemove.key;
    draft.removeLine(key);
    if (form.lineBeingEdited === key) {
      form.resetForm();
    }
    setLineToRemove(null);
    setResult(null);
    toast.info("Frais supprimé.");
  }

  return {
    lineToRemove,
    setLineToRemove,
    changeMonth,
    changeType,
    editLine,
    cancelEdit,
    saveExpense,
    removeLine,
  };
}
