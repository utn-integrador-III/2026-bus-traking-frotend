export type TripStatus =
  | "Scheduled"
  | "Pending"
  | "In_Progress"
  | "Stopped"
  | "Delayed"
  | "Completed"
  | "Cancelled"
  | string;

export interface Stop {
  id: string;
  route_id?: string;
  name: string;
  latitude: number;
  longitude: number;
  stop_order: number;
}

export interface BusLocation {
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading?: number | null;
  recorded_at: string;
}

export interface TripPreviewRoute {
  id: string;
  name: string;
  origin: string;
  destination: string;
  geometry_geojson: string | null;
  is_active: boolean;
}

export interface TripPreview {
  id: string;
  route_id: string;
  bus_id: string;
  departure_time: string;
  arrival_time?: string | null;
  status: TripStatus;
  route: TripPreviewRoute | null;
}

export interface TripPreviewCard {
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
  geojson: string | null;
}

export interface LiveBusPosition {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number | null;
  recorded_at: string;
  eta?: string;
}

export interface MissedStopInfo {
  tripId: string;
  stopId: string;
  stopName: string;
}
