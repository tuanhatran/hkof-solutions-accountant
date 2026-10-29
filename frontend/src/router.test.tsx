import { render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  RouterProvider,
  createMemoryRouter,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setAuthUser } from "@/api/queries";
import { NotFoundPage, routeErrorMessage, routes } from "./router";

function collectPaths(collection: typeof routes): string[] {
  return collection.flatMap((route) => [
    ...(route.path ? [route.path] : []),
    ...(route.children ? collectPaths(route.children) : []),
  ]);
}

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  setAuthUser(null);
  fetchMock.mockReset();
  fetchMock.mockRejectedValue(new TypeError("network disabled"));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setAuthUser(null);
});

describe("router", () => {
  it("exposes the authenticated application routes and the public auth pages", () => {
    const paths = collectPaths(routes);

    expect(paths).toContain("templates");
    expect(paths).toContain("configuration/entreprise");
    expect(paths).toContain("configuration/lmnp");
    expect(paths).toContain("connexion");
    expect(paths).toContain("inscription");
    expect(paths).toContain("confirmer-email");
    expect(paths).toContain("mot-de-passe");
  });

  it("redirects an anonymous visitor of a protected page to the login page", async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ["/historique"],
    });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: "Connexion" }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe("/connexion");
  });

  it("redirects a forced password change to the password page", async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      jsonResponse({
        email: "thtran@homeofficeexpenses.local",
        mustChangePassword: true,
      }),
    );
    const router = createMemoryRouter(routes, {
      initialEntries: ["/historique"],
    });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: "Changer le mot de passe" }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe("/mot-de-passe");
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
