import { describe, it, expect, beforeEach, vi } from "vitest";

(globalThis as Record<string, unknown>).__DEV__ = true;

const mockDbFunctions = vi.hoisted(() => {
  const mockEnqueue = vi.fn();
  const mockGetPending = vi.fn().mockResolvedValue([]);
  const mockCountPending = vi.fn().mockResolvedValue(0);
  const mockMarkRetry = vi.fn();
  const mockDeleteIncident = vi.fn();
  const mockMarkAttempt = vi.fn();
  const mockCleanup = vi.fn();
  const mockGetEarliest = vi.fn().mockResolvedValue(null);

  return {
    mockEnqueue,
    mockGetPending,
    mockCountPending,
    mockMarkRetry,
    mockDeleteIncident,
    mockMarkAttempt,
    mockCleanup,
    mockGetEarliest,
  };
});

const mockApiClient = vi.hoisted(() => {
  const mockCreateIncident = vi.fn();
  const MockApiClientError = class extends Error {
    status: number;
    code: string | undefined;
    details: unknown;
    constructor(status: number, message: string, code?: string, details?: unknown) {
      super(message);
      this.status = status;
      this.code = code;
      this.details = details;
      this.name = "ApiClientError";
    }
  };
  return { mockCreateIncident, MockApiClientError };
});

const mockNetInfo = vi.hoisted(() => {
  const mockFetch = vi.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  });
  return { mockFetch };
});

vi.mock("expo", () => ({
  requireNativeModule: vi.fn().mockReturnValue({}),
  requireOptionalNativeModule: vi.fn().mockReturnValue(null),
}));

vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: vi.fn().mockResolvedValue({
    execAsync: vi.fn().mockResolvedValue(undefined),
    runAsync: vi.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    getFirstAsync: vi.fn(),
    getAllAsync: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios", select: (obj: Record<string, unknown>) => obj.ios },
  NativeModules: {},
  AppState: {
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
    removeEventListener: vi.fn(),
  },
}));

vi.mock("@react-native-community/netinfo", () => ({
  default: {
    fetch: (...args: unknown[]) => mockNetInfo.mockFetch(...args),
  },
}));

vi.mock("../../database/offlineIncidentQueue", () => ({
  enqueueOfflineIncident: (...args: unknown[]) =>
    mockDbFunctions.mockEnqueue(...args),
  getPendingOfflineIncidents: (...args: unknown[]) =>
    mockDbFunctions.mockGetPending(...args),
  countPendingOfflineIncidents: (...args: unknown[]) =>
    mockDbFunctions.mockCountPending(...args),
  markOfflineIncidentRetry: (...args: unknown[]) =>
    mockDbFunctions.mockMarkRetry(...args),
  markOfflineIncidentAttempt: (...args: unknown[]) =>
    mockDbFunctions.mockMarkAttempt(...args),
  deleteOfflineIncident: (...args: unknown[]) =>
    mockDbFunctions.mockDeleteIncident(...args),
  cleanupExpiredOfflineIncidents: (...args: unknown[]) =>
    mockDbFunctions.mockCleanup(...args),
  getEarliestRetryAt: (...args: unknown[]) =>
    mockDbFunctions.mockGetEarliest(...args),
}));

vi.mock("../apiClient", () => ({
  createPassengerIncident: (...args: unknown[]) =>
    mockApiClient.mockCreateIncident(...args),
  ApiClientError: mockApiClient.MockApiClientError,
}));

import {
  hasUsableInternetConnection,
  BASE_RETRY_DELAY_MS,
  submitPassengerIncident,
  syncPendingPassengerIncidents,
} from "../incidentService";
import { ApiClientError } from "../apiClient";
import type { NetInfoState } from "@react-native-community/netinfo";

const validDraft = {
  trip_id: "123e4567-e89b-12d3-a456-426614174000",
  type: "retraso",
  description: "bus tardio",
  latitude: 10.5,
  longitude: -84.2,
};

const userId = "user-1";
const accessToken = "token-abc";

beforeEach(() => {
  vi.clearAllMocks();
  mockNetInfo.mockFetch.mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  });
  mockDbFunctions.mockCountPending.mockResolvedValue(0);
  mockDbFunctions.mockGetPending.mockResolvedValue([]);
});

describe("BASE_RETRY_DELAY_MS", () => {
  it("tiene el valor base de 2000ms para backoff", () => {
    expect(BASE_RETRY_DELAY_MS).toBe(2000);
  });
});

describe("hasUsableInternetConnection", () => {
  it("retorna true cuando isConnected es true y isInternetReachable no es false", () => {
    expect(
      hasUsableInternetConnection({
        isConnected: true,
        isInternetReachable: true,
      } as NetInfoState),
    ).toBe(true);
  });

  it("retorna true cuando isInternetReachable es null", () => {
    expect(
      hasUsableInternetConnection({
        isConnected: true,
        isInternetReachable: null,
      } as NetInfoState),
    ).toBe(true);
  });

  it("retorna false cuando isConnected es false", () => {
    expect(
      hasUsableInternetConnection({
        isConnected: false,
        isInternetReachable: true,
      } as NetInfoState),
    ).toBe(false);
  });

  it("retorna false cuando isInternetReachable es false", () => {
    expect(
      hasUsableInternetConnection({
        isConnected: true,
        isInternetReachable: false,
      } as NetInfoState),
    ).toBe(false);
  });
});

describe("submitPassengerIncident", () => {
  it("encola y sincroniza exitosamente cuando hay conexion", async () => {
    mockDbFunctions.mockEnqueue.mockResolvedValueOnce({
      id: 10,
      userId,
      payload: validDraft,
      attemptCount: 0,
      maxAttempts: 5,
      createdAt: "2026-07-17T00:00:00.000Z",
      lastAttemptAt: null,
      nextRetryAt: null,
      lastError: null,
    });
    mockApiClient.mockCreateIncident.mockResolvedValueOnce({
      incident_id: "inc-1",
    });
    mockDbFunctions.mockGetPending.mockResolvedValueOnce([
      { id: 10, userId, payload: validDraft },
    ]);

    const result = await submitPassengerIncident(
      userId,
      accessToken,
      validDraft,
    );

    expect(result.status).toBe("synced");
    expect(result.queueId).toBe(10);
    expect(mockApiClient.mockCreateIncident).toHaveBeenCalledWith(
      expect.objectContaining({ trip_id: validDraft.trip_id }),
      accessToken,
    );
    expect(mockDbFunctions.mockDeleteIncident).toHaveBeenCalledWith(10);
  });

  it("retorna queued cuando no hay conexion", async () => {
    mockNetInfo.mockFetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });
    mockDbFunctions.mockEnqueue.mockResolvedValueOnce({
      id: 11,
      userId,
      payload: validDraft,
      attemptCount: 0,
      maxAttempts: 5,
      createdAt: "2026-07-17T00:00:00.000Z",
      lastAttemptAt: null,
      nextRetryAt: null,
      lastError: null,
    });

    const result = await submitPassengerIncident(
      userId,
      accessToken,
      validDraft,
    );

    expect(result.status).toBe("queued");
    expect(result.queueId).toBe(11);
    expect(mockApiClient.mockCreateIncident).not.toHaveBeenCalled();
  });

  it("retorna queued cuando la sincronizacion falla", async () => {
    mockDbFunctions.mockEnqueue.mockResolvedValueOnce({
      id: 12,
      userId,
      payload: validDraft,
      attemptCount: 0,
      maxAttempts: 5,
      createdAt: "2026-07-17T00:00:00.000Z",
      lastAttemptAt: null,
      nextRetryAt: null,
      lastError: null,
    });
    mockApiClient.mockCreateIncident.mockRejectedValueOnce(
      new ApiClientError(500, "server error"),
    );
    mockDbFunctions.mockGetPending.mockResolvedValueOnce([
      { id: 12, userId, payload: validDraft },
    ]);

    const result = await submitPassengerIncident(
      userId,
      accessToken,
      validDraft,
    );

    expect(result.status).toBe("queued");
    expect(result.queueId).toBe(12);
    expect(mockDbFunctions.mockMarkRetry).toHaveBeenCalledWith(
      12,
      "server error",
      BASE_RETRY_DELAY_MS,
    );
  });

  it("lanza error de validacion si trip_id es invalido", async () => {
    await expect(
      submitPassengerIncident(userId, accessToken, {
        ...validDraft,
        trip_id: "no-es-uuid",
      }),
    ).rejects.toThrow("El viaje del reporte no es valido.");
  });

  it("lanza error si type esta vacio", async () => {
    await expect(
      submitPassengerIncident(userId, accessToken, {
        ...validDraft,
        type: "",
      }),
    ).rejects.toThrow(
      "El tipo de incidente debe contener entre 1 y 80 caracteres.",
    );
  });

  it("lanza error si type excede 80 caracteres", async () => {
    await expect(
      submitPassengerIncident(userId, accessToken, {
        ...validDraft,
        type: "x".repeat(81),
      }),
    ).rejects.toThrow(
      "El tipo de incidente debe contener entre 1 y 80 caracteres.",
    );
  });

  it("lanza error si description excede 500 caracteres", async () => {
    await expect(
      submitPassengerIncident(userId, accessToken, {
        ...validDraft,
        description: "x".repeat(501),
      }),
    ).rejects.toThrow("La descripcion no puede superar 500 caracteres.");
  });

  it("lanza error si latitud es invalida", async () => {
    await expect(
      submitPassengerIncident(userId, accessToken, {
        ...validDraft,
        latitude: 100,
      }),
    ).rejects.toThrow("La latitud del reporte no es valida.");
  });

  it("lanza error si longitud es invalida", async () => {
    await expect(
      submitPassengerIncident(userId, accessToken, {
        ...validDraft,
        longitude: 200,
      }),
    ).rejects.toThrow("La longitud del reporte no es valida.");
  });
});

describe("syncPendingPassengerIncidents", () => {
  it("no intenta sincronizar si no hay conexion", async () => {
    mockNetInfo.mockFetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });

    const result = await syncPendingPassengerIncidents(userId, accessToken);

    expect(result.syncedIds).toEqual([]);
    expect(result.failedIds).toEqual([]);
    expect(mockApiClient.mockCreateIncident).not.toHaveBeenCalled();
  });

  it("sincroniza reportes pendientes exitosamente", async () => {
    mockDbFunctions.mockGetPending.mockResolvedValueOnce([
      { id: 1, payload: validDraft },
      { id: 2, payload: { ...validDraft, type: "accidente" } },
    ]);
    mockApiClient.mockCreateIncident.mockResolvedValue({
      incident_id: "inc-ok",
    });

    const result = await syncPendingPassengerIncidents(userId, accessToken);

    expect(result.syncedIds).toEqual([1, 2]);
    expect(result.failedIds).toEqual([]);
    expect(mockDbFunctions.mockDeleteIncident).toHaveBeenCalledTimes(2);
  });

  it("detiene el lote en error de red y marca con retry", async () => {
    mockDbFunctions.mockGetPending.mockResolvedValueOnce([
      { id: 1, payload: validDraft },
      { id: 2, payload: { ...validDraft, type: "accidente" } },
    ]);
    mockApiClient.mockCreateIncident.mockRejectedValueOnce(
      new ApiClientError(0, "network error"),
    );

    const result = await syncPendingPassengerIncidents(userId, accessToken);

    expect(result.failedIds).toContain(1);
    expect(result.failedIds).not.toContain(2);
    expect(mockApiClient.mockCreateIncident).toHaveBeenCalledTimes(1);
    expect(mockDbFunctions.mockMarkRetry).toHaveBeenCalledWith(
      1,
      "network error",
      BASE_RETRY_DELAY_MS,
    );
  });

  it("detiene el lote en error 500 y marca con retry", async () => {
    mockDbFunctions.mockGetPending.mockResolvedValueOnce([
      { id: 1, payload: validDraft },
      { id: 2, payload: validDraft },
    ]);
    mockApiClient.mockCreateIncident.mockRejectedValueOnce(
      new ApiClientError(500, "server error"),
    );

    const result = await syncPendingPassengerIncidents(userId, accessToken);

    expect(result.failedIds).toEqual([1]);
    expect(mockApiClient.mockCreateIncident).toHaveBeenCalledTimes(1);
  });

  it("detiene el lote en error 401 y marca con retry", async () => {
    mockDbFunctions.mockGetPending.mockResolvedValueOnce([
      { id: 1, payload: validDraft },
      { id: 2, payload: validDraft },
    ]);
    mockApiClient.mockCreateIncident.mockRejectedValueOnce(
      new ApiClientError(401, "unauthorized"),
    );

    const result = await syncPendingPassengerIncidents(userId, accessToken);

    expect(result.failedIds).toEqual([1]);
    expect(mockApiClient.mockCreateIncident).toHaveBeenCalledTimes(1);
    expect(mockDbFunctions.mockMarkRetry).toHaveBeenCalledWith(
      1,
      "unauthorized",
      BASE_RETRY_DELAY_MS,
    );
  });

  it("detiene el lote en error 403 y marca con retry", async () => {
    mockDbFunctions.mockGetPending.mockResolvedValueOnce([
      { id: 1, payload: validDraft },
      { id: 2, payload: validDraft },
    ]);
    mockApiClient.mockCreateIncident.mockRejectedValueOnce(
      new ApiClientError(403, "forbidden"),
    );

    const result = await syncPendingPassengerIncidents(userId, accessToken);

    expect(result.failedIds).toEqual([1]);
    expect(mockApiClient.mockCreateIncident).toHaveBeenCalledTimes(1);
  });

  it("continua el lote en error de validacion 422 y marca con retry", async () => {
    mockDbFunctions.mockGetPending.mockResolvedValueOnce([
      { id: 1, payload: validDraft },
      { id: 2, payload: { ...validDraft, type: "otro" } },
    ]);
    mockApiClient.mockCreateIncident
      .mockRejectedValueOnce(new ApiClientError(422, "invalid"))
      .mockResolvedValueOnce({ incident_id: "inc-ok" });

    const result = await syncPendingPassengerIncidents(userId, accessToken);

    expect(result.failedIds).toEqual([1]);
    expect(result.syncedIds).toEqual([2]);
    expect(mockApiClient.mockCreateIncident).toHaveBeenCalledTimes(2);
  });

  it("consolida sincronizaciones concurrentes del mismo usuario", async () => {
    mockDbFunctions.mockGetPending.mockResolvedValue([]);

    const promise1 = syncPendingPassengerIncidents(userId, accessToken);
    const promise2 = syncPendingPassengerIncidents(userId, accessToken);

    const [r1, r2] = await Promise.all([promise1, promise2]);

    expect(r1).toBe(r2);
  });

  it("permite sincronizaciones de usuarios distintos en paralelo", async () => {
    mockDbFunctions.mockGetPending.mockResolvedValue([]);

    const promise1 = syncPendingPassengerIncidents("user-a", "token-a");
    const promise2 = syncPendingPassengerIncidents("user-b", "token-b");

    await expect(Promise.all([promise1, promise2])).resolves.toBeDefined();
  });
});
