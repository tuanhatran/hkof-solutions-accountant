import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { OnboardingPropertyCard } from "./OnboardingPropertyCard";
import {
  createEmptyProperty,
  onboardingMessage,
  type PropertyItemValues,
  type PropertyValues,
} from "./useOnboardingState";

export const propertyItemSchema = z.object({
  id: z.string(),
  propertyAddress: z
    .string()
    .trim()
    .min(1, { error: () => onboardingMessage("propertyAddress") }),
  landlordFirstName: z
    .string()
    .trim()
    .min(1, { error: () => onboardingMessage("landlordFirstName") }),
  landlordLastName: z
    .string()
    .trim()
    .min(1, { error: () => onboardingMessage("landlordLastName") }),
  landlordPhoneCountryCode: z.string().optional(),
  landlordPhone: z.string(),
  landlordEmail: z.string(),
  landlordAddressNote: z.string(),
});

export const propertySchema = z.object({
  properties: z
    .array(propertyItemSchema)
    .min(1, { error: () => onboardingMessage("properties") }),
});

export type PropertyFormValues = PropertyValues;

interface PropertyStepProps {
  values: PropertyValues | PropertyItemValues[];
  pending: boolean;
  error: string | null;
  onBack: (values: PropertyValues) => void;
  onNext: (values: PropertyValues) => void;
}

/** Step 2: managed properties and distinct landlord details. */
export function OnboardingStepProperty({
  values,
  pending,
  error,
  onBack,
  onNext,
}: PropertyStepProps) {
  const { t } = useTranslation();
  const initialList = Array.isArray(values)
    ? values
    : (values?.properties ?? [createEmptyProperty()]);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    mode: "onTouched",
    defaultValues: { properties: initialList },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "properties",
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
        <div className="space-y-6">
          {fields.map((field, index) => (
            <OnboardingPropertyCard
              key={field.id}
              index={index}
              total={fields.length}
              register={register}
              control={control}
              watch={watch}
              setValue={setValue}
              errors={errors}
              onRemove={remove}
            />
          ))}
        </div>

        <Button
          variant="secondary"
          small
          type="button"
          onClick={() => append(createEmptyProperty(`prop-${Date.now()}`))}
          data-cy="btn-add-property"
        >
          {t("onboarding.property.addProperty")}
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
            data-cy="btn-next-onboarding-property"
          >
            {t("onboarding.navigation.next")}
          </Button>
        </div>
      </form>
    </section>
  );
}
