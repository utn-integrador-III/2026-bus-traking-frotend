"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { lengthKm } from "@/lib/api/geo";
import type { TelemetryPoint } from "@/lib/api/types";
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

function trackCollection(points: TelemetryPoint[]) {
  const coordinates = points.map(
    (point) => [point.longitude, point.latitude] as [number, number],
  );
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates },
        properties: {},
      },
    ],
  };
}

function pointsCollection(points: TelemetryPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map((point) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [point.longitude, point.latitude],
      },
      properties: { speed: point.speed },
    })),
  };
}

export function TelemetryTrackMap({
  points,
  className = "",
}: {
  points: TelemetryPoint[];
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const [failed, setFailed] = useState(false);

  const line = useMemo(
    () =>
      points.length >= 2
        ? ({
            type: "LineString",
            coordinates: points.map(
              (point) => [point.longitude, point.latitude] as [number, number],
            ),
          } as const)
        : null,
    [points],
  );

  const km = line ? lengthKm(line) : 0;

  useEffect(() => {
    if (!container.current || !line) return;

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
        map.addSource("track", { type: "geojson", data: trackCollection(points) });
        map.addSource("track-points", {
          type: "geojson",
          data: pointsCollection(points),
        });

        map.addLayer({
          id: "track-casing",
          type: "line",
          source: "track",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.9 },
        });

        map.addLayer({
          id: "track-line",
          type: "line",
          source: "track",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#14213d", "line-width": 4 },
        });

        map.addLayer({
          id: "track-points-layer",
          type: "circle",
          source: "track-points",
          paint: {
            "circle-color": "#fca311",
            "circle-radius": 4,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.5,
          },
        });

        const bounds = boundsOfPoints(points);
        if (bounds) map.fitBounds(bounds, { padding: 48, duration: 0 });
      });

      map.on("error", () => setFailed(true));
    })().catch(() => setFailed(true));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [line, points]);

  if (!line) {
    return (
      <div
        className={`flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-border bg-surface-alt p-6 text-center ${className}`}
      >
        <p className="max-w-xs text-sm text-text-secondary">
          La API no devolvió suficientes puntos de telemetría para dibujar la
          traza.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative h-[420px] overflow-hidden rounded-2xl border border-border">
        <div ref={container} className="h-full w-full" />
        {failed ? (
          <p
            role="alert"
            className="absolute inset-x-3 bottom-3 rounded-lg bg-surface/95 px-3 py-2 text-xs font-bold text-danger shadow-card-soft"
          >
            No se pudieron cargar los tiles de OpenStreetMap.
          </p>
        ) : null}
        <span className="absolute left-3 top-3 inline-flex rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-brand shadow-card-soft">
          {points.length} puntos · {km.toFixed(1)} km
        </span>
      </div>
    </div>
  );
}

function boundsOfPoints(points: TelemetryPoint[]) {
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;
  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;

  for (const point of points) {
    if (point.longitude < minLng) minLng = point.longitude;
    if (point.longitude > maxLng) maxLng = point.longitude;
    if (point.latitude < minLat) minLat = point.latitude;
    if (point.latitude > maxLat) maxLat = point.latitude;
  }

  if (minLng === maxLng && minLat === maxLat) {
    return [
      [minLng - 0.005, minLat - 0.005],
      [maxLng + 0.005, maxLat + 0.005],
    ] as [[number, number], [number, number]];
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ] as [[number, number], [number, number]];
}
