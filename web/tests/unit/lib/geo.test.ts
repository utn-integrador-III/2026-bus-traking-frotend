import { describe, expect, it } from "vitest";
import { boundsOf, lengthKm, toLineString } from "@/lib/api/geo";

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
