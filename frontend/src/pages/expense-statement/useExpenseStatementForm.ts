import { zodResolver } from "@hookform/resolvers/zod";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import type { StatementDto } from "@/api/types";
import { useAnalysis } from "@/hooks/useAnalysis";
import { expenseSchema, type ExpenseFormValues } from "@/lib/validation";
import {
  AI_EMPTY,
  INITIAL_VALUES,
  type AiState,
  type AttachedFile,
  type ExpenseStatementRentReceiptSource,
} from "./expenseStatementTypes";

interface UseExpenseStatementFormOptions {
  activeCompanyId: number | null;
  rentReceipt: ExpenseStatementRentReceiptSource;
  setResult: Dispatch<SetStateAction<StatementDto | null>>;
}

/**
 * Form session of the expense statement: react-hook-form values, the optional
 * receipt upload with its sequence guard, the AI proposal state and the resets
 * shared by the page actions. The extraction itself is applied by
 * `useExpenseStatementAnalysis`.
 */
export function useExpenseStatementForm({
  activeCompanyId,
  rentReceipt,
  setResult,
}: UseExpenseStatementFormOptions) {
  const { t } = useTranslation();
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

  const uploadSequence = useRef(0);
  const appliedAnalysis = useRef<number | null>(null);
  const originalReceipt = useRef<AttachedFile | null>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const formCardRef = useRef<HTMLFormElement>(null);
  const previousCompanyId = useRef<number | null>(null);

  // The form and its attachment belong to one company: drop them on a switch. The
  // persisted draft lines stay, filtered by the active company's items.
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
        throw new Error(t("expenseStatement.toasts.receiptNotSaved"));
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
    typeRef,
    formCardRef,
    upload,
    removeFile,
    markAmountEdited,
    confirmAmount,
    // Session API shared with the extraction, editing and calculation hooks.
    setValue,
    getValues,
    reset,
    setError,
    cancel,
    resetStatement,
    setAi,
    setLineBeingEdited,
    setReceipt,
    setFileError,
    resetForm,
    focusType,
    releaseIfNotAttached,
    originalReceipt,
    appliedAnalysis,
    uploadSequence,
  };
}

export type ExpenseStatementForm = ReturnType<typeof useExpenseStatementForm>;
