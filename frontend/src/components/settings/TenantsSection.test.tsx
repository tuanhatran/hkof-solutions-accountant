import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, type TenantDto } from "@/api/endpoints";
import i18n from "@/i18n";
import { useToasts } from "@/state/toasts";
import { TenantsSection } from "./TenantsSection";

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
}

const TENANT: TenantDto = {
  id: 2,
  name: "Mme Locataire",
  address: "12 rue de la République, 75000 Paris",
  email: "locataire@exemple.fr",
};

const OTHER: TenantDto = {
  id: 3,
  name: "Élodie Zéphyr",
  address: null,
  email: null,
};

let tenantsState: QueryLike<TenantDto[]>;

/** Tenant ids in DOM order, read on the row items. */
function tenantOrder(): number[] {
  return [...document.querySelectorAll('[data-cy^="tenant-"]')]
    .map((element) =>
      Number(
        (element as HTMLElement).dataset.cy?.replace("tenant-", "") ?? NaN,
      ),
    )
    .filter((id) => Number.isInteger(id));
}

function readyQuery(data: TenantDto[]): QueryLike<TenantDto[]> {
  return {
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

vi.mock("@/api/endpoints", () => ({
  api: {
    tenants: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useTenants: () => tenantsState,
  };
});

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TenantsSection />
    </QueryClientProvider>,
  );
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

beforeEach(() => {
  tenantsState = readyQuery([TENANT, OTHER]);
  vi.mocked(api.tenants.create).mockReset();
  vi.mocked(api.tenants.update).mockReset();
  vi.mocked(api.tenants.remove).mockReset();
  useToasts.setState({ toasts: [] });
});

describe("TenantsSection", () => {
  it("lists tenants with their address and email", () => {
    renderSection();

    expect(screen.getByRole("heading", { name: "Locataires" })).toBeVisible();
    expect(screen.getByText("Mme Locataire")).toBeVisible();
    expect(
      screen.getByText("12 rue de la République, 75000 Paris"),
    ).toBeVisible();
    expect(screen.getByText("locataire@exemple.fr")).toBeVisible();
    expect(screen.getByText("E-mail non renseigné")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Modifier Mme Locataire" }),
    ).toBeVisible();
  });

  it("renders dense column headers above the tenants list", () => {
    renderSection();

    const headers = document.querySelector(
      '[data-cy="tenants-headers"]',
    ) as HTMLElement;
    expect(headers).not.toBeNull();
    expect(headers).toHaveAttribute("role", "row");
    expect(headers).toHaveClass("hidden", "md:grid");
    expect(
      within(headers)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Locataire", "Adresse", "E-mail", "Actions"]);
    const table = headers.closest('[role="table"]') as HTMLElement;
    expect(table).toHaveClass("tenants-section-table");
  });

  it("shows the loading, empty and error states", async () => {
    tenantsState = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    const loading = render(
      <QueryClientProvider client={new QueryClient()}>
        <TenantsSection />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Chargement des locataires…")).toBeVisible();
    loading.unmount();

    tenantsState = readyQuery([]);
    const empty = render(
      <QueryClientProvider client={new QueryClient()}>
        <TenantsSection />
      </QueryClientProvider>,
    );
    expect(
      screen.getByText(
        "Aucun locataire configuré. Ajoutez le locataire du logement.",
      ),
    ).toBeVisible();
    empty.unmount();

    const refetch = vi.fn();
    tenantsState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Locataires indisponibles"),
      refetch,
    };
    renderSection();
    expect(screen.getByText("Locataires indisponibles")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("creates a tenant with an email and closes the modal", async () => {
    vi.mocked(api.tenants.create).mockResolvedValue({
      id: 8,
      name: "M. Nouveau",
      address: null,
      email: "nouveau@exemple.fr",
    });
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Ajouter un locataire" }),
    );
    await user.type(screen.getByLabelText("Nom du locataire"), " M. Nouveau ");
    await user.type(
      screen.getByLabelText("Adresse e-mail"),
      "nouveau@exemple.fr",
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.tenants.create).toHaveBeenCalledWith({
        name: "M. Nouveau",
        address: null,
        phone: "",
        email: "nouveau@exemple.fr",
        addressNote: "",
      }),
    );
    expect(
      screen.queryByRole("heading", { name: "Ajouter un locataire" }),
    ).toBeNull();
    expect(toastMessages()).toContain("Locataire « M. Nouveau » ajouté.");
  });

  it("rejects an invalid email in French", async () => {
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Ajouter un locataire" }),
    );
    await user.type(screen.getByLabelText("Nom du locataire"), "M. Nouveau");
    await user.type(screen.getByLabelText("Adresse e-mail"), "invalide");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(
      await screen.findByText("Saisissez une adresse e-mail valide."),
    ).toBeVisible();
    expect(api.tenants.create).not.toHaveBeenCalled();
  });

  it("updates a tenant and sends its email", async () => {
    vi.mocked(api.tenants.update).mockResolvedValue({
      ...TENANT,
      email: "nouvelle@exemple.fr",
    });
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Modifier Mme Locataire" }),
    );
    expect(screen.getByLabelText("Nom du locataire")).toHaveValue(
      "Mme Locataire",
    );
    await user.clear(screen.getByLabelText("Adresse e-mail"));
    await user.type(
      screen.getByLabelText("Adresse e-mail"),
      "nouvelle@exemple.fr",
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.tenants.update).toHaveBeenCalledWith(2, {
        name: "Mme Locataire",
        address: "12 rue de la République, 75000 Paris",
        phone: "",
        email: "nouvelle@exemple.fr",
        addressNote: "",
      }),
    );
    expect(toastMessages()).toContain(
      "Locataire « Mme Locataire » mis à jour.",
    );
  });

  it("deletes a tenant after confirmation in French", async () => {
    vi.mocked(api.tenants.remove).mockResolvedValue(undefined);
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Supprimer Mme Locataire" }),
    );
    expect(await screen.findByText("Supprimer ce locataire ?")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Supprimer le locataire" }),
    );

    await waitFor(() => expect(api.tenants.remove).toHaveBeenCalledWith(2));
    await waitFor(() =>
      expect(toastMessages()).toContain("Locataire supprimé."),
    );
  });

  it("filters and sorts the tenants with a live count", async () => {
    renderSection();
    const user = userEvent.setup();

    expect(
      document.querySelector('[data-cy="filter-count-tenants"]'),
    ).toHaveTextContent("2 sur 2");

    await user.type(screen.getByLabelText("Filtrer la liste"), "elodie");
    expect(tenantOrder()).toEqual([3]);
    await user.click(
      document.querySelector('[data-cy="filter-clear-tenants"]') as HTMLElement,
    );

    await user.click(
      document.querySelector('[data-cy="sort-tenants-email"]') as HTMLElement,
    );
    expect(tenantOrder()).toEqual([3, 2]);
  });

  it("renders the tenants list and actions in English", async () => {
    await i18n.changeLanguage("en");
    renderSection();

    expect(screen.getByRole("heading", { name: "Tenants" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Add a tenant" })).toBeVisible();
    expect(screen.getByText("No email provided")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Edit Mme Locataire" }),
    ).toBeVisible();

    await i18n.changeLanguage("fr");
  });
});
