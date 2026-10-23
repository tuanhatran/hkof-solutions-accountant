import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  blobRequest,
  downloadBlob,
  errorMessage,
  isCancellation,
  request,
} from "./client";

interface FakeOptions {
  status?: number;
  ok?: boolean;
  json?: unknown;
  text?: string;
  contentType?: string;
  disposition?: string;
  blob?: Blob;
  textThrows?: boolean;
}

function fakeResponse(options: FakeOptions = {}): Response {
  const headers = new Headers();
  if (options.contentType) {
    headers.set("content-type", options.contentType);
  }
  if (options.disposition) {
    headers.set("content-disposition", options.disposition);
  }
  const body =
    options.text ??
    (options.json !== undefined ? JSON.stringify(options.json) : "");
  const response = {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    headers,
    text: async () => {
      if (options.textThrows) {
        throw new Error("stream failed");
      }
      return body;
    },
    json: async () => (options.json !== undefined ? options.json : JSON.parse(body)),
    clone: () => ({
      text: async () => body,
    }),
    blob: async () => options.blob ?? new Blob(["contenu"]),
  };
  return response as unknown as Response;
}

function jsonResponse(json: unknown, status = 200): Response {
  return fakeResponse({
    json,
    status,
    ok: status < 400,
    contentType: "application/json",
  });
}

const fetchMock = vi.fn();

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("request", () => {
  it("returns the parsed JSON body when the response is OK", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 3 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(request<{ id: number }>("/api/test")).resolves.toEqual({
      id: 3,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/test", undefined);
  });

  it("returns the raw text when the content type is not JSON", async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({ text: "bonjour", contentType: "text/plain" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(request<string>("/api/test")).resolves.toBe("bonjour");
  });

  it("returns undefined for a 204 response", async () => {
    fetchMock.mockResolvedValue(fakeResponse({ status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(request<void>("/api/test")).resolves.toBeUndefined();
  });

  it("formats a French ApiError from a JSON problem detail", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { detail: "Le bail est introuvable.", status: 404 },
        404,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const failure = await request("/api/test").catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    const apiError = failure as ApiError;
    expect(apiError.status).toBe(404);
    expect(apiError.message).toBe("Le bail est introuvable.");
    expect(apiError.problem).toEqual({
      detail: "Le bail est introuvable.",
      status: 404,
    });
  });

  it("falls back to the title then the status when the problem has no detail", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ title: "Requête invalide" }, 400),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(request("/api/test")).rejects.toThrow("Requête invalide");

    fetchMock.mockResolvedValueOnce(jsonResponse({}, 500));
    await expect(request("/api/test")).rejects.toThrow("Erreur 500");
  });

  it("returns a generic French error when the body is empty", async () => {
    fetchMock.mockResolvedValue(fakeResponse({ status: 503, ok: false }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(request("/api/test")).rejects.toThrow(
      "Erreur 503 : la requête a échoué.",
    );
  });

  it("returns the raw text of a non-JSON error body", async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        status: 502,
        ok: false,
        text: "Passerelle indisponible",
        contentType: "text/plain",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(request("/api/test")).rejects.toThrow(
      "Passerelle indisponible",
    );
  });

  it("ignores an unparsable problem body", async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        status: 400,
        ok: false,
        text: "pas du json",
        contentType: "application/json",
        textThrows: false,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const failure = (await request("/api/test").catch(
      (error: unknown) => error,
    )) as ApiError;

    expect(failure.status).toBe(400);
    expect(failure.message).toBe("Erreur 400 : la requête a échoué.");
    expect(failure.problem).toBeNull();
  });

  it("reports the French server-unreachable message on a network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    const failure = (await request("/api/test").catch(
      (error: unknown) => error,
    )) as ApiError;

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure.status).toBeNull();
    expect(failure.message).toBe(
      "Le serveur est injoignable. Vérifiez que l'application HomeOfficeExpenses est démarrée.",
    );
  });

  it("rethrows the abort error untouched", async () => {
    const abort = new DOMException("annulé", "AbortError");
    fetchMock.mockRejectedValue(abort);
    vi.stubGlobal("fetch", fetchMock);

    await expect(request("/api/test")).rejects.toBe(abort);
  });
});

describe("blobRequest", () => {
  it("returns the blob and the decoded file name", async () => {
    const blob = new Blob(["pdf"]);
    fetchMock.mockResolvedValue(
      fakeResponse({
        blob,
        disposition: "attachment; filename*=UTF-8''quittance%20janvier.pdf",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(blobRequest("/api/pdf")).resolves.toEqual({
      blob,
      fileName: "quittance janvier.pdf",
    });
  });

  it("reads a simple quoted file name and ignores a missing header", async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse({ disposition: 'attachment; filename="note.pdf"' }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(blobRequest("/api/pdf")).resolves.toMatchObject({
      fileName: "note.pdf",
    });

    fetchMock.mockResolvedValueOnce(fakeResponse({}));
    await expect(blobRequest("/api/pdf")).resolves.toMatchObject({
      fileName: null,
    });
  });

  it("keeps the raw starred name when it cannot be decoded", async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({ disposition: "attachment; filename*=UTF-8''a%ZZb.pdf" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(blobRequest("/api/pdf")).resolves.toMatchObject({
      fileName: "a%ZZb.pdf",
    });
  });

  it("throws a French ApiError for an error response", async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        status: 404,
        ok: false,
        json: { detail: "Document introuvable." },
        contentType: "application/json",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(blobRequest("/api/pdf")).rejects.toMatchObject({
      status: 404,
      message: "Document introuvable.",
    });
  });

  it("reports the unreachable server and rethrows aborts", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(blobRequest("/api/pdf")).rejects.toMatchObject({
      status: null,
    });

    const abort = new DOMException("annulé", "AbortError");
    fetchMock.mockRejectedValueOnce(abort);
    await expect(blobRequest("/api/pdf")).rejects.toBe(abort);
  });
});

describe("downloadBlob", () => {
  it("clicks an anchor and revokes the object URL after a delay", () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => "blob:apercu");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      value: createObjectURL,
      configurable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: revokeObjectURL,
      configurable: true,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    downloadBlob(new Blob(["pdf"]), "quittance.pdf");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector("a[download]")).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1_000);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:apercu");
    click.mockRestore();
  });
});

describe("errorMessage and isCancellation", () => {
  it("reads the message of an ApiError or a standard error", () => {
    expect(errorMessage(new ApiError("Refusé", 409))).toBe("Refusé");
    expect(errorMessage(new Error("Boom"))).toBe("Boom");
    expect(errorMessage("texte")).toBe(
      "Une erreur inattendue est survenue.",
    );
    expect(errorMessage(undefined)).toBe(
      "Une erreur inattendue est survenue.",
    );
  });

  it("detects only abort DOMExceptions as cancellation", () => {
    expect(isCancellation(new DOMException("stop", "AbortError"))).toBe(true);
    expect(isCancellation(new DOMException("stop", "AbortError2"))).toBe(false);
    expect(isCancellation(new Error("AbortError"))).toBe(false);
    expect(isCancellation(null)).toBe(false);
  });
});
