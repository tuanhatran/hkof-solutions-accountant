import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import {
  onboardingMessage,
  type LeaseType,
  type LeaseValues,
  type TenantValues,
} from "./useOnboardingState";

const tenantSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, {
      error: () => onboardingMessage("tenantFirstName"),
    }),
  lastName: z
    .string()
    .trim()
    .min(1, {
      error: () => onboardingMessage("tenantLastName"),
    }),
});

export const leaseFormSchema = z
  .object({
    leaseType: z.enum(["individual", "colocation"]),
    tenants: z.array(tenantSchema).min(1, {
      error: () => onboardingMessage("tenants"),
    }),
  })
  .superRefine((value, ctx) => {
    if (value.leaseType === "colocation" && value.tenants.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["tenants"],
        message: onboardingMessage("colocation"),
      });
    }
  });

export type LeaseFormValues = z.infer<typeof leaseFormSchema>;

const EMPTY_TENANT: TenantValues = { firstName: "", lastName: "" };

interface LeaseStepProps {
  values: LeaseValues;
  pending: boolean;
  error: string | null;
  onBack: (values: LeaseValues) => void;
  onNext: (values: LeaseValues) => void;
}

/** Step 3: individual or solidary colocation lease with its natural-person tenants. */
export function OnboardingStepLease({
  values,
  pending,
  error,
  onBack,
  onNext,
}: LeaseStepProps) {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
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
    defaultValues: values,
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

  function changeType(next: LeaseType) {
    if (next === leaseType) {
      return;
    }
    const current = getValues("tenants");
    if (next === "individual") {
      replace(current.slice(0, 1));
    } else {
      const missing = Math.max(0, 2 - current.length);
      replace([
        ...current,
        ...Array.from({ length: missing }, () => ({ ...EMPTY_TENANT })),
      ]);
    }
    setValue("leaseType", next, { shouldValidate: true });
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
            ) {
              return;
            }
            onNext({
              leaseType: formValues.leaseType,
              tenants: formValues.tenants,
            });
          },
          () => setSubmitted(true),
        )}
      >
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
            />
            {t("onboarding.lease.colocation")}
          </label>
        </fieldset>

        <div className="onboarding-tenants">
          {fields.map((field, index) => (
            <fieldset
              key={field.id}
              className="onboarding-tenant"
              aria-label={t("onboarding.lease.tenantTitle", {
                index: index + 1,
              })}
            >
              <legend className="onboarding-subtitle">
                {t("onboarding.lease.tenantTitle", { index: index + 1 })}
              </legend>
              <FieldGroup
                id={`onboarding-tenant-first-${index}`}
                label={t("onboarding.lease.firstName")}
                error={errors.tenants?.[index]?.firstName?.message}
              >
                <input
                  id={`onboarding-tenant-first-${index}`}
                  className={cn(
                    "field",
                    errors.tenants?.[index]?.firstName && "field-error",
                  )}
                  {...register(`tenants.${index}.firstName`)}
                />
              </FieldGroup>
              <FieldGroup
                id={`onboarding-tenant-last-${index}`}
                label={t("onboarding.lease.lastName")}
                error={errors.tenants?.[index]?.lastName?.message}
              >
                <input
                  id={`onboarding-tenant-last-${index}`}
                  className={cn(
                    "field",
                    errors.tenants?.[index]?.lastName && "field-error",
                  )}
                  {...register(`tenants.${index}.lastName`)}
                />
              </FieldGroup>
              {fields.length > 1 ? (
                <div className="onboarding-tenant-actions">
                  <Button
                    variant="ghost"
                    small
                    onClick={() => remove(index)}
                    aria-label={t("onboarding.lease.removeTenant", {
                      index: index + 1,
                    })}
                  >
                    {t("onboarding.lease.remove")}
                  </Button>
                </div>
              ) : null}
            </fieldset>
          ))}
        </div>

        {colocationError ? (
          <p className="error-text" role="alert">
            {colocationError}
          </p>
        ) : null}

        {leaseType === "colocation" ? (
          <Button
            variant="secondary"
            small
            onClick={() => append({ ...EMPTY_TENANT })}
          >
            {t("onboarding.lease.addTenant")}
          </Button>
        ) : null}

        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}

        <div className="onboarding-actions">
          <Button
            variant="secondary"
            onClick={() =>
              onBack({
                leaseType: getValues("leaseType"),
                tenants: getValues("tenants"),
              })
            }
            disabled={pending}
          >
            {t("onboarding.navigation.back")}
          </Button>
          <Button variant="primary" type="submit" loading={pending}>
            {t("onboarding.navigation.next")}
          </Button>
        </div>
      </form>
    </section>
  );
}
