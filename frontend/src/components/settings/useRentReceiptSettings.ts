import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import {
  queryKeys,
  useAddresses,
  useCompanies,
  useLeases,
  usePersons,
} from "@/api/queries";
import type { LeaseDto } from "@/api/types";
import { toast } from "@/state/toasts";

/** Lease directory state and logical-deletion mutation of the LMNP settings. */
export function useRentReceiptSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const persons = usePersons();
  const companies = useCompanies();
  const addresses = useAddresses();
  const leases = useLeases();

  const [leaseForm, setLeaseForm] = useState<LeaseDto | null | "new">(null);
  const [leaseToDelete, setLeaseToDelete] = useState<LeaseDto | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null,
  );

  const personList = persons.data ?? [];
  const companyList = companies.data ?? [];
  const addressList = addresses.data ?? [];
  // The first address is selected until the user picks another one.
  const activeAddressId = selectedAddressId ?? addressList[0]?.id ?? null;
  const leaseList = (leases.data ?? []).filter(
    (lease) => lease.addressId === activeAddressId,
  );

  const removeLease = useMutation({
    mutationFn: (lease: LeaseDto) => api.leases.delete(lease.id as number),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      setLeaseToDelete(null);
      toast.success(t("settings.lease.section.deleted"));
    },
    onError: (error) => {
      setLeaseToDelete(null);
      toast.error(errorMessage(error));
    },
  });

  function handleLeaseSaved(lease: LeaseDto) {
    if (lease.addressId !== undefined) {
      setSelectedAddressId(lease.addressId);
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.addresses });
  }

  return {
    persons,
    companies,
    addresses,
    leases,
    personList,
    companyList,
    addressList,
    leaseList,
    activeAddressId,
    selectAddress: setSelectedAddressId,
    handleLeaseSaved,
    leaseForm,
    setLeaseForm,
    leaseToDelete,
    setLeaseToDelete,
    removeLease,
  };
}

export type RentReceiptSettingsController = ReturnType<
  typeof useRentReceiptSettings
>;
