import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";

const mocks = {
  configure: jest.fn(),
  register: jest.fn(),
  send: jest.fn(),
  setup: jest.fn(),
  clear: jest.fn(),
  pendingTrip: jest.fn(),
  refreshListener: jest.fn(),
};

jest.mock("../../services/notificationService", () => ({
  configureNotificationChannels: (...args: unknown[]) => mocks.configure(...args),
  registerForPushNotifications: (...args: unknown[]) => mocks.register(...args),
  sendPushTokenToBackend: (...args: unknown[]) => mocks.send(...args),
  setupNotificationListeners: (...args: unknown[]) => mocks.setup(...args),
  clearNotificationListeners: (...args: unknown[]) => mocks.clear(...args),
  getPendingNotificationResponseTripId: (...args: unknown[]) => mocks.pendingTrip(...args),
  addPushTokenRefreshListener: (...args: unknown[]) => mocks.refreshListener(...args),
}));

import { usePushNotifications } from "../usePushNotifications";

describe("usePushNotifications", () => {
  let foregroundCallback: ((tripId: string) => void) | undefined;
  let refreshCallback: ((token: string) => Promise<void>) | undefined;
  let appStateCallback: ((state: string) => void) | undefined;
  const foregroundSubscription = { remove: jest.fn() };
  const responseSubscription = { remove: jest.fn() };
  const removeRefresh = jest.fn();
  const removeAppState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    foregroundCallback = undefined;
    refreshCallback = undefined;
    appStateCallback = undefined;
    mocks.configure.mockResolvedValue(undefined);
    mocks.register.mockResolvedValue("expo-token");
    mocks.send.mockResolvedValue(true);
    mocks.pendingTrip.mockResolvedValue(null);
    mocks.setup.mockImplementation((callback) => {
      foregroundCallback = callback;
      return { foregroundSubscription, responseSubscription };
    });
    mocks.refreshListener.mockImplementation((callback) => {
      refreshCallback = callback;
      return removeRefresh;
    });
    jest.spyOn(AppState, "addEventListener").mockImplementation((_event, callback) => {
      appStateCallback = callback as (state: string) => void;
      return { remove: removeAppState } as never;
    });
  });

  it("stays idle while disabled", async () => {
    const { result, unmount } = await renderHook(() =>
      usePushNotifications({ accessToken: "jwt", enabled: false }),
    );
    expect(result.current).toEqual({
      expoPushToken: null,
      permissionGranted: false,
      tokenRegistrationState: "idle",
    });
    expect(mocks.register).not.toHaveBeenCalled();
    await unmount();
  });

  it("registers and sends the Expo token", async () => {
    const { result, unmount } = await renderHook(() =>
      usePushNotifications({ accessToken: "jwt", enabled: true }),
    );
    await waitFor(() => expect(result.current.tokenRegistrationState).toBe("registered"));
    expect(result.current.expoPushToken).toBe("expo-token");
    expect(result.current.permissionGranted).toBe(true);
    expect(mocks.send).toHaveBeenCalledWith("expo-token", "jwt");
    await unmount();
    expect(mocks.clear).toHaveBeenCalled();
    expect(removeRefresh).toHaveBeenCalled();
    expect(removeAppState).toHaveBeenCalled();
  });

  it("reports registration failures", async () => {
    mocks.register.mockResolvedValueOnce(null);
    const { result, unmount } = await renderHook(() =>
      usePushNotifications({ accessToken: "jwt", enabled: true }),
    );
    await waitFor(() => expect(result.current.tokenRegistrationState).toBe("failed"));

    mocks.register.mockResolvedValueOnce("token-2");
    mocks.send.mockResolvedValueOnce(false);
    await unmount();
    const second = await renderHook(() =>
      usePushNotifications({ accessToken: "jwt", enabled: true }),
    );
    await waitFor(() => expect(second.result.current.tokenRegistrationState).toBe("failed"));
    await second.unmount();
  });

  it("forwards foreground, pending and refreshed tokens", async () => {
    const onTrip = jest.fn();
    mocks.pendingTrip.mockResolvedValueOnce("trip-pending");
    const { result, unmount } = await renderHook(() =>
      usePushNotifications({ accessToken: "jwt", enabled: true, onNotificationTripId: onTrip }),
    );
    await waitFor(() => expect(result.current.expoPushToken).toBe("expo-token"));
    await waitFor(() => expect(onTrip).toHaveBeenCalledWith("trip-pending"));

    await act(async () => foregroundCallback?.("trip-live"));
    expect(onTrip).toHaveBeenCalledWith("trip-live");
    await act(async () => {
      await refreshCallback?.("refreshed-token");
    });
    expect(mocks.send).toHaveBeenCalledWith("refreshed-token", "jwt");
    await unmount();
  });

  it("retries registration when the app becomes active without a token", async () => {
    mocks.register.mockResolvedValueOnce(null).mockResolvedValueOnce("retry-token");
    const { unmount } = await renderHook(() =>
      usePushNotifications({ accessToken: "jwt", enabled: true }),
    );
    await waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(1));
    await act(async () => {
      appStateCallback?.("active");
      await Promise.resolve();
    });
    await waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(2));
    expect(mocks.send).toHaveBeenCalledWith("retry-token", "jwt");
    await act(async () => appStateCallback?.("background"));
    expect(mocks.register).toHaveBeenCalledTimes(2);
    await unmount();
  });
});
