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
  max_attempts: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
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
      max_attempts INTEGER NOT NULL DEFAULT 5,
      last_attempt_at TEXT,
      next_retry_at TEXT,
      last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS offline_incident_queue_user_created_idx
      ON offline_incident_queue (user_id, created_at, id);
    CREATE INDEX IF NOT EXISTS offline_incident_queue_retry_idx
      ON offline_incident_queue (user_id, next_retry_at, created_at);
  `);

  const { user_version: currentVersion } = await database.getFirstAsync<{
    user_version: number;
  }>("PRAGMA user_version") ?? { user_version: 1 };

  if (currentVersion < 2) {
    await database.execAsync(`
      ALTER TABLE offline_incident_queue ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 5;
      ALTER TABLE offline_incident_queue ADD COLUMN next_retry_at TEXT;
      PRAGMA user_version = 2;
    `);
  }

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
    maxAttempts: row.max_attempts,
    lastAttemptAt: row.last_attempt_at,
    nextRetryAt: row.next_retry_at,
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
  const now = new Date().toISOString();
  const rows = await database.getAllAsync<OfflineIncidentRow>(
    `SELECT * FROM offline_incident_queue
      WHERE user_id = ?
        AND (next_retry_at IS NULL OR next_retry_at <= ?)
      ORDER BY created_at ASC, id ASC`,
    userId,
    now,
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

export async function markOfflineIncidentRetry(
  id: number,
  errorMessage: string,
  baseDelayMs: number,
) {
  const database = await getDatabase();

  const row = await database.getFirstAsync<OfflineIncidentRow>(
    "SELECT attempt_count, max_attempts FROM offline_incident_queue WHERE id = ?",
    id,
  );

  if (!row) {
    return null;
  }

  const newAttemptCount = row.attempt_count + 1;
  const delay = baseDelayMs * Math.pow(2, newAttemptCount - 1);
  const nextRetryAt =
    newAttemptCount < row.max_attempts
      ? new Date(Date.now() + delay).toISOString()
      : null;

  await database.runAsync(
    `UPDATE offline_incident_queue
      SET attempt_count = ?,
          last_attempt_at = ?,
          last_error = ?,
          next_retry_at = ?
      WHERE id = ?`,
    newAttemptCount,
    new Date().toISOString(),
    errorMessage.slice(0, 500),
    nextRetryAt,
    id,
  );

  return nextRetryAt;
}

export async function deleteOfflineIncident(id: number) {
  const database = await getDatabase();

  await database.runAsync(
    "DELETE FROM offline_incident_queue WHERE id = ?",
    id,
  );
}

export async function cleanupExpiredOfflineIncidents(maxAgeMs: number) {
  const database = await getDatabase();
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

  await database.runAsync(
    `DELETE FROM offline_incident_queue
      WHERE created_at < ?
        AND (next_retry_at IS NULL OR next_retry_at < ?)`,
    cutoff,
    cutoff,
  );
}

export async function getEarliestRetryAt(
  userId: string,
): Promise<string | null> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const row = await database.getFirstAsync<{ next_retry_at: string | null }>(
    `SELECT next_retry_at FROM offline_incident_queue
      WHERE user_id = ?
        AND next_retry_at IS NOT NULL
        AND next_retry_at > ?
      ORDER BY next_retry_at ASC
      LIMIT 1`,
    userId,
    now,
  );

  return row?.next_retry_at ?? null;
}
