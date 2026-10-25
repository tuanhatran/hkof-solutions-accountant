import "./AppShell.css";
import { ShieldCheck } from "lucide-react";
import { Outlet } from "react-router-dom";
import { AppCompanySelect } from "@/components/layout/AppCompanySelect";
import { MobileNavigation, SideNavigation } from "@/components/layout/AppNav";
import { LlmBadge } from "@/components/llm/LlmBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ToastHost } from "@/components/ui/ToastHost";
import { useDraftBlock } from "@/hooks/useDraftBlock";
import { cn } from "@/lib/cn";

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
          <AppCompanySelect />
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
            <AppCompanySelect />
          </div>
          <MobileNavigation />
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
