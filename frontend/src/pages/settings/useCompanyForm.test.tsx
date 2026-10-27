import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type { CompanyDto } from "@/api/types";
import i18n from "@/i18n";
import type { CompanyFormValues } from "@/lib/validation";
import { useToasts } from "@/state/toasts";
import { useCompanyForm } from "./useCompanyForm";

vi.mock("@/api/endpoints", () => ({
  api: {
    companies: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const COMPANY: CompanyDto = {
  id: 1,
  name: "HKOF",
  legalForm: "EURL",
  siren: "123 456 789",
  address: "1 rue de la Paix, 75002 Paris",
  managerName: "Camille Martin",
  leaseId: 5,
  proRataBase: "35.71",
  issuePlace: "Paris",
};

const VALUES: CompanyFormValues = {
  name: "  HKOF 2  ",
  legalForm: "  SAS  ",
  siren: " 987 654 321 ",
  address: " 2 rue du Marché ",
  managerName: " Alex Durand ",
  leaseId: "",
  issuePlace: " Lyon ",
};

function setup(company: CompanyDto | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useCompanyForm(company), { wrapper });
  return { result, queryClient };
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

beforeEach(() => {
  vi.mocked(api.companies.create).mockReset();
  vi.mocked(api.companies.update).mockReset();
  useToasts.setState({ toasts: [] });
});

describe("useCompanyForm", () => {
  it("builds a trimmed CompanyRequest with leaseId null for an empty selection", async () => {
    vi.mocked(api.companies.update).mockResolvedValue(COMPANY);
    const { result } = setup(COMPANY);

    result.current.saveCompany(VALUES);

    await waitFor(() =>
      expect(api.companies.update).toHaveBeenCalledWith(1, {
        name: "HKOF 2",
        legalForm: "SAS",
        siren: "987 654 321",
        address: "2 rue du Marché",
        managerName: "Alex Durand",
        leaseId: null,
        issuePlace: "Lyon",
      }),
    );
  });

  it("creates a company, seeds companiesAll and toasts in French", async () => {
    vi.mocked(api.companies.create).mockResolvedValue(COMPANY);
    const { result, queryClient } = setup(null);

    result.current.saveCompany({ ...VALUES, name: "HKOF", leaseId: "5" });

    await waitFor(() =>
      expect(api.companies.create).toHaveBeenCalledWith({
        name: "HKOF",
        legalForm: "SAS",
        siren: "987 654 321",
        address: "2 rue du Marché",
        managerName: "Alex Durand",
        leaseId: 5,
        issuePlace: "Lyon",
      }),
    );
    await waitFor(() => expect(toastMessages()).toContain("Société créée."));
    expect(
      queryClient.getQueryData<CompanyDto[]>(queryKeys.companiesAll),
    ).toContain(COMPANY);
  });

  it("notifyCreated seeds a new company into the companiesAll cache", () => {
    const { result, queryClient } = setup(null);
    const other: CompanyDto = { id: 7, name: "Autre" };

    result.current.notifyCreated(other);

    expect(
      queryClient.getQueryData<CompanyDto[]>(queryKeys.companiesAll),
    ).toEqual([other]);

    // Idempotent: the same company is not added twice.
    result.current.notifyCreated(other);
    expect(
      queryClient.getQueryData<CompanyDto[]>(queryKeys.companiesAll),
    ).toEqual([other]);
  });

  it("updates a company, stores it under company(id) and toasts the update message", async () => {
    const updated = { ...COMPANY, name: "HKOF 2" };
    vi.mocked(api.companies.update).mockResolvedValue(updated);
    const { result, queryClient } = setup(COMPANY);
    queryClient.setQueryData(queryKeys.companiesAll, [COMPANY]);
    queryClient.setQueryData(queryKeys.leases, []);

    result.current.saveCompany({ ...VALUES, name: "HKOF 2", leaseId: "5" });

    await waitFor(() => expect(api.companies.update).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(toastMessages()).toContain(
        "Société enregistrée. Les prochains documents utiliseront ces valeurs.",
      ),
    );
    expect(queryClient.getQueryData(queryKeys.company(1))).toEqual(updated);
    expect(
      queryClient.getQueryState(queryKeys.companiesAll)?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(queryKeys.leases)?.isInvalidated).toBe(
      true,
    );
  });

  it("surfaces an API error through save.isError", async () => {
    vi.mocked(api.companies.create).mockRejectedValue(
      new Error("SIREN déjà utilisé."),
    );
    const { result } = setup(null);

    result.current.saveCompany(VALUES);

    await waitFor(() => expect(result.current.save.isError).toBe(true));
    expect(result.current.save.error?.message).toBe("SIREN déjà utilisé.");
  });

  it("toasts the create and update messages in English", async () => {
    await i18n.changeLanguage("en");
    vi.mocked(api.companies.create).mockResolvedValue(COMPANY);
    vi.mocked(api.companies.update).mockResolvedValue(COMPANY);
    const created = setup(null);
    const updated = setup(COMPANY);

    created.result.current.saveCompany({ ...VALUES, name: "HKOF" });
    await waitFor(() => expect(toastMessages()).toContain("Company created."));

    updated.result.current.saveCompany({ ...VALUES, name: "HKOF" });
    await waitFor(() =>
      expect(toastMessages()).toContain(
        "Company saved. Future documents will use these values.",
      ),
    );
  });
});
