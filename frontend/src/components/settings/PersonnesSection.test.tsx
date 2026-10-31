import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { PersonDto } from "@/api/types";
import i18n from "@/i18n";
import { useToasts } from "@/state/toasts";
import { PersonnesSection } from "./PersonnesSection";

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
}

let personsState: QueryLike<PersonDto[]>;

const LANDLORD: PersonDto = {
  id: 1,
  name: "M. Bailleur",
  address: "1 avenue du Parc, 75011 Paris",
  signatureCount: 1,
};

const TENANT: PersonDto = {
  id: 2,
  name: "Mme Locataire",
  address: null,
  signatureCount: 0,
};

const ACCENTED: PersonDto = {
  id: 3,
  name: "Élodie Zéphyr",
  address: "2 rue de l'Église, 75005 Paris",
  signatureCount: 2,
};

/** Person ids in DOM order, read on the row items. */
function personOrder(): number[] {
  return [...document.querySelectorAll('[data-cy^="person-"]')]
    .map((element) =>
      Number(
        (element as HTMLElement).dataset.cy?.replace("person-", "") ?? NaN,
      ),
    )
    .filter((id) => Number.isInteger(id));
}

function readyQuery(data: PersonDto[]): QueryLike<PersonDto[]> {
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
    persons: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    signatures: {
      list: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
      imageUrl: (id: number) => `/api/signatures/${id}/image`,
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    usePersons: () => personsState,
    useSignatures: () => readyQuery([]),
  };
});

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <PersonnesSection />
    </QueryClientProvider>,
  );
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

beforeEach(() => {
  personsState = readyQuery([LANDLORD, TENANT]);
  vi.mocked(api.persons.create).mockReset();
  vi.mocked(api.persons.update).mockReset();
  vi.mocked(api.persons.remove).mockReset();
  useToasts.setState({ toasts: [] });
});

describe("PersonnesSection", () => {
  it("lists natural persons with their address and signature count", () => {
    renderSection();

    expect(screen.getByRole("heading", { name: "Personnes" })).toBeVisible();
    expect(screen.getByText("M. Bailleur")).toBeVisible();
    expect(screen.getByText("1 avenue du Parc, 75011 Paris")).toBeVisible();
    expect(screen.getByText("1 signature")).toBeVisible();
    expect(screen.getByText("Mme Locataire")).toBeVisible();
    expect(screen.getByText("Adresse non renseignée")).toBeVisible();
    expect(screen.getByText("0 signature")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Modifier M. Bailleur" }),
    ).toBeVisible();
  });

  it("renders dense column headers above the persons list", () => {
    renderSection();

    const headers = document.querySelector(
      '[data-cy="persons-headers"]',
    ) as HTMLElement;
    expect(headers).not.toBeNull();
    expect(headers).toHaveAttribute("role", "row");
    expect(headers).toHaveClass("hidden", "md:grid");
    expect(within(headers).getByText("Personne")).toBeVisible();
    expect(within(headers).getByText("Adresse")).toBeVisible();
    expect(within(headers).getByText("Signatures")).toBeVisible();
    expect(within(headers).getByText("Actions")).toBeVisible();
    expect(
      within(headers)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Personne", "Adresse", "Signatures", "Actions"]);
    const table = headers.closest('[role="table"]') as HTMLElement;
    expect(table).toHaveClass("personnes-section-table");
  });

  it("aligns each person row cell and its tabular signatures column", () => {
    renderSection();

    const row = document.querySelector('[data-cy="person-1"]') as HTMLElement;
    expect(row).toHaveClass("personnes-section-item");
    expect(row.querySelector(".personnes-section-cell-name")).toHaveTextContent(
      "M. Bailleur",
    );
    expect(
      row.querySelector(".personnes-section-cell-address"),
    ).toHaveTextContent("1 avenue du Parc, 75011 Paris");
    const signatures = row.querySelector('[data-cy="person-signatures-1"]');
    expect(signatures).toHaveClass("personnes-section-cell", "text-right");
    expect(row.querySelector(".personnes-section-cell-actions")).not.toBeNull();
  });

  it("shows the loading, empty and error states", async () => {
    personsState = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    const loading = render(
      <QueryClientProvider client={new QueryClient()}>
        <PersonnesSection />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Chargement des personnes…")).toBeVisible();
    loading.unmount();

    personsState = readyQuery([]);
    const empty = render(
      <QueryClientProvider client={new QueryClient()}>
        <PersonnesSection />
      </QueryClientProvider>,
    );
    expect(
      screen.getByText(
        "Aucune personne configurée. Ajoutez le bailleur ou le locataire du logement.",
      ),
    ).toBeVisible();
    empty.unmount();

    const refetch = vi.fn();
    personsState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Personnes indisponibles"),
      refetch,
    };
    renderSection();
    expect(screen.getByText("Personnes indisponibles")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("creates a person, keeps the modal open and shows the signature section", async () => {
    vi.mocked(api.persons.create).mockResolvedValue({
      id: 5,
      name: "M. Nouveau",
      address: null,
      signatureCount: 0,
    });
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Ajouter une personne" }),
    );
    await user.type(
      screen.getByLabelText("Nom de la personne"),
      " M. Nouveau ",
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.persons.create).toHaveBeenCalledWith({
        name: "M. Nouveau",
        address: null,
        issuePlace: null,
        phone: "",
        addressNote: "",
      }),
    );
    expect(
      await screen.findByText(
        "Personne enregistrée. Ajoutez ou retirez ses signatures ci-dessous.",
      ),
    ).toBeVisible();
    expect(
      within(
        document.querySelector('[data-cy="person-form"]') as HTMLElement,
      ).getByText("Signatures"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Ajouter une personne" }),
    ).toBeDisabled();
    expect(toastMessages()).toContain("Personne « M. Nouveau » ajoutée.");
  });

  it("updates a person and exposes the existing signatures", async () => {
    vi.mocked(api.persons.update).mockResolvedValue({
      ...LANDLORD,
      name: "M. Bailleur Modifié",
    });
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Modifier M. Bailleur" }),
    );
    expect(screen.getByLabelText("Nom de la personne")).toHaveValue(
      "M. Bailleur",
    );
    await user.clear(screen.getByLabelText("Nom de la personne"));
    await user.type(
      screen.getByLabelText("Nom de la personne"),
      "M. Bailleur Modifié",
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.persons.update).toHaveBeenCalledWith(1, {
        name: "M. Bailleur Modifié",
        address: "1 avenue du Parc, 75011 Paris",
        issuePlace: null,
        phone: "",
        addressNote: "",
      }),
    );
    expect(toastMessages()).toContain(
      "Personne « M. Bailleur Modifié » mise à jour.",
    );
    expect(
      within(
        document.querySelector('[data-cy="person-form"]') as HTMLElement,
      ).getByText("Signatures"),
    ).toBeVisible();
  });

  it("deletes a person after confirmation in French", async () => {
    vi.mocked(api.persons.remove).mockResolvedValue(undefined);
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Supprimer M. Bailleur" }),
    );
    expect(await screen.findByText("Supprimer cette personne ?")).toBeVisible();
    expect(
      screen.getByText(/Une personne utilisée par un bail actif/),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Supprimer la personne" }),
    );

    await waitFor(() => expect(api.persons.remove).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(toastMessages()).toContain("Personne supprimée."),
    );
  });

  it("renders the persons list and actions in English", async () => {
    await i18n.changeLanguage("en");
    personsState = readyQuery([
      LANDLORD,
      TENANT,
      { ...TENANT, id: 3, name: "M. Voisin", signatureCount: 2 },
    ]);
    renderSection();

    expect(screen.getByRole("heading", { name: "People" })).toBeVisible();
    const headers = document.querySelector(
      '[data-cy="persons-headers"]',
    ) as HTMLElement;
    expect(within(headers).getByText("Person")).toBeVisible();
    expect(within(headers).getByText("Address")).toBeVisible();
    expect(within(headers).getByText("Signatures")).toBeVisible();
    expect(screen.getByText("M. Bailleur")).toBeVisible();
    expect(screen.getByText("1 signature")).toBeVisible();
    expect(screen.getByText("0 signatures")).toBeVisible();
    expect(screen.getByText("2 signatures")).toBeVisible();
    expect(screen.getAllByText("No address provided")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Add a person" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Edit M. Bailleur" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Delete M. Bailleur" }),
    ).toBeVisible();
  });

  it("shows the empty state and the deletion dialog in English", async () => {
    await i18n.changeLanguage("en");
    personsState = readyQuery([]);
    const empty = render(
      <QueryClientProvider client={new QueryClient()}>
        <PersonnesSection />
      </QueryClientProvider>,
    );
    expect(screen.getByText(/No person configured/)).toBeVisible();
    empty.unmount();

    vi.mocked(api.persons.remove).mockResolvedValue(undefined);
    personsState = readyQuery([LANDLORD]);
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Delete M. Bailleur" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Delete this person?",
    });
    expect(dialog).toHaveTextContent(
      "“M. Bailleur” will no longer be offered.",
    );
    expect(dialog).toHaveTextContent("A person used by an active lease");
    await user.click(screen.getByRole("button", { name: "Delete the person" }));

    await waitFor(() => expect(api.persons.remove).toHaveBeenCalledWith(1));
    await waitFor(() => expect(toastMessages()).toContain("Person deleted."));
  });

  it("reports a delete failure in French", async () => {
    vi.mocked(api.persons.remove).mockRejectedValue(
      new Error("Cette personne est utilisée par un bail actif."),
    );
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Supprimer M. Bailleur" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Supprimer la personne" }),
    );

    await waitFor(() =>
      expect(toastMessages()).toContain(
        "Cette personne est utilisée par un bail actif.",
      ),
    );
    expect(
      screen.queryByRole("dialog", { name: "Supprimer cette personne ?" }),
    ).toBeNull();
  });

  it("filters the persons on their name and address with a live count", async () => {
    personsState = readyQuery([LANDLORD, TENANT, ACCENTED]);
    renderSection();
    const user = userEvent.setup();

    expect(
      document.querySelector('[data-cy="filter-count-persons"]'),
    ).toHaveTextContent("3 sur 3");

    await user.type(screen.getByLabelText("Filtrer la liste"), "elodie");
    expect(personOrder()).toEqual([3]);
    expect(
      document.querySelector('[data-cy="filter-count-persons"]'),
    ).toHaveTextContent("1 sur 3");

    await user.click(
      document.querySelector('[data-cy="filter-clear-persons"]') as HTMLElement,
    );
    await user.type(screen.getByLabelText("Filtrer la liste"), "parc");
    expect(personOrder()).toEqual([1]);
  });

  it("shows a no-match message instead of the headers and rows", async () => {
    personsState = readyQuery([LANDLORD, TENANT, ACCENTED]);
    renderSection();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Filtrer la liste"), "zzz");

    expect(
      document.querySelector('[data-cy="no-results-persons"]'),
    ).toHaveTextContent("Aucun résultat pour « zzz ».");
    expect(document.querySelector('[data-cy="persons-headers"]')).toBeNull();
    expect(personOrder()).toEqual([]);
  });

  it("sorts the persons from the column headers with a direction toggle", async () => {
    personsState = readyQuery([LANDLORD, TENANT, ACCENTED]);
    renderSection();
    const user = userEvent.setup();

    expect(personOrder()).toEqual([3, 1, 2]);
    const signatures = document.querySelector(
      '[data-cy="sort-persons-signatures"]',
    ) as HTMLElement;
    await user.click(signatures);
    expect(personOrder()).toEqual([2, 1, 3]);
    expect(signatures.closest('[role="columnheader"]')).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    await user.click(signatures);
    expect(personOrder()).toEqual([3, 1, 2]);
    expect(signatures.closest('[role="columnheader"]')).toHaveAttribute(
      "aria-sort",
      "descending",
    );

    await user.click(
      document.querySelector('[data-cy="sort-persons-address"]') as HTMLElement,
    );
    expect(personOrder()).toEqual([2, 1, 3]);
  });

  it("keeps the search, live count and compact sort in the card header", async () => {
    personsState = readyQuery([LANDLORD, TENANT, ACCENTED]);
    renderSection();
    const user = userEvent.setup();

    const header = document.querySelector(".card-header") as HTMLElement;
    expect(within(header).getByLabelText("Filtrer la liste")).toBeVisible();
    expect(
      header.querySelector('[data-cy="filter-count-persons"]'),
    ).toHaveTextContent("3 sur 3");
    expect(document.querySelector(".list-toolbar")).toBeNull();

    await user.selectOptions(
      document.querySelector('[data-cy="sort-persons-compact"]') as HTMLElement,
      "signatures",
    );
    expect(personOrder()).toEqual([2, 1, 3]);

    await user.click(
      document.querySelector(
        '[data-cy="sort-persons-compact-direction"]',
      ) as HTMLElement,
    );
    expect(personOrder()).toEqual([3, 1, 2]);
  });

  it("hides the list toolbar when there is no person", () => {
    personsState = readyQuery([]);
    renderSection();

    expect(document.querySelector('[data-cy="filter-persons"]')).toBeNull();
  });
});
