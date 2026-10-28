import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { downloadBlob, errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type {
  ExpenseItemDto,
  StatementDto,
  StatementGenerationRequest,
} from "@/api/types";
import { estimatedRetainedAmount, formatMonth } from "@/lib/format";
import { linesToRequests, missingTypes, typeAlreadyAdded } from "@/lib/lines";
import type { StatementDraftRequest } from "@/api/endpoints";
import { useDraftSaver } from "@/state/draftSaver";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { toast } from "@/state/toasts";
import { useExpenseStatementAnalysis } from "./useExpenseStatementAnalysis";
import { useExpenseStatementCalculation } from "./useExpenseStatementCalculation";
import { useExpenseStatementContext } from "./useExpenseStatementContext";
import { useExpenseStatementEditing } from "./useExpenseStatementEditing";
import {
  useExpenseStatementForm,
  type ExpenseStatementForm,
} from "./useExpenseStatementForm";
import type { ExpenseStatementPageOptions } from "./expenseStatementTypes";

export type {
  ExpenseStatementPageOptions,
  ExpenseStatementRentReceiptSource,
} from "./expenseStatementTypes";

export type ExpenseStatementController = ReturnType<
  typeof useExpenseStatementPage
>;

/**
 * Whole page controller for the expense statement screen: form, receipt upload,
 * optional AI extraction, backend calculation and preview/generation. Kept in a
 * hook so the page component only composes presentational sub-components. The
 * concern-specific hooks live next to this file; generation and cache
 * invalidation stay here.
 */
export function useExpenseStatementPage(
  options: ExpenseStatementPageOptions = {},
) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<StatementDto | null>(null);
  const [regenerationDialog, setRegenerationDialog] = useState(false);
  const [generationInProgress, setGenerationInProgress] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);

  const context = useExpenseStatementContext(options);
  const form: ExpenseStatementForm = useExpenseStatementForm({
    activeCompanyId: context.activeCompanyId,
    rentReceipt: context.rentReceipt,
    setResult,
  });
  useExpenseStatementAnalysis(context, form);
  const editing = useExpenseStatementEditing(context, form, setResult);
  const {
    requests,
    calculation,
    calculationInProgress,
    calculationError,
    calculationUpToDate,
    preview,
    previewRequest,
  } = useExpenseStatementCalculation({
    activeCompanyId: context.activeCompanyId,
    selectedLeaseId: context.selectedLeaseId,
    month: context.month,
    orderedLines: context.orderedLines,
    complete: context.complete,
    selectedTemplate: context.selectedTemplate,
    selectedSignatureId: context.selectedSignatureId,
    signatureAvailable: context.signatureAvailable,
  });

  const { activeCompanyId, selectedLeaseId, month, orderedLines } = context;

  function goToRentReceipt() {
    if (options.onGoToRentReceipt) {
      options.onGoToRentReceipt();
      return;
    }
    useRentReceiptDraft.getState().changeMonth(month);
    navigate("/generer/quittance");
  }

  async function generateStatement() {
    if (
      activeCompanyId === null ||
      !requests.values ||
      orderedLines.length === 0 ||
      !calculationUpToDate ||
      !context.signatureAvailable
    ) {
      return;
    }
    setGenerationInProgress(true);
    try {
      const requestBody: StatementGenerationRequest = {
        companyId: activeCompanyId,
        month,
        lines: requests.values,
      };
      if (selectedLeaseId !== null) {
        requestBody.leaseId = selectedLeaseId;
      }
      if (context.selectedTemplate !== null) {
        requestBody.templateId = context.selectedTemplate;
      }
      if (context.selectedSignatureId !== null) {
        requestBody.signatureId = context.selectedSignatureId;
      }
      const statement = await api.expenseStatements.create(requestBody);
      setResult(statement);
      context.draft.markGenerated();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.statementsAll,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.drafts });
      toast.success(
        t("expenseStatement.toasts.generated", {
          month: formatMonth(month),
          version: statement.version ?? 1,
        }),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setGenerationInProgress(false);
    }
  }

  async function saveDraft(): Promise<boolean> {
    if (activeCompanyId === null) {
      return false;
    }
    try {
      setDraftSaving(true);
      const requestBody: StatementDraftRequest = {
        companyId: activeCompanyId,
        month,
        templateId: context.selectedTemplate,
        complete: context.complete,
        lines: linesToRequests(orderedLines),
      };
      const saved = await api.drafts.saveStatement(requestBody);
      context.draft.markSaved(saved);
      await queryClient.invalidateQueries({ queryKey: queryKeys.drafts });
      toast.success(t("draft.saved"));
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setDraftSaving(false);
    }
  }

  useDraftSaver(saveDraft);

  function requestGeneration() {
    if (context.activeStatement.data) {
      setRegenerationDialog(true);
      return;
    }
    void generateStatement();
  }

  async function downloadStatement(
    statement: StatementDto,
    withAttachments: boolean,
  ) {
    if (!statement.id) {
      return;
    }
    try {
      const reply = withAttachments
        ? await api.expenseStatements.zip(statement.id)
        : await api.expenseStatements.pdf(statement.id, false);
      const baseName = `note_frais_${statement.month ?? month}`;
      downloadBlob(
        reply.blob,
        reply.fileName ??
          (withAttachments ? `${baseName}_complet.zip` : `${baseName}.pdf`),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const displayedRetainedAmount = estimatedRetainedAmount(
    form.values.amountInclVat,
    form.values.proRataPct,
  );
  const omittedTypes = missingTypes(context.expenseItems, context.companyLines);
  const lowConfidenceError = form.ai.confidence === "basse" && form.ai.amount;

  function optionDisabled(expenseItem: ExpenseItemDto): boolean {
    if (!expenseItem.code || expenseItem.multipleLinesAllowed) {
      return false;
    }
    if (
      form.lineBeingEdited &&
      context.companyLines.find((line) => line.key === form.lineBeingEdited)
        ?.itemCode === expenseItem.code
    ) {
      return false;
    }
    return typeAlreadyAdded(context.companyLines, expenseItem.code);
  }

  const displayedTotal = calculation?.total;
  const activeVersion = context.activeStatement.data?.version;
  const currentTemplate =
    context.activeModel?.name ??
    t("expenseStatement.preview.builtInTemplateName");

  return {
    month: context.month,
    draft: context.draft,
    mobile: context.mobile,
    mobilePanel: context.mobilePanel,
    setMobilePanel: context.setMobilePanel,
    companies: context.companies,
    activeCompany: context.activeCompany,
    activeCompanyId: context.activeCompanyId,
    companySelectionRequired: context.companySelectionRequired,
    selectCompany: context.selectCompany,
    expenseItemsQuery: context.expenseItemsQuery,
    templates: context.templates,
    rentReceipt: context.rentReceipt,
    rentReceiptCandidates: context.rentReceiptCandidates,
    selectedRentReceiptId: context.selectedRentReceiptId,
    selectRentReceipt: context.selectRentReceipt,
    activeStatement: context.activeStatement,
    signatures: context.signatures,
    employees: context.employees,
    ceo: context.ceo,
    signatureList: context.signatureList,
    selectedSignatureId: context.selectedSignatureId,
    setChosenSignatureId: context.setChosenSignatureId,
    signatureAvailable: context.signatureAvailable,
    expenseItems: context.expenseItems,
    expenseItemByCode: context.expenseItemByCode,
    orderedLines: context.orderedLines,
    models: context.models,
    activeModel: context.activeModel,
    selectedTemplate: context.selectedTemplate,
    complete: context.complete,
    register: form.register,
    handleSubmit: form.handleSubmit,
    values: form.values,
    errors: form.errors,
    isValid: form.isValid,
    isRent: form.isRent,
    availableRent: form.availableRent,
    analysisPhase: form.analysisPhase,
    cancelAnalysis: form.cancelAnalysis,
    receipt: form.receipt,
    uploading: form.uploading,
    fileError: form.fileError,
    ai: form.ai,
    amountConfirmationPending: form.amountConfirmationPending,
    lineBeingEdited: form.lineBeingEdited,
    lineToRemove: editing.lineToRemove,
    setLineToRemove: editing.setLineToRemove,
    regenerationDialog,
    setRegenerationDialog,
    generationInProgress,
    draftSaving,
    result,
    typeRef: form.typeRef,
    formCardRef: form.formCardRef,
    upload: form.upload,
    removeFile: form.removeFile,
    changeMonth: editing.changeMonth,
    changeType: editing.changeType,
    editLine: editing.editLine,
    cancelEdit: editing.cancelEdit,
    saveExpense: editing.saveExpense,
    removeLine: editing.removeLine,
    requests,
    calculation,
    calculationInProgress,
    calculationError,
    calculationUpToDate,
    preview,
    previewRequest,
    savedDraft: context.savedDraft,
    saveDraft,
    goToRentReceipt,
    generateStatement,
    requestGeneration,
    downloadStatement,
    displayedRetainedAmount,
    omittedTypes,
    lowConfidenceError,
    optionDisabled,
    displayedTotal,
    activeVersion,
    currentTemplate,
    markAmountEdited: form.markAmountEdited,
    confirmAmount: form.confirmAmount,
  };
}
