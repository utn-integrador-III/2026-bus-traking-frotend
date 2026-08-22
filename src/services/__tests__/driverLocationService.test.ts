let mockTaskHandler: ((params: { data?: unknown; error?: unknown }) => Promise<void>) | undefined;
const mockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
const mockLocation = {
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  hasStartedLocationUpdatesAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
};
const mockReportLocation = jest.fn();

jest.mock("expo-task-manager", () => ({
  defineTask: (_name: string, handler: typeof mockTaskHandler) => {
    mockTaskHandler = handler;
  },
}));
jest.mock("expo-location", () => ({
  Accuracy: { High: 5 },
  ActivityType: { AutomotiveNavigation: 1 },
  requestForegroundPermissionsAsync: (...args: unknown[]) => mockLocation.requestForegroundPermissionsAsync(...args),
  requestBackgroundPermissionsAsync: (...args: unknown[]) => mockLocation.requestBackgroundPermissionsAsync(...args),
  hasStartedLocationUpdatesAsync: (...args: unknown[]) => mockLocation.hasStartedLocationUpdatesAsync(...args),
  startLocationUpdatesAsync: (...args: unknown[]) => mockLocation.startLocationUpdatesAsync(...args),
  stopLocationUpdatesAsync: (...args: unknown[]) => mockLocation.stopLocationUpdatesAsync(...args),
  watchPositionAsync: (...args: unknown[]) => mockLocation.watchPositionAsync(...args),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockStorage.getItem(...args),
    setItem: (...args: unknown[]) => mockStorage.setItem(...args),
    removeItem: (...args: unknown[]) => mockStorage.removeItem(...args),
  },
}));
jest.mock("../apiClient", () => ({
  reportDriverLocation: (...args: unknown[]) => mockReportLocation(...args),
  ApiClientError: class ApiClientError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

import { ApiClientError } from "../apiClient";
import {
  DRIVER_LOCATION_TASK,
  consumeDriverTrackingAuthError,
  isDriverTrackingActive,
  startDriverTracking,
  stopDriverTracking,
} from "../driverLocationService";

const location = {
  coords: { latitude: 9.9, longitude: -84.1, speed: 10, heading: 123.456 },
  timestamp: new Date("2026-01-01T00:00:00Z").getTime(),
};

describe("driverLocationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockLocation.requestBackgroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockLocation.hasStartedLocationUpdatesAsync.mockResolvedValue(false);
    mockLocation.startLocationUpdatesAsync.mockResolvedValue(undefined);
    mockLocation.stopLocationUpdatesAsync.mockResolvedValue(undefined);
    mockLocation.watchPositionAsync.mockResolvedValue({ remove: jest.fn() });
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.setItem.mockResolvedValue(undefined);
    mockStorage.removeItem.mockResolvedValue(undefined);
    mockReportLocation.mockResolvedValue({});
  });

  it("registers the background task", () => {
    expect(DRIVER_LOCATION_TASK).toBe("driver-location-tracking");
    expect(mockTaskHandler).toBeDefined();
  });

  it("ignores background errors, empty batches and missing sessions", async () => {
    await mockTaskHandler?.({ error: new Error("native") });
    await mockTaskHandler?.({ data: {} });
    await mockTaskHandler?.({ data: { locations: [location] } });
    expect(mockReportLocation).not.toHaveBeenCalled();
  });

  it("ignores corrupt stored sessions", async () => {
    mockStorage.getItem.mockResolvedValueOnce("not-json");
    await mockTaskHandler?.({ data: { locations: [location] } });
    expect(mockReportLocation).not.toHaveBeenCalled();
  });

  it("reports the latest background coordinate with normalized motion", async () => {
    mockStorage.getItem.mockResolvedValueOnce(JSON.stringify({ tripId: "trip-1", token: "jwt" }));
    await mockTaskHandler?.({
      data: {
        locations: [
          location,
          { ...location, coords: { ...location.coords, speed: 0.5, heading: -1 } },
        ],
      },
    });

    expect(mockReportLocation).toHaveBeenCalledWith(
      "trip-1",
      expect.objectContaining({ speed: 0, heading: undefined, recorded_at: "2026-01-01T00:00:00.000Z" }),
      "jwt",
    );
  });

  it("flags authentication errors from the background task", async () => {
    mockStorage.getItem.mockResolvedValueOnce(JSON.stringify({ tripId: "trip-1", token: "jwt" }));
    mockReportLocation.mockRejectedValueOnce(new ApiClientError(401, "expired"));
    await mockTaskHandler?.({ data: { locations: [location] } });

    expect(mockStorage.setItem).toHaveBeenCalledWith("driver.tracking.auth-error", "1");
    expect(mockStorage.removeItem).toHaveBeenCalledWith("driver.tracking.session");
  });

  it("consumes the persisted authentication error once", async () => {
    mockStorage.getItem.mockResolvedValueOnce(null);
    await expect(consumeDriverTrackingAuthError()).resolves.toBe(false);
    mockStorage.getItem.mockResolvedValueOnce("1");
    await expect(consumeDriverTrackingAuthError()).resolves.toBe(true);
    expect(mockStorage.removeItem).toHaveBeenCalledWith("driver.tracking.auth-error");
  });

  it("reports whether background tracking is active", async () => {
    mockLocation.hasStartedLocationUpdatesAsync.mockResolvedValueOnce(true);
    await expect(isDriverTrackingActive()).resolves.toBe(true);
    mockLocation.hasStartedLocationUpdatesAsync.mockResolvedValueOnce(false);
    await expect(isDriverTrackingActive()).resolves.toBe(false);
  });

  it("rejects missing foreground permission", async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: "denied" });
    await expect(startDriverTracking("trip-1", "jwt")).rejects.toThrow("permisos de ubicación");
  });

  it("starts background tracking and replaces an existing session", async () => {
    mockLocation.hasStartedLocationUpdatesAsync
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    await startDriverTracking("trip-1", "jwt");

    expect(mockLocation.stopLocationUpdatesAsync).toHaveBeenCalledWith(DRIVER_LOCATION_TASK);
    expect(mockLocation.startLocationUpdatesAsync).toHaveBeenCalledWith(
      DRIVER_LOCATION_TASK,
      expect.objectContaining({ timeInterval: 2000, foregroundService: expect.any(Object) }),
    );
  });

  it("falls back to foreground watching when background permission is denied", async () => {
    mockLocation.requestBackgroundPermissionsAsync.mockResolvedValueOnce({ status: "denied" });
    let callback: ((value: typeof location) => Promise<void>) | undefined;
    mockLocation.watchPositionAsync.mockImplementationOnce(async (_options, listener) => {
      callback = listener;
      return { remove: jest.fn() };
    });

    await startDriverTracking("trip-2", "token-2");
    await callback?.({ ...location, coords: { ...location.coords, speed: Number.NaN, heading: 360 } });

    expect(mockReportLocation).toHaveBeenCalledWith(
      "trip-2",
      expect.objectContaining({ speed: undefined, heading: 360 }),
      "token-2",
    );
    await stopDriverTracking();
  });

  it("falls back when permission or background startup throws", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockLocation.requestBackgroundPermissionsAsync.mockRejectedValueOnce(new Error("unsupported"));
    await startDriverTracking("trip-3", "jwt");
    expect(mockLocation.watchPositionAsync).toHaveBeenCalled();
    await stopDriverTracking();

    mockLocation.requestBackgroundPermissionsAsync.mockResolvedValueOnce({ status: "granted" });
    mockLocation.startLocationUpdatesAsync.mockRejectedValueOnce(new Error("native"));
    await startDriverTracking("trip-4", "jwt");
    expect(mockLocation.watchPositionAsync).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalled();
    await stopDriverTracking();
  });
});
