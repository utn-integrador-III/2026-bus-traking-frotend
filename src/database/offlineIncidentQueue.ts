import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import type {
  OfflineIncidentQueueItem,
  PassengerIncidentDraft,
} from "../types/incident.types";

type OfflineIncidentRow = {
  id: number;
  user_id: string;
  trip_id: string;
  incident_type: string;
  description: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
  attempt_count: number;
  last_attempt_at: string | null;
  last_error: string | null;
};

const databaseName = "bus_tracking_offline.db";

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function createDatabase() {
  const database = await openDatabaseAsync(databaseName);

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS offline_incident_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      trip_id TEXT NOT NULL,
      incident_type TEXT NOT NULL,
      description TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      created_at TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TEXT,
      last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS offline_incident_queue_user_created_idx
      ON offline_incident_queue (user_id, created_at, id);
    PRAGMA user_version = 1;
  `);

  return database;
}

function getDatabase() {
  if (!databasePromise) {
    databasePromise = createDatabase().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

function mapRow(row: OfflineIncidentRow): OfflineIncidentQueueItem {
  return {
    id: row.id,
    userId: row.user_id,
    payload: {
      trip_id: row.trip_id,
      type: row.incident_type,
      ...(row.description === null ? {} : { description: row.description }),
      latitude: row.latitude,
      longitude: row.longitude,
    },
    createdAt: row.created_at,
    attemptCount: row.attempt_count,
    lastAttemptAt: row.last_attempt_at,
    lastError: row.last_error,
  };
}

export async function initializeOfflineIncidentQueue() {
  await getDatabase();
}

export async function enqueueOfflineIncident(
  userId: string,
  payload: PassengerIncidentDraft,
) {
  const database = await getDatabase();
  const createdAt = new Date().toISOString();
  const result = await database.runAsync(
    `INSERT INTO offline_incident_queue (
      user_id,
      trip_id,
      incident_type,
      description,
      latitude,
      longitude,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    userId,
    payload.trip_id,
    payload.type,
    payload.description ?? null,
    payload.latitude,
    payload.longitude,
    createdAt,
  );

  const queued = await database.getFirstAsync<OfflineIncidentRow>(
    "SELECT * FROM offline_incident_queue WHERE id = ?",
    result.lastInsertRowId,
  );

  if (!queued) {
    throw new Error("No se pudo recuperar el reporte guardado localmente.");
  }

  return mapRow(queued);
}

export async function getPendingOfflineIncidents(userId: string) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<OfflineIncidentRow>(
    `SELECT * FROM offline_incident_queue
      WHERE user_id = ?
      ORDER BY created_at ASC, id ASC`,
    userId,
  );

  return rows.map(mapRow);
}

export async function countPendingOfflineIncidents(userId: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ total: number }>(
    "SELECT COUNT(*) AS total FROM offline_incident_queue WHERE user_id = ?",
    userId,
  );

  return row?.total ?? 0;
}

export async function markOfflineIncidentAttempt(
  id: number,
  errorMessage: string,
) {
  const database = await getDatabase();

  await database.runAsync(
    `UPDATE offline_incident_queue
      SET attempt_count = attempt_count + 1,
          last_attempt_at = ?,
          last_error = ?
      WHERE id = ?`,
    new Date().toISOString(),
    errorMessage.slice(0, 500),
    id,
  );
}

export async function deleteOfflineIncident(id: number) {
  const database = await getDatabase();

  await database.runAsync(
    "DELETE FROM offline_incident_queue WHERE id = ?",
    id,
  );
}
