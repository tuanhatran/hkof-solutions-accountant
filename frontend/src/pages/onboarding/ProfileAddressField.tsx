import { Controller, type Control } from "react-hook-form";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import type { ProfileFormInput, ProfileFormValues } from "./profileSchema";

interface ProfileAddressFieldProps {
  control: Control<ProfileFormInput, unknown, ProfileFormValues>;
  name: "address" | "agencyAddress";
  id: string;
  dataCy: string;
  hasError: boolean;
  placeholder?: string;
}

/** Street-address input with government address suggestions in the profile step. */
export function ProfileAddressField({
  control,
  name,
  id,
  dataCy,
  hasError,
  placeholder,
}: ProfileAddressFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <AddressAutocomplete
          id={id}
          value={field.value ?? ""}
          onChange={field.onChange}
          onBlur={field.onBlur}
          placeholder={placeholder}
          data-cy={dataCy}
          className={hasError ? "field-error" : undefined}
        />
      )}
    />
  );
}
