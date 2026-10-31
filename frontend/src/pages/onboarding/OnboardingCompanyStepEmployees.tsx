import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { EMPLOYEE_TITLES } from "@/pages/settings/settingsValues";
import {
  companyOnboardingMessage,
  type CompanyEmployeeValues,
} from "./useCompanyOnboardingState";

interface RowErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface EmployeesStepProps {
  values: CompanyEmployeeValues[];
  pending: boolean;
  error: string | null;
  onBack: (values: CompanyEmployeeValues[]) => void;
  onNext: (values: CompanyEmployeeValues[]) => void;
  skipAction: ReactNode;
}

/** Company step 4: manager and signatory employees with a descriptive title. */
export function OnboardingCompanyStepEmployees({
  values,
  pending,
  error,
  onBack,
  onNext,
  skipAction,
}: EmployeesStepProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<CompanyEmployeeValues[]>(values);
  const [rowErrors, setRowErrors] = useState<Record<number, RowErrors>>({});

  function patch(index: number, changes: Partial<CompanyEmployeeValues>) {
    setRows((current) =>
      current.map((row, position) =>
        position === index ? { ...row, ...changes } : row,
      ),
    );
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        firstName: "",
        lastName: "",
        email: "",
        address: "",
        title: "EMPLOYEE",
        issuePlace: "",
      },
    ]);
  }

  function removeRow(index: number) {
    setRows((current) =>
      current.filter((_row, position) => position !== index),
    );
  }

  function submit() {
    const errors: Record<number, RowErrors> = {};
    rows.forEach((row, index) => {
      const rowError: RowErrors = {};
      if (row.firstName.trim() === "") {
        rowError.firstName = companyOnboardingMessage("employeeFirstName");
      }
      if (row.lastName.trim() === "") {
        rowError.lastName = companyOnboardingMessage("employeeLastName");
      }
      if (row.email.trim() !== "" && !EMAIL_PATTERN.test(row.email.trim())) {
        rowError.email = companyOnboardingMessage("employeeEmail");
      }
      if (Object.keys(rowError).length > 0) {
        errors[index] = rowError;
      }
    });
    setRowErrors(errors);
    if (Object.keys(errors).length === 0) {
      onNext(rows);
    }
  }

  return (
    <section
      className="onboarding-card"
      aria-labelledby="company-employees-title"
    >
      <h2 className="onboarding-section-title" id="company-employees-title">
        {t("onboarding.company.employees.title")}
      </h2>
      <p className="onboarding-section-description">
        {t("onboarding.company.employees.description")}
      </p>

      <div className="onboarding-tenants" data-cy="company-employees-form">
        {rows.map((row, index) => (
          <fieldset
            key={index}
            className="onboarding-tenant"
            aria-label={t("onboarding.company.employees.rowTitle", {
              index: index + 1,
            })}
          >
            <legend className="onboarding-subtitle">
              {t("onboarding.company.employees.rowTitle", {
                index: index + 1,
              })}
            </legend>
            <label
              className="field-label"
              htmlFor={`company-employee-first-${index}`}
            >
              {t("onboarding.company.employees.firstName", {
                index: index + 1,
              })}
            </label>
            <input
              id={`company-employee-first-${index}`}
              className={cn(
                "field",
                rowErrors[index]?.firstName && "field-error",
              )}
              value={row.firstName}
              onChange={(event) =>
                patch(index, { firstName: event.target.value })
              }
              data-cy={`input-company-employee-first-${index}`}
            />
            {rowErrors[index]?.firstName ? (
              <p className="error-text" role="alert">
                {rowErrors[index]?.firstName}
              </p>
            ) : null}
            <label
              className="field-label"
              htmlFor={`company-employee-last-${index}`}
            >
              {t("onboarding.company.employees.lastName", { index: index + 1 })}
            </label>
            <input
              id={`company-employee-last-${index}`}
              className={cn(
                "field",
                rowErrors[index]?.lastName && "field-error",
              )}
              value={row.lastName}
              onChange={(event) =>
                patch(index, { lastName: event.target.value })
              }
              data-cy={`input-company-employee-last-${index}`}
            />
            {rowErrors[index]?.lastName ? (
              <p className="error-text" role="alert">
                {rowErrors[index]?.lastName}
              </p>
            ) : null}
            <label
              className="field-label"
              htmlFor={`company-employee-email-${index}`}
            >
              {t("onboarding.company.employees.email", { index: index + 1 })}
            </label>
            <input
              id={`company-employee-email-${index}`}
              className={cn("field", rowErrors[index]?.email && "field-error")}
              type="email"
              value={row.email}
              onChange={(event) => patch(index, { email: event.target.value })}
              data-cy={`input-company-employee-email-${index}`}
            />
            {rowErrors[index]?.email ? (
              <p className="error-text" role="alert">
                {rowErrors[index]?.email}
              </p>
            ) : null}
            <label
              className="field-label"
              htmlFor={`company-employee-title-${index}`}
            >
              {t("onboarding.company.employees.titleField", {
                index: index + 1,
              })}
            </label>
            <select
              id={`company-employee-title-${index}`}
              className="field"
              value={row.title}
              onChange={(event) =>
                patch(index, { title: event.target.value as typeof row.title })
              }
              data-cy={`select-company-employee-title-${index}`}
            >
              {EMPLOYEE_TITLES.map((title) => (
                <option key={title.value} value={title.value}>
                  {t(title.labelKey)}
                </option>
              ))}
            </select>
            <label
              className="field-label"
              htmlFor={`company-employee-address-${index}`}
            >
              {t("onboarding.company.employees.address", { index: index + 1 })}
            </label>
            <AddressAutocomplete
              id={`company-employee-address-${index}`}
              value={row.address}
              onChange={(value) => patch(index, { address: value })}
              data-cy={`input-company-employee-address-${index}`}
            />
            <label
              className="field-label"
              htmlFor={`company-employee-issue-place-${index}`}
            >
              {t("onboarding.company.employees.issuePlace", {
                index: index + 1,
              })}
            </label>
            <input
              id={`company-employee-issue-place-${index}`}
              className="field"
              value={row.issuePlace}
              onChange={(event) =>
                patch(index, { issuePlace: event.target.value })
              }
              data-cy={`input-company-employee-issue-place-${index}`}
            />
            {index > 0 ? (
              <div className="onboarding-tenant-actions">
                <Button
                  variant="ghost"
                  small
                  onClick={() => removeRow(index)}
                  data-cy={`btn-remove-company-employee-${index}`}
                >
                  {t("onboarding.company.employees.remove", {
                    index: index + 1,
                  })}
                </Button>
              </div>
            ) : null}
          </fieldset>
        ))}
      </div>

      <Button
        variant="ghost"
        small
        className="company-onboarding-add"
        onClick={addRow}
        data-cy="btn-add-company-employee"
      >
        {t("onboarding.company.employees.add")}
      </Button>

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <div className="onboarding-actions">
        {skipAction}
        <Button
          variant="ghost"
          data-cy="btn-company-back"
          onClick={() => onBack(rows)}
        >
          {t("onboarding.navigation.back")}
        </Button>
        <Button
          variant="primary"
          loading={pending}
          data-cy="btn-company-next"
          onClick={submit}
        >
          {t("onboarding.navigation.next")}
        </Button>
      </div>
    </section>
  );
}
