import "./AuthPage.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, LogIn, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { loginSession, setAuthUser, useAuthState } from "@/api/queries";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  type ChangePasswordFormValues,
  type LoginFormValues,
  type RegisterFormValues,
} from "@/lib/validation";

export type AuthMode = "login" | "register" | "confirm" | "password";

const HOME_PATH = "/generer/quittance";
const LOGIN_PATH = "/connexion";

interface FrameProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  titleId: string;
}

function AuthFrame({
  eyebrow,
  title,
  description,
  titleId,
  children,
}: FrameProps) {
  return (
    <main className="auth-page">
      <section className="card auth-page-card" aria-labelledby={titleId}>
        <div className="auth-page-brand">
          <span className="auth-page-brand-mark" aria-hidden="true">
            F
          </span>
          <span className="auth-page-brand-name">HomeOfficeExpenses</span>
        </div>
        <p className="eyebrow auth-page-eyebrow">{eyebrow}</p>
        <h1 id={titleId} className="auth-page-title">
          {title}
        </h1>
        <p className="auth-page-description">{description}</p>
        {children}
      </section>
    </main>
  );
}

function SubmitButton({
  label,
  pending,
  icon,
  dataCy,
}: {
  label: string;
  pending: boolean;
  icon: ReactNode;
  dataCy: string;
}) {
  return (
    <Button
      type="submit"
      variant="primary"
      loading={pending}
      icon={icon}
      className="auth-page-submit"
      data-cy={dataCy}
    >
      {label}
    </Button>
  );
}

function ErrorStatus({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p
      className="auth-page-status auth-page-status-error"
      role="alert"
      data-cy="auth-error"
    >
      {message}
    </p>
  );
}

function useTargetPath(): string {
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  const from = state?.from;
  return from && from.startsWith("/") ? from : HOME_PATH;
}

function LoginPanel() {
  const { t } = useTranslation();
  const { user } = useAuthState();
  const navigate = useNavigate();
  const target = useTargetPath();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    defaultValues: { email: "", password: "" },
  });

  if (user) {
    return (
      <Navigate
        to={user.mustChangePassword ? "/mot-de-passe" : target}
        replace
      />
    );
  }

  async function submit(values: LoginFormValues) {
    setPending(true);
    setSubmitError(null);
    try {
      const signedIn = await loginSession(values.email.trim(), values.password);
      navigate(signedIn.mustChangePassword ? "/mot-de-passe" : target, {
        replace: true,
      });
    } catch (error) {
      setSubmitError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame
      titleId="auth-login-title"
      eyebrow={t("auth.login.eyebrow")}
      title={t("auth.login.title")}
      description={t("auth.login.description")}
    >
      <form
        className="auth-page-form"
        onSubmit={handleSubmit(submit)}
        noValidate
      >
        <FieldGroup
          id="auth-email"
          label={t("auth.fields.email")}
          error={errors.email?.message}
        >
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            autoFocus
            aria-invalid={Boolean(errors.email)}
            className={cn("field", errors.email && "field-error")}
            {...register("email")}
            data-cy="auth-email"
          />
        </FieldGroup>
        <FieldGroup
          id="auth-password"
          label={t("auth.fields.password")}
          error={errors.password?.message}
        >
          <input
            id="auth-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            className={cn("field", errors.password && "field-error")}
            {...register("password")}
            data-cy="auth-password"
          />
        </FieldGroup>
        <ErrorStatus message={submitError} />
        <SubmitButton
          label={t("auth.login.submit")}
          pending={pending}
          icon={<LogIn size={16} aria-hidden="true" />}
          dataCy="auth-submit"
        />
      </form>
      <p className="auth-page-links">
        {t("auth.login.noAccount")}{" "}
        <Link to="/inscription">{t("auth.login.registerLink")}</Link>
      </p>
    </AuthFrame>
  );
}

function RegisterPanel() {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onSubmit",
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  async function submit(values: RegisterFormValues) {
    setPending(true);
    setSubmitError(null);
    const email = values.email.trim().toLowerCase();
    try {
      await api.auth.register({ email, password: values.password });
      setRegisteredEmail(email);
    } catch (error) {
      setSubmitError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    if (!registeredEmail) {
      return;
    }
    setPending(true);
    setSubmitError(null);
    try {
      await api.auth.resendConfirmation({ email: registeredEmail });
      setResent(true);
    } catch (error) {
      setSubmitError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  if (registeredEmail) {
    return (
      <AuthFrame
        titleId="auth-register-success-title"
        eyebrow={t("auth.register.eyebrow")}
        title={t("auth.register.successTitle")}
        description={t("auth.register.description")}
      >
        <div
          className="auth-page-status auth-page-status-success"
          role="status"
        >
          <Mail size={18} aria-hidden="true" />
          <span>{t("auth.register.success")}</span>
        </div>
        <ErrorStatus message={submitError} />
        <div className="auth-page-actions">
          <Button
            variant="primary"
            loading={pending}
            icon={<Mail size={16} aria-hidden="true" />}
            onClick={() => void resend()}
            data-cy="auth-resend"
          >
            {t("auth.register.resend")}
          </Button>
          <Link className="auth-page-secondary-link" to={LOGIN_PATH}>
            {t("auth.register.loginLink")}
          </Link>
        </div>
        {resent ? (
          <p
            className="auth-page-status auth-page-status-success"
            role="status"
          >
            {t("auth.register.resent")}
          </p>
        ) : null}
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      titleId="auth-register-title"
      eyebrow={t("auth.register.eyebrow")}
      title={t("auth.register.title")}
      description={t("auth.register.description")}
    >
      <form
        className="auth-page-form"
        onSubmit={handleSubmit(submit)}
        noValidate
      >
        <FieldGroup
          id="auth-email"
          label={t("auth.fields.email")}
          error={errors.email?.message}
        >
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            autoFocus
            aria-invalid={Boolean(errors.email)}
            className={cn("field", errors.email && "field-error")}
            {...register("email")}
            data-cy="auth-email"
          />
        </FieldGroup>
        <FieldGroup
          id="auth-password"
          label={t("auth.fields.password")}
          error={errors.password?.message}
        >
          <input
            id="auth-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            className={cn("field", errors.password && "field-error")}
            {...register("password")}
            data-cy="auth-password"
          />
        </FieldGroup>
        <FieldGroup
          id="auth-confirm-password"
          label={t("auth.fields.confirmPassword")}
          error={errors.confirmPassword?.message}
        >
          <input
            id="auth-confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            className={cn("field", errors.confirmPassword && "field-error")}
            {...register("confirmPassword")}
            data-cy="auth-password-confirm"
          />
        </FieldGroup>
        <ErrorStatus message={submitError} />
        <SubmitButton
          label={t("auth.register.submit")}
          pending={pending}
          icon={<UserPlus size={16} aria-hidden="true" />}
          dataCy="auth-submit"
        />
      </form>
      <p className="auth-page-links">
        {t("auth.register.hasAccount")}{" "}
        <Link to={LOGIN_PATH}>{t("auth.register.loginLink")}</Link>
      </p>
    </AuthFrame>
  );
}

function ConfirmPanel() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token");
  const started = useRef(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );
  const [failure, setFailure] = useState<string | null>(
    token ? null : t("auth.confirm.missing"),
  );

  useEffect(() => {
    if (!token || started.current) {
      return;
    }
    started.current = true;
    let active = true;
    api.auth
      .confirmEmail({ token })
      .then(() => {
        if (active) {
          setStatus("success");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setStatus("error");
          setFailure(errorMessage(error));
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (status === "success") {
    return (
      <AuthFrame
        titleId="auth-confirm-title"
        eyebrow={t("auth.confirm.eyebrow")}
        title={t("auth.confirm.successTitle")}
        description={t("auth.confirm.success")}
      >
        <Link className="auth-page-primary-link" to={LOGIN_PATH}>
          {t("auth.confirm.backToLogin")}
        </Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      titleId="auth-confirm-title"
      eyebrow={t("auth.confirm.eyebrow")}
      title={t("auth.confirm.title")}
      description={t("auth.confirm.loading")}
    >
      {status === "loading" ? (
        <p className="auth-page-status" role="status" aria-live="polite">
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
          <span>{t("auth.confirm.loading")}</span>
        </p>
      ) : (
        <>
          <ErrorStatus message={failure ?? t("auth.confirm.invalid")} />
          <Link className="auth-page-secondary-link" to={LOGIN_PATH}>
            {t("auth.confirm.backToLogin")}
          </Link>
        </>
      )}
    </AuthFrame>
  );
}

function PasswordPanel() {
  const { t } = useTranslation();
  const { user } = useAuthState();
  const navigate = useNavigate();
  const target = useTargetPath();
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onSubmit",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function submit(values: ChangePasswordFormValues) {
    setPending(true);
    setSubmitError(null);
    try {
      const updated = await api.auth.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setAuthUser(updated);
      navigate(target, { replace: true });
    } catch (error) {
      setSubmitError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame
      titleId="auth-password-title"
      eyebrow={t("auth.password.eyebrow")}
      title={t("auth.password.title")}
      description={t("auth.password.description")}
    >
      {user?.mustChangePassword ? (
        <p className="auth-page-status auth-page-status-warning" role="status">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>{t("auth.password.forced")}</span>
        </p>
      ) : null}
      <form
        className="auth-page-form"
        onSubmit={handleSubmit(submit)}
        noValidate
      >
        <FieldGroup
          id="auth-current-password"
          label={t("auth.fields.currentPassword")}
          error={errors.currentPassword?.message}
        >
          <input
            id="auth-current-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            aria-invalid={Boolean(errors.currentPassword)}
            className={cn("field", errors.currentPassword && "field-error")}
            {...register("currentPassword")}
            data-cy="auth-current-password"
          />
        </FieldGroup>
        <FieldGroup
          id="auth-new-password"
          label={t("auth.fields.newPassword")}
          error={errors.newPassword?.message}
        >
          <input
            id="auth-new-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.newPassword)}
            className={cn("field", errors.newPassword && "field-error")}
            {...register("newPassword")}
            data-cy="auth-new-password"
          />
        </FieldGroup>
        <FieldGroup
          id="auth-confirm-password"
          label={t("auth.fields.confirmPassword")}
          error={errors.confirmPassword?.message}
        >
          <input
            id="auth-confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            className={cn("field", errors.confirmPassword && "field-error")}
            {...register("confirmPassword")}
            data-cy="auth-password-confirm"
          />
        </FieldGroup>
        <ErrorStatus message={submitError} />
        <SubmitButton
          label={t("auth.password.submit")}
          pending={pending}
          icon={<ShieldCheck size={16} aria-hidden="true" />}
          dataCy="auth-submit"
        />
      </form>
    </AuthFrame>
  );
}

/** Single French auth page covering login, registration, confirmation and password change. */
export function AuthPage({ mode }: { mode: AuthMode }) {
  switch (mode) {
    case "register":
      return <RegisterPanel />;
    case "confirm":
      return <ConfirmPanel />;
    case "password":
      return <PasswordPanel />;
    default:
      return <LoginPanel />;
  }
}
