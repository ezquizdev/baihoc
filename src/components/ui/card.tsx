import type { PropsWithChildren, ReactNode } from "react";

type CardProps = PropsWithChildren<{
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}>;

export function Card({
  title,
  description,
  actions,
  className,
  children,
}: CardProps) {
  return (
    <div
      className={`w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm ${className ?? ""}`}
    >
      {(title || description) && (
        <div className="mb-6 space-y-2">
          {title && (
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          )}
          {description && (
            <p className="text-sm text-slate-600">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
      {actions && <div className="mt-6">{actions}</div>}
    </div>
  );
}
