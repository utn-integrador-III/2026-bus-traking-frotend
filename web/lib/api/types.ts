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

export type ApiErrorBody = {
  error: { code: string; message: string; details?: unknown };
};
