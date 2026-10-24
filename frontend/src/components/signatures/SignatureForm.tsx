import "./SignatureForm.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useEmployees, useLandlords } from "@/api/queries";
import type { SignatureType } from "@/api/types";
import { FormModal } from "@/components/ui/FormModal";
import { toast } from "@/state/toasts";
import { SignatureFormFields } from "./SignatureFormFields";
import { SignatureImageField } from "./SignatureImageField";
import {
  SIGNATURE_UPLOAD_TYPES,
  signatureImageError,
} from "./signatureConstants";

/** Upload form creating a landlord or employee signature image. */
export function SignatureForm({
  companyId,
  onClose,
}: {
  companyId: number | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const landlords = useLandlords();
  const employees = useEmployees(companyId);
  const [type, setType] = useState<SignatureType>("LANDLORD");
  const [name, setName] = useState("");
  const [landlordId, setLandlordId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [fileErrorText, setFileErrorText] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const landlordRows = landlords.data ?? [];
  const employeeRows = employees.data ?? [];
  const availableTypes =
    companyId !== null && employeeRows.length > 0
      ? SIGNATURE_UPLOAD_TYPES
      : SIGNATURE_UPLOAD_TYPES.filter(
          (candidate) => candidate.value === "LANDLORD",
        );

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const create = useMutation({
    mutationFn: (input: {
      type: SignatureType;
      name: string;
      file: File;
      landlordId: number | null;
      employeeId: number | null;
    }) =>
      api.signatures.create(
        input.type,
        input.name,
        input.file,
        input.landlordId,
        input.employeeId,
      ),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.signaturesAll,
      });
      toast.success(`Signature « ${created.name ?? name} » ajoutée.`);
      onClose();
    },
    onError: (error) => setRequestError(errorMessage(error)),
  });

  function selectFile(candidate: File) {
    const rejected = signatureImageError(candidate);
    if (rejected) {
      setFileErrorText(rejected);
      setFile(null);
      return;
    }
    setFileErrorText(null);
    setFile(candidate);
  }

  function submit() {
    setRequestError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Le nom de la signature est obligatoire.");
      return;
    }
    setNameError(null);
    if (!file) {
      setFileErrorText("Sélectionnez une image PNG ou JPEG.");
      return;
    }
    setFileErrorText(null);
    if (type === "LANDLORD" && !landlordId) {
      setOwnerError("Le bailleur de la signature est obligatoire.");
      return;
    }
    if (type === "EMPLOYEE" && !employeeId) {
      setOwnerError("Le salarié de la signature est obligatoire.");
      return;
    }
    setOwnerError(null);
    create.mutate({
      type,
      name: trimmedName,
      file,
      landlordId: type === "LANDLORD" ? Number(landlordId) : null,
      employeeId: type === "EMPLOYEE" ? Number(employeeId) : null,
    });
  }

  return (
    <FormModal
      open
      title="Ajouter une signature"
      onClose={onClose}
      onSubmit={submit}
      formDataCy="formulaire-signature"
      submitDataCy="btn-enregistrer-signature"
      formClassName="signature-form"
      pending={create.isPending}
      error={requestError}
    >
      <SignatureFormFields
        type={type}
        onTypeChange={setType}
        availableTypes={availableTypes}
        name={name}
        onNameChange={setName}
        nameError={nameError}
        landlordId={landlordId}
        onLandlordChange={setLandlordId}
        employeeId={employeeId}
        onEmployeeChange={setEmployeeId}
        ownerError={ownerError}
        landlords={landlordRows}
        employees={employeeRows}
        landlordsPending={landlords.isPending}
        employeesPending={employees.isPending}
      />
      <SignatureImageField
        file={file}
        previewUrl={previewUrl}
        fileErrorText={fileErrorText}
        pending={create.isPending}
        onFile={selectFile}
        onRemove={() => {
          setFile(null);
          setFileErrorText(null);
        }}
      />
    </FormModal>
  );
}
