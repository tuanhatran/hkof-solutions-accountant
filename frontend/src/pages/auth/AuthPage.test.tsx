import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { setAuthUser } from "@/api/queries";
import { AuthPage, type AuthMode } from "./AuthPage";

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

function emptyResponse(status = 204): Response {
  return {
    ok: true,
    status,
    headers: new Headers(),
    text: async () => "",
  } as unknown as Response;
}

const fetchMock = vi.fn();

function renderPage(mode: AuthMode, entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/confirm-email" element={<AuthPage mode="confirm" />} />
        <Route path="/password" element={<AuthPage mode="password" />} />
        <Route path="/generate/rent-receipt" element={<p>Espace protégé</p>} />
        <Route path="/accueil" element={<AuthPage mode={mode} />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("fr");
  setAuthUser(null);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setAuthUser(null);
});

describe("AuthPage login", () => {
  it("labels the fields in French and opens the session", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        email: "alice@example.test",
        mustChangePassword: false,
      }),
    );
    const user = userEvent.setup();
    renderPage("login", "/login");

    expect(screen.getByRole("heading", { name: "Connexion" })).toBeVisible();
    await user.type(
      screen.getByLabelText("Adresse e-mail"),
      "alice@example.test",
    );
    await user.type(screen.getByLabelText("Mot de passe"), "motdepasse");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Espace protégé")).toBeVisible();
    const [path, init] = fetchMock.mock.calls.at(-1) ?? [];
    expect(path).toBe("/api/auth/login");
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({
        email: "alice@example.test",
        password: "motdepasse",
      }),
    });
  });

  it("shows French inline validation errors without calling the API", async () => {
    const user = userEvent.setup();
    renderPage("login", "/login");

    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(screen.getByText("L'adresse e-mail est obligatoire.")).toBeVisible();
    expect(screen.getByText("Le mot de passe est obligatoire.")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the French API error for wrong credentials", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          code: "INVALID_CREDENTIALS",
          detail: "Adresse e-mail ou mot de passe incorrect.",
        },
        401,
      ),
    );
    const user = userEvent.setup();
    renderPage("login", "/login");

    await user.type(
      screen.getByLabelText("Adresse e-mail"),
      "alice@example.test",
    );
    await user.type(screen.getByLabelText("Mot de passe"), "mauvais");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(
      await screen.findByText("Adresse e-mail ou mot de passe incorrect."),
    ).toBeVisible();
  });

  it("displays the language toggle and switches between French and English", async () => {
    const user = userEvent.setup();
    renderPage("login", "/login");

    const languageSelector = screen.getByRole("group", { name: "Langue" });
    expect(languageSelector).toBeVisible();

    const enButton = screen.getByRole("button", { name: "English" });
    await user.click(enButton);

    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeVisible();

    const frButton = screen.getByRole("button", { name: "Français" });
    await user.click(frButton);

    expect(
      await screen.findByRole("heading", { name: "Connexion" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeVisible();
  });
});

describe("AuthPage register", () => {
  it("rejects a mismatched confirmation before registering", async () => {
    const user = userEvent.setup();
    renderPage("register", "/register");

    await user.type(
      screen.getByLabelText("Adresse e-mail"),
      "alice@example.test",
    );
    await user.type(screen.getByLabelText("Mot de passe"), "motdepasse");
    await user.type(
      screen.getByLabelText("Confirmer le mot de passe"),
      "autre-mot-de-passe",
    );
    await user.click(screen.getByRole("button", { name: "Créer le compte" }));

    expect(
      screen.getByText("Les mots de passe ne correspondent pas."),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("registers, shows the confirmation message and can resend it", async () => {
    fetchMock.mockResolvedValue(emptyResponse());
    const user = userEvent.setup();
    renderPage("register", "/register");

    await user.type(
      screen.getByLabelText("Adresse e-mail"),
      "alice@example.test",
    );
    await user.type(screen.getByLabelText("Mot de passe"), "motdepasse");
    await user.type(
      screen.getByLabelText("Confirmer le mot de passe"),
      "motdepasse",
    );
    await user.click(screen.getByRole("button", { name: "Créer le compte" }));

    expect(
      await screen.findByText(
        /Un e-mail de confirmation vient de vous être envoyé/,
      ),
    ).toBeVisible();
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe("/api/auth/register");

    await user.click(
      screen.getByRole("button", {
        name: "Renvoyer l'e-mail de confirmation",
      }),
    );
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(
      "/api/auth/resend-confirmation",
    );
    expect(
      await screen.findByText("E-mail de confirmation renvoyé."),
    ).toBeVisible();
  });

  it("renders module selection checkboxes with both checked by default", () => {
    renderPage("register", "/register");

    const agency = screen.getByLabelText(/Agence immobilière/);
    const company = screen.getByLabelText(/Société/);

    expect(agency).toBeChecked();
    expect(company).toBeChecked();
  });

  it("shows French inline validation error when both modules are unchecked", async () => {
    const user = userEvent.setup();
    renderPage("register", "/register");

    await user.type(
      screen.getByLabelText("Adresse e-mail"),
      "alice@example.test",
    );
    await user.type(screen.getByLabelText("Mot de passe"), "motdepasse");
    await user.type(
      screen.getByLabelText("Confirmer le mot de passe"),
      "motdepasse",
    );
    await user.click(screen.getByLabelText(/Agence immobilière/));
    await user.click(screen.getByLabelText(/Société/));
    await user.click(screen.getByRole("button", { name: "Créer le compte" }));

    expect(
      screen.getByText("Au moins un module doit être sélectionné."),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits the registration with requested modules", async () => {
    fetchMock.mockResolvedValue(emptyResponse());
    const user = userEvent.setup();
    renderPage("register", "/register");

    await user.type(
      screen.getByLabelText("Adresse e-mail"),
      "alice@example.test",
    );
    await user.type(screen.getByLabelText("Mot de passe"), "motdepasse");
    await user.type(
      screen.getByLabelText("Confirmer le mot de passe"),
      "motdepasse",
    );
    await user.click(screen.getByLabelText(/Société/));
    await user.click(screen.getByRole("button", { name: "Créer le compte" }));

    expect(
      await screen.findByText(
        /Un e-mail de confirmation vient de vous être envoyé/,
      ),
    ).toBeVisible();
    const [path, init] = fetchMock.mock.calls.at(-1) ?? [];
    expect(path).toBe("/api/auth/register");
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({
        email: "alice@example.test",
        password: "motdepasse",
        companyEnabled: false,
        lmnpEnabled: true,
      }),
    });
  });
});

describe("AuthPage confirmation", () => {
  it("confirms the e-mail token from the link", async () => {
    fetchMock.mockResolvedValue(emptyResponse());
    renderPage("confirm", "/confirm-email?token=jeton-de-test");

    expect(
      await screen.findByRole("heading", { name: "Adresse confirmée" }),
    ).toBeVisible();
    const [path, init] = fetchMock.mock.calls.at(-1) ?? [];
    expect(path).toBe("/api/auth/confirm-email");
    expect(init).toMatchObject({
      body: JSON.stringify({ token: "jeton-de-test" }),
    });
  });

  it("shows a French error for an invalid token", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          code: "CONFIRMATION_TOKEN_INVALID",
          detail: "Ce lien de confirmation est invalide ou a expiré.",
        },
        400,
      ),
    );
    renderPage("confirm", "/confirm-email?token=invalide");

    expect(
      await screen.findByText(
        "Ce lien de confirmation est invalide ou a expiré.",
      ),
    ).toBeVisible();
  });

  it("resolves the confirmation exactly once under StrictMode", async () => {
    fetchMock.mockResolvedValue(emptyResponse());
    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/confirm-email?token=jeton-strict"]}>
          <Routes>
            <Route
              path="/confirm-email"
              element={<AuthPage mode="confirm" />}
            />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );

    expect(
      await screen.findByRole("heading", { name: "Adresse confirmée" }),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/confirm-email");
    expect(
      screen.queryByText("Ce lien de confirmation est invalide ou a expiré."),
    ).not.toBeInTheDocument();
  });
});

describe("AuthPage forced password change", () => {
  it("changes the password and opens the application", async () => {
    setAuthUser({
      email: "thtran@homeofficeexpenses.local",
      mustChangePassword: true,
    });
    fetchMock.mockResolvedValue(
      jsonResponse({
        email: "thtran@homeofficeexpenses.local",
        mustChangePassword: false,
      }),
    );
    const user = userEvent.setup();
    renderPage("password", "/password");

    expect(
      screen.getByText(/Votre mot de passe provisoire doit être remplacé/),
    ).toBeVisible();
    await user.type(screen.getByLabelText("Mot de passe actuel"), "thtran");
    await user.type(
      screen.getByLabelText("Nouveau mot de passe"),
      "nouveau-mot-de-passe",
    );
    await user.type(
      screen.getByLabelText("Confirmer le mot de passe"),
      "nouveau-mot-de-passe",
    );
    await user.click(
      screen.getByRole("button", { name: "Changer le mot de passe" }),
    );

    expect(await screen.findByText("Espace protégé")).toBeVisible();
    const [path, init] = fetchMock.mock.calls.at(-1) ?? [];
    expect(path).toBe("/api/auth/change-password");
    expect(init).toMatchObject({
      body: JSON.stringify({
        currentPassword: "thtran",
        newPassword: "nouveau-mot-de-passe",
      }),
    });
  });
});
