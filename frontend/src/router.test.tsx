import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { NotFoundPage, routeErrorMessage, router } from "./router";

describe("router", () => {
  it("exposes the dedicated /templates route", () => {
    const paths = (router.routes[0]?.children ?? []).map((route) => route.path);

    expect(paths).toContain("templates");
    expect(paths).toContain("configuration/entreprise");
    expect(paths).toContain("configuration/lmnp");
  });

  it("renders the French not-found page with a link back to generation", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Erreur 404")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Page introuvable" }),
    ).toBeVisible();
    expect(screen.getByText(/Vos brouillons restent conservés/)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Revenir à la génération" }),
    ).toHaveAttribute("href", "/generer/quittance");
  });

  it("formats route errors in French", () => {
    expect(
      routeErrorMessage({
        status: 404,
        statusText: "Introuvable",
        internal: true,
        data: null,
      }),
    ).toBe("404 — Introuvable");
    expect(routeErrorMessage(new Error("Échec du chargement."))).toBe(
      "Échec du chargement.",
    );
    expect(routeErrorMessage(null)).toBe("Une erreur inattendue est survenue.");
  });
});
