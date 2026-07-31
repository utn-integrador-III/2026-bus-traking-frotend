export interface PassengerIncidentDraft {
  trip_id: string;
  type: string;
  description?: string;
  latitude: number;
  longitude: number;
}

export interface PassengerIncident {
  id: string;
  trip_id: string;
  user_id: string;
  type: string;
  description: string | null;
  latitude: number;
  longitude: number;
  timestamp: string;
  moderation_status: string;
}

export interface PassengerIncidentResponse {
  incident_id: string;
  incident: PassengerIncident;
}

export const INCIDENT_TYPES = [
  "Traffic",
  "Accident",
  "Overcrowding",
  "Mechanical",
  "Hazard",
  "Other",
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number];
