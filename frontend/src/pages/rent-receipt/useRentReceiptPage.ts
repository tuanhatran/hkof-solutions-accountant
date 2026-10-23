import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { downloadBlob, errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import {
  queryKeys,
  useActiveRentReceipt,
  useLandlords,
  useLeases,
  useSignatures,
  useTemplates,
  useTenants,
} from "@/api/queries";
import type { RentReceiptDto } from "@/api/types";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePdfPreview } from "@/hooks/usePdfPreview";
import { periodOfMonth } from "@/lib/dates";
import { formatEUR, formatMonth, parseAmount } from "@/lib/format";
import {
  rentReceiptSchema,
  type RentReceiptFormValues,
} from "@/lib/validation";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { useStatementDraft } from "@/state/statementDraft";
import { toast } from "@/state/toasts";
import { requestFromValues } from "./rentReceiptRequest";

/**
 * Controller for the rent receipt page: lease selection, form, preview and
 * generation.
 */
export function useRentReceiptPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const draft = useRentReceiptDraft();
  const mobile = useMediaQuery("(max-width: 1023px)");
  const [mobilePanel, setMobilePanel] = useState<"saisie" | "apercu">("saisie");
  const [generationInProgress, setGenerationInProgress] = useState(false);
  const [result, setResult] = useState<RentReceiptDto | null>(null);
  const [chosenSignatureId, setChosenSignatureId] = useState<number | null>(
    null,
  );

  const landlords = useLandlords();
  const tenants = useTenants();
  const leases = useLeases();
  const templates = useTemplates("RENT_RECEIPT");
  const signatures = useSignatures();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<RentReceiptFormValues>({
    resolver: zodResolver(rentReceiptSchema),
    mode: "onChange",
    defaultValues: {
      month: draft.month,
      landlordId: draft.landlordId === null ? "" : String(draft.landlordId),
      tenantId: draft.tenantId === null ? "" : String(draft.tenantId),
      periodStart: draft.periodStart,
      periodEnd: draft.periodEnd,
      rentExclCharges: draft.rentExclCharges,
      charges: draft.charges,
      paymentDate: draft.paymentDate,
      issueDate: draft.issueDate,
    },
  });

  const values = watch();
  const validation = rentReceiptSchema.safeParse(values);

  const selectedLandlordId = values.landlordId
    ? Number(values.landlordId)
    : null;
  const selectedTenantId = values.tenantId ? Number(values.tenantId) : null;
  const activeRentReceipt = useActiveRentReceipt(
    draft.month,
    selectedLandlordId,
    selectedTenantId,
  );

  const signatureList = signatures.data ?? [];
  const linkedSignatures = signatureList.filter(
    (candidate) =>
      candidate.type === "LANDLORD" &&
      selectedLandlordId !== null &&
      candidate.landlordId === selectedLandlordId,
  );
  const legacySignatures = signatureList.filter(
    (candidate) =>
      candidate.type === "LANDLORD" &&
      (candidate.landlordId === null || candidate.landlordId === undefined),
  );
  const availableSignatures =
    selectedLandlordId === null
      ? signatureList.filter((candidate) => candidate.type === "LANDLORD")
      : [...linkedSignatures, ...legacySignatures];
  const chosenSignatureAvailable = availableSignatures.some(
    (candidate) => candidate.id === chosenSignatureId,
  );
  const selectedSignatureId = chosenSignatureAvailable
    ? chosenSignatureId
    : (availableSignatures[0]?.id ?? null);
  const signatureAvailable = availableSignatures.length > 0;
  const landlordWithoutSignature =
    selectedLandlordId !== null &&
    signatureList.length > 0 &&
    !signatures.isPending &&
    !signatureAvailable;

  useEffect(() => {
    setChosenSignatureId(null);
  }, [selectedLandlordId]);

  const models = templates.data ?? [];
  const activeModel = models.find((model) => model.active) ?? null;
  const selectedModel = draft.templateId ?? activeModel?.id ?? null;
  const landlordRows = landlords.data ?? [];
  const tenantRows = tenants.data ?? [];
  const leaseRows = leases.data ?? [];
  const selectedLease =
    leaseRows.find(
      (lease) =>
        lease.landlordId !== undefined &&
        lease.tenantId !== undefined &&
        String(lease.landlordId) === values.landlordId &&
        String(lease.tenantId) === values.tenantId,
    ) ?? null;
  // Without a full pair the hook falls back to the month-scoped query, whose
  // receipt belongs to no identifiable pair: never surface it on this page.
  const pairSelected =
    selectedLandlordId !== null && selectedTenantId !== null;
  const activePairReceipt = pairSelected
    ? (activeRentReceipt.data ?? null)
    : null;
  const request =
    validation.success && selectedLease
      ? requestFromValues(validation.data, selectedModel, selectedSignatureId)
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
    if (leases.isPending || leases.isError || draft.initialized) {
      return;
    }
    const candidates = leases.data ?? [];
    const matching =
      candidates.find(
        (lease) =>
          lease.landlordId === draft.landlordId &&
          lease.tenantId === draft.tenantId,
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
    setValue(
      "tenantId",
      matching.tenantId === undefined ? "" : String(matching.tenantId),
      { shouldValidate: true },
    );
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
    return formatEUR(Number(rent) + Number(costs));
  })();

  async function runGeneration(submittedValues: RentReceiptFormValues) {
    if (!validation.success) {
      return;
    }
    const requestBody = requestFromValues(
      submittedValues,
      selectedModel,
      selectedSignatureId,
    );
    setGenerationInProgress(true);
    try {
      const rentReceipt = await api.rentReceipts.create(requestBody);
      setResult(rentReceipt);
      draft.markGenerated();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.rentReceiptsAll,
      });
      toast.success(
        `Quittance de ${formatMonth(submittedValues.month)} générée en version ${rentReceipt.version ?? 1}.`,
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setGenerationInProgress(false);
    }
  }

  function submit(submittedValues: RentReceiptFormValues) {
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

  function selectPair(nextLandlordId: string, nextTenantId: string) {
    setValue("landlordId", nextLandlordId, { shouldValidate: true });
    setValue("tenantId", nextTenantId, { shouldValidate: true });
    const landlordId = nextLandlordId ? Number(nextLandlordId) : null;
    const tenantId = nextTenantId ? Number(nextTenantId) : null;
    const lease =
      leaseRows.find(
        (candidate) =>
          candidate.landlordId === landlordId &&
          candidate.tenantId === tenantId,
      ) ?? null;
    draft.selectPair(landlordId, tenantId, lease);
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
    toast.info("Montants repris depuis le bail.");
  }

  function changeMonth(value: string) {
    if (!value) {
      return;
    }
    draft.changeMonth(value);
    const period = periodOfMonth(value);
    setValue("periodStart", period.start, { shouldValidate: true });
    setValue("periodEnd", period.end, { shouldValidate: true });
  }

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
    landlords,
    tenants,
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
    landlordRows,
    tenantRows,
    models,
    selectedModel,
    availableSignatures,
    selectedSignatureId,
    setChosenSignatureId,
    signatureAvailable,
    landlordWithoutSignature,
    activeRentReceipt,
    activePairReceipt,
    activeVersion,
    displayedTotal,
    estimatedTotal,
    preview,
    validation,
    result,
    generationInProgress,
    submit,
    downloadRentReceipt,
    goToStatement,
    resumeLease,
    changeMonth,
    selectPair,
  };
}

export type RentReceiptController = ReturnType<typeof useRentReceiptPage>;
