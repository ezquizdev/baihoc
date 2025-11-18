import type { InputHTMLAttributes, ReactNode } from "react";

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
  ...props
}: InputProps) {
  return (
    <label className="flex w-full flex-col gap-1 text-sm text-slate-700">
      {label && <span className="font-medium">{label}</span>}
      <input
        className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 ${
          error ? "border-red-400 focus:ring-red-100" : ""
        } ${className}`}
        {...props}
      />
      {error ? (
        <span className="text-xs text-red-500">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-slate-500">{helperText}</span>
      ) : null}
    </label>
  );
}
