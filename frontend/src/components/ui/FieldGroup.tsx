import "./FieldGroup.css";
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

interface FieldGroupProps {
  id: string;
  label: string;
  error?: string;
  help?: string;
  badge?: ReactNode;
  className?: string;
  children: ReactNode;
}

type DescribedProps = {
  "aria-describedby"?: string;
  children?: ReactNode;
};

const DESCRIBED_CONTROLS = new Set(["input", "select", "textarea"]);

/** Adds the description id to the native controls found in the children tree. */
function withDescribedBy(children: ReactNode, describedBy: string): ReactNode {
  if (Array.isArray(children)) {
    return children.map((child) => withDescribedBy(child, describedBy));
  }
  if (!isValidElement(children)) {
    return children;
  }
  const element = children as ReactElement<DescribedProps>;
  const props = element.props;
  if (
    typeof element.type === "string" &&
    DESCRIBED_CONTROLS.has(element.type)
  ) {
    const existing = props["aria-describedby"];
    const tokens = existing ? existing.split(/\s+/).filter(Boolean) : [];
    if (tokens.includes(describedBy)) {
      return children;
    }
    return cloneElement(element, {
      "aria-describedby": [...tokens, describedBy].join(" "),
    });
  }
  if (props.children === undefined) {
    return children;
  }
  return cloneElement(element, {
    children: withDescribedBy(props.children, describedBy),
  });
}

export function FieldGroup({
  id,
  label,
  error: errorText,
  help,
  badge,
  className,
  children,
}: FieldGroupProps) {
  const describedBy = errorText ? `${id}-error` : help ? `${id}-hint` : null;
  const controls = describedBy
    ? withDescribedBy(children, describedBy)
    : children;
  return (
    <div className={className}>
      <div className="field-group-header">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {badge}
      </div>
      {controls}
      {help && !errorText ? (
        <p className="hint" id={`${id}-hint`}>
          {help}
        </p>
      ) : null}
      {errorText ? (
        <p className="error-text" id={`${id}-error`} role="alert">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
