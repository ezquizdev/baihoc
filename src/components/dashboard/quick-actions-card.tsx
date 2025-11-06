import styles from "./quick-actions-card.module.css";

type QuickActionsCardProps = {
  actions: string[];
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
      {actions.map((title) => {
        const parts = title.split("\n");
        return (
          <div key={title} className={styles.item}>
            {parts.map((line, index) => (
              <span key={`${title}-${line}`}>
                {line}
                {index < parts.length - 1 ? <br /> : null}
              </span>
            ))}
          </div>
        );
      })}
    </section>
  );
}
