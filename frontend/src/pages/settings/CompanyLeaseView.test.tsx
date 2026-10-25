import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { LeaseDto } from "@/api/types";
import { CompanyLeaseView } from "./CompanyLeaseView";

const LEASE: LeaseDto = {
  id: 5,
  addressId: 3,
  companyId: 1,
  companyLease: true,
  landlordId: 1,
  propertyAddress: "12 rue des Lilas, 75011 Paris",
  rentExclCharges: "900.00",
  charges: "50.00",
  totalArea: "70.00",
  businessArea: "25.00",
};

describe("CompanyLeaseView", () => {
  it("renders the linked lease summary and the prorata read-only", async () => {
    const onEdit = vi.fn();
    render(
      <CompanyLeaseView lease={LEASE} proRataBase="35.71" onEdit={onEdit} />,
    );

    const details = document.querySelector('[data-cy="bail-societe-lie"]');
    expect(details).not.toBeNull();
    expect(details).toHaveTextContent("12 rue des Lilas, 75011 Paris");
    expect(details).toHaveTextContent("Loyer 900,00 € · Charges 50,00 €");
    expect(details).toHaveTextContent(
      "Surface professionnelle 25,00 m² · Surface totale 70,00 m²",
    );
    expect(
      document.querySelector('[data-cy="prorata-bail-societe"]'),
    ).toHaveTextContent("35,71 %");

    const edit = screen.getByRole("button", { name: "Modifier" });
    expect(edit).toHaveAttribute("data-cy", "btn-modifier-bail-societe");
    await userEvent.setup().click(edit);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("shows the French no-lease sentence when the company has no lease", () => {
    render(
      <CompanyLeaseView lease={null} proRataBase={null} onEdit={vi.fn()} />,
    );

    expect(document.querySelector('[data-cy="bail-societe-lie"]')).toBeNull();
    expect(screen.getByText(/^Aucun bail sélectionné/)).toBeVisible();
    expect(
      document.querySelector('[data-cy="aucun-bail-societe"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-cy="prorata-bail-societe"]'),
    ).toHaveTextContent("—");
  });

  it("never shows NaN when the lease surfaces are missing", () => {
    render(
      <CompanyLeaseView
        lease={{ ...LEASE, businessArea: undefined, totalArea: "" }}
        proRataBase={null}
        onEdit={vi.fn()}
      />,
    );

    const details = document.querySelector('[data-cy="bail-societe-lie"]');
    expect(details).toHaveTextContent(
      "Surface professionnelle — m² · Surface totale — m²",
    );
    expect(document.body.textContent).not.toContain("NaN");
  });
});
