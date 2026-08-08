import { env } from "../config/env";
import type { SeniorStatus } from "../types/user.types";
import type {
  PassengerIncident,
  PassengerIncidentDraft,
  PassengerIncidentResponse,
} from "../types/incident.types";

export type UserRole = "Passenger" | "Driver" | "Admin";

export type TripStatus =
  | "Scheduled"
  | "Pending"
  | "In_Progress"
  | "Stopped"
  | "Delayed"
  | "Completed"
  | "Cancelled"
  | string;

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  expectArray?: boolean;
};

const REQUEST_TIMEOUT_MS = 15000;

const RETRY_DELAY_MS = 800;

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
  is_senior?: boolean;
  senior_status?: SeniorStatus;
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

function getApiUrl(): string {
  const rawApiUrl = env.apiBaseUrl;

  if (!rawApiUrl) {
    throw new ApiClientError(
      0,
      "EXPO_PUBLIC_API_BASE_URL o EXPO_PUBLIC_API_URL no está configurada.",
    );
  }

  const cleanUrl = rawApiUrl.replace(/\/+$/, "");

  if (cleanUrl.endsWith("/api")) {
    return cleanUrl;
  }

  return `${cleanUrl}/api`;
}

function buildApiUrl(path: string): string {
  const apiUrl = getApiUrl();

  const cleanPath = path
    .replace(/^\/+/, "")
    .replace(/^api\/+/i, "");

  return `${apiUrl}/${cleanPath}`;
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
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

  const method = options.method || "GET";
  const url = buildApiUrl(path);

  const init: RequestInit = {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  };

  const maxAttempts = method === "GET" ? 2 : 1;

  let response: Response | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      response = await fetchWithTimeout(url, init);
      break;
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        throw new ApiClientError(
          0,
          "La solicitud tardó demasiado. Revisá tu conexión.",
          "TIMEOUT",
        );
      }

      if (attempt >= maxAttempts) {
        throw new ApiClientError(
          0,
          "No se pudo conectar con el servidor. Revisá tu conexión.",
          "NETWORK_ERROR",
        );
      }

      await wait(RETRY_DELAY_MS * attempt);
    }
  }

  if (!response) {
    throw new ApiClientError(
      0,
      "No se pudo conectar con el servidor. Revisá tu conexión.",
      "NETWORK_ERROR",
    );
  }

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

  if (options.expectArray && !Array.isArray(body)) {
    throw new ApiClientError(
      response.status,
      "La respuesta del servidor no tiene el formato esperado.",
      "INVALID_RESPONSE",
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

function buildRouteCode(route: { name?: string | null; id: string }): string {
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

  if (status === "In_Progress") {
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

  if (status === "In_Progress") {
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
    expectArray: true,
  });
}

export async function getPassengerTrips(
  token?: string,
): Promise<PassengerTrip[]> {
  return apiRequest<PassengerTrip[]>("/passenger/trips", {
    method: "GET",
    token,
    expectArray: true,
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

export interface DriverTrip {
  id: string;
  route_id: string;
  bus_id: string;
  driver_id?: string;
  departure_time: string;
  arrival_time?: string | null;
  status: TripStatus;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface DriverLocationPayload {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  recorded_at?: string;
}

export interface DriverLocationRecord {
  id?: number;
  trip_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
}

export interface LatLngPoint {
  latitude: number;
  longitude: number;
}

export interface GoogleRouteResult {
  distance_meters?: number;
  duration?: string;
  encoded_polyline?: string | null;
}

export async function getAssignedDriverTrips(
  token?: string,
): Promise<DriverTrip[]> {
  return apiRequest<DriverTrip[]>("/api/driver/trips", {
    method: "GET",
    token,
    expectArray: true,
  });
}

export async function getActiveDriverTrip(
  token?: string,
): Promise<DriverTrip | null> {
  return apiRequest<DriverTrip | null>("/api/driver/trips/active", {
    method: "GET",
    token,
  });
}

export async function startDriverTrip(
  tripId: string,
  token?: string,
): Promise<DriverTrip> {
  return apiRequest<DriverTrip>(`/api/driver/trips/${tripId}/start`, {
    method: "POST",
    token,
  });
}

export async function completeDriverTrip(
  tripId: string,
  token?: string,
): Promise<DriverTrip> {
  return apiRequest<DriverTrip>(`/api/driver/trips/${tripId}/complete`, {
    method: "POST",
    token,
  });
}

export async function cancelDriverTrip(
  tripId: string,
  token?: string,
): Promise<DriverTrip> {
  return apiRequest<DriverTrip>(`/api/driver/trips/${tripId}/cancel`, {
    method: "POST",
    token,
  });
}

export async function reportDriverLocation(
  tripId: string,
  payload: DriverLocationPayload,
  token?: string,
): Promise<DriverLocationRecord> {
  return apiRequest<DriverLocationRecord>(
    `/api/driver/trips/${tripId}/location`,
    {
      method: "POST",
      token,
      body: payload,
    },
  );
}

function parseGoogleDurationToMinutes(duration?: string): number | null {
  if (!duration) {
    return null;
  }

  const match = String(duration).match(/([\d.]+)\s*s/i);

  if (!match) {
    return null;
  }

  const seconds = Number(match[1]);

  if (!Number.isFinite(seconds)) {
    return null;
  }

  return Math.max(1, Math.round(seconds / 60));
}

export async function computeGoogleRoute(
  origin: LatLngPoint,
  destination: LatLngPoint,
  token?: string,
): Promise<GoogleRouteResult> {
  return apiRequest<GoogleRouteResult>("/api/google/routes/compute", {
    method: "POST",
    token,
    body: { origin, destination },
  });
}

export async function getTripEtaMinutes(
  origin: LatLngPoint,
  destination: LatLngPoint,
  token?: string,
): Promise<number | null> {
  try {
    const route = await computeGoogleRoute(origin, destination, token);
    return parseGoogleDurationToMinutes(route.duration);
  } catch {
    return null;
  }
}

export interface TripPreviewRaw {
  id: string;
  route_id: string;
  bus_id: string;
  departure_time: string;
  arrival_time?: string | null;
  status: TripStatus;
  route: {
    id: string;
    name: string;
    origin: string;
    destination: string;
    geometry_geojson: string | Record<string, unknown> | null;
    is_active: boolean;
  } | null;
}

export interface StopRaw {
  id: string;
  route_id: string;
  name: string;
  latitude: number;
  longitude: number;
  stop_order: number;
}

export interface WatchStopRequest {
  stop_id: string;
}

export interface WatchStopResponse {
  id: string;
  user_id: string;
  trip_id: string;
  stop_id: string;
  status: string;
  created_at: string;
}

export async function getPassengerTrackingTripsPreview(
  token?: string,
): Promise<TripPreviewRaw[]> {
  return apiRequest<TripPreviewRaw[]>(
    "/passenger/tracking/trips/preview",
    {
      method: "GET",
      token,
      expectArray: true,
    },
  );
}

export async function watchStop(
  tripId: string,
  stopId: string,
  token?: string,
): Promise<WatchStopResponse> {
  return apiRequest<WatchStopResponse>(
    `/passenger/tracking/trips/${tripId}/watch-stop`,
    {
      method: "POST",
      token,
      body: { stop_id: stopId },
    },
  );
}

export async function getTripStops(
  routeId: string,
  token?: string,
): Promise<StopRaw[]> {
  return apiRequest<StopRaw[]>(`/passenger/stops?route_id=${routeId}`, {
    method: "GET",
    token,
    expectArray: true,
  });
}

export interface PassHomeTripsPreview {
  tripId: string;
  routeId: string;
  busId: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
  status: TripStatus;
  departureTime: string;
  badgeText: string;
  etaText: string;
  geojson: string | null;
  routeName: string;
}

export async function getPassengerHomeTripsPreview(
  token?: string,
): Promise<PassHomeTripsPreview[]> {
  const previews = await getPassengerTrackingTripsPreview(token);

  return previews.map((trip) => {
    const route = trip.route;

    return {
      tripId: trip.id,
      routeId: trip.route_id,
      busId: trip.bus_id,
      code: route ? buildRouteCode(route) : trip.id.slice(0, 4).toUpperCase(),
      name: route
        ? `${route.origin} → ${route.destination}`
        : "Viaje disponible",
      origin: route?.origin || "Origen",
      destination: route?.destination || "Destino",
      status: trip.status,
      departureTime: trip.departure_time,
      badgeText: buildBadgeText(trip.status),
      etaText: buildEtaText(trip.status),
      geojson:
        route?.geometry_geojson
          ? typeof route.geometry_geojson === "string"
            ? route.geometry_geojson
            : JSON.stringify(route.geometry_geojson)
          : null,
      routeName: route?.name || "Ruta disponible",
    };
  });
}

export async function createPassengerIncident(
  payload: PassengerIncidentDraft,
  token?: string,
): Promise<PassengerIncidentResponse> {
  return apiRequest<PassengerIncidentResponse>("/passenger/incidents", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function createDriverIncident(
  payload: PassengerIncidentDraft,
  token?: string,
): Promise<PassengerIncidentResponse> {
  return apiRequest<PassengerIncidentResponse>("/driver/incidents", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function getMapIncidents(
  tripId: string,
): Promise<PassengerIncident[]> {
  return apiRequest<PassengerIncident[]>(
    `/incidents/map?trip_id=${encodeURIComponent(tripId)}`,
    { method: "GET" },
  );
}