import "./ExpenseItemForm.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilLine } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type { ExpenseItemDto, ExpenseItemRequest } from "@/api/types";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { FormModal } from "@/components/ui/FormModal";
import { cn } from "@/lib/cn";
import { parsePercentage } from "@/lib/format";
import {
  expenseItemSchema,
  type ExpenseItemFormValues,
} from "@/lib/validation";
import { toast } from "@/state/toasts";
import { ExpenseItemSwitchField } from "./ExpenseItemSwitchField";
import {
  decimalFormatter,
  PERIODICITIES,
  type Periodicity,
} from "./settingsValues";

/** Create/update modal of an expense item. */
export function ExpenseItemForm({
  item: expenseItem,
  companyId,
  defaultProRata,
  defaultOrder,
  onClose,
}: {
  item: ExpenseItemDto | null;
  companyId: number;
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
        companyId,
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
    <FormModal
      open
      wide
      title={
        expenseItem ? "Modifier le type de frais" : "Ajouter un type de frais"
      }
      onClose={onClose}
      onSubmit={handleSubmit((values) => {
        setErrorText(null);
        save.mutate(values);
      })}
      formDataCy="formulaire-poste"
      submitDataCy="btn-enregistrer-poste"
      pending={save.isPending}
      error={errorText}
      formClassName="expense-item-form"
    >
      {expenseItem ? (
        <span className="badge badge-neutral">
          <PencilLine size={11} aria-hidden="true" />
          {expenseItem.code}
        </span>
      ) : null}

      <div className="expense-item-form-grid">
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
              "field expense-item-form-code",
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

      <div className="expense-item-form-switches">
        <ExpenseItemSwitchField
          id="poste-actif"
          label="Poste actif"
          description="Apparaît dans la liste déroulante de la note de frais."
          register={register}
          field="active"
        />
        <ExpenseItemSwitchField
          id="poste-plusieurs-lignes"
          label="Plusieurs lignes autorisées"
          description="Autorise plusieurs frais de ce type pour un même mois (ex. téléphone)."
          register={register}
          field="multipleLinesAllowed"
        />
      </div>
    </FormModal>
  );
}
