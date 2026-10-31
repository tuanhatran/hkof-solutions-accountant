import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { Button } from "@/components/ui/Button";
import { CountryCodeSelect } from "@/components/ui/CountryCodeSelect";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { PropertyFormValues } from "./OnboardingStepProperty";

interface PropertyCardProps {
  index: number;
  total: number;
  register: UseFormRegister<PropertyFormValues>;
  control: Control<PropertyFormValues>;
  watch: UseFormWatch<PropertyFormValues>;
  setValue: UseFormSetValue<PropertyFormValues>;
  errors: FieldErrors<PropertyFormValues>;
  onRemove: (index: number) => void;
}

/** Card rendering the address and landlord fields for a single property. */
export function OnboardingPropertyCard({
  index,
  total,
  register,
  control,
  watch,
  setValue,
  errors,
  onRemove,
}: PropertyCardProps) {
  const { t } = useTranslation();
  const inputId =
    index === 0
      ? "onboarding-property-address"
      : `onboarding-property-address-${index}`;
  const propErrors = errors.properties?.[index];

  return (
    <fieldset
      className="space-y-4 rounded-xl border border-line p-4 sm:p-5"
      aria-label={t("onboarding.property.itemTitle", { index: index + 1 })}
    >
      <input type="hidden" {...register(`properties.${index}.id`)} />
      <div className="flex items-center justify-between">
        <legend className="onboarding-subtitle">
          {t("onboarding.property.itemTitle", { index: index + 1 })}
        </legend>
        {total > 1 ? (
          <Button
            variant="ghost"
            small
            type="button"
            onClick={() => onRemove(index)}
            aria-label={t("onboarding.property.removeProperty", {
              index: index + 1,
            })}
            data-cy={`btn-remove-property-${index}`}
          >
            {t("onboarding.property.remove")}
          </Button>
        ) : null}
      </div>

      <FieldGroup
        id={inputId}
        label={t("onboarding.property.address")}
        error={propErrors?.propertyAddress?.message}
      >
        <Controller
          control={control}
          name={`properties.${index}.propertyAddress`}
          render={({ field }) => (
            <AddressAutocomplete
              id={inputId}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder={t("onboarding.property.addressPlaceholder")}
              data-cy={`input-onboarding-property-address-${index}`}
              className={
                propErrors?.propertyAddress ? "field-error" : undefined
              }
            />
          )}
        />
      </FieldGroup>

      <fieldset
        className="rounded-lg border border-line/60 bg-paper-deep/20 p-4"
        aria-label={t("onboarding.property.landlordTitle")}
      >
        <legend className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          {t("onboarding.property.landlordTitle")}
        </legend>
        <div className="mt-3 onboarding-grid">
          <FieldGroup
            id={`onboarding-landlord-first-name-${index}`}
            label={t("onboarding.property.landlordFirstName")}
            error={propErrors?.landlordFirstName?.message}
          >
            <input
              id={`onboarding-landlord-first-name-${index}`}
              className={cn(
                "field",
                propErrors?.landlordFirstName && "field-error",
              )}
              data-cy={`input-onboarding-landlord-first-name-${index}`}
              {...register(`properties.${index}.landlordFirstName`)}
            />
          </FieldGroup>
          <FieldGroup
            id={`onboarding-landlord-last-name-${index}`}
            label={t("onboarding.property.landlordLastName")}
            error={propErrors?.landlordLastName?.message}
          >
            <input
              id={`onboarding-landlord-last-name-${index}`}
              className={cn(
                "field",
                propErrors?.landlordLastName && "field-error",
              )}
              data-cy={`input-onboarding-landlord-last-name-${index}`}
              {...register(`properties.${index}.landlordLastName`)}
            />
          </FieldGroup>
          <FieldGroup
            id={`onboarding-landlord-phone-${index}`}
            label={t("onboarding.property.landlordPhone")}
            help={t("onboarding.property.landlordPhoneHelp")}
          >
            <div className="mt-1.5 flex gap-2">
              <CountryCodeSelect
                key={`landlord-country-${index}`}
                id={`onboarding-landlord-phone-country-${index}`}
                value={
                  watch(`properties.${index}.landlordPhoneCountryCode`) ?? "+33"
                }
                onChange={(code) =>
                  setValue(`properties.${index}.landlordPhoneCountryCode`, code)
                }
                data-cy={`select-onboarding-landlord-phone-country-${index}`}
              />
              <input
                key={`landlord-phone-${index}`}
                id={`onboarding-landlord-phone-${index}`}
                className="field mt-0"
                type="tel"
                data-cy={`input-onboarding-landlord-phone-${index}`}
                {...register(`properties.${index}.landlordPhone`)}
              />
            </div>
          </FieldGroup>
          <FieldGroup
            id={`onboarding-landlord-email-${index}`}
            label={t("onboarding.property.landlordEmail")}
          >
            <input
              id={`onboarding-landlord-email-${index}`}
              className="field"
              type="email"
              data-cy={`input-onboarding-landlord-email-${index}`}
              {...register(`properties.${index}.landlordEmail`)}
            />
          </FieldGroup>
          <FieldGroup
            id={`onboarding-landlord-address-note-${index}`}
            label={t("onboarding.property.landlordAddressNote")}
            help={t("onboarding.property.landlordAddressNoteHelp")}
          >
            <input
              id={`onboarding-landlord-address-note-${index}`}
              className="field"
              data-cy={`input-onboarding-landlord-address-note-${index}`}
              {...register(`properties.${index}.landlordAddressNote`)}
            />
          </FieldGroup>
        </div>
      </fieldset>
    </fieldset>
  );
}
