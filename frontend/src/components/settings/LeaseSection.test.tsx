import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AddressDto,
  CompanyDto,
  LeaseDto,
  PersonDto,
  SignatureDto,
  TemplateDto,
} from "@/api/types";
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

vi.mock("@/components/pdf/PdfViewer", () => ({
  PdfViewer: () => <div data-cy="apercu-quittance-bail" />,
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
    useLeases: () => readyQuery([LEASE]),
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
});

describe("LeaseSection rent receipt", () => {
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
});
