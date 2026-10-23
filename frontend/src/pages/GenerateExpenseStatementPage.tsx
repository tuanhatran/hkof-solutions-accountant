import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { isCancellation, errorMessage, downloadBlob } from "@/api/client";
import { api } from "@/api/endpoints";
import {
  queryKeys,
  useActiveStatement,
  useSettings,
  useExpenseItems,
  useActiveRentReceipt,
  useTemplates,
} from "@/api/queries";
import type {
  CalculationResponse,
  AiConfidence,
  ExtractionDto,
  LineRequest,
  StatementPreviewRequest,
  StatementDto,
  StatementGenerationRequest,
  ExpenseItemDto,
} from "@/api/types";
import { AiBadge } from "@/components/AiBadge";
import { AmountConfirmButton } from "@/components/AmountConfirmButton";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorState, Spinner } from "@/components/States";
import { SelectedFile, FileDropzone } from "@/components/FileDropzone";
import { FieldGroup } from "@/components/FieldGroup";
import { PageHeader } from "@/components/PageHeader";
import { PdfViewer } from "@/components/PdfViewer";
import { ProRataInput } from "@/components/ProRataInput";
import {
  isAnalysisRunning,
  useAnalysis,
  type AnalysisState,
} from "@/hooks/useAnalysis";
import { usePdfPreview } from "@/hooks/usePdfPreview";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/cn";
import {
  formatDateTime,
  formatEUR,
  formatMonth,
  estimatedRetainedAmount,
  parseAmount,
  parsePercentage,
} from "@/lib/format";
import {
  newKey,
  typeAlreadyAdded,
  missingTypes,
  toLineRequest,
  type DraftLine,
} from "@/lib/lines";
import { expenseSchema, type ExpenseFormValues } from "@/lib/validation";
import { useStatementLines, useStatementDraft } from "@/state/statementDraft";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { toast } from "@/state/toasts";

const INITIAL_VALUES: ExpenseFormValues = {
  itemCode: "",
  amountInclVat: "",
  proRataPct: "100",
  monthlyAmountOverride: "",
};

interface AttachedFile {
  id: number;
  name: string;
  size: number | null;
  mimeType: string | null;
}

interface AiState {
  type: boolean;
  amount: boolean;
  amountConfirmed: boolean;
  detectedAmount: string | null;
  supplier: string | null;
  sourceExtract: string | null;
  confidence: AiConfidence | null;
}

const AI_EMPTY: AiState = {
  type: false,
  amount: false,
  amountConfirmed: false,
  detectedAmount: null,
  supplier: null,
  sourceExtract: null,
  confidence: null,
};

function confidenceValid(
  value: string | null | undefined,
): AiConfidence | null {
  return value === "haute" || value === "moyenne" || value === "basse"
    ? value
    : null;
}

function confidenceLabel(confidence: AiConfidence | null): string | null {
  if (confidence === "haute") {
    return "Confiance élevée";
  }
  if (confidence === "moyenne") {
    return "Confiance moyenne";
  }
  if (confidence === "basse") {
    return "Confiance faible — vérifiez les valeurs";
  }
  return null;
}

function AnalysisPanel({
  state: phase,
  hasFile,
  onCancel,
}: {
  state: AnalysisState;
  hasFile: boolean;
  onCancel: () => void;
}) {
  const inProgress = isAnalysisRunning(phase);
  const result: ExtractionDto | null =
    phase.status === "done" ? (phase.analysis.result ?? null) : null;
  const duration =
    phase.status === "done" && phase.analysis.durationMs
      ? `${(phase.analysis.durationMs / 1000).toFixed(1)} s`
      : null;

  return (
    <div
      data-cy="analyse-statut"
      aria-live="polite"
      className={cn(
        "rounded-xl border px-3.5 py-3 text-xs",
        phase.status === "failed"
          ? "border-warning/25 bg-warning-soft/40 text-warning"
          : phase.status === "done"
            ? "border-copper/20 bg-copper-soft/50 text-ink"
            : inProgress
              ? "border-accent/20 bg-accent-soft/45 text-ink"
              : "border-line bg-paper/50 text-ink-soft",
      )}
    >
      {inProgress ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-medium">
            <Spinner size={14} />
            {phase.status === "starting"
              ? "Préparation de l’analyse…"
              : "Analyse IA en cours — le modèle local peut prendre quelques secondes."}
          </span>
          <Button
            variant="ghost"
            small
            onClick={onCancel}
            data-cy="btn-annuler-analyse"
          >
            <X size={13} aria-hidden="true" />
            Annuler l’analyse
          </Button>
        </div>
      ) : phase.status === "done" ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <CheckCircle2
              size={14}
              className="text-copper"
              aria-hidden="true"
            />
            Analyse terminée{duration ? ` en ${duration}` : ""} — les champs ont
            été pré-remplis et le montant détecté remplace la valeur saisie.
          </p>
          {result ? (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-soft">
              <AiBadge sourceExtract={result.sourceExcerpt} />
              {result.supplier ? (
                <span>Fournisseur détecté : {result.supplier}</span>
              ) : null}
              {confidenceLabel(confidenceValid(result.confidence)) ? (
                <span
                  className={cn(
                    confidenceValid(result.confidence) === "basse" &&
                      "font-semibold text-warning",
                  )}
                >
                  {confidenceLabel(confidenceValid(result.confidence))}
                </span>
              ) : null}
            </div>
          ) : (
            <p className="text-[11px]">
              Aucune information exploitable n’a été extraite. Complétez le
              frais manuellement.
            </p>
          )}
          {result?.sourceExcerpt ? (
            <p className="border-l-2 border-copper/30 pl-2 text-[11px] italic text-ink-soft">
              « {result.sourceExcerpt} »
            </p>
          ) : null}
          <p className="text-[11px] text-ink-soft">
            Les propositions de l’IA restent modifiables. Vérifiez-les avant
            d’ajouter le frais.
          </p>
        </div>
      ) : phase.status === "failed" ? (
        <p className="flex items-start gap-2">
          <AlertTriangle
            size={14}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <span>
            {phase.message} L’analyse est facultative : vous pouvez saisir le
            montant et le prorata manuellement.
          </span>
        </p>
      ) : phase.status === "cancelled" ? (
        <p>{phase.message} La saisie manuelle reste disponible.</p>
      ) : (
        <p>
          {hasFile
            ? "Analyse non lancée. Vous pouvez saisir le frais manuellement."
            : "Déposez un justificatif : l’analyse IA démarrera automatiquement. Elle reste facultative."}
        </p>
      )}
    </div>
  );
}

export function GenerateExpenseStatementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const draft = useStatementDraft();
  const lines = useStatementLines();
  const mobile = useMediaQuery("(max-width: 1023px)");
  const [mobilePanel, setMobilePanel] = useState<"input" | "preview">("input");

  const month = draft.month;
  const settings = useSettings();
  const expenseItemsQuery = useExpenseItems(false);
  const templates = useTemplates("EXPENSE_STATEMENT");
  const rentReceipt = useActiveRentReceipt(month);
  const activeStatement = useActiveStatement(month);

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
    const currentLines = useStatementDraft.getState().linesByMonth[month] ?? [];
    let appliedType = false;
    let appliedAmount = false;

    const suggestedAmount =
      extraction.currency && extraction.currency.toUpperCase() !== "EUR"
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
    setValue("monthlyAmountOverride", "", { shouldDirty: true });
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
      monthlyAmountOverride: line.monthlyAmountOverride,
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
    const others = lines.filter((line) => line.key !== lineBeingEdited);
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
    const override = submittedValues.monthlyAmountOverride.trim()
      ? parseAmount(submittedValues.monthlyAmountOverride)
      : null;

    const line: DraftLine = {
      key: lineBeingEdited ?? newKey(),
      itemCode: expenseItem.code,
      amountInclVat: amountInclVat,
      proRataPct: proRataPct,
      monthlyAmountOverride: override ?? "",
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

  function changeProRata(line: DraftLine, value: string) {
    draft.updateLine(line.key, { proRataPct: value });
    setResult(null);
  }

  const requests = useMemo<{
    values: LineRequest[] | null;
    error: string | null;
  }>(() => {
    try {
      return { values: lines.map(toLineRequest), error: null };
    } catch (error) {
      return {
        values: null,
        error:
          error instanceof Error
            ? error.message
            : "Les lignes contiennent une valeur invalide.",
      };
    }
  }, [lines]);

  const calculationSignature = useMemo(
    () => JSON.stringify({ month, lines: requests.values }),
    [month, requests],
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
        const reply = await api.expenseStatements.calculate(
          { month, lines: validRequests },
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
  }, [calculationSignature, month, requests.error]);

  const calculationUpToDate =
    calculatedSignature === calculationSignature &&
    calculation !== null &&
    calculationError === null;

  const previewRequest = useMemo<StatementPreviewRequest | null>(() => {
    if (!requests.values || lines.length === 0) {
      return null;
    }
    const requestBody: StatementPreviewRequest = {
      month,
      complete,
      lines: requests.values,
    };
    if (selectedTemplate !== null) {
      requestBody.templateId = selectedTemplate;
    }
    return requestBody;
  }, [month, complete, selectedTemplate, requests, lines.length]);

  const preview = usePdfPreview(
    (signal) =>
      previewRequest
        ? api.expenseStatements.preview(previewRequest, signal)
        : Promise.reject(new DOMException("Aperçu inactif", "AbortError")),
    JSON.stringify(previewRequest ?? { inactive: true }),
    { active: previewRequest !== null, debounceMs: 400 },
  );

  function goToRentReceipt() {
    useRentReceiptDraft.getState().changeMonth(month);
    navigate("/generer/quittance");
  }

  async function generateStatement() {
    if (!requests.values || lines.length === 0 || !calculationUpToDate) {
      return;
    }
    setGenerationInProgress(true);
    try {
      const requestBody: StatementGenerationRequest = {
        month,
        lines: requests.values,
      };
      if (selectedTemplate !== null) {
        requestBody.templateId = selectedTemplate;
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
      const reply = await api.expenseStatements.pdf(
        statement.id,
        withAttachments,
      );
      downloadBlob(
        reply.blob,
        reply.fileName ??
          `note_frais_${statement.month ?? month}_v${statement.version ?? 1}${withAttachments ? "_complet" : ""}.pdf`,
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const typedOverride = values.monthlyAmountOverride.trim()
    ? parseAmount(values.monthlyAmountOverride)
    : null;
  const estimatedMonthAmount = typedOverride ?? values.amountInclVat;
  const displayedRetainedAmount = estimatedRetainedAmount(
    estimatedMonthAmount,
    values.proRataPct,
  );
  const omittedTypes = missingTypes(expenseItems, lines);
  const lowConfidenceError = ai.confidence === "basse" && ai.amount;

  function optionDisabled(expenseItem: ExpenseItemDto): boolean {
    if (!expenseItem.code || expenseItem.multipleLinesAllowed) {
      return false;
    }
    if (
      lineBeingEdited &&
      lines.find((line) => line.key === lineBeingEdited)?.itemCode ===
        expenseItem.code
    ) {
      return false;
    }
    return typeAlreadyAdded(lines, expenseItem.code);
  }

  const displayedTotal = calculation?.total;
  const activeVersion = activeStatement.data?.version;
  const currentTemplate = activeModel?.name ?? "modèle intégré";

  return (
    <>
      <PageHeader
        eyebrow="Générer · Note de frais"
        title="Note de frais d’occupation"
        description="Ajoutez les factures du mois, vérifiez les propositions de l’IA et laissez le backend calculer la quote-part. Le loyer est repris de la quittance active."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<ReceiptText size={15} />}
              onClick={goToRentReceipt}
            >
              Quittance du mois
            </Button>
            <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-2 text-xs font-medium text-ink-soft sm:inline-flex">
              <CalendarDays size={14} aria-hidden="true" />
              {formatMonth(month)}
            </span>
          </>
        }
      />

      {activeStatement.data && !result ? (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 border-accent/20 bg-accent-soft/45 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-accent">
              <FileCheck2 size={17} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                {formatMonth(month)} — note version {activeVersion} déjà active
              </p>
              <p className="text-xs text-ink-soft">
                Total {formatEUR(activeStatement.data.total)}. Générer à nouveau
                créera la version {(activeVersion ?? 0) + 1}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeStatement.data.id ? (
              <>
                <a
                  href={api.expenseStatements.pdfUrl(
                    activeStatement.data.id,
                    false,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-small"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  Ouvrir
                </a>
                <a
                  href={api.expenseStatements.pdfUrl(
                    activeStatement.data.id,
                    true,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-small"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  Version complète
                </a>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {settings.isError ? (
        <div className="mb-4">
          <ErrorState
            message={errorMessage(settings.error)}
            onRetry={() => void settings.refetch()}
          />
        </div>
      ) : null}
      {expenseItemsQuery.isError ? (
        <div className="mb-4">
          <ErrorState
            message={errorMessage(expenseItemsQuery.error)}
            onRetry={() => void expenseItemsQuery.refetch()}
          />
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <div
          className="segmented w-full"
          role="tablist"
          aria-label="Volets de génération"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === "input"}
            onClick={() => setMobilePanel("input")}
            className={cn(
              "segmented-item flex-1",
              mobilePanel === "input" && "segmented-item-active",
            )}
          >
            Saisie
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === "preview"}
            onClick={() => setMobilePanel("preview")}
            className={cn(
              "segmented-item flex flex-1 items-center justify-center gap-2",
              mobilePanel === "preview" && "segmented-item-active",
            )}
          >
            Aperçu
            {preview.updatedAt ? (
              <span
                className="h-1.5 w-1.5 rounded-full bg-accent"
                aria-hidden="true"
              />
            ) : null}
          </button>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.06fr)_minmax(400px,0.94fr)] xl:gap-6">
        <div
          data-cy="volet-saisie"
          className={cn(
            "min-w-0 space-y-4",
            mobile && mobilePanel !== "input" && "hidden",
          )}
        >
          <div className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">
                  {lineBeingEdited ? "Modification" : "Ajouter un frais"}
                </p>
                <h2 className="mt-1 text-[22px] text-ink">
                  {lineBeingEdited ? "Modifier le frais" : "Nouveau frais"}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="grid gap-2">
                  <label htmlFor="note-mois" className="sr-only">
                    Mois concerné
                  </label>
                  <input
                    id="note-mois"
                    type="month"
                    className="field mt-0 w-auto py-1.5 text-xs"
                    data-cy="select-mois"
                    value={month}
                    onChange={(event) => changeMonth(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <form
              ref={formCardRef}
              onSubmit={handleSubmit(saveExpense)}
              noValidate
            >
              <div className="card-body space-y-5">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                  <FieldGroup
                    id="frais-type"
                    label="Type de frais"
                    error={errors.itemCode?.message}
                    badge={
                      ai.type ? (
                        <AiBadge label="Type suggéré par IA" />
                      ) : undefined
                    }
                    help={
                      ai.supplier
                        ? `Fournisseur détecté : ${ai.supplier}`
                        : "Les libellés proviennent de votre configuration."
                    }
                  >
                    <select
                      id="frais-type"
                      ref={typeRef}
                      className={cn("field", errors.itemCode && "field-error")}
                      data-cy="select-type-frais"
                      value={values.itemCode}
                      onChange={(event) => changeType(event.target.value)}
                      aria-invalid={Boolean(errors.itemCode)}
                      disabled={expenseItemsQuery.isPending}
                    >
                      <option value="">Sélectionner…</option>
                      {expenseItems.map((expenseItem) => (
                        <option
                          key={expenseItem.code}
                          value={expenseItem.code}
                          disabled={optionDisabled(expenseItem)}
                        >
                          {expenseItem.label ?? expenseItem.code}
                          {expenseItem.supplier
                            ? ` (${expenseItem.supplier})`
                            : ""}
                          {optionDisabled(expenseItem) ? " — déjà ajouté" : ""}
                        </option>
                      ))}
                    </select>
                  </FieldGroup>

                  <FieldGroup
                    id="frais-prorata"
                    label="Prorata (%)"
                    error={errors.proRataPct?.message}
                    help="Champ libre : 35,71 ou 35,71 %."
                  >
                    <div className="relative">
                      <input
                        id="frais-prorata"
                        inputMode="decimal"
                        className={cn(
                          "field pr-9",
                          errors.proRataPct && "field-error",
                        )}
                        data-cy="input-prorata"
                        aria-invalid={Boolean(errors.proRataPct)}
                        {...register("proRataPct")}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-soft">
                        %
                      </span>
                    </div>
                  </FieldGroup>
                </div>

                {isRent ? (
                  <div className="rounded-xl border border-line bg-paper/50 p-4">
                    {rentReceipt.isPending ? (
                      <p className="flex items-center gap-2 text-sm text-ink-soft">
                        <Spinner size={16} /> Recherche de la quittance du mois…
                      </p>
                    ) : rentReceipt.data ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            Quittance de {formatMonth(month)} (v
                            {rentReceipt.data.version ?? 1}) :{" "}
                            <span className="number">
                              {formatEUR(rentReceipt.data.total)}
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-ink-soft">
                            Montant pré-rempli et verrouillé. La quittance sera
                            annexée automatiquement.
                          </p>
                        </div>
                        {rentReceipt.data.id ? (
                          <a
                            href={api.rentReceipts.pdfUrl(rentReceipt.data.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-small"
                          >
                            <ExternalLink size={13} aria-hidden="true" />
                            Voir le PDF
                          </a>
                        ) : null}
                      </div>
                    ) : (
                      <div
                        className="flex flex-wrap items-center justify-between gap-3"
                        data-cy="alerte-quittance-manquante"
                        role="alert"
                      >
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle
                            size={17}
                            className="mt-0.5 text-warning"
                            aria-hidden="true"
                          />
                          <div>
                            <p className="text-sm font-semibold text-ink">
                              Aucune quittance pour ce mois
                            </p>
                            <p className="mt-0.5 text-xs text-ink-soft">
                              Générez la quittance : le montant du loyer sera
                              repris et verrouillé.
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          small
                          onClick={goToRentReceipt}
                        >
                          Générer la quittance
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="field-label">
                        Fichier justificatif{" "}
                        <span className="text-danger">*</span>
                      </span>
                      <span className="text-[11px] text-ink-soft">
                        10 Mo max.
                      </span>
                    </div>
                    {uploading ? (
                      <div className="flex items-center gap-3 rounded-xl border border-line bg-paper/50 p-4 text-sm text-ink-soft">
                        <Spinner size={18} />
                        Envoi et préparation de l’analyse…
                      </div>
                    ) : receipt ? (
                      <SelectedFile
                        name={receipt.name}
                        size={receipt.size}
                        mimeType={receipt.mimeType}
                        onRemove={removeFile}
                      />
                    ) : (
                      <FileDropzone
                        onFile={(file) => void upload(file)}
                        dataCy="dropzone-fichier"
                        disabled={expenseItemsQuery.isPending}
                      />
                    )}
                    {fileError ? (
                      <p className="error-text" role="alert">
                        {fileError}
                      </p>
                    ) : null}
                  </div>
                )}

                {!isRent ? (
                  <AnalysisPanel
                    state={analysisPhase}
                    hasFile={receipt !== null || uploading}
                    onCancel={() => void cancel()}
                  />
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup
                    id="frais-montant"
                    label="Montant TTC"
                    error={errors.amountInclVat?.message}
                    badge={
                      ai.amount ? (
                        <AiBadge sourceExtract={ai.sourceExtract} />
                      ) : undefined
                    }
                  >
                    <div className="relative">
                      <input
                        id="frais-montant"
                        inputMode="decimal"
                        className={cn(
                          "field pr-9",
                          errors.amountInclVat && "field-error",
                          lowConfidenceError && ai.amount && "field-warning",
                        )}
                        data-cy="input-montant-ttc"
                        aria-invalid={Boolean(errors.amountInclVat)}
                        aria-readonly={isRent && availableRent}
                        readOnly={isRent && availableRent}
                        {...register("amountInclVat", {
                          onChange: () =>
                            setAi((previous) => ({
                              ...previous,
                              amount: false,
                              amountConfirmed: true,
                            })),
                        })}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-soft">
                        €
                      </span>
                    </div>
                  </FieldGroup>

                  <div className="flex flex-col justify-end rounded-xl border border-accent/15 bg-accent-soft/45 px-4 py-3">
                    <p className="eyebrow text-accent">Montant retenu estimé</p>
                    <p className="mt-1 font-display text-[24px] leading-none text-accent-strong number">
                      {displayedRetainedAmount}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-snug text-ink-soft">
                      Estimation d’affichage : le backend recalcule chaque ligne
                      avec arrondi au centime.
                    </p>
                  </div>
                </div>

                {ai.amount ? (
                  <AmountConfirmButton
                    confirmed={ai.amountConfirmed}
                    onConfirm={() =>
                      setAi((previous) => ({
                        ...previous,
                        amountConfirmed: true,
                      }))
                    }
                  />
                ) : null}

                {lowConfidenceError ? (
                  <p className="flex items-start gap-2 rounded-lg bg-warning-soft/50 px-3 py-2 text-xs text-warning">
                    <AlertTriangle
                      size={14}
                      className="mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    Confiance faible : vérifiez le montant avant d’ajouter le
                    frais.
                  </p>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup
                    id="frais-montant-mois"
                    label="Montant du mois (optionnel)"
                    error={errors.monthlyAmountOverride?.message}
                    help="Laissez vide pour retenir le montant TTC de la facture."
                  >
                    <div className="relative">
                      <input
                        id="frais-montant-mois"
                        inputMode="decimal"
                        className={cn(
                          "field pr-9",
                          errors.monthlyAmountOverride && "field-error",
                        )}
                        data-cy="input-montant-mois"
                        aria-invalid={Boolean(errors.monthlyAmountOverride)}
                        {...register("monthlyAmountOverride")}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-soft">
                        €
                      </span>
                    </div>
                  </FieldGroup>
                  <div className="flex flex-col justify-end">
                    <p className="rounded-lg bg-surface px-3 py-2.5 text-xs leading-relaxed text-ink-soft">
                      Montant retenu estimé pour {formatMonth(month)} :{" "}
                      <span className="number">{displayedRetainedAmount}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    icon={
                      lineBeingEdited ? (
                        <Pencil size={15} />
                      ) : (
                        <Plus size={16} />
                      )
                    }
                    disabled={
                      !isValid ||
                      uploading ||
                      (!isRent && !receipt) ||
                      (isRent && !availableRent) ||
                      amountConfirmationPending
                    }
                    data-cy="btn-ajouter-frais"
                  >
                    {lineBeingEdited
                      ? "Enregistrer la modification"
                      : "Ajouter ce frais"}
                  </Button>
                  {lineBeingEdited ? (
                    <Button variant="ghost" small onClick={cancelEdit}>
                      Annuler la modification
                    </Button>
                  ) : null}
                </div>
                <p className="text-[11px] text-ink-soft">
                  Le formulaire se réinitialise après chaque ajout.
                </p>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Liste</p>
                <h2 className="mt-1 text-[22px] text-ink">Frais ajoutés</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {omittedTypes.length > 0 ? (
                  <span
                    className="badge badge-warning"
                    title={`Il manque : ${omittedTypes.join(", ")}`}
                  >
                    <AlertTriangle size={11} aria-hidden="true" />
                    Il manque : {omittedTypes.join(", ")}
                  </span>
                ) : null}
                <span className="badge badge-neutral">
                  {lines.length} ligne{lines.length > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div data-cy="liste-frais">
              {lines.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-paper-deep/70 text-ink-soft">
                    <FileText size={20} aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-ink">
                    Aucun frais pour {formatMonth(month)}
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-ink-soft">
                    Sélectionnez un type de frais ci-dessus, déposez un
                    justificatif et ajoutez la ligne.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="expense-table min-w-[760px]">
                    <thead>
                      <tr>
                        <th scope="col">Type</th>
                        <th scope="col">Fournisseur</th>
                        <th scope="col" className="text-right">
                          Montant TTC
                        </th>
                        <th scope="col">Prorata</th>
                        <th scope="col" className="text-right">
                          Montant retenu
                        </th>
                        <th scope="col" className="text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, index) => {
                        const expenseItem = expenseItemByCode.get(
                          line.itemCode,
                        );
                        const dto = calculationUpToDate
                          ? calculation?.lines?.[index]
                          : undefined;
                        return (
                          <tr
                            key={line.key}
                            data-cy={`ligne-frais-${line.itemCode}`}
                          >
                            <td>
                              <p className="font-semibold text-ink">
                                {expenseItem?.label ??
                                  dto?.itemLabel ??
                                  line.itemCode}
                              </p>
                              {line.receiptName ? (
                                <p
                                  className="mt-0.5 max-w-[160px] truncate text-[11px] text-ink-soft"
                                  title={line.receiptName}
                                >
                                  {line.receiptName}
                                </p>
                              ) : null}
                            </td>
                            <td className="text-ink-soft">
                              {line.detectedSupplier ??
                                expenseItem?.supplier ??
                                "—"}
                            </td>
                            <td className="whitespace-nowrap text-right">
                              <span className="number font-semibold text-ink">
                                {formatEUR(line.amountInclVat)}
                              </span>
                              {line.amountSource === "AI" ? (
                                <span className="ml-2 inline-flex align-middle">
                                  <AiBadge />
                                </span>
                              ) : null}
                            </td>
                            <td>
                              <ProRataInput
                                label={`Prorata de ${expenseItem?.label ?? line.itemCode}`}
                                value={line.proRataPct}
                                onChange={(next) => changeProRata(line, next)}
                              />
                            </td>
                            <td className="whitespace-nowrap text-right">
                              {dto?.claimedAmount ? (
                                <span className="number font-semibold text-accent-strong">
                                  {formatEUR(dto.claimedAmount)}
                                </span>
                              ) : (
                                <span className="text-xs text-ink-soft">
                                  {calculationInProgress ? "Calcul…" : "—"}
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="flex items-center justify-end gap-1">
                                {line.receiptId ? (
                                  <a
                                    href={api.receipts.fileUrl(line.receiptId)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg p-1.5 text-ink-soft transition hover:bg-paper-deep hover:text-ink"
                                    aria-label={`Voir le justificatif de ${expenseItem?.label ?? line.itemCode}`}
                                    data-cy={`btn-voir-justificatif-${line.itemCode}`}
                                  >
                                    <FileText size={15} />
                                  </a>
                                ) : null}
                                <button
                                  type="button"
                                  className="rounded-lg p-1.5 text-ink-soft transition hover:bg-paper-deep hover:text-ink"
                                  onClick={() => editLine(line)}
                                  aria-label={`Modifier ${expenseItem?.label ?? line.itemCode}`}
                                  data-cy={`btn-modifier-${line.itemCode}`}
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  type="button"
                                  className="rounded-lg p-1.5 text-ink-soft transition hover:bg-danger-soft hover:text-danger"
                                  onClick={() => setLineToRemove(line)}
                                  aria-label={`Supprimer ${expenseItem?.label ?? line.itemCode}`}
                                  data-cy={`btn-supprimer-${line.itemCode}`}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-line px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Total retenu</p>
                  <p className="mt-1 flex items-baseline gap-2 font-display text-[30px] leading-none text-accent-strong">
                    <span className="number" data-cy="total-retenu">
                      {formatEUR(displayedTotal)}
                    </span>
                    {calculationInProgress ? <Spinner size={15} /> : null}
                  </p>
                  {calculation?.totalInWords ? (
                    <p className="mt-1.5 text-xs text-ink-soft">
                      Soit {calculation.totalInWords}.
                    </p>
                  ) : null}
                </div>
                <div className="text-right text-[11px] leading-relaxed text-ink-soft">
                  <p>
                    Base de prorata :{" "}
                    <span className="font-medium text-ink">
                      {calculation?.proRataBaseDetail ??
                        settings.data?.proRataBaseDetail ??
                        "—"}
                    </span>
                  </p>
                  {calculation?.proRataBase ? (
                    <p>
                      Quote-part de référence :{" "}
                      <span className="number">
                        {formatEUR(calculation.proRataBase)}
                      </span>
                    </p>
                  ) : null}
                  <p>Calcul backend · recalcul automatique (300 ms).</p>
                </div>
              </div>

              {calculationError ? (
                <p className="error-text" role="alert">
                  Calcul indisponible : {calculationError}
                </p>
              ) : null}
              {requests.error && !calculationError ? (
                <p className="error-text" role="alert">
                  {requests.error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="primary"
                  icon={<FileCheck2 size={16} />}
                  loading={generationInProgress}
                  disabled={lines.length === 0 || !calculationUpToDate}
                  onClick={requestGeneration}
                  data-cy="btn-generer-note"
                >
                  Générer la note de frais
                </Button>
                <p className="max-w-[300px] text-[11px] leading-snug text-ink-soft">
                  {lines.length === 0
                    ? "Ajoutez au moins un frais pour générer la note."
                    : !calculationUpToDate
                      ? "En attente du calcul backend à jour…"
                      : activeStatement.data
                        ? `Une version ${activeVersion} existe : la version ${(activeVersion ?? 0) + 1} sera créée.`
                        : "Le PDF définitif sera enregistré dans l’historique."}
                </p>
              </div>
            </div>
          </div>

          {result ? (
            <div className="card animation-fade overflow-hidden border-accent/25">
              <div className="flex items-start gap-3 bg-accent-soft/60 px-5 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white">
                  <FileCheck2 size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-accent">
                    Note de frais générée
                  </p>
                  <p className="mt-0.5 text-sm text-ink">
                    {formatMonth(result.month)} · version {result.version ?? 1}{" "}
                    · {formatEUR(result.total)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Enregistrée avec le template «{" "}
                    {result.templateName ?? currentTemplate} » v
                    {result.templateVersion ?? 1} le{" "}
                    {formatDateTime(result.createdAt)}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 px-5 py-4">
                <Button
                  variant="primary"
                  small
                  icon={<Download size={14} />}
                  onClick={() => void downloadStatement(result, false)}
                  data-cy="btn-telecharger-note"
                >
                  Télécharger la note seule
                </Button>
                <Button
                  variant="secondary"
                  small
                  icon={<Download size={14} />}
                  onClick={() => void downloadStatement(result, true)}
                  data-cy="btn-telecharger-note-complete"
                >
                  Télécharger la note complète
                </Button>
                {result.id ? (
                  <a
                    href={api.expenseStatements.pdfUrl(result.id, false)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-small"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    Ouvrir
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div
          data-cy="volet-apercu"
          className={cn(
            "min-w-0",
            mobile && mobilePanel !== "preview" && "hidden",
            "lg:sticky lg:top-6 lg:self-start",
          )}
        >
          <PdfViewer
            url={previewRequest ? preview.url : null}
            loading={preview.loading}
            error={
              requests.error
                ? "Corrigez les lignes en rouge pour actualiser l’aperçu."
                : lines.length === 0
                  ? "Ajoutez un frais pour voir l’aperçu de la note."
                  : preview.error
            }
            updatedAt={preview.updatedAt}
            onDownload={preview.download}
            actions={
              <>
                <select
                  aria-label="Template de la note de frais"
                  className="rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] font-medium text-ink-soft"
                  value={selectedTemplate ?? ""}
                  onChange={(event) =>
                    draft.setTemplate(
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                  disabled={models.length === 0}
                  data-cy="select-template"
                >
                  {models.length === 0 ? (
                    <option value="">Modèle intégré</option>
                  ) : null}
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} — v{model.version}
                    </option>
                  ))}
                </select>
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] font-medium text-ink-soft">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[#1d5b49]"
                    checked={complete}
                    onChange={(event) =>
                      draft.setComplete(event.target.checked)
                    }
                    data-cy="toggle-apercu-complet"
                  />
                  Avec annexes
                </label>
              </>
            }
          />
          <p className="mt-2 px-1 text-[11px] leading-relaxed text-ink-soft">
            L’aperçu est rendu par le backend à partir des mêmes lignes que le
            total affiché. Il porte un filigrane et n’est jamais enregistré.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={lineToRemove !== null}
        title="Supprimer ce frais ?"
        message={
          lineToRemove ? (
            <>
              La ligne «{" "}
              {expenseItemByCode.get(lineToRemove.itemCode)?.label ??
                lineToRemove.itemCode}{" "}
              » sera retirée du brouillon. Cette action ne modifie pas les
              versions déjà générées.
            </>
          ) : null
        }
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={removeLine}
        onCancel={() => setLineToRemove(null)}
        dataCy="dialogue-suppression-frais"
      />

      <ConfirmDialog
        open={regenerationDialog}
        title="Générer une nouvelle version ?"
        message={
          <>
            Une note active existe déjà pour {formatMonth(month)} (version{" "}
            {activeVersion}). La version {(activeVersion ?? 0) + 1} sera créée
            et l’ancienne restera consultable dans l’historique.
          </>
        }
        confirmLabel="Créer la nouvelle version"
        onConfirm={() => {
          setRegenerationDialog(false);
          void generateStatement();
        }}
        onCancel={() => setRegenerationDialog(false)}
        dataCy="dialogue-regeneration-note"
      />
    </>
  );
}
