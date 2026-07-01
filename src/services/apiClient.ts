import { env } from "../config/env";

export type UserRole = "Passenger" | "Driver" | "Admin";

export type TripStatus =
  | "Scheduled"
  | "Pending"
  | "In Progress"
  | "Stopped"
  | "Delayed"
  | "Completed"
  | "Cancelled"
  | string;

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
};

type ApiErrorEnvelope = {
  code?: string;
  message?: string;
  details?: unknown;
};

type ApiErrorBody = {
  message?: string;
  error?: string | ApiErrorEnvelope;
  code?: string;
  details?: unknown;
};

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole | null;
  name: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  capabilities?: string[];
  user: AuthUser;
}

export interface GeoJsonLineString {
  type: "LineString";
  coordinates: [number, number][];
}

export interface GeoJsonFeature {
  type: "Feature";
  geometry: GeoJsonLineString;
  properties?: Record<string, unknown>;
}

export interface PassengerRoute {
  id: string;
  name: string;
  origin: string;
  destination: string;
  status: string;
  geometry_geojson?: GeoJsonFeature | GeoJsonLineString | string | null;
}

export interface PassengerTrip {
  id: string;
  route_id: string;
  bus_id: string;
  departure_time: string;
  arrival_time?: string | null;
  status: TripStatus;
}

export interface PassengerTripCard {
  tripId: string;
  routeId: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
  status: TripStatus;
  departureTime: string;
  badgeText: string;
  etaText: string;
}

export interface PassengerTripTrackingData {
  tripId: string;
  routeId: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
  status: TripStatus;
  departureTime: string;
  arrivalTime?: string | null;
  driverName?: string;
  busPlate?: string;
  speedKmh?: number;
  estimatedArrivalMinutes?: number;
  geojson: GeoJsonFeature;
}

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function readPublicEnv(key: string): string | undefined {
  return (globalThis as any)?.process?.env?.[key];
}

function getApiUrl() {
  const rawApiUrl =
    readPublicEnv("EXPO_PUBLIC_API_URL") ||
    readPublicEnv("EXPO_PUBLIC_API_BASE_URL") ||
    env.apiBaseUrl;

  if (!rawApiUrl) {
    throw new ApiClientError(
      0,
      "EXPO_PUBLIC_API_URL o EXPO_PUBLIC_API_BASE_URL no está configurada.",
    );
  }

  return rawApiUrl.replace(/\/$/, "");
}

function getApiErrorEnvelope(body: ApiErrorBody | null): ApiErrorEnvelope {
  if (!body) {
    return { message: "No se pudo completar la solicitud." };
  }

  if (typeof body.error === "object" && body.error !== null) {
    return {
      code: body.error.code || body.code,
      message:
        body.error.message ||
        body.message ||
        "No se pudo completar la solicitud.",
      details: body.error.details ?? body.details,
    };
  }

  return {
    code: body.code,
    message:
      body.message ||
      body.error ||
      "No se pudo completar la solicitud.",
    details: body.details,
  };
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${getApiUrl()}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const body = await readResponseBody(response);

  if (!response.ok) {
    const apiError = getApiErrorEnvelope(body as ApiErrorBody | null);

    throw new ApiClientError(
      response.status,
      apiError.message || "No se pudo completar la solicitud.",
      apiError.code,
      apiError.details,
    );
  }

  return body as T;
}

function normalizeGeoJson(source: unknown): GeoJsonFeature {
  let raw = source as any;

  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }

  if (raw?.type === "Feature" && raw?.geometry?.type === "LineString") {
    return raw as GeoJsonFeature;
  }

  if (raw?.type === "LineString" && Array.isArray(raw.coordinates)) {
    return {
      type: "Feature",
      geometry: raw as GeoJsonLineString,
      properties: {},
    };
  }

  return {
    type: "Feature",
    properties: {
      fallback: true,
    },
    geometry: {
      type: "LineString",
      coordinates: [
        [-84.0907, 9.9281],
        [-84.1005, 9.9343],
        [-84.1116, 9.9387],
        [-84.1242, 9.9452],
        [-84.1431, 9.9583],
      ],
    },
  };
}

function buildRouteCode(route: PassengerRoute): string {
  const possibleCode = route.name?.match(/\b[A-Z0-9]{2,6}\b/i)?.[0];

  if (possibleCode) {
    return possibleCode.toUpperCase();
  }

  return route.id.slice(0, 4).toUpperCase();
}

function buildBadgeText(status: TripStatus): string {
  if (status === "Delayed") {
    return "Demora";
  }

  if (status === "In Progress") {
    return "En ruta";
  }

  if (status === "Scheduled" || status === "Pending") {
    return "Programado";
  }

  if (status === "Stopped") {
    return "Detenido";
  }

  return String(status);
}

function buildEtaText(status: TripStatus): string {
  if (status === "Delayed") {
    return "+10 min";
  }

  if (status === "In Progress") {
    return "En vivo";
  }

  if (status === "Scheduled" || status === "Pending") {
    return "Próximo";
  }

  return "Ver";
}

function formatRouteName(route: PassengerRoute): string {
  if (route.origin && route.destination) {
    return `${route.origin} → ${route.destination}`;
  }

  return route.name || "Ruta disponible";
}

export async function loginPassenger(
  payload: LoginRequest,
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export async function getPassengerRoutes(
  token?: string,
): Promise<PassengerRoute[]> {
  return apiRequest<PassengerRoute[]>("/passenger/routes", {
    method: "GET",
    token,
  });
}

export async function getPassengerTrips(
  token?: string,
): Promise<PassengerTrip[]> {
  return apiRequest<PassengerTrip[]>("/passenger/trips", {
    method: "GET",
    token,
  });
}

export async function getPassengerHomeTrips(
  token?: string,
): Promise<PassengerTripCard[]> {
  const [routes, trips] = await Promise.all([
    getPassengerRoutes(token),
    getPassengerTrips(token),
  ]);

  return trips.map((trip) => {
    const route = routes.find((item) => item.id === trip.route_id);

    return {
      tripId: trip.id,
      routeId: trip.route_id,
      code: route ? buildRouteCode(route) : trip.id.slice(0, 4).toUpperCase(),
      name: route ? formatRouteName(route) : "Viaje disponible",
      origin: route?.origin || "Origen",
      destination: route?.destination || "Destino",
      status: trip.status,
      departureTime: trip.departure_time,
      badgeText: buildBadgeText(trip.status),
      etaText: buildEtaText(trip.status),
    };
  });
}

export async function getPassengerTripTrackingData(
  tripId: string,
  token?: string,
): Promise<PassengerTripTrackingData> {
  const [routes, trips] = await Promise.all([
    getPassengerRoutes(token),
    getPassengerTrips(token),
  ]);

  const trip = trips.find((item) => item.id === tripId);

  if (!trip) {
    throw new ApiClientError(
      404,
      "No se encontró el viaje seleccionado.",
      "TRIP_NOT_FOUND",
    );
  }

  const route = routes.find((item) => item.id === trip.route_id);

  if (!route) {
    throw new ApiClientError(
      404,
      "No se encontró la ruta asociada al viaje.",
      "ROUTE_NOT_FOUND",
    );
  }

  return {
    tripId: trip.id,
    routeId: route.id,
    code: buildRouteCode(route),
    name: formatRouteName(route),
    origin: route.origin,
    destination: route.destination,
    status: trip.status,
    departureTime: trip.departure_time,
    arrivalTime: trip.arrival_time,
    driverName: "Conductor asignado",
    busPlate: trip.bus_id.slice(0, 8).toUpperCase(),
    speedKmh: 0,
    estimatedArrivalMinutes: trip.status === "Delayed" ? 10 : 4,
    geojson: normalizeGeoJson(route.geometry_geojson),
  };
}