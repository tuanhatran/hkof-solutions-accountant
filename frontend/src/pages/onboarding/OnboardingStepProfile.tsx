import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { PersonDto } from "@/api/types";
import { SignatureStudio } from "@/components/settings/SignatureStudio";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { Button } from "@/components/ui/Button";
import { CountryCodeSelect } from "@/components/ui/CountryCodeSelect";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import {
  onboardingMessage,
  isValidPhone,
  isValidSirenSiret,
  type ProfileValues,
} from "./useOnboardingState";

export const profileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, {
      error: () => onboardingMessage("firstName"),
    }),
  lastName: z
    .string()
    .trim()
    .min(1, {
      error: () => onboardingMessage("lastName"),
    }),
  phoneCountryCode: z.string().optional(),
  phone: z
    .string()
    .trim()
    .min(1, {
      error: () => onboardingMessage("phone"),
    })
    .refine(isValidPhone, {
      error: () => onboardingMessage("phone"),
    }),
  address: z.string(),
  addressNote: z.string(),
  agencyName: z
    .string()
    .trim()
    .min(1, {
      error: () => onboardingMessage("agencyName"),
    }),
  legalForm: z.string(),
  sirenSiret: z
    .string()
    .trim()
    .refine(isValidSirenSiret, {
      error: () => onboardingMessage("sirenSiret"),
    }),
  agencyAddress: z.string(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileStepProps {
  values: ProfileValues;
  person: PersonDto | null;
  pending: boolean;
  error: string | null;
  onSave: (values: ProfileValues, advance: boolean) => void;
}

/** Step 1: the person profile, the agency identity and the signature studio. */
export function OnboardingStepProfile({
  values,
  person,
  pending,
  error,
  onSave,
}: ProfileStepProps) {
  const { t } = useTranslation();
  const [countryCode, setCountryCode] = useState(
    values.phoneCountryCode ?? "+33",
  );
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onTouched",
    defaultValues: values,
  });

  return (
    <section
      className="onboarding-card"
      aria-labelledby="onboarding-profile-title"
    >
      <h2 className="onboarding-section-title" id="onboarding-profile-title">
        {t("onboarding.profile.title")}
      </h2>
      <p className="onboarding-section-description">
        {t("onboarding.profile.description")}
      </p>

      <form
        className="onboarding-form"
        noValidate
        onSubmit={handleSubmit((formValues) =>
          onSave(
            { ...formValues, phoneCountryCode: countryCode },
            person !== null,
          ),
        )}
      >
        <h3 className="onboarding-subtitle">
          {t("onboarding.profile.identityTitle")}
        </h3>
        <div className="onboarding-grid">
          <FieldGroup
            id="onboarding-first-name"
            label={t("onboarding.profile.firstName")}
            error={errors.firstName?.message}
          >
            <input
              id="onboarding-first-name"
              className={cn("field", errors.firstName && "field-error")}
              autoComplete="given-name"
              data-cy="input-onboarding-first-name"
              {...register("firstName")}
            />
          </FieldGroup>
          <FieldGroup
            id="onboarding-last-name"
            label={t("onboarding.profile.lastName")}
            error={errors.lastName?.message}
          >
            <input
              id="onboarding-last-name"
              className={cn("field", errors.lastName && "field-error")}
              autoComplete="family-name"
              data-cy="input-onboarding-last-name"
              {...register("lastName")}
            />
          </FieldGroup>
          <FieldGroup
            id="onboarding-phone"
            label={t("onboarding.profile.phone")}
            error={errors.phone?.message}
            help={t("onboarding.profile.phoneHelp")}
          >
            <div className="mt-1.5 flex gap-2">
              <CountryCodeSelect
                key="onboarding-phone-country"
                id="onboarding-phone-country"
                value={countryCode}
                onChange={setCountryCode}
                data-cy="select-onboarding-phone-country"
              />
              <input
                key="onboarding-phone-input"
                id="onboarding-phone"
                className={cn("field mt-0", errors.phone && "field-error")}
                type="tel"
                autoComplete="tel"
                data-cy="input-onboarding-phone"
                {...register("phone")}
              />
            </div>
          </FieldGroup>
          <FieldGroup
            id="onboarding-person-address"
            label={t("onboarding.profile.address")}
            error={errors.address?.message}
          >
            <Controller
              control={control}
              name="address"
              render={({ field }) => (
                <AddressAutocomplete
                  id="onboarding-person-address"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t("onboarding.profile.addressPlaceholder")}
                  data-cy="input-onboarding-person-address"
                  className={errors.address ? "field-error" : undefined}
                />
              )}
            />
          </FieldGroup>
          <FieldGroup
            id="onboarding-address-note"
            label={t("onboarding.profile.addressNote")}
            error={errors.addressNote?.message}
            help={t("onboarding.profile.addressNoteHelp")}
          >
            <input
              id="onboarding-address-note"
              className="field"
              data-cy="input-onboarding-address-note"
              {...register("addressNote")}
            />
          </FieldGroup>
        </div>

        <h3 className="onboarding-subtitle">
          {t("onboarding.profile.agencyTitle")}
        </h3>
        <div className="onboarding-grid">
          <FieldGroup
            id="onboarding-agency-name"
            label={t("onboarding.profile.agencyName")}
            error={errors.agencyName?.message}
          >
            <input
              id="onboarding-agency-name"
              className={cn("field", errors.agencyName && "field-error")}
              autoComplete="organization"
              data-cy="input-onboarding-agency-name"
              {...register("agencyName")}
            />
          </FieldGroup>
          <FieldGroup
            id="onboarding-legal-form"
            label={t("onboarding.profile.legalForm")}
            error={errors.legalForm?.message}
          >
            <input
              id="onboarding-legal-form"
              className="field"
              data-cy="input-onboarding-legal-form"
              {...register("legalForm")}
            />
          </FieldGroup>
          <FieldGroup
            id="onboarding-siren-siret"
            label={t("onboarding.profile.sirenSiret")}
            error={errors.sirenSiret?.message}
            help={t("onboarding.profile.sirenSiretHelp")}
          >
            <input
              id="onboarding-siren-siret"
              className={cn("field", errors.sirenSiret && "field-error")}
              inputMode="numeric"
              data-cy="input-onboarding-siren-siret"
              {...register("sirenSiret")}
            />
          </FieldGroup>
          <FieldGroup
            id="onboarding-agency-address"
            label={t("onboarding.profile.agencyAddress")}
            error={errors.agencyAddress?.message}
          >
            <input
              id="onboarding-agency-address"
              className="field"
              data-cy="input-onboarding-agency-address"
              {...register("agencyAddress")}
            />
          </FieldGroup>
        </div>

        {person?.id !== undefined ? (
          <div className="onboarding-signature" data-cy="onboarding-signature">
            <h3 className="onboarding-subtitle">
              {t("onboarding.profile.signatureTitle")}
            </h3>
            <p className="onboarding-signature-description">
              {t("onboarding.profile.signatureDescription")}
            </p>
            <p className="onboarding-saved">{t("onboarding.profile.saved")}</p>
            <SignatureStudio personId={person.id} />
          </div>
        ) : null}

        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}

        <div className="onboarding-actions">
          <Button
            variant="primary"
            type="submit"
            loading={pending}
            data-cy="btn-save-onboarding-profile"
          >
            {person
              ? t("onboarding.navigation.next")
              : t("onboarding.navigation.saveProfile")}
          </Button>
        </div>
      </form>
    </section>
  );
}
