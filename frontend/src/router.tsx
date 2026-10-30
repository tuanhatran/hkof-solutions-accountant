import "./router.css";
import { ArrowLeft, Compass } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import {
  Link,
  Navigate,
  Outlet,
  createBrowserRouter,
  isRouteErrorResponse,
  useLocation,
  useRouteError,
  type RouteObject,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { refreshAuth, useAuthState, useModuleAccess } from "@/api/queries";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { AuthPage } from "@/pages/auth/AuthPage";
import { AdminLlmPage } from "@/pages/admin-llm/AdminLlmPage";
import { AdminUsersPage } from "@/pages/admin-users/AdminUsersPage";
import { LmnpPage } from "@/pages/settings/LmnpPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { GenerateExpenseStatementPage } from "@/pages/expense-statement/GenerateExpenseStatementPage";
import { GenerateRentReceiptPage } from "@/pages/rent-receipt/GenerateRentReceiptPage";
import { HistoryPage } from "@/pages/history/HistoryPage";
import { TemplatesPage } from "@/pages/templates/TemplatesPage";

export function NotFoundPage() {
  const { homePath } = useModuleAccess();

  return (
    <div className="card router-not-found">
      <span className="router-not-found-icon">
        <Compass size={26} aria-hidden="true" />
      </span>
      <p className="eyebrow router-not-found-eyebrow">Erreur 404</p>
      <h1 className="router-not-found-title">Page introuvable</h1>
      <p className="router-not-found-text">
        Cette adresse ne correspond à aucune page de HomeOfficeExpenses. Vos
        brouillons restent conservés pendant la session.
      </p>
      <Link to={homePath} className="router-not-found-action">
        <Button variant="primary" icon={<ArrowLeft size={15} />}>
          Revenir à la génération
        </Button>
      </Link>
    </div>
  );
}

function AppError() {
  const errorText = useRouteError();
  const message = routeErrorMessage(errorText);

  return (
    <div className="router-error">
      <p className="eyebrow">HomeOfficeExpenses</p>
      <h1 className="router-error-title">
        L’application a rencontré une erreur
      </h1>
      <p className="router-error-message">{message}</p>
      <p className="router-error-note">
        Vos données enregistrées ne sont pas affectées. Rechargez la page pour
        reprendre ; les brouillons de la session restent dans le stockage local
        du navigateur.
      </p>
      <Button
        variant="primary"
        className="router-error-action"
        onClick={() => window.location.assign("/")}
      >
        Recharger HomeOfficeExpenses
      </Button>
    </div>
  );
}

/** French message displayed by the router error page. */
export function routeErrorMessage(errorText: unknown): string {
  if (isRouteErrorResponse(errorText)) {
    return `${errorText.status} — ${errorText.statusText}`;
  }
  if (errorText instanceof Error) {
    return errorText.message;
  }
  return "Une erreur inattendue est survenue.";
}

function SessionBootstrap() {
  const { t } = useTranslation();
  const { loading } = useAuthState();

  useEffect(() => {
    void refreshAuth();
  }, []);

  if (loading) {
    return (
      <p className="auth-page-loading" role="status">
        {t("auth.loading")}
      </p>
    );
  }
  return <Outlet />;
}

function RequireAuth() {
  const { user, loading } = useAuthState();
  const location = useLocation();

  if (loading) {
    return null;
  }
  if (!user) {
    return (
      <Navigate
        to="/connexion"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  if (user.mustChangePassword && location.pathname !== "/mot-de-passe") {
    return <Navigate to="/mot-de-passe" replace />;
  }
  return <Outlet />;
}

/** Sends the account to the generator of its active modules. */
function HomeRedirect() {
  const { homePath } = useModuleAccess();
  return <Navigate to={homePath} replace />;
}

/** Keeps a page of a disabled module unreachable. */
function ModuleRoute({
  module,
  children,
}: {
  module: "company" | "lmnp";
  children: ReactNode;
}) {
  const access = useModuleAccess();
  const enabled =
    module === "company" ? access.companyEnabled : access.lmnpEnabled;

  if (!enabled) {
    return <Navigate to={access.homePath} replace />;
  }
  return <>{children}</>;
}

/** Users administration is reserved to the ADMIN role. */
function AdminRoute({ children }: { children: ReactNode }) {
  const access = useModuleAccess();

  if (!access.isAdmin) {
    return <Navigate to={access.homePath} replace />;
  }
  return <>{children}</>;
}

const appRoutes: RouteObject[] = [
  { index: true, element: <HomeRedirect /> },
  {
    path: "generer",
    element: <HomeRedirect />,
  },
  {
    path: "generer/quittance",
    element: (
      <ModuleRoute module="lmnp">
        <GenerateRentReceiptPage />
      </ModuleRoute>
    ),
  },
  {
    path: "generer/note-frais",
    element: (
      <ModuleRoute module="company">
        <GenerateExpenseStatementPage />
      </ModuleRoute>
    ),
  },
  { path: "historique", element: <HistoryPage /> },
  {
    path: "configuration",
    element: (
      <ModuleRoute module="company">
        <Navigate to="/configuration/entreprise" replace />
      </ModuleRoute>
    ),
  },
  {
    path: "configuration/entreprise",
    element: (
      <ModuleRoute module="company">
        <SettingsPage />
      </ModuleRoute>
    ),
  },
  {
    path: "configuration/lmnp",
    element: (
      <ModuleRoute module="lmnp">
        <LmnpPage />
      </ModuleRoute>
    ),
  },
  { path: "templates", element: <TemplatesPage /> },
  {
    path: "admin/utilisateurs",
    element: (
      <AdminRoute>
        <AdminUsersPage />
      </AdminRoute>
    ),
  },
  { path: "admin", element: <AdminLlmPage /> },
  { path: "*", element: <NotFoundPage /> },
];

export const routes: RouteObject[] = [
  {
    element: <SessionBootstrap />,
    errorElement: <AppError />,
    children: [
      { path: "connexion", element: <AuthPage mode="login" /> },
      { path: "inscription", element: <AuthPage mode="register" /> },
      { path: "confirmer-email", element: <AuthPage mode="confirm" /> },
      {
        element: <RequireAuth />,
        children: [
          { path: "mot-de-passe", element: <AuthPage mode="password" /> },
          { path: "/", element: <AppShell />, children: appRoutes },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
