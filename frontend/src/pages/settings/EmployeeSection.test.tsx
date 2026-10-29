import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { EmployeeDto } from "@/api/types";
import i18n from "@/i18n";
import { useToasts } from "@/state/toasts";
import { EmployeeSection } from "./EmployeeSection";

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
}

let employeesState: QueryLike<EmployeeDto[]>;

vi.mock("@/api/endpoints", () => ({
  api: {
    employees: {
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
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useEmployees: () => employeesState,
    useSignatures: () => readyQuery([]),
  };
});

const CEO: EmployeeDto = {
  id: 3,
  companyId: 1,
  firstName: "Camille",
  lastName: "Martin",
  email: "camille.martin@exemple.fr",
  title: "CEO",
};

const CFO: EmployeeDto = {
  id: 4,
  companyId: 1,
  firstName: "Élodie",
  lastName: "Zéphyr",
  email: "elodie@exemple.fr",
  address: "2 rue de l'Église, 75005 Paris",
  title: "CFO",
  signatureCount: 2,
};

/** Employee ids in DOM order, read on the row items. */
function employeeOrder(): number[] {
  return [...document.querySelectorAll('[data-cy^="employee-"]')]
    .map((element) =>
      Number(
        (element as HTMLElement).dataset.cy?.replace("employee-", "") ?? NaN,
      ),
    )
    .filter((id) => Number.isInteger(id));
}

function readyQuery(data: EmployeeDto[]): QueryLike<EmployeeDto[]> {
  return {
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

function renderSection(companyId: number | null = 1) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <EmployeeSection companyId={companyId} />
    </QueryClientProvider>,
  );
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

beforeEach(() => {
  employeesState = readyQuery([CEO]);
  vi.mocked(api.employees.create).mockReset();
  vi.mocked(api.employees.update).mockReset();
  vi.mocked(api.employees.delete).mockReset();
  useToasts.setState({ toasts: [] });
});

describe("EmployeeSection", () => {
  it("lists the employees with their French title and email", () => {
    renderSection();

    expect(screen.getByText("Camille Martin")).toBeVisible();
    expect(screen.getByText("PDG")).toBeVisible();
    expect(screen.getByText("camille.martin@exemple.fr")).toBeVisible();
    expect(screen.getByText("Adresse non renseignée")).toBeVisible();
    expect(screen.getByText("0 signature")).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Modifier le salarié Camille Martin",
      }),
    ).toBeVisible();
  });

  it("renders dense column headers above the employee list", () => {
    renderSection();

    const headers = document.querySelector(
      '[data-cy="employees-headers"]',
    ) as HTMLElement;
    expect(headers).not.toBeNull();
    expect(headers).toHaveClass("hidden", "md:grid");
    expect(within(headers).getByText("Salarié")).toBeVisible();
    expect(within(headers).getByText("Intitulé")).toBeVisible();
    expect(within(headers).getByText("Coordonnées")).toBeVisible();
    expect(within(headers).getByText("Signatures")).toBeVisible();
  });

  it("aligns each employee row cell and its tabular signatures column", () => {
    renderSection();

    const row = document.querySelector('[data-cy="employee-3"]') as HTMLElement;
    expect(row).toHaveClass("employee-section-item");
    expect(row.querySelector(".employee-section-cell-name")).toHaveTextContent(
      "Camille Martin",
    );
    expect(row.querySelector(".employee-section-cell-title")).toHaveTextContent(
      "PDG",
    );
    expect(
      row.querySelector(".employee-section-cell-contact"),
    ).toHaveTextContent("camille.martin@exemple.fr");
    const signatures = row.querySelector('[data-cy="employee-signatures-3"]');
    expect(signatures).toHaveClass(
      "employee-section-cell",
      "number",
      "text-right",
    );
    expect(row.querySelector(".employee-section-cell-actions")).not.toBeNull();
  });

  it("shows the loading then empty states", () => {
    employeesState = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    const loading = render(
      <QueryClientProvider client={new QueryClient()}>
        <EmployeeSection companyId={1} />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Chargement des salariés…")).toBeVisible();
    loading.unmount();

    employeesState = readyQuery([]);
    renderSection();
    expect(
      screen.getByText(
        "Aucun salarié dans cette société. Ajoutez le gérant et les salariés signataires.",
      ),
    ).toBeVisible();
  });

  it("shows the load error and retries", async () => {
    const refetch = vi.fn();
    employeesState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Salariés indisponibles"),
      refetch,
    };
    renderSection();

    expect(screen.getByText("Salariés indisponibles")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("updates an employee and confirms in French", async () => {
    vi.mocked(api.employees.update).mockResolvedValue({
      id: 3,
      companyId: 1,
      firstName: "Camille",
      lastName: "Durand",
      title: "CFO",
    });
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", {
        name: "Modifier le salarié Camille Martin",
      }),
    );
    expect(
      screen.getByRole("heading", { name: "Modifier le salarié" }),
    ).toBeVisible();

    await user.clear(screen.getByLabelText("Prénom"));
    await user.type(screen.getByLabelText("Prénom"), "Camille");
    await user.clear(screen.getByLabelText("Nom"));
    await user.type(screen.getByLabelText("Nom"), "Durand");
    await user.selectOptions(screen.getByLabelText("Intitulé"), "CFO");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.employees.update).toHaveBeenCalledWith(3, {
        companyId: 1,
        firstName: "Camille",
        lastName: "Durand",
        address: null,
        email: "camille.martin@exemple.fr",
        title: "CFO",
        issuePlace: null,
      }),
    );
    await waitFor(() =>
      expect(toastMessages()).toContain("Salarié mis à jour."),
    );
    expect(
      screen.getByRole("heading", { name: "Modifier le salarié" }),
    ).toBeVisible();
    expect(
      within(
        document.querySelector('[data-cy="employee-form"]') as HTMLElement,
      ).getByText("Signatures"),
    ).toBeVisible();
  });

  it("prefills, trims and clears the employee issue place", async () => {
    employeesState = readyQuery([{ ...CEO, issuePlace: "Paris" }]);
    vi.mocked(api.employees.update).mockResolvedValue({
      ...CEO,
      issuePlace: "Lyon",
    });
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", {
        name: "Modifier le salarié Camille Martin",
      }),
    );
    const issuePlace = screen.getByLabelText("Lieu d’émission");
    expect(issuePlace).toHaveValue("Paris");

    await user.clear(issuePlace);
    await user.type(issuePlace, "  Lyon  ");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.employees.update).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ issuePlace: "Lyon" }),
      ),
    );

    await user.clear(issuePlace);
    await user.click(screen.getByRole("button", { name: "Valider" }));
    await waitFor(() =>
      expect(api.employees.update).toHaveBeenLastCalledWith(
        3,
        expect.objectContaining({ issuePlace: null }),
      ),
    );
  });

  it("renders the form in a modal and closes on Annuler or Escape without saving", async () => {
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Ajouter un salarié" }),
    );
    expect(
      document.querySelector(
        '[data-cy="dialogue-employee-form"] [data-cy="employee-form"]',
      ),
    ).not.toBeNull();

    await user.type(screen.getByLabelText("Prénom"), "Alex");
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(api.employees.create).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-cy="dialogue-employee-form"]'),
    ).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Ajouter un salarié" }),
    );
    await user.keyboard("{Escape}");
    expect(api.employees.create).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-cy="dialogue-employee-form"]'),
    ).toBeNull();
  });

  it("surfaces an update failure in the form", async () => {
    vi.mocked(api.employees.update).mockRejectedValue(
      new Error("Mise à jour refusée"),
    );
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", {
        name: "Modifier le salarié Camille Martin",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Mise à jour refusée",
    );
  });

  it("deletes an employee after confirmation", async () => {
    vi.mocked(api.employees.delete).mockResolvedValue(undefined);
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", {
        name: "Supprimer le salarié Camille Martin",
      }),
    );
    expect(await screen.findByText("Supprimer ce salarié ?")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Supprimer le salarié" }),
    );

    await waitFor(() => expect(api.employees.delete).toHaveBeenCalledWith(3));
    await waitFor(() => expect(toastMessages()).toContain("Salarié supprimé."));
  });

  it("renders the employee list, titles and actions in English", async () => {
    await i18n.changeLanguage("en");
    employeesState = readyQuery([
      CEO,
      {
        ...CEO,
        id: 4,
        firstName: "Alex",
        lastName: "Durand",
        signatureCount: 2,
      },
    ]);
    renderSection();

    expect(screen.getByRole("heading", { name: "Employees" })).toBeVisible();
    const headers = document.querySelector(
      '[data-cy="employees-headers"]',
    ) as HTMLElement;
    expect(within(headers).getByText("Employee")).toBeVisible();
    expect(within(headers).getByText("Title")).toBeVisible();
    expect(within(headers).getByText("Contact details")).toBeVisible();
    expect(screen.getAllByText("CEO")).toHaveLength(2);
    expect(screen.getAllByText("No address provided")).toHaveLength(2);
    expect(screen.getByText("0 signatures")).toBeVisible();
    expect(screen.getByText("2 signatures")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Add an employee" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Edit employee Camille Martin" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Delete employee Camille Martin" }),
    ).toBeVisible();
  });

  it("renders the employee form and its validation in English", async () => {
    await i18n.changeLanguage("en");
    renderSection();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add an employee" }));

    expect(
      screen.getByRole("heading", { name: "Add an employee" }),
    ).toBeVisible();
    expect(screen.getByLabelText("First name")).toBeVisible();
    expect(screen.getByLabelText("Last name")).toBeVisible();
    expect(screen.getByLabelText("Email address")).toBeVisible();
    expect(screen.getByLabelText("Title")).toBeVisible();
    expect(screen.getByRole("option", { name: "Accountant" })).toBeVisible();
    expect(screen.getByLabelText("Issue place")).toBeVisible();
    expect(screen.getByLabelText("Personal address")).toBeVisible();
    expect(
      screen.getByText(
        "Save the employee to add signatures without closing this window.",
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("The employee's first name is required."),
    ).toBeVisible();
    expect(
      screen.getByText("The employee's last name is required."),
    ).toBeVisible();
  });

  it("confirms an employee deletion in English and toasts in English", async () => {
    await i18n.changeLanguage("en");
    vi.mocked(api.employees.delete).mockResolvedValue(undefined);
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Delete employee Camille Martin" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Delete this employee?",
    });
    expect(dialog).toHaveTextContent(
      "“Camille Martin” will no longer be offered.",
    );
    await user.click(
      screen.getByRole("button", { name: "Delete the employee" }),
    );

    await waitFor(() => expect(api.employees.delete).toHaveBeenCalledWith(3));
    await waitFor(() => expect(toastMessages()).toContain("Employee deleted."));
  });

  it("reports a delete failure as a toast", async () => {
    vi.mocked(api.employees.delete).mockRejectedValue(
      new Error("Salarié porteur de signatures"),
    );
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", {
        name: "Supprimer le salarié Camille Martin",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Supprimer le salarié" }),
    );

    await waitFor(() =>
      expect(toastMessages()).toContain("Salarié porteur de signatures"),
    );
    expect(
      screen.queryByRole("dialog", { name: "Supprimer ce salarié ?" }),
    ).toBeNull();
  });

  it("filters the employees accent- and case-insensitively with a live count", async () => {
    employeesState = readyQuery([CEO, CFO]);
    renderSection();
    const user = userEvent.setup();

    expect(
      document.querySelector('[data-cy="filter-count-employees"]'),
    ).toHaveTextContent("2 sur 2");

    await user.type(screen.getByLabelText("Filtrer la liste"), "elodie");

    expect(document.querySelector('[data-cy="employee-4"]')).not.toBeNull();
    expect(document.querySelector('[data-cy="employee-3"]')).toBeNull();
    expect(
      document.querySelector('[data-cy="filter-count-employees"]'),
    ).toHaveTextContent("1 sur 2");

    await user.click(
      document.querySelector(
        '[data-cy="filter-clear-employees"]',
      ) as HTMLElement,
    );
    expect(employeeOrder()).toEqual([3, 4]);

    await user.type(screen.getByLabelText("Filtrer la liste"), "pdg");
    expect(document.querySelector('[data-cy="employee-3"]')).not.toBeNull();
    expect(document.querySelector('[data-cy="employee-4"]')).toBeNull();
  });

  it("shows a no-match message instead of the headers and rows", async () => {
    employeesState = readyQuery([CEO, CFO]);
    renderSection();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Filtrer la liste"), "zzz");

    expect(
      document.querySelector('[data-cy="no-results-employees"]'),
    ).toHaveTextContent("Aucun résultat pour « zzz ».");
    expect(document.querySelector('[data-cy="employees-headers"]')).toBeNull();
    expect(employeeOrder()).toEqual([]);
    expect(
      document.querySelector('[data-cy="filter-count-employees"]'),
    ).toHaveTextContent("0 sur 2");
  });

  it("sorts the employees and toggles the direction", async () => {
    employeesState = readyQuery([CFO, CEO]);
    renderSection();
    const user = userEvent.setup();

    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["Salarié", "Intitulé", "Signatures"]);
    expect(employeeOrder()).toEqual([3, 4]);

    await user.selectOptions(screen.getByLabelText("Trier par"), "signatures");
    expect(employeeOrder()).toEqual([3, 4]);

    await user.click(screen.getByRole("button", { name: "Tri croissant" }));
    expect(employeeOrder()).toEqual([4, 3]);
  });

  it("hides the list toolbar when there is no employee", () => {
    employeesState = readyQuery([]);
    renderSection();

    expect(document.querySelector('[data-cy="filter-employees"]')).toBeNull();
  });
});
