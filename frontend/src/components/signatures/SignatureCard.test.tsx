import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignatureCard } from "./SignatureCard";

describe("SignatureCard", () => {
  it("renders generic labels when the signature metadata is missing", () => {
    render(<SignatureCard signature={{}} onDelete={vi.fn()} />);

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getAllByText("Signature").length).toBeGreaterThan(0);
    expect(screen.getByText("Signature du gérant")).toBeInTheDocument();
    expect(screen.getByText(/Ajoutée le/)).toHaveTextContent("Ajoutée le —");
    expect(
      screen.getByRole("button", { name: "Supprimer la signature" }),
    ).toBeInTheDocument();
  });

  it("shows the unlinked landlord label when the landlord name is missing", () => {
    render(
      <SignatureCard
        signature={{ id: 3, type: "LANDLORD", landlordName: null }}
        onDelete={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("img", { name: "Signature" }).getAttribute("src"),
    ).toBe("/api/signatures/3/image");
    expect(screen.getByText("Non liée")).toBeInTheDocument();
  });
});
