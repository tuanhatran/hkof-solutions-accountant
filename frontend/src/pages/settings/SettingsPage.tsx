import "./SettingsPage.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useSettings } from "@/api/queries";
import type { SettingsRequest } from "@/api/types";
import { RentReceiptSettings } from "@/components/settings/RentReceiptSettings";
import { SignaturesManager } from "@/components/signatures/SignaturesManager";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/cn";
import { parseAmount } from "@/lib/format";
import { settingsSchema, type SettingsFormValues } from "@/lib/validation";
import { toast } from "@/state/toasts";
import { ExpenseItemsManager } from "./ExpenseItemsManager";
import { SettingsCompanySection } from "./SettingsCompanySection";
import { SettingsHomeSection } from "./SettingsHomeSection";
import { SettingsSaveBar } from "./SettingsSaveBar";
import { valuesFromSettings } from "./settingsValues";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const settings = useSettings();
  const [tab, setTab] = useState<"entreprise" | "quittances">("entreprise");
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    mode: "onChange",
    defaultValues: valuesFromSettings(undefined),
  });

  useEffect(() => {
    if (settings.data) {
      reset(valuesFromSettings(settings.data));
    }
  }, [settings.data, reset]);

  const values = watch();
  const displayedProRata = useMemo(() => {
    const proArea = parseAmount(values.businessArea);
    const totalArea = parseAmount(values.totalArea);
    if (proArea === null || totalArea === null || Number(totalArea) <= 0) {
      return null;
    }
    return (Number(proArea) / Number(totalArea)) * 100;
  }, [values.businessArea, values.totalArea]);

  const save = useMutation({
    mutationFn: (submittedValues: SettingsFormValues) => {
      const requestBody: SettingsRequest = {
        companyName: submittedValues.companyName.trim(),
        legalForm: submittedValues.legalForm.trim(),
        siren: submittedValues.siren.trim(),
        companyAddress: submittedValues.companyAddress.trim(),
        managerName: submittedValues.managerName.trim(),
        homeAddress: submittedValues.homeAddress.trim(),
        totalArea: parseAmount(submittedValues.totalArea) ?? undefined,
        businessArea: parseAmount(submittedValues.businessArea) ?? undefined,
        issuePlace: submittedValues.issuePlace.trim(),
      };
      return api.settings.update(requestBody);
    },
    onSuccess: (payload) => {
      queryClient.setQueryData(queryKeys.settings, payload);
      toast.success(
        "Configuration enregistrée. Les prochains documents utiliseront ces valeurs.",
      );
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Réglages"
        title="Configuration"
        description="Ces informations alimentent les quittances, les notes de frais et les valeurs par défaut. Les calculs restent effectués par le backend."
        actions={
          tab === "entreprise" ? (
            <Button
              variant="primary"
              type="submit"
              form="form-parametres"
              formNoValidate
              icon={<Save size={15} />}
              loading={save.isPending}
              data-cy="btn-enregistrer-configuration"
            >
              Enregistrer
            </Button>
          ) : null
        }
      />

      <div
        className="segmented settings-page-tabs"
        role="tablist"
        aria-label="Sections de la configuration"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "entreprise"}
          onClick={() => setTab("entreprise")}
          className={cn(
            "segmented-item settings-page-tab",
            tab === "entreprise" && "segmented-item-active",
          )}
          data-cy="onglet-entreprise"
        >
          Entreprise
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "quittances"}
          onClick={() => setTab("quittances")}
          className={cn(
            "segmented-item settings-page-tab",
            tab === "quittances" && "segmented-item-active",
          )}
          data-cy="onglet-quittances"
        >
          Quittances
        </button>
      </div>

      {tab === "quittances" ? (
        <div className="settings-page-sections">
          <RentReceiptSettings />
          <SignaturesManager />
        </div>
      ) : settings.isError ? (
        <ErrorState
          message={errorMessage(settings.error)}
          onRetry={() => void settings.refetch()}
        />
      ) : settings.isPending ? (
        <LoadingState message="Chargement de la configuration…" />
      ) : (
        <>
          <form
            id="form-parametres"
            className="settings-page-form"
            onSubmit={handleSubmit((submittedValues) =>
              save.mutate(submittedValues),
            )}
            noValidate
          >
            <SettingsCompanySection register={register} errors={errors} />
            <SettingsHomeSection
              register={register}
              errors={errors}
              displayedProRata={displayedProRata}
            />
            <SettingsSaveBar
              errorText={save.isError ? errorMessage(save.error) : null}
              isDirty={isDirty}
              isPending={save.isPending}
            />
          </form>
          <ExpenseItemsManager
            defaultProRata={settings.data?.proRataBase ?? "100.00"}
          />
        </>
      )}
    </>
  );
}
