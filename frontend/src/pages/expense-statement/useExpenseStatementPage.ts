import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useStore } from "zustand";
import { downloadBlob, errorMessage, isCancellation } from "@/api/client";
import { api } from "@/api/endpoints";
import {
  queryKeys,
  useActiveRentReceipt,
  useActiveStatement,
  useCompanies,
  useEmployees,
  useExpenseItems,
  useSignatures,
  useTemplates,
} from "@/api/queries";
import type {
  CalculationResponse,
  ExpenseItemDto,
  LineRequest,
  RentReceiptDto,
  StatementDto,
  StatementCalculationRequest,
  StatementGenerationRequest,
  StatementPreviewRequest,
} from "@/api/types";
import { confidenceValid } from "@/components/llm/analysisConfidence";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePdfPreview } from "@/hooks/usePdfPreview";
import {
  estimatedRetainedAmount,
  formatMonth,
  isEuroCurrency,
  parseAmount,
  parsePercentage,
} from "@/lib/format";
import {
  missingTypes,
  newKey,
  orderLinesByExpenseItem,
  toLineRequest,
  typeAlreadyAdded,
  type DraftLine,
} from "@/lib/lines";
import { expenseSchema, type ExpenseFormValues } from "@/lib/validation";
import { resolveActiveCompanyId, useCompanyStore } from "@/state/company";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import {
  useStatementDraft,
  type StatementDraftStore,
} from "@/state/statementDraft";
import { toast } from "@/state/toasts";
import {
  AI_EMPTY,
  INITIAL_VALUES,
  type AiState,
  type AttachedFile,
} from "./expenseStatementTypes";

export type ExpenseStatementController = ReturnType<
  typeof useExpenseStatementPage
>;

const NO_LINES: DraftLine[] = [];

/** Minimal query shape the controller needs for the month's rent receipt. */
export interface ExpenseStatementRentReceiptSource {
  data: RentReceiptDto | null | undefined;
  isPending: boolean;
}

/**
 * Optional scoping of the controller. Without options the hook keeps the
 * historical page behaviour: global sessionStorage draft, active company and
 * its derived lease, company active rent receipt and navigation to
 * /generer/quittance. A scoped editor (the company lease statement modal)
 * injects its own company, lease, non-persisted draft, rent receipt source
 * and rent-receipt action; the global draft and company store stay untouched.
 */
export interface ExpenseStatementPageOptions {
  companyId?: number;
  leaseId?: number | null;
  draft?: StatementDraftStore;
  rentReceipt?: ExpenseStatementRentReceiptSource;
  onGoToRentReceipt?: () => void;
}

/**
 * Whole page controller for the expense statement screen: form, receipt upload,
 * optional AI extraction, backend calculation and preview/generation. Kept in a
 * hook so the page component only composes presentational sub-components.
 */
export function useExpenseStatementPage(
  options: ExpenseStatementPageOptions = {},
) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const draftStore = options.draft ?? useStatementDraft;
  const draft = useStore(draftStore);
  const lines = useMemo(
    () => draft.linesByMonth[draft.month] ?? NO_LINES,
    [draft.linesByMonth, draft.month],
  );
  const mobile = useMediaQuery("(max-width: 1023px)");
  const [mobilePanel, setMobilePanel] = useState<"input" | "preview">("input");

  const month = draft.month;
  const scoped = options.companyId !== undefined;
  const companies = useCompanies();
  const storedCompanyId = useCompanyStore((state) => state.activeCompanyId);
  const setActiveCompany = useCompanyStore((state) => state.setActiveCompany);
  const resolvedCompanyId = useMemo(
    () => resolveActiveCompanyId(storedCompanyId, companies.data),
    [storedCompanyId, companies.data],
  );
  useEffect(() => {
    if (!scoped && resolvedCompanyId !== storedCompanyId) {
      setActiveCompany(resolvedCompanyId);
    }
  }, [scoped, resolvedCompanyId, storedCompanyId, setActiveCompany]);
  const activeCompanyId = options.companyId ?? resolvedCompanyId;
  const activeCompany =
    (companies.data ?? []).find((company) => company.id === activeCompanyId) ??
    null;
  // Statements and postes are scoped to the active company's derived lease.
  // A company without a lease keeps the historical unscoped behaviour.
  const selectedLeaseId =
    options.leaseId !== undefined
      ? options.leaseId
      : (activeCompany?.leaseId ?? null);

  // Every company-scoped request carries the active company; a null id disables them.
  const expenseItemsQuery = useExpenseItems(
    activeCompanyId,
    false,
    selectedLeaseId,
  );
  const templates = useTemplates("EXPENSE_STATEMENT");
  const activeRentReceiptQuery = useActiveRentReceipt(month, activeCompanyId);
  const rentReceipt: ExpenseStatementRentReceiptSource =
    options.rentReceipt ?? activeRentReceiptQuery;
  const activeStatement = useActiveStatement(activeCompanyId, month);
  const employees = useEmployees(activeCompanyId);

  // The statement uses the company CEO's signature. The backend resolves the
  // lowest-id CEO, so mirror it here instead of relying on the list order.
  const ceo = useMemo(() => {
    const candidates = (employees.data ?? []).filter(
      (employee) => employee.title === "CEO",
    );
    return candidates.sort((a, b) => Number(a.id) - Number(b.id))[0] ?? null;
  }, [employees.data]);
  const signatures = useSignatures(ceo?.id ?? null);

  const signatureList = signatures.data ?? [];
  const [chosenSignatureId, setChosenSignatureId] = useState<number | null>(
    null,
  );
  const chosenSignatureAvailable = signatureList.some(
    (candidate) => candidate.id === chosenSignatureId,
  );
  const selectedSignatureId = chosenSignatureAvailable
    ? chosenSignatureId
    : (signatureList[0]?.id ?? null);
  const signatureAvailable = ceo !== null && signatureList.length > 0;

  const expenseItems = useMemo<ExpenseItemDto[]>(
    () =>
      [...(expenseItemsQuery.data ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    [expenseItemsQuery.data],
  );
  const expenseItemByCode = useMemo(
    () =>
      new Map(
        expenseItems.map((expenseItem) => [
          expenseItem.code ?? "",
          expenseItem,
        ]),
      ),
    [expenseItems],
  );

  // A company switch must not send the previous company's lines. Draft lines whose
  // item exists in the active company only are part of this statement; the others
  // stay stored and reappear when their company becomes active again.
  const companyLines = useMemo(
    () =>
      expenseItemsQuery.data
        ? lines.filter((line) => expenseItemByCode.has(line.itemCode))
        : lines,
    [lines, expenseItemByCode, expenseItemsQuery.data],
  );

  // The backend returns calculation lines in the configured order; the table and
  // the submitted requests must use that same order so `calculation.lines[index]`
  // keeps matching its row. The draft itself is never reordered.
  const orderedLines = useMemo(
    () => orderLinesByExpenseItem(companyLines, expenseItems),
    [companyLines, expenseItems],
  );

  const models = templates.data ?? [];
  const activeModel = models.find((model) => model.active) ?? null;
  const selectedTemplate =
    draft.templatesByMonth[month] ?? activeModel?.id ?? null;
  const complete = draft.completeByMonth[month] ?? true;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    setError,
    formState: { errors, isValid },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    mode: "onChange",
    defaultValues: INITIAL_VALUES,
  });

  const values = watch();
  const isRent = values.itemCode === "loyer";
  const availableRent = Boolean(rentReceipt.data?.id);

  const {
    state: analysisPhase,
    start,
    cancel,
    reset: resetStatement,
  } = useAnalysis();
  const [receipt, setReceipt] = useState<AttachedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [ai, setAi] = useState<AiState>(AI_EMPTY);
  // Confirmation is required only while the box still holds the AI proposal.
  const amountConfirmationPending = !isRent && ai.amount && !ai.amountConfirmed;
  const [lineBeingEdited, setLineBeingEdited] = useState<string | null>(null);
  const [lineToRemove, setLineToRemove] = useState<DraftLine | null>(null);
  const [regenerationDialog, setRegenerationDialog] = useState(false);
  const [generationInProgress, setGenerationInProgress] = useState(false);
  const [result, setResult] = useState<StatementDto | null>(null);

  const uploadSequence = useRef(0);
  const appliedAnalysis = useRef<number | null>(null);
  const originalReceipt = useRef<AttachedFile | null>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const formCardRef = useRef<HTMLFormElement>(null);
  const previousCompanyId = useRef<number | null>(null);

  // The form and its attachment belong to one company: drop them on a switch. The
  // persisted draft lines stay, filtered by the active company's items above.
  useEffect(() => {
    const previous = previousCompanyId.current;
    previousCompanyId.current = activeCompanyId;
    if (previous === null || previous === activeCompanyId) {
      return;
    }
    uploadSequence.current += 1;
    void cancel(true);
    resetForm();
    setResult(null);
    // Runs only on an actual company change, not on the initial resolution.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  function releaseIfNotAttached(file: AttachedFile) {
    const isOriginal = originalReceipt.current?.id === file.id;
    if (!isOriginal) {
      void api.receipts.delete(file.id).catch(() => undefined);
    }
  }

  function resetForm() {
    reset(INITIAL_VALUES);
    setAi(AI_EMPTY);
    setFileError(null);
    setLineBeingEdited(null);
    setReceipt(null);
    originalReceipt.current = null;
    appliedAnalysis.current = null;
  }

  function focusType() {
    window.setTimeout(() => typeRef.current?.focus(), 0);
  }

  async function upload(file: File) {
    const sequence = ++uploadSequence.current;
    const old = receipt;
    setUploading(true);
    setFileError(null);
    setAi(AI_EMPTY);
    appliedAnalysis.current = null;
    resetStatement();

    try {
      const dto = await api.receipts.upload(file);
      if (!dto.id) {
        throw new Error("Le justificatif n’a pas pu être enregistré.");
      }
      if (sequence !== uploadSequence.current) {
        void api.receipts.delete(dto.id).catch(() => undefined);
        return;
      }
      if (old) {
        releaseIfNotAttached(old);
      }
      setReceipt({
        id: dto.id,
        name: dto.fileName ?? file.name,
        size: dto.size ?? file.size,
        mimeType: dto.mimeType ?? file.type,
      });
      await start(dto.id);
    } catch (error) {
      if (sequence === uploadSequence.current) {
        setReceipt(old);
        setFileError(errorMessage(error));
      }
    } finally {
      if (sequence === uploadSequence.current) {
        setUploading(false);
      }
    }
  }

  function removeFile() {
    uploadSequence.current += 1;
    void cancel(true);
    const old = receipt;
    setReceipt(null);
    setFileError(null);
    setAi(AI_EMPTY);
    appliedAnalysis.current = null;
    if (old) {
      releaseIfNotAttached(old);
    }
  }

  useEffect(() => {
    const activeRentReceipt = rentReceipt.data;
    if (!activeRentReceipt?.id || !activeRentReceipt.total) {
      return;
    }
    if (getValues("itemCode") !== "loyer") {
      return;
    }
    setValue("amountInclVat", activeRentReceipt.total, {
      shouldValidate: true,
      shouldDirty: true,
    });
    // The rent amount is locked to the active receipt for the month.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentReceipt.data?.id, rentReceipt.data?.total]);

  useEffect(() => {
    if (analysisPhase.status !== "done" || !expenseItemsQuery.data) {
      return;
    }
    const analysis = analysisPhase.analysis;
    const analysisId = analysis.id;
    if (
      analysisId === null ||
      analysisId === undefined ||
      appliedAnalysis.current === analysisId
    ) {
      return;
    }
    if (analysis.receiptId !== receipt?.id) {
      return;
    }
    appliedAnalysis.current = analysisId;
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

  function changeMonth(value: string) {
    if (!value || value === month) {
      return;
    }
    uploadSequence.current += 1;
    void cancel(true);
    resetStatement();
    if (receipt) {
      releaseIfNotAttached(receipt);
    }
    resetForm();
    setResult(null);
    setMobilePanel("input");
    draft.changeMonth(value);
  }

  function changeType(code: string) {
    const old = getValues("itemCode");
    const expenseItem = expenseItemByCode.get(code) ?? null;
    setValue("itemCode", code, { shouldValidate: true, shouldDirty: true });
    setValue("proRataPct", expenseItem?.proRataPct ?? "100", {
      shouldValidate: true,
      shouldDirty: true,
    });
    setAi((previous) => ({ ...previous, type: false }));

    if (code === "loyer" && old !== "loyer") {
      if (!lineBeingEdited) {
        removeFile();
      } else {
        void cancel(true);
        resetStatement();
      }
      setValue("amountInclVat", rentReceipt.data?.total ?? "", {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else if (code !== "loyer" && old === "loyer") {
      setValue("amountInclVat", "", {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }

  function editLine(line: DraftLine) {
    uploadSequence.current += 1;
    void cancel(true);
    resetStatement();
    appliedAnalysis.current = null;
    setLineBeingEdited(line.key);
    const file: AttachedFile | null = line.receiptId
      ? {
          id: line.receiptId,
          name: line.receiptName ?? "Justificatif",
          size: null,
          mimeType: null,
        }
      : null;
    originalReceipt.current = file;
    setReceipt(file);
    setFileError(null);
    reset({
      itemCode: line.itemCode,
      amountInclVat:
        line.itemCode === "loyer" && rentReceipt.data?.total
          ? rentReceipt.data.total
          : line.amountInclVat,
      proRataPct: line.proRataPct,
    });
    setAi({
      type: false,
      amount: line.amountSource === "AI",
      amountConfirmed: true,
      detectedAmount: line.aiDetectedAmount,
      supplier: line.detectedSupplier,
      sourceExtract: null,
      confidence: line.aiConfidence,
    });
    setResult(null);
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    focusType();
  }

  function cancelEdit() {
    uploadSequence.current += 1;
    void cancel(true);
    resetStatement();
    if (receipt) {
      releaseIfNotAttached(receipt);
    }
    resetForm();
    focusType();
  }

  function saveExpense(submittedValues: ExpenseFormValues) {
    if (amountConfirmationPending) {
      toast.info(
        "Confirmez le montant détecté par IA avant d’ajouter le frais.",
      );
      return;
    }
    const expenseItem = expenseItemByCode.get(submittedValues.itemCode);
    if (!expenseItem?.code) {
      setError("itemCode", {
        type: "manual",
        message: "Sélectionnez un type de frais.",
      });
      return;
    }
    const others = companyLines.filter((line) => line.key !== lineBeingEdited);
    if (
      !expenseItem.multipleLinesAllowed &&
      typeAlreadyAdded(others, expenseItem.code)
    ) {
      setError("itemCode", {
        type: "manual",
        message:
          "Ce type est déjà présent. Modifiez la ligne existante ou autorisez plusieurs lignes.",
      });
      return;
    }
    const rentLine = expenseItem.code === "loyer";
    if (rentLine && !availableRent) {
      setFileError(
        "Ajoutez d’abord la quittance du mois pour utiliser ce type.",
      );
      return;
    }
    if (!rentLine && !receipt) {
      setFileError("Le justificatif est obligatoire pour ce type de frais.");
      return;
    }

    const amountInclVat = parseAmount(submittedValues.amountInclVat);
    const proRataPct = parsePercentage(submittedValues.proRataPct);
    if (amountInclVat === null || proRataPct === null) {
      return;
    }

    const line: DraftLine = {
      key: lineBeingEdited ?? newKey(),
      itemCode: expenseItem.code,
      amountInclVat: amountInclVat,
      proRataPct: proRataPct,
      receiptId: rentLine ? null : (receipt?.id ?? null),
      receiptName: rentLine ? null : (receipt?.name ?? null),
      amountSource: ai.amount ? "AI" : "MANUAL",
      aiDetectedAmount: ai.detectedAmount,
      aiConfidence: ai.confidence,
      detectedSupplier: ai.supplier,
    };

    if (lineBeingEdited) {
      draft.updateLine(lineBeingEdited, line);
      toast.success("Frais modifié.");
    } else {
      draft.addLine(line);
      toast.success("Frais ajouté.");
    }

    if (rentLine && receipt && originalReceipt.current?.id !== receipt.id) {
      releaseIfNotAttached(receipt);
    }
    uploadSequence.current += 1;
    void cancel(true);
    resetStatement();
    resetForm();
    setResult(null);
    focusType();
  }

  function removeLine() {
    if (!lineToRemove) {
      return;
    }
    const key = lineToRemove.key;
    draft.removeLine(key);
    if (lineBeingEdited === key) {
      resetForm();
    }
    setLineToRemove(null);
    setResult(null);
    toast.info("Frais supprimé.");
  }

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
            : "Les lignes contiennent une valeur invalide.",
      };
    }
  }, [orderedLines]);

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
    if (activeCompanyId === null) {
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
      !signatureAvailable
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
      if (selectedTemplate !== null) {
        requestBody.templateId = selectedTemplate;
      }
      if (selectedSignatureId !== null) {
        requestBody.signatureId = selectedSignatureId;
      }
      const statement = await api.expenseStatements.create(requestBody);
      setResult(statement);
      draft.markGenerated();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.statementsAll,
      });
      toast.success(
        `Note de ${formatMonth(month)} générée en version ${statement.version ?? 1}.`,
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setGenerationInProgress(false);
    }
  }

  function requestGeneration() {
    if (activeStatement.data) {
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
    values.amountInclVat,
    values.proRataPct,
  );
  const omittedTypes = missingTypes(expenseItems, companyLines);
  const lowConfidenceError = ai.confidence === "basse" && ai.amount;

  function optionDisabled(expenseItem: ExpenseItemDto): boolean {
    if (!expenseItem.code || expenseItem.multipleLinesAllowed) {
      return false;
    }
    if (
      lineBeingEdited &&
      companyLines.find((line) => line.key === lineBeingEdited)?.itemCode ===
        expenseItem.code
    ) {
      return false;
    }
    return typeAlreadyAdded(companyLines, expenseItem.code);
  }

  const displayedTotal = calculation?.total;
  const activeVersion = activeStatement.data?.version;
  const currentTemplate = activeModel?.name ?? "modèle intégré";

  function markAmountEdited() {
    setAi((previous) => ({
      ...previous,
      amount: false,
      amountConfirmed: true,
    }));
  }

  function confirmAmount() {
    setAi((previous) => ({ ...previous, amountConfirmed: true }));
  }

  function cancelAnalysis() {
    void cancel();
  }

  return {
    month,
    draft,
    mobile,
    mobilePanel,
    setMobilePanel,
    companies,
    activeCompany,
    activeCompanyId,
    expenseItemsQuery,
    templates,
    rentReceipt,
    activeStatement,
    signatures,
    employees,
    ceo,
    signatureList,
    selectedSignatureId,
    setChosenSignatureId,
    signatureAvailable,
    expenseItems,
    expenseItemByCode,
    orderedLines,
    models,
    activeModel,
    selectedTemplate,
    complete,
    register,
    handleSubmit,
    values,
    errors,
    isValid,
    isRent,
    availableRent,
    analysisPhase,
    cancelAnalysis,
    receipt,
    uploading,
    fileError,
    ai,
    amountConfirmationPending,
    lineBeingEdited,
    lineToRemove,
    setLineToRemove,
    regenerationDialog,
    setRegenerationDialog,
    generationInProgress,
    result,
    typeRef,
    formCardRef,
    upload,
    removeFile,
    changeMonth,
    changeType,
    editLine,
    cancelEdit,
    saveExpense,
    removeLine,
    requests,
    calculation,
    calculationInProgress,
    calculationError,
    calculationUpToDate,
    preview,
    previewRequest,
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
    markAmountEdited,
    confirmAmount,
  };
}
