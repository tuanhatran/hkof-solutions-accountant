import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LlmStatusDto } from "@/api/types";
import i18n from "@/i18n";
import { LlmBadge } from "./LlmBadge";

let statusState: {
  data: LlmStatusDto | undefined;
  isPending: boolean;
  isError: boolean;
};

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return { ...actual, useLlmStatus: () => statusState };
});

function renderBadge(props: { dark?: boolean; withLink?: boolean } = {}) {
  return render(
    <MemoryRouter>
      <LlmBadge {...props} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  statusState = {
    data: { status: "PRET", message: "Modèle local disponible" },
    isPending: false,
    isError: false,
  };
});

describe("LlmBadge", () => {
  it.each([
    ["PRET", "IA prête"],
    ["PRET_DISTANT", "IA distante"],
    ["MODELE_ABSENT", "Modèle absent"],
    ["INJOIGNABLE", "IA injoignable"],
    ["DESACTIVE", "IA désactivée"],
  ])("maps the %s status to %s", (status, label) => {
    statusState = {
      data: { status, message: "Message du statut" },
      isPending: false,
      isError: false,
    };
    renderBadge();

    const badge = screen.getByText(label);
    expect(badge).toHaveAttribute("data-cy", "llm-status-badge");
    expect(badge).toHaveAttribute("title", "Message du statut");
  });

  it("uses the dark styling when requested", () => {
    renderBadge({ dark: true });
    const badge = screen.getByText("IA prête");
    expect(badge.className).toContain("llm-badge-dark");
  });

  it("renders loading, error, unknown and missing message states", () => {
    statusState = { data: undefined, isPending: true, isError: false };
    const { rerender } = render(
      <MemoryRouter>
        <LlmBadge withLink={false} />
      </MemoryRouter>,
    );
    expect(screen.getByText("IA…")).toBeVisible();
    expect(screen.getByText("IA…").className).toContain("badge-neutral");

    statusState = { data: undefined, isPending: false, isError: true };
    rerender(
      <MemoryRouter>
        <LlmBadge withLink={false} />
      </MemoryRouter>,
    );
    expect(screen.getByText("IA indisponible")).toBeVisible();
    expect(document.querySelector(".llm-badge-dot-danger")).not.toBeNull();

    statusState = {
      data: { status: "INCONNU" },
      isPending: false,
      isError: false,
    };
    rerender(
      <MemoryRouter>
        <LlmBadge withLink={false} />
      </MemoryRouter>,
    );
    const unknown = screen.getByText("IA inconnue");
    expect(unknown).toHaveAttribute(
      "title",
      "État de l’analyse IA indisponible.",
    );
    expect(unknown.className).toContain("badge-neutral");
  });

  it("wraps the badge in a configuration link by default", () => {
    renderBadge();
    const link = screen.getByRole("link", {
      name: "IA prête. Ouvrir la configuration de l'IA.",
    });
    expect(link).toHaveAttribute("href", "/admin");
    expect(link).toContainElement(screen.getByText("IA prête"));
  });

  it("omits the link when withLink is false", () => {
    renderBadge({ withLink: false });
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("IA prête")).toBeVisible();
  });

  it("does not pulse while pending, on error or when disabled", () => {
    statusState = { data: undefined, isPending: false, isError: true };
    const { rerender } = render(
      <MemoryRouter>
        <LlmBadge withLink={false} />
      </MemoryRouter>,
    );
    expect(document.querySelector(".llm-badge-dot-pulse")).toBeNull();

    statusState = {
      data: { status: "DESACTIVE" },
      isPending: false,
      isError: false,
    };
    rerender(
      <MemoryRouter>
        <LlmBadge withLink={false} />
      </MemoryRouter>,
    );
    expect(document.querySelector(".llm-badge-dot-pulse")).toBeNull();

    statusState = {
      data: { status: "PRET" },
      isPending: false,
      isError: false,
    };
    rerender(
      <MemoryRouter>
        <LlmBadge withLink={false} />
      </MemoryRouter>,
    );
    expect(document.querySelector(".llm-badge-dot-pulse")).not.toBeNull();
  });

  it("renders the status and the configuration link in English", async () => {
    await i18n.changeLanguage("en");

    renderBadge();

    expect(screen.getByText("AI ready")).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: "AI ready. Open the AI configuration.",
      }),
    ).toHaveAttribute("href", "/admin");

    statusState = { data: undefined, isPending: true, isError: false };
    renderBadge({ withLink: false });
    expect(screen.getByText("AI…")).toBeVisible();
  });
});
