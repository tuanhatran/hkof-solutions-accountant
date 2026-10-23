import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Check,
  Home,
  Landmark,
  PencilLine,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useSettings, useExpenseItems } from "@/api/queries";
import type {
  SettingsDto,
  SettingsRequest,
  ExpenseItemDto,
  ExpenseItemRequest,
} from "@/api/types";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LoadingState, ErrorState } from "@/components/States";
import { SignaturesManager } from "@/components/SignaturesManager";
import { FieldGroup } from "@/components/FieldGroup";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/cn";
import {
  formatEUR,
  formatPercentage,
  parseAmount,
  parsePercentage,
} from "@/lib/format";
import {
  settingsSchema,
  expenseItemSchema,
  type SettingsFormValues,
  type ExpenseItemFormValues,
} from "@/lib/validation";
import { toast } from "@/state/toasts";

const PERIODICITIES = [
  { value: "MONTHLY", label: "Mensuelle" },
  { value: "BIMONTHLY", label: "Bimestrielle" },
  { value: "ANNUAL", label: "Annuelle" },
] as const;

type Periodicity = (typeof PERIODICITIES)[number]["value"];

function decimalFormatter(value: string | undefined): string {
  return value ? value.replace(".", ",") : "";
}

function valuesFromSettings(
  settings: SettingsDto | undefined,
): SettingsFormValues {
  return {
    companyName: settings?.companyName ?? "",
    legalForm: settings?.legalForm ?? "",
    siren: settings?.siren ?? "",
    companyAddress: settings?.companyAddress ?? "",
    managerName: settings?.managerName ?? "",
    homeAddress: settings?.homeAddress ?? "",
    totalArea: decimalFormatter(settings?.totalArea),
    businessArea: decimalFormatter(settings?.businessArea),
    landlordName: settings?.landlordName ?? "",
    landlordAddress: settings?.landlordAddress ?? "",
    tenantName: settings?.tenantName ?? "",
    tenantAddress: settings?.tenantAddress ?? "",
    rentExclCharges: decimalFormatter(settings?.rentExclCharges),
    chargesAdvance: decimalFormatter(settings?.chargesAdvance),
    issuePlace: settings?.issuePlace ?? "",
  };
}

function cents(value: string): number {
  const normalized = parseAmount(value);
  return normalized === null ? 0 : Math.round(Number(normalized) * 100);
}

function SectionHeader({
  icon: IconComponent,
  title,
  description,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
        <IconComponent size={17} aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-lg text-ink">{title}</h2>
        <p className="mt-0.5 text-xs text-ink-soft">{description}</p>
      </div>
    </div>
  );
}

function SwitchField({
  id,
  label: labelText,
  description,
  register,
}: {
  id: string;
  label: string;
  description: string;
  register: ReturnType<typeof useForm<ExpenseItemFormValues>>["register"];
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper/35 p-3 transition hover:border-line-strong"
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-accent accent-[#1b5b49]"
        {...register(id === "poste-actif" ? "active" : "multipleLinesAllowed")}
      />
      <span>
        <span className="block text-sm font-medium text-ink">{labelText}</span>
        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-soft">
          {description}
        </span>
      </span>
    </label>
  );
}

function ExpenseItemForm({
  item: expenseItem,
  defaultProRata: defaultProRata,
  defaultOrder,
  onClose: onClose,
}: {
  item: ExpenseItemDto | null;
  defaultProRata: string;
  defaultOrder: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [errorText, setErrorText] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseItemFormValues>({
    resolver: zodResolver(expenseItemSchema),
    mode: "onChange",
    defaultValues: {
      code: expenseItem?.code ?? "",
      label: expenseItem?.label ?? "",
      supplier: expenseItem?.supplier ?? "",
      proRataPct: decimalFormatter(expenseItem?.proRataPct ?? defaultProRata),
      periodicity:
        (expenseItem?.periodicity as Periodicity | undefined) ?? "MONTHLY",
      sortOrder: expenseItem?.sortOrder ?? defaultOrder,
      active: expenseItem?.active ?? true,
      multipleLinesAllowed: expenseItem?.multipleLinesAllowed ?? false,
    },
  });

  const save = useMutation({
    mutationFn: (values: ExpenseItemFormValues) => {
      const requestBody: ExpenseItemRequest = {
        label: values.label.trim(),
        supplier: values.supplier.trim() || undefined,
        proRataPct: parsePercentage(values.proRataPct) ?? "0",
        periodicity: values.periodicity,
        sortOrder: values.sortOrder,
        active: values.active,
        multipleLinesAllowed: values.multipleLinesAllowed,
      };
      if (!expenseItem && values.code.trim()) {
        requestBody.code = values.code.trim();
      }
      return expenseItem?.id
        ? api.expenseItems.update(expenseItem.id, requestBody)
        : api.expenseItems.create(requestBody);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expenseItemsAll,
      });
      toast.success(
        expenseItem
          ? `Poste « ${result.label} » mis à jour.`
          : `Poste « ${result.label} » ajouté à la liste des frais.`,
      );
      onClose();
    },
    onError: (error) => setErrorText(errorMessage(error)),
  });

  return (
    <form
      className="rounded-xl border border-accent/20 bg-accent-soft/25 p-4"
      onSubmit={handleSubmit((values) => {
        setErrorText(null);
        save.mutate(values);
      })}
      data-cy="formulaire-poste"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-ink">
          {expenseItem
            ? `Modifier le poste « ${expenseItem.label} »`
            : "Ajouter un type de frais"}
        </h3>
        {expenseItem ? (
          <span className="badge badge-neutral">
            <PencilLine size={11} aria-hidden="true" />
            {expenseItem.code}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FieldGroup
          id="poste-code"
          label="Code"
          error={errors.code?.message}
          help={
            expenseItem
              ? "Le code est immuable après création."
              : "Facultatif : généré depuis le libellé si vide."
          }
        >
          <input
            id="poste-code"
            className={cn(
              "field font-mono text-[13px]",
              errors.code && "field-error",
            )}
            placeholder="gaz"
            readOnly={Boolean(expenseItem)}
            disabled={Boolean(expenseItem)}
            {...register("code")}
          />
        </FieldGroup>
        <FieldGroup
          id="poste-libelle"
          label="Libellé affiché"
          error={errors.label?.message}
        >
          <input
            id="poste-libelle"
            className={cn("field", errors.label && "field-error")}
            placeholder="Gaz"
            {...register("label")}
            data-cy="input-poste-libelle"
          />
        </FieldGroup>
        <FieldGroup
          id="poste-fournisseur"
          label="Fournisseur"
          error={errors.supplier?.message}
        >
          <input
            id="poste-fournisseur"
            className="field"
            placeholder="EDF"
            {...register("supplier")}
            data-cy="input-poste-fournisseur"
          />
        </FieldGroup>
        <FieldGroup
          id="poste-prorata"
          label="Prorata par défaut (%)"
          error={errors.proRataPct?.message}
          help="Pré-remplit le champ lors de l’ajout d’un frais ; modifiable au cas par cas."
        >
          <input
            id="poste-prorata"
            className={cn("field", errors.proRataPct && "field-error")}
            inputMode="decimal"
            placeholder="35,71"
            {...register("proRataPct")}
            data-cy="input-poste-prorata"
          />
        </FieldGroup>
        <FieldGroup
          id="poste-periodicite"
          label="Périodicité"
          error={errors.periodicity?.message}
        >
          <select
            id="poste-periodicite"
            className="field"
            {...register("periodicity")}
          >
            {PERIODICITIES.map((periodicity) => (
              <option key={periodicity.value} value={periodicity.value}>
                {periodicity.label}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup
          id="poste-ordre"
          label="Ordre d’affichage"
          error={errors.sortOrder?.message}
        >
          <input
            id="poste-ordre"
            type="number"
            min={0}
            step={1}
            className={cn("field", errors.sortOrder && "field-error")}
            {...register("sortOrder", { valueAsNumber: true })}
          />
        </FieldGroup>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <SwitchField
          id="poste-actif"
          label="Poste actif"
          description="Apparaît dans la liste déroulante de la note de frais."
          register={register}
        />
        <SwitchField
          id="poste-plusieurs-lignes"
          label="Plusieurs lignes autorisées"
          description="Autorise plusieurs frais de ce type pour un même mois (ex. téléphone)."
          register={register}
        />
      </div>

      {errorText ? (
        <p
          className="mt-3 rounded-lg border border-danger/20 bg-danger-soft/60 p-2.5 text-xs text-danger"
          role="alert"
        >
          {errorText}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          variant="ghost"
          small
          onClick={onClose}
          disabled={save.isPending}
        >
          Annuler
        </Button>
        <Button
          variant="primary"
          small
          type="submit"
          loading={save.isPending}
          icon={<Check size={14} />}
          data-cy="btn-enregistrer-poste"
        >
          {expenseItem ? "Enregistrer le poste" : "Ajouter le poste"}
        </Button>
      </div>
    </form>
  );
}

function ExpenseItemsManager({
  defaultProRata: defaultProRata,
}: {
  defaultProRata: string;
}) {
  const queryClient = useQueryClient();
  const expenseItems = useExpenseItems(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editedItem, setEditedItem] = useState<ExpenseItemDto | null>(null);
  const [toDelete, setToDelete] = useState<ExpenseItemDto | null>(null);

  const remove = useMutation({
    mutationFn: (expenseItem: ExpenseItemDto) =>
      api.expenseItems.delete(expenseItem.id as number),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expenseItemsAll,
      });
      setToDelete(null);
      toast.success("Poste désactivé et retiré de la liste des frais.");
    },
    onError: (error) => {
      setToDelete(null);
      toast.error(errorMessage(error));
    },
  });

  const list = expenseItems.data ?? [];
  const defaultOrder =
    list.reduce(
      (maximum, expenseItem) => Math.max(maximum, expenseItem.sortOrder ?? 0),
      -1,
    ) + 1;

  function openCreate() {
    setEditedItem(null);
    setFormOpen(true);
  }

  function openEdit(expenseItem: ExpenseItemDto) {
    setEditedItem(expenseItem);
    setFormOpen(true);
  }

  return (
    <section className="card mt-6 overflow-hidden">
      <div className="card-header">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
            <ReceiptText size={17} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl text-ink">Types de frais</h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              Libellés, fournisseurs, prorata par défaut et périodicité
              alimentent la note de frais. Suppression logique uniquement.
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          small
          icon={<Plus size={14} />}
          onClick={openCreate}
          disabled={formOpen && editedItem === null}
          data-cy="btn-ajouter-poste"
        >
          Ajouter un type
        </Button>
      </div>

      <div className="card-body space-y-4">
        {formOpen ? (
          <ExpenseItemForm
            item={editedItem}
            defaultProRata={defaultProRata}
            defaultOrder={defaultOrder}
            onClose={() => {
              setFormOpen(false);
              setEditedItem(null);
            }}
          />
        ) : null}

        {expenseItems.isError ? (
          <ErrorState
            message={errorMessage(expenseItems.error)}
            onRetry={() => void expenseItems.refetch()}
          />
        ) : expenseItems.isPending ? (
          <LoadingState message="Chargement des postes…" />
        ) : list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-soft">
            Aucun poste configuré. Ajoutez au moins « Loyer » et vos frais
            courants.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Libellé</th>
                  <th>Fournisseur</th>
                  <th className="text-right">Prorata</th>
                  <th>Périodicité</th>
                  <th className="text-center">Ordre</th>
                  <th>Options</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((expenseItem) => (
                  <tr
                    key={expenseItem.id}
                    className={cn(!expenseItem.active && "opacity-60")}
                  >
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-ink">
                          {expenseItem.label}
                        </span>
                        <code className="rounded bg-paper-deep/60 px-1 py-0.5 font-mono text-[10.5px] text-ink-soft">
                          {expenseItem.code}
                        </code>
                        {!expenseItem.active ? (
                          <span className="badge badge-neutral">inactif</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="text-ink-soft">
                      {expenseItem.supplier || "—"}
                    </td>
                    <td className="number text-right text-ink-soft">
                      {formatPercentage(expenseItem.proRataPct)}
                    </td>
                    <td className="text-xs capitalize text-ink-soft">
                      {PERIODICITIES.find(
                        (periodicity) =>
                          periodicity.value === expenseItem.periodicity,
                      )?.label ?? expenseItem.periodicity}
                    </td>
                    <td className="number text-center text-ink-soft">
                      {expenseItem.sortOrder}
                    </td>
                    <td>
                      {expenseItem.multipleLinesAllowed ? (
                        <span className="badge badge-accent">multi-lignes</span>
                      ) : (
                        <span className="text-xs text-ink-soft">une ligne</span>
                      )}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          small
                          icon={<PencilLine size={13} />}
                          onClick={() => openEdit(expenseItem)}
                          data-cy={`btn-modifier-poste-${expenseItem.code}`}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          small
                          icon={<Trash2 size={13} />}
                          className="text-danger hover:bg-danger-soft"
                          onClick={() => setToDelete(expenseItem)}
                          data-cy={`btn-supprimer-poste-${expenseItem.code}`}
                        >
                          Retirer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Retirer ce type de frais ?"
        message={
          toDelete
            ? `« ${toDelete.label} » ne sera plus proposé dans la note de frais. Les documents existants conservent leurs lignes et leurs montants.`
            : ""
        }
        confirmLabel="Retirer le poste"
        variant="danger"
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete);
          }
        }}
        onCancel={() => setToDelete(null)}
        dataCy="dialogue-supprimer-poste"
      />
    </section>
  );
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const settings = useSettings();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    mode: "onChange",
    defaultValues: valuesFromSettings(undefined),
  });

  useEffect(() => {
    if (settings.data) {
      reset(valuesFromSettings(settings.data));
    }
  }, [settings.data, reset]);

  const values = watch();
  const rentReceiptTotal =
    cents(values.rentExclCharges) + cents(values.chargesAdvance);
  const displayedProRata = useMemo(() => {
    const proArea = parseAmount(values.businessArea);
    const totalArea = parseAmount(values.totalArea);
    if (proArea === null || totalArea === null || Number(totalArea) <= 0) {
      return null;
    }
    return (Number(proArea) / Number(totalArea)) * 100;
  }, [values.businessArea, values.totalArea]);

  const save = useMutation({
    mutationFn: (submittedValues: SettingsFormValues) => {
      const requestBody: SettingsRequest = {
        companyName: submittedValues.companyName.trim(),
        legalForm: submittedValues.legalForm.trim(),
        siren: submittedValues.siren.trim(),
        companyAddress: submittedValues.companyAddress.trim(),
        managerName: submittedValues.managerName.trim(),
        homeAddress: submittedValues.homeAddress.trim(),
        totalArea: parseAmount(submittedValues.totalArea) ?? undefined,
        businessArea: parseAmount(submittedValues.businessArea) ?? undefined,
        landlordName: submittedValues.landlordName.trim(),
        landlordAddress: submittedValues.landlordAddress.trim(),
        tenantName: submittedValues.tenantName.trim(),
        tenantAddress: submittedValues.tenantAddress.trim(),
        rentExclCharges:
          parseAmount(submittedValues.rentExclCharges) ?? undefined,
        chargesAdvance:
          parseAmount(submittedValues.chargesAdvance) ?? undefined,
        issuePlace: submittedValues.issuePlace.trim(),
      };
      return api.settings.update(requestBody);
    },
    onSuccess: (payload) => {
      queryClient.setQueryData(queryKeys.settings, payload);
      toast.success(
        "Configuration enregistrée. Les prochains documents utiliseront ces valeurs.",
      );
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Réglages"
        title="Configuration"
        description="Ces informations alimentent les quittances, les notes de frais et les valeurs par défaut. Les calculs restent effectués par le backend."
        actions={
          <Button
            variant="primary"
            type="submit"
            form="form-parametres"
            formNoValidate
            icon={<Save size={15} />}
            loading={save.isPending}
            data-cy="btn-enregistrer-configuration"
          >
            Enregistrer
          </Button>
        }
      />

      {settings.isError ? (
        <ErrorState
          message={errorMessage(settings.error)}
          onRetry={() => void settings.refetch()}
        />
      ) : settings.isPending ? (
        <LoadingState message="Chargement de la configuration…" />
      ) : (
        <form
          id="form-parametres"
          className="space-y-6"
          onSubmit={handleSubmit((submittedValues) =>
            save.mutate(submittedValues),
          )}
          noValidate
        >
          <section className="card overflow-hidden">
            <SectionHeader
              icon={Building2}
              title="Société"
              description="Identité de l’EURL utilisée en en-tête de la note de frais."
            />
            <div className="card-body grid gap-4 sm:grid-cols-2">
              <FieldGroup
                id="param-raison-sociale"
                label="Raison sociale"
                error={errors.companyName?.message}
                className="sm:col-span-1"
              >
                <input
                  id="param-raison-sociale"
                  className={cn("field", errors.companyName && "field-error")}
                  {...register("companyName")}
                  data-cy="input-raison-sociale"
                />
              </FieldGroup>
              <FieldGroup
                id="param-forme-juridique"
                label="Forme juridique"
                error={errors.legalForm?.message}
              >
                <input
                  id="param-forme-juridique"
                  className={cn("field", errors.legalForm && "field-error")}
                  {...register("legalForm")}
                />
              </FieldGroup>
              <FieldGroup
                id="param-siren"
                label="SIREN"
                error={errors.siren?.message}
                help="9 chiffres, espaces autorisés."
              >
                <input
                  id="param-siren"
                  className={cn(
                    "field font-mono",
                    errors.siren && "field-error",
                  )}
                  inputMode="numeric"
                  placeholder="000 000 000"
                  {...register("siren")}
                  data-cy="input-siren"
                />
              </FieldGroup>
              <FieldGroup
                id="param-managerName"
                label="Gérant"
                error={errors.managerName?.message}
              >
                <input
                  id="param-managerName"
                  className={cn("field", errors.managerName && "field-error")}
                  {...register("managerName")}
                  data-cy="input-managerName"
                />
              </FieldGroup>
              <FieldGroup
                id="param-societe-adresse"
                label="Adresse de la société"
                error={errors.companyAddress?.message}
                className="sm:col-span-2"
              >
                <textarea
                  id="param-societe-adresse"
                  rows={2}
                  className={cn(
                    "field resize-y",
                    errors.companyAddress && "field-error",
                  )}
                  {...register("companyAddress")}
                  data-cy="input-societe-adresse"
                />
              </FieldGroup>
            </div>
          </section>

          <section className="card overflow-hidden">
            <SectionHeader
              icon={Home}
              title="Logement et quote-part professionnelle"
              description="La surface professionnelle divisée par la surface totale fixe le prorata de référence."
            />
            <div className="card-body grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FieldGroup
                id="param-logement-adresse"
                label="Adresse du logement"
                error={errors.homeAddress?.message}
                className="sm:col-span-2 lg:col-span-4"
              >
                <textarea
                  id="param-logement-adresse"
                  rows={2}
                  className={cn(
                    "field resize-y",
                    errors.homeAddress && "field-error",
                  )}
                  {...register("homeAddress")}
                  data-cy="input-logement-adresse"
                />
              </FieldGroup>
              <FieldGroup
                id="param-surface-totale"
                label="Surface totale (m²)"
                error={errors.totalArea?.message}
              >
                <input
                  id="param-surface-totale"
                  className={cn("field", errors.totalArea && "field-error")}
                  inputMode="decimal"
                  placeholder="70,00"
                  {...register("totalArea")}
                  data-cy="input-surface-totale"
                />
              </FieldGroup>
              <FieldGroup
                id="param-surface-pro"
                label="Surface professionnelle (m²)"
                error={errors.businessArea?.message}
              >
                <input
                  id="param-surface-pro"
                  className={cn("field", errors.businessArea && "field-error")}
                  inputMode="decimal"
                  placeholder="25,00"
                  {...register("businessArea")}
                  data-cy="input-surface-pro"
                />
              </FieldGroup>
              <FieldGroup
                id="param-lieu"
                label="Lieu d’émission"
                error={errors.issuePlace?.message}
              >
                <input
                  id="param-lieu"
                  className={cn("field", errors.issuePlace && "field-error")}
                  placeholder="Paris"
                  {...register("issuePlace")}
                  data-cy="input-lieu-emission"
                />
              </FieldGroup>
              <div className="flex flex-col justify-center rounded-xl border border-accent/15 bg-accent-soft/45 px-4 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-accent">
                  Prorata indicatif
                </p>
                <p
                  className="mt-1 font-display text-2xl text-accent-strong"
                  data-cy="prorata-indicatif"
                >
                  {displayedProRata === null
                    ? "—"
                    : formatPercentage(displayedProRata)}
                </p>
                <p className="text-[10.5px] text-ink-soft">
                  Calculé et arrondi côté backend à l’enregistrement.
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card overflow-hidden">
              <SectionHeader
                icon={Landmark}
                title="Bailleur"
                description="Propriétaire du logement, crédité dans la quittance."
              />
              <div className="card-body grid gap-4">
                <FieldGroup
                  id="param-bailleur-nom"
                  label="Nom du bailleur"
                  error={errors.landlordName?.message}
                >
                  <input
                    id="param-bailleur-nom"
                    className={cn(
                      "field",
                      errors.landlordName && "field-error",
                    )}
                    {...register("landlordName")}
                  />
                </FieldGroup>
                <FieldGroup
                  id="param-bailleur-adresse"
                  label="Adresse du bailleur"
                  error={errors.landlordAddress?.message}
                >
                  <textarea
                    id="param-bailleur-adresse"
                    rows={2}
                    className={cn(
                      "field resize-y",
                      errors.landlordAddress && "field-error",
                    )}
                    {...register("landlordAddress")}
                  />
                </FieldGroup>
              </div>
            </section>

            <section className="card overflow-hidden">
              <SectionHeader
                icon={UsersRound}
                title="Locataire"
                description="Occupant du logement, débiteur de la quittance."
              />
              <div className="card-body grid gap-4">
                <FieldGroup
                  id="param-locataire-nom"
                  label="Nom du locataire"
                  error={errors.tenantName?.message}
                >
                  <input
                    id="param-locataire-nom"
                    className={cn("field", errors.tenantName && "field-error")}
                    {...register("tenantName")}
                  />
                </FieldGroup>
                <FieldGroup
                  id="param-locataire-adresse"
                  label="Adresse du locataire"
                  error={errors.tenantAddress?.message}
                >
                  <textarea
                    id="param-locataire-adresse"
                    rows={2}
                    className={cn(
                      "field resize-y",
                      errors.tenantAddress && "field-error",
                    )}
                    {...register("tenantAddress")}
                  />
                </FieldGroup>
              </div>
            </section>
          </div>

          <section className="card overflow-hidden">
            <SectionHeader
              icon={UserRound}
              title="Loyer et charges"
              description="Valeurs pré-remplies dans l’onglet Quittance ; elles restent modifiables ponctuellement."
            />
            <div className="card-body grid gap-4 sm:grid-cols-3">
              <FieldGroup
                id="param-loyer-hc"
                label="Loyer hors charges (€)"
                error={errors.rentExclCharges?.message}
              >
                <input
                  id="param-loyer-hc"
                  className={cn(
                    "field",
                    errors.rentExclCharges && "field-error",
                  )}
                  inputMode="decimal"
                  placeholder="900,00"
                  {...register("rentExclCharges")}
                  data-cy="input-loyer-hc"
                />
              </FieldGroup>
              <FieldGroup
                id="param-provision"
                label="Provision pour charges (€)"
                error={errors.chargesAdvance?.message}
              >
                <input
                  id="param-provision"
                  className={cn(
                    "field",
                    errors.chargesAdvance && "field-error",
                  )}
                  inputMode="decimal"
                  placeholder="50,00"
                  {...register("chargesAdvance")}
                  data-cy="input-provision-charges"
                />
              </FieldGroup>
              <div className="flex flex-col justify-center rounded-xl border border-line bg-paper/45 px-4 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                  Total quittance
                </p>
                <p
                  className="mt-1 font-display text-2xl text-ink"
                  data-cy="total-quittance-config"
                >
                  {formatEUR(rentReceiptTotal / 100)}
                </p>
                <p className="text-[10.5px] text-ink-soft">
                  Loyer + provision, recalculé par le backend.
                </p>
              </div>
            </div>
          </section>

          {save.isError ? (
            <p
              className="rounded-xl border border-danger/20 bg-danger-soft/60 p-3 text-sm text-danger"
              role="alert"
            >
              {errorMessage(save.error)}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3">
            <p className="text-xs text-ink-soft" aria-live="polite">
              {isDirty
                ? "Modifications non enregistrées."
                : "Toutes les valeurs sont à jour."}
            </p>
            <Button
              variant="primary"
              type="submit"
              icon={<Save size={15} />}
              loading={save.isPending}
              data-cy="btn-enregistrer-configuration-bas"
            >
              Enregistrer la configuration
            </Button>
          </div>
        </form>
      )}

      <ExpenseItemsManager
        defaultProRata={settings.data?.proRataBase ?? "100.00"}
      />
      <SignaturesManager />
    </>
  );
}
