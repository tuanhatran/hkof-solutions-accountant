import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import { OnboardingTenantCard } from "./OnboardingTenantCard";
import {
  EMPTY_TENANT,
  isValidCharges,
  isValidRent,
  onboardingMessage,
  type LeaseType,
  type LeaseValues,
  type PropertyItemValues,
} from "./useOnboardingState";

const issue = (ctx: z.RefinementCtx, path: (string | number)[], key: string) =>
  ctx.addIssue({ code: "custom", path, message: onboardingMessage(key) });

const tenantSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { error: () => onboardingMessage("tenantFirstName") }),
  lastName: z
    .string()
    .trim()
    .min(1, { error: () => onboardingMessage("tenantLastName") }),
  rentExclCharges: z.string(),
  charges: z.string(),
});

export const leaseFormSchema = z
  .object({
    propertyId: z
      .string()
      .min(1, { error: () => onboardingMessage("propertySelect") }),
    leaseType: z.enum(["individual", "colocation"]),
    rentExclCharges: z.string(),
    charges: z.string(),
    tenants: z
      .array(tenantSchema)
      .min(1, { error: () => onboardingMessage("tenants") }),
  })
  .superRefine((data, ctx) => {
    if (data.leaseType === "individual") {
      data.tenants.forEach((t, i) => {
        if (!isValidRent(t.rentExclCharges))
          issue(ctx, ["tenants", i, "rentExclCharges"], "rent");
        if (!isValidCharges(t.charges))
          issue(ctx, ["tenants", i, "charges"], "charges");
      });
    } else {
      if (data.tenants.length < 2) issue(ctx, ["tenants"], "colocation");
      if (!isValidRent(data.rentExclCharges))
        issue(ctx, ["rentExclCharges"], "rent");
      if (!isValidCharges(data.charges)) issue(ctx, ["charges"], "charges");
    }
  });

export type LeaseFormValues = LeaseValues;

interface LeaseStepProps {
  properties: PropertyItemValues[];
  values: LeaseValues;
  pending: boolean;
  error: string | null;
  onBack: (values: LeaseValues) => void;
  onNext: (values: LeaseValues) => void;
}

/** Step 3: attach leases to a selected property with individual or colocation amounts. */
export function OnboardingStepLease({
  properties,
  values,
  pending,
  error,
  onBack,
  onNext,
}: LeaseStepProps) {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const defaultPropertyId = values.propertyId || properties[0]?.id || "prop-1";

  const {
    register,
    control,
    getValues,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeaseFormValues>({
    resolver: zodResolver(leaseFormSchema),
    mode: "onTouched",
    defaultValues: { ...values, propertyId: defaultPropertyId },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "tenants",
  });
  const leaseType = watch("leaseType");
  const colocationError =
    submitted && leaseType === "colocation" && fields.length < 2
      ? onboardingMessage("colocation")
      : null;

  function changeType(nextType: LeaseType) {
    if (nextType === leaseType) return;
    const current = getValues("tenants");
    if (nextType === "individual") {
      setValue("leaseType", nextType, { shouldValidate: true });
    } else {
      const missing = Math.max(0, 2 - current.length);
      replace([
        ...current,
        ...Array.from({ length: missing }, () => ({ ...EMPTY_TENANT })),
      ]);
      setValue("leaseType", nextType, { shouldValidate: true });
    }
  }

  return (
    <section
      className="onboarding-card"
      aria-labelledby="onboarding-lease-title"
    >
      <h2 className="onboarding-section-title" id="onboarding-lease-title">
        {t("onboarding.lease.title")}
      </h2>
      <p className="onboarding-section-description">
        {t("onboarding.lease.description")}
      </p>

      <form
        className="onboarding-form"
        noValidate
        onSubmit={handleSubmit(
          (formValues) => {
            setSubmitted(true);
            if (
              formValues.leaseType === "colocation" &&
              formValues.tenants.length < 2
            )
              return;
            onNext(formValues);
          },
          () => setSubmitted(true),
        )}
      >
        <FieldGroup
          id="onboarding-lease-property"
          label={t("onboarding.lease.propertySelect")}
          error={errors.propertyId?.message}
        >
          <select
            id="onboarding-lease-property"
            className="field"
            data-cy="select-onboarding-lease-property"
            {...register("propertyId")}
          >
            {properties.map((p, idx) => (
              <option key={p.id} value={p.id}>
                {p.propertyAddress ||
                  t("onboarding.property.itemTitle", { index: idx + 1 })}
              </option>
            ))}
          </select>
        </FieldGroup>

        <fieldset className="onboarding-lease-type">
          <legend className="onboarding-subtitle">
            {t("onboarding.lease.type")}
          </legend>
          <label className="onboarding-radio">
            <input
              type="radio"
              name="leaseType"
              value="individual"
              checked={leaseType === "individual"}
              onChange={() => changeType("individual")}
              data-cy="onboarding-lease-individual"
            />
            {t("onboarding.lease.individual")}
          </label>
          <label className="onboarding-radio">
            <input
              type="radio"
              name="leaseType"
              value="colocation"
              checked={leaseType === "colocation"}
              onChange={() => changeType("colocation")}
              data-cy="onboarding-lease-colocation"
            />
            {t("onboarding.lease.colocation")}
          </label>
        </fieldset>

        {leaseType === "colocation" ? (
          <div className="onboarding-grid rounded-xl border border-line p-4">
            <FieldGroup
              id="onboarding-total-rent"
              label={t("onboarding.lease.totalRent")}
              error={errors.rentExclCharges?.message}
              help={t("onboarding.lease.totalRentHelp")}
            >
              <input
                id="onboarding-total-rent"
                className={cn("field", errors.rentExclCharges && "field-error")}
                inputMode="decimal"
                data-cy="input-onboarding-total-rent"
                {...register("rentExclCharges")}
              />
            </FieldGroup>
            <FieldGroup
              id="onboarding-total-charges"
              label={t("onboarding.lease.totalCharges")}
              error={errors.charges?.message}
              help={t("onboarding.lease.totalChargesHelp")}
            >
              <input
                id="onboarding-total-charges"
                className={cn("field", errors.charges && "field-error")}
                inputMode="decimal"
                data-cy="input-onboarding-total-charges"
                {...register("charges")}
              />
            </FieldGroup>
          </div>
        ) : null}

        <div className="onboarding-tenants">
          {fields.map((field, index) => (
            <OnboardingTenantCard
              key={field.id}
              index={index}
              total={fields.length}
              leaseType={leaseType}
              register={register}
              errors={errors}
              onRemove={remove}
            />
          ))}
        </div>

        {colocationError ? (
          <p className="error-text" role="alert">
            {colocationError}
          </p>
        ) : null}

        <Button
          variant="secondary"
          small
          type="button"
          onClick={() => append({ ...EMPTY_TENANT })}
          data-cy="btn-add-tenant"
        >
          {t("onboarding.lease.addTenant")}
        </Button>

        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}

        <div className="onboarding-actions">
          <Button
            variant="secondary"
            type="button"
            onClick={() => onBack(getValues())}
            disabled={pending}
          >
            {t("onboarding.navigation.back")}
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={pending}
            data-cy="btn-next-onboarding-lease"
          >
            {t("onboarding.navigation.next")}
          </Button>
        </div>
      </form>
    </section>
  );
}
