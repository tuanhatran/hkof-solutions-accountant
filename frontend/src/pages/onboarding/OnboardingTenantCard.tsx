import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { LeaseFormValues } from "./OnboardingStepLease";
import type { LeaseType } from "./useOnboardingState";

interface TenantCardProps {
  index: number;
  total: number;
  leaseType: LeaseType;
  register: UseFormRegister<LeaseFormValues>;
  errors: FieldErrors<LeaseFormValues>;
  onRemove: (index: number) => void;
}

/** Card rendering the fields for a single tenant (or co-tenant). */
export function OnboardingTenantCard({
  index,
  total,
  leaseType,
  register,
  errors,
  onRemove,
}: TenantCardProps) {
  const { t } = useTranslation();
  const tenantErrors = errors.tenants?.[index];

  return (
    <fieldset
      className="rounded-xl border border-line p-4"
      aria-label={t("onboarding.lease.tenantTitle", { index: index + 1 })}
    >
      <div className="mb-3 flex items-center justify-between">
        <legend className="onboarding-subtitle">
          {t("onboarding.lease.tenantTitle", { index: index + 1 })}
        </legend>
        {total > 1 ? (
          <Button
            variant="ghost"
            small
            type="button"
            onClick={() => onRemove(index)}
            aria-label={t("onboarding.lease.removeTenant", {
              index: index + 1,
            })}
          >
            {t("onboarding.lease.remove")}
          </Button>
        ) : null}
      </div>

      <div className="onboarding-grid">
        <FieldGroup
          id={`onboarding-tenant-first-${index}`}
          label={t("onboarding.lease.firstName")}
          error={tenantErrors?.firstName?.message}
        >
          <input
            id={`onboarding-tenant-first-${index}`}
            className={cn("field", tenantErrors?.firstName && "field-error")}
            data-cy={`input-onboarding-tenant-first-${index}`}
            {...register(`tenants.${index}.firstName`)}
          />
        </FieldGroup>
        <FieldGroup
          id={`onboarding-tenant-last-${index}`}
          label={t("onboarding.lease.lastName")}
          error={tenantErrors?.lastName?.message}
        >
          <input
            id={`onboarding-tenant-last-${index}`}
            className={cn("field", tenantErrors?.lastName && "field-error")}
            data-cy={`input-onboarding-tenant-last-${index}`}
            {...register(`tenants.${index}.lastName`)}
          />
        </FieldGroup>
        {leaseType === "individual" ? (
          <>
            <FieldGroup
              id={`onboarding-tenant-rent-${index}`}
              label={t("onboarding.lease.rent")}
              error={tenantErrors?.rentExclCharges?.message}
              help={t("onboarding.lease.rentHelp")}
            >
              <input
                id={`onboarding-tenant-rent-${index}`}
                className={cn(
                  "field",
                  tenantErrors?.rentExclCharges && "field-error",
                )}
                inputMode="decimal"
                data-cy={`input-onboarding-tenant-rent-${index}`}
                {...register(`tenants.${index}.rentExclCharges`)}
              />
            </FieldGroup>
            <FieldGroup
              id={`onboarding-tenant-charges-${index}`}
              label={t("onboarding.lease.charges")}
              error={tenantErrors?.charges?.message}
              help={t("onboarding.lease.chargesHelp")}
            >
              <input
                id={`onboarding-tenant-charges-${index}`}
                className={cn("field", tenantErrors?.charges && "field-error")}
                inputMode="decimal"
                data-cy={`input-onboarding-tenant-charges-${index}`}
                {...register(`tenants.${index}.charges`)}
              />
            </FieldGroup>
          </>
        ) : null}
      </div>
    </fieldset>
  );
}
