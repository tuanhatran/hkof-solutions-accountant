import "./MonthField.css";
import type { ChangeEvent, InputHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/cn";
import { formatMonth } from "@/lib/format";

/**
 * Extra native input props forwarded to the month input, including the
 * react-hook-form `name`, `onBlur` and `ref`. Own value, id and type stay
 * controlled by the component.
 */
type MonthFieldInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "type" | "value" | "onChange"
> & {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  ref?: Ref<HTMLInputElement>;
};

interface MonthFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  help?: string;
  dataCy?: string;
  inputProps?: MonthFieldInputProps;
}

/**
 * Compact month control of the generation page headers: a native
 * `type="month"` input, its visible label and a French month echo. The native
 * picker is kept; the echo only restates the selected month.
 */
export function MonthField({
  id,
  label,
  value,
  onChange,
  error,
  help,
  dataCy,
  inputProps,
}: MonthFieldProps) {
  const { onChange: inputOnChange, ...rest } = inputProps ?? {};
  const descriptionId = error ? `${id}-error` : help ? `${id}-hint` : undefined;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    inputOnChange?.(event);
    onChange(event.target.value);
  }

  return (
    <div className="month-field">
      <label htmlFor={id} className="month-field-label">
        {label}
      </label>
      <input
        {...rest}
        id={id}
        type="month"
        value={value}
        onChange={handleChange}
        aria-invalid={Boolean(error)}
        aria-describedby={descriptionId}
        data-cy={dataCy}
        className={cn("month-field-input", error && "month-field-input-error")}
      />
      <span className="month-field-echo" aria-live="polite">
        {formatMonth(value)}
      </span>
      {help && !error ? (
        <p className="month-field-hint" id={`${id}-hint`}>
          {help}
        </p>
      ) : null}
      {error ? (
        <p className="month-field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
