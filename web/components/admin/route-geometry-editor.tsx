"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { boundsOf } from "@/lib/api/geo";
import type { GeoJsonLineString } from "@/lib/api/types";
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

type Position = [number, number];

function toCollection(coordinates: Position[]) {
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

export function RouteGeometryEditor({
  value,
  onChange,
  className = "",
}: {
  value: GeoJsonLineString | null;
  onChange: (next: GeoJsonLineString | null) => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const coordinates = useMemo(() => value?.coordinates ?? [], [value]);

  const onChangeRef = useRef(onChange);
  const coordsRef = useRef<Position[]>([]);
  const fittedRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    coordsRef.current = coordinates;
  }, [coordinates]);

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
        map.addSource("drawing", {
          type: "geojson",
          data: toCollection([]),
        });

        map.addLayer({
          id: "drawing-line",
          type: "line",
          source: "drawing",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#fca311", "line-width": 4 },
        });

        map.addLayer({
          id: "drawing-vertices",
          type: "circle",
          source: "drawing",
          paint: {
            "circle-color": "#14213d",
            "circle-radius": 5,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });

        map.on("click", (event) => {
          const position: Position = [event.lngLat.lng, event.lngLat.lat];
          onChangeRef.current({
            type: "LineString",
            coordinates: [...coordsRef.current, position],
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
      fittedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("drawing");
    if (!source) return;

    (source as import("maplibre-gl").GeoJSONSource).setData(
      toCollection(coordinates),
    );

    if (coordinates.length > 0 && !fittedRef.current) {
      fittedRef.current = true;
      const bounds = boundsOf([{ type: "LineString", coordinates }]);
      if (bounds) {
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
      }
    }
  }, [ready, coordinates]);

  function undo() {
    if (coordinates.length === 0) return;
    onChange({
      type: "LineString",
      coordinates: coordinates.slice(0, -1),
    });
  }

  function clear() {
    onChange(null);
  }

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
          {coordinates.length === 0
            ? "Hacé clic en el mapa para agregar puntos del recorrido."
            : `${coordinates.length} puntos · ${coordinates.length < 2 ? "agregá al menos 1 punto más" : "trazado listo"}`}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={coordinates.length === 0}
            className="flex h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-border-subtle px-3 text-sm font-bold text-brand hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="arrowLeft" size={14} />
            Deshacer
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={coordinates.length === 0}
            className="flex h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-danger/30 px-3 text-sm font-bold text-danger hover:bg-danger-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="trash" size={14} />
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}
