export interface PassengerIncidentDraft {
  trip_id: string;
  type: string;
  description?: string;
  latitude: number;
  longitude: number;
}

export interface PassengerIncident extends PassengerIncidentDraft {
  id: string;
  timestamp: string;
  user_id: string;
  moderation_status: string;
}

export interface PassengerIncidentResponse {
  incident_id: string;
  incident: PassengerIncident;
}

export const INCIDENT_TYPES = [
  "Accident",
  "Delay",
  "Traffic_Congestion",
  "Overcrowding",
  "Road_Problem",
  "Mechanical_Failure",
  "Other",
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number];

export interface OfflineIncidentQueueItem {
  id: number;
  userId: string;
  payload: PassengerIncidentDraft;
  createdAt: string;
  attemptCount: number;
  maxAttempts: number;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  lastError: string | null;
}

export interface OfflineIncidentSyncSummary {
  syncedIds: number[];
  failedIds: number[];
  pendingCount: number;
}

export type PassengerIncidentSubmission =
  | {
      status: "synced";
      queueId: number;
    }
  | {
      status: "queued";
      queueId: number;
    };
