import "./ExpenseItemForm.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilLine } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type { ExpenseItemDto, ExpenseItemRequest } from "@/api/types";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import { parsePercentage } from "@/lib/format";
import {
  expenseItemSchema,
  type ExpenseItemFormValues,
} from "@/lib/validation";
import { toast } from "@/state/toasts";
import { ExpenseItemSwitchField } from "./ExpenseItemSwitchField";
import { ExpenseItemFormFrame } from "./ExpenseItemFormFrame";
import {
  decimalFormatter,
  PERIODICITIES,
  type Periodicity,
} from "./settingsValues";

/** Create/update modal of an expense item, or its inline form inside a dialog. */
export function ExpenseItemForm({
  item: expenseItem,
  companyId,
  leaseId,
  defaultProRata,
  defaultOrder,
  embedded = false,
  onClose,
}: {
  item: ExpenseItemDto | null;
  companyId: number;
  leaseId: number | null;
  defaultProRata: string;
  defaultOrder: number;
  embedded?: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
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
        // A new poste is keyed to the selected lease; an edit keeps the item's own lease.
        leaseId: expenseItem ? (expenseItem.leaseId ?? null) : leaseId,
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
          ? t("settings.expenses.form.updated", { label: result.label })
          : t("settings.expenses.form.created", { label: result.label }),
      );
      onClose();
    },
    onError: (error) => setErrorText(errorMessage(error)),
  });

  return (
    <ExpenseItemFormFrame
      title={
        expenseItem
          ? t("settings.expenses.form.editTitle")
          : t("settings.expenses.form.createTitle")
      }
      embedded={embedded}
      error={errorText}
      pending={save.isPending}
      onSubmit={handleSubmit((values) => {
        setErrorText(null);
        save.mutate(values);
      })}
      onClose={onClose}
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
          label={t("settings.expenses.form.code")}
          error={errors.code?.message}
          help={
            expenseItem
              ? t("settings.expenses.form.codeHelpEdit")
              : t("settings.expenses.form.codeHelpCreate")
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
          label={t("settings.expenses.form.label")}
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
          label={t("settings.expenses.form.supplier")}
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
          label={t("settings.expenses.form.proRata")}
          error={errors.proRataPct?.message}
          help={t("settings.expenses.form.proRataHelp")}
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
          label={t("settings.expenses.form.periodicity")}
          error={errors.periodicity?.message}
        >
          <select
            id="poste-periodicite"
            className="field"
            {...register("periodicity")}
          >
            {PERIODICITIES.map((periodicity) => (
              <option key={periodicity.value} value={periodicity.value}>
                {t(periodicity.labelKey)}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup
          id="poste-ordre"
          label={t("settings.expenses.form.order")}
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
          label={t("settings.expenses.form.active")}
          description={t("settings.expenses.form.activeDescription")}
          register={register}
          field="active"
        />
        <ExpenseItemSwitchField
          id="poste-plusieurs-lignes"
          label={t("settings.expenses.form.multipleLines")}
          description={t("settings.expenses.form.multipleLinesDescription")}
          register={register}
          field="multipleLinesAllowed"
        />
      </div>
    </ExpenseItemFormFrame>
  );
}
