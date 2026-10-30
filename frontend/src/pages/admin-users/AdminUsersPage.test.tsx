import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminUserDto } from "@/api/endpoints";
import { useToasts } from "@/state/toasts";
import { AdminUsersPage } from "./AdminUsersPage";

const ACCOUNTS: AdminUserDto[] = [
  {
    id: 1,
    email: "admin@exemple.fr",
    role: "ADMIN",
    companyEnabled: true,
    lmnpEnabled: true,
  },
  {
    id: 2,
    email: "societe@exemple.fr",
    role: "USER",
    companyEnabled: true,
    lmnpEnabled: false,
  },
];

const list = vi.fn<() => Promise<AdminUserDto[]>>();
const updateModules =
  vi.fn<(id: number, body: unknown) => Promise<AdminUserDto>>();
const updateRole =
  vi.fn<(id: number, body: unknown) => Promise<AdminUserDto>>();

vi.mock("@/api/endpoints", () => ({
  api: {
    adminUsers: {
      list: () => list(),
      updateModules: (id: number, body: unknown) => updateModules(id, body),
      updateRole: (id: number, body: unknown) => updateRole(id, body),
    },
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AdminUsersPage />
    </QueryClientProvider>,
  );
}

async function rowOf(email: string): Promise<HTMLElement> {
  const row = (await screen.findByText(email)).closest("tr");
  if (!(row instanceof HTMLElement)) {
    throw new Error(`Row of ${email} not found`);
  }
  return row;
}

beforeEach(() => {
  useToasts.setState({ toasts: [] });
  list.mockReset();
  updateModules.mockReset();
  updateRole.mockReset();
  list.mockResolvedValue(ACCOUNTS);
  updateModules.mockImplementation((id) =>
    Promise.resolve({
      ...ACCOUNTS.find((account) => account.id === id),
      lmnpEnabled: true,
    } as AdminUserDto),
  );
  updateRole.mockImplementation((id) =>
    Promise.resolve({
      ...ACCOUNTS.find((account) => account.id === id),
      role: "ADMIN",
    } as AdminUserDto),
  );
});

describe("AdminUsersPage", () => {
  it("lists every account with its role and module switches", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Utilisateurs" }),
    ).toBeVisible();
    expect(
      within(await rowOf("societe@exemple.fr")).getByRole("combobox", {
        name: "Rôle",
      }),
    ).toHaveValue("USER");
    expect(
      within(await rowOf("societe@exemple.fr")).getByRole("checkbox", {
        name: "Module société",
      }),
    ).toBeChecked();
    expect(
      within(await rowOf("societe@exemple.fr")).getByRole("checkbox", {
        name: "Module LMNP",
      }),
    ).not.toBeChecked();
    expect(
      within(await rowOf("admin@exemple.fr")).getByRole("combobox", {
        name: "Rôle",
      }),
    ).toHaveValue("ADMIN");
  });

  it("patches the company module when a switch changes", async () => {
    const user = userEvent.setup();
    renderPage();

    const row = await rowOf("societe@exemple.fr");
    await user.click(
      within(row).getByRole("checkbox", { name: "Module société" }),
    );

    await waitFor(() =>
      expect(updateModules).toHaveBeenCalledWith(2, { companyEnabled: false }),
    );
    await waitFor(() =>
      expect(
        useToasts.getState().toasts.map((toast) => toast.message),
      ).toContain("Modules du compte mis à jour."),
    );
  });

  it("patches the LMNP module when a switch changes", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      within(await rowOf("societe@exemple.fr")).getByRole("checkbox", {
        name: "Module LMNP",
      }),
    );

    await waitFor(() =>
      expect(updateModules).toHaveBeenCalledWith(2, { lmnpEnabled: true }),
    );
  });

  it("patches the role when the role selector changes", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(
      within(await rowOf("societe@exemple.fr")).getByRole("combobox", {
        name: "Rôle",
      }),
      "ADMIN",
    );

    await waitFor(() =>
      expect(updateRole).toHaveBeenCalledWith(2, { role: "ADMIN" }),
    );
  });

  it("shows an error state when the accounts cannot be loaded", async () => {
    list.mockRejectedValue(new Error("accès refusé"));
    renderPage();

    expect(await screen.findByText("accès refusé")).toBeVisible();
  });
});
