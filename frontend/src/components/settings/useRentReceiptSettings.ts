import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useLandlords, useLeases, useTenants } from "@/api/queries";
import type { LandlordDto, LeaseDto, TenantDto } from "@/api/types";
import { toast } from "@/state/toasts";

/** Directory state and logical-deletion mutations of the rent settings. */
export function useRentReceiptSettings() {
  const queryClient = useQueryClient();
  const landlords = useLandlords();
  const tenants = useTenants();
  const leases = useLeases();

  const [landlordForm, setLandlordForm] = useState<LandlordDto | null | "new">(
    null,
  );
  const [tenantForm, setTenantForm] = useState<TenantDto | null | "new">(null);
  const [leaseForm, setLeaseForm] = useState<LeaseDto | null | "new">(null);
  const [landlordToDelete, setLandlordToDelete] = useState<LandlordDto | null>(
    null,
  );
  const [tenantToDelete, setTenantToDelete] = useState<TenantDto | null>(null);
  const [leaseToDelete, setLeaseToDelete] = useState<LeaseDto | null>(null);

  const landlordList = landlords.data ?? [];
  const tenantList = tenants.data ?? [];
  const leaseList = leases.data ?? [];

  const removeLandlord = useMutation({
    mutationFn: (landlord: LandlordDto) =>
      api.landlords.delete(landlord.id as number),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.landlords });
      setLandlordToDelete(null);
      toast.success("Bailleur supprimé.");
    },
    onError: (error) => {
      setLandlordToDelete(null);
      toast.error(errorMessage(error));
    },
  });

  const removeTenant = useMutation({
    mutationFn: (tenant: TenantDto) =>
      api.tenants.delete(tenant.id as number),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenants });
      setTenantToDelete(null);
      toast.success("Locataire supprimé.");
    },
    onError: (error) => {
      setTenantToDelete(null);
      toast.error(errorMessage(error));
    },
  });

  const removeLease = useMutation({
    mutationFn: (lease: LeaseDto) => api.leases.delete(lease.id as number),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      setLeaseToDelete(null);
      toast.success("Bail supprimé.");
    },
    onError: (error) => {
      setLeaseToDelete(null);
      toast.error(errorMessage(error));
    },
  });

  return {
    landlords,
    tenants,
    leases,
    landlordList,
    tenantList,
    leaseList,
    landlordForm,
    setLandlordForm,
    tenantForm,
    setTenantForm,
    leaseForm,
    setLeaseForm,
    landlordToDelete,
    setLandlordToDelete,
    tenantToDelete,
    setTenantToDelete,
    leaseToDelete,
    setLeaseToDelete,
    removeLandlord,
    removeTenant,
    removeLease,
  };
}

export type RentReceiptSettingsController = ReturnType<
  typeof useRentReceiptSettings
>;
