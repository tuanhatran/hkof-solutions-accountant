import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { PersonDto } from "@/api/types";
import { SignatureStudio } from "@/components/settings/SignatureStudio";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import { onboardingMessage, type ProfileValues } from "./useOnboardingState";

const PHONE_PATTERN = /^(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}$/;
/** SIREN with 9 digits or SIRET with 14: 10 to 13 digits are rejected. */
const IDENTIFIER_PATTERN = /^(?:\d{9}|\d{14})$/;

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
  phone: z
    .string()
    .trim()
    .refine((value) => PHONE_PATTERN.test(value), {
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
    .refine((value) => IDENTIFIER_PATTERN.test(value.replace(/[ .]/g, "")), {
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
  const {
    register,
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
          onSave(formValues, person !== null),
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
              {...register("lastName")}
            />
          </FieldGroup>
          <FieldGroup
            id="onboarding-phone"
            label={t("onboarding.profile.phone")}
            error={errors.phone?.message}
            help={t("onboarding.profile.phoneHelp")}
          >
            <input
              id="onboarding-phone"
              className={cn("field", errors.phone && "field-error")}
              type="tel"
              autoComplete="tel"
              {...register("phone")}
            />
          </FieldGroup>
          <FieldGroup
            id="onboarding-person-address"
            label={t("onboarding.profile.address")}
            error={errors.address?.message}
          >
            <input
              id="onboarding-person-address"
              className="field"
              autoComplete="street-address"
              {...register("address")}
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
          <Button variant="primary" type="submit" loading={pending}>
            {person
              ? t("onboarding.navigation.next")
              : t("onboarding.navigation.saveProfile")}
          </Button>
        </div>
      </form>
    </section>
  );
}
