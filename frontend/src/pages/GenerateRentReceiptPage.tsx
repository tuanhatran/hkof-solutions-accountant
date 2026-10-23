import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Download,
  ExternalLink,
  FileCheck2,
  LoaderCircle,
  ReceiptText,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import {
  queryKeys,
  useActiveRentReceipt,
  useLandlords,
  useLeases,
  useTemplates,
  useSignatures,
  useTenants,
} from "@/api/queries";
import type { RentReceiptDto, RentReceiptRequest } from "@/api/types";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorState } from "@/components/States";
import { FieldGroup } from "@/components/FieldGroup";
import { PageHeader } from "@/components/PageHeader";
import { PdfViewer } from "@/components/PdfViewer";
import { signatureTypeLabel } from "@/components/SignaturesManager";
import { downloadBlob } from "@/api/client";
import { usePdfPreview } from "@/hooks/usePdfPreview";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { periodOfMonth } from "@/lib/dates";
import { formatEUR, formatMonth, parseAmount } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { useStatementDraft } from "@/state/statementDraft";
import { toast } from "@/state/toasts";
import {
  rentReceiptSchema,
  type RentReceiptFormValues,
} from "@/lib/validation";

function requestFromValues(
  values: RentReceiptFormValues,
  templateId: number | null,
  signatureId: number | null,
): RentReceiptRequest {
  const request: RentReceiptRequest = {
    month: values.month,
    landlordId: Number(values.landlordId),
    tenantId: Number(values.tenantId),
    periodStart: values.periodStart,
    periodEnd: values.periodEnd,
    rentExclCharges: parseAmount(values.rentExclCharges) ?? "",
    charges: parseAmount(values.charges) ?? "",
  };
  if (values.paymentDate) {
    request.paymentDate = values.paymentDate;
  }
  if (values.issueDate) {
    request.issueDate = values.issueDate;
  }
  if (templateId !== null) {
    request.templateId = templateId;
  }
  if (signatureId !== null) {
    request.signatureId = signatureId;
  }
  return request;
}

export function GenerateRentReceiptPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const draft = useRentReceiptDraft();
  const mobile = useMediaQuery("(max-width: 1023px)");
  const [mobilePanel, setMobilePanel] = useState<"saisie" | "apercu">("saisie");
  const [regenerationDialog, setRegenerationDialog] = useState(false);
  const [generationInProgress, setGenerationInProgress] = useState(false);
  const [result, setResult] = useState<RentReceiptDto | null>(null);
  const pendingValues = useRef<RentReceiptFormValues | null>(null);

  const landlords = useLandlords();
  const tenants = useTenants();
  const leases = useLeases();
  const templates = useTemplates("RENT_RECEIPT");
  const signatures = useSignatures();
  const activeRentReceipt = useActiveRentReceipt(draft.month);

  const signatureList = signatures.data ?? [];
  const [chosenSignatureId, setChosenSignatureId] = useState<number | null>(
    null,
  );
  const defaultSignature =
    signatureList.find((candidate) => candidate.type === "LANDLORD") ??
    signatureList[0] ??
    null;
  const selectedSignatureId = chosenSignatureId ?? defaultSignature?.id ?? null;
  const signatureAvailable = signatureList.length > 0;

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
    pendingValues.current = submittedValues;
    if (activeRentReceipt.data) {
      setRegenerationDialog(true);
      return;
    }
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

  const activeVersion = activeRentReceipt.data?.version;
  const displayedTotal = result
    ? formatEUR(result.total)
    : activeRentReceipt.data
      ? formatEUR(activeRentReceipt.data.total)
      : null;

  return (
    <>
      <PageHeader
        eyebrow="Générer · Quittance"
        title="Quittance de loyer"
        description="Choisissez le mois et le bail : la période et les montants sont pré-remplis depuis le bail actif. Ajustez si besoin, puis générez le document définitif."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<ReceiptText size={15} />}
              onClick={() => navigate("/generer/note-frais")}
            >
              Note de frais du mois
            </Button>
            <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-2 text-xs font-medium text-ink-soft sm:inline-flex">
              <CalendarDays size={14} aria-hidden="true" />
              {formatMonth(draft.month)}
            </span>
          </>
        }
      />

      {landlords.isError || tenants.isError || leases.isError ? (
        <div className="mb-4">
          <ErrorState
            message={errorMessage(
              leases.error ?? tenants.error ?? landlords.error,
            )}
            onRetry={() => {
              void landlords.refetch();
              void tenants.refetch();
              void leases.refetch();
            }}
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
            aria-selected={mobilePanel === "saisie"}
            onClick={() => setMobilePanel("saisie")}
            className={cn(
              "segmented-item flex-1",
              mobilePanel === "saisie" && "segmented-item-active",
            )}
          >
            Saisie
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === "apercu"}
            onClick={() => setMobilePanel("apercu")}
            className={cn(
              "segmented-item flex flex-1 items-center justify-center gap-2",
              mobilePanel === "apercu" && "segmented-item-active",
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

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(400px,0.98fr)] xl:gap-6">
        <div
          data-cy="volet-saisie"
          className={cn(
            "min-w-0 space-y-4",
            mobile && mobilePanel !== "saisie" && "hidden",
          )}
        >
          {activeRentReceipt.data && !result ? (
            <div className="card flex flex-wrap items-center justify-between gap-3 border-accent/20 bg-accent-soft/45 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-accent">
                  <FileCheck2 size={17} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {formatMonth(activeRentReceipt.data.month)} — version{" "}
                    {activeVersion} déjà active
                  </p>
                  <p className="text-xs text-ink-soft">
                    Total {displayedTotal}. Générer à nouveau créera la version{" "}
                    {(activeVersion ?? 0) + 1}.
                  </p>
                </div>
              </div>
              {activeRentReceipt.data.id ? (
                <a
                  href={api.rentReceipts.pdfUrl(activeRentReceipt.data.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-small"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  Ouvrir le PDF
                </a>
              ) : null}
            </div>
          ) : null}

          {result ? (
            <div className="card animation-fade overflow-hidden border-accent/25">
              <div className="flex items-start gap-3 bg-accent-soft/60 px-5 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white">
                  <FileCheck2 size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-accent">
                    Quittance générée
                  </p>
                  <p className="mt-0.5 text-sm text-ink">
                    {formatMonth(result.month)} · version {result.version ?? 1}{" "}
                    · {formatEUR(result.total)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Enregistrée dans l’historique avec le template «{" "}
                    {result.templateName ?? "modèle intégré"} » v
                    {result.templateVersion ?? 1}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 px-5 py-4">
                <Button
                  variant="primary"
                  small
                  icon={<Download size={14} />}
                  onClick={() => void downloadRentReceipt(result)}
                  data-cy="btn-telecharger-quittance"
                >
                  Télécharger le PDF
                </Button>
                {result.id ? (
                  <a
                    href={api.rentReceipts.pdfUrl(result.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-small"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    Ouvrir
                  </a>
                ) : null}
                <Button variant="ghost" small onClick={goToStatement}>
                  Aller à la note de frais de ce mois
                </Button>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit(submit)} noValidate>
            <div className="card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Étape 1</p>
                  <h2 className="mt-1 text-[22px] text-ink">
                    Paramètres de la quittance
                  </h2>
                </div>
                <span className="badge badge-neutral">
                  <Sparkles size={11} aria-hidden="true" />
                  Calcul backend
                </span>
              </div>

              <div className="card-body space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup
                    id="quittance-mois"
                    label="Mois concerné"
                    error={errors.month?.message}
                    help="La période est recalculée automatiquement."
                  >
                    <input
                      id="quittance-mois"
                      type="month"
                      className={cn("field", errors.month && "field-error")}
                      data-cy="select-mois"
                      aria-invalid={Boolean(errors.month)}
                      {...register("month", {
                        onChange: (event) => changeMonth(event.target.value),
                      })}
                    />
                  </FieldGroup>

                  <FieldGroup
                    id="quittance-template"
                    label="Template"
                    help="Le modèle actif est utilisé par défaut."
                    badge={
                      <span className="badge badge-neutral">Versionné</span>
                    }
                  >
                    <select
                      id="quittance-template"
                      className="field"
                      data-cy="select-template"
                      value={selectedModel ?? ""}
                      onChange={(event) =>
                        draft.setTemplate(
                          event.target.value
                            ? Number(event.target.value)
                            : null,
                        )
                      }
                      disabled={templates.isPending || models.length === 0}
                    >
                      {models.length === 0 ? (
                        <option value="">Modèle intégré</option>
                      ) : null}
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} — v{model.version}
                          {model.active ? " (actif)" : ""}
                        </option>
                      ))}
                    </select>
                  </FieldGroup>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup
                    id="quittance-bailleur"
                    label="Bailleur"
                    error={errors.landlordId?.message}
                    help="Bailleur du bail actif."
                  >
                    <select
                      id="quittance-bailleur"
                      className={cn(
                        "field",
                        errors.landlordId && "field-error",
                      )}
                      data-cy="select-bailleur"
                      aria-invalid={Boolean(errors.landlordId)}
                      disabled={landlords.isPending}
                      {...register("landlordId", {
                        onChange: (event) =>
                          selectPair(event.target.value, values.tenantId),
                      })}
                    >
                      <option value="">Sélectionnez un bailleur</option>
                      {landlordRows.map((landlord) => (
                        <option key={landlord.id} value={landlord.id}>
                          {landlord.name}
                        </option>
                      ))}
                    </select>
                  </FieldGroup>

                  <FieldGroup
                    id="quittance-locataire"
                    label="Locataire"
                    error={errors.tenantId?.message}
                    help="Locataire du bail actif."
                  >
                    <select
                      id="quittance-locataire"
                      className={cn("field", errors.tenantId && "field-error")}
                      data-cy="select-locataire"
                      aria-invalid={Boolean(errors.tenantId)}
                      disabled={tenants.isPending}
                      {...register("tenantId", {
                        onChange: (event) =>
                          selectPair(values.landlordId, event.target.value),
                      })}
                    >
                      <option value="">Sélectionnez un locataire</option>
                      {tenantRows.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </FieldGroup>
                </div>

                {values.landlordId && values.tenantId && !selectedLease && !leases.isPending ? (
                  <p
                    className="rounded-xl border border-danger/20 bg-danger-soft/60 p-3 text-xs text-danger"
                    role="alert"
                    data-cy="alerte-bail-manquant"
                  >
                    Aucun bail actif pour ce bailleur et ce locataire. Créez le
                    bail dans la page{" "}
                    <Link to="/configuration" className="link">
                      Configuration
                    </Link>
                    .
                  </p>
                ) : null}

                {selectedLease ? (
                  <div
                    className="rounded-xl border border-accent/15 bg-accent-soft/45 px-4 py-3"
                    data-cy="detail-bail"
                  >
                    <p className="eyebrow text-accent">Bail sélectionné</p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {selectedLease.landlordName} →{" "}
                      {selectedLease.tenantName}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {selectedLease.propertyAddress}
                    </p>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup
                    id="quittance-signature"
                    label="Signature"
                    help="Image apposée au bas du PDF généré."
                    badge={
                      <span className="badge badge-neutral">PNG / JPEG</span>
                    }
                  >
                    <select
                      id="quittance-signature"
                      className="field"
                      data-cy="select-signature"
                      value={selectedSignatureId ?? ""}
                      onChange={(event) =>
                        setChosenSignatureId(
                          event.target.value
                            ? Number(event.target.value)
                            : null,
                        )
                      }
                      disabled={
                        signatures.isPending || signatureList.length === 0
                      }
                    >
                      {signatureList.length === 0 ? (
                        <option value="">Aucune signature</option>
                      ) : null}
                      {signatureList.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name} — {signatureTypeLabel(candidate.type)}
                        </option>
                      ))}
                    </select>
                  </FieldGroup>
                </div>

                {signatures.isError ? (
                  <p
                    className="rounded-xl border border-danger/20 bg-danger-soft/60 p-3 text-xs text-danger"
                    role="alert"
                    aria-live="polite"
                    data-cy="alerte-signatures-erreur"
                  >
                    Les signatures n’ont pas pu être chargées :{" "}
                    {errorMessage(signatures.error)}
                  </p>
                ) : !signatureAvailable && !signatures.isPending ? (
                  <p
                    className="rounded-xl border border-danger/20 bg-danger-soft/60 p-3 text-xs text-danger"
                    role="alert"
                    data-cy="alerte-signature-manquante"
                  >
                    Aucune signature trouvée. Configurez une signature dans la
                    page{" "}
                    <Link to="/configuration" className="link">
                      Paramètres
                    </Link>
                    .
                  </p>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup
                    id="quittance-debut"
                    label="Début de période"
                    error={errors.periodStart?.message}
                  >
                    <input
                      id="quittance-debut"
                      type="date"
                      className={cn(
                        "field",
                        errors.periodStart && "field-error",
                      )}
                      aria-invalid={Boolean(errors.periodStart)}
                      {...register("periodStart", {
                        onChange: (event) =>
                          draft.update({ periodStart: event.target.value }),
                      })}
                    />
                  </FieldGroup>
                  <FieldGroup
                    id="quittance-fin"
                    label="Fin de période"
                    error={errors.periodEnd?.message}
                  >
                    <input
                      id="quittance-fin"
                      type="date"
                      className={cn("field", errors.periodEnd && "field-error")}
                      aria-invalid={Boolean(errors.periodEnd)}
                      {...register("periodEnd", {
                        onChange: (event) =>
                          draft.update({ periodEnd: event.target.value }),
                      })}
                    />
                  </FieldGroup>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup
                    id="quittance-loyer"
                    label="Loyer hors charges"
                    error={errors.rentExclCharges?.message}
                    help="Modifiable pour une régularisation ponctuelle."
                  >
                    <div className="relative">
                      <input
                        id="quittance-loyer"
                        inputMode="decimal"
                        className={cn(
                          "field pr-9",
                          errors.rentExclCharges && "field-error",
                        )}
                        aria-invalid={Boolean(errors.rentExclCharges)}
                        {...register("rentExclCharges", {
                          onChange: (event) =>
                            draft.update({
                              rentExclCharges: event.target.value,
                            }),
                        })}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-soft">
                        €
                      </span>
                    </div>
                  </FieldGroup>
                  <FieldGroup
                    id="quittance-charges"
                    label="Provision pour charges"
                    error={errors.charges?.message}
                  >
                    <div className="relative">
                      <input
                        id="quittance-charges"
                        inputMode="decimal"
                        className={cn(
                          "field pr-9",
                          errors.charges && "field-error",
                        )}
                        aria-invalid={Boolean(errors.charges)}
                        {...register("charges", {
                          onChange: (event) =>
                            draft.update({ charges: event.target.value }),
                        })}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-soft">
                        €
                      </span>
                    </div>
                  </FieldGroup>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/15 bg-accent-soft/45 px-4 py-3.5">
                  <div>
                    <p className="eyebrow text-accent">Total estimé</p>
                    <p className="mt-1 font-display text-[28px] leading-none text-accent-strong number">
                      {estimatedTotal}
                    </p>
                  </div>
                  <p className="max-w-[240px] text-right text-[11px] leading-snug text-ink-soft">
                    Affichage estimé. Le backend calcule le total du PDF avec
                    arrondi au centime.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup
                    id="quittance-paiement"
                    label="Date de paiement"
                    error={errors.paymentDate?.message}
                  >
                    <input
                      id="quittance-paiement"
                      type="date"
                      className={cn(
                        "field",
                        errors.paymentDate && "field-error",
                      )}
                      {...register("paymentDate", {
                        onChange: (event) =>
                          draft.update({ paymentDate: event.target.value }),
                      })}
                    />
                  </FieldGroup>
                  <FieldGroup
                    id="quittance-emission"
                    label="Date d’émission"
                    error={errors.issueDate?.message}
                  >
                    <input
                      id="quittance-emission"
                      type="date"
                      className={cn("field", errors.issueDate && "field-error")}
                      {...register("issueDate", {
                        onChange: (event) =>
                          draft.update({ issueDate: event.target.value }),
                      })}
                    />
                  </FieldGroup>
                </div>

                <p className="hint">
                  Les coordonnées du bailleur, du locataire et du logement
                  proviennent du bail sélectionné. Gérez les baux dans la{" "}
                  <button
                    type="button"
                    className="link"
                    onClick={() => navigate("/configuration")}
                  >
                    configuration
                  </button>
                  .
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={generationInProgress}
                    icon={<ReceiptText size={16} />}
                    disabled={
                      !isValid ||
                      !selectedLease ||
                      activeRentReceipt.isPending ||
                      templates.isPending ||
                      leases.isPending ||
                      !signatureAvailable
                    }
                    data-cy="btn-generer-quittance"
                  >
                    Générer la quittance
                  </Button>
                  <Button
                    variant="ghost"
                    small
                    icon={<RotateCcw size={13} />}
                    onClick={resumeLease}
                    disabled={!selectedLease || generationInProgress}
                  >
                    Reprendre le bail
                  </Button>
                </div>
                {activeRentReceipt.data ? (
                  <p className="text-[11px] text-ink-soft">
                    Version active : v{activeVersion} → v
                    {(activeVersion ?? 0) + 1} à la génération.
                  </p>
                ) : (
                  <p className="text-[11px] text-ink-soft">
                    {generationInProgress ? (
                      <span className="inline-flex items-center gap-1.5">
                        <LoaderCircle size={12} className="animate-spin" />{" "}
                        Génération en cours…
                      </span>
                    ) : (
                      "Le PDF définitif est enregistré dans l’historique."
                    )}
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>

        <div
          data-cy="volet-apercu"
          className={cn(
            "min-w-0",
            mobile && mobilePanel !== "apercu" && "hidden",
            "lg:sticky lg:top-6 lg:self-start",
          )}
        >
          <PdfViewer
            url={preview.url}
            loading={preview.loading}
            error={
              !validation.success
                ? "Complétez les champs de la quittance pour actualiser l’aperçu."
                : !selectedLease
                  ? "Sélectionnez un bailleur et un locataire liés par un bail actif."
                  : !signatureAvailable
                    ? "Configurez une signature pour afficher l’aperçu."
                    : preview.error
            }
            updatedAt={preview.updatedAt}
            onDownload={preview.download}
            actions={
              <select
                aria-label="Template de la quittance"
                className="rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] font-medium text-ink-soft"
                value={selectedModel ?? ""}
                onChange={(event) =>
                  draft.setTemplate(
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
                disabled={models.length === 0}
                data-cy="select-template-apercu"
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
            }
          />
          <p className="mt-2 px-1 text-[11px] leading-relaxed text-ink-soft">
            L’aperçu est rendu par le backend à partir du template actif. Il
            porte un filigrane et n’est jamais enregistré.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={regenerationDialog}
        title="Générer une nouvelle version ?"
        message={
          <>
            Une quittance active existe déjà pour {formatMonth(draft.month)}{" "}
            (version {activeVersion}). La version {(activeVersion ?? 0) + 1}{" "}
            sera créée et l’ancienne restera consultable dans l’historique.
          </>
        }
        confirmLabel="Créer la nouvelle version"
        onConfirm={() => {
          setRegenerationDialog(false);
          const submittedValues = pendingValues.current;
          if (submittedValues) {
            void runGeneration(submittedValues);
          }
        }}
        onCancel={() => setRegenerationDialog(false)}
        dataCy="dialogue-regeneration-quittance"
      />
    </>
  );
}
