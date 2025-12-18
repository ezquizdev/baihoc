import Link from "next/link";
import styles from "./welcome-banner.module.css";

type WelcomeBannerProps = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref?: string;
  className?: string;
};

export function WelcomeBanner({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  className,
}: WelcomeBannerProps) {
  const CtaElement = ctaHref ? Link : "button";

  return (
    <section
      className={`${styles.welcome} ${className ?? ""}`}
      aria-label="Chào mừng"
    >
      <div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      <CtaElement
        className={styles.cta}
        {...(ctaHref ? { href: ctaHref } : { type: "button" })}
      >
        {ctaLabel}
      </CtaElement>
    </section>
  );
}
