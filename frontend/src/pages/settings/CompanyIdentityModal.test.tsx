import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { CompanyDto } from "@/api/types";
import i18n from "@/i18n";
import { useToasts } from "@/state/toasts";
import { CompanyIdentityModal } from "./CompanyIdentityModal";

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
  siret: "123 456 789 00012",
  address: "1 rue de la Paix, 75002 Paris",
  managerName: "Camille Martin",
  leaseId: 5,
  proRataBase: "35.71",
  issuePlace: "Paris",
};

function renderModal(
  props: Partial<Parameters<typeof CompanyIdentityModal>[0]> = {},
) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  render(
    <CompanyIdentityModal
      open
      company={null}
      onClose={onClose}
      onSaved={onSaved}
      {...props}
    />,
    { wrapper },
  );
  return { onClose, onSaved };
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

const ADDRESS_RESPONSE = {
  features: [
    {
      properties: {
        id: "addr-test-1",
        label: "2 rue du Test 75001 Paris",
        postcode: "75001",
        city: "Paris",
      },
    },
  ],
};

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  } as Response);
  vi.mocked(api.companies.create).mockReset();
  vi.mocked(api.companies.update).mockReset();
  useToasts.setState({ toasts: [] });
});

describe("CompanyIdentityModal", () => {
  it("renders nothing when closed", () => {
    renderModal({ open: false });

    expect(
      document.querySelector('[data-cy="dialog-company-form"]'),
    ).toBeNull();
  });

  it("creates a company with trimmed values and reports the saved payload", async () => {
    vi.mocked(api.companies.create).mockResolvedValue(COMPANY);
    const { onSaved } = renderModal();
    const user = userEvent.setup();

    expect(screen.getByRole("dialog")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Nouvelle société" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Raison sociale")).toHaveValue("");
    expect(
      document.querySelector('[data-cy="select-company-lease"]'),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Valider" }));
    expect(
      await screen.findByText("Le nom de la société est obligatoire."),
    ).toBeVisible();
    expect(api.companies.create).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Raison sociale"), "  HKOF  ");
    await user.type(screen.getByLabelText("SIREN"), "123 456 789");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.companies.create).toHaveBeenCalledWith({
        name: "HKOF",
        legalForm: "",
        siren: "123 456 789",
        siret: "",
        address: "",
        managerName: "",
        leaseId: null,
        issuePlace: "",
      }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(COMPANY));
    expect(toastMessages()).toContain("Société créée.");
  });

  it("edits an existing company with prefilled fields through the update path", async () => {
    vi.mocked(api.companies.update).mockResolvedValue(COMPANY);
    const { onSaved } = renderModal({ company: COMPANY });
    const user = userEvent.setup();

    expect(
      screen.getByRole("heading", { name: "Modifier la société" }),
    ).toBeVisible();
    expect(document.querySelector('[data-cy="company-form"]')).not.toBeNull();
    expect(screen.getByLabelText("Raison sociale")).toHaveValue("HKOF");

    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.companies.update).toHaveBeenCalledWith(1, {
        name: "HKOF",
        legalForm: "EURL",
        siren: "123 456 789",
        siret: "123 456 789 00012",
        address: "1 rue de la Paix, 75002 Paris",
        managerName: "Camille Martin",
        leaseId: 5,
        issuePlace: "Paris",
      }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(COMPANY));
    expect(toastMessages()).toContain(
      "Société enregistrée. Les prochains documents utiliseront ces valeurs.",
    );
  });

  it("shows and submits the stored SIRET", async () => {
    vi.mocked(api.companies.update).mockResolvedValue({
      ...COMPANY,
      siret: "987 654 321 00021",
    });
    renderModal({ company: COMPANY });
    const user = userEvent.setup();

    expect(screen.getByLabelText("SIRET")).toHaveValue("123 456 789 00012");

    await user.clear(screen.getByLabelText("SIRET"));
    await user.type(screen.getByLabelText("SIRET"), "987 654 321 00021");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.companies.update).toHaveBeenCalledWith(1, {
        name: "HKOF",
        legalForm: "EURL",
        siren: "123 456 789",
        siret: "987 654 321 00021",
        address: "1 rue de la Paix, 75002 Paris",
        managerName: "Camille Martin",
        leaseId: 5,
        issuePlace: "Paris",
      }),
    );
  });

  it("blocks submit and shows the French message for an invalid SIREN", async () => {
    renderModal();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Raison sociale"), "HKOF");
    await user.type(screen.getByLabelText("SIREN"), "12");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(
      await screen.findByText("Le SIREN doit comporter 9 chiffres."),
    ).toBeVisible();
    expect(api.companies.create).not.toHaveBeenCalled();
  });

  it("closes without saving on Annuler or Escape", async () => {
    const { onClose } = renderModal();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Raison sociale"), "HKOF");
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(api.companies.create).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(api.companies.create).not.toHaveBeenCalled();
  });

  it("surfaces an API error inside the modal", async () => {
    vi.mocked(api.companies.create).mockRejectedValue(
      new Error("SIREN déjà utilisé."),
    );
    const { onSaved } = renderModal();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Raison sociale"), "HKOF");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(await screen.findByText("SIREN déjà utilisé.")).toBeVisible();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("renders the create modal, validation and toast in English", async () => {
    await i18n.changeLanguage("en");
    vi.mocked(api.companies.create).mockResolvedValue(COMPANY);
    renderModal();
    const user = userEvent.setup();

    expect(screen.getByRole("heading", { name: "New company" })).toBeVisible();
    expect(screen.getByText("Company identity")).toBeVisible();
    expect(screen.getByLabelText("Company name")).toHaveValue("");
    expect(screen.getByLabelText("SIREN")).toBeVisible();
    expect(screen.getByLabelText("SIRET")).toBeVisible();
    expect(screen.getByText("9 digits, spaces allowed.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("The company name is required."),
    ).toBeVisible();

    await user.type(screen.getByLabelText("Company name"), "HKOF");
    await user.type(screen.getByLabelText("SIREN"), "12");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("The SIREN must have 9 digits."),
    ).toBeVisible();
    expect(api.companies.create).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("SIREN"));
    await user.type(screen.getByLabelText("SIREN"), "123 456 789");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(api.companies.create).toHaveBeenCalledWith({
        name: "HKOF",
        legalForm: "",
        siren: "123 456 789",
        siret: "",
        address: "",
        managerName: "",
        leaseId: null,
        issuePlace: "",
      }),
    );
    await waitFor(() => expect(toastMessages()).toContain("Company created."));
  });

  it("autocompletes the company address and saves the selected suggestion", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ADDRESS_RESPONSE,
    } as Response);
    vi.mocked(api.companies.create).mockResolvedValue({
      ...COMPANY,
      address: "2 rue du Test 75001 Paris",
    });
    renderModal();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Raison sociale"), "HKOF");
    const address = screen.getByRole("combobox", {
      name: "Adresse de la société",
    });
    await user.type(address, "2 rue du Test");

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api-adresse.data.gouv.fr/search/?q=2%20rue%20du%20Test&limit=5",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
    await user.click(
      await screen.findByRole("option", { name: "2 rue du Test 75001 Paris" }),
    );
    expect(address).toHaveValue("2 rue du Test 75001 Paris");

    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.companies.create).toHaveBeenCalledWith(
        expect.objectContaining({ address: "2 rue du Test 75001 Paris" }),
      ),
    );
  });
});
