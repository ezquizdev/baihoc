import Link, { type LinkProps } from "next/link";
import styles from "./quick-actions-card.module.css";

type ActionHref = LinkProps<string>["href"];

export type QuickAction = {
  label: string;
  href?: ActionHref;
  disabled?: boolean;
};

type QuickActionsCardProps = {
  actions: QuickAction[];
  className?: string;
};

export function QuickActionsCard({
  actions,
  className,
}: QuickActionsCardProps) {
  return (
    <section
      className={`${styles.card} ${className ?? ""}`}
      aria-label="Hành động nhanh"
    >
      {actions.map((action) => {
        const parts = action.label.split("\n");
        const isDisabled = action.disabled || !action.href;
        return (
          <div key={action.label} className={styles.itemFrame}>
            {isDisabled ? (
              <button
                type="button"
                className={`${styles.item} ${styles.itemDisabled}`}
                disabled
              >
                {parts.map((line, index) => (
                  <span key={`${action.label}-${line}`}>
                    {line}
                    {index < parts.length - 1 ? <br /> : null}
                  </span>
                ))}
              </button>
            ) : (
              <Link
                href={action.href}
                className={`${styles.item} ${styles.itemInteractive}`}
              >
                {parts.map((line, index) => (
                  <span key={`${action.label}-${line}`}>
                    {line}
                    {index < parts.length - 1 ? <br /> : null}
                  </span>
                ))}
              </Link>
            )}
          </div>
        );
      })}
    </section>
  );
}
