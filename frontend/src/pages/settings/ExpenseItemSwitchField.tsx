import "./ExpenseItemSwitchField.css";
import type { UseFormRegister } from "react-hook-form";
import type { ExpenseItemFormValues } from "@/lib/validation";

/** Checkbox row of the expense item form: title, description and switch input. */
export function ExpenseItemSwitchField({
  id,
  label: labelText,
  description,
  register,
  field,
}: {
  id: string;
  label: string;
  description: string;
  register: UseFormRegister<ExpenseItemFormValues>;
  field: "active" | "multipleLinesAllowed";
}) {
  return (
    <label htmlFor={id} className="expense-item-switch-field">
      <input
        id={id}
        type="checkbox"
        className="expense-item-switch-field-input"
        {...register(field)}
      />
      <span>
        <span className="expense-item-switch-field-label">{labelText}</span>
        <span className="expense-item-switch-field-description">
          {description}
        </span>
      </span>
    </label>
  );
}
