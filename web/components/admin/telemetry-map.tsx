import { Icon } from "@/components/icon";

const gridBackground =
  "repeating-linear-gradient(0deg,transparent 0 34px,var(--color-map-grid) 34px 40px),repeating-linear-gradient(90deg,#dde0da 0 34px,var(--color-map-grid) 40px 46px)";

type Marker = { code: string; top: string; left: string; tone?: "navy" | "warning" };

const markers: Marker[] = [
  { code: "224B", top: "18%", left: "14%" },
  { code: "101", top: "12%", left: "52%" },
  { code: "354B", top: "46%", left: "34%", tone: "warning" },
  { code: "220", top: "58%", left: "66%" },
];

export function TelemetryMap({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative h-full min-h-[320px] overflow-hidden rounded-2xl border border-border bg-map-grid ${className}`}
    >
      <div className="absolute inset-0" style={{ background: gridBackground }} />
      <div className="absolute left-[8%] top-[16%] h-16 w-24 rounded-xl bg-map-building" />
      <div className="absolute left-[58%] top-[60%] h-20 w-28 rounded-xl bg-map-building" />

      {markers.map((m) => (
        <div
          key={m.code}
          className="absolute flex flex-col items-center"
          style={{ top: m.top, left: m.left }}
        >
          <span
            className={`rounded-md px-2 py-1 text-2xs font-extrabold text-on-dark ${
              m.tone === "warning" ? "bg-warning" : "bg-brand"
            }`}
          >
            {m.code}
          </span>
          <span
            className={`-mt-1 h-1.5 w-1.5 rotate-45 ${
              m.tone === "warning" ? "bg-warning" : "bg-brand"
            }`}
          />
        </div>
      ))}

      <div className="absolute left-[26%] top-[40%] flex h-7 w-7 items-center justify-center rounded-full border-[2.5px] border-surface bg-danger text-on-dark shadow-floating">
        <Icon name="alertTriangle" size={14} />
      </div>

      <div className="absolute bottom-3 left-3 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-brand shadow-card-soft">
        San José · área metropolitana
      </div>
    </div>
  );
}
