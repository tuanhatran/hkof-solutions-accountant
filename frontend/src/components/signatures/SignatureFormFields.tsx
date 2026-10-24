import { FieldGroup } from "@/components/ui/FieldGroup";
import { employeeTitleLabel } from "@/pages/settings/settingsValues";
import type { EmployeeDto, LandlordDto, SignatureType } from "@/api/types";
import { SIGNATURE_UPLOAD_TYPES } from "./signatureConstants";

interface SignatureFormFieldsProps {
  type: SignatureType;
  onTypeChange: (type: SignatureType) => void;
  availableTypes: typeof SIGNATURE_UPLOAD_TYPES;
  name: string;
  onNameChange: (name: string) => void;
  nameError: string | null;
  landlordId: string;
  onLandlordChange: (landlordId: string) => void;
  employeeId: string;
  onEmployeeChange: (employeeId: string) => void;
  ownerError: string | null;
  landlords: LandlordDto[];
  employees: EmployeeDto[];
  landlordsPending: boolean;
  employeesPending: boolean;
}

/** Type, name and owner fields of the signature upload form. */
export function SignatureFormFields({
  type,
  onTypeChange,
  availableTypes,
  name,
  onNameChange,
  nameError,
  landlordId,
  onLandlordChange,
  employeeId,
  onEmployeeChange,
  ownerError,
  landlords,
  employees,
  landlordsPending,
  employeesPending,
}: SignatureFormFieldsProps) {
  return (
    <>
      <div className="signature-form-grid">
        <FieldGroup
          id="signature-type"
          label="Type de signature"
          help="Le bailleur signe les quittances, le salarié signe les notes de frais."
        >
          <select
            id="signature-type"
            className="field"
            value={type}
            onChange={(event) => {
              const next = availableTypes.find(
                (candidate) => candidate.value === event.target.value,
              );
              if (next) {
                onTypeChange(next.value);
              }
            }}
            data-cy="select-type-signature"
          >
            {availableTypes.map((candidate) => (
              <option key={candidate.value} value={candidate.value}>
                {candidate.label}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup
          id="signature-nom"
          label="Nom"
          error={nameError ?? undefined}
          help="Affiché dans la liste déroulante des documents."
        >
          <input
            id="signature-nom"
            className={nameError ? "field field-error" : "field"}
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            maxLength={255}
            placeholder="Signature du bailleur"
            data-cy="input-signature-nom"
          />
        </FieldGroup>
      </div>

      {type === "LANDLORD" ? (
        <div className="signature-form-landlord">
          <FieldGroup
            id="signature-bailleur"
            label="Bailleur de la signature"
            error={ownerError ?? undefined}
            help="La signature n’est proposée que pour les quittances de ce bailleur."
          >
            <select
              id="signature-bailleur"
              className={ownerError ? "field field-error" : "field"}
              value={landlordId}
              onChange={(event) => onLandlordChange(event.target.value)}
              disabled={landlordsPending}
              data-cy="select-bailleur-signature"
            >
              <option value="">Sélectionnez un bailleur</option>
              {landlords.map((landlord) => (
                <option key={landlord.id} value={landlord.id}>
                  {landlord.name}
                </option>
              ))}
            </select>
          </FieldGroup>
        </div>
      ) : null}

      {type === "EMPLOYEE" ? (
        <div className="signature-form-landlord">
          <FieldGroup
            id="signature-salarie"
            label="Salarié de la signature"
            error={ownerError ?? undefined}
            help="La signature n’est proposée que pour les notes de frais de ce salarié."
          >
            <select
              id="signature-salarie"
              className={ownerError ? "field field-error" : "field"}
              value={employeeId}
              onChange={(event) => onEmployeeChange(event.target.value)}
              disabled={employeesPending}
              data-cy="select-salarie-signature"
            >
              <option value="">Sélectionnez un salarié</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} —{" "}
                  {employeeTitleLabel(employee.title)}
                </option>
              ))}
            </select>
          </FieldGroup>
        </div>
      ) : null}
    </>
  );
}
