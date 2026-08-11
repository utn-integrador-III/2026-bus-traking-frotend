import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { LoginResponse } from "../../services/apiClient";

const mockNetInfo = {
  fetch: jest.fn(),
  addEventListener: jest.fn(),
};
const mockQueue = {
  initialize: jest.fn(),
  cleanup: jest.fn(),
  earliest: jest.fn(),
};
const mockSync = jest.fn();
const mockUsable = jest.fn();
let mockConnectionListener: ((state: any) => void) | undefined;

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: (...args: unknown[]) => mockNetInfo.fetch(...args),
    addEventListener: (...args: unknown[]) => mockNetInfo.addEventListener(...args),
  },
}));
jest.mock("../../database/offlineIncidentQueue", () => ({
  initializeOfflineIncidentQueue: (...args: unknown[]) => mockQueue.initialize(...args),
  cleanupExpiredOfflineIncidents: (...args: unknown[]) => mockQueue.cleanup(...args),
  getEarliestRetryAt: (...args: unknown[]) => mockQueue.earliest(...args),
}));
jest.mock("../../services/incidentService", () => ({
  syncPendingPassengerIncidents: (...args: unknown[]) => mockSync(...args),
  hasUsableInternetConnection: (...args: unknown[]) => mockUsable(...args),
}));

import { useOfflineIncidentSync } from "../useOfflineIncidentSync";

const passenger: LoginResponse = {
  access_token: "jwt",
  refresh_token: "refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "user-1", email: "p@example.com", role: "Passenger", name: "P" },
};

describe("useOfflineIncidentSync", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockConnectionListener = undefined;
    mockQueue.initialize.mockResolvedValue(undefined);
    mockQueue.cleanup.mockResolvedValue(undefined);
    mockQueue.earliest.mockResolvedValue(null);
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    mockNetInfo.addEventListener.mockImplementation((listener) => {
      mockConnectionListener = listener;
      return jest.fn();
    });
    mockUsable.mockImplementation((state) => state.isConnected === true);
    mockSync.mockResolvedValue({ syncedIds: [], failedIds: [] });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("initializes and cleans expired queue entries", async () => {
    const { unmount } = await renderHook(() => useOfflineIncidentSync(null));
    await waitFor(() => expect(mockQueue.initialize).toHaveBeenCalled());
    expect(mockQueue.cleanup).toHaveBeenCalledWith(7 * 24 * 60 * 60 * 1000);
    expect(mockNetInfo.addEventListener).not.toHaveBeenCalled();
    await unmount();
  });

  it("does not sync non-passenger sessions", async () => {
    const { unmount } = await renderHook(() =>
      useOfflineIncidentSync({
        ...passenger,
        user: { ...passenger.user, role: "Driver" },
      }),
    );
    await act(async () => Promise.resolve());
    expect(mockSync).not.toHaveBeenCalled();
    await unmount();
  });

  it("performs an immediate passenger sync and subscribes", async () => {
    const unsubscribe = jest.fn();
    mockNetInfo.addEventListener.mockImplementationOnce((listener) => {
      mockConnectionListener = listener;
      return unsubscribe;
    });
    const { unmount } = await renderHook(() => useOfflineIncidentSync(passenger));
    await waitFor(() => expect(mockSync).toHaveBeenCalledWith("user-1", "jwt"));
    expect(mockNetInfo.addEventListener).toHaveBeenCalled();
    await unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("waits for stable connectivity before synchronizing", async () => {
    mockUsable.mockReturnValue(true);
    const { unmount } = await renderHook(() => useOfflineIncidentSync(passenger));
    await waitFor(() => expect(mockSync).toHaveBeenCalledTimes(1));

    await act(async () => mockConnectionListener?.({ isConnected: true }));
    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockSync).toHaveBeenCalledTimes(2);
    await unmount();
  });

  it("ignores offline events and schedules future retries", async () => {
    mockUsable.mockReturnValue(false);
    const { unmount } = await renderHook(() => useOfflineIncidentSync(passenger));
    await waitFor(() => expect(mockQueue.earliest).toHaveBeenCalled());
    await act(async () => mockConnectionListener?.({ isConnected: false }));
    expect(mockSync).not.toHaveBeenCalled();

    const retryAt = new Date(Date.now() + 2000).toISOString();
    mockQueue.earliest.mockResolvedValueOnce(retryAt);
    mockUsable.mockReturnValueOnce(true);
    mockNetInfo.fetch.mockResolvedValueOnce({ isConnected: true });
    await act(async () => mockConnectionListener?.({ isConnected: true }));
    mockUsable.mockReturnValueOnce(false);
    await act(async () => {
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockQueue.earliest).toHaveBeenCalled();
    await unmount();
  });
});
