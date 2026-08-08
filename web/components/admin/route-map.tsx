"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  toLineString,
  boundsOf,
  lengthKm,
  IMPLAUSIBLE_LENGTH_KM,
} from "@/lib/api/geo";
import type { AdminRoute, GeoJsonLineString } from "@/lib/api/types";
import "maplibre-gl/dist/maplibre-gl.css";

const osmStyle = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

type Drawn = { route: AdminRoute; line: GeoJsonLineString; km: number };

function toFeatureCollection(drawn: Drawn[]) {
  return {
    type: "FeatureCollection" as const,
    features: drawn.map(({ route, line }) => ({
      type: "Feature" as const,
      geometry: line,
      properties: { id: route.id, name: route.name, active: route.is_active },
    })),
  };
}

export function RouteMap({
  routes,
  className = "",
}: {
  routes: AdminRoute[];
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const drawn = useMemo<Drawn[]>(
    () =>
      routes
        .map((route) => {
          const line = toLineString(route.geometry_geojson);
          return line ? { route, line, km: lengthKm(line) } : null;
        })
        .filter((entry): entry is Drawn => entry !== null),
    [routes],
  );

  const zoomTo = useCallback(
    (entries: Drawn[], duration: number) => {
      const map = mapRef.current;
      if (!map || entries.length === 0) return;
      const bounds = boundsOf(entries.map((entry) => entry.line));
      if (bounds) map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration });
    },
    [],
  );

  useEffect(() => {
    if (!container.current || drawn.length === 0) return;

    let cancelled = false;

    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !container.current) return;

      const map = new maplibre.Map({
        container: container.current,
        style: osmStyle,
        center: [-84.09, 9.93],
        zoom: 8,
        attributionControl: { compact: true },
      });
      mapRef.current = map;

      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        map.addSource("routes", { type: "geojson", data: toFeatureCollection(drawn) });

        map.addLayer({
          id: "routes-casing",
          type: "line",
          source: "routes",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#ffffff", "line-width": 6, "line-opacity": 0.9 },
        });

        map.addLayer({
          id: "routes-line",
          type: "line",
          source: "routes",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": ["case", ["get", "active"], "#14213d", "#9aa0a6"],
            "line-width": 3,
          },
        });

        setReady(true);
        zoomTo(drawn, 0);
      });

      map.on("error", () => setFailed(true));
    })().catch(() => setFailed(true));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [drawn, zoomTo]);

  useEffect(() => {
    if (!ready) return;
    const target = selected
      ? drawn.filter((entry) => entry.route.id === selected)
      : drawn;
    zoomTo(target, 600);
  }, [selected, ready, drawn, zoomTo]);

  if (drawn.length === 0) {
    return (
      <div
        className={`flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border bg-surface-alt p-6 text-center ${className}`}
      >
        <p className="max-w-xs text-sm text-text-secondary">
          Ninguna ruta tiene trazado GeoJSON válido, así que no hay nada que dibujar
          en el mapa.
        </p>
      </div>
    );
  }

  const current = drawn.find((entry) => entry.route.id === selected);
  const suspicious = drawn.filter((entry) => entry.km > IMPLAUSIBLE_LENGTH_KM);

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSelected(null)}
          aria-pressed={selected === null}
          className={`h-8 rounded-full px-3 text-xs font-bold transition ${
            selected === null
              ? "bg-brand text-on-dark"
              : "bg-surface-alt text-text-secondary hover:text-brand"
          }`}
        >
          Todas
        </button>
        {drawn.map(({ route }) => (
          <button
            key={route.id}
            type="button"
            onClick={() => setSelected(route.id)}
            aria-pressed={selected === route.id}
            className={`h-8 max-w-[180px] truncate rounded-full px-3 text-xs font-bold transition ${
              selected === route.id
                ? "bg-brand text-on-dark"
                : "bg-surface-alt text-text-secondary hover:text-brand"
            }`}
          >
            {route.name}
          </button>
        ))}
      </div>

      <div className="relative h-full min-h-[320px]">
        <div
          ref={container}
          className="h-full min-h-[320px] overflow-hidden rounded-2xl border border-border"
        />
        {failed ? (
          <p
            role="alert"
            className="absolute inset-x-3 bottom-3 rounded-lg bg-surface/95 px-3 py-2 text-xs font-bold text-danger shadow-card-soft"
          >
            No se pudieron cargar los tiles de OpenStreetMap.
          </p>
        ) : null}
      </div>

      {current ? (
        <p className="mt-2 text-xs text-text-secondary">
          {current.route.origin} → {current.route.destination} ·{" "}
          {current.km.toFixed(1)} km · {current.line.coordinates.length} puntos
        </p>
      ) : null}

      {suspicious.length > 0 ? (
        <p className="mt-2 rounded-lg bg-warning-bg px-3 py-2 text-xs font-bold text-warning">
          {suspicious.length === 1
            ? `La ruta “${suspicious[0].route.name}” mide ${suspicious[0].km.toFixed(0)} km de recorrido: su geometry_geojson parece dato de prueba inválido.`
            : `${suspicious.length} rutas superan los ${IMPLAUSIBLE_LENGTH_KM} km de recorrido: su geometry_geojson parece dato de prueba inválido.`}
        </p>
      ) : null}
    </div>
  );
}
