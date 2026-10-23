import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, PencilLine } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type { ExpenseItemDto, ExpenseItemRequest } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import { parsePercentage } from "@/lib/format";
import {
  expenseItemSchema,
  type ExpenseItemFormValues,
} from "@/lib/validation";
import { toast } from "@/state/toasts";
import {
  decimalFormatter,
  PERIODICITIES,
  type Periodicity,
} from "./settingsValues";

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

/** Create/update form of an expense item. */
export function ExpenseItemForm({
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
