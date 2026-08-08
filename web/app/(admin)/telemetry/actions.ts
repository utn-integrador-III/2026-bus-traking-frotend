"use server";

import { getTelemetryHistory } from "@/lib/api/admin";
import type { TelemetryPoint } from "@/lib/api/types";

export type HistoryResult =
  | { ok: true; data: TelemetryPoint[] }
  | { ok: false; message: string };

export type HistoryQuery = {
  trip_id: string;
  start_time: string;
  end_time: string;
};

export async function loadTelemetryHistoryAction(
  query: HistoryQuery,
): Promise<HistoryResult> {
  const start = new Date(query.start_time);
  const end = new Date(query.end_time);

  if (!query.trip_id.trim()) {
    return { ok: false, message: "Seleccioná un viaje." };
  }
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, message: "El rango de fechas no es válido." };
  }
  if (end.getTime() <= start.getTime()) {
    return { ok: false, message: "La fecha final debe ser posterior a la inicial." };
  }

  const result = await getTelemetryHistory({
    trip_id: query.trip_id.trim(),
    start_time: start.toISOString(),
    end_time: end.toISOString(),
  });

  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, data: result.data };
}
