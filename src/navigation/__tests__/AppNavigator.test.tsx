import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

const mockAuth = { getSession: jest.fn(), signOut: jest.fn() };
const mockStopTracking = jest.fn();
const mockDismissGeofence = jest.fn();
const mockOfflineSync = jest.fn();
const mockPush = jest.fn();
let mockGeofenceAlert: { tripId: string } | null = null;
let mockNotificationCallback: ((tripId: string) => void) | undefined;

jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockAuth.getSession(...args),
      signOut: (...args: unknown[]) => mockAuth.signOut(...args),
    },
  },
}));
jest.mock("../../services/driverLocationService", () => ({
  stopDriverTracking: (...args: unknown[]) => mockStopTracking(...args),
}));
jest.mock("../../hooks/useOfflineIncidentSync", () => ({
  useOfflineIncidentSync: (...args: unknown[]) => mockOfflineSync(...args),
}));
jest.mock("../../hooks/usePushNotifications", () => ({
  usePushNotifications: (options: any) => {
    mockNotificationCallback = options.onNotificationTripId;
    return mockPush(options);
  },
}));
jest.mock("../../hooks/useGeofenceAlerts", () => ({
  useGeofenceAlerts: () => ({ alert: mockGeofenceAlert, dismissAlert: mockDismissGeofence }),
}));

function mockScreen(name: string, buttons: Record<string, string>) {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  return (props: any) => React.createElement(
    View,
    null,
    React.createElement(Text, null, name),
    ...Object.entries(buttons).map(([label, prop]) => React.createElement(
      Pressable,
      { key: label, onPress: () => props[prop]?.() },
      React.createElement(Text, null, label),
    )),
  );
}

jest.mock("../../auth/LoginScreen", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  const sessions: Record<string, any> = {
    Passenger: { access_token: "p-jwt", user: { id: "p1", email: "p@test.com", role: "Passenger", name: "P", is_senior: true } },
    Driver: { access_token: "d-jwt", user: { id: "d1", email: "d@test.com", role: "Driver", name: "D" } },
    Admin: { access_token: "a-jwt", user: { id: "a1", email: "a@test.com", role: "Admin", name: "A" } },
    Unknown: { access_token: "u-jwt", user: { id: "u1", email: "u@test.com", role: "Unknown", name: "U" } },
  };
  return ({ onLoginSuccess, onGoToRegister }: any) => React.createElement(
    View,
    null,
    React.createElement(Text, null, "Login mock"),
    ...Object.entries(sessions).map(([role, session]) => React.createElement(
      Pressable,
      { key: role, onPress: () => onLoginSuccess(session) },
      React.createElement(Text, null, `Login ${role}`),
    )),
    React.createElement(Pressable, { onPress: onGoToRegister }, React.createElement(Text, null, "Open register")),
  );
});
jest.mock("../../auth/RegisterPassengerScreen", () => ({ onRegistered }: any) => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return React.createElement(Pressable, { onPress: onRegistered }, React.createElement(Text, null, "Register mock"));
});
jest.mock("../../screens/passenger/PassengerHomeScreen", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  return (props: any) => React.createElement(View, null,
    React.createElement(Text, null, "Passenger home mock"),
    React.createElement(Pressable, { onPress: () => props.onTrackTrip("trip-1") }, React.createElement(Text, null, "Track trip")),
    React.createElement(Pressable, { onPress: props.onOpenTickets }, React.createElement(Text, null, "Open tickets")),
    React.createElement(Pressable, { onPress: props.onClearTracking }, React.createElement(Text, null, "Clear tracking")),
    React.createElement(Pressable, { onPress: props.onLogout }, React.createElement(Text, null, "Passenger logout")),
  );
});
jest.mock("../../screens/passenger/PassengerRouteTrackingScreen", () => mockScreen("Tracking mock", {
  "Tracking back": "onBack", Checkout: "onCheckout", "Open incident": "onOpenIncidentReport",
}));
jest.mock("../../screens/passenger/PassengerPaymentScreen", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  const ticket = { id: "ticket-1", trip_id: "trip-1", qr_payload: "qr", status: "Generated" };
  return (props: any) => React.createElement(View, null,
    React.createElement(Text, null, "Payment mock"),
    React.createElement(Pressable, { onPress: () => props.onPaymentSuccess(ticket) }, React.createElement(Text, null, "Payment success")),
    React.createElement(Pressable, { onPress: props.onBack }, React.createElement(Text, null, "Payment back")),
  );
});
jest.mock("../../screens/passenger/PassengerMyTicketsScreen", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  const ticket = { id: "existing", trip_id: "trip-2", qr_payload: "qr2", status: "Generated" };
  return (props: any) => React.createElement(View, null,
    React.createElement(Text, null, "Tickets mock"),
    React.createElement(Pressable, { onPress: () => props.onOpenTicket(ticket) }, React.createElement(Text, null, "Open existing")),
    React.createElement(Pressable, { onPress: props.onBack }, React.createElement(Text, null, "Tickets back")),
  );
});
jest.mock("../../screens/passenger/PassengerBoardingPassScreen", () => mockScreen("Boarding mock", {
  "Boarding home": "onBackHome", "Boarding trip": "onBackToTrip",
}));
jest.mock("../../screens/passenger/PassengerIncidentScreen", () => mockScreen("Incident mock", {
  "Incident back": "onBack", "Incident submitted": "onSubmitted",
}));
jest.mock("../../screens/driver/DriverHomeScreen", () => mockScreen("Driver home mock", {
  "Open scanner": "onOpenScanner", "Driver logout": "onLogout",
}));
jest.mock("../../screens/driver/DriverScannerScreen", () => mockScreen("Scanner mock", {
  "Scanner back": "onBack",
}));

import AppNavigator from "../AppNavigator";

describe("AppNavigator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGeofenceAlert = null;
    mockNotificationCallback = undefined;
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    mockAuth.signOut.mockResolvedValue(undefined);
    mockStopTracking.mockResolvedValue(undefined);
  });

  it("restores safely, opens registration and returns", async () => {
    mockAuth.getSession.mockResolvedValueOnce({ data: { session: { access_token: "stale" } } });
    const screen = await render(<AppNavigator />);
    await waitFor(() => expect(screen.getByText("Login mock")).toBeTruthy());
    expect(mockAuth.signOut).toHaveBeenCalled();
    await fireEvent.press(screen.getByText("Open register"));
    expect(screen.getByText("Register mock")).toBeTruthy();
    await fireEvent.press(screen.getByText("Register mock"));
    expect(screen.getByText("Login mock")).toBeTruthy();
    await screen.unmount();
  });

  it("covers the passenger navigation flow", async () => {
    const screen = await render(<AppNavigator />);
    await fireEvent.press(screen.getByText("Login Passenger"));
    expect(screen.getByText("Passenger home mock")).toBeTruthy();
    await fireEvent.press(screen.getByText("Track trip"));
    expect(screen.getByText("Tracking mock")).toBeTruthy();
    await fireEvent.press(screen.getByText("Checkout"));
    expect(screen.getByText("Payment mock")).toBeTruthy();
    await fireEvent.press(screen.getByText("Payment back"));
    await fireEvent.press(screen.getByText("Checkout"));
    await fireEvent.press(screen.getByText("Payment success"));
    expect(screen.getByText("Boarding mock")).toBeTruthy();
    await fireEvent.press(screen.getByText("Boarding trip"));
    await fireEvent.press(screen.getByText("Tracking back"));
    await fireEvent.press(screen.getByText("Open tickets"));
    expect(screen.getByText("Tickets mock")).toBeTruthy();
    await fireEvent.press(screen.getByText("Open existing"));
    await fireEvent.press(screen.getByText("Boarding home"));
    await fireEvent.press(screen.getByText("Track trip"));
    await fireEvent.press(screen.getByText("Open incident"));
    expect(screen.getByText("Incident mock")).toBeTruthy();
    await fireEvent.press(screen.getByText("Incident submitted"));
    expect(screen.getByText("Tracking mock")).toBeTruthy();
    await screen.unmount();
  });

  it("navigates from notifications and geofence banners", async () => {
    mockGeofenceAlert = { tripId: "geo-trip" };
    const screen = await render(<AppNavigator />);
    await fireEvent.press(screen.getByText("Login Passenger"));
    expect(screen.getByText(/autob.*llegando/)).toBeTruthy();
    await fireEvent.press(screen.getByText(/autob.*llegando/));
    expect(screen.getByText("Tracking mock")).toBeTruthy();
    expect(mockDismissGeofence).toHaveBeenCalled();
    await act(async () => mockNotificationCallback?.("notification-trip"));
    expect(screen.getByText("Tracking mock")).toBeTruthy();
    await screen.unmount();
  });

  it("covers driver and scanner navigation", async () => {
    const screen = await render(<AppNavigator />);
    await fireEvent.press(screen.getByText("Login Driver"));
    expect(screen.getByText("Driver home mock")).toBeTruthy();
    await fireEvent.press(screen.getByText("Open scanner"));
    expect(screen.getByText("Scanner mock")).toBeTruthy();
    await fireEvent.press(screen.getByText("Scanner back"));
    await fireEvent.press(screen.getByText("Driver logout"));
    await waitFor(() => expect(screen.getByText("Login mock")).toBeTruthy());
    expect(mockStopTracking).toHaveBeenCalled();
    await screen.unmount();
  });

  it("covers admin and unsupported roles", async () => {
    const admin = await render(<AppNavigator />);
    await fireEvent.press(admin.getByText("Login Admin"));
    expect(admin.getByText("Panel Admin")).toBeTruthy();
    await fireEvent.press(admin.getByText(/Cerrar sesi/));
    expect(admin.getByText("Login mock")).toBeTruthy();
    await admin.unmount();

    const unknown = await render(<AppNavigator />);
    await fireEvent.press(unknown.getByText("Login Unknown"));
    expect(unknown.getByText("Login mock")).toBeTruthy();
    await unknown.unmount();
  });
});
