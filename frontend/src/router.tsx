import "./router.css";
import { ArrowLeft, Compass } from "lucide-react";
import {
  Link,
  Navigate,
  createBrowserRouter,
  isRouteErrorResponse,
  useRouteError,
} from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { AdminLlmPage } from "@/pages/admin-llm/AdminLlmPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { GenerateExpenseStatementPage } from "@/pages/expense-statement/GenerateExpenseStatementPage";
import { GenerateRentReceiptPage } from "@/pages/rent-receipt/GenerateRentReceiptPage";
import { HistoryPage } from "@/pages/history/HistoryPage";
import { TemplatesPage } from "@/pages/templates/TemplatesPage";

function NotFoundPage() {
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
      <Link to="/generer/quittance" className="router-not-found-action">
        <Button variant="primary" icon={<ArrowLeft size={15} />}>
          Revenir à la génération
        </Button>
      </Link>
    </div>
  );
}

function AppError() {
  const errorText = useRouteError();
  const message = isRouteErrorResponse(errorText)
    ? `${errorText.status} — ${errorText.statusText}`
    : errorText instanceof Error
      ? errorText.message
      : "Une erreur inattendue est survenue.";

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

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <AppError />,
    children: [
      { index: true, element: <Navigate to="/generer/quittance" replace /> },
      {
        path: "generer",
        element: <Navigate to="/generer/quittance" replace />,
      },
      { path: "generer/quittance", element: <GenerateRentReceiptPage /> },
      { path: "generer/note-frais", element: <GenerateExpenseStatementPage /> },
      { path: "historique", element: <HistoryPage /> },
      { path: "configuration", element: <SettingsPage /> },
      { path: "templates", element: <TemplatesPage /> },
      { path: "admin", element: <AdminLlmPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
