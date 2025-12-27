import { type InputHTMLAttributes, type ReactNode, useId } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  helperText?: string;
  error?: string;
};

export function Input({
  label,
  helperText,
  error,
  className = "",
  id,
  ...props
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const message = error ?? helperText;

  const describedBy = [
    props["aria-describedby"],
    message ? messageId : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex w-full flex-col gap-1 text-sm text-[var(--muted)]">
      {label ? (
        <label htmlFor={inputId} className="font-medium text-[var(--text)]">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`w-full rounded-[var(--radius-md)] border border-[color:var(--line)] bg-[var(--card)] px-3 py-3 text-[var(--text)] shadow-[0_10px_20px_rgba(26,46,93,0.06)] outline-none transition focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(40,104,230,0.16)] ${
          error
            ? "border-[color:var(--danger-border)] focus:border-[var(--danger)] focus:shadow-[0_0_0_3px_rgb(var(--danger-rgb)_/_0.16)]"
            : ""
        } ${className}`}
        {...props}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={describedBy || undefined}
        aria-errormessage={error ? messageId : undefined}
      />
      {message ? (
        <span
          id={messageId}
          className={
            error
              ? "text-xs text-[var(--danger-text)]"
              : "text-xs text-[var(--muted)]"
          }
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}
