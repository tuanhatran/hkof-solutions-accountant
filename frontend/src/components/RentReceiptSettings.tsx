import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Home,
  Landmark,
  PencilLine,
  Plus,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import {
  queryKeys,
  useLandlords,
  useLeases,
  useTenants,
} from "@/api/queries";
import type {
  LandlordDto,
  LandlordRequest,
  LeaseDto,
  LeaseRequest,
  TenantDto,
  TenantRequest,
} from "@/api/types";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FieldGroup } from "@/components/FieldGroup";
import { ErrorState, LoadingState } from "@/components/States";
import { cn } from "@/lib/cn";
import { formatEUR, parseAmount } from "@/lib/format";
import {
  leaseSchema,
  landlordSchema,
  tenantSchema,
  type LeaseFormValues,
  type LandlordFormValues,
  type TenantFormValues,
} from "@/lib/validation";
import { toast } from "@/state/toasts";

function decimalFormatter(value: string | undefined): string {
  return value ? value.replace(".", ",") : "";
}

function cents(value: string): number {
  const normalized = parseAmount(value);
  return normalized === null ? 0 : Math.round(Number(normalized) * 100);
}

function SectionHeader({
  icon: IconComponent,
  title,
  description,
  action,
}: {
  icon: typeof Landmark;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="card-header">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
          <IconComponent size={17} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl text-ink">{title}</h2>
          <p className="mt-0.5 text-xs text-ink-soft">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ text, dataCy }: { text: string; dataCy: string }) {
  return (
    <p
      className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-soft"
      data-cy={dataCy}
    >
      {text}
    </p>
  );
}

function LandlordForm({
  item,
  onClose,
}: {
  item: LandlordDto | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LandlordFormValues>({
    resolver: zodResolver(landlordSchema),
    mode: "onChange",
    defaultValues: {
      name: item?.name ?? "",
      address: item?.address ?? "",
    },
  });

  const save = useMutation({
    mutationFn: (values: LandlordFormValues) => {
      const requestBody: LandlordRequest = {
        name: values.name.trim(),
        address: values.address.trim(),
      };
      return item?.id
        ? api.landlords.update(item.id, requestBody)
        : api.landlords.create(requestBody);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.landlords });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      toast.success(
        item
          ? `Bailleur « ${result.name ?? ""} » mis à jour.`
          : `Bailleur « ${result.name ?? ""} » ajouté.`,
      );
      onClose();
    },
    onError: (error) => setRequestError(errorMessage(error)),
  });

  return (
    <form
      className="rounded-xl border border-accent/20 bg-accent-soft/25 p-4"
      onSubmit={handleSubmit((values) => {
        setRequestError(null);
        save.mutate(values);
      })}
      data-cy="formulaire-bailleur"
    >
      <h3 className="text-[15px] font-semibold text-ink">
        {item ? `Modifier le bailleur « ${item.name ?? ""} »` : "Ajouter un bailleur"}
      </h3>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FieldGroup
          id="bailleur-nom"
          label="Nom du bailleur"
          error={errors.name?.message}
        >
          <input
            id="bailleur-nom"
            className={cn("field", errors.name && "field-error")}
            placeholder="M. Dupont"
            {...register("name")}
            data-cy="input-bailleur-nom"
          />
        </FieldGroup>
        <FieldGroup
          id="bailleur-adresse"
          label="Adresse du bailleur"
          error={errors.address?.message}
        >
          <input
            id="bailleur-adresse"
            className="field"
            placeholder="1 avenue du Parc, 75011 Paris"
            {...register("address")}
            data-cy="input-bailleur-adresse"
          />
        </FieldGroup>
      </div>

      {requestError ? (
        <p
          className="mt-3 rounded-lg border border-danger/20 bg-danger-soft/60 p-2.5 text-xs text-danger"
          role="alert"
        >
          {requestError}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" small onClick={onClose} disabled={save.isPending}>
          Annuler
        </Button>
        <Button
          variant="primary"
          small
          type="submit"
          loading={save.isPending}
          icon={<Check size={14} />}
          data-cy="btn-enregistrer-bailleur"
        >
          {item ? "Enregistrer le bailleur" : "Ajouter le bailleur"}
        </Button>
      </div>
    </form>
  );
}

function TenantForm({
  item,
  onClose,
}: {
  item: TenantDto | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    mode: "onChange",
    defaultValues: {
      name: item?.name ?? "",
      address: item?.address ?? "",
    },
  });

  const save = useMutation({
    mutationFn: (values: TenantFormValues) => {
      const requestBody: TenantRequest = {
        name: values.name.trim(),
        address: values.address.trim(),
      };
      return item?.id
        ? api.tenants.update(item.id, requestBody)
        : api.tenants.create(requestBody);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenants });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      toast.success(
        item
          ? `Locataire « ${result.name ?? ""} » mis à jour.`
          : `Locataire « ${result.name ?? ""} » ajouté.`,
      );
      onClose();
    },
    onError: (error) => setRequestError(errorMessage(error)),
  });

  return (
    <form
      className="rounded-xl border border-accent/20 bg-accent-soft/25 p-4"
      onSubmit={handleSubmit((values) => {
        setRequestError(null);
        save.mutate(values);
      })}
      data-cy="formulaire-locataire"
    >
      <h3 className="text-[15px] font-semibold text-ink">
        {item
          ? `Modifier le locataire « ${item.name ?? ""} »`
          : "Ajouter un locataire"}
      </h3>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FieldGroup
          id="locataire-nom"
          label="Nom du locataire"
          error={errors.name?.message}
        >
          <input
            id="locataire-nom"
            className={cn("field", errors.name && "field-error")}
            placeholder="Mme Martin"
            {...register("name")}
            data-cy="input-locataire-nom"
          />
        </FieldGroup>
        <FieldGroup
          id="locataire-adresse"
          label="Adresse du locataire"
          error={errors.address?.message}
        >
          <input
            id="locataire-adresse"
            className="field"
            placeholder="12 rue de la République, 75000 Paris"
            {...register("address")}
            data-cy="input-locataire-adresse"
          />
        </FieldGroup>
      </div>

      {requestError ? (
        <p
          className="mt-3 rounded-lg border border-danger/20 bg-danger-soft/60 p-2.5 text-xs text-danger"
          role="alert"
        >
          {requestError}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" small onClick={onClose} disabled={save.isPending}>
          Annuler
        </Button>
        <Button
          variant="primary"
          small
          type="submit"
          loading={save.isPending}
          icon={<Check size={14} />}
          data-cy="btn-enregistrer-locataire"
        >
          {item ? "Enregistrer le locataire" : "Ajouter le locataire"}
        </Button>
      </div>
    </form>
  );
}

function LeaseForm({
  item,
  landlords,
  tenants,
  onClose,
}: {
  item: LeaseDto | null;
  landlords: LandlordDto[];
  tenants: TenantDto[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LeaseFormValues>({
    resolver: zodResolver(leaseSchema),
    mode: "onChange",
    defaultValues: {
      landlordId:
        item?.landlordId === undefined ? "" : String(item.landlordId),
      tenantId: item?.tenantId === undefined ? "" : String(item.tenantId),
      propertyAddress: item?.propertyAddress ?? "",
      rentExclCharges: decimalFormatter(item?.rentExclCharges),
      charges: decimalFormatter(item?.charges),
    },
  });

  const rent = watch("rentExclCharges");
  const charges = watch("charges");
  const total = formatEUR((cents(rent) + cents(charges)) / 100);

  const save = useMutation({
    mutationFn: (values: LeaseFormValues) => {
      const requestBody: LeaseRequest = {
        landlordId: Number(values.landlordId),
        tenantId: Number(values.tenantId),
        propertyAddress: values.propertyAddress.trim(),
        rentExclCharges: parseAmount(values.rentExclCharges) ?? "0.00",
        charges: parseAmount(values.charges) ?? "0.00",
      };
      return item?.id
        ? api.leases.update(item.id, requestBody)
        : api.leases.create(requestBody);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      toast.success(item ? "Bail mis à jour." : "Bail ajouté.");
      onClose();
    },
    onError: (error) => setRequestError(errorMessage(error)),
  });

  return (
    <form
      className="rounded-xl border border-accent/20 bg-accent-soft/25 p-4"
      onSubmit={handleSubmit((values) => {
        setRequestError(null);
        save.mutate(values);
      })}
      data-cy="formulaire-bail"
    >
      <h3 className="text-[15px] font-semibold text-ink">
        {item ? "Modifier le bail" : "Ajouter un bail"}
      </h3>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FieldGroup
          id="bail-bailleur"
          label="Bailleur du bail"
          error={errors.landlordId?.message}
        >
          <select
            id="bail-bailleur"
            className={cn("field", errors.landlordId && "field-error")}
            {...register("landlordId")}
            data-cy="select-bail-bailleur"
          >
            <option value="">Sélectionnez un bailleur</option>
            {landlords.map((landlord) => (
              <option key={landlord.id} value={landlord.id}>
                {landlord.name}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup
          id="bail-locataire"
          label="Locataire du bail"
          error={errors.tenantId?.message}
        >
          <select
            id="bail-locataire"
            className={cn("field", errors.tenantId && "field-error")}
            {...register("tenantId")}
            data-cy="select-bail-locataire"
          >
            <option value="">Sélectionnez un locataire</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup
          id="bail-adresse"
          label="Adresse du bien"
          error={errors.propertyAddress?.message}
          className="sm:col-span-2"
        >
          <input
            id="bail-adresse"
            className={cn(
              "field",
              errors.propertyAddress && "field-error",
            )}
            placeholder="12 rue de la République, 75000 Paris"
            {...register("propertyAddress")}
            data-cy="input-bail-adresse"
          />
        </FieldGroup>
        <FieldGroup
          id="bail-loyer"
          label="Loyer hors charges (€)"
          error={errors.rentExclCharges?.message}
        >
          <input
            id="bail-loyer"
            inputMode="decimal"
            className={cn(
              "field",
              errors.rentExclCharges && "field-error",
            )}
            placeholder="900,00"
            {...register("rentExclCharges")}
            data-cy="input-bail-loyer"
          />
        </FieldGroup>
        <FieldGroup
          id="bail-charges"
          label="Provision pour charges (€)"
          error={errors.charges?.message}
        >
          <input
            id="bail-charges"
            inputMode="decimal"
            className={cn("field", errors.charges && "field-error")}
            placeholder="50,00"
            {...register("charges")}
            data-cy="input-bail-charges"
          />
        </FieldGroup>
        <div className="flex flex-col justify-center rounded-xl border border-line bg-paper/45 px-4 py-3 sm:col-span-2">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
            Total quittance
          </p>
          <p
            className="mt-1 font-display text-2xl text-ink"
            data-cy="total-quittance-config"
          >
            {total}
          </p>
          <p className="text-[10.5px] text-ink-soft">
            Indicatif : loyer + provision. Le total de la quittance est calculé
            par le backend.
          </p>
        </div>
      </div>

      {requestError ? (
        <p
          className="mt-3 rounded-lg border border-danger/20 bg-danger-soft/60 p-2.5 text-xs text-danger"
          role="alert"
        >
          {requestError}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" small onClick={onClose} disabled={save.isPending}>
          Annuler
        </Button>
        <Button
          variant="primary"
          small
          type="submit"
          loading={save.isPending}
          icon={<Check size={14} />}
          data-cy="btn-enregistrer-bail"
        >
          {item ? "Enregistrer le bail" : "Ajouter le bail"}
        </Button>
      </div>
    </form>
  );
}

export function RentReceiptSettings() {
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

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <SectionHeader
          icon={Landmark}
          title="Bailleurs"
          description="Propriétaires des logements, crédités dans les quittances."
          action={
            <Button
              variant="primary"
              small
              icon={<Plus size={14} />}
              onClick={() => setLandlordForm("new")}
              disabled={landlordForm === "new"}
              data-cy="btn-ajouter-bailleur"
            >
              Ajouter un bailleur
            </Button>
          }
        />
        <div className="card-body space-y-4">
          {landlordForm !== null ? (
            <LandlordForm
              key={landlordForm === "new" ? "new" : landlordForm.id}
              item={landlordForm === "new" ? null : landlordForm}
              onClose={() => setLandlordForm(null)}
            />
          ) : null}

          {landlords.isError ? (
            <ErrorState
              message={errorMessage(landlords.error)}
              onRetry={() => void landlords.refetch()}
            />
          ) : landlords.isPending ? (
            <LoadingState message="Chargement des bailleurs…" />
          ) : landlordList.length === 0 ? (
            <EmptyState
              text="Aucun bailleur configuré. Ajoutez le propriétaire du logement."
              dataCy="aucun-bailleur"
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {landlordList.map((landlord) => (
                <li
                  key={landlord.id}
                  className="flex items-start gap-3 rounded-xl border border-line bg-paper/40 p-3"
                  data-cy={`bailleur-${landlord.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {landlord.name ?? "Bailleur"}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {landlord.address || "Adresse non renseignée"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    small
                    icon={<PencilLine size={13} />}
                    onClick={() => setLandlordForm(landlord)}
                    aria-label={`Modifier ${landlord.name ?? "le bailleur"}`}
                    data-cy={`btn-modifier-bailleur-${landlord.id}`}
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="ghost"
                    small
                    icon={<Trash2 size={13} />}
                    className="text-danger hover:bg-danger-soft"
                    onClick={() => setLandlordToDelete(landlord)}
                    aria-label={`Supprimer ${landlord.name ?? "le bailleur"}`}
                    data-cy={`btn-supprimer-bailleur-${landlord.id}`}
                  >
                    Retirer
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card overflow-hidden">
        <SectionHeader
          icon={UsersRound}
          title="Locataires"
          description="Occupants des logements, débiteurs des quittances."
          action={
            <Button
              variant="primary"
              small
              icon={<Plus size={14} />}
              onClick={() => setTenantForm("new")}
              disabled={tenantForm === "new"}
              data-cy="btn-ajouter-locataire"
            >
              Ajouter un locataire
            </Button>
          }
        />
        <div className="card-body space-y-4">
          {tenantForm !== null ? (
            <TenantForm
              key={tenantForm === "new" ? "new" : tenantForm.id}
              item={tenantForm === "new" ? null : tenantForm}
              onClose={() => setTenantForm(null)}
            />
          ) : null}

          {tenants.isError ? (
            <ErrorState
              message={errorMessage(tenants.error)}
              onRetry={() => void tenants.refetch()}
            />
          ) : tenants.isPending ? (
            <LoadingState message="Chargement des locataires…" />
          ) : tenantList.length === 0 ? (
            <EmptyState
              text="Aucun locataire configuré. Ajoutez l’occupant du logement."
              dataCy="aucun-locataire"
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {tenantList.map((tenant) => (
                <li
                  key={tenant.id}
                  className="flex items-start gap-3 rounded-xl border border-line bg-paper/40 p-3"
                  data-cy={`locataire-${tenant.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {tenant.name ?? "Locataire"}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {tenant.address || "Adresse non renseignée"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    small
                    icon={<PencilLine size={13} />}
                    onClick={() => setTenantForm(tenant)}
                    aria-label={`Modifier ${tenant.name ?? "le locataire"}`}
                    data-cy={`btn-modifier-locataire-${tenant.id}`}
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="ghost"
                    small
                    icon={<Trash2 size={13} />}
                    className="text-danger hover:bg-danger-soft"
                    onClick={() => setTenantToDelete(tenant)}
                    aria-label={`Supprimer ${tenant.name ?? "le locataire"}`}
                    data-cy={`btn-supprimer-locataire-${tenant.id}`}
                  >
                    Retirer
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card overflow-hidden">
        <SectionHeader
          icon={Home}
          title="Baux"
          description="Un bail actif par couple bailleur + locataire. Il fixe l’adresse du bien, le loyer et les charges."
          action={
            <Button
              variant="primary"
              small
              icon={<Plus size={14} />}
              onClick={() => setLeaseForm("new")}
              disabled={leaseForm === "new"}
              data-cy="btn-ajouter-bail"
            >
              Ajouter un bail
            </Button>
          }
        />
        <div className="card-body space-y-4">
          {leaseForm !== null ? (
            <LeaseForm
              key={leaseForm === "new" ? "new" : leaseForm.id}
              item={leaseForm === "new" ? null : leaseForm}
              landlords={landlordList}
              tenants={tenantList}
              onClose={() => setLeaseForm(null)}
            />
          ) : null}

          {leases.isError ? (
            <ErrorState
              message={errorMessage(leases.error)}
              onRetry={() => void leases.refetch()}
            />
          ) : leases.isPending ? (
            <LoadingState message="Chargement des baux…" />
          ) : leaseList.length === 0 ? (
            <EmptyState
              text="Aucun bail configuré. Ajoutez un bail pour générer des quittances."
              dataCy="aucun-bail"
            />
          ) : (
            <ul className="space-y-3">
              {leaseList.map((lease) => (
                <li
                  key={lease.id}
                  className="flex flex-wrap items-start gap-3 rounded-xl border border-line bg-paper/40 p-3"
                  data-cy={`bail-${lease.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {lease.landlordName} → {lease.tenantName}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {lease.propertyAddress}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      Loyer {formatEUR(lease.rentExclCharges ?? "0.00")} ·
                      charges {formatEUR(lease.charges ?? "0.00")} · total{" "}
                      <span
                        className="font-semibold text-ink"
                        data-cy={`total-bail-${lease.id}`}
                      >
                        {formatEUR(
                          Number(lease.rentExclCharges ?? 0) +
                            Number(lease.charges ?? 0),
                        )}
                      </span>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    small
                    icon={<PencilLine size={13} />}
                    onClick={() => setLeaseForm(lease)}
                    aria-label={`Modifier le bail ${lease.id}`}
                    data-cy={`btn-modifier-bail-${lease.id}`}
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="ghost"
                    small
                    icon={<Trash2 size={13} />}
                    className="text-danger hover:bg-danger-soft"
                    onClick={() => setLeaseToDelete(lease)}
                    aria-label={`Supprimer le bail ${lease.id}`}
                    data-cy={`btn-supprimer-bail-${lease.id}`}
                  >
                    Retirer
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={landlordToDelete !== null}
        title="Supprimer ce bailleur ?"
        message={
          landlordToDelete
            ? `« ${landlordToDelete.name ?? "Ce bailleur"} » ne sera plus proposé. Un bailleur utilisé par un bail actif ne peut pas être supprimé.`
            : ""
        }
        confirmLabel="Supprimer le bailleur"
        variant="danger"
        onConfirm={() => {
          if (landlordToDelete) {
            removeLandlord.mutate(landlordToDelete);
          }
        }}
        onCancel={() => setLandlordToDelete(null)}
        dataCy="dialogue-supprimer-bailleur"
      />

      <ConfirmDialog
        open={tenantToDelete !== null}
        title="Supprimer ce locataire ?"
        message={
          tenantToDelete
            ? `« ${tenantToDelete.name ?? "Ce locataire"} » ne sera plus proposé. Un locataire utilisé par un bail actif ne peut pas être supprimé.`
            : ""
        }
        confirmLabel="Supprimer le locataire"
        variant="danger"
        onConfirm={() => {
          if (tenantToDelete) {
            removeTenant.mutate(tenantToDelete);
          }
        }}
        onCancel={() => setTenantToDelete(null)}
        dataCy="dialogue-supprimer-locataire"
      />

      <ConfirmDialog
        open={leaseToDelete !== null}
        title="Supprimer ce bail ?"
        message={
          leaseToDelete
            ? `Le bail de « ${leaseToDelete.tenantName ?? "ce locataire"} » ne sera plus proposé lors de la génération. Les quittances existantes restent inchangées.`
            : ""
        }
        confirmLabel="Supprimer le bail"
        variant="danger"
        onConfirm={() => {
          if (leaseToDelete) {
            removeLease.mutate(leaseToDelete);
          }
        }}
        onCancel={() => setLeaseToDelete(null)}
        dataCy="dialogue-supprimer-bail"
      />
    </div>
  );
}
