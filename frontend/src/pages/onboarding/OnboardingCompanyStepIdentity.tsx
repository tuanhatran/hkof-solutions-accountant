import { zodResolver } from "@hookform/resolvers/zod";
import { type ReactNode, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import {
  companyOnboardingMessage,
  type CompanyIdentityValues,
} from "./useCompanyOnboardingState";

const SIREN_PATTERN = /^\d{3}\s?\d{3}\s?\d{3}$/;
const SIRET_PATTERN = /^\d{3}\s?\d{3}\s?\d{3}\s?\d{5}$/;

const identitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: () => companyOnboardingMessage("name") }),
  legalForm: z.string(),
  siren: z
    .string()
    .trim()
    .refine((value) => value === "" || SIREN_PATTERN.test(value), {
      error: () => companyOnboardingMessage("siren"),
    }),
  siret: z
    .string()
    .trim()
    .refine((value) => value === "" || SIRET_PATTERN.test(value), {
      error: () => companyOnboardingMessage("siret"),
    }),
  address: z.string(),
  managerName: z.string(),
  issuePlace: z.string(),
});

interface IdentityStepProps {
  values: CompanyIdentityValues;
  pending: boolean;
  error: string | null;
  onNext: (values: CompanyIdentityValues) => void;
  skipAction: ReactNode;
}

/** Company step 1: legal identity, optional SIREN lookup and manager. */
export function OnboardingCompanyStepIdentity({
  values,
  pending,
  error,
  onNext,
  skipAction,
}: IdentityStepProps) {
  const { t } = useTranslation();
  const [lookupPending, setLookupPending] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupFound, setLookupFound] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanyIdentityValues>({
    resolver: zodResolver(identitySchema),
    mode: "onTouched",
    defaultValues: values,
  });
  const siren = watch("siren");
  const sirenDigits = siren.replace(/\D/g, "");

  async function lookup() {
    setLookupPending(true);
    setLookupError(null);
    setLookupFound(null);
    try {
      const found = await api.companies.lookup(sirenDigits);
      if (found.name) {
        setValue("name", found.name, { shouldValidate: true });
      }
      if (found.legalForm !== undefined) {
        setValue("legalForm", found.legalForm);
      }
      if (found.address !== undefined) {
        setValue("address", found.address);
      }
      if (found.managerName !== undefined) {
        setValue("managerName", found.managerName);
      }
      setLookupFound(found.name ?? "");
    } catch (caught) {
      setLookupError(errorMessage(caught));
    } finally {
      setLookupPending(false);
    }
  }

  return (
    <section
      className="onboarding-card"
      aria-labelledby="company-identity-title"
    >
      <h2 className="onboarding-section-title" id="company-identity-title">
        {t("onboarding.company.identity.title")}
      </h2>
      <p className="onboarding-section-description">
        {t("onboarding.company.identity.description")}
      </p>

      <form
        className="onboarding-form"
        noValidate
        data-cy="company-identity-form"
        onSubmit={handleSubmit(onNext)}
      >
        <div className="onboarding-grid">
          <FieldGroup
            id="company-onboarding-name"
            label={t("onboarding.company.identity.name")}
            error={errors.name?.message}
            className="sm:col-span-2"
          >
            <input
              id="company-onboarding-name"
              className={cn("field", errors.name && "field-error")}
              autoComplete="organization"
              data-cy="input-company-onboarding-name"
              {...register("name")}
            />
          </FieldGroup>
          <FieldGroup
            id="company-onboarding-legal-form"
            label={t("onboarding.company.identity.legalForm")}
            error={errors.legalForm?.message}
          >
            <input
              id="company-onboarding-legal-form"
              className="field"
              data-cy="input-company-onboarding-legal-form"
              {...register("legalForm")}
            />
          </FieldGroup>
          <FieldGroup
            id="company-onboarding-siren"
            label={t("onboarding.company.identity.siren")}
            error={errors.siren?.message}
            help={t("onboarding.company.identity.sirenHelp")}
          >
            <div className="company-onboarding-lookup">
              <input
                id="company-onboarding-siren"
                className={cn("field", errors.siren && "field-error")}
                inputMode="numeric"
                data-cy="input-company-onboarding-siren"
                {...register("siren")}
              />
              <Button
                variant="ghost"
                small
                type="button"
                loading={lookupPending}
                disabled={sirenDigits.length !== 9}
                onClick={() => void lookup()}
                data-cy="btn-company-siren-lookup"
              >
                {t("onboarding.company.identity.lookup")}
              </Button>
            </div>
          </FieldGroup>
          <FieldGroup
            id="company-onboarding-siret"
            label={t("onboarding.company.identity.siret")}
            error={errors.siret?.message}
            help={t("onboarding.company.identity.siretHelp")}
          >
            <input
              id="company-onboarding-siret"
              className={cn("field", errors.siret && "field-error")}
              inputMode="numeric"
              data-cy="input-company-onboarding-siret"
              {...register("siret")}
            />
          </FieldGroup>
          <FieldGroup
            id="company-onboarding-manager"
            label={t("onboarding.company.identity.managerName")}
            error={errors.managerName?.message}
          >
            <input
              id="company-onboarding-manager"
              className="field"
              data-cy="input-company-onboarding-manager"
              {...register("managerName")}
            />
          </FieldGroup>
          <FieldGroup
            id="company-onboarding-address"
            label={t("onboarding.company.identity.address")}
            error={errors.address?.message}
            className="sm:col-span-2"
          >
            <Controller
              control={control}
              name="address"
              render={({ field }) => (
                <AddressAutocomplete
                  id="company-onboarding-address"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t(
                    "onboarding.company.identity.addressPlaceholder",
                  )}
                  data-cy="input-company-onboarding-address"
                />
              )}
            />
          </FieldGroup>
          <FieldGroup
            id="company-onboarding-issue-place"
            label={t("onboarding.company.identity.issuePlace")}
            error={errors.issuePlace?.message}
          >
            <input
              id="company-onboarding-issue-place"
              className="field"
              data-cy="input-company-onboarding-issue-place"
              {...register("issuePlace")}
            />
          </FieldGroup>
        </div>

        {lookupError ? (
          <p className="error-text" role="alert" data-cy="company-lookup-error">
            {lookupError}
          </p>
        ) : null}
        {lookupFound ? (
          <p className="onboarding-saved" role="status">
            {t("onboarding.company.identity.lookupFound", {
              name: lookupFound,
            })}
          </p>
        ) : null}
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}

        <div className="onboarding-actions">
          {skipAction}
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
