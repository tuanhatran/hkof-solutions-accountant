import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
  it("renders the expanded lease summary inline, without a card header", () => {
    render(<CompanyLeaseView lease={LEASE} proRataBase="35.71" />);

    const details = document.querySelector('[data-cy="bail-societe-lie"]');
    expect(details).not.toBeNull();
    expect(details).toHaveClass("company-lease-view-details");
    expect(details).toHaveTextContent(
      "Surface professionnelle 25,00 m² · Surface totale 70,00 m²",
    );
    expect(details).toHaveTextContent("35,71 %");
    expect(
      screen.queryByRole("heading", { name: "Bail de la société" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Modifier" }),
    ).not.toBeInTheDocument();
  });

  it("shows the French no-lease sentence when the company has no lease", () => {
    render(<CompanyLeaseView lease={null} proRataBase={null} />);

    expect(document.querySelector('[data-cy="bail-societe-lie"]')).toBeNull();
    expect(screen.getByText(/^Aucun bail sélectionné/)).toBeVisible();
    expect(
      document.querySelector('[data-cy="aucun-bail-societe"]'),
    ).not.toBeNull();
  });

  it("never shows NaN when the lease surfaces are missing", () => {
    render(
      <CompanyLeaseView
        lease={{ ...LEASE, businessArea: undefined, totalArea: "" }}
        proRataBase={null}
      />,
    );

    const details = document.querySelector('[data-cy="bail-societe-lie"]');
    expect(details).toHaveTextContent(
      "Surface professionnelle — m² · Surface totale — m²",
    );
    expect(document.body.textContent).not.toContain("NaN");
  });
});
