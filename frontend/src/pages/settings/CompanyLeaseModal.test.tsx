import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type { CompanyDto, LeaseDto } from "@/api/types";
import { useToasts } from "@/state/toasts";
import { CompanyLeaseModal } from "./CompanyLeaseModal";

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

const LEASE: LeaseDto = {
  id: 5,
  propertyAddress: "12 rue des Lilas, 75011 Paris",
  rentExclCharges: "900.00",
  charges: "50.00",
  totalArea: "70.00",
  businessArea: "25.00",
};

const OTHER_LEASE: LeaseDto = {
  id: 6,
  propertyAddress: "8 impasse des Acacias, 69003 Lyon",
  rentExclCharges: "700.00",
  charges: "0.00",
  totalArea: "40.00",
  businessArea: "10.00",
};

function renderModal(
  props: Partial<Parameters<typeof CompanyLeaseModal>[0]> = {},
) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(queryKeys.companiesAll, [COMPANY]);
  queryClient.setQueryData(queryKeys.leases, [LEASE, OTHER_LEASE]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  render(
    <CompanyLeaseModal
      open
      company={COMPANY}
      leases={[LEASE, OTHER_LEASE]}
      onClose={onClose}
      onSaved={onSaved}
      {...props}
    />,
    { wrapper },
  );
  return { onClose, onSaved, queryClient };
}

beforeEach(() => {
  vi.mocked(api.companies.update).mockReset();
  useToasts.setState({ toasts: [] });
});

describe("CompanyLeaseModal", () => {
  it("preselects the current lease and previews its indicative pro-rata", () => {
    renderModal();

    expect(screen.getByLabelText("Bail de la société")).toHaveValue("5");
    expect(
      document.querySelector('[data-cy="prorata-indicatif"]'),
    ).toHaveTextContent("35,71 %");

    expect(
      document.querySelector('[data-cy="dialogue-formulaire-bail-societe"]'),
    ).not.toBeNull();
  });

  it("updates the preview when another lease is chosen", async () => {
    renderModal();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Bail de la société"), "6");

    expect(
      document.querySelector('[data-cy="prorata-indicatif"]'),
    ).toHaveTextContent("25 %");
  });

  it("shows a dash when no lease is selected", async () => {
    renderModal({ company: { ...COMPANY, leaseId: null } });

    expect(screen.getByLabelText("Bail de la société")).toHaveValue("");
    expect(
      document.querySelector('[data-cy="prorata-indicatif"]'),
    ).toHaveTextContent("—");
  });

  it("saves only the leaseId, keeps the identity untouched and invalidates caches", async () => {
    const saved = { ...COMPANY, leaseId: 6 };
    vi.mocked(api.companies.update).mockResolvedValue(saved);
    const { onSaved, queryClient } = renderModal();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Bail de la société"), "6");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.companies.update).toHaveBeenCalledWith(1, {
        name: "HKOF",
        legalForm: "EURL",
        siren: "123 456 789",
        address: "1 rue de la Paix, 75002 Paris",
        managerName: "Camille Martin",
        leaseId: 6,
        issuePlace: "Paris",
      }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(
      queryClient.getQueryState(queryKeys.companiesAll)?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(queryKeys.leases)?.isInvalidated).toBe(
      true,
    );
  });

  it("sends leaseId null with the identity preserved for Aucun bail", async () => {
    vi.mocked(api.companies.update).mockResolvedValue({
      ...COMPANY,
      leaseId: null,
    });
    renderModal();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Bail de la société"), "");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.companies.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ leaseId: null, name: "HKOF" }),
      ),
    );
  });

  it("does not save on Annuler", async () => {
    const { onClose } = renderModal();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Bail de la société"), "6");
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(api.companies.update).not.toHaveBeenCalled();
  });
});
