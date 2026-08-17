jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  addPushTokenListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
}));
jest.mock("expo-device", () => ({ isDevice: true }));

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import {
  addPushTokenRefreshListener,
  clearNotificationListeners,
  configureNotificationChannels,
  GEOFENCE_ALERT_TYPE,
  GEOFENCE_DEDUPE_WINDOW_MS,
  getPendingNotificationResponseTripId,
  isDuplicateGeofenceAlert,
  isGeofenceAlertData,
  registerForPushNotifications,
  sendPushTokenToBackend,
  setupNotificationListeners,
} from "../notificationService";

const notifications = Notifications as jest.Mocked<typeof Notifications>;

describe("isGeofenceAlertData", () => {
  it("matches the backend event field", () => {
    expect(isGeofenceAlertData({ event: "bus_approaching", trip_id: "t" })).toBe(true);
  });

  it("matches the legacy type field", () => {
    expect(isGeofenceAlertData({ type: GEOFENCE_ALERT_TYPE })).toBe(true);
  });

  it("rejects unrelated payloads", () => {
    expect(isGeofenceAlertData({ event: "location" })).toBe(false);
    expect(isGeofenceAlertData({})).toBe(false);
    expect(isGeofenceAlertData(null)).toBe(false);
    expect(isGeofenceAlertData(undefined)).toBe(false);
  });
});

describe("isDuplicateGeofenceAlert", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns false the first time a trip is seen", () => {
    jest.setSystemTime(new Date("2026-08-08T00:00:00Z"));

    expect(isDuplicateGeofenceAlert("trip-1")).toBe(false);
  });

  it("returns true for the same trip within the dedupe window", () => {
    jest.setSystemTime(new Date("2026-08-08T00:00:00Z"));
    isDuplicateGeofenceAlert("trip-1");

    jest.setSystemTime(new Date("2026-08-08T00:00:01Z"));

    expect(isDuplicateGeofenceAlert("trip-1")).toBe(true);
  });

  it("returns false again once the dedupe window expires", () => {
    jest.setSystemTime(new Date("2026-08-08T00:00:00Z"));
    isDuplicateGeofenceAlert("trip-1");

    jest.setSystemTime(new Date("2026-08-08T00:00:00Z"));
    jest.advanceTimersByTime(GEOFENCE_DEDUPE_WINDOW_MS + 1);

    expect(isDuplicateGeofenceAlert("trip-1")).toBe(false);
  });

  it("treats different trips as independent", () => {
    jest.setSystemTime(new Date("2026-08-08T00:00:00Z"));
    isDuplicateGeofenceAlert("trip-1");

    expect(isDuplicateGeofenceAlert("trip-2")).toBe(false);
  });

  it("distinguishes stops of the same trip", () => {
    jest.setSystemTime(new Date("2026-08-08T00:00:00Z"));
    isDuplicateGeofenceAlert("trip-1", "stop-1");

    expect(isDuplicateGeofenceAlert("trip-1", "stop-2")).toBe(false);
  });
});

describe("notification integrations", () => {
  const originalPlatform = Platform.OS;
  const originalProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Device, "isDevice", { configurable: true, value: true });
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID = "project-1";
    notifications.getPermissionsAsync.mockResolvedValue({ status: "granted" } as never);
    notifications.requestPermissionsAsync.mockResolvedValue({ status: "granted" } as never);
    notifications.getExpoPushTokenAsync.mockResolvedValue({ data: "expo-token", type: "expo" } as never);
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: originalPlatform });
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID = originalProjectId;
  });

  it("configures both Android notification channels", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    await configureNotificationChannels();
    expect(notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(2);
  });

  it("does not configure channels on iOS", async () => {
    await configureNotificationChannels();
    expect(notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it("returns null on simulators, denied permission and missing project id", async () => {
    Object.defineProperty(Device, "isDevice", { configurable: true, value: false });
    await expect(registerForPushNotifications()).resolves.toBeNull();

    Object.defineProperty(Device, "isDevice", { configurable: true, value: true });
    notifications.getPermissionsAsync.mockResolvedValueOnce({ status: "denied" } as never);
    notifications.requestPermissionsAsync.mockResolvedValueOnce({ status: "denied" } as never);
    await expect(registerForPushNotifications()).resolves.toBeNull();

    delete process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(registerForPushNotifications()).resolves.toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("returns an Expo token and handles provider failures", async () => {
    await expect(registerForPushNotifications()).resolves.toBe("expo-token");
    expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: "project-1" });

    notifications.getExpoPushTokenAsync.mockRejectedValueOnce(new Error("native"));
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(registerForPushNotifications()).resolves.toBeNull();
  });

  it("sends tokens and handles HTTP and network failures", async () => {
    jest.spyOn(global, "fetch").mockResolvedValueOnce({ ok: true } as Response);
    await expect(sendPushTokenToBackend("expo", "jwt")).resolves.toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/passenger/push-token"),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer jwt" }) }),
    );

    jest.spyOn(global, "fetch").mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(sendPushTokenToBackend("expo", "jwt")).resolves.toBe(false);

    jest.spyOn(global, "fetch").mockRejectedValueOnce(new Error("offline"));
    await expect(sendPushTokenToBackend("expo", "jwt")).resolves.toBe(false);
  });

  it("wires foreground and response listeners", () => {
    const foregroundRemove = jest.fn();
    const responseRemove = jest.fn();
    let foreground: ((notification: any) => void) | undefined;
    let response: ((notification: any) => void) | undefined;
    notifications.addNotificationReceivedListener.mockImplementationOnce((listener) => {
      foreground = listener;
      return { remove: foregroundRemove } as never;
    });
    notifications.addNotificationResponseReceivedListener.mockImplementationOnce((listener) => {
      response = listener;
      return { remove: responseRemove } as never;
    });
    const onTrip = jest.fn();
    const subscriptions = setupNotificationListeners(onTrip);

    foreground?.({ request: { content: { data: { event: GEOFENCE_ALERT_TYPE, trip_id: "trip-1" } } } });
    foreground?.({ request: { content: { data: { event: GEOFENCE_ALERT_TYPE, source: "local" } } } });
    foreground?.({ request: { content: { data: {} } } });
    response?.({ notification: { request: { content: { data: { trip_id: "trip-2" } } } } });
    expect(onTrip).toHaveBeenCalledWith("trip-2");

    clearNotificationListeners(subscriptions);
    expect(foregroundRemove).toHaveBeenCalled();
    expect(responseRemove).toHaveBeenCalled();
    expect(() => clearNotificationListeners(null)).not.toThrow();
  });

  it("reads pending responses and token refreshes", async () => {
    notifications.getLastNotificationResponseAsync.mockResolvedValueOnce(null);
    await expect(getPendingNotificationResponseTripId()).resolves.toBeNull();
    notifications.getLastNotificationResponseAsync.mockResolvedValueOnce({
      notification: { request: { content: { data: { trip_id: "trip-3" } } } },
    } as never);
    await expect(getPendingNotificationResponseTripId()).resolves.toBe("trip-3");

    const remove = jest.fn();
    let refresh: ((token: any) => void) | undefined;
    notifications.addPushTokenListener.mockImplementationOnce((listener) => {
      refresh = listener;
      return { remove } as never;
    });
    const listener = jest.fn();
    const cleanup = addPushTokenRefreshListener(listener);
    refresh?.({ data: "new-token" });
    expect(listener).toHaveBeenCalledWith("new-token");
    cleanup();
    expect(remove).toHaveBeenCalled();
  });
});
