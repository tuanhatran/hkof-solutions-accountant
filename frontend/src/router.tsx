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
    <div className="card mx-auto mt-10 flex max-w-lg flex-col items-center px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
        <Compass size={26} aria-hidden="true" />
      </span>
      <p className="eyebrow mt-5">Erreur 404</p>
      <h1 className="mt-2 text-3xl text-ink">Page introuvable</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Cette adresse ne correspond à aucune page de HomeOfficeExpenses. Vos
        brouillons restent conservés pendant la session.
      </p>
      <Link to="/generer/quittance" className="mt-6">
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
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">HomeOfficeExpenses</p>
      <h1 className="mt-2 text-4xl text-ink">
        L’application a rencontré une erreur
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
        {message}
      </p>
      <p className="mt-2 max-w-lg text-xs text-ink-soft">
        Vos données enregistrées ne sont pas affectées. Rechargez la page pour
        reprendre ; les brouillons de la session restent dans le stockage local
        du navigateur.
      </p>
      <Button
        variant="primary"
        className="mt-6"
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
