import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResponseBlob } from "@/api/client";
import { api } from "@/api/endpoints";
import type { TemplateDto } from "@/api/types";
import i18n from "@/i18n";
import { useToasts } from "@/state/toasts";
import { TemplatesTab } from "./TemplatesTab";
import { RENT_RECEIPT_CONFIGURATION } from "./templateTypes";

let templates: TemplateDto[] = [];

vi.mock("@/components/pdf/PdfViewer", () => ({
  PdfViewer: (props: {
    url: string | null;
    dataCy?: string;
    className?: string;
  }) => (
    <div
      data-cy={props.dataCy}
      data-url={props.url ?? ""}
      className={props.className}
    />
  ),
}));

vi.mock("@/api/endpoints", () => ({
  api: {
    templates: {
      upload: vi.fn(),
      activate: vi.fn(),
      delete: vi.fn(),
      resetDefault: vi.fn(),
      file: vi.fn(),
      getDefault: vi.fn(),
      preview: vi.fn(),
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useTemplates: () => ({
      data: templates,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useTemplateVariables: () => ({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
  };
});

const ACTIVE: TemplateDto = {
  id: 1,
  type: "RENT_RECEIPT",
  name: "Quittance 2026",
  version: 3,
  format: "HTML",
  active: true,
  builtIn: false,
  createdAt: "2026-10-20T10:00:00Z",
};

const ARCHIVED: TemplateDto = {
  id: 2,
  type: "RENT_RECEIPT",
  name: "Quittance archivée",
  version: 2,
  format: "HTML",
  active: false,
  builtIn: false,
  createdAt: "2026-09-01T10:00:00Z",
};

const BUILT_IN: TemplateDto = {
  id: 4,
  type: "RENT_RECEIPT",
  name: "Quittance intégrée",
  version: 1,
  format: "HTML",
  active: false,
  builtIn: true,
  createdAt: "2026-01-01T10:00:00Z",
};

const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const tree = () => (
    <QueryClientProvider client={queryClient}>
      <TemplatesTab configuration={RENT_RECEIPT_CONFIGURATION} />
    </QueryClientProvider>
  );
  const view = render(tree());
  return { ...view, rerenderTab: () => view.rerender(tree()) };
}

function checkbox(name: string): HTMLInputElement {
  return screen.getByRole("checkbox", {
    name,
  }) as HTMLInputElement;
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

async function selectTwo(user: ReturnType<typeof userEvent.setup>) {
  await user.click(checkbox("Comparer Quittance archivée v2"));
  await user.click(checkbox("Comparer Quittance intégrée v1"));
}

async function openComparison(user: ReturnType<typeof userEvent.setup>) {
  await selectTwo(user);
  await user.click(screen.getByRole("button", { name: "Comparer" }));
  return screen.findByRole("dialog", { name: "Comparer les versions" });
}

beforeEach(() => {
  templates = [ACTIVE, ARCHIVED, BUILT_IN];
  vi.mocked(api.templates.preview).mockReset();
  vi.mocked(api.templates.preview).mockResolvedValue({
    blob: new Blob(["preview"]),
    fileName: "apercu.pdf",
  });
  createObjectURL.mockReset();
  revokeObjectURL.mockReset();
  let urlIndex = 0;
  createObjectURL.mockImplementation(() => `blob:compare-${++urlIndex}`);
  Object.defineProperty(URL, "createObjectURL", {
    value: createObjectURL,
    configurable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: revokeObjectURL,
    configurable: true,
  });
  useToasts.setState({ toasts: [] });
});

describe("TemplateCompare", () => {
  it("caps the comparison selection at two and keeps checked boxes toggleable", async () => {
    const user = userEvent.setup();
    renderTab();

    const active = checkbox("Comparer Quittance 2026 v3");
    const archived = checkbox("Comparer Quittance archivée v2");
    const builtIn = checkbox("Comparer Quittance intégrée v1");

    expect(archived).toHaveAttribute("data-cy", "comparer-modele-2");
    expect(builtIn).toHaveAttribute("data-cy", "comparer-modele-4");

    await user.click(archived);
    await user.click(builtIn);
    expect(archived).toBeChecked();
    expect(builtIn).toBeChecked();
    expect(active).toBeDisabled();

    await user.click(active);
    expect(active).not.toBeChecked();
    expect(archived).toBeChecked();
    expect(builtIn).toBeChecked();

    await user.click(builtIn);
    expect(builtIn).not.toBeChecked();
    expect(active).toBeEnabled();
  });

  it("shows the selection bar with a plural count, a gated compare button and a cancel action", async () => {
    const user = userEvent.setup();
    renderTab();

    const archived = checkbox("Comparer Quittance archivée v2");
    const builtIn = checkbox("Comparer Quittance intégrée v1");

    await user.click(archived);
    const bar = document.querySelector('[data-cy="barre-comparaison"]');
    expect(bar).not.toBeNull();
    expect(bar).toHaveTextContent("1 version sélectionnée");
    const compareButton = screen.getByRole("button", { name: "Comparer" });
    expect(compareButton).toHaveAttribute("data-cy", "btn-comparer-versions");
    expect(compareButton).toBeDisabled();

    await user.click(builtIn);
    expect(bar).toHaveTextContent("2 versions sélectionnées");
    expect(compareButton).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(document.querySelector('[data-cy="barre-comparaison"]')).toBeNull();
    expect(archived).not.toBeChecked();
    expect(builtIn).not.toBeChecked();
  });

  it("opens a read-only comparison with metadata and both PDF panels", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(checkbox("Comparer Quittance 2026 v3"));
    await user.click(checkbox("Comparer Quittance archivée v2"));
    await user.click(screen.getByRole("button", { name: "Comparer" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Comparer les versions",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("data-cy", "comparaison-modeles");
    expect(
      within(dialog).getByText(
        "Aperçu côte à côte de deux versions du modèle.",
      ),
    ).toBeVisible();
    expect(api.templates.preview).toHaveBeenCalledTimes(2);
    expect(api.templates.preview).toHaveBeenCalledWith(1);
    expect(api.templates.preview).toHaveBeenCalledWith(2);

    const left = dialog.querySelector('[data-cy="comparaison-modele-gauche"]');
    const right = dialog.querySelector('[data-cy="comparaison-modele-droite"]');
    expect(left).toHaveAttribute("data-url", "blob:compare-1");
    expect(right).toHaveAttribute("data-url", "blob:compare-2");
    expect(dialog.querySelector(".template-compare-panels")).not.toBeNull();
    expect(dialog.querySelectorAll(".template-compare-panel")).toHaveLength(2);

    const leftPanel = left?.closest(".template-compare-panel");
    if (!leftPanel) {
      throw new Error("Left comparison panel not found");
    }
    expect(
      within(leftPanel as HTMLElement).getByText("Quittance 2026"),
    ).toBeVisible();
    expect(within(leftPanel as HTMLElement).getByText("v3")).toBeVisible();
    expect(within(leftPanel as HTMLElement).getByText("active")).toBeVisible();
    expect(
      within(leftPanel as HTMLElement).getByText("20/10/2026"),
    ).toBeVisible();

    const rightPanel = right?.closest(".template-compare-panel");
    if (!rightPanel) {
      throw new Error("Right comparison panel not found");
    }
    expect(
      within(rightPanel as HTMLElement).getByText("Quittance archivée"),
    ).toBeVisible();
    expect(within(rightPanel as HTMLElement).getByText("v2")).toBeVisible();
    expect(
      within(rightPanel as HTMLElement).getByText("01/09/2026"),
    ).toBeVisible();

    expect(
      within(dialog).queryByRole("button", { name: "Activer" }),
    ).toBeNull();
    expect(
      within(dialog).queryByRole("button", { name: "Supprimer" }),
    ).toBeNull();
    expect(
      within(dialog).queryByRole("button", { name: "Valider et importer" }),
    ).toBeNull();
  });

  it("shows the loading state while both previews are prepared", async () => {
    const deferreds: Array<(value: ResponseBlob) => void> = [];
    vi.mocked(api.templates.preview).mockImplementation(
      () =>
        new Promise<ResponseBlob>((resolve) => {
          deferreds.push(resolve);
        }),
    );
    const user = userEvent.setup();
    renderTab();

    await selectTwo(user);
    await user.click(screen.getByRole("button", { name: "Comparer" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Comparer les versions",
    });
    expect(within(dialog).getByText("Préparation des aperçus…")).toBeVisible();
    expect(deferreds).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Comparer" })).toBeDisabled();

    await act(async () => {
      deferreds[0]?.({ blob: new Blob(["gauche"]), fileName: null });
      deferreds[1]?.({ blob: new Blob(["droite"]), fileName: null });
    });

    await waitFor(() =>
      expect(screen.queryByText("Préparation des aperçus…")).toBeNull(),
    );
    const builtInPanel = dialog
      .querySelector('[data-cy="comparaison-modele-droite"]')
      ?.closest(".template-compare-panel");
    if (!builtInPanel) {
      throw new Error("Built-in comparison panel not found");
    }
    expect(
      within(builtInPanel as HTMLElement).getByText("intégré"),
    ).toBeVisible();
    expect(
      within(builtInPanel as HTMLElement).getByText("01/01/2026"),
    ).toBeVisible();
  });

  it("closes by close button, Escape and backdrop, revoking both URLs", async () => {
    const user = userEvent.setup();
    renderTab();

    const dialog = await openComparison(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Fermer la comparaison" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:compare-1");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:compare-2");
    revokeObjectURL.mockClear();

    // The selection is kept after a close, so the same pair reopens directly.
    await user.click(screen.getByRole("button", { name: "Comparer" }));
    await screen.findByRole("dialog", {
      name: "Comparer les versions",
    });
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:compare-3");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:compare-4");
    revokeObjectURL.mockClear();

    // The selection is kept after a close, so the same pair reopens directly.
    await user.click(screen.getByRole("button", { name: "Comparer" }));
    const reopened = await screen.findByRole("dialog", {
      name: "Comparer les versions",
    });
    expect(reopened).toBeInTheDocument();
    const backdrop = document.querySelector(".template-compare-backdrop");
    if (!backdrop) {
      throw new Error("Comparison backdrop not found");
    }
    fireEvent.mouseDown(backdrop);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:compare-5");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:compare-6");
  });

  it("closes while the previews are loading and ignores the late result", async () => {
    const deferreds: Array<(value: ResponseBlob) => void> = [];
    vi.mocked(api.templates.preview).mockImplementation(
      () =>
        new Promise<ResponseBlob>((resolve) => {
          deferreds.push(resolve);
        }),
    );
    const user = userEvent.setup();
    renderTab();

    await selectTwo(user);
    await user.click(screen.getByRole("button", { name: "Comparer" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Comparer les versions",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Fermer la comparaison" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    await act(async () => {
      deferreds[0]?.({ blob: new Blob(["gauche"]), fileName: null });
      deferreds[1]?.({ blob: new Blob(["droite"]), fileName: null });
    });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(toastMessages()).toEqual([]);
  });

  it("revokes both URLs when the card unmounts", async () => {
    const user = userEvent.setup();
    const { unmount } = renderTab();

    await openComparison(user);
    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:compare-1");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:compare-2");
  });

  it("discards the previews when the card unmounts while they are pending", async () => {
    const deferreds: Array<(value: ResponseBlob) => void> = [];
    vi.mocked(api.templates.preview).mockImplementation(
      () =>
        new Promise<ResponseBlob>((resolve) => {
          deferreds.push(resolve);
        }),
    );
    const user = userEvent.setup();
    const { unmount } = renderTab();

    await selectTwo(user);
    await user.click(screen.getByRole("button", { name: "Comparer" }));
    await screen.findByRole("dialog", { name: "Comparer les versions" });
    expect(deferreds).toHaveLength(2);

    unmount();

    await act(async () => {
      deferreds[0]?.({ blob: new Blob(["gauche"]), fileName: null });
      deferreds[1]?.({ blob: new Blob(["droite"]), fileName: null });
    });

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(toastMessages()).toEqual([]);
  });

  it("prunes a selected version that disappears from the list", async () => {
    const user = userEvent.setup();
    const { rerenderTab } = renderTab();

    await selectTwo(user);
    expect(
      document.querySelector('[data-cy="barre-comparaison"]'),
    ).toHaveTextContent("2 versions sélectionnées");

    templates = [ACTIVE, BUILT_IN];
    await act(async () => {
      rerenderTab();
    });

    expect(
      document.querySelector('[data-cy="barre-comparaison"]'),
    ).toHaveTextContent("1 version sélectionnée");
    expect(checkbox("Comparer Quittance intégrée v1")).toBeChecked();
    expect(screen.getByRole("button", { name: "Comparer" })).toBeDisabled();
    // The freed slot lets an unchecked row be selected again.
    expect(checkbox("Comparer Quittance 2026 v3")).toBeEnabled();
  });

  it("toasts a preview failure and keeps the selection", async () => {
    vi.mocked(api.templates.preview).mockRejectedValue(
      new Error("Aperçu du modèle indisponible"),
    );
    const user = userEvent.setup();
    renderTab();

    await selectTwo(user);
    await user.click(screen.getByRole("button", { name: "Comparer" }));

    await waitFor(() =>
      expect(toastMessages()).toContain("Aperçu du modèle indisponible"),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(checkbox("Comparer Quittance archivée v2")).toBeChecked();
    expect(checkbox("Comparer Quittance intégrée v1")).toBeChecked();
    expect(screen.getByRole("button", { name: "Comparer" })).toBeEnabled();
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it("renders the comparison in English", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderTab();

    await user.click(checkbox("Compare Quittance archivée v2"));
    expect(
      document.querySelector('[data-cy="barre-comparaison"]'),
    ).toHaveTextContent("1 version selected");
    const compareButton = screen.getByRole("button", { name: "Compare" });
    expect(compareButton).toBeDisabled();

    await user.click(checkbox("Compare Quittance intégrée v1"));
    expect(
      document.querySelector('[data-cy="barre-comparaison"]'),
    ).toHaveTextContent("2 versions selected");
    await user.click(compareButton);

    const dialog = await screen.findByRole("dialog", {
      name: "Compare versions",
    });
    expect(
      within(dialog).getByText(
        "Side-by-side preview of two versions of the template.",
      ),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("button", { name: "Close the comparison" }),
    ).toBeVisible();
  });
});
