"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { getSupabaseClient } from "@/lib/supabase";
import { toLineString, boundsOf } from "@/lib/api/geo";
import type {
  AdminRoute,
  AdminTrip,
  CurrentTelemetry,
  GeoJsonLineString,
} from "@/lib/api/types";
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

function routesCollection(lines: { route: AdminRoute; line: GeoJsonLineString }[]) {
  return {
    type: "FeatureCollection" as const,
    features: lines.map(({ route, line }) => ({
      type: "Feature" as const,
      geometry: line,
      properties: { id: route.id, name: route.name, active: route.is_active },
    })),
  };
}

function busesCollection(telemetry: CurrentTelemetry[]) {
  return {
    type: "FeatureCollection" as const,
    features: telemetry.map((entry) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [entry.longitude, entry.latitude],
      },
      properties: {
        trip_id: entry.trip_id,
        speed: entry.speed,
        heading: entry.heading,
        timestamp: entry.timestamp,
      },
    })),
  };
}

export function LiveTelemetryMap({
  routes,
  activeTrips,
  initialTelemetry,
  className = "",
}: {
  routes: AdminRoute[];
  activeTrips: AdminTrip[];
  initialTelemetry: CurrentTelemetry[];
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [connected, setConnected] = useState(false);
  const [positions, setPositions] = useState<Map<string, CurrentTelemetry>>(
    () => new Map(initialTelemetry.map((entry) => [entry.trip_id, entry])),
  );

  const drawn = useMemo(
    () =>
      routes
        .map((route) => {
          const line = toLineString(route.geometry_geojson);
          return line ? { route, line } : null;
        })
        .filter((entry): entry is { route: AdminRoute; line: GeoJsonLineString } =>
          entry !== null,
        ),
    [routes],
  );

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    const tripIds = Array.from(
      new Set([
        ...activeTrips.map((trip) => trip.id),
        ...initialTelemetry.map((entry) => entry.trip_id),
      ]),
    );

    if (tripIds.length === 0) {
      return;
    }

    const channels = tripIds.map((tripId) =>
      client
        .channel(`admin-trip-${tripId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "trip_location",
            filter: `trip_id=eq.${tripId}`,
          },
          (payload) => {
            const record = payload.new as {
              latitude: number;
              longitude: number;
              speed: number;
              heading: number;
              timestamp: string;
            };
            if (
              !Number.isFinite(record.latitude) ||
              !Number.isFinite(record.longitude)
            ) {
              return;
            }
            setPositions((prev) => {
              const next = new Map(prev);
              const existing = next.get(tripId);
              next.set(tripId, {
                trip_id: tripId,
                latitude: record.latitude,
                longitude: record.longitude,
                speed: record.speed ?? 0,
                heading: record.heading ?? 0,
                timestamp: record.timestamp,
                route_id: existing?.route_id ?? null,
                status: existing?.status ?? "In_Progress",
              });
              return next;
            });
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setConnected(true);
        }),
    );

    return () => {
      channels.forEach((channel) => client.removeChannel(channel));
      setConnected(false);
    };
  }, [activeTrips, initialTelemetry]);

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
        map.addSource("routes", {
          type: "geojson",
          data: routesCollection(drawn),
        });

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

        map.addSource("buses", {
          type: "geojson",
          data: busesCollection([]),
        });

        map.addLayer({
          id: "bus-halo",
          type: "circle",
          source: "buses",
          paint: {
            "circle-color": "#fca311",
            "circle-radius": 10,
            "circle-opacity": 0.25,
          },
        });

        map.addLayer({
          id: "bus-marker",
          type: "circle",
          source: "buses",
          paint: {
            "circle-color": "#fca311",
            "circle-radius": 7,
            "circle-stroke-color": "#14213d",
            "circle-stroke-width": 3,
          },
        });

        const bounds = boundsOf(drawn.map((entry) => entry.line));
        if (bounds) map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 0 });

        setReady(true);
      });

      map.on("error", () => setFailed(true));
    })().catch(() => setFailed(true));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [drawn]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("buses");
    if (!source) return;
    (source as import("maplibre-gl").GeoJSONSource).setData(
      busesCollection(Array.from(positions.values())),
    );
  }, [ready, positions]);

  const zoomTo = useCallback(() => {
    const map = mapRef.current;
    if (!map || drawn.length === 0) return;
    const bounds = boundsOf(drawn.map((entry) => entry.line));
    if (bounds) map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 600 });
  }, [drawn]);

  if (drawn.length === 0) {
    return (
      <div
        className={`flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border bg-surface-alt p-6 text-center ${className}`}
      >
        <p className="max-w-xs text-sm text-text-secondary">
          Ninguna ruta tiene trazado GeoJSON válido para dibujar en el mapa.
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
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-card-soft ${
              connected ? "bg-success-bg text-success" : "bg-surface text-text-secondary"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-success" : "bg-text-muted"
              }`}
            />
            {connected
              ? `En vivo · ${positions.size} buses`
              : "Sin conexión Realtime"}
          </span>
          <button
            type="button"
            onClick={zoomTo}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-brand shadow-card-soft hover:bg-surface-alt"
          >
            <Icon name="locate" size={14} />
            Ajustar vista
          </button>
        </div>
      </div>
    </div>
  );
}
