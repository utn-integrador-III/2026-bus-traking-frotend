import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookie";
import {
  decodeGooglePolyline,
  isValidRouteCoordinate,
  mergeRouteSegments,
} from "@/lib/api/google-routes";
import { env } from "@/lib/env";
import type { GeoJsonLineString } from "@/lib/api/types";

type ApiRouteResponse = {
  encoded_polyline?: string;
  error?: { message?: string };
};

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: "Sesión no válida." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const coordinates = body?.coordinates;

  if (
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    !coordinates.every(isValidRouteCoordinate)
  ) {
    return NextResponse.json(
      { message: "El recorrido necesita al menos dos coordenadas válidas." },
      { status: 400 },
    );
  }

  if (coordinates.length > 25) {
    return NextResponse.json(
      { message: "El recorrido admite un máximo de 25 puntos guía." },
      { status: 400 },
    );
  }

  const apiBase = env.NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, "");

  try {
    const segments: GeoJsonLineString[] = [];

    for (let index = 1; index < coordinates.length; index += 1) {
      const origin = coordinates[index - 1];
      const destination = coordinates[index];
      const response = await fetch(`${apiBase}/api/google/routes/compute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          origin: toApiCoordinate(origin),
          destination: toApiCoordinate(destination),
        }),
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as ApiRouteResponse | null;
      if (!response.ok) {
        return NextResponse.json(
          {
            message:
              data?.error?.message ??
              `La API no pudo calcular el tramo ${index} del recorrido.`,
          },
          { status: response.status },
        );
      }

      const encoded = data?.encoded_polyline;
      if (!encoded) {
        return NextResponse.json(
          { message: `No se encontró un recorrido transitable para el tramo ${index}.` },
          { status: 422 },
        );
      }

      segments.push(decodeGooglePolyline(encoded));
    }

    return NextResponse.json({ geometry: mergeRouteSegments(segments) });
  } catch {
    return NextResponse.json(
      { message: "No se pudo conectar con la API en el puerto 8000." },
      { status: 502 },
    );
  }
}

function toApiCoordinate([longitude, latitude]: [number, number]) {
  return { latitude, longitude };
}
