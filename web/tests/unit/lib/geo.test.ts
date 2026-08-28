import { describe, expect, it } from "vitest";
import { boundsOf, lengthKm, toLineString } from "@/lib/api/geo";
import { decodeGooglePolyline, mergeRouteSegments } from "@/lib/api/google-routes";

describe("geometría de rutas", () => {
  it("acepta LineString y Feature válidos", () => {
    const line = toLineString({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[-84.1, 9.9], [-84.2, 10]] } });
    expect(line).toEqual({ type: "LineString", coordinates: [[-84.1, 9.9], [-84.2, 10]] });
  });

  it("rechaza geometrías insuficientes o inválidas", () => {
    expect(toLineString(null)).toBeNull();
    expect(toLineString({ type: "Point", coordinates: [1, 2] } as never)).toBeNull();
    expect(toLineString({ type: "LineString", coordinates: [[1, 2]] })).toBeNull();
  });

  it("calcula longitud y límites", () => {
    const line = { type: "LineString" as const, coordinates: [[-84.2, 9.9], [-84.1, 10]] as [number, number][] };
    expect(lengthKm(line)).toBeGreaterThan(0);
    expect(boundsOf([line])).toEqual([[-84.2, 9.9], [-84.1, 10]]);
    expect(boundsOf([])).toBeNull();
  });
});

describe("Google Routes", () => {
  it("decodifica una polilínea de Google como GeoJSON", () => {
    expect(decodeGooglePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@"))
      .toEqual({
        type: "LineString",
        coordinates: [
          [-120.2, 38.5],
          [-120.95, 40.7],
          [-126.453, 43.252],
        ],
      });
  });

  it("une los tramos consecutivos sin duplicar sus puntos de enlace", () => {
    expect(mergeRouteSegments([
      { type: "LineString", coordinates: [[1, 1], [2, 2]] },
      { type: "LineString", coordinates: [[2, 2], [3, 3], [4, 4]] },
    ])).toEqual({
      type: "LineString",
      coordinates: [[1, 1], [2, 2], [3, 3], [4, 4]],
    });
  });
});
