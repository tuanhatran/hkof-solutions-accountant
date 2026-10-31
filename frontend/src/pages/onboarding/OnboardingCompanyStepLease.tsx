import { zodResolver } from "@hookform/resolvers/zod";
import { type ReactNode, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import { parseAmount } from "@/lib/format";
import {
  companyOnboardingMessage,
  proRataPreview,
  type CompanyLeaseValues,
} from "./useCompanyOnboardingState";

const leaseSchema = z
  .object({
    propertyAddress: z
      .string()
      .trim()
      .min(1, { error: () => companyOnboardingMessage("propertyAddress") }),
    totalArea: z
      .string()
      .refine((value) => Number(parseAmount(value) ?? -1) > 0, {
        error: () => companyOnboardingMessage("totalArea"),
      }),
    businessArea: z
      .string()
      .refine((value) => Number(parseAmount(value) ?? -1) >= 0, {
        error: () => companyOnboardingMessage("businessArea"),
      }),
    rentExclCharges: z
      .string()
      .refine((value) => Number(parseAmount(value) ?? 0) > 0, {
        error: () => companyOnboardingMessage("rent"),
      }),
    charges: z
      .string()
      .refine((value) => value.trim() === "" || parseAmount(value) !== null, {
        error: () => companyOnboardingMessage("charges"),
      }),
    landlordName: z
      .string()
      .trim()
      .min(1, { error: () => companyOnboardingMessage("landlordName") }),
    landlordAddress: z.string(),
    landlordPhone: z.string(),
  })
  .refine(
    (values) => {
      const total = parseAmount(values.totalArea);
      const business = parseAmount(values.businessArea);
      return total === null || business === null
        ? true
        : Number(business) <= Number(total);
    },
    {
      path: ["businessArea"],
      error: () => companyOnboardingMessage("businessAreaTooLarge"),
    },
  );

interface LeaseStepProps {
  values: CompanyLeaseValues;
  pending: boolean;
  error: string | null;
  onBack: (values: CompanyLeaseValues) => void;
  onNext: (values: CompanyLeaseValues) => void;
  /** Keeps the persisted draft in sync while the user is still typing. */
  onChange?: (values: CompanyLeaseValues) => void;
  skipAction: ReactNode;
}

/** Company step 2: dwelling, surfaces, rent and the natural-person landlord. */
export function OnboardingCompanyStepLease({
  values,
  pending,
  error,
  onBack,
  onNext,
  onChange,
  skipAction,
}: LeaseStepProps) {
  const { t } = useTranslation();
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CompanyLeaseValues>({
    resolver: zodResolver(leaseSchema),
    mode: "onTouched",
    defaultValues: values,
  });
  const totalArea = watch("totalArea");
  const businessArea = watch("businessArea");
  // Display only: the backend CalculationService remains the reference.
  const preview = proRataPreview(totalArea, businessArea);

  useEffect(() => {
    const subscription = watch((formValues) => {
      onChange?.(formValues as CompanyLeaseValues);
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange]);

  return (
    <section className="onboarding-card" aria-labelledby="company-lease-title">
      <h2 className="onboarding-section-title" id="company-lease-title">
        {t("onboarding.company.lease.title")}
      </h2>
      <p className="onboarding-section-description">
        {t("onboarding.company.lease.description")}
      </p>

      <form
        className="onboarding-form"
        noValidate
        data-cy="company-lease-form"
        onSubmit={handleSubmit(onNext)}
      >
        <div className="onboarding-grid">
          <FieldGroup
            id="company-onboarding-property-address"
            label={t("onboarding.company.lease.propertyAddress")}
            error={errors.propertyAddress?.message}
            className="sm:col-span-2"
          >
            <Controller
              control={control}
              name="propertyAddress"
              render={({ field }) => (
                <AddressAutocomplete
                  id="company-onboarding-property-address"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t(
                    "onboarding.company.lease.propertyAddressPlaceholder",
                  )}
                  data-cy="input-company-onboarding-property-address"
                  className={errors.propertyAddress ? "field-error" : undefined}
                />
              )}
            />
          </FieldGroup>
          <FieldGroup
            id="company-onboarding-total-area"
            label={t("onboarding.company.lease.totalArea")}
            error={errors.totalArea?.message}
          >
            <input
              id="company-onboarding-total-area"
              className={cn("field", errors.totalArea && "field-error")}
              inputMode="decimal"
              data-cy="input-company-onboarding-total-area"
              {...register("totalArea")}
            />
          </FieldGroup>
          <FieldGroup
            id="company-onboarding-business-area"
            label={t("onboarding.company.lease.businessArea")}
            error={errors.businessArea?.message}
            help={t("onboarding.company.lease.businessAreaHelp")}
          >
            <input
              id="company-onboarding-business-area"
              className={cn("field", errors.businessArea && "field-error")}
              inputMode="decimal"
              data-cy="input-company-onboarding-business-area"
              {...register("businessArea")}
            />
          </FieldGroup>
          <FieldGroup
            id="company-onboarding-rent"
            label={t("onboarding.company.lease.rent")}
            error={errors.rentExclCharges?.message}
          >
            <input
              id="company-onboarding-rent"
              className={cn("field", errors.rentExclCharges && "field-error")}
              inputMode="decimal"
              data-cy="input-company-onboarding-rent"
              {...register("rentExclCharges")}
            />
          </FieldGroup>
          <FieldGroup
            id="company-onboarding-charges"
            label={t("onboarding.company.lease.charges")}
            error={errors.charges?.message}
          >
            <input
              id="company-onboarding-charges"
              className={cn("field", errors.charges && "field-error")}
              inputMode="decimal"
              data-cy="input-company-onboarding-charges"
              {...register("charges")}
            />
          </FieldGroup>
          <div className="company-onboarding-preview sm:col-span-2">
            <p className="company-onboarding-preview-label">
              {t("onboarding.company.lease.proRataLabel")}
            </p>
            <p className="company-onboarding-preview-value">
              <strong>{preview}</strong>
            </p>
            <p className="company-onboarding-preview-hint">
              {t("onboarding.company.lease.proRataHint")}
            </p>
          </div>
        </div>

        <h3 className="onboarding-subtitle">
          {t("onboarding.company.lease.landlordTitle")}
        </h3>
        <div className="onboarding-grid">
          <FieldGroup
            id="company-onboarding-landlord-name"
            label={t("onboarding.company.lease.landlordName")}
            error={errors.landlordName?.message}
          >
            <input
              id="company-onboarding-landlord-name"
              className={cn("field", errors.landlordName && "field-error")}
              autoComplete="name"
              data-cy="input-company-onboarding-landlord-name"
              {...register("landlordName")}
            />
          </FieldGroup>
          <FieldGroup
            id="company-onboarding-landlord-phone"
            label={t("onboarding.company.lease.landlordPhone")}
            error={errors.landlordPhone?.message}
          >
            <input
              id="company-onboarding-landlord-phone"
              className="field"
              type="tel"
              autoComplete="tel"
              data-cy="input-company-onboarding-landlord-phone"
              {...register("landlordPhone")}
            />
          </FieldGroup>
          <FieldGroup
            id="company-onboarding-landlord-address"
            label={t("onboarding.company.lease.landlordAddress")}
            error={errors.landlordAddress?.message}
            className="sm:col-span-2"
          >
            <input
              id="company-onboarding-landlord-address"
              className="field"
              data-cy="input-company-onboarding-landlord-address"
              {...register("landlordAddress")}
            />
          </FieldGroup>
        </div>

        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}

        <div className="onboarding-actions">
          {skipAction}
          <Button
            variant="ghost"
            data-cy="btn-company-back"
            onClick={handleSubmit(onBack)}
          >
            {t("onboarding.navigation.back")}
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={pending}
            data-cy="btn-company-next"
          >
            {t("onboarding.navigation.next")}
          </Button>
        </div>
      </form>
    </section>
  );
}
