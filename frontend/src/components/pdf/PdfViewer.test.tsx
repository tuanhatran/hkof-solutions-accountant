import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDateTime } from "@/lib/format";
import { PdfViewer } from "./PdfViewer";

vi.mock("react-pdf", () => ({
  pdfjs: { GlobalWorkerOptions: {} },
  Document: ({
    file,
    onLoadSuccess,
    onLoadError,
    loading,
    children,
  }: {
    file: string;
    onLoadSuccess: (value: { numPages: number }) => void;
    onLoadError: () => void;
    loading: ReactNode;
    children: ReactNode;
  }) => (
    <div data-testid="document" data-file={file}>
      <button type="button" onClick={() => onLoadSuccess({ numPages: 3 })}>
        load-success
      </button>
      <button type="button" onClick={onLoadError}>
        load-error
      </button>
      {loading}
      {children}
    </div>
  ),
  Page: ({
    pageNumber,
    width,
    loading,
    className,
  }: {
    pageNumber: number;
    width: number;
    loading: ReactNode;
    className: string;
  }) => (
    <div
      data-testid="page"
      data-page={pageNumber}
      data-width={width}
      className={className}
    >
      {loading}
    </div>
  ),
}));

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
  default: "worker.js",
}));

let resizeCallback: ResizeObserverCallback | null = null;

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }
}

afterEach(() => {
  resizeCallback = null;
  vi.unstubAllGlobals();
});

beforeEach(() => {
  HTMLElement.prototype.scrollTo = vi.fn();
});

describe("PdfViewer", () => {
  it("shows the placeholder or the preparation state without a URL", () => {
    const { rerender } = render(<PdfViewer url={null} />);
    expect(
      screen.getByText(
        "L’aperçu apparaîtra ici dès que les informations seront complètes.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Page 0 / —")).toBeVisible();
    expect(screen.queryByTestId("document")).toBeNull();

    rerender(<PdfViewer url={null} loading />);
    expect(screen.getByText("Préparation de l’aperçu…")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Page suivante" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Agrandir le zoom" }),
    ).toBeDisabled();
  });

  it("renders the document, updates the last-change label and paginates", async () => {
    const updatedAt = new Date("2026-10-23T10:00:00Z");
    render(<PdfViewer url="blob:preview" updatedAt={updatedAt} />);

    expect(screen.getByTestId("document")).toHaveAttribute(
      "data-file",
      "blob:preview",
    );
    expect(document.querySelector('[data-cy="apercu-maj"]')).toHaveTextContent(
      `Mis à jour à ${formatDateTime(updatedAt.toISOString())}`,
    );
    expect(screen.getByTestId("page")).toHaveAttribute("data-page", "1");
    expect(screen.getByText("Page 0 / —")).toBeVisible();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "load-success" }));
    expect(screen.getByText("Page 1 / 3")).toBeVisible();
    expect(screen.getByTestId("page")).toHaveAttribute("data-page", "1");
    expect(
      screen.getByRole("button", { name: "Page précédente" }),
    ).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Page suivante" }));
    expect(screen.getByTestId("page")).toHaveAttribute("data-page", "2");
    await user.click(screen.getByRole("button", { name: "Page précédente" }));
    expect(screen.getByTestId("page")).toHaveAttribute("data-page", "1");

    await user.click(screen.getByRole("button", { name: "Page suivante" }));
    await user.click(screen.getByRole("button", { name: "Page suivante" }));
    expect(screen.getByTestId("page")).toHaveAttribute("data-page", "3");
    expect(
      screen.getByRole("button", { name: "Page suivante" }),
    ).toBeDisabled();
  });

  it("clamps the zoom between 70 % and 175 %", async () => {
    render(<PdfViewer url="blob:preview" />);
    const user = userEvent.setup();

    expect(screen.getByText("100 %")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Agrandir le zoom" }));
    expect(screen.getByText("115 %")).toBeVisible();
    expect(screen.getByTestId("page")).toHaveAttribute("data-width", "644");

    for (let index = 0; index < 6; index += 1) {
      await user.click(
        screen.getByRole("button", { name: "Agrandir le zoom" }),
      );
    }
    expect(screen.getByText("175 %")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Agrandir le zoom" }),
    ).toBeDisabled();

    for (let index = 0; index < 10; index += 1) {
      await user.click(screen.getByRole("button", { name: "Réduire le zoom" }));
    }
    expect(screen.getByText("70 %")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Réduire le zoom" }),
    ).toBeDisabled();
  });

  it("displays a PDF error, then lets the explicit error win", async () => {
    const { rerender } = render(<PdfViewer url="blob:preview" />);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "load-error" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Impossible d'afficher l'aperçu PDF.",
    );

    rerender(<PdfViewer url="blob:preview" error="Erreur du serveur" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Erreur du serveur");
  });

  it("resets the PDF error and pagination when the URL changes", async () => {
    const { rerender } = render(<PdfViewer url="blob:one" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "load-success" }));
    await user.click(screen.getByRole("button", { name: "load-error" }));
    await user.click(screen.getByRole("button", { name: "Page suivante" }));
    expect(screen.getByText("Page 2 / 3")).toBeVisible();

    rerender(<PdfViewer url="blob:two" />);
    expect(screen.getByTestId("page")).toHaveAttribute("data-page", "1");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Page 0 / —")).toBeVisible();
  });

  it("overlays the refresh state on top of the previous preview", () => {
    render(<PdfViewer url="blob:preview" loading />);
    expect(screen.getByText("Mise à jour de l’aperçu…")).toBeVisible();
    expect(
      screen.getByText("L’ancienne version reste affichée."),
    ).toBeVisible();
    expect(screen.getByTestId("document")).toBeInTheDocument();
  });

  it("renders actions and downloads only when a handler is provided", async () => {
    const onDownload = vi.fn();
    const { rerender } = render(
      <PdfViewer
        url="blob:preview"
        onDownload={onDownload}
        actions={<span>Action</span>}
        dataCy="apercu-personnalise"
        className="custom-class"
      />,
    );

    expect(screen.getByText("Action")).toBeVisible();
    expect(screen.getByText("Aperçu du document")).toBeVisible();
    const section = screen
      .getByText("Aperçu du document")
      .closest('[data-cy="apercu-personnalise"]');
    expect(section).not.toBeNull();
    expect((section as HTMLElement).className).toContain("custom-class");

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Télécharger l’aperçu" }));
    expect(onDownload).toHaveBeenCalledTimes(1);

    rerender(<PdfViewer url={null} onDownload={onDownload} />);
    expect(
      screen.getByRole("button", { name: "Télécharger l’aperçu" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Télécharger l’aperçu" }),
    ).toBeVisible();

    rerender(<PdfViewer url="blob:preview" />);
    expect(
      screen.queryByRole("button", { name: "Télécharger l’aperçu" }),
    ).toBeNull();
  });

  it("sizes the page from the container width through ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    render(<PdfViewer url="blob:preview" />);

    act(() => {
      resizeCallback?.(
        [{ contentRect: { width: 800 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });
    expect(screen.getByTestId("page")).toHaveAttribute("data-width", "760");

    act(() => {
      resizeCallback?.(
        [{ contentRect: { width: 0 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });
    expect(screen.getByTestId("page")).toHaveAttribute("data-width", "760");

    act(() => {
      resizeCallback?.(
        [{ contentRect: { width: 200 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });
    expect(screen.getByTestId("page")).toHaveAttribute("data-width", "260");
  });

  it("works without ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    render(<PdfViewer url="blob:preview" />);
    expect(screen.getByTestId("page")).toHaveAttribute("data-width", "560");
  });
});
