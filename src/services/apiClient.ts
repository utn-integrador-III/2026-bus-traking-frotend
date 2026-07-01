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
  geometry_geojson: GeoJsonFeature | GeoJsonLineString;
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
  details?: string;

  constructor(message: string, status: number, code?: string, details?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = data?.error;

    throw new ApiClientError(
      error?.message || "Unexpected API error.",
      response.status,
      error?.code,
      error?.details,
    );
  }

  return data as TResponse;
}

function authHeaders(token?: string): Record<string, string> | undefined {
  if (!token) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function normalizeGeoJson(source: unknown): GeoJsonFeature {
  const raw = source as any;

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
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPassengerRoutes(
  token?: string,
): Promise<PassengerRoute[]> {
  return request<PassengerRoute[]>("/passenger/routes", {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function getPassengerTrips(
  token?: string,
): Promise<PassengerTrip[]> {
  return request<PassengerTrip[]>("/passenger/trips", {
    method: "GET",
    headers: authHeaders(token),
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
      "No se encontró el viaje seleccionado.",
      404,
      "TRIP_NOT_FOUND",
    );
  }

  const route = routes.find((item) => item.id === trip.route_id);

  if (!route) {
    throw new ApiClientError(
      "No se encontró la ruta asociada al viaje.",
      404,
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