import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "accent" | "outline";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const base =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold " +
  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand/90",
  secondary: "bg-brand-secondary text-white hover:bg-brand-secondary/90",
  accent: "bg-brand-accent text-white hover:bg-brand-accent/90",
  outline:
    "border border-border bg-surface text-foreground hover:bg-surface-muted",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: Props) {
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
