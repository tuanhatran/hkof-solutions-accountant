import "./AppShell.css";
import { LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useNavigate } from "react-router-dom";
import { logoutSession, useAuthState } from "@/api/queries";
import { MobileNavigation, SideNavigation } from "@/components/layout/AppNav";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { LlmBadge } from "@/components/llm/LlmBadge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ToastHost } from "@/components/ui/ToastHost";
import { useDraftBlock } from "@/hooks/useDraftBlock";
import { cn } from "@/lib/cn";
import { saveActiveDraft } from "@/state/draftSaver";

function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();

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
          <p className="app-shell-brand-tagline">{t("shell.tagline")}</p>
        ) : null}
      </div>
    </div>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const { user } = useAuthState();
  const navigate = useNavigate();
  const blocker = useDraftBlock();
  const [savingDraft, setSavingDraft] = useState(false);

  async function logout() {
    await logoutSession();
    navigate("/connexion", { replace: true });
  }

  async function saveAndLeave() {
    if (blocker.state !== "blocked") {
      return;
    }
    setSavingDraft(true);
    try {
      if (await saveActiveDraft()) {
        blocker.proceed();
      }
    } finally {
      setSavingDraft(false);
    }
  }

  return (
    <div className="app-shell">
      <a href="#contenu" className="app-shell-skip-link">
        {t("shell.skipLink")}
      </a>

      <aside className="app-shell-sidebar hidden lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <SideNavigation />
        <div className="app-shell-local-data" title={t("shell.localDataText")}>
          <ShieldCheck
            size={14}
            className="app-shell-local-data-icon"
            aria-hidden="true"
          />
          <span>{t("shell.localDataTitle")}</span>
        </div>
        <p className="app-shell-footer">{t("shell.footer")}</p>
      </aside>

      <div className="min-w-0">
        <header className="app-shell-mobile-header lg:hidden">
          <div className="app-shell-mobile-top">
            <Brand compact />
            <LlmBadge />
          </div>
          <MobileNavigation />
        </header>

        <div className="app-shell-topbar">
          <div className="app-shell-topbar-actions ml-auto">
            <LlmBadge />
            <LanguageSelector />
            {user ? (
              <div
                className="flex min-w-0 items-center gap-2"
                aria-label={t("shell.accountAria")}
              >
                <span
                  className="hidden max-w-[14rem] truncate text-xs text-ink-soft sm:inline"
                  title={user.email}
                >
                  {user.email}
                </span>
                <Button
                  variant="ghost"
                  small
                  icon={<LogOut size={14} aria-hidden="true" />}
                  onClick={() => void logout()}
                  data-cy="logout"
                >
                  {t("shell.logout")}
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <main id="contenu" className="app-shell-main">
          <Outlet />
        </main>
      </div>

      <ToastHost />
      <ConfirmDialog
        open={blocker.state === "blocked"}
        title={t("shell.draftDialog.title")}
        message={t("shell.draftDialog.message")}
        confirmLabel={t("shell.draftDialog.confirm")}
        cancelLabel={t("shell.draftDialog.cancel")}
        variant="danger"
        extraAction={{
          label: t("shell.draftDialog.save"),
          onClick: () => void saveAndLeave(),
          loading: savingDraft,
        }}
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
        dataCy="dialog-leave"
      />
    </div>
  );
}
