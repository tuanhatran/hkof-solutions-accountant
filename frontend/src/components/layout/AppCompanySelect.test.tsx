import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyDto } from "@/api/types";
import { useCompanyStore } from "@/state/company";
import { AppCompanySelect } from "./AppCompanySelect";

type CompaniesState = {
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  data?: CompanyDto[];
};

let companiesState: CompaniesState;

vi.mock("@/api/queries", () => ({
  useCompanies: () => companiesState,
}));

beforeEach(() => {
  localStorage.clear();
  useCompanyStore.setState({ activeCompanyId: null });
  companiesState = {
    isPending: false,
    isError: false,
    isSuccess: true,
    data: [
      { id: 1, name: "HKOF" },
      { id: 2, name: "Autre société" },
    ],
  };
});

describe("AppCompanySelect", () => {
  it("shows the loading state", () => {
    companiesState = { isPending: true, isError: false, isSuccess: false };
    render(<AppCompanySelect />);
    expect(screen.getByText("Chargement des sociétés…")).toBeVisible();
  });

  it("shows the error state as an alert", () => {
    companiesState = { isPending: false, isError: true, isSuccess: false };
    render(<AppCompanySelect />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Impossible de charger les sociétés.",
    );
  });

  it("shows the empty state", async () => {
    companiesState = {
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [],
    };
    render(<AppCompanySelect />);
    await waitFor(() =>
      expect(
        screen.getByText(/Aucune société configurée\. Ajoutez-en une/),
      ).toBeVisible(),
    );
    expect(useCompanyStore.getState().activeCompanyId).toBeNull();
  });

  it("selects the first company and switches the active company", async () => {
    render(<AppCompanySelect />);

    const select = screen.getByLabelText("Société active");
    expect(select).toHaveAttribute("data-cy", "select-societe-active");
    await waitFor(() =>
      expect(useCompanyStore.getState().activeCompanyId).toBe(1),
    );
    expect(select).toHaveValue("1");
    expect(within(select).getByRole("option", { name: "HKOF" })).toBeVisible();

    await userEvent.setup().selectOptions(select, "2");
    expect(useCompanyStore.getState().activeCompanyId).toBe(2);
  });

  it("keeps a stored company that still exists", async () => {
    useCompanyStore.setState({ activeCompanyId: 2 });
    render(<AppCompanySelect />);

    const select = screen.getByLabelText("Société active");
    await waitFor(() => expect(select).toHaveValue("2"));
    expect(useCompanyStore.getState().activeCompanyId).toBe(2);
  });
});
