import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { LeaseFormValues } from "@/lib/validation";

/** Company-lease surface inputs: total area and business area. */
export function LeaseAreaFields({
  register,
  errors,
}: {
  register: UseFormRegister<LeaseFormValues>;
  errors: FieldErrors<LeaseFormValues>;
}) {
  const { t } = useTranslation();

  return (
    <>
      <FieldGroup
        id="bail-surface-totale"
        label={t("settings.lease.form.totalArea")}
        error={errors.totalArea?.message}
      >
        <input
          id="bail-surface-totale"
          inputMode="decimal"
          className={cn("field", errors.totalArea && "field-error")}
          placeholder={t("settings.lease.form.totalAreaPlaceholder")}
          {...register("totalArea")}
          data-cy="input-surface-totale"
        />
      </FieldGroup>
      <FieldGroup
        id="bail-surface-pro"
        label={t("settings.lease.form.businessArea")}
        error={errors.businessArea?.message}
      >
        <input
          id="bail-surface-pro"
          inputMode="decimal"
          className={cn("field", errors.businessArea && "field-error")}
          placeholder={t("settings.lease.form.businessAreaPlaceholder")}
          {...register("businessArea")}
          data-cy="input-surface-pro"
        />
      </FieldGroup>
    </>
  );
}
