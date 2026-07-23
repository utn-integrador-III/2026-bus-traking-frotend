export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

const toneClass: Record<BadgeTone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  neutral: "bg-divider text-text-secondary",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}
