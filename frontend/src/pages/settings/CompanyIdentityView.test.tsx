import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CompanyDto } from "@/api/types";
import i18n from "@/i18n";
import { CompanyIdentityView } from "./CompanyIdentityView";

const COMPANY: CompanyDto = {
  id: 1,
  name: "HKOF",
  legalForm: "EURL",
  siren: "123 456 789",
  address: "1 rue de la Paix, 75002 Paris",
  managerName: "Camille Martin",
  leaseId: 5,
  proRataBase: "35.71",
  issuePlace: "Paris",
};

function rowValue(label: string): string {
  const rows = document.querySelectorAll(
    '[data-cy="company-information"] .company-identity-view-row',
  );
  for (const row of rows) {
    const dt = row.querySelector("dt");
    if (dt?.textContent === label) {
      return row.querySelector("dd")?.textContent ?? "";
    }
  }
  throw new Error(`row not found: ${label}`);
}

describe("CompanyIdentityView", () => {
  it("renders every identity field under company-information with a Modifier button", async () => {
    const onEdit = vi.fn();
    render(<CompanyIdentityView company={COMPANY} onEdit={onEdit} />);

    expect(
      document.querySelector('[data-cy="company-information"]'),
    ).not.toBeNull();
    expect(rowValue("Raison sociale")).toBe("HKOF");
    expect(rowValue("Forme juridique")).toBe("EURL");
    expect(rowValue("SIREN")).toBe("123 456 789");
    expect(rowValue("Adresse")).toBe("1 rue de la Paix, 75002 Paris");
    expect(rowValue("Gérant")).toBe("Camille Martin");
    expect(rowValue("Lieu d’émission")).toBe("Paris");

    const edit = screen.getByRole("button", { name: "Modifier" });
    expect(edit).toHaveAttribute("data-cy", "btn-modifier-societe");
    await userEvent.setup().click(edit);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("renders an em dash for empty values and never an input", () => {
    render(
      <CompanyIdentityView
        company={{ ...COMPANY, siren: "", managerName: undefined }}
        onEdit={vi.fn()}
      />,
    );

    expect(rowValue("SIREN")).toBe("—");
    expect(rowValue("Gérant")).toBe("—");
    expect(
      document.querySelector('[data-cy="company-information"] input'),
    ).toBeNull();
  });

  it("renders every identity field in English and relabels without a reload", async () => {
    render(<CompanyIdentityView company={COMPANY} onEdit={vi.fn()} />);
    expect(rowValue("Raison sociale")).toBe("HKOF");

    await act(async () => {
      await i18n.changeLanguage("en");
    });

    expect(rowValue("Company name")).toBe("HKOF");
    expect(rowValue("Legal form")).toBe("EURL");
    expect(rowValue("SIREN")).toBe("123 456 789");
    expect(rowValue("Address")).toBe("1 rue de la Paix, 75002 Paris");
    expect(rowValue("Manager")).toBe("Camille Martin");
    expect(rowValue("Place of issue")).toBe("Paris");
    expect(
      screen.getByRole("heading", { name: "Company identity" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Values used in the headers of rent receipts and expense statements.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Edit" })).toHaveAttribute(
      "data-cy",
      "btn-modifier-societe",
    );
  });
});
