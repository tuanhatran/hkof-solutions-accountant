import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { LlmConfigDto, LlmModelDto, LlmStatusDto } from "@/api/types";
import i18n from "@/i18n";
import { useToasts } from "@/state/toasts";
import { AdminLlmPage } from "./AdminLlmPage";

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
}

let configState: QueryLike<LlmConfigDto>;
let statusState: QueryLike<LlmStatusDto>;
let modelsState: QueryLike<LlmModelDto[]>;

vi.mock("@/api/endpoints", () => ({
  api: {
    llm: {
      get: vi.fn(),
      update: vi.fn(),
      test: vi.fn(),
      models: vi.fn(),
      status: vi.fn(),
      defaultPrompt: vi.fn(),
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useLlmConfig: () => configState,
    useLlmStatus: () => statusState,
    useLlmModels: () => modelsState,
  };
});

const PROMPT =
  "Extrais uniquement les montants du document fourni, sans calcul.";

const CONFIG: LlmConfigDto = {
  active: true,
  supplier: "OLLAMA",
  url: "http://host.docker.internal:11434",
  model: "qwen2.5:7b",
  timeoutSeconds: 120,
  temperature: "0",
  numCtx: 8192,
  maxPages: 5,
  ocrActive: false,
  extractionPrompt: PROMPT,
  apiKeyConfigured: false,
  remoteUrl: false,
};

const MODELS: LlmModelDto[] = [
  { name: "qwen2.5:7b", family: "qwen2", parameters: "7B", vision: false },
  { name: "llava:13b", family: "llama", parameters: "13B", vision: true },
];

function pendingQuery<T>(data: T | undefined): QueryLike<T> {
  return {
    data,
    isPending: true,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

function readyQuery<T>(data: T): QueryLike<T> {
  return {
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

function failedQuery<T>(error: Error): QueryLike<T> {
  return {
    data: undefined,
    isPending: false,
    isError: true,
    error,
    refetch: vi.fn(),
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AdminLlmPage />
    </QueryClientProvider>,
  );
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

beforeEach(() => {
  configState = readyQuery(CONFIG);
  statusState = readyQuery({
    status: "PRET",
    reachable: true,
    active: true,
    message: "Ollama répond.",
  });
  modelsState = readyQuery(MODELS);
  vi.mocked(api.llm.update).mockReset();
  vi.mocked(api.llm.test).mockReset();
  vi.mocked(api.llm.models).mockReset();
  vi.mocked(api.llm.status).mockReset();
  vi.mocked(api.llm.defaultPrompt).mockReset();
  vi.mocked(api.llm.update).mockResolvedValue({ ...CONFIG });
  useToasts.setState({ toasts: [] });
});

describe("AdminLlmPage", () => {
  it("shows the loading and error states of the configuration", async () => {
    configState = pendingQuery<LlmConfigDto>(undefined);
    const { unmount } = render(
      <QueryClientProvider client={new QueryClient()}>
        <AdminLlmPage />
      </QueryClientProvider>,
    );
    expect(
      screen.getByText("Chargement de la configuration IA…"),
    ).toBeInTheDocument();
    unmount();

    const refetch = vi.fn();
    configState = {
      ...failedQuery(new Error("Serveur indisponible")),
      refetch,
    };
    renderPage();
    expect(
      await screen.findByText("Impossible de charger les données"),
    ).toBeInTheDocument();
    expect(screen.getByText("Serveur indisponible")).toBeInTheDocument();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("edits the runtime configuration and saves it through the API", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Analyse IA activée")).toBeInTheDocument();
    expect(screen.getByText("Configuration à jour.")).toBeInTheDocument();

    await user.click(
      screen.getByRole("switch", { name: "Activer l’analyse par IA" }),
    );
    expect(screen.getByText("Analyse IA désactivée")).toBeInTheDocument();
    expect(
      screen.getByText("Modifications non enregistrées."),
    ).toBeInTheDocument();

    const urlInput = screen.getByLabelText("URL du serveur Ollama");
    await user.clear(urlInput);
    await user.type(urlInput, "https://llm.example.com/");
    expect(
      screen.getByText(
        "Les justificatifs seront envoyés à un serveur distant.",
      ),
    ).toBeInTheDocument();

    vi.mocked(api.llm.update).mockResolvedValue({
      ...CONFIG,
      active: false,
      url: "https://llm.example.com",
    });
    await user.click(screen.getAllByRole("button", { name: "Enregistrer" })[0]);

    await waitFor(() =>
      expect(api.llm.update).toHaveBeenCalledWith({
        active: false,
        supplier: "OLLAMA",
        url: "https://llm.example.com",
        model: "qwen2.5:7b",
        timeoutSeconds: 120,
        temperature: "0",
        numCtx: 8192,
        maxPages: 5,
        ocrActive: false,
        extractionPrompt: PROMPT,
      }),
    );
    await waitFor(() =>
      expect(toastMessages()).toContain("Configuration IA enregistrée."),
    );
  });

  it("shows the French validation messages of the advanced settings", async () => {
    const user = userEvent.setup();
    renderPage();

    const timeout = screen.getByLabelText("Délai (secondes)");
    await user.clear(timeout);
    await user.type(timeout, "2");
    const temperature = screen.getByLabelText("Température");
    await user.clear(temperature);
    await user.type(temperature, "3");
    const numCtx = screen.getByLabelText("Contexte (num_ctx)");
    await user.clear(numCtx);
    await user.type(numCtx, "1");
    const maxPages = screen.getByLabelText("Pages max analysées");
    await user.clear(maxPages);
    await user.type(maxPages, "0");
    const prompt = screen.getByLabelText("Prompt d’extraction");
    await user.clear(prompt);
    await user.type(prompt, "court");

    await user.click(screen.getAllByRole("button", { name: "Enregistrer" })[0]);

    expect(
      await screen.findByText("Le délai doit être au moins de 5 secondes."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Température attendue entre 0 et 2."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Le contexte doit être au moins de 1 024."),
    ).toBeInTheDocument();
    expect(screen.getByText("Au moins une page.")).toBeInTheDocument();
    expect(
      screen.getByText("Le prompt d'extraction est trop court."),
    ).toBeInTheDocument();
    expect(api.llm.update).not.toHaveBeenCalled();
  });

  it("sends an API key and can explicitly delete the stored one", async () => {
    configState = readyQuery({ ...CONFIG, apiKeyConfigured: true });
    vi.mocked(api.llm.update).mockResolvedValue({
      ...CONFIG,
      apiKeyConfigured: true,
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Clé configurée")).toBeInTheDocument();
    const keyInput = screen.getByLabelText("Nouvelle clé API");
    await user.type(keyInput, "secret-123");
    await user.click(screen.getAllByRole("button", { name: "Enregistrer" })[0]);
    await waitFor(() =>
      expect(api.llm.update).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: "secret-123" }),
      ),
    );

    vi.mocked(api.llm.update).mockClear();
    await user.click(
      screen.getByRole("checkbox", { name: /Supprimer la clé enregistrée/ }),
    );
    expect(keyInput).toBeDisabled();
    await user.click(screen.getAllByRole("button", { name: "Enregistrer" })[0]);
    await waitFor(() =>
      expect(api.llm.update).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: "" }),
      ),
    );
  });

  it("runs a successful connection test with its feedback", async () => {
    vi.mocked(api.llm.test).mockResolvedValue({
      success: true,
      durationMs: 1500,
      message: "Modèle disponible.",
      detectedAmount: "80.00",
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Analyse IA activée");

    await user.click(
      screen.getAllByRole("button", { name: "Tester la connexion" })[0],
    );

    expect(
      await screen.findByText("Connexion réussie en 1.5 s"),
    ).toBeInTheDocument();
    expect(screen.getByText("80.00 €")).toBeInTheDocument();
    await waitFor(() =>
      expect(toastMessages()).toContain("Test de connexion réussi."),
    );
  });

  it("shows the failed test payload and a transport error", async () => {
    vi.mocked(api.llm.test).mockResolvedValue({
      success: false,
      message: "Modèle introuvable.",
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Analyse IA activée");
    await user.click(
      screen.getAllByRole("button", { name: "Tester la connexion" })[0],
    );

    expect(await screen.findByText("Test échoué")).toBeInTheDocument();
    expect(screen.getByText("Modèle introuvable.")).toBeInTheDocument();
    await waitFor(() =>
      expect(toastMessages()).toContain("Modèle introuvable."),
    );

    vi.mocked(api.llm.test).mockRejectedValue(new Error("Ollama injoignable"));
    await user.click(
      screen.getAllByRole("button", { name: "Tester la connexion" })[0],
    );
    expect(await screen.findByText("Ollama injoignable")).toBeInTheDocument();
  });

  it("validates the URL before refreshing the model list", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Analyse IA activée");

    const urlInput = screen.getByLabelText("URL du serveur Ollama");
    await user.clear(urlInput);
    await user.type(urlInput, "ftp://ollama");
    await user.click(
      screen.getByRole("button", { name: "Actualiser la liste des modèles" }),
    );
    expect(
      await screen.findByText(
        "URL invalide : commencez par http:// ou https://.",
      ),
    ).toBeInTheDocument();
    expect(api.llm.update).not.toHaveBeenCalled();
  });

  it("persists a changed URL before refreshing the model list", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Analyse IA activée");

    const urlInput = screen.getByLabelText("URL du serveur Ollama");
    await user.clear(urlInput);
    await user.type(urlInput, "https://ollama.example.com");
    vi.mocked(api.llm.update).mockResolvedValue({
      ...CONFIG,
      url: "https://ollama.example.com",
    });
    await user.click(
      screen.getByRole("button", { name: "Actualiser la liste des modèles" }),
    );
    await waitFor(() =>
      expect(api.llm.update).toHaveBeenCalledWith({
        url: "https://ollama.example.com",
      }),
    );
  });

  it("force-refreshes the models of an unchanged URL without saving", async () => {
    const refetch = vi.fn().mockResolvedValue({ isError: true });
    modelsState = { ...readyQuery(MODELS), refetch };

    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Analyse IA activée");

    await user.click(
      screen.getByRole("button", { name: "Actualiser la liste des modèles" }),
    );
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    expect(api.llm.update).not.toHaveBeenCalled();
  });

  it("falls back to a manual model field when the list fails", async () => {
    modelsState = {
      ...failedQuery<LlmModelDto[]>(new Error("Ollama injoignable")),
      data: MODELS,
    };
    vi.mocked(api.llm.defaultPrompt).mockResolvedValue({ prompt: PROMPT });

    renderPage();

    expect(
      await screen.findByText("Liste des modèles indisponible."),
    ).toBeInTheDocument();
    expect(screen.getByText("Ollama injoignable")).toBeInTheDocument();
    const manualInput = screen.getByLabelText("Modèle");
    expect(manualInput).toHaveValue("qwen2.5:7b");

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Choisir dans la liste" }),
    );
    expect(screen.getByLabelText("Modèle").tagName).toBe("SELECT");
  });

  it("switches to manual entry from the model select", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Analyse IA activée");

    await user.selectOptions(screen.getByLabelText("Modèle"), "__manuel__");
    const manual = await screen.findByLabelText("Modèle");
    expect(manual.tagName).toBe("INPUT");
    expect(manual).toHaveValue("qwen2.5:7b");
  });

  it("offers the configured model even when the server does not list it", async () => {
    configState = readyQuery({ ...CONFIG, model: "custom:7b" });
    modelsState = readyQuery([{ name: "llama3" }]);

    renderPage();

    expect(
      await screen.findByText(
        /Ce modèle configuré n’apparaît pas dans la liste du serveur/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "custom:7b (configuré)" }),
    ).toBeInTheDocument();
  });

  it("loads the default prompt into the form", async () => {
    vi.mocked(api.llm.defaultPrompt).mockResolvedValue({
      prompt: "Nouveau prompt système suffisamment long.",
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Analyse IA activée");

    await user.click(
      screen.getByRole("button", {
        name: "Réinitialiser le prompt par défaut",
      }),
    );

    await waitFor(() =>
      expect(screen.getByLabelText("Prompt d’extraction")).toHaveValue(
        "Nouveau prompt système suffisamment long.",
      ),
    );
    expect(toastMessages()).toContain(
      "Prompt par défaut chargé. Enregistrez pour l’appliquer.",
    );
  });

  it("reports an unavailable or failing default prompt", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Analyse IA activée");

    vi.mocked(api.llm.defaultPrompt).mockResolvedValue({});
    await user.click(
      screen.getByRole("button", {
        name: "Réinitialiser le prompt par défaut",
      }),
    );
    await waitFor(() =>
      expect(toastMessages()).toContain(
        "Le prompt par défaut est indisponible.",
      ),
    );

    vi.mocked(api.llm.defaultPrompt).mockRejectedValue(
      new Error("Service indisponible"),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Réinitialiser le prompt par défaut",
      }),
    );
    await waitFor(() =>
      expect(toastMessages()).toContain("Service indisponible"),
    );
  });

  it("renders the live status, the remote warning and model details", async () => {
    statusState = readyQuery({
      status: "PRET_DISTANT",
      reachable: true,
      active: true,
      message: "Serveur distant joignable.",
    });
    configState = readyQuery({
      ...CONFIG,
      url: "https://ollama.example.com",
      remoteUrl: true,
    });
    modelsState = readyQuery(MODELS);

    renderPage();

    expect(
      await screen.findByText("Connecté — serveur distant"),
    ).toBeInTheDocument();
    expect(screen.getByText("Serveur distant joignable.")).toBeInTheDocument();
    expect(
      screen.getByText("Serveur joignable · IA activée"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Les justificatifs seront envoyés à un serveur distant.",
      ),
    ).toBeInTheDocument();

    await userEvent
      .setup()
      .selectOptions(screen.getByLabelText("Modèle"), "llava:13b");
    expect(
      screen.getByText(/Ce modèle accepte les images/),
    ).toBeInTheDocument();
    expect(screen.getByText(/accepte les images$/)).toBeInTheDocument();
  });

  it("shows the status error and the disabled IA hint", async () => {
    configState = readyQuery({ ...CONFIG, active: false });
    statusState = failedQuery(new Error("statut indisponible"));

    renderPage();

    expect(await screen.findByText("Indisponible")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Quand l’IA est désactivée, aucun justificatif n’est envoyé/,
      ),
    ).toBeInTheDocument();
  });

  it("keeps the connection test in the status card and the page header free of actions", async () => {
    renderPage();

    const statusCard = (await screen.findByText("Connecté")).closest(
      "section",
    ) as HTMLElement;
    expect(
      within(statusCard).getByRole("button", { name: "Tester la connexion" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("banner")).queryAllByRole("button"),
    ).toHaveLength(0);
  });
});

describe("AdminLlmPage in English", () => {
  it("translates the header, connection and advanced labels and relabels on switch", async () => {
    await i18n.changeLanguage("en");
    renderPage();

    expect(screen.getByRole("heading", { name: "AI analysis" })).toBeVisible();
    expect(screen.getByText("Settings")).toBeVisible();
    expect(
      screen.getByText(/The model only proposes an extraction/),
    ).toBeVisible();
    expect(screen.getAllByText("Ollama connection")).toHaveLength(2);
    expect(
      screen.getByText(
        "Local provider, URL, model and optional authentication.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Provider")).toBeVisible();
    expect(screen.getByLabelText("Ollama server URL")).toBeVisible();
    expect(screen.getByLabelText("Model")).toBeVisible();
    expect(screen.getByText("Image support")).toBeVisible();
    expect(screen.getByText("Advanced settings")).toBeVisible();
    expect(screen.getByLabelText("Delay (seconds)")).toBeInTheDocument();
    expect(screen.getByLabelText("Temperature")).toBeInTheDocument();
    expect(screen.getByLabelText("Context (num_ctx)")).toBeInTheDocument();
    expect(screen.getByLabelText("Max analyzed pages")).toBeInTheDocument();
    expect(screen.getByLabelText("Extraction prompt")).toBeInTheDocument();
    expect(screen.getByText("Configuration up to date.")).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: "Test the connection" }),
    ).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Save" })).toHaveLength(1);

    await act(async () => {
      await i18n.changeLanguage("fr");
    });

    expect(screen.getByRole("heading", { name: "Analyse IA" })).toBeVisible();
    expect(screen.getByText("Paramètres avancés")).toBeVisible();
    expect(screen.getByText("Configuration à jour.")).toBeVisible();
  });

  it("translates the status card and relabels it on language switch", async () => {
    statusState = readyQuery({
      status: "PRET",
      reachable: true,
      active: true,
    });
    renderPage();

    expect(
      await screen.findByText(
        "Le serveur Ollama et le modèle configuré sont disponibles.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Connecté")).toBeVisible();
    expect(screen.getByText("Serveur joignable · IA activée")).toBeVisible();

    await act(async () => {
      await i18n.changeLanguage("en");
    });

    expect(screen.getByText("Connected")).toBeVisible();
    expect(
      screen.getByText(
        "The Ollama server and the configured model are available.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Server reachable · AI enabled")).toBeVisible();

    await act(async () => {
      await i18n.changeLanguage("fr");
    });
    expect(screen.getByText("Connecté")).toBeVisible();
    expect(screen.getByText("Serveur joignable · IA activée")).toBeVisible();
  });

  it.each([
    [
      "PRET_DISTANT",
      "Connected — remote server",
      "Ollama responds, but the URL is not local: documents leave this machine.",
    ],
    [
      "MODELE_ABSENT",
      "Model missing",
      "Ollama responds but the selected model is not installed.",
    ],
    [
      "INJOIGNABLE",
      "Unreachable",
      "The Ollama server does not respond. Manual entry remains available.",
    ],
    [
      "DESACTIVE",
      "Disabled",
      "AI analysis is disabled. The whole application remains usable manually.",
    ],
  ])(
    "renders the %s status and its description in English",
    async (status, label, description) => {
      statusState = readyQuery({
        status,
        reachable: status !== "INJOIGNABLE",
        active: status !== "DESACTIVE",
      });
      await i18n.changeLanguage("en");

      renderPage();

      expect(await screen.findByText(label)).toBeVisible();
      expect(screen.getByText(description)).toBeVisible();
    },
  );

  it("translates the API key block without exposing the key", async () => {
    configState = readyQuery({ ...CONFIG, apiKeyConfigured: true });
    await i18n.changeLanguage("en");

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Key configured")).toBeVisible();
    expect(screen.getByText("API key (optional)")).toBeVisible();
    expect(
      screen.getByText(
        "Never returned by the server nor displayed again. Leave empty to keep the stored key.",
      ),
    ).toBeVisible();
    expect(screen.getByLabelText("New API key")).toHaveAttribute(
      "placeholder",
      "Stored key — leave empty",
    );
    expect(screen.getByText("Delete the stored key")).toBeVisible();
    expect(
      screen.getByText(
        "Explicitly sends an empty key. Without this box, an empty key is never sent.",
      ),
    ).toBeVisible();

    await user.type(screen.getByLabelText("New API key"), "secret-123");
    expect(document.body.textContent).not.toContain("secret-123");
    expect(toastMessages().join(" ")).not.toContain("secret-123");
  });

  it("shows English toasts and feedback for the connection test", async () => {
    vi.mocked(api.llm.test).mockResolvedValue({
      success: true,
      durationMs: 1500,
      message: "Modèle disponible.",
      detectedAmount: "80.00",
    });
    await i18n.changeLanguage("en");

    const user = userEvent.setup();
    renderPage();
    await screen.findByText("AI analysis enabled");

    await user.click(
      screen.getAllByRole("button", { name: "Test the connection" })[0],
    );

    expect(
      await screen.findByText("Connection successful in 1.5 s"),
    ).toBeVisible();
    expect(
      screen.getByText(/Amount detected on the test document:/),
    ).toBeVisible();
    expect(screen.getByText("Modèle disponible.")).toBeVisible();
    await waitFor(() =>
      expect(toastMessages()).toContain("Connection test succeeded."),
    );

    vi.mocked(api.llm.test).mockResolvedValue({
      success: false,
      message: "Modèle introuvable.",
    });
    await user.click(
      screen.getAllByRole("button", { name: "Test the connection" })[0],
    );
    expect(await screen.findByText("Test failed")).toBeVisible();
    expect(screen.getByText("Modèle introuvable.")).toBeVisible();
    await waitFor(() =>
      expect(toastMessages()).toContain("Modèle introuvable."),
    );
  });

  it("renders the remote warning and the save toast in English", async () => {
    await i18n.changeLanguage("en");

    const user = userEvent.setup();
    renderPage();
    await screen.findByText("AI analysis enabled");

    const urlInput = screen.getByLabelText("Ollama server URL");
    await user.clear(urlInput);
    await user.type(urlInput, "https://llm.example.com/");
    expect(
      screen.getByText("Receipts will be sent to a remote server."),
    ).toBeVisible();
    expect(screen.getByText(/The configured URL is neither/)).toBeVisible();

    vi.mocked(api.llm.update).mockResolvedValue({
      ...CONFIG,
      url: "https://llm.example.com",
    });
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);
    await waitFor(() =>
      expect(toastMessages()).toContain("AI configuration saved."),
    );
  });

  it("translates the URL schema and the model refresh error in English", async () => {
    await i18n.changeLanguage("en");

    const user = userEvent.setup();
    renderPage();
    await screen.findByText("AI analysis enabled");

    const urlInput = screen.getByLabelText("Ollama server URL");
    await user.clear(urlInput);
    await user.type(urlInput, "ftp://ollama");

    expect(
      await screen.findByText("Invalid URL: http:// or https:// expected."),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Refresh the model list" }),
    );
    expect(
      await screen.findByText("Invalid URL: start with http:// or https://."),
    ).toBeVisible();
  });

  it("shows the English validation messages of the advanced settings", async () => {
    await i18n.changeLanguage("en");

    const user = userEvent.setup();
    renderPage();
    await screen.findByText("AI analysis enabled");

    const timeout = screen.getByLabelText("Delay (seconds)");
    await user.clear(timeout);
    await user.type(timeout, "2");
    const temperature = screen.getByLabelText("Temperature");
    await user.clear(temperature);
    await user.type(temperature, "3");
    const numCtx = screen.getByLabelText("Context (num_ctx)");
    await user.clear(numCtx);
    await user.type(numCtx, "1");
    const maxPages = screen.getByLabelText("Max analyzed pages");
    await user.clear(maxPages);
    await user.type(maxPages, "0");
    const prompt = screen.getByLabelText("Extraction prompt");
    await user.clear(prompt);
    await user.type(prompt, "court");

    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(
      await screen.findByText("The delay must be at least 5 seconds."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Temperature expected between 0 and 2."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The context must be at least 1,024."),
    ).toBeInTheDocument();
    expect(screen.getByText("At least one page.")).toBeInTheDocument();
    expect(
      screen.getByText("The extraction prompt is too short."),
    ).toBeInTheDocument();
    expect(api.llm.update).not.toHaveBeenCalled();
  });

  it("renders the model list error and manual entry in English", async () => {
    modelsState = {
      ...failedQuery<LlmModelDto[]>(new Error("Ollama unreachable")),
      data: MODELS,
    };
    await i18n.changeLanguage("en");

    renderPage();

    expect(await screen.findByText("Model list unavailable.")).toBeVisible();
    expect(
      screen.getByText(
        "Enter the model name manually, then test the connection.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Ollama unreachable")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Choose from the list" }),
    ).toBeVisible();
  });
});
