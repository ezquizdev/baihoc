import Link from "next/link";
import styles from "./welcome-banner.module.css";

type WelcomeBannerProps = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref?: Parameters<typeof Link>[0]["href"];
  className?: string;
};

export function WelcomeBanner({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  className,
}: WelcomeBannerProps) {
  return (
    <section
      className={`${styles.welcome} ${className ?? ""}`}
      aria-label="Chào mừng"
    >
      <div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      {ctaHref ? (
        <Link className={styles.cta} href={ctaHref}>
          {ctaLabel}
        </Link>
      ) : (
        <button type="button" className={styles.cta}>
          {ctaLabel}
        </button>
      )}
    </section>
  );
}
