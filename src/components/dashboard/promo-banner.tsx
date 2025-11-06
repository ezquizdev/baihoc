import styles from "./promo-banner.module.css";

type PromoBannerProps = {
  tag: string;
  titleLines: string[];
  subtitle: string;
  className?: string;
};

export function PromoBanner({
  tag,
  titleLines,
  subtitle,
  className,
}: PromoBannerProps) {
  return (
    <aside className={`${styles.card} ${className ?? ""}`} aria-label="Banner">
      <div className={styles.tag}>{tag}</div>
      <div>
        <div className={styles.title}>{titleLines.join("\n")}</div>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
    </aside>
  );
}
