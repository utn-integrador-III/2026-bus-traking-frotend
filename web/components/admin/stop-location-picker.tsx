"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
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

export type LatLng = { lat: number; lng: number };

type Position = [number, number];

function circlePolygon(center: Position, radiusMeters: number, points = 64) {
  const [lng, lat] = center;
  const d = radiusMeters / 111320;
  const radians = (lat * Math.PI) / 180;
  const coords: Position[] = [];
  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * 2 * Math.PI;
    const lngOffset = (Math.cos(angle) * d) / Math.cos(radians);
    const latOffset = Math.sin(angle) * d;
    coords.push([lng + lngOffset, lat + latOffset]);
  }
  coords.push(coords[0]);
  return coords;
}

export function StopLocationPicker({
  value,
  onChange,
  geofenceMeters = 500,
  className = "",
}: {
  value: LatLng | null;
  onChange: (next: LatLng | null) => void;
  geofenceMeters?: number;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const onChangeRef = useRef(onChange);
  const valueRef = useRef<LatLng | null>(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!container.current) return;

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

      map.addControl(
        new maplibre.NavigationControl({ showCompass: false }),
        "top-right",
      );

      map.on("load", () => {
        map.addSource("stop", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        map.addLayer({
          id: "geofence-fill",
          type: "fill",
          source: "stop",
          paint: { "fill-color": "#fca311", "fill-opacity": 0.15 },
        });

        map.addLayer({
          id: "geofence-stroke",
          type: "line",
          source: "stop",
          paint: {
            "line-color": "#fca311",
            "line-width": 2,
            "line-dasharray": [2, 2],
          },
        });

        map.addLayer({
          id: "stop-marker",
          type: "circle",
          source: "stop",
          paint: {
            "circle-color": "#14213d",
            "circle-radius": 7,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 3,
          },
        });

        map.on("click", (event) => {
          onChangeRef.current({
            lat: event.lngLat.lat,
            lng: event.lngLat.lng,
          });
        });

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
  }, []);

  const data = useMemo(() => {
    if (!value) {
      return { type: "FeatureCollection" as const, features: [] };
    }
    const center: Position = [value.lng, value.lat];
    const circle = circlePolygon(center, geofenceMeters);
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: center },
          properties: {},
        },
        {
          type: "Feature" as const,
          geometry: { type: "Polygon" as const, coordinates: [circle] },
          properties: {},
        },
      ],
    };
  }, [value, geofenceMeters]);

  useEffect(() => {
    if (!ready || !value) return;
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("stop");
    if (!source) return;
    (source as import("maplibre-gl").GeoJSONSource).setData(data);
    map.easeTo({ center: [value.lng, value.lat], zoom: Math.max(map.getZoom(), 14) });
  }, [ready, value, data]);

  return (
    <div className={className}>
      <div className="relative h-80 overflow-hidden rounded-2xl border border-border">
        <div
          ref={container}
          className="h-full w-full [&_.maplibregl-canvas]:cursor-crosshair"
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-secondary">
          {value
            ? `Latitud ${value.lat.toFixed(6)} · Longitud ${value.lng.toFixed(6)}`
            : "Hacé clic en el mapa para ubicar la parada."}
        </p>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-border-subtle px-3 text-sm font-bold text-brand hover:bg-surface-alt"
          >
            <Icon name="x" size={14} />
            Quitar
          </button>
        ) : null}
      </div>
    </div>
  );
}
