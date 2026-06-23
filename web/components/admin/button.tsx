import Link from "next/link";
import { Icon } from "@/components/icon";
import type { IconName } from "@bustrack/design";

export type ButtonVariant = "primary" | "dark" | "outline" | "soft" | "danger";

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-accent text-brand shadow-button hover:brightness-[0.97]",
  dark: "bg-brand text-on-dark hover:brightness-110",
  outline: "border-[1.5px] border-border-subtle bg-surface text-brand hover:bg-surface-alt",
  soft: "bg-surface-alt text-brand hover:brightness-95",
  danger: "bg-danger-bg text-danger hover:brightness-95",
};

export function Button({
  children,
  variant = "primary",
  icon,
  type = "button",
  onClick,
  href,
  className = "",
  full = false,
}: {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  icon?: IconName;
  type?: "button" | "submit";
  onClick?: () => void;
  href?: string;
  className?: string;
  full?: boolean;
}) {
  const classes = `inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-md font-extrabold transition ${
    variantClass[variant]
  } ${full ? "w-full" : ""} ${className}`;
  const content = (
    <>
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {content}
    </button>
  );
}
