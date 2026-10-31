import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCompanyOnboardingDraft,
  getCompanyOnboardingStorageKey,
  loadCompanyOnboardingDraft,
  saveCompanyOnboardingDraft,
} from "./useCompanyOnboardingPersistence";
import {
  COMPANY_ONBOARDING_STEP_KEYS,
  EMPTY_COMPANY_ONBOARDING_DRAFT,
  companyManagerEmployee,
  useCompanyOnboardingState,
} from "./useCompanyOnboardingState";

const EMAIL = "societe@exemple.fr";

beforeEach(() => {
  localStorage.clear();
});

describe("useCompanyOnboardingState", () => {
  it("walks the five company steps and never goes out of range", () => {
    const { result } = renderHook(() => useCompanyOnboardingState());

    expect(COMPANY_ONBOARDING_STEP_KEYS).toHaveLength(5);
    expect(result.current.step).toBe(0);

    act(() => result.current.back());
    expect(result.current.step).toBe(0);

    for (
      let index = 1;
      index < COMPANY_ONBOARDING_STEP_KEYS.length;
      index += 1
    ) {
      act(() => result.current.next());
      expect(result.current.step).toBe(index);
    }

    act(() => result.current.next());
    expect(result.current.step).toBe(4);
  });

  it("keeps the identity, lease, expenses and employees in the draft", () => {
    const { result } = renderHook(() => useCompanyOnboardingState());

    act(() =>
      result.current.updateIdentity({
        ...EMPTY_COMPANY_ONBOARDING_DRAFT.identity,
        name: "HKOF",
        managerName: "Alice Martin",
      }),
    );
    expect(result.current.draft.identity.name).toBe("HKOF");
    expect(result.current.draft.employees).toHaveLength(1);
    expect(result.current.draft.employees[0]).toMatchObject({
      firstName: "Alice",
      lastName: "Martin",
      title: "CEO",
    });

    act(() =>
      result.current.updateLease({
        ...EMPTY_COMPANY_ONBOARDING_DRAFT.lease,
        propertyAddress: "10 rue de la Paix, 75002 Paris",
      }),
    );
    expect(result.current.draft.lease.propertyAddress).toBe(
      "10 rue de la Paix, 75002 Paris",
    );

    act(() =>
      result.current.updateExpenses([
        {
          code: "loyer",
          label: "Loyer",
          selected: true,
          proRataPct: "50",
          periodicity: "MONTHLY",
        },
      ]),
    );
    expect(result.current.draft.expenses).toHaveLength(1);

    act(() =>
      result.current.updateEmployees([
        ...result.current.draft.employees,
        {
          firstName: "Bob",
          lastName: "Durand",
          email: "",
          address: "",
          title: "EMPLOYEE",
          issuePlace: "",
        },
      ]),
    );
    expect(result.current.draft.employees).toHaveLength(2);
  });

  it("does not overwrite an edited manager row when the identity changes again", () => {
    const { result } = renderHook(() => useCompanyOnboardingState());

    act(() =>
      result.current.updateIdentity({
        ...EMPTY_COMPANY_ONBOARDING_DRAFT.identity,
        name: "HKOF",
        managerName: "Alice Martin",
      }),
    );
    act(() =>
      result.current.updateEmployees([
        { ...result.current.draft.employees[0]!, firstName: "Alicia" },
      ]),
    );
    act(() =>
      result.current.updateIdentity({
        ...result.current.draft.identity,
        managerName: "Bob Durand",
      }),
    );

    expect(result.current.draft.employees[0]?.firstName).toBe("Alicia");
  });

  it("merges created ids so a retried finalize can skip existing rows", () => {
    const { result } = renderHook(() => useCompanyOnboardingState());

    act(() =>
      result.current.markCreated({
        landlordId: 3,
        expenseCodes: ["loyer"],
        employeeKeys: ["alice martin"],
      }),
    );
    act(() =>
      result.current.markCreated({
        companyId: 5,
        expenseCodes: ["loyer", "gaz"],
      }),
    );

    expect(result.current.created).toEqual({
      landlordId: 3,
      companyId: 5,
      expenseCodes: ["loyer", "gaz"],
      employeeKeys: ["alice martin"],
    });
  });

  it("derives a CEO employee row from the manager name", () => {
    expect(companyManagerEmployee("Alice Martin")).toMatchObject({
      firstName: "Alice",
      lastName: "Martin",
      title: "CEO",
    });
    expect(companyManagerEmployee("  ")).toMatchObject({
      firstName: "",
      lastName: "",
      title: "CEO",
    });
  });
});

describe("company onboarding persistence", () => {
  it("round-trips the step, the draft and the created ids per account", () => {
    const state = {
      step: 2,
      draft: {
        ...EMPTY_COMPANY_ONBOARDING_DRAFT,
        identity: {
          ...EMPTY_COMPANY_ONBOARDING_DRAFT.identity,
          name: "HKOF",
        },
      },
      created: {
        landlordId: 3,
        companyId: 5,
        expenseCodes: ["loyer"],
        employeeKeys: ["alice martin"],
      },
    };

    saveCompanyOnboardingDraft(EMAIL, state);

    expect(getCompanyOnboardingStorageKey(EMAIL)).toBe(
      "homeofficeexpenses.company_onboarding.societe@exemple.fr",
    );
    expect(loadCompanyOnboardingDraft(EMAIL)).toEqual(state);
    expect(loadCompanyOnboardingDraft("other@exemple.fr")).toBeNull();

    clearCompanyOnboardingDraft(EMAIL);
    expect(loadCompanyOnboardingDraft(EMAIL)).toBeNull();
  });

  it("ignores a corrupted payload", () => {
    localStorage.setItem(getCompanyOnboardingStorageKey(EMAIL), "{not-json");
    expect(loadCompanyOnboardingDraft(EMAIL)).toBeNull();
  });
});
