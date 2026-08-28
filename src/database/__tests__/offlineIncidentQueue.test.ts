const mockDb = {
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn().mockResolvedValue([]),
};

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue(mockDb),
}));

beforeEach(async () => {
  jest.resetModules();
  jest.clearAllMocks();
});

async function importModule() {
  return jest.requireActual<typeof import("../offlineIncidentQueue")>(
    "../offlineIncidentQueue",
  );
}

function setupDatabaseInit() {
  mockDb.execAsync.mockResolvedValueOnce(undefined);
  mockDb.getFirstAsync.mockResolvedValueOnce({ user_version: 1 });
  mockDb.execAsync.mockResolvedValueOnce(undefined);
}

describe("initializeOfflineIncidentQueue", () => {
  it("crea la tabla e indices al inicializar", async () => {
    setupDatabaseInit();
    const mod = await importModule();

    await mod.initializeOfflineIncidentQueue();

    const ddl = mockDb.execAsync.mock.calls[0][0];
    expect(ddl).toContain("CREATE TABLE IF NOT EXISTS offline_incident_queue");
    expect(ddl).toContain("max_attempts");
    expect(ddl).toContain("next_retry_at");
  });

  it("ejecuta migracion de v1 a v2 si user_version es 1", async () => {
    setupDatabaseInit();
    const mod = await importModule();
    await mod.initializeOfflineIncidentQueue();

    const migrationDdl = mockDb.execAsync.mock.calls[1][0];
    expect(migrationDdl).toContain("ADD COLUMN max_attempts");
    expect(migrationDdl).toContain("ADD COLUMN next_retry_at");
  });

  it("no ejecuta migracion si user_version ya es 2", async () => {
    mockDb.execAsync.mockResolvedValueOnce(undefined);
    mockDb.getFirstAsync.mockResolvedValueOnce({ user_version: 2 });
    const mod = await importModule();
    await mod.initializeOfflineIncidentQueue();

    expect(mockDb.execAsync).toHaveBeenCalledTimes(1);
  });
});

describe("enqueueOfflineIncident", () => {
  const userId = "user-1";
  const payload = {
    trip_id: "123e4567-e89b-12d3-a456-426614174000",
    type: "retraso",
    description: "bus tardio",
    latitude: 10.5,
    longitude: -84.2,
  };

  it("inserta el reporte en la cola y devuelve el item mapeado", async () => {
    setupDatabaseInit();
    const mod = await importModule();
    await mod.initializeOfflineIncidentQueue();

    const row = {
      id: 1,
      user_id: userId,
      trip_id: payload.trip_id,
      incident_type: payload.type,
      description: payload.description,
      latitude: payload.latitude,
      longitude: payload.longitude,
      created_at: "2026-07-17T22:00:00.000Z",
      attempt_count: 0,
      max_attempts: 5,
      last_attempt_at: null,
      next_retry_at: null,
      last_error: null,
    };
    mockDb.getFirstAsync.mockResolvedValueOnce(row);

    const result = await mod.enqueueOfflineIncident(userId, payload);

    expect(result.id).toBe(1);
    expect(result.userId).toBe(userId);
    expect(result.payload.trip_id).toBe(payload.trip_id);
    expect(result.attemptCount).toBe(0);
    expect(result.maxAttempts).toBe(5);
    expect(result.nextRetryAt).toBeNull();
  });

  it("lanza error si no se puede recuperar el reporte insertado", async () => {
    setupDatabaseInit();
    const mod = await importModule();
    await mod.initializeOfflineIncidentQueue();

    mockDb.getFirstAsync.mockResolvedValueOnce(null);

    await expect(
      mod.enqueueOfflineIncident(userId, payload),
    ).rejects.toThrow("No se pudo recuperar el reporte guardado localmente.");
  });
});

describe("getPendingOfflineIncidents", () => {
  it("filtra por next_retry_at", async () => {
    setupDatabaseInit();
    const mod = await importModule();
    await mod.initializeOfflineIncidentQueue();

    mockDb.getAllAsync.mockResolvedValueOnce([]);

    await mod.getPendingOfflineIncidents("u1");

    const sql = mockDb.getAllAsync.mock.calls[0][0];
    expect(sql).toContain("next_retry_at IS NULL OR next_retry_at <=");
  });
});

describe("countPendingOfflineIncidents", () => {
  it("retorna el conteo total de reportes del usuario", async () => {
    setupDatabaseInit();
    const mod = await importModule();
    await mod.initializeOfflineIncidentQueue();

    mockDb.getFirstAsync.mockResolvedValueOnce({ total: 5 });

    const result = await mod.countPendingOfflineIncidents("u1");

    expect(result).toBe(5);
  });

  it("retorna 0 si no hay registros", async () => {
    setupDatabaseInit();
    const mod = await importModule();
    await mod.initializeOfflineIncidentQueue();

    mockDb.getFirstAsync.mockResolvedValueOnce(null);

    const result = await mod.countPendingOfflineIncidents("u1");

    expect(result).toBe(0);
  });
});

describe("markOfflineIncidentAttempt", () => {
  it("incrementa attempt_count y registra el error", async () => {
    setupDatabaseInit();
    const mod = await importModule();
    await mod.initializeOfflineIncidentQueue();

    await mod.markOfflineIncidentAttempt(1, "error de red");

    const sql = mockDb.runAsync.mock.calls[0][0];
    expect(sql).toContain("attempt_count = attempt_count + 1");
    expect(sql).toContain("last_attempt_at");
    expect(sql).toContain("last_error");
  });

  it("trunca el mensaje de error a 500 caracteres", async () => {
    setupDatabaseInit();
    const mod = await importModule();
    await mod.initializeOfflineIncidentQueue();

    const longError = "x".repeat(600);

    await mod.markOfflineIncidentAttempt(1, longError);

    const params = mockDb.runAsync.mock.calls[0];
    expect(params[2].length).toBeLessThanOrEqual(500);
  });
});

describe("markOfflineIncidentRetry", () => {
  it("calcula next_retry_at con backoff exponencial", async () => {
    setupDatabaseInit();
    const mod = await importModule();
    await mod.initializeOfflineIncidentQueue();

    mockDb.getFirstAsync.mockResolvedValueOnce({
      attempt_count: 1,
      max_attempts: 5,
    });

    const nextRetryAt = await mod.markOfflineIncidentRetry(1, "error", 2000);

    expect(nextRetryAt).not.toBeNull();
    expect(new Date(nextRetryAt!).getTime()).toBeGreaterThanOrEqual(
      Date.now() + 2000,
    );
  });

  it("fija next_retry_at en null si se alcanzo max_attempts", async () => {
    setupDatabaseInit();
    const mod = await importModule();
    await mod.initializeOfflineIncidentQueue();

    mockDb.getFirstAsync.mockResolvedValueOnce({
      attempt_count: 4,
      max_attempts: 5,
    });

    const nextRetryAt = await mod.markOfflineIncidentRetry(1, "error", 2000);

    expect(nextRetryAt).toBeNull();
  });

  it("retorna null si el item no existe", async () => {
    setupDatabaseInit();
    const mod = await importModule();
    await mod.initializeOfflineIncidentQueue();

    mockDb.getFirstAsync.mockResolvedValueOnce(null);

    const nextRetryAt = await mod.markOfflineIncidentRetry(999, "error", 2000);

    expect(nextRetryAt).toBeNull();
  });
});

describe("deleteOfflineIncident", () => {
  it("elimina el registro por id", async () => {
    setupDatabaseInit();
    const mod = await importModule();
    await mod.initializeOfflineIncidentQueue();

    await mod.deleteOfflineIncident(42);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      "DELETE FROM offline_incident_queue WHERE id = ?",
      42,
    );
  });
});

describe("cleanupExpiredOfflineIncidents", () => {
  it("elimina registros con mas antiguedad y sin retry pendiente", async () => {
    setupDatabaseInit();
    const mod = await importModule();
    await mod.initializeOfflineIncidentQueue();

    await mod.cleanupExpiredOfflineIncidents(7 * 24 * 60 * 60 * 1000);

    const sql = mockDb.runAsync.mock.calls[0][0];
    expect(sql).toContain("DELETE FROM offline_incident_queue");
    expect(sql).toContain("next_retry_at IS NULL OR next_retry_at <");
  });
});

describe("getEarliestRetryAt", () => {
  it("retorna el next_retry_at mas cercano en el futuro", async () => {
    setupDatabaseInit();
    const mod = await importModule();
    await mod.initializeOfflineIncidentQueue();

    const futureDate = new Date(Date.now() + 10000).toISOString();
    mockDb.getFirstAsync.mockResolvedValueOnce({
      next_retry_at: futureDate,
    });

    const result = await mod.getEarliestRetryAt("u1");

    expect(result).toBe(futureDate);
  });

  it("retorna null si no hay retries pendientes", async () => {
    setupDatabaseInit();
    const mod = await importModule();
    await mod.initializeOfflineIncidentQueue();

    mockDb.getFirstAsync.mockResolvedValueOnce(null);

    const result = await mod.getEarliestRetryAt("u1");

    expect(result).toBeNull();
  });
});
