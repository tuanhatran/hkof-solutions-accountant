import type { AgencyRequest, PersonRequest } from "@/api/types";
import {
  fullName,
  sirenOf,
  siretOf,
  type ProfileValues,
} from "./useOnboardingState";

export function personRequest(values: ProfileValues): PersonRequest {
  return {
    name: fullName(values.firstName, values.lastName),
    address: values.address.trim() || null,
    phone: values.phone.trim() || null,
    addressNote: values.addressNote.trim() || null,
    issuePlace: null,
  };
}

export function agencyRequest(values: ProfileValues): AgencyRequest {
  return {
    name: values.agencyName.trim(),
    isPersonal: values.isPersonalAgency,
    managerName: fullName(values.firstName, values.lastName),
    legalForm: values.isPersonalAgency ? null : values.legalForm.trim() || null,
    siren: values.isPersonalAgency ? null : sirenOf(values.sirenSiret) || null,
    siret: values.isPersonalAgency ? null : siretOf(values.sirenSiret),
    address: values.isPersonalAgency
      ? null
      : values.agencyAddress.trim() || null,
  };
}
