import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { downloadBlob, errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import {
  queryKeys,
  useActiveRentReceipt,
  useCompanies,
  useLeases,
  usePersons,
  useSavedRentReceiptDraft,
  useSignatures,
  useTemplates,
} from "@/api/queries";
import type { RentReceiptDraftRequest } from "@/api/endpoints";
import type { RentReceiptDto } from "@/api/types";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePdfPreview } from "@/hooks/usePdfPreview";
import { periodOfMonth } from "@/lib/dates";
import { formatEUR, formatMonth, parseAmount } from "@/lib/format";
import {
  additionalChargeSchema,
  parseTenantKey,
  rentReceiptSchema,
  tenantKeyFromLease,
  type AdditionalChargeFormValues,
  type RentReceiptFormValues,
} from "@/lib/validation";
import { useDraftSaver } from "@/state/draftSaver";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { useStatementDraft } from "@/state/statementDraft";
import { toast } from "@/state/toasts";
import { requestFromValues } from "./rentReceiptRequest";

/** Option of the tenant select: a natural person or a company. */
export interface TenantOption {
  value: string;
  label: string;
}

/** Forces the receipt period onto the first and last day of its month. */
function withMonthPeriod(values: RentReceiptFormValues): RentReceiptFormValues {
  const period = periodOfMonth(values.month);
  return { ...values, periodStart: period.start, periodEnd: period.end };
}

/**
 * Charge row currently being entered: `index` is its position among the saved
 * rows, or null for a new row not saved yet.
 */
export interface EditingAdditionalCharge {
  index: number | null;
  label: string;
  amount: string;
  errors: { label?: string; amount?: string };
}

/**
 * Controller for the rent receipt page: lease selection, form, preview and
 * generation.
 */
export function useRentReceiptPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const draft = useRentReceiptDraft();
  const mobile = useMediaQuery("(max-width: 1023px)");
  const [mobilePanel, setMobilePanel] = useState<"saisie" | "apercu">("saisie");
  const [generationInProgress, setGenerationInProgress] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [result, setResult] = useState<RentReceiptDto | null>(null);
  const [chosenSignatureId, setChosenSignatureId] = useState<number | null>(
    null,
  );
  // The single in-progress charge row stays outside React Hook Form so the
  // preview, the draft and the generation only ever see saved rows.
  const [editingAdditionalCharge, setEditingAdditionalCharge] =
    useState<EditingAdditionalCharge | null>(null);

  const persons = usePersons();
  const companies = useCompanies();
  const leases = useLeases();
  const templates = useTemplates("RENT_RECEIPT");
  const initialPeriod = periodOfMonth(draft.month);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm<RentReceiptFormValues>({
    resolver: zodResolver(rentReceiptSchema),
    mode: "onChange",
    defaultValues: {
      month: draft.month,
      landlordId: draft.landlordId === null ? "" : String(draft.landlordId),
      tenantKey: draft.tenantKey ?? "",
      periodStart: initialPeriod.start,
      periodEnd: initialPeriod.end,
      rentExclCharges: draft.rentExclCharges,
      charges: draft.charges,
      paymentDate: draft.paymentDate,
      issueDate: draft.issueDate,
      additionalCharges: draft.additionalCharges,
    },
  });

  const values = watch();
  const validation = rentReceiptSchema.safeParse(values);

  // The draft store mirrors the rows so the persisted draft keeps them: compare a
  // signature to avoid a set/update loop, whatever the array reference identity.
  useEffect(() => {
    const signature = JSON.stringify(values.additionalCharges ?? []);
    if (signature !== JSON.stringify(draft.additionalCharges)) {
      draft.update({ additionalCharges: values.additionalCharges ?? [] });
    }
  }, [values.additionalCharges, draft]);

  const selectedLandlordId = values.landlordId
    ? Number(values.landlordId)
    : null;
  const {
    tenantId: selectedTenantId,
    tenantCompanyId: selectedTenantCompanyId,
  } = parseTenantKey(values.tenantKey ?? "");
  const selectedTenantKey = values.tenantKey ?? "";

  const leaseRows = leases.data ?? [];
  const selectedLease =
    leaseRows.find(
      (lease) =>
        lease.landlordId !== undefined &&
        String(lease.landlordId) === values.landlordId &&
        tenantKeyFromLease(lease) === selectedTenantKey &&
        selectedTenantKey !== "",
    ) ?? null;

  // A rent receipt takes its company from the lease only: a person lease has none.
  const receiptCompanyId = selectedLease?.companyId ?? null;
  const companyName = selectedLease?.companyName ?? null;
  const activeRentReceipt = useActiveRentReceipt(
    draft.month,
    receiptCompanyId,
    selectedLandlordId,
    selectedTenantId,
    selectedTenantCompanyId,
  );

  // Signatures belong to the selected landlord only: no cross-person fallback.
  const signatures = useSignatures(selectedLandlordId);
  const availableSignatures = signatures.data ?? [];
  const chosenSignatureAvailable = availableSignatures.some(
    (candidate) => candidate.id === chosenSignatureId,
  );
  const selectedSignatureId = chosenSignatureAvailable
    ? chosenSignatureId
    : (availableSignatures[0]?.id ?? null);
  const signatureAvailable = availableSignatures.length > 0;
  const landlordWithoutSignature =
    selectedLandlordId !== null &&
    !signatures.isPending &&
    !signatures.isError &&
    !signatureAvailable;

  useEffect(() => {
    setChosenSignatureId(null);
  }, [selectedLandlordId]);

  const models = templates.data ?? [];
  const activeModel = models.find((model) => model.active) ?? null;
  const selectedModel = draft.templateId ?? activeModel?.id ?? null;
  const personRows = persons.data ?? [];
  const companyRows = companies.data ?? [];
  const personTenantOptions: TenantOption[] = personRows
    .filter((person) => person.id !== undefined)
    .map((person) => ({
      value: `person:${person.id}`,
      label: person.name ?? t("rentReceipt.tenantOptions.personFallback"),
    }));
  const companyTenantOptions: TenantOption[] = companyRows
    .filter((company) => company.id !== undefined)
    .map((company) => ({
      value: `company:${company.id}`,
      label: company.name ?? t("rentReceipt.tenantOptions.companyFallback"),
    }));
  // Without a full pair the hook falls back to the month-scoped query, whose
  // receipt belongs to no identifiable pair: never surface it on this page.
  const pairSelected = selectedLandlordId !== null && selectedTenantKey !== "";
  const activePairReceipt = pairSelected
    ? (activeRentReceipt.data ?? null)
    : null;
  const singleTenant =
    (selectedTenantId === null) !== (selectedTenantCompanyId === null);
  const draftScopeReady = selectedLandlordId !== null && singleTenant;
  const savedDraft = useSavedRentReceiptDraft(
    draft.month,
    selectedLandlordId,
    selectedTenantId,
    selectedTenantCompanyId,
  );
  const hydratedScope = useRef<string | null>(null);

  // Re-selecting the same pair and month reloads the saved draft. Auto-prefill and
  // pair selection stay clean because the store captures a baseline on each action.
  useEffect(() => {
    const saved = savedDraft.data;
    if (!saved || saved.id === undefined) {
      return;
    }
    // The refetch after a save returns the row just written: hydrating it would
    // overwrite the edits made while the PUT then GET round-trip was in flight.
    if (draft.draftId !== null && saved.id === draft.draftId) {
      return;
    }
    const scopeKey = [
      saved.month ?? draft.month,
      saved.landlordId ?? "",
      saved.tenantId ?? "",
      saved.tenantCompanyId ?? "",
      saved.id,
    ].join("|");
    if (hydratedScope.current === scopeKey) {
      return;
    }
    hydratedScope.current = scopeKey;
    const savedMonth = saved.month ?? draft.month;
    const period = periodOfMonth(savedMonth);
    // A stored custom period is ignored: the month always wins.
    draft.loadFromDraft({
      ...saved,
      periodStart: period.start,
      periodEnd: period.end,
    });
    setValue("month", savedMonth, { shouldValidate: true });
    setValue(
      "landlordId",
      saved.landlordId === undefined || saved.landlordId === null
        ? ""
        : String(saved.landlordId),
      { shouldValidate: true },
    );
    const tenantKey =
      saved.tenantId !== undefined && saved.tenantId !== null
        ? `person:${saved.tenantId}`
        : saved.tenantCompanyId !== undefined && saved.tenantCompanyId !== null
          ? `company:${saved.tenantCompanyId}`
          : "";
    setValue("tenantKey", tenantKey, { shouldValidate: true });
    setValue("periodStart", period.start, { shouldValidate: true });
    setValue("periodEnd", period.end, { shouldValidate: true });
    setValue("rentExclCharges", saved.rentExclCharges ?? "", {
      shouldValidate: true,
    });
    setValue("charges", saved.charges ?? "", { shouldValidate: true });
    setValue("paymentDate", saved.paymentDate ?? "", { shouldValidate: true });
    setValue("issueDate", saved.issueDate ?? "", { shouldValidate: true });
    setValue("additionalCharges", saved.additionalCharges ?? [], {
      shouldValidate: true,
    });
    setEditingAdditionalCharge(null);
  }, [savedDraft.data, draft, setValue]);

  const request =
    validation.success && selectedLease
      ? requestFromValues(
          withMonthPeriod(validation.data),
          selectedModel,
          selectedSignatureId,
          receiptCompanyId,
        )
      : null;
  const signature = JSON.stringify(request ?? values);

  const preview = usePdfPreview(
    (signal) =>
      request
        ? api.rentReceipts.preview(request, signal)
        : Promise.reject(
            new DOMException("Formulaire incomplet", "AbortError"),
          ),
    signature,
    {
      active:
        validation.success && signatureAvailable && selectedLease !== null,
      debounceMs: 400,
    },
  );

  useEffect(() => {
    if (
      leases.isPending ||
      leases.isError ||
      draft.initialized ||
      savedDraft.data
    ) {
      return;
    }
    const candidates = leases.data ?? [];
    const matching =
      candidates.find(
        (lease) =>
          lease.landlordId === draft.landlordId &&
          tenantKeyFromLease(lease) === draft.tenantKey,
      ) ?? (candidates.length === 1 ? candidates[0] : null);
    if (!matching) {
      return;
    }
    draft.initializeFromLease(matching);
    setValue(
      "landlordId",
      matching.landlordId === undefined ? "" : String(matching.landlordId),
      { shouldValidate: true },
    );
    setValue("tenantKey", tenantKeyFromLease(matching), {
      shouldValidate: true,
    });
    setValue("rentExclCharges", matching.rentExclCharges ?? "", {
      shouldValidate: true,
    });
    setValue("charges", matching.charges ?? "", { shouldValidate: true });
    // Auto-selection must only happen once, when the lease directory loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leases.data, leases.isPending, leases.isError, draft.initialized]);

  const estimatedTotal = (() => {
    const rent = parseAmount(values.rentExclCharges) ?? "0";
    const costs = parseAmount(values.charges) ?? "0";
    const additional = (values.additionalCharges ?? []).reduce(
      (sum, charge) => sum + Number(parseAmount(charge.amount) ?? "0"),
      0,
    );
    return formatEUR(Number(rent) + Number(costs) + additional);
  })();

  async function runGeneration(submittedValues: RentReceiptFormValues) {
    if (!validation.success) {
      return;
    }
    setEditingAdditionalCharge(null);
    const requestBody = requestFromValues(
      withMonthPeriod(submittedValues),
      selectedModel,
      selectedSignatureId,
      receiptCompanyId,
    );
    setGenerationInProgress(true);
    try {
      const rentReceipt = await api.rentReceipts.create(requestBody);
      setResult(rentReceipt);
      // The generation deleted the scope draft server-side: drop the cached row
      // first, otherwise the hydration effect reloads it once `draftId` is gone.
      for (const month of new Set([submittedValues.month, draft.month])) {
        queryClient.setQueryData(
          queryKeys.rentReceiptDraft(
            month,
            selectedLandlordId,
            selectedTenantId,
            selectedTenantCompanyId,
          ),
          null,
        );
      }
      draft.markGenerated();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.rentReceiptsAll,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.drafts });
      toast.success(
        t("rentReceipt.toasts.generated", {
          month: formatMonth(submittedValues.month),
          version: rentReceipt.version ?? 1,
        }),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setGenerationInProgress(false);
    }
  }

  function submit(submittedValues: RentReceiptFormValues) {
    // An unsaved charge row would be silently dropped: generation waits for Save.
    if (editingAdditionalCharge !== null) {
      return;
    }
    // Unlimited ACTIVE receipts: every generation creates a new one, no dialog.
    void runGeneration(submittedValues);
  }

  async function downloadRentReceipt(rentReceipt: RentReceiptDto) {
    if (!rentReceipt.id) {
      return;
    }
    try {
      const reply = await api.rentReceipts.pdf(rentReceipt.id);
      downloadBlob(
        reply.blob,
        reply.fileName ?? `quittance_${rentReceipt.month ?? draft.month}.pdf`,
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  function goToStatement() {
    const month = result?.month ?? draft.month;
    useStatementDraft.getState().changeMonth(month);
    navigate("/generer/note-frais");
  }

  function selectPair(nextLandlordId: string, nextTenantKey: string) {
    setEditingAdditionalCharge(null);
    setValue("landlordId", nextLandlordId, { shouldValidate: true });
    setValue("tenantKey", nextTenantKey, { shouldValidate: true });
    const landlordId = nextLandlordId ? Number(nextLandlordId) : null;
    const lease =
      leaseRows.find(
        (candidate) =>
          String(candidate.landlordId ?? "") === nextLandlordId &&
          tenantKeyFromLease(candidate) === nextTenantKey,
      ) ?? null;
    draft.selectPair(landlordId, nextTenantKey || null, lease);
    if (lease) {
      setValue("rentExclCharges", lease.rentExclCharges ?? "", {
        shouldValidate: true,
      });
      setValue("charges", lease.charges ?? "", { shouldValidate: true });
    }
  }

  function resumeLease() {
    if (!selectedLease) {
      return;
    }
    draft.resumeFromLease(selectedLease);
    setValue("rentExclCharges", selectedLease.rentExclCharges ?? "", {
      shouldValidate: true,
    });
    setValue("charges", selectedLease.charges ?? "", {
      shouldValidate: true,
    });
    toast.info(t("rentReceipt.toasts.amountsResumed"));
  }

  function changeMonth(value: string) {
    if (!value) {
      return;
    }
    setEditingAdditionalCharge(null);
    draft.changeMonth(value);
    const period = periodOfMonth(value);
    setValue("periodStart", period.start, { shouldValidate: true });
    setValue("periodEnd", period.end, { shouldValidate: true });
  }

  function setAdditionalCharges(next: AdditionalChargeFormValues[]) {
    setValue("additionalCharges", next, { shouldValidate: true });
    draft.update({ additionalCharges: next });
  }

  function startAddAdditionalCharge() {
    const current = getValues("additionalCharges") ?? [];
    if (editingAdditionalCharge !== null || current.length >= 20) {
      return;
    }
    setEditingAdditionalCharge({
      index: null,
      label: "",
      amount: "",
      errors: {},
    });
  }

  function startEditAdditionalCharge(index: number) {
    if (editingAdditionalCharge !== null) {
      return;
    }
    const charge = (getValues("additionalCharges") ?? [])[index];
    if (!charge) {
      return;
    }
    setEditingAdditionalCharge({
      index,
      label: charge.label,
      amount: charge.amount,
      errors: {},
    });
  }

  function changeEditingAdditionalCharge(
    patch: Partial<Pick<EditingAdditionalCharge, "label" | "amount">>,
  ) {
    setEditingAdditionalCharge((current) => {
      if (!current) {
        return current;
      }
      const errors = { ...current.errors };
      if (patch.label !== undefined) {
        delete errors.label;
      }
      if (patch.amount !== undefined) {
        delete errors.amount;
      }
      return { ...current, ...patch, errors };
    });
  }

  function saveAdditionalCharge() {
    if (!editingAdditionalCharge) {
      return;
    }
    const parsed = additionalChargeSchema.safeParse({
      label: editingAdditionalCharge.label,
      amount: editingAdditionalCharge.amount,
    });
    if (!parsed.success) {
      const issue = (field: "label" | "amount") =>
        parsed.error.issues.find((candidate) => candidate.path[0] === field)
          ?.message;
      setEditingAdditionalCharge({
        ...editingAdditionalCharge,
        errors: { label: issue("label"), amount: issue("amount") },
      });
      return;
    }
    const saved: AdditionalChargeFormValues = {
      label: parsed.data.label,
      amount: parseAmount(parsed.data.amount) ?? parsed.data.amount,
    };
    const current = getValues("additionalCharges") ?? [];
    const next =
      editingAdditionalCharge.index === null
        ? [...current, saved]
        : current.map((charge, position) =>
            position === editingAdditionalCharge.index ? saved : charge,
          );
    setAdditionalCharges(next);
    setEditingAdditionalCharge(null);
  }

  function cancelAdditionalCharge() {
    setEditingAdditionalCharge(null);
  }

  function removeAdditionalCharge(index: number) {
    const current = getValues("additionalCharges") ?? [];
    setAdditionalCharges(current.filter((_, position) => position !== index));
    // The editing index points into the saved rows: shift it in the same update,
    // otherwise a later Save writes the edited charge onto another row.
    setEditingAdditionalCharge((editing) => {
      if (editing === null || editing.index === null) {
        return editing;
      }
      if (editing.index === index) {
        return null;
      }
      return editing.index > index
        ? { ...editing, index: editing.index - 1 }
        : editing;
    });
  }

  async function saveDraft(): Promise<boolean> {
    if (!draftScopeReady || selectedLandlordId === null) {
      return false;
    }
    const period = periodOfMonth(draft.month);
    const requestBody: RentReceiptDraftRequest = {
      month: draft.month,
      landlordId: selectedLandlordId,
      tenantId: selectedTenantId,
      tenantCompanyId: selectedTenantCompanyId,
      periodStart: period.start,
      periodEnd: period.end,
      rentExclCharges: draft.rentExclCharges,
      charges: draft.charges,
      paymentDate: draft.paymentDate,
      issueDate: draft.issueDate,
      templateId: draft.templateId,
      additionalCharges: draft.additionalCharges.map((charge) => ({
        ...charge,
      })),
    };
    try {
      setDraftSaving(true);
      const saved = await api.drafts.saveRentReceipt(requestBody);
      draft.markSaved(saved);
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

  const activeVersion = activePairReceipt?.version;
  const displayedTotal = result
    ? formatEUR(result.total)
    : activePairReceipt
      ? formatEUR(activePairReceipt.total)
      : null;

  return {
    navigate,
    draft,
    mobile,
    mobilePanel,
    setMobilePanel,
    persons,
    companies,
    leases,
    templates,
    signatures,
    register,
    handleSubmit,
    errors,
    isValid,
    values,
    selectedLease,
    leaseRows,
    companyName,
    personRows,
    companyRows,
    personTenantOptions,
    companyTenantOptions,
    models,
    selectedModel,
    availableSignatures,
    selectedSignatureId,
    setChosenSignatureId,
    signatureAvailable,
    landlordWithoutSignature,
    activeRentReceipt,
    activePairReceipt,
    savedDraft,
    draftScopeReady,
    saveDraft,
    activeVersion,
    displayedTotal,
    estimatedTotal,
    preview,
    validation,
    result,
    generationInProgress,
    draftSaving,
    submit,
    downloadRentReceipt,
    goToStatement,
    resumeLease,
    changeMonth,
    selectPair,
    editingAdditionalCharge,
    hasUnsavedAdditionalCharge: editingAdditionalCharge !== null,
    canAddAdditionalCharge:
      editingAdditionalCharge === null &&
      (values.additionalCharges ?? []).length < 20,
    startAddAdditionalCharge,
    startEditAdditionalCharge,
    changeEditingAdditionalCharge,
    saveAdditionalCharge,
    cancelAdditionalCharge,
    removeAdditionalCharge,
  };
}

export type RentReceiptController = ReturnType<typeof useRentReceiptPage>;
