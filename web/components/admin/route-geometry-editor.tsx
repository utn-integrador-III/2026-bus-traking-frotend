"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { boundsOf } from "@/lib/api/geo";
import type { GeoJsonLineString } from "@/lib/api/types";
import "maplibre-gl/dist/maplibre-gl.css";

const osmStyle = { version: 8 as const, sources: { osm: { type: "raster" as const, tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap" } }, layers: [{ id: "osm", type: "raster" as const, source: "osm" }] };
type Position = [number, number];

export type EditableRouteStop = { id?: string; name: string; latitude: number; longitude: number; geofence_radius_meters: number };

function lines(coordinates: Position[]) {
  return { type: "FeatureCollection" as const, features: [{ type: "Feature" as const, geometry: { type: "LineString" as const, coordinates }, properties: {} }] };
}

function initialPoints(coordinates: Position[], stops: EditableRouteStop[]) {
  if (coordinates.length === 0) return [];
  const base = coordinates.length > 25 ? [coordinates[0], coordinates.at(-1)!] : coordinates;
  return stops.length && base.length > 1
    ? [base[0], ...stops.map((stop) => [stop.longitude, stop.latitude] as Position), base.at(-1)!]
    : base;
}

function circle(center: Position, radius: number) {
  const [lng, lat] = center;
  const distance = radius / 111320;
  const scale = Math.cos((lat * Math.PI) / 180);
  const points: Position[] = [];
  for (let index = 0; index < 48; index += 1) {
    const angle = (index / 48) * 2 * Math.PI;
    points.push([lng + (Math.cos(angle) * distance) / scale, lat + Math.sin(angle) * distance]);
  }
  points.push(points[0]);
  return points;
}

function stopFeatures(stops: EditableRouteStop[]) {
  return { type: "FeatureCollection" as const, features: stops.flatMap((stop) => {
    const point: Position = [stop.longitude, stop.latitude];
    return [
      { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: point }, properties: {} },
      { type: "Feature" as const, geometry: { type: "Polygon" as const, coordinates: [circle(point, stop.geofence_radius_meters)] }, properties: {} },
    ];
  }) };
}

export function RouteGeometryEditor({ value, onChange, stops = [], onStopsChange, onExistingStopRemoved, className = "" }: {
  value: GeoJsonLineString | null;
  onChange: (next: GeoJsonLineString | null) => void;
  stops?: EditableRouteStop[];
  onStopsChange?: (next: EditableRouteStop[]) => void;
  onExistingStopRemoved?: (id: string) => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Position | null>(null);
  const [name, setName] = useState("");
  const [radius, setRadius] = useState("500");
  const coordinates = useMemo(() => value?.coordinates ?? [], [value]);
  const [points, setPoints] = useState<Position[]>(() => initialPoints(coordinates, stops));
  const pointsRef = useRef<Position[]>(initialPoints(coordinates, stops));
  const stopsRef = useRef(stops);

  useEffect(() => { pointsRef.current = points; }, [points]);
  useEffect(() => { stopsRef.current = stops; }, [stops]);

  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !container.current) return;
      const map = new maplibre.Map({ container: container.current, style: osmStyle, center: [-84.09, 9.93], zoom: 8, attributionControl: { compact: true } });
      mapRef.current = map;
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => {
        map.addSource("drawing", { type: "geojson", data: lines([]) });
        map.addLayer({ id: "drawing-line", type: "line", source: "drawing", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#fca311", "line-width": 4 } });
        map.addLayer({ id: "drawing-vertices", type: "circle", source: "drawing", paint: { "circle-color": "#14213d", "circle-radius": 5, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
        map.addSource("route-stops", { type: "geojson", data: stopFeatures([]) });
        map.addLayer({ id: "stop-fill", type: "fill", source: "route-stops", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#fca311", "fill-opacity": 0.14 } });
        map.addLayer({ id: "stop-line", type: "line", source: "route-stops", filter: ["==", ["geometry-type"], "Polygon"], paint: { "line-color": "#fca311", "line-width": 2, "line-dasharray": [2, 2] } });
        map.addLayer({ id: "stop-marker", type: "circle", source: "route-stops", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-color": "#14213d", "circle-radius": 8, "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 } });
        map.on("click", (event) => { setPending([event.lngLat.lng, event.lngLat.lat]); setName(`Parada ${stopsRef.current.length + 1}`); setRadius("500"); });
        setReady(true);
      });
      map.on("error", () => setFailed(true));
    })().catch(() => setFailed(true));
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; setReady(false); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const source = mapRef.current?.getSource("drawing");
    if (source) (source as import("maplibre-gl").GeoJSONSource).setData(lines(coordinates));
    const bounds = coordinates.length ? boundsOf([{ type: "LineString", coordinates }]) : null;
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
  }, [ready, coordinates]);

  useEffect(() => {
    const source = ready ? mapRef.current?.getSource("route-stops") : null;
    if (source) (source as import("maplibre-gl").GeoJSONSource).setData(stopFeatures(stops));
  }, [ready, stops]);

  function addGuide(point: Position) {
    const next = [...pointsRef.current, point];
    pointsRef.current = next;
    setPoints(next);
    onChange({ type: "LineString", coordinates: next });
    setPending(null); setError(null);
  }

  function addStop() {
    if (!pending || !onStopsChange) return;
    const meters = Number(radius);
    if (!name.trim() || !Number.isInteger(meters) || meters <= 0) { setError("Indicá un nombre y un radio válido para la parada."); return; }
    onStopsChange([...stops, { name: name.trim(), latitude: pending[1], longitude: pending[0], geofence_radius_meters: meters }]);
    addGuide(pending);
  }

  function removeStop(index: number) {
    const stop = stops[index];
    if (stop.id) onExistingStopRemoved?.(stop.id);
    onStopsChange?.(stops.filter((_, current) => current !== index));
    const next = pointsRef.current.filter(
      ([longitude, latitude]) => longitude !== stop.longitude || latitude !== stop.latitude,
    );
    pointsRef.current = next;
    setPoints(next);
    onChange(next.length ? { type: "LineString", coordinates: next } : null);
  }

  function undo() {
    const removed = points.at(-1);
    const stopIndex = removed
      ? stops.findLastIndex((stop) => stop.longitude === removed[0] && stop.latitude === removed[1])
      : -1;
    if (stopIndex >= 0) {
      removeStop(stopIndex);
      return;
    }
    const next = pointsRef.current.slice(0, -1);
    pointsRef.current = next;
    setPoints(next);
    onChange(next.length ? { type: "LineString", coordinates: next } : null);
  }
  function clear() { for (const stop of stops) if (stop.id) onExistingStopRemoved?.(stop.id); onStopsChange?.([]); setPoints([]); onChange(null); }

  async function snap() {
    if (points.length < 2 || snapping) return;
    setSnapping(true); setError(null);
    try {
      const response = await fetch("/api/routes/snap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coordinates: points }) });
      const data = await response.json().catch(() => null) as { geometry?: GeoJsonLineString; message?: string } | null;
      if (!response.ok || !data?.geometry) { setError(data?.message ?? "No se pudo ajustar el recorrido a las calles."); return; }
      onChange(data.geometry);
    } catch { setError("No se pudo conectar con el servicio de rutas."); }
    finally { setSnapping(false); }
  }

  return <div className={className}>
    <div className="relative h-80 overflow-hidden rounded-2xl border border-border">
      <div ref={container} className="h-full w-full [&_.maplibregl-canvas]:cursor-crosshair" />
      {failed ? <p role="alert" className="absolute inset-x-3 bottom-3 rounded-lg bg-surface/95 px-3 py-2 text-xs font-bold text-danger shadow-card-soft">No se pudieron cargar los tiles de OpenStreetMap.</p> : null}
      {pending ? <div className="absolute inset-x-3 bottom-3 rounded-xl bg-surface p-3 shadow-card-soft"><p className="text-sm font-extrabold text-brand">¿Qué representa este punto?</p><div className="mt-2 flex flex-wrap items-end gap-2"><button type="button" onClick={() => addGuide(pending)} className="h-9 rounded-lg border border-border-subtle px-3 text-sm font-bold text-brand">Punto guía</button><label className="flex min-w-36 flex-1 flex-col gap-1 text-xs font-bold text-brand">Nombre de parada<input value={name} onChange={(event) => setName(event.target.value)} className="h-9 rounded-lg border border-border-subtle px-2 text-sm font-normal" autoFocus /></label><label className="flex w-24 flex-col gap-1 text-xs font-bold text-brand">Radio (m)<input type="number" min={1} value={radius} onChange={(event) => setRadius(event.target.value)} className="h-9 rounded-lg border border-border-subtle px-2 text-sm font-normal" /></label><button type="button" onClick={addStop} className="h-9 rounded-lg bg-accent px-3 text-sm font-extrabold text-brand">Agregar parada</button><button type="button" onClick={() => setPending(null)} className="h-9 px-2 text-sm font-bold text-text-secondary">Cancelar</button></div></div> : null}
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-text-secondary">{points.length === 0 ? "Hacé clic en el mapa para agregar puntos del recorrido." : `${points.length} puntos guía · ${stops.length} paradas`}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={snap} disabled={points.length < 2 || snapping} className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-extrabold text-brand disabled:opacity-50"><Icon name="locate" size={14} />{snapping ? "Calculando…" : "Ajustar a calles"}</button><button type="button" onClick={undo} disabled={points.length === 0} className="flex h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-border-subtle px-3 text-sm font-bold text-brand disabled:opacity-50"><Icon name="arrowLeft" size={14} />Deshacer</button><button type="button" onClick={clear} disabled={points.length === 0} className="flex h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-danger/30 px-3 text-sm font-bold text-danger disabled:opacity-50"><Icon name="trash" size={14} />Limpiar</button></div></div>
    {error ? <p role="alert" className="mt-2 rounded-lg bg-danger-bg px-3 py-2 text-xs font-bold text-danger">{error}</p> : null}
    {stops.length ? <div className="mt-4 rounded-xl border border-border bg-surface-alt p-3"><p className="text-sm font-extrabold text-brand">Paradas de la ruta</p><div className="mt-2 space-y-2">{stops.map((stop, index) => <div key={stop.id ?? `${stop.latitude}-${stop.longitude}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2"><p className="min-w-0 truncate text-sm text-brand"><span className="font-extrabold">{index + 1}.</span> {stop.name} · {stop.geofence_radius_meters} m</p><button type="button" onClick={() => removeStop(index)} className="text-xs font-bold text-danger">Quitar</button></div>)}</div></div> : null}
  </div>;
}
