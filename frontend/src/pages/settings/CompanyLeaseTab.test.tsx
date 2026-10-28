import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { CompanyDto, LeaseDto, StatementDto } from "@/api/types";
import i18n from "@/i18n";
import { useToasts } from "@/state/toasts";
import { CompanyLeaseTab } from "./CompanyLeaseTab";

vi.mock("@/components/pdf/PdfViewer", () => ({
  PdfViewer: () => <div data-cy="pdf-viewer" />,
}));

vi.mock("@/hooks/usePdfPreview", () => ({
  usePdfPreview: () => ({
    url: null,
    isPending: false,
    refresh: () => undefined,
    download: () => undefined,
  }),
}));

vi.mock("@/lib/dates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dates")>();
  return { ...actual, currentMonth: () => "2026-01" };
});

vi.mock("@/api/endpoints", () => ({
  api: {
    companies: { list: vi.fn(), update: vi.fn() },
    persons: { list: vi.fn() },
    addresses: { list: vi.fn() },
    leases: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    expenseItems: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    expenseStatements: {
      list: vi.fn(),
      active: vi.fn(),
      calculate: vi.fn(),
      preview: vi.fn(),
      create: vi.fn(),
      pdf: vi.fn(),
      zip: vi.fn(),
      pdfUrl: (id: number, complete: boolean) =>
        `/api/notes/${id}/pdf${complete ? "?complete=1" : ""}`,
      zipUrl: (id: number) => `/api/notes/${id}/zip`,
    },
    rentReceipts: {
      list: vi.fn(),
      active: vi.fn(),
      create: vi.fn(),
      preview: vi.fn(),
      pdf: vi.fn(),
      pdfUrl: (id: number) => `/api/quittances/${id}/pdf`,
    },
    templates: { list: vi.fn() },
    employees: { list: vi.fn() },
    signatures: { list: vi.fn() },
    receipts: { upload: vi.fn(), delete: vi.fn(), fileUrl: vi.fn() },
    analyses: { analyze: vi.fn() },
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

const OTHER_COMPANY: CompanyDto = { ...COMPANY, id: 2, name: "Autre SARL" };

const LEASE5: LeaseDto = {
  id: 5,
  companyId: 1,
  companyLease: true,
  landlordId: 1,
  landlordName: "M. Bailleur",
  propertyAddress: "12 rue des Lilas, 75011 Paris",
  rentExclCharges: "900.00",
  charges: "50.00",
  totalArea: "70.00",
  businessArea: "25.00",
  proRataBase: "35.71",
};

const LEASE6: LeaseDto = {
  id: 6,
  companyId: 1,
  companyLease: true,
  landlordId: 1,
  landlordName: "M. Bailleur",
  propertyAddress: "8 impasse des Acacias, 69003 Lyon",
  rentExclCharges: "700.00",
  charges: "0.00",
  totalArea: "40.00",
  businessArea: "10.00",
  proRataBase: "25.00",
};

const LEASE7: LeaseDto = {
  id: 7,
  companyId: 2,
  companyLease: true,
  landlordId: 1,
  landlordName: "M. Bailleur",
  propertyAddress: "5 rue de l'Autre, 75004 Paris",
  rentExclCharges: "500.00",
  charges: "0.00",
};

function queryByCy(cy: string): Element | null {
  return document.querySelector(`[data-cy="${cy}"]`);
}

function renderTab(current: CompanyDto = COMPANY) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  render(
    <CompanyLeaseTab company={current} companies={[current, OTHER_COMPANY]} />,
    {
      wrapper,
    },
  );
  return queryClient;
}

beforeEach(() => {
  vi.mocked(api.companies.list).mockReset();
  vi.mocked(api.companies.update).mockReset();
  vi.mocked(api.persons.list).mockReset();
  vi.mocked(api.addresses.list).mockReset();
  vi.mocked(api.leases.list).mockReset();
  vi.mocked(api.leases.create).mockReset();
  vi.mocked(api.leases.update).mockReset();
  vi.mocked(api.expenseItems.list).mockReset();
  vi.mocked(api.expenseItems.create).mockReset();
  vi.mocked(api.expenseStatements.list).mockReset();
  vi.mocked(api.expenseStatements.active).mockReset();
  vi.mocked(api.expenseStatements.calculate).mockReset();
  vi.mocked(api.expenseStatements.preview).mockReset();
  vi.mocked(api.expenseStatements.create).mockReset();
  vi.mocked(api.rentReceipts.list).mockReset();
  vi.mocked(api.rentReceipts.active).mockReset();
  vi.mocked(api.templates.list).mockReset();
  vi.mocked(api.employees.list).mockReset();
  vi.mocked(api.signatures.list).mockReset();
  vi.mocked(api.persons.list).mockResolvedValue([
    { id: 1, name: "M. Bailleur", address: "" },
  ]);
  vi.mocked(api.addresses.list).mockResolvedValue([]);
  vi.mocked(api.leases.list).mockResolvedValue([LEASE5, LEASE6, LEASE7]);
  vi.mocked(api.expenseItems.list).mockResolvedValue([]);
  vi.mocked(api.companies.list).mockResolvedValue([COMPANY, OTHER_COMPANY]);
  vi.mocked(api.expenseStatements.list).mockResolvedValue([]);
  vi.mocked(api.expenseStatements.active).mockResolvedValue(null);
  vi.mocked(api.expenseStatements.calculate).mockResolvedValue({
    total: "0.00",
    lines: [],
  });
  vi.mocked(api.expenseStatements.preview).mockResolvedValue({
    blob: new Blob(),
    fileName: null,
  });
  vi.mocked(api.rentReceipts.list).mockResolvedValue([]);
  vi.mocked(api.rentReceipts.active).mockResolvedValue(null);
  vi.mocked(api.templates.list).mockResolvedValue([]);
  vi.mocked(api.employees.list).mockResolvedValue([]);
  vi.mocked(api.signatures.list).mockResolvedValue([]);
  useToasts.setState({ toasts: [] });
});

describe("CompanyLeaseTab", () => {
  it("renders dense column headers above the company lease rows", async () => {
    renderTab();

    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    const headers = queryByCy("entetes-baux-societe") as HTMLElement;
    expect(headers).not.toBeNull();
    expect(headers).toHaveClass("hidden", "md:grid");
    expect(within(headers).getByText("Bail")).toBeVisible();
    expect(within(headers).getByText("Loyer")).toBeVisible();
    expect(within(headers).getByText("Charges")).toBeVisible();
    expect(within(headers).getByText("Actions")).toBeVisible();
  });

  it("aligns rent, charges and actions in each company lease row", async () => {
    renderTab();

    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    expect(
      withinLease("bail-societe-5").getByText("Bailleur M. Bailleur"),
    ).toBeVisible();
    expect(queryByCy("loyer-bail-societe-5")).toHaveTextContent("900,00 €");
    expect(queryByCy("charges-bail-societe-5")).toHaveTextContent("50,00 €");
    expect(queryByCy("loyer-bail-societe-5")).toHaveClass(
      "number",
      "text-right",
    );
    expect(queryByCy("charges-bail-societe-5")).toHaveClass(
      "number",
      "text-right",
    );
    expect(queryByCy("actions-bail-societe-5")).not.toBeNull();
  });

  it("lists only the leases of the company as click-to-select items, without dropdown", async () => {
    renderTab();

    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    expect(queryByCy("bail-societe-6")).not.toBeNull();
    expect(queryByCy("bail-societe-7")).toBeNull();
    expect(queryByCy("select-bail-actif")).toBeNull();
    expect(
      withinLease("bail-societe-5").getByText("Bail actif"),
    ).toBeInTheDocument();
    expect(withinLease("bail-societe-6").queryByText("Bail actif")).toBeNull();
  });

  it("arrives with every lease collapsed, even when a bail actif is linked", async () => {
    renderTab();

    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    expect(queryByCy("bail-societe-5")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(queryByCy("bail-societe-6")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(
      withinLease("bail-societe-5").getByText("Bail actif"),
    ).toBeInTheDocument();
    expect(queryByCy("bail-societe-lie")).toBeNull();
    expect(queryByCy("aucun-bail-societe")).toBeNull();
    expect(
      document.querySelectorAll(".company-lease-view-details"),
    ).toHaveLength(0);
    expect(api.expenseItems.list).not.toHaveBeenCalled();
  });

  it("expands the collapsed active lease without persisting, then collapses it keeping it active", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());

    await user.click(queryByCy("bail-societe-5") as HTMLElement);

    expect(api.companies.update).not.toHaveBeenCalled();
    expect(queryByCy("bail-societe-5")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      document.querySelectorAll(".company-lease-view-details"),
    ).toHaveLength(1);
    await waitFor(() =>
      expect(api.expenseItems.list).toHaveBeenCalledWith(1, true, 5),
    );

    await user.click(queryByCy("bail-societe-5") as HTMLElement);

    expect(api.companies.update).not.toHaveBeenCalled();
    expect(queryByCy("bail-societe-5")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(
      withinLease("bail-societe-5").getByText("Bail actif"),
    ).toBeInTheDocument();
    expect(queryByCy("bail-societe-lie")).toBeNull();
    expect(queryByCy("aucun-bail-societe")).toBeNull();
  });

  it("lists the active lease first, the others in existing order", async () => {
    vi.mocked(api.companies.update).mockResolvedValue({
      ...COMPANY,
      leaseId: 6,
    });
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());
    expect(toggleOrder()).toEqual([5, 6]);

    await user.click(queryByCy("bail-societe-6") as HTMLElement);

    await waitFor(() => expect(api.companies.update).toHaveBeenCalled());
    await waitFor(() => expect(toggleOrder()).toEqual([6, 5]));
  });

  it("lists the lease linked on arrival first", async () => {
    renderTab({ ...COMPANY, leaseId: 6 });

    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());
    expect(toggleOrder()).toEqual([6, 5]);
  });

  it("clicking a compact lease persists it via the company update, expands it and switches the postes scope", async () => {
    vi.mocked(api.companies.update).mockResolvedValue({
      ...COMPANY,
      leaseId: 6,
    });
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());
    expect(queryByCy("bail-societe-6")).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    await user.click(queryByCy("bail-societe-6") as HTMLElement);

    await waitFor(() =>
      expect(api.companies.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: "HKOF", leaseId: 6 }),
      ),
    );
    await waitFor(() =>
      expect(api.expenseItems.list).toHaveBeenCalledWith(1, true, 6),
    );
    expect(queryByCy("bail-societe-6")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(queryByCy("bail-societe-5")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(queryByCy("prorata-indicatif")).toBeNull();
    expect(
      document.querySelectorAll(".company-lease-view-details"),
    ).toHaveLength(1);
  });

  it("reverts the selection and shows a French toast when the switch fails", async () => {
    vi.mocked(api.companies.update).mockRejectedValue(
      new Error("Ce bail est déjà lié à une autre société."),
    );
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());

    await user.click(queryByCy("bail-societe-6") as HTMLElement);

    await waitFor(() =>
      expect(
        useToasts
          .getState()
          .toasts.some(
            (entry) =>
              entry.type === "error" &&
              entry.message === "Ce bail est déjà lié à une autre société.",
          ),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(
        withinLease("bail-societe-5").queryByText("Bail actif"),
      ).not.toBeNull(),
    );
    expect(queryByCy("bail-societe-5")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(queryByCy("bail-societe-6")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(queryByCy("bail-societe-lie")).toBeNull();
  });

  it("persists the selection once and only collapses on the second click for a sparse company", async () => {
    vi.mocked(api.companies.update).mockResolvedValue({ id: 1, leaseId: 6 });
    renderTab({ id: 1 });
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());
    expect(queryByCy("aucun-bail-societe")).not.toBeNull();

    await user.click(queryByCy("bail-societe-6") as HTMLElement);
    await waitFor(() =>
      expect(api.companies.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: "",
          legalForm: "",
          siren: "",
          address: "",
          managerName: "",
          issuePlace: "",
          leaseId: 6,
        }),
      ),
    );
    await waitFor(() =>
      expect(api.expenseItems.list).toHaveBeenCalledWith(1, true, 6),
    );
    expect(queryByCy("aucun-bail-societe")).toBeNull();

    await user.click(queryByCy("bail-societe-6") as HTMLElement);

    expect(queryByCy("bail-societe-6")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(api.companies.update).toHaveBeenCalledTimes(1);
    expect(
      withinLease("bail-societe-6").getByText("Bail actif"),
    ).toBeInTheDocument();
    expect(queryByCy("aucun-bail-societe")).toBeNull();
    expect(queryByCy("bail-societe-lie")).toBeNull();
  });

  it("keeps the backend pro-rata visible for the expanded active lease", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());

    await user.click(queryByCy("bail-societe-5") as HTMLElement);

    await waitFor(() => expect(queryByCy("bail-societe-lie")).not.toBeNull());
    expect(api.companies.update).not.toHaveBeenCalled();
  });

  it("opens the shared LMNP lease modal with the company lease preset", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());

    await user.click(queryByCy("btn-ajouter-bail-societe") as HTMLElement);

    expect(queryByCy("dialogue-formulaire-bail")).not.toBeNull();
    expect(queryByCy("input-bail-societe-type")).toBeChecked();
    expect(queryByCy("select-bail-locataire-societe")).toHaveValue("1");
  });

  it("shows the created lease in the list after saving", async () => {
    vi.mocked(api.leases.create).mockResolvedValue(LEASE6);
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());
    vi.mocked(api.leases.list).mockResolvedValue([
      LEASE5,
      LEASE6,
      LEASE7,
      {
        ...LEASE6,
        id: 8,
        propertyAddress: "3 rue Nouvelle, 75005 Paris",
      },
    ]);

    await user.click(queryByCy("btn-ajouter-bail-societe") as HTMLElement);
    await user.selectOptions(
      queryByCy("select-bail-bailleur") as HTMLElement,
      "1",
    );
    await user.type(
      queryByCy("input-bail-adresse") as HTMLElement,
      "3 rue Nouvelle, 75005 Paris",
    );
    await user.type(queryByCy("input-bail-loyer") as HTMLElement, "800,00");
    await user.type(queryByCy("input-bail-charges") as HTMLElement, "0,00");
    await user.type(queryByCy("input-surface-totale") as HTMLElement, "60,00");
    await user.type(queryByCy("input-surface-pro") as HTMLElement, "30,00");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.leases.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyLease: true,
          companyId: 1,
          propertyAddress: "3 rue Nouvelle, 75005 Paris",
        }),
      ),
    );
    await waitFor(() => expect(queryByCy("bail-societe-8")).not.toBeNull());
  });

  it("creates a new poste for the selected lease", async () => {
    vi.mocked(api.companies.update).mockResolvedValue({
      ...COMPANY,
      leaseId: 6,
    });
    vi.mocked(api.expenseItems.create).mockResolvedValue({
      id: 11,
      label: "Gaz",
    });
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());

    await user.click(queryByCy("bail-societe-6") as HTMLElement);
    await user.click(screen.getByRole("button", { name: "Ajouter un poste" }));
    await user.type(screen.getByLabelText("Libellé affiché"), "Gaz");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.expenseItems.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 1, leaseId: 6, label: "Gaz" }),
      ),
    );
  });

  it("opens the edit modal prefilled with the lease without changing selection or expansion", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());

    await user.click(queryByCy("btn-modifier-bail-societe-6") as HTMLElement);

    expect(queryByCy("dialogue-formulaire-bail")).not.toBeNull();
    expect(queryByCy("input-bail-adresse")).toHaveValue(
      "8 impasse des Acacias, 69003 Lyon",
    );
    expect(queryByCy("input-bail-loyer")).toHaveValue("700,00");
    expect(queryByCy("input-surface-totale")).toHaveValue("40,00");
    expect(api.companies.update).not.toHaveBeenCalled();
    expect(
      withinLease("bail-societe-5").getByText("Bail actif"),
    ).toBeInTheDocument();
    expect(queryByCy("bail-societe-5")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(queryByCy("bail-societe-6")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("keeps the expansion when Modifier opens and closes on an expanded lease", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    await user.click(queryByCy("bail-societe-5") as HTMLElement);
    expect(queryByCy("bail-societe-5")).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    await user.click(queryByCy("btn-modifier-bail-societe-5") as HTMLElement);
    expect(queryByCy("dialogue-formulaire-bail")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(queryByCy("dialogue-formulaire-bail")).toBeNull();
    expect(queryByCy("bail-societe-5")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(queryByCy("bail-societe-lie")).not.toBeNull();
    expect(api.companies.update).not.toHaveBeenCalled();
  });

  it("saves the edited lease through the lease update and refreshes the list", async () => {
    vi.mocked(api.leases.update).mockResolvedValue({
      ...LEASE6,
      propertyAddress: "9 rue Modifiée, 69003 Lyon",
    });
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());
    vi.mocked(api.leases.list).mockResolvedValue([
      LEASE5,
      { ...LEASE6, propertyAddress: "9 rue Modifiée, 69003 Lyon" },
      LEASE7,
    ]);

    await user.click(queryByCy("btn-modifier-bail-societe-6") as HTMLElement);
    await user.clear(queryByCy("input-bail-adresse") as HTMLElement);
    await user.type(
      queryByCy("input-bail-adresse") as HTMLElement,
      "9 rue Modifiée, 69003 Lyon",
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.leases.update).toHaveBeenCalledWith(
        6,
        expect.objectContaining({
          companyLease: true,
          companyId: 1,
          propertyAddress: "9 rue Modifiée, 69003 Lyon",
        }),
      ),
    );
    await waitFor(() =>
      expect(queryByCy("dialogue-formulaire-bail")).toBeNull(),
    );
    await waitFor(() =>
      expect(queryByCy("bail-societe-6")).toHaveTextContent(
        "9 rue Modifiée, 69003 Lyon",
      ),
    );
  });

  it("closes the edit modal with Annuler without saving", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());

    await user.click(queryByCy("btn-modifier-bail-societe-6") as HTMLElement);
    expect(queryByCy("dialogue-formulaire-bail")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(queryByCy("dialogue-formulaire-bail")).toBeNull();
    expect(api.leases.update).not.toHaveBeenCalled();
    expect(api.companies.update).not.toHaveBeenCalled();
  });

  it("shows a note de frais button and an always-visible statement history per lease row", async () => {
    renderTab();

    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    expect(queryByCy("btn-note-frais-bail-societe-5")).not.toBeNull();
    expect(queryByCy("btn-note-frais-bail-societe-6")).not.toBeNull();
    expect(queryByCy("notes-frais-bail-5")).not.toBeNull();
    expect(queryByCy("notes-frais-bail-6")).not.toBeNull();
  });

  it("fetches the statements once for the company and shows only the matching lease's notes", async () => {
    const statements: StatementDto[] = [
      {
        id: 100,
        month: "2026-01",
        version: 1,
        leaseId: 5,
        total: "950.00",
        status: "ACTIVE",
        createdAt: "2026-01-05T10:00:00Z",
      },
      {
        id: 101,
        month: "2026-01",
        version: 1,
        leaseId: 6,
        total: "700.00",
        status: "ACTIVE",
        createdAt: "2026-01-06T10:00:00Z",
      },
      {
        id: 102,
        month: "2026-01",
        version: 1,
        leaseId: null,
        total: "100.00",
        status: "ACTIVE",
        createdAt: "2026-01-07T10:00:00Z",
      },
    ];
    vi.mocked(api.expenseStatements.list).mockResolvedValue(statements);
    renderTab();

    await waitFor(() => expect(queryByCy("notes-frais-bail-5")).not.toBeNull());
    await waitFor(() =>
      expect(api.expenseStatements.list).toHaveBeenCalledWith(
        1,
        undefined,
        null,
      ),
    );
    expect(queryByCy("notes-frais-bail-mois-5-2026-01")).not.toBeNull();
    expect(queryByCy("notes-frais-bail-mois-6-2026-01")).not.toBeNull();
    expect(
      withinLease("notes-frais-bail-5").queryByText(/100/),
    ).not.toBeInTheDocument();
    expect(queryByCy("telecharger-note-frais-bail-100")).not.toBeNull();
    expect(queryByCy("telecharger-note-frais-bail-101")).not.toBeNull();
    expect(queryByCy("telecharger-note-frais-bail-102")).toBeNull();
  });

  it("opens the scoped note de frais modal for the lease and closes it", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());

    await user.click(queryByCy("btn-note-frais-bail-societe-5") as HTMLElement);

    await waitFor(() =>
      expect(queryByCy("dialogue-note-frais-bail")).not.toBeNull(),
    );
    expect(queryByCy("dialogue-note-frais-bail")).toHaveTextContent(
      "12 rue des Lilas, 75011 Paris",
    );

    await user.click(
      within(queryByCy("dialogue-note-frais-bail") as HTMLElement).getByRole(
        "button",
        { name: "Fermer" },
      ),
    );

    await waitFor(() =>
      expect(queryByCy("dialogue-note-frais-bail")).toBeNull(),
    );
  });

  it("renders the company lease tab in English", async () => {
    await i18n.changeLanguage("en");
    renderTab();

    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    expect(
      screen.getByRole("heading", { name: "Company leases" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "A company can be the tenant of several leases. Click a lease to activate it and expand its expenses: items and expense statements follow that lease.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Add a lease" })).toBeVisible();
    expect(
      withinLease("bail-societe-5").getByText("Active lease"),
    ).toBeVisible();
    expect(
      withinLease("bail-societe-5").getByText("Landlord M. Bailleur"),
    ).toBeVisible();
    expect(queryByCy("loyer-bail-societe-5")).toHaveTextContent("900,00 €");
    expect(queryByCy("charges-bail-societe-5")).toHaveTextContent("50,00 €");
    const headers = queryByCy("entetes-baux-societe") as HTMLElement;
    expect(within(headers).getByText("Lease")).toBeVisible();
    expect(within(headers).getByText("Rent")).toBeVisible();
    expect(within(headers).getByText("Charges")).toBeVisible();
    expect(within(headers).getByText("Actions")).toBeVisible();
    expect(queryByCy("btn-note-frais-bail-societe-5")).toHaveTextContent(
      "Expense statement",
    );
    expect(queryByCy("btn-modifier-bail-societe-5")).toHaveTextContent("Edit");
  });

  it("shows the English empty lease state", async () => {
    await i18n.changeLanguage("en");
    vi.mocked(api.leases.list).mockResolvedValue([]);
    renderTab();

    await waitFor(() =>
      expect(queryByCy("liste-baux-societe-vide")).not.toBeNull(),
    );
    expect(
      screen.getByText(
        "No lease for this company. Add the first lease with “Add a lease”.",
      ),
    ).toBeVisible();
  });
});

function withinLease(cy: string): ReturnType<typeof within> {
  const element = queryByCy(cy);
  if (!element) {
    throw new Error(`missing ${cy}`);
  }
  return within(element as HTMLElement);
}

/** Lease ids in DOM order, read on the row toggle buttons. */
function toggleOrder(): number[] {
  return [...document.querySelectorAll(".company-lease-tab-item-toggle")].map(
    (element) =>
      Number(
        (element as HTMLElement).dataset.cy?.replace("bail-societe-", "") ??
          NaN,
      ),
  );
}
