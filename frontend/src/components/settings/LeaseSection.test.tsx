import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type {
  AddressDto,
  CompanyDto,
  LeaseDto,
  PersonDto,
  RentReceiptDto,
  SignatureDto,
  TemplateDto,
} from "@/api/types";
import i18n from "@/i18n";
import { formatMonth } from "@/lib/format";
import { useToasts } from "@/state/toasts";
import { LeaseSection } from "./LeaseSection";
import { useRentReceiptSettings } from "./useRentReceiptSettings";

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
}

function readyQuery<T>(data: T): QueryLike<T> {
  return {
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

const PERSON: PersonDto = { id: 1, name: "M. Bailleur", address: null };
const TENANT: PersonDto = { id: 2, name: "Mme Locataire", address: null };
const COMPANY: CompanyDto = { id: 3, name: "HKOF" };
const ADDRESS: AddressDto = { id: 4, label: "12 rue de la République" };
const LEASE: LeaseDto = {
  id: 10,
  addressId: 4,
  landlordId: 1,
  tenantId: 2,
  landlordName: "M. Bailleur",
  tenantName: "Mme Locataire",
  propertyAddress: "12 rue de la République, 75000 Paris",
  rentExclCharges: "1300.00",
  charges: "50.00",
};

const OTHER_LEASE: LeaseDto = {
  id: 11,
  addressId: 4,
  landlordId: 1,
  tenantId: 2,
  landlordName: "M. Autre",
  tenantName: "Mme Voisine",
  propertyAddress: "8 impasse des Acacias, 69003 Lyon",
  companyName: "Alpha SARL",
  rentExclCharges: "800.00",
  charges: "100.00",
};

/** Lease ids in DOM order, read on the row items. */
function leaseOrder(): number[] {
  return [...document.querySelectorAll('[data-cy^="lease-"]')]
    .map((element) =>
      Number((element as HTMLElement).dataset.cy?.replace("lease-", "") ?? NaN),
    )
    .filter((id) => Number.isInteger(id));
}
const TEMPLATE: TemplateDto = {
  id: 5,
  type: "RENT_RECEIPT",
  name: "Quittance intégrée",
  version: 1,
  format: "HTML",
  active: true,
  builtIn: true,
  createdAt: "2026-01-01T10:00:00Z",
};
const SIGNATURE: SignatureDto = {
  id: 7,
  personId: 1,
  personName: "M. Bailleur",
  name: "Bailleur",
  mimeType: "image/png",
  createdAt: "2026-10-23T10:00:00Z",
};

let signatureRows: SignatureDto[] = [];
let signaturesPending = false;
let allRentReceiptRows: RentReceiptDto[] = [];
let allRentReceiptsFailing = false;
let allRentReceiptsRefetch = vi.fn();
let leaseRows: LeaseDto[] = [LEASE];

vi.mock("@/components/pdf/PdfViewer", () => ({
  PdfViewer: () => <div data-cy="lease-rent-receipt-preview" />,
}));

vi.mock("@/api/endpoints", () => ({
  api: {
    leases: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    signatures: {
      list: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
      imageUrl: (id: number) => `/api/signatures/${id}/image`,
    },
    rentReceipts: {
      list: vi.fn(),
      preview: vi.fn(),
      create: vi.fn(),
      pdf: vi.fn(),
      pdfUrl: (id: number) => `/api/rent-receipts/${id}/pdf`,
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    usePersons: () => readyQuery([PERSON, TENANT]),
    useCompanies: () => readyQuery([COMPANY]),
    useAddresses: () => readyQuery([ADDRESS]),
    useLeases: () => readyQuery(leaseRows),
    useSignatures: (personId: number | null) =>
      signaturesPending
        ? {
            data: undefined,
            isPending: true,
            isError: false,
            error: null,
            refetch: vi.fn(),
          }
        : readyQuery(personId === 1 ? signatureRows : []),
    useTemplates: () => readyQuery([TEMPLATE]),
    useAllRentReceipts: () =>
      allRentReceiptsFailing
        ? {
            data: undefined,
            isPending: false,
            isError: true,
            error: new Error("historique indisponible"),
            refetch: allRentReceiptsRefetch,
          }
        : readyQuery(allRentReceiptRows),
  };
});

function Harness() {
  const c = useRentReceiptSettings();
  return <LeaseSection c={c} />;
}

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  signatureRows = [SIGNATURE];
  signaturesPending = false;
  allRentReceiptRows = [];
  allRentReceiptsFailing = false;
  allRentReceiptsRefetch = vi.fn();
  leaseRows = [LEASE];
});

describe("LeaseSection rent receipt", () => {
  it("renders dense column headers above the lease rows", () => {
    renderSection();

    const headers = document.querySelector(
      '[data-cy="leases-headers"]',
    ) as HTMLElement;
    expect(headers).not.toBeNull();
    expect(headers).toHaveAttribute("role", "row");
    expect(headers).toHaveClass("hidden", "md:grid");
    expect(within(headers).getByText("Bail")).toBeVisible();
    expect(within(headers).getByText("Société")).toBeVisible();
    expect(within(headers).getByText("Loyer")).toBeVisible();
    expect(within(headers).getByText("Charges")).toBeVisible();
    expect(within(headers).getByText("Total")).toBeVisible();
    expect(within(headers).getByText("Actions")).toBeVisible();
    expect(
      within(headers)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Bail", "Société", "Loyer", "Charges", "Total", "Actions"]);
    const table = headers.closest('[role="table"]') as HTMLElement;
    expect(table).toHaveClass("lease-section-table");
  });

  it("splits each lease row into aligned company and amount cells", () => {
    renderSection();

    const row = document.querySelector('[data-cy="lease-10"]') as HTMLElement;
    expect(row.querySelector(".lease-section-cell-title")).toHaveTextContent(
      "M. Bailleur → Mme Locataire",
    );
    expect(
      row.querySelector('[data-cy="company-lease-10"]')?.textContent?.trim(),
    ).toBe("Aucune société");
    expect(row.querySelector(".lease-section-cell-rent")).toHaveTextContent(
      "1 300,00 €",
    );
    expect(row.querySelector(".lease-section-cell-charges")).toHaveTextContent(
      "50,00 €",
    );
    const total = row.querySelector('[data-cy="lease-total-10"]');
    expect(total).toHaveTextContent("1 350,00 €");
    expect(total).toHaveClass("number", "text-right");
    expect(row.querySelector(".lease-section-cell-actions")).not.toBeNull();
  });

  it("opens the rent receipt modal from the Quittance button of a lease row", async () => {
    renderSection();
    const user = userEvent.setup();

    const button = screen.getByRole("button", {
      name: "Quittance du bail 10",
    });
    expect(button).toBeEnabled();
    await user.click(button);

    const dialog = screen.getByRole("dialog", { name: "Quittance de loyer" });
    expect(within(dialog).getByText("M. Bailleur")).toBeVisible();
    expect(within(dialog).getByText("Mme Locataire")).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Fermer" }));
    expect(
      screen.queryByRole("dialog", { name: "Quittance de loyer" }),
    ).toBeNull();
  });

  it("disables the Quittance button and explains the missing signature", () => {
    signatureRows = [];
    renderSection();

    const button = screen.getByRole("button", {
      name: "Quittance du bail 10",
    });
    expect(button).toBeDisabled();
    expect(button.parentElement).toHaveAttribute(
      "title",
      expect.stringContaining("Personnes"),
    );
  });

  it("waits for the signature query before enabling the Quittance button", () => {
    signaturesPending = true;
    renderSection();

    const button = screen.getByRole("button", {
      name: "Quittance du bail 10",
    });
    expect(button).toBeDisabled();
    expect(button.parentElement).toHaveAttribute(
      "title",
      "Vérification des signatures…",
    );
  });

  it("renders the lease section and its rows in English", async () => {
    await i18n.changeLanguage("en");
    renderSection();

    expect(
      screen.getByRole("heading", { name: "Leases and addresses" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Add a lease" })).toBeVisible();
    expect(screen.getByLabelText("Lease addresses")).toBeVisible();
    expect(
      document.querySelector('[data-cy="company-lease-10"]'),
    ).toHaveTextContent("No company");
    expect(
      document.querySelector(".lease-section-cell-rent"),
    ).toHaveTextContent("1 300,00 €");
    expect(
      document.querySelector(".lease-section-cell-charges"),
    ).toHaveTextContent("50,00 €");
    expect(
      document.querySelector('[data-cy="lease-total-10"]'),
    ).toHaveTextContent("1 350,00 €");
    expect(
      screen.getByRole("button", { name: "Rent receipt for lease 10" }),
    ).toHaveTextContent("Rent receipt");
    expect(
      screen.getByRole("button", { name: "Edit lease 10" }),
    ).toHaveTextContent("Edit");
    expect(
      screen.getByRole("button", { name: "Delete lease 10" }),
    ).toHaveTextContent("Remove");
  });

  it("asks to delete a lease in English and toasts in English", async () => {
    await i18n.changeLanguage("en");
    vi.mocked(api.leases.delete).mockResolvedValue(undefined);
    renderSection();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Delete lease 10" }));

    const dialog = screen.getByRole("dialog", {
      name: "Delete this lease?",
    });
    expect(dialog).toHaveTextContent(
      "The lease of “Mme Locataire” will no longer be offered during generation.",
    );
    await user.click(screen.getByRole("button", { name: "Delete the lease" }));

    await waitFor(() => expect(api.leases.delete).toHaveBeenCalledWith(10));
    await waitFor(() =>
      expect(useToasts.getState().toasts).toContainEqual(
        expect.objectContaining({ message: "Lease deleted." }),
      ),
    );
  });

  it("filters the leases on landlord, tenant, address and company with a live count", async () => {
    leaseRows = [LEASE, OTHER_LEASE];
    renderSection();
    const user = userEvent.setup();

    expect(
      document.querySelector('[data-cy="filter-count-leases"]'),
    ).toHaveTextContent("2 sur 2");

    await user.type(screen.getByLabelText("Filtrer la liste"), "acacias");
    expect(leaseOrder()).toEqual([11]);
    expect(
      document.querySelector('[data-cy="filter-count-leases"]'),
    ).toHaveTextContent("1 sur 2");

    await user.click(
      document.querySelector('[data-cy="filter-clear-leases"]') as HTMLElement,
    );
    await user.type(screen.getByLabelText("Filtrer la liste"), "locataire");
    expect(leaseOrder()).toEqual([10]);

    await user.click(
      document.querySelector('[data-cy="filter-clear-leases"]') as HTMLElement,
    );
    await user.type(screen.getByLabelText("Filtrer la liste"), "alpha");
    expect(leaseOrder()).toEqual([11]);
  });

  it("shows a no-match message instead of the headers and rows", async () => {
    leaseRows = [LEASE, OTHER_LEASE];
    renderSection();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Filtrer la liste"), "zzz");

    expect(
      document.querySelector('[data-cy="no-results-leases"]'),
    ).toHaveTextContent("Aucun résultat pour « zzz ».");
    expect(document.querySelector('[data-cy="leases-headers"]')).toBeNull();
    expect(leaseOrder()).toEqual([]);
  });

  it("sorts the leases from the column headers with a direction toggle", async () => {
    leaseRows = [LEASE, OTHER_LEASE];
    renderSection();
    const user = userEvent.setup();

    expect(leaseOrder()).toEqual([10, 11]);
    const rent = document.querySelector(
      '[data-cy="sort-leases-rent"]',
    ) as HTMLElement;
    await user.click(rent);
    expect(leaseOrder()).toEqual([11, 10]);
    expect(rent.closest('[role="columnheader"]')).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    await user.click(rent);
    expect(leaseOrder()).toEqual([10, 11]);
    expect(rent.closest('[role="columnheader"]')).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });

  it("sorts the leases by charges and total, restarting a new column ascending", async () => {
    leaseRows = [LEASE, OTHER_LEASE];
    renderSection();
    const user = userEvent.setup();
    const click = (dataCy: string) =>
      user.click(
        document.querySelector(`[data-cy="${dataCy}"]`) as HTMLElement,
      );

    await click("sort-leases-charges");
    expect(leaseOrder()).toEqual([10, 11]);
    await click("sort-leases-charges");
    expect(leaseOrder()).toEqual([11, 10]);

    await click("sort-leases-total");
    expect(leaseOrder()).toEqual([11, 10]);
    expect(
      document
        .querySelector('[data-cy="sort-leases-total"]')
        ?.closest('[role="columnheader"]'),
    ).toHaveAttribute("aria-sort", "ascending");
  });

  it("keeps the search, live count and compact sort in the card header", async () => {
    leaseRows = [LEASE, OTHER_LEASE];
    renderSection();
    const user = userEvent.setup();

    const header = document.querySelector(".card-header") as HTMLElement;
    expect(within(header).getByLabelText("Filtrer la liste")).toBeVisible();
    expect(
      header.querySelector('[data-cy="filter-count-leases"]'),
    ).toHaveTextContent("2 sur 2");
    expect(document.querySelector(".list-toolbar")).toBeNull();

    await user.selectOptions(
      document.querySelector('[data-cy="sort-leases-compact"]') as HTMLElement,
      "rent",
    );
    expect(leaseOrder()).toEqual([11, 10]);

    await user.click(
      document.querySelector(
        '[data-cy="sort-leases-compact-direction"]',
      ) as HTMLElement,
    );
    expect(leaseOrder()).toEqual([10, 11]);
  });

  it("keeps only the address select in the card header before the search box", async () => {
    leaseRows = [LEASE, OTHER_LEASE];
    renderSection();

    const header = document.querySelector(".card-header") as HTMLElement;
    const select = header.querySelector(
      '[data-cy="select-rent-receipts-address"]',
    ) as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.tagName).toBe("SELECT");
    expect(select).toHaveAccessibleName("Adresse des baux");
    expect(select).toHaveAttribute("aria-label", "Adresse des baux");
    expect(header.querySelector("label")).toBeNull();
    expect(
      screen.queryByText(
        "Seuls les baux de l’adresse sélectionnée sont affichés.",
      ),
    ).toBeNull();
    expect(document.querySelector(".lease-section-address")).toBeNull();
    expect(
      document.querySelector(
        ".card-body [data-cy='select-rent-receipts-address']",
      ),
    ).toBeNull();

    const ordered = [
      ...header.querySelectorAll<HTMLElement>(
        '[data-cy="btn-add-lease"], [data-cy="select-rent-receipts-address"], [data-cy="filter-leases"]',
      ),
    ].map((element) => element.dataset.cy);
    expect(ordered).toEqual([
      "btn-add-lease",
      "select-rent-receipts-address",
      "filter-leases",
    ]);
    expect(
      header.querySelector('[data-cy="filter-count-leases"]'),
    ).not.toBeNull();
    expect(
      header.querySelector('[data-cy="sort-leases-compact"]'),
    ).not.toBeNull();

    await userEvent.selectOptions(select, "4");
    expect(select).toHaveValue("4");
  });

  it("hides the list toolbar when there is no lease", () => {
    leaseRows = [];
    renderSection();

    expect(document.querySelector('[data-cy="filter-leases"]')).toBeNull();
  });
});

describe("LeaseSection receipt history", () => {
  const MATCHING_RECEIPT: RentReceiptDto = {
    id: 101,
    month: "2026-09",
    landlordId: 1,
    tenantId: 2,
    tenantCompanyId: null,
    total: "1350.00",
    version: 1,
    status: "ACTIVE",
    createdAt: "2026-09-30T10:00:00Z",
  };
  const OTHER_TENANT_RECEIPT: RentReceiptDto = {
    ...MATCHING_RECEIPT,
    id: 202,
    tenantId: 999,
  };

  it("shows the lease receipts in a full-width subsection below the row actions", () => {
    allRentReceiptRows = [MATCHING_RECEIPT, OTHER_TENANT_RECEIPT];
    renderSection();

    const row = document.querySelector('[data-cy="lease-10"]');
    const history = document.querySelector(
      '[data-cy="lease-receipt-history-10"]',
    );
    expect(row).not.toBeNull();
    expect(history).not.toBeNull();
    expect(row?.lastElementChild).toBe(history);
    expect(history?.textContent).toContain(formatMonth("2026-09"));
    expect(
      document.querySelector('[data-cy="download-lease-rent-receipt-101"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-cy="download-lease-rent-receipt-202"]'),
    ).toBeNull();
  });

  it("shows a French empty state in the subsection when the lease has no receipt", () => {
    allRentReceiptRows = [OTHER_TENANT_RECEIPT];
    renderSection();

    const history = document.querySelector(
      '[data-cy="lease-receipt-history-10"]',
    );
    expect(history).not.toBeNull();
    expect(history?.textContent).toContain(
      "Aucune quittance générée pour ce bail.",
    );
  });

  it("keeps the row usable and offers a retry when the history query fails", async () => {
    allRentReceiptsFailing = true;
    renderSection();

    const history = document.querySelector(
      '[data-cy="lease-receipt-history-10"]',
    );
    expect(history?.textContent).toContain("Impossible de charger les données");
    expect(history?.textContent).toContain("historique indisponible");
    expect(
      screen.getByRole("button", { name: "Quittance du bail 10" }),
    ).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(allRentReceiptsRefetch).toHaveBeenCalledTimes(1);
  });
});
