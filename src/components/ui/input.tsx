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
    <div className="flex w-full flex-col gap-1 text-sm text-slate-700">
      {label ? (
        <label htmlFor={inputId} className="font-medium">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 ${
          error ? "border-red-400 focus:ring-red-100" : ""
        } ${className}`}
        {...props}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={describedBy || undefined}
        aria-errormessage={error ? messageId : undefined}
      />
      {message ? (
        <span
          id={messageId}
          className={error ? "text-xs text-red-500" : "text-xs text-slate-500"}
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}
