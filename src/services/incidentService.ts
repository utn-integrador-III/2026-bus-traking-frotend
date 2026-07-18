import NetInfo, {
  type NetInfoState,
} from "@react-native-community/netinfo";
import {
  countPendingOfflineIncidents,
  deleteOfflineIncident,
  enqueueOfflineIncident,
  getPendingOfflineIncidents,
  markOfflineIncidentAttempt,
} from "../database/offlineIncidentQueue";
import type {
  OfflineIncidentSyncSummary,
  PassengerIncidentDraft,
  PassengerIncidentSubmission,
} from "../types/incident.types";
import {
  ApiClientError,
  createPassengerIncident,
} from "./apiClient";

const tripIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const syncsByUser = new Map<string, Promise<OfflineIncidentSyncSummary>>();

function normalizeIncidentDraft(
  draft: PassengerIncidentDraft,
): PassengerIncidentDraft {
  const tripId = draft.trip_id.trim();
  const type = draft.type.trim();
  const description = draft.description?.trim();

  if (!tripIdPattern.test(tripId)) {
    throw new Error("El viaje del reporte no es valido.");
  }

  if (!type || type.length > 80) {
    throw new Error("El tipo de incidente debe contener entre 1 y 80 caracteres.");
  }

  if (description && description.length > 500) {
    throw new Error("La descripcion no puede superar 500 caracteres.");
  }

  if (
    !Number.isFinite(draft.latitude) ||
    draft.latitude < -90 ||
    draft.latitude > 90
  ) {
    throw new Error("La latitud del reporte no es valida.");
  }

  if (
    !Number.isFinite(draft.longitude) ||
    draft.longitude < -180 ||
    draft.longitude > 180
  ) {
    throw new Error("La longitud del reporte no es valida.");
  }

  return {
    trip_id: tripId,
    type,
    ...(description ? { description } : {}),
    latitude: draft.latitude,
    longitude: draft.longitude,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "No se pudo sincronizar el reporte.";
}

function shouldStopSync(error: unknown) {
  if (!(error instanceof ApiClientError)) {
    return true;
  }

  return (
    error.status === 0 ||
    error.status === 401 ||
    error.status === 403 ||
    error.status >= 500
  );
}

export function hasUsableInternetConnection(state: NetInfoState) {
  return state.isConnected === true && state.isInternetReachable !== false;
}

async function performSync(
  userId: string,
  accessToken: string,
): Promise<OfflineIncidentSyncSummary> {
  const networkState = await NetInfo.fetch();

  if (!hasUsableInternetConnection(networkState)) {
    return {
      syncedIds: [],
      failedIds: [],
      pendingCount: await countPendingOfflineIncidents(userId),
    };
  }

  const queuedReports = await getPendingOfflineIncidents(userId);
  const syncedIds: number[] = [];
  const failedIds: number[] = [];

  for (const queuedReport of queuedReports) {
    try {
      await createPassengerIncident(queuedReport.payload, accessToken);
      await deleteOfflineIncident(queuedReport.id);
      syncedIds.push(queuedReport.id);
    } catch (error) {
      await markOfflineIncidentAttempt(
        queuedReport.id,
        getErrorMessage(error),
      );
      failedIds.push(queuedReport.id);

      if (shouldStopSync(error)) {
        break;
      }
    }
  }

  return {
    syncedIds,
    failedIds,
    pendingCount: await countPendingOfflineIncidents(userId),
  };
}

export function syncPendingPassengerIncidents(
  userId: string,
  accessToken: string,
) {
  const existingSync = syncsByUser.get(userId);

  if (existingSync) {
    return existingSync;
  }

  const sync = performSync(userId, accessToken).finally(() => {
    syncsByUser.delete(userId);
  });

  syncsByUser.set(userId, sync);
  return sync;
}

export async function submitPassengerIncident(
  userId: string,
  accessToken: string,
  draft: PassengerIncidentDraft,
): Promise<PassengerIncidentSubmission> {
  const payload = normalizeIncidentDraft(draft);
  const queuedReport = await enqueueOfflineIncident(userId, payload);
  const networkState = await NetInfo.fetch();

  if (!hasUsableInternetConnection(networkState)) {
    return {
      status: "queued",
      queueId: queuedReport.id,
    };
  }

  let result = await syncPendingPassengerIncidents(userId, accessToken);

  if (
    !result.syncedIds.includes(queuedReport.id) &&
    !result.failedIds.includes(queuedReport.id)
  ) {
    result = await syncPendingPassengerIncidents(userId, accessToken);
  }

  return {
    status: result.syncedIds.includes(queuedReport.id) ? "synced" : "queued",
    queueId: queuedReport.id,
  };
}
