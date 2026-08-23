import type { GeoJsonLineString } from "./types";

export function decodeGooglePolyline(encoded: string): GeoJsonLineString {
  const coordinates: [number, number][] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    const lat = decodeValue(encoded, index);
    index = lat.nextIndex;
    latitude += lat.delta;

    const lng = decodeValue(encoded, index);
    index = lng.nextIndex;
    longitude += lng.delta;

    coordinates.push([longitude / 1e5, latitude / 1e5]);
  }

  if (coordinates.length < 2) {
    throw new Error("Google Routes no devolvió un recorrido válido.");
  }

  return { type: "LineString", coordinates };
}

export function mergeRouteSegments(
  segments: GeoJsonLineString[],
): GeoJsonLineString {
  const coordinates = segments.flatMap((segment, index) =>
    index === 0 ? segment.coordinates : segment.coordinates.slice(1),
  );

  if (coordinates.length < 2) {
    throw new Error("No hay suficientes tramos para construir el recorrido.");
  }

  return { type: "LineString", coordinates };
}

function decodeValue(encoded: string, startIndex: number) {
  let result = 0;
  let shift = 0;
  let index = startIndex;
  let byte: number;

  do {
    if (index >= encoded.length) {
      throw new Error("Google Routes devolvió una polilínea inválida.");
    }
    byte = encoded.charCodeAt(index) - 63;
    index += 1;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);

  return {
    delta: result & 1 ? ~(result >> 1) : result >> 1,
    nextIndex: index,
  };
}

export function isValidRouteCoordinate(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}
