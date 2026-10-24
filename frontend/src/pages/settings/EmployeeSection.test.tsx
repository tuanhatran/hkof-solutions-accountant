import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { EmployeeDto } from "@/api/types";
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
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return { ...actual, useEmployees: () => employeesState };
});

const CEO: EmployeeDto = {
  id: 3,
  companyId: 1,
  firstName: "Camille",
  lastName: "Martin",
  email: "camille.martin@exemple.fr",
  title: "CEO",
};

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
    expect(
      screen.getByRole("button", {
        name: "Modifier le salarié Camille Martin",
      }),
    ).toBeVisible();
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
    await user.click(
      screen.getByRole("button", { name: "Enregistrer le salarié" }),
    );

    await waitFor(() =>
      expect(api.employees.update).toHaveBeenCalledWith(3, {
        companyId: 1,
        firstName: "Camille",
        lastName: "Durand",
        email: "camille.martin@exemple.fr",
        title: "CFO",
      }),
    );
    await waitFor(() =>
      expect(toastMessages()).toContain("Salarié mis à jour."),
    );
    expect(
      screen.queryByRole("heading", { name: "Modifier le salarié" }),
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
    await user.click(
      screen.getByRole("button", { name: "Enregistrer le salarié" }),
    );

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
});
