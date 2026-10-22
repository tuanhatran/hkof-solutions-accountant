import {
  Bot,
  FileText,
  History,
  LayoutTemplate,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { ConfirmDialog } from "./ConfirmDialog";
import { LlmBadge } from "./LlmBadge";
import { ToastHost } from "./ToastHost";
import { useDraftBlock } from "@/hooks/useDraftBlock";
import { cn } from "@/lib/cn";

const SECTIONS = [
  {
    title: "Générer",
    links: [
      {
        to: "/generer/quittance",
        label: "Quittance de loyer",
        icon: ReceiptText,
        dataCy: "tab-quittance",
      },
      {
        to: "/generer/note-frais",
        label: "Note de frais",
        icon: FileText,
        dataCy: "tab-note-frais",
      },
    ],
  },
  {
    title: "Suivi",
    links: [
      {
        to: "/historique",
        label: "Historique",
        icon: History,
        dataCy: "tab-historique",
      },
    ],
  },
  {
    title: "Réglages",
    links: [
      {
        to: "/configuration",
        label: "Configuration",
        icon: SlidersHorizontal,
        dataCy: "tab-configuration",
      },
      {
        to: "/templates",
        label: "Templates",
        icon: LayoutTemplate,
        dataCy: "tab-templates",
      },
      { to: "/admin", label: "Admin IA", icon: Bot, dataCy: "tab-admin" },
    ],
  },
];

const MOBILE_LINKS = SECTIONS.flatMap((section) => section.links);

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "grid place-items-center rounded-xl bg-[#f4f0e8] font-display font-bold text-accent-strong shadow-sm",
          compact ? "h-9 w-9 text-lg" : "h-11 w-11 text-xl",
        )}
        aria-hidden="true"
      >
        F
      </span>
      <div>
        <p
          className={cn(
            "font-display font-semibold tracking-tight text-white",
            compact ? "text-lg" : "text-xl",
          )}
        >
          HomeOfficeExpenses
        </p>
        {!compact ? (
          <p className="text-[11px] text-white/50">
            Quittances &amp; frais d’occupation
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SideNavigation() {
  return (
    <nav className="mt-8 flex-1 space-y-6" aria-label="Navigation principale">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
            {section.title}
          </p>
          <div className="mt-2 space-y-1">
            {section.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                data-cy={link.dataCy}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition",
                    isActive
                      ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                      : "text-white/60 hover:bg-white/[0.06] hover:text-white/90",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <link.icon
                      size={17}
                      className={cn(
                        "shrink-0 transition",
                        isActive
                          ? "text-[#e7b98f]"
                          : "text-white/45 group-hover:text-white/70",
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{link.label}</span>
                    {isActive ? (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-[#e7b98f]"
                        aria-hidden="true"
                      />
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AppShell() {
  const blocker = useDraftBlock();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <a
        href="#contenu"
        className="sr-only z-[70] rounded-lg bg-surface px-4 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Aller au contenu
      </a>

      <aside
        className="sticky top-0 hidden h-screen flex-col overflow-y-auto px-4 py-7 lg:flex"
        style={{
          backgroundImage:
            "linear-gradient(158deg, #164a3c 0%, #113d31 46%, #0c2f27 100%)",
        }}
      >
        <div className="px-2">
          <Brand />
        </div>
        <SideNavigation />
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.055] p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
            <ShieldCheck
              size={14}
              className="text-[#e7b98f]"
              aria-hidden="true"
            />
            Données locales
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-white/45">
            Aucune donnée ne quitte votre machine tant que l’URL du LLM reste
            locale.
          </p>
          <div className="mt-3">
            <LlmBadge dark />
          </div>
        </div>
        <p className="mt-5 px-2 text-[10px] text-white/25">
          HomeOfficeExpenses · usage personnel
        </p>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line/80 bg-[#123f33] px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Brand compact />
            <LlmBadge dark />
          </div>
          <nav
            className="-mx-1 mt-3 flex gap-1 overflow-x-auto pb-0.5"
            aria-label="Navigation principale mobile"
          >
            {MOBILE_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                    isActive
                      ? "bg-white/12 text-white"
                      : "text-white/60 hover:text-white/90",
                  )
                }
              >
                <link.icon size={13} aria-hidden="true" />
                {link.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main
          id="contenu"
          className="mx-auto w-full max-w-[1580px] px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:py-9"
        >
          <Outlet />
        </main>
      </div>

      <ToastHost />
      <ConfirmDialog
        open={blocker.state === "blocked"}
        title="Brouillon non généré"
        message="Des informations saisies ne sont pas encore enregistrées. Voulez-vous vraiment quitter cette page ? Le brouillon est conservé pendant la session, mais le document ne sera pas généré."
        confirmLabel="Quitter la page"
        cancelLabel="Rester"
        variant="danger"
        onConfirm={() => {
          if (blocker.state === "blocked") {
            blocker.proceed();
          }
        }}
        onCancel={() => {
          if (blocker.state === "blocked") {
            blocker.reset();
          }
        }}
        dataCy="dialogue-quitter"
      />
    </div>
  );
}
