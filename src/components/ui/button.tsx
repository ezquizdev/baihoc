import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Variant = "primary" | "secondary" | "ghost";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    block?: boolean;
  }
>;

const variantClasses: Record<Variant, string> = {
  primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-2)]",
  secondary:
    "border border-[color:var(--line)] bg-[var(--card)] text-[var(--text)] hover:bg-[var(--bg)]",
  ghost:
    "bg-transparent text-[var(--muted)] hover:bg-[color:rgba(15,22,40,0.06)]",
};

export function Button({
  children,
  variant = "primary",
  block,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:rgba(40,104,230,0.28)] disabled:cursor-not-allowed disabled:opacity-70 ${
        variantClasses[variant]
      } ${block ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
