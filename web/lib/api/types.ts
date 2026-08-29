export type Role = "Passenger" | "Driver" | "Admin";

export type TripStatus =
  | "Scheduled"
  | "Pending"
  | "In_Progress"
  | "Stopped"
  | "Delayed"
  | "Completed"
  | "Cancelled";

export type GeoJsonLineString = {
  type: "LineString";
  coordinates: [number, number][];
};

export type GeoJsonFeature = {
  type: "Feature";
  geometry: GeoJsonLineString;
  properties: Record<string, unknown> | null;
};

export type RouteGeometry = GeoJsonLineString | GeoJsonFeature;

export type AdminRoute = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  geometry_geojson: RouteGeometry | null;
  is_active: boolean;
  created_at: string;
};

export type AdminDriver = {
  user_id: string;
  name: string;
  email: string;
  role: Role;
  license_number: string | null;
  is_active: boolean;
  deactivated_at: string | null;
  created_at: string;
};

export type AdminTrip = {
  id: string;
  route_id: string;
  bus_id: string;
  driver_id: string;
  departure_time: string;
  arrival_time: string | null;
  status: TripStatus;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
};

export type AdminTripInput = {
  route_id: string;
  bus_id: string;
  driver_id: string;
  departure_time: string;
};

export type AdminStop = {
  id: string;
  route_id: string;
  name: string;
  latitude: number;
  longitude: number;
  stop_order: number;
  geofence_radius_meters: number;
};

export type StopInput = {
  route_id: string;
  name: string;
  latitude: number;
  longitude: number;
  stop_order: number;
  geofence_radius_meters?: number;
};

export type AdminBus = {
  id: string;
  plate_number: string;
  capacity: number;
  status: string;
};

export type IncidentStatus = "Pending" | "Validated" | "Archived" | "Dismissed";

export type AdminIncident = {
  id: string;
  trip_id: string;
  user_id: string;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: IncidentStatus;
};

export type TelemetryPoint = {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
};

export type CurrentTelemetry = TelemetryPoint & {
  trip_id: string;
  route_id: string | null;
  status: TripStatus;
};

export type SeniorRequestStatus = "pending" | "approved" | "rejected";

export type AdminSeniorRequest = {
  id: string;
  passenger_id: string;
  document_image_bucket: string;
  document_image_path: string;
  document_image_url: string | null;
  status: SeniorRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    is_active: boolean;
    deactivated_at: string | null;
    created_at: string;
  } | null;
  passenger: {
    user_id: string;
    phone: string | null;
    notification_preferences: unknown;
    is_senior: boolean;
    expo_push_token: string | null;
    birth_date: string | null;
    senior_status: string | null;
  } | null;
};

export type SessionUser = {
  id: string;
  email: string;
  role: Role | null;
  name: string | null;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: SessionUser;
  capabilities: string[];
};

export type SessionResponse = {
  user_id: string;
  email: string;
  role: Role | null;
  capabilities: string[];
};

export type SessionPayload = {
  access_token: string;
  user: SessionUser;
};

export type ApiErrorBody = {
  error: { code: string; message: string; details?: unknown };
};
