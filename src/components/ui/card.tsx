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
      className={`w-full rounded-[var(--radius-lg)] border border-[color:var(--line)] bg-[var(--card)] p-8 text-[var(--text)] shadow-[var(--shadow)] ${className ?? ""}`}
    >
      {(title || description) && (
        <div className="mb-6 space-y-2">
          {title && (
            <h1 className="text-2xl font-semibold text-[var(--text)]">
              {title}
            </h1>
          )}
          {description && (
            <p className="text-sm text-[var(--muted)]">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
      {actions && <div className="mt-6">{actions}</div>}
    </div>
  );
}
