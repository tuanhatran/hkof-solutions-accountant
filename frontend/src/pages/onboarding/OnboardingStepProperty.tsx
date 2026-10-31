import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import { parseAmount } from "@/lib/format";
import { onboardingMessage, type PropertyValues } from "./useOnboardingState";

export const propertySchema = z.object({
  propertyAddress: z
    .string()
    .trim()
    .min(1, {
      error: () => onboardingMessage("propertyAddress"),
    }),
  rentExclCharges: z.string().refine(
    (value) => {
      const amount = parseAmount(value);
      return amount !== null && Number(amount) > 0;
    },
    { error: () => onboardingMessage("rent") },
  ),
  charges: z
    .string()
    .refine((value) => value.trim() === "" || parseAmount(value) !== null, {
      error: () => onboardingMessage("charges"),
    }),
});

export type PropertyFormValues = z.infer<typeof propertySchema>;

interface PropertyStepProps {
  values: PropertyValues;
  landlordName: string;
  landlordEmail: string;
  pending: boolean;
  error: string | null;
  onBack: (values: PropertyValues) => void;
  onNext: (values: PropertyValues) => void;
}

/** Step 2: the rented dwelling and the landlord taken from step 1. */
export function OnboardingStepProperty({
  values,
  landlordName,
  landlordEmail,
  pending,
  error,
  onBack,
  onNext,
}: PropertyStepProps) {
  const { t } = useTranslation();
  const {
    register,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    mode: "onTouched",
    defaultValues: values,
  });

  return (
    <section
      className="onboarding-card"
      aria-labelledby="onboarding-property-title"
    >
      <h2 className="onboarding-section-title" id="onboarding-property-title">
        {t("onboarding.property.title")}
      </h2>
      <p className="onboarding-section-description">
        {t("onboarding.property.description")}
      </p>

      <form
        className="onboarding-form"
        noValidate
        onSubmit={handleSubmit((formValues) => onNext(formValues))}
      >
        <h3 className="onboarding-subtitle">
          {t("onboarding.property.dwellingTitle")}
        </h3>
        <FieldGroup
          id="onboarding-property-address"
          label={t("onboarding.property.address")}
          error={errors.propertyAddress?.message}
        >
          <input
            id="onboarding-property-address"
            className={cn("field", errors.propertyAddress && "field-error")}
            autoComplete="street-address"
            data-cy="input-onboarding-property-address"
            {...register("propertyAddress")}
          />
        </FieldGroup>
        <div className="onboarding-grid">
          <FieldGroup
            id="onboarding-rent"
            label={t("onboarding.property.rent")}
            error={errors.rentExclCharges?.message}
            help={t("onboarding.property.rentHelp")}
          >
            <input
              id="onboarding-rent"
              className={cn("field", errors.rentExclCharges && "field-error")}
              inputMode="decimal"
              data-cy="input-onboarding-rent"
              {...register("rentExclCharges")}
            />
          </FieldGroup>
          <FieldGroup
            id="onboarding-charges"
            label={t("onboarding.property.charges")}
            error={errors.charges?.message}
            help={t("onboarding.property.chargesHelp")}
          >
            <input
              id="onboarding-charges"
              className={cn("field", errors.charges && "field-error")}
              inputMode="decimal"
              data-cy="input-onboarding-charges"
              {...register("charges")}
            />
          </FieldGroup>
        </div>

        <h3 className="onboarding-subtitle">
          {t("onboarding.property.landlordTitle")}
        </h3>
        <div className="onboarding-landlord" data-cy="onboarding-landlord">
          <div>
            <p className="onboarding-summary-term">
              {t("onboarding.property.landlord")}
            </p>
            <p className="onboarding-landlord-value">{landlordName}</p>
          </div>
          <div>
            <p className="onboarding-summary-term">
              {t("onboarding.property.email")}
            </p>
            <p className="onboarding-landlord-value">{landlordEmail}</p>
            <p className="hint">{t("onboarding.property.emailHelp")}</p>
          </div>
        </div>

        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}

        <div className="onboarding-actions">
          <Button
            variant="secondary"
            onClick={() => onBack(getValues())}
            disabled={pending}
          >
            {t("onboarding.navigation.back")}
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={pending}
            data-cy="btn-next-onboarding-property"
          >
            {t("onboarding.navigation.next")}
          </Button>
        </div>
      </form>
    </section>
  );
}
