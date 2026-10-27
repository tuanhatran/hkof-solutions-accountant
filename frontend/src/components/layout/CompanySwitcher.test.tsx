import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyDto } from "@/api/types";
import i18n from "@/i18n";
import { useCompanyStore } from "@/state/company";
import { CompanySwitcher } from "./CompanySwitcher";

type CompaniesState = {
  isPending: boolean;
  isError: boolean;
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
    data: [
      { id: 1, name: "HKOF" },
      { id: 2, name: "Autre société" },
    ],
  };
});

describe("CompanySwitcher", () => {
  it("shows the active company with every company option", () => {
    useCompanyStore.setState({ activeCompanyId: 1 });
    render(<CompanySwitcher />);

    const select = screen.getByRole("combobox", { name: "Société active" });
    expect(select).toHaveAttribute("id", "select-societe-active");
    expect(select).toHaveAttribute("data-cy", "select-societe-active");
    expect(select).toHaveValue("1");
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["HKOF", "Autre société"]);
  });

  it("stores the selected company and re-renders the selection", async () => {
    useCompanyStore.setState({ activeCompanyId: 1 });
    render(<CompanySwitcher />);
    const user = userEvent.setup();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Société active" }),
      "2",
    );

    expect(useCompanyStore.getState().activeCompanyId).toBe(2);
    expect(
      screen.getByRole("combobox", { name: "Société active" }),
    ).toHaveValue("2");
  });

  it("renders nothing while the companies are loading", () => {
    useCompanyStore.setState({ activeCompanyId: 1 });
    companiesState = { isPending: true, isError: false };
    render(<CompanySwitcher />);

    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("renders nothing when the companies fail to load", () => {
    useCompanyStore.setState({ activeCompanyId: 1 });
    companiesState = { isPending: false, isError: true };
    render(<CompanySwitcher />);

    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("renders nothing without a company or without an active id", () => {
    companiesState = { isPending: false, isError: false, data: [] };
    const { unmount } = render(<CompanySwitcher />);
    expect(screen.queryByRole("combobox")).toBeNull();
    unmount();

    companiesState = {
      isPending: false,
      isError: false,
      data: [{ id: 1, name: "HKOF" }],
    };
    render(<CompanySwitcher />);
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("translates the label into English without changing the selector id", async () => {
    useCompanyStore.setState({ activeCompanyId: 1 });
    await i18n.changeLanguage("en");
    render(<CompanySwitcher />);

    const select = screen.getByRole("combobox", { name: "Active company" });
    expect(select).toHaveAttribute("id", "select-societe-active");
    expect(select).toHaveValue("1");
  });
});
