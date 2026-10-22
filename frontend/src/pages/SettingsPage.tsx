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
  { valeur: "MONTHLY", libelle: "Mensuelle" },
  { valeur: "BIMONTHLY", libelle: "Bimestrielle" },
  { valeur: "ANNUAL", libelle: "Annuelle" },
] as const;

type Periodicity = (typeof PERIODICITIES)[number]["valeur"];

function decimalFormatter(value: string | undefined): string {
  return value ? value.replace(".", ",") : "";
}

function valuesFromSettings(
  settings: SettingsDto | undefined,
): SettingsFormValues {
  return {
    raisonSociale: settings?.companyName ?? "",
    formeJuridique: settings?.legalForm ?? "",
    siren: settings?.siren ?? "",
    societeAdresse: settings?.companyAddress ?? "",
    gerant: settings?.managerName ?? "",
    logementAdresse: settings?.homeAddress ?? "",
    surfaceTotale: decimalFormatter(settings?.totalArea),
    surfacePro: decimalFormatter(settings?.businessArea),
    bailleurNom: settings?.landlordName ?? "",
    bailleurAdresse: settings?.landlordAddress ?? "",
    locataireNom: settings?.tenantName ?? "",
    locataireAdresse: settings?.tenantAddress ?? "",
    loyerHc: decimalFormatter(settings?.rentExclCharges),
    provisionCharges: decimalFormatter(settings?.chargesAdvance),
    lieuEmission: settings?.issuePlace ?? "",
  };
}

function cents(value: string): number {
  const normalized = parseAmount(value);
  return normalized === null ? 0 : Math.round(Number(normalized) * 100);
}

function SectionHeader({
  icone: IconComponent,
  titre: title,
  description,
}: {
  icone: typeof Building2;
  titre: string;
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
  libelle: labelText,
  description,
  register,
}: {
  id: string;
  libelle: string;
  description: string;
  register: ReturnType<typeof useForm<ExpenseItemFormValues>>["register"];
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper/35 p-3 transition hover:border-line-forte"
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-accent accent-[#1b5b49]"
        {...register(
          id === "poste-actif" ? "actif" : "plusieursLignesAutorisees",
        )}
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
  poste: expenseItem,
  prorataDefaut: defaultProRata,
  ordreDefaut: defaultOrder,
  onFermer: onClose,
}: {
  poste: ExpenseItemDto | null;
  prorataDefaut: string;
  ordreDefaut: number;
  onFermer: () => void;
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
      libelle: expenseItem?.label ?? "",
      fournisseur: expenseItem?.supplier ?? "",
      prorataPct: decimalFormatter(expenseItem?.proRataPct ?? defaultProRata),
      periodicite:
        (expenseItem?.periodicity as Periodicity | undefined) ?? "MONTHLY",
      ordre: expenseItem?.sortOrder ?? defaultOrder,
      actif: expenseItem?.active ?? true,
      plusieursLignesAutorisees: expenseItem?.multipleLinesAllowed ?? false,
    },
  });

  const save = useMutation({
    mutationFn: (values: ExpenseItemFormValues) => {
      const requestBody: ExpenseItemRequest = {
        label: values.libelle.trim(),
        supplier: values.fournisseur.trim() || undefined,
        proRataPct: parsePercentage(values.prorataPct) ?? "0",
        periodicity: values.periodicite,
        sortOrder: values.ordre,
        active: values.actif,
        multipleLinesAllowed: values.plusieursLignesAutorisees,
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
      toast.succes(
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
          <span className="badge badge-neutre">
            <PencilLine size={11} aria-hidden="true" />
            {expenseItem.code}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FieldGroup
          id="poste-code"
          label="Code"
          erreur={errors.code?.message}
          aide={
            expenseItem
              ? "Le code est immuable après création."
              : "Facultatif : généré depuis le libellé si vide."
          }
        >
          <input
            id="poste-code"
            className={cn(
              "champ font-mono text-[13px]",
              errors.code && "champ-erreur",
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
          erreur={errors.libelle?.message}
        >
          <input
            id="poste-libelle"
            className={cn("champ", errors.libelle && "champ-erreur")}
            placeholder="Gaz"
            {...register("libelle")}
            data-cy="input-poste-libelle"
          />
        </FieldGroup>
        <FieldGroup
          id="poste-fournisseur"
          label="Fournisseur"
          erreur={errors.fournisseur?.message}
        >
          <input
            id="poste-fournisseur"
            className="champ"
            placeholder="EDF"
            {...register("fournisseur")}
            data-cy="input-poste-fournisseur"
          />
        </FieldGroup>
        <FieldGroup
          id="poste-prorata"
          label="Prorata par défaut (%)"
          erreur={errors.prorataPct?.message}
          aide="Pré-remplit le champ lors de l’ajout d’un frais ; modifiable au cas par cas."
        >
          <input
            id="poste-prorata"
            className={cn("champ", errors.prorataPct && "champ-erreur")}
            inputMode="decimal"
            placeholder="35,71"
            {...register("prorataPct")}
            data-cy="input-poste-prorata"
          />
        </FieldGroup>
        <FieldGroup
          id="poste-periodicite"
          label="Périodicité"
          erreur={errors.periodicite?.message}
        >
          <select
            id="poste-periodicite"
            className="champ"
            {...register("periodicite")}
          >
            {PERIODICITIES.map((periodicity) => (
              <option key={periodicity.valeur} value={periodicity.valeur}>
                {periodicity.libelle}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup
          id="poste-ordre"
          label="Ordre d’affichage"
          erreur={errors.ordre?.message}
        >
          <input
            id="poste-ordre"
            type="number"
            min={0}
            step={1}
            className={cn("champ", errors.ordre && "champ-erreur")}
            {...register("ordre", { valueAsNumber: true })}
          />
        </FieldGroup>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <SwitchField
          id="poste-actif"
          libelle="Poste actif"
          description="Apparaît dans la liste déroulante de la note de frais."
          register={register}
        />
        <SwitchField
          id="poste-plusieurs-lignes"
          libelle="Plusieurs lignes autorisées"
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
          variante="fantome"
          petit
          onClick={onClose}
          disabled={save.isPending}
        >
          Annuler
        </Button>
        <Button
          variante="primaire"
          petit
          type="submit"
          chargement={save.isPending}
          icone={<Check size={14} />}
          data-cy="btn-enregistrer-poste"
        >
          {expenseItem ? "Enregistrer le poste" : "Ajouter le poste"}
        </Button>
      </div>
    </form>
  );
}

function ExpenseItemsManager({
  prorataDefaut: defaultProRata,
}: {
  prorataDefaut: string;
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
      toast.succes("Poste désactivé et retiré de la liste des frais.");
    },
    onError: (error) => {
      setToDelete(null);
      toast.erreur(errorMessage(error));
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
    <section className="carte mt-6 overflow-hidden">
      <div className="carte-entete">
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
          variante="primaire"
          petit
          icone={<Plus size={14} />}
          onClick={openCreate}
          disabled={formOpen && editedItem === null}
          data-cy="btn-ajouter-poste"
        >
          Ajouter un type
        </Button>
      </div>

      <div className="carte-corps space-y-4">
        {formOpen ? (
          <ExpenseItemForm
            poste={editedItem}
            prorataDefaut={defaultProRata}
            ordreDefaut={defaultOrder}
            onFermer={() => {
              setFormOpen(false);
              setEditedItem(null);
            }}
          />
        ) : null}

        {expenseItems.isError ? (
          <ErrorState
            message={errorMessage(expenseItems.error)}
            onReessayer={() => void expenseItems.refetch()}
          />
        ) : expenseItems.isPending ? (
          <LoadingState message="Chargement des postes…" />
        ) : list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-forte p-6 text-center text-sm text-ink-soft">
            Aucun poste configuré. Ajoutez au moins « Loyer » et vos frais
            courants.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="tableau-frais">
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
                          <span className="badge badge-neutre">inactif</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="text-ink-soft">
                      {expenseItem.supplier || "—"}
                    </td>
                    <td className="nombre text-right text-ink-soft">
                      {formatPercentage(expenseItem.proRataPct)}
                    </td>
                    <td className="text-xs capitalize text-ink-soft">
                      {PERIODICITIES.find(
                        (periodicity) =>
                          periodicity.valeur === expenseItem.periodicity,
                      )?.libelle ?? expenseItem.periodicity}
                    </td>
                    <td className="nombre text-center text-ink-soft">
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
                          variante="fantome"
                          petit
                          icone={<PencilLine size={13} />}
                          onClick={() => openEdit(expenseItem)}
                          data-cy={`btn-modifier-poste-${expenseItem.code}`}
                        >
                          Modifier
                        </Button>
                        <Button
                          variante="fantome"
                          petit
                          icone={<Trash2 size={13} />}
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
        ouvert={toDelete !== null}
        titre="Retirer ce type de frais ?"
        message={
          toDelete
            ? `« ${toDelete.label} » ne sera plus proposé dans la note de frais. Les documents existants conservent leurs lignes et leurs montants.`
            : ""
        }
        libelleConfirmer="Retirer le poste"
        variante="danger"
        onConfirmer={() => {
          if (toDelete) {
            remove.mutate(toDelete);
          }
        }}
        onAnnuler={() => setToDelete(null)}
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
    cents(values.loyerHc) + cents(values.provisionCharges);
  const displayedProRata = useMemo(() => {
    const proArea = parseAmount(values.surfacePro);
    const totalArea = parseAmount(values.surfaceTotale);
    if (proArea === null || totalArea === null || Number(totalArea) <= 0) {
      return null;
    }
    return (Number(proArea) / Number(totalArea)) * 100;
  }, [values.surfacePro, values.surfaceTotale]);

  const save = useMutation({
    mutationFn: (submittedValues: SettingsFormValues) => {
      const requestBody: SettingsRequest = {
        companyName: submittedValues.raisonSociale.trim(),
        legalForm: submittedValues.formeJuridique.trim(),
        siren: submittedValues.siren.trim(),
        companyAddress: submittedValues.societeAdresse.trim(),
        managerName: submittedValues.gerant.trim(),
        homeAddress: submittedValues.logementAdresse.trim(),
        totalArea: parseAmount(submittedValues.surfaceTotale) ?? undefined,
        businessArea: parseAmount(submittedValues.surfacePro) ?? undefined,
        landlordName: submittedValues.bailleurNom.trim(),
        landlordAddress: submittedValues.bailleurAdresse.trim(),
        tenantName: submittedValues.locataireNom.trim(),
        tenantAddress: submittedValues.locataireAdresse.trim(),
        rentExclCharges: parseAmount(submittedValues.loyerHc) ?? undefined,
        chargesAdvance:
          parseAmount(submittedValues.provisionCharges) ?? undefined,
        issuePlace: submittedValues.lieuEmission.trim(),
      };
      return api.settings.update(requestBody);
    },
    onSuccess: (payload) => {
      queryClient.setQueryData(queryKeys.settings, payload);
      toast.succes(
        "Configuration enregistrée. Les prochains documents utiliseront ces valeurs.",
      );
    },
  });

  return (
    <>
      <PageHeader
        surTitre="Réglages"
        titre="Configuration"
        description="Ces informations alimentent les quittances, les notes de frais et les valeurs par défaut. Les calculs restent effectués par le backend."
        actions={
          <Button
            variante="primaire"
            type="submit"
            form="form-parametres"
            formNoValidate
            icone={<Save size={15} />}
            chargement={save.isPending}
            data-cy="btn-enregistrer-configuration"
          >
            Enregistrer
          </Button>
        }
      />

      {settings.isError ? (
        <ErrorState
          message={errorMessage(settings.error)}
          onReessayer={() => void settings.refetch()}
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
          <section className="carte overflow-hidden">
            <SectionHeader
              icone={Building2}
              titre="Société"
              description="Identité de l’EURL utilisée en en-tête de la note de frais."
            />
            <div className="carte-corps grid gap-4 sm:grid-cols-2">
              <FieldGroup
                id="param-raison-sociale"
                label="Raison sociale"
                erreur={errors.raisonSociale?.message}
                className="sm:col-span-1"
              >
                <input
                  id="param-raison-sociale"
                  className={cn(
                    "champ",
                    errors.raisonSociale && "champ-erreur",
                  )}
                  {...register("raisonSociale")}
                  data-cy="input-raison-sociale"
                />
              </FieldGroup>
              <FieldGroup
                id="param-forme-juridique"
                label="Forme juridique"
                erreur={errors.formeJuridique?.message}
              >
                <input
                  id="param-forme-juridique"
                  className={cn(
                    "champ",
                    errors.formeJuridique && "champ-erreur",
                  )}
                  {...register("formeJuridique")}
                />
              </FieldGroup>
              <FieldGroup
                id="param-siren"
                label="SIREN"
                erreur={errors.siren?.message}
                aide="9 chiffres, espaces autorisés."
              >
                <input
                  id="param-siren"
                  className={cn(
                    "champ font-mono",
                    errors.siren && "champ-erreur",
                  )}
                  inputMode="numeric"
                  placeholder="000 000 000"
                  {...register("siren")}
                  data-cy="input-siren"
                />
              </FieldGroup>
              <FieldGroup
                id="param-gerant"
                label="Gérant"
                erreur={errors.gerant?.message}
              >
                <input
                  id="param-gerant"
                  className={cn("champ", errors.gerant && "champ-erreur")}
                  {...register("gerant")}
                  data-cy="input-gerant"
                />
              </FieldGroup>
              <FieldGroup
                id="param-societe-adresse"
                label="Adresse de la société"
                erreur={errors.societeAdresse?.message}
                className="sm:col-span-2"
              >
                <textarea
                  id="param-societe-adresse"
                  rows={2}
                  className={cn(
                    "champ resize-y",
                    errors.societeAdresse && "champ-erreur",
                  )}
                  {...register("societeAdresse")}
                  data-cy="input-societe-adresse"
                />
              </FieldGroup>
            </div>
          </section>

          <section className="carte overflow-hidden">
            <SectionHeader
              icone={Home}
              titre="Logement et quote-part professionnelle"
              description="La surface professionnelle divisée par la surface totale fixe le prorata de référence."
            />
            <div className="carte-corps grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FieldGroup
                id="param-logement-adresse"
                label="Adresse du logement"
                erreur={errors.logementAdresse?.message}
                className="sm:col-span-2 lg:col-span-4"
              >
                <textarea
                  id="param-logement-adresse"
                  rows={2}
                  className={cn(
                    "champ resize-y",
                    errors.logementAdresse && "champ-erreur",
                  )}
                  {...register("logementAdresse")}
                  data-cy="input-logement-adresse"
                />
              </FieldGroup>
              <FieldGroup
                id="param-surface-totale"
                label="Surface totale (m²)"
                erreur={errors.surfaceTotale?.message}
              >
                <input
                  id="param-surface-totale"
                  className={cn(
                    "champ",
                    errors.surfaceTotale && "champ-erreur",
                  )}
                  inputMode="decimal"
                  placeholder="70,00"
                  {...register("surfaceTotale")}
                  data-cy="input-surface-totale"
                />
              </FieldGroup>
              <FieldGroup
                id="param-surface-pro"
                label="Surface professionnelle (m²)"
                erreur={errors.surfacePro?.message}
              >
                <input
                  id="param-surface-pro"
                  className={cn("champ", errors.surfacePro && "champ-erreur")}
                  inputMode="decimal"
                  placeholder="25,00"
                  {...register("surfacePro")}
                  data-cy="input-surface-pro"
                />
              </FieldGroup>
              <FieldGroup
                id="param-lieu"
                label="Lieu d’émission"
                erreur={errors.lieuEmission?.message}
              >
                <input
                  id="param-lieu"
                  className={cn("champ", errors.lieuEmission && "champ-erreur")}
                  placeholder="Paris"
                  {...register("lieuEmission")}
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
            <section className="carte overflow-hidden">
              <SectionHeader
                icone={Landmark}
                titre="Bailleur"
                description="Propriétaire du logement, crédité dans la quittance."
              />
              <div className="carte-corps grid gap-4">
                <FieldGroup
                  id="param-bailleur-nom"
                  label="Nom du bailleur"
                  erreur={errors.bailleurNom?.message}
                >
                  <input
                    id="param-bailleur-nom"
                    className={cn(
                      "champ",
                      errors.bailleurNom && "champ-erreur",
                    )}
                    {...register("bailleurNom")}
                  />
                </FieldGroup>
                <FieldGroup
                  id="param-bailleur-adresse"
                  label="Adresse du bailleur"
                  erreur={errors.bailleurAdresse?.message}
                >
                  <textarea
                    id="param-bailleur-adresse"
                    rows={2}
                    className={cn(
                      "champ resize-y",
                      errors.bailleurAdresse && "champ-erreur",
                    )}
                    {...register("bailleurAdresse")}
                  />
                </FieldGroup>
              </div>
            </section>

            <section className="carte overflow-hidden">
              <SectionHeader
                icone={UsersRound}
                titre="Locataire"
                description="Occupant du logement, débiteur de la quittance."
              />
              <div className="carte-corps grid gap-4">
                <FieldGroup
                  id="param-locataire-nom"
                  label="Nom du locataire"
                  erreur={errors.locataireNom?.message}
                >
                  <input
                    id="param-locataire-nom"
                    className={cn(
                      "champ",
                      errors.locataireNom && "champ-erreur",
                    )}
                    {...register("locataireNom")}
                  />
                </FieldGroup>
                <FieldGroup
                  id="param-locataire-adresse"
                  label="Adresse du locataire"
                  erreur={errors.locataireAdresse?.message}
                >
                  <textarea
                    id="param-locataire-adresse"
                    rows={2}
                    className={cn(
                      "champ resize-y",
                      errors.locataireAdresse && "champ-erreur",
                    )}
                    {...register("locataireAdresse")}
                  />
                </FieldGroup>
              </div>
            </section>
          </div>

          <section className="carte overflow-hidden">
            <SectionHeader
              icone={UserRound}
              titre="Loyer et charges"
              description="Valeurs pré-remplies dans l’onglet Quittance ; elles restent modifiables ponctuellement."
            />
            <div className="carte-corps grid gap-4 sm:grid-cols-3">
              <FieldGroup
                id="param-loyer-hc"
                label="Loyer hors charges (€)"
                erreur={errors.loyerHc?.message}
              >
                <input
                  id="param-loyer-hc"
                  className={cn("champ", errors.loyerHc && "champ-erreur")}
                  inputMode="decimal"
                  placeholder="900,00"
                  {...register("loyerHc")}
                  data-cy="input-loyer-hc"
                />
              </FieldGroup>
              <FieldGroup
                id="param-provision"
                label="Provision pour charges (€)"
                erreur={errors.provisionCharges?.message}
              >
                <input
                  id="param-provision"
                  className={cn(
                    "champ",
                    errors.provisionCharges && "champ-erreur",
                  )}
                  inputMode="decimal"
                  placeholder="50,00"
                  {...register("provisionCharges")}
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
              variante="primaire"
              type="submit"
              icone={<Save size={15} />}
              chargement={save.isPending}
              data-cy="btn-enregistrer-configuration-bas"
            >
              Enregistrer la configuration
            </Button>
          </div>
        </form>
      )}

      <ExpenseItemsManager
        prorataDefaut={settings.data?.proRataBase ?? "100.00"}
      />
    </>
  );
}
