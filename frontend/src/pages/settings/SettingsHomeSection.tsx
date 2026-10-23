import { Home } from "lucide-react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import { formatPercentage } from "@/lib/format";
import type { SettingsFormValues } from "@/lib/validation";
import { SettingsCardSection } from "./SettingsCardSection";

/** Home address, areas and the indicative professional pro rata. */
export function SettingsHomeSection({
  register,
  errors,
  displayedProRata,
}: {
  register: UseFormRegister<SettingsFormValues>;
  errors: FieldErrors<SettingsFormValues>;
  displayedProRata: number | null;
}) {
  return (
    <SettingsCardSection
      icon={Home}
      title="Logement et quote-part professionnelle"
      description="La surface professionnelle divisée par la surface totale fixe le prorata de référence."
      bodyClassName="card-body grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <FieldGroup
        id="param-logement-adresse"
        label="Adresse du logement"
        error={errors.homeAddress?.message}
        className="sm:col-span-2 lg:col-span-4"
      >
        <textarea
          id="param-logement-adresse"
          rows={2}
          className={cn(
            "field resize-y",
            errors.homeAddress && "field-error",
          )}
          {...register("homeAddress")}
          data-cy="input-logement-adresse"
        />
      </FieldGroup>
      <FieldGroup
        id="param-surface-totale"
        label="Surface totale (m²)"
        error={errors.totalArea?.message}
      >
        <input
          id="param-surface-totale"
          className={cn("field", errors.totalArea && "field-error")}
          inputMode="decimal"
          placeholder="70,00"
          {...register("totalArea")}
          data-cy="input-surface-totale"
        />
      </FieldGroup>
      <FieldGroup
        id="param-surface-pro"
        label="Surface professionnelle (m²)"
        error={errors.businessArea?.message}
      >
        <input
          id="param-surface-pro"
          className={cn("field", errors.businessArea && "field-error")}
          inputMode="decimal"
          placeholder="25,00"
          {...register("businessArea")}
          data-cy="input-surface-pro"
        />
      </FieldGroup>
      <FieldGroup
        id="param-lieu"
        label="Lieu d’émission"
        error={errors.issuePlace?.message}
      >
        <input
          id="param-lieu"
          className={cn("field", errors.issuePlace && "field-error")}
          placeholder="Paris"
          {...register("issuePlace")}
          data-cy="input-lieu-emission"
        />
      </FieldGroup>
      <div className="flex flex-col justify-center rounded-xl border border-accent/15 bg-accent-soft/45 px-4 py-3">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-accent">
          Prorata indicatif
        </p>
        <p
          className="mt-1 font-display text-2xl text-accent-strong"
          data-cy="prorata-indicatif"
        >
          {displayedProRata === null
            ? "—"
            : formatPercentage(displayedProRata)}
        </p>
        <p className="text-[10.5px] text-ink-soft">
          Calculé et arrondi côté backend à l’enregistrement.
        </p>
      </div>
    </SettingsCardSection>
  );
}
