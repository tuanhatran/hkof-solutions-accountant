import "./OnboardingCompanySteps.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { errorMessage } from "@/api/client";
import {
  completeOnboardingSession,
  useAuthState,
  useModuleAccess,
} from "@/api/queries";
import { finalizeCompanyOnboarding } from "./companyOnboardingRequests";
import { OnboardingCompanyStepEmployees } from "./OnboardingCompanyStepEmployees";
import { OnboardingCompanyStepExpenses } from "./OnboardingCompanyStepExpenses";
import { OnboardingCompanyStepIdentity } from "./OnboardingCompanyStepIdentity";
import { OnboardingCompanyStepLease } from "./OnboardingCompanyStepLease";
import { OnboardingCompanyStepNav } from "./OnboardingCompanyStepNav";
import { OnboardingCompanyStepSummary } from "./OnboardingCompanyStepSummary";
import { OnboardingSkipButton } from "./OnboardingSkipButton";
import { setOnboardingSkipped } from "./useOnboardingPersistence";
import { useCompanyOnboardingPersistence } from "./useCompanyOnboardingPersistence";
import { useCompanyOnboardingState } from "./useCompanyOnboardingState";

/** Company track of the onboarding, from legal identity to the resumable finalize. */
export function OnboardingCompanyWizard() {
  const navigate = useNavigate();
  const { user } = useAuthState();
  const access = useModuleAccess();
  const { load, save, clear } = useCompanyOnboardingPersistence(user?.email);
  const [initialSaved] = useState(() => load());
  const {
    step,
    draft,
    created,
    next,
    back,
    restoreState,
    updateIdentity,
    updateLease,
    updateExpenses,
    updateEmployees,
    markCreated,
  } = useCompanyOnboardingState(initialSaved ?? undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialSaved && user?.email) {
      const persisted = load();
      if (persisted) {
        restoreState(persisted.step, persisted.draft, persisted.created);
      }
    }
  }, [initialSaved, user?.email, load, restoreState]);

  useEffect(() => {
    if (user?.email) save({ step, draft, created });
  }, [step, draft, created, save, user?.email]);

  function handleSkip() {
    save({ step, draft, created });
    setOnboardingSkipped(true);
    navigate(access.homePath);
  }

  const skipAction = <OnboardingSkipButton onClick={handleSkip} />;

  async function finalize() {
    setPending(true);
    setError(null);
    try {
      await finalizeCompanyOnboarding({ draft, created, markCreated });
      await completeOnboardingSession();
      clear();
      setOnboardingSkipped(false);
      navigate("/generate/expense-statement", { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <OnboardingCompanyStepNav currentStep={step} />

      {step === 0 ? (
        <OnboardingCompanyStepIdentity
          values={draft.identity}
          pending={pending}
          error={error}
          onNext={(values) => {
            updateIdentity(values);
            next();
          }}
          skipAction={skipAction}
        />
      ) : null}
      {step === 1 ? (
        <OnboardingCompanyStepLease
          values={draft.lease}
          pending={pending}
          error={error}
          onChange={updateLease}
          onBack={(values) => {
            updateLease(values);
            back();
          }}
          onNext={(values) => {
            updateLease(values);
            next();
          }}
          skipAction={skipAction}
        />
      ) : null}
      {step === 2 ? (
        <OnboardingCompanyStepExpenses
          values={draft.expenses}
          pending={pending}
          error={error}
          onBack={(values) => {
            updateExpenses(values);
            back();
          }}
          onNext={(values) => {
            updateExpenses(values);
            next();
          }}
          skipAction={skipAction}
        />
      ) : null}
      {step === 3 ? (
        <OnboardingCompanyStepEmployees
          values={draft.employees}
          pending={pending}
          error={error}
          onBack={(values) => {
            updateEmployees(values);
            back();
          }}
          onNext={(values) => {
            updateEmployees(values);
            next();
          }}
          skipAction={skipAction}
        />
      ) : null}
      {step === 4 ? (
        <OnboardingCompanyStepSummary
          draft={draft}
          pending={pending}
          error={error}
          onBack={back}
          onFinalize={() => void finalize()}
          skipAction={skipAction}
        />
      ) : null}
    </>
  );
}
