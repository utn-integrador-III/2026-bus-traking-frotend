import type { GeoJsonLineString, RouteGeometry } from "./types";

export function toLineString(
  geometry: RouteGeometry | null | undefined,
): GeoJsonLineString | null {
  if (!geometry) return null;

  const line =
    geometry.type === "Feature" ? geometry.geometry : geometry;

  if (!line || line.type !== "LineString") return null;
  if (!Array.isArray(line.coordinates) || line.coordinates.length < 2) return null;

  const coordinates = line.coordinates.filter(
    (position) =>
      Array.isArray(position) &&
      position.length >= 2 &&
      Number.isFinite(position[0]) &&
      Number.isFinite(position[1]),
  );

  if (coordinates.length < 2) return null;
  return { type: "LineString", coordinates };
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function lengthKm(line: GeoJsonLineString) {
  let total = 0;
  for (let i = 1; i < line.coordinates.length; i += 1) {
    const [lng1, lat1] = line.coordinates[i - 1];
    const [lng2, lat2] = line.coordinates[i];
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
    total += 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  return total;
}

export const IMPLAUSIBLE_LENGTH_KM = 500;

export function boundsOf(lines: GeoJsonLineString[]) {
  const positions = lines.flatMap((line) => line.coordinates);
  if (positions.length === 0) return null;

  let minLng = positions[0][0];
  let maxLng = positions[0][0];
  let minLat = positions[0][1];
  let maxLat = positions[0][1];

  for (const [lng, lat] of positions) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ] as [[number, number], [number, number]];
}
