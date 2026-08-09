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

import {
  GEOFENCE_ALERT_TYPE,
  GEOFENCE_DEDUPE_WINDOW_MS,
  isDuplicateGeofenceAlert,
  isGeofenceAlertData,
} from "../notificationService";

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
