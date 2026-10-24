import "./AppShell.css";
import {
  Bot,
  FileText,
  History,
  LayoutTemplate,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useId } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useCompanies } from "@/api/queries";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LlmBadge } from "@/components/llm/LlmBadge";
import { ToastHost } from "@/components/ui/ToastHost";
import { useDraftBlock } from "@/hooks/useDraftBlock";
import { cn } from "@/lib/cn";
import { resolveActiveCompanyId, useCompanyStore } from "@/state/company";

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
    <div className="app-shell-brand">
      <span
        className={cn(
          "app-shell-brand-mark",
          compact
            ? "app-shell-brand-mark-compact"
            : "app-shell-brand-mark-full",
        )}
        aria-hidden="true"
      >
        F
      </span>
      <div>
        <p
          className={cn(
            "app-shell-brand-title",
            compact
              ? "app-shell-brand-title-compact"
              : "app-shell-brand-title-full",
          )}
        >
          HomeOfficeExpenses
        </p>
        {!compact ? (
          <p className="app-shell-brand-tagline">
            Quittances &amp; frais d’occupation
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CompanySwitcher() {
  const selectId = useId();
  const companies = useCompanies();
  const activeCompanyId = useCompanyStore((state) => state.activeCompanyId);
  const setActiveCompany = useCompanyStore((state) => state.setActiveCompany);

  useEffect(() => {
    if (!companies.isSuccess) {
      return;
    }
    const resolved = resolveActiveCompanyId(activeCompanyId, companies.data);
    if (resolved !== activeCompanyId) {
      setActiveCompany(resolved);
    }
  }, [companies.isSuccess, companies.data, activeCompanyId, setActiveCompany]);

  if (companies.isPending) {
    return <p className="app-shell-company-empty">Chargement des sociétés…</p>;
  }
  if (companies.isError) {
    return (
      <p role="alert" className="app-shell-company-empty">
        Impossible de charger les sociétés.
      </p>
    );
  }
  const list = companies.data ?? [];
  if (list.length === 0) {
    return (
      <p className="app-shell-company-empty">
        Aucune société configurée. Ajoutez-en une dans Configuration.
      </p>
    );
  }

  return (
    <div className="app-shell-company">
      <label htmlFor={selectId} className="app-shell-company-label">
        Société active
      </label>
      <select
        id={selectId}
        className="app-shell-company-select"
        value={activeCompanyId === null ? "" : String(activeCompanyId)}
        onChange={(event) =>
          setActiveCompany(
            event.target.value === "" ? null : Number(event.target.value),
          )
        }
        data-cy="select-societe-active"
      >
        {activeCompanyId === null ? (
          <option value="">Sélectionnez une société</option>
        ) : null}
        {list.map((company) => (
          <option key={String(company.id)} value={String(company.id)}>
            {company.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function SideNavigation() {
  return (
    <nav className="app-shell-nav" aria-label="Navigation principale">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="app-shell-nav-section">{section.title}</p>
          <div className="app-shell-nav-links">
            {section.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                data-cy={link.dataCy}
                className={({ isActive }) =>
                  cn(
                    "group app-shell-nav-link",
                    isActive
                      ? "app-shell-nav-link-active"
                      : "app-shell-nav-link-idle",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <link.icon
                      size={17}
                      className={cn(
                        "app-shell-nav-icon",
                        isActive
                          ? "app-shell-nav-icon-active"
                          : "app-shell-nav-icon-idle",
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{link.label}</span>
                    {isActive ? (
                      <span className="app-shell-nav-dot" aria-hidden="true" />
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
    <div className="app-shell">
      <a href="#contenu" className="app-shell-skip-link">
        Aller au contenu
      </a>

      <aside className="app-shell-sidebar hidden lg:flex">
        <div className="px-2">
          <Brand />
          <CompanySwitcher />
        </div>
        <SideNavigation />
        <div className="app-shell-info-card">
          <div className="app-shell-info-header">
            <ShieldCheck
              size={14}
              className="app-shell-info-icon"
              aria-hidden="true"
            />
            Données locales
          </div>
          <p className="app-shell-info-text">
            Aucune donnée ne quitte votre machine tant que l’URL du LLM reste
            locale.
          </p>
          <div className="mt-3">
            <LlmBadge dark />
          </div>
        </div>
        <p className="app-shell-footer">HomeOfficeExpenses · usage personnel</p>
      </aside>

      <div className="min-w-0">
        <header className="app-shell-mobile-header lg:hidden">
          <div className="app-shell-mobile-top">
            <Brand compact />
            <LlmBadge dark />
          </div>
          <div className="app-shell-mobile-company">
            <CompanySwitcher />
          </div>
          <nav
            className="app-shell-mobile-nav"
            aria-label="Navigation principale mobile"
          >
            {MOBILE_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "app-shell-mobile-link",
                    isActive
                      ? "app-shell-mobile-link-active"
                      : "app-shell-mobile-link-idle",
                  )
                }
              >
                <link.icon size={13} aria-hidden="true" />
                {link.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main id="contenu" className="app-shell-main">
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
