import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FileDropzone, SelectedFile } from "./FileDropzone";

function pdfFile(name = "facture.pdf", size = 1024): File {
  return new File([new Uint8Array(size)], name, { type: "application/pdf" });
}

describe("FileDropzone", () => {
  it("accepts a supported file and forwards it", async () => {
    const onFile = vi.fn();
    render(<FileDropzone dataCy="depot" onFile={onFile} />);

    const input = screen.getByLabelText("Choisir un fichier justificatif");
    await userEvent.setup().upload(input, pdfFile());

    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile.mock.calls[0][0]).toBeInstanceOf(File);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("rejects a file larger than the configured limit", async () => {
    const onFile = vi.fn();
    render(
      <FileDropzone
        dataCy="depot"
        onFile={onFile}
        maxSize={1024}
        formatsDescription="PDF"
      />,
    );

    const input = screen.getByLabelText("Choisir un fichier justificatif");
    await userEvent
      .setup()
      .upload(input, pdfFile("enorme.pdf", 2048));

    expect(onFile).not.toHaveBeenCalled();
    expect(
      screen.getByText("Fichier trop volumineux (0 Mo maximum)."),
    ).toBeVisible();
  });

  it("rejects an unsupported format", async () => {
    const onFile = vi.fn();
    render(<FileDropzone dataCy="depot" onFile={onFile} />);

    const input = screen.getByLabelText("Choisir un fichier justificatif");
    await userEvent
      .setup({ applyAccept: false })
      .upload(
        input,
        new File(["<html>"], "page.html", { type: "text/html" }),
      );

    expect(onFile).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Format non accepté. Formats : PDF, DOCX, XLSX, XLS, CSV, TXT, JPG, PNG.",
      ),
    ).toBeVisible();
  });

  it("prefers the external error and disables the zone", () => {
    render(
      <FileDropzone
        dataCy="depot"
        onFile={vi.fn()}
        externalError="Justificatif obligatoire."
        disabled
        text="Déposez ici"
        ariaLabel="Déposer le justificatif"
      />,
    );

    expect(screen.getByText("Déposez ici")).toBeVisible();
    expect(screen.getByText("Justificatif obligatoire.")).toBeVisible();
    expect(
      screen.getByLabelText("Déposer le justificatif").closest("[aria-disabled]"),
    ).toHaveAttribute("aria-disabled", "true");
  });
});

describe("SelectedFile", () => {
  it("shows the file size and removes the file", async () => {
    const onRemove = vi.fn();
    render(
      <SelectedFile
        name="facture.pdf"
        size={2048}
        mimeType="application/pdf"
        onRemove={onRemove}
      />,
    );

    expect(screen.getByText("facture.pdf")).toBeVisible();
    expect(screen.getByText("2 Ko")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Retirer facture.pdf" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("shows the default size text and disables removal in progress", () => {
    render(
      <SelectedFile
        name="photo.png"
        size={null}
        mimeType="image/png"
        inProgress
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("Justificatif joint")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Retirer photo.png" }),
    ).toBeDisabled();
  });

  it("renders a table icon for a spreadsheet and hides removal without handler", () => {
    render(
      <SelectedFile name="notes.csv" mimeType="text/csv" size={100} />,
    );

    expect(screen.getByText("notes.csv")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Retirer/ }),
    ).not.toBeInTheDocument();
  });
});
