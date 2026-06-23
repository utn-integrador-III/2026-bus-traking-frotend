import { Icon } from "@/components/icon";
import type { IconName } from "@bustrack/design";

export type StatTone = "neutral" | "success" | "warning" | "danger";

const valueClass: Record<StatTone, string> = {
  neutral: "text-brand",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

const iconClass: Record<StatTone, string> = {
  neutral: "bg-navy-50 text-brand",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
};

export function StatCard({
  label,
  value,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: number | string;
  tone?: StatTone;
  icon?: IconName;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card-soft">
      <div className="flex items-start justify-between">
        <div className={`text-6xl font-extrabold leading-none ${valueClass[tone]}`}>
          {value}
        </div>
        {icon ? (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass[tone]}`}
          >
            <Icon name={icon} size={20} />
          </div>
        ) : null}
      </div>
      <div className="mt-3 text-sm font-medium text-text-secondary">{label}</div>
    </div>
  );
}
