import { act, renderHook } from "@testing-library/react-native";

const mockChannel = {
  on: jest.fn(),
  subscribe: jest.fn(),
};
const mockSupabase = {
  channel: jest.fn(),
  removeChannel: jest.fn(),
};
const mockIsDuplicate = jest.fn();
let mockBroadcast: ((payload: unknown) => void) | undefined;

mockChannel.on.mockImplementation((_type, _filter, callback) => {
  mockBroadcast = callback;
  return mockChannel;
});
mockChannel.subscribe.mockReturnValue(mockChannel);
mockSupabase.channel.mockReturnValue(mockChannel);

jest.mock("../../lib/supabase", () => ({
  supabase: {
    channel: (...args: unknown[]) => mockSupabase.channel(...args),
    removeChannel: (...args: unknown[]) => mockSupabase.removeChannel(...args),
  },
}));
jest.mock("../../services/notificationService", () => ({
  isDuplicateGeofenceAlert: (...args: unknown[]) => mockIsDuplicate(...args),
}));

import { useGeofenceAlerts } from "../useGeofenceAlerts";

describe("useGeofenceAlerts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBroadcast = undefined;
    mockChannel.on.mockImplementation((_type, _filter, callback) => {
      mockBroadcast = callback;
      return mockChannel;
    });
    mockChannel.subscribe.mockReturnValue(mockChannel);
    mockSupabase.channel.mockReturnValue(mockChannel);
    mockIsDuplicate.mockReturnValue(false);
  });

  it("does not subscribe when disabled or missing a user", async () => {
    const { rerender } = await renderHook(
      ({ userId, enabled }: { userId: string | null; enabled: boolean }) =>
        useGeofenceAlerts({ userId, enabled }),
      { initialProps: { userId: null as string | null, enabled: true } },
    );
    expect(mockSupabase.channel).not.toHaveBeenCalled();
    await rerender({ userId: "user-1", enabled: false });
    expect(mockSupabase.channel).not.toHaveBeenCalled();
  });

  it("subscribes, exposes alerts, dismisses and cleans up", async () => {
    const { result, unmount } = await renderHook(() =>
      useGeofenceAlerts({ userId: "user-1", enabled: true }),
    );
    expect(mockSupabase.channel).toHaveBeenCalledWith("passenger:user-1:alerts");

    await act(async () => {
      mockBroadcast?.({ payload: { trip_id: "trip-1", stop_id: "stop-1" } });
    });
    expect(result.current?.alert).toEqual({ tripId: "trip-1", stopId: "stop-1" });

    await act(async () => result.current?.dismissAlert());
    expect(result.current?.alert).toBeNull();
    await unmount();
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it("accepts direct payloads and ignores invalid or duplicate alerts", async () => {
    const { result } = await renderHook(() =>
      useGeofenceAlerts({ userId: "user-1", enabled: true }),
    );
    await act(async () => mockBroadcast?.({ trip_id: "trip-2" }));
    expect(result.current?.alert).toEqual({ tripId: "trip-2", stopId: null });

    await act(async () => mockBroadcast?.({ payload: { stop_id: "stop-only" } }));
    expect(result.current?.alert?.tripId).toBe("trip-2");

    mockIsDuplicate.mockReturnValueOnce(true);
    await act(async () => mockBroadcast?.({ payload: { trip_id: "trip-3" } }));
    expect(result.current?.alert?.tripId).toBe("trip-2");
  });
});
