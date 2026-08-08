import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { stopDriverTracking } from "../services/driverLocationService";
import LoginScreen from "../auth/LoginScreen";
import RegisterPassengerScreen from "../auth/RegisterPassengerScreen";
import { usePushNotifications } from "../hooks/usePushNotifications";
import DriverHomeScreen from "../screens/driver/DriverHomeScreen";
import DriverScannerScreen from "../screens/driver/DriverScannerScreen";
import PassengerBoardingPassScreen from "../screens/passenger/PassengerBoardingPassScreen";
import PassengerHomeScreen from "../screens/passenger/PassengerHomeScreen";
import PassengerMyTicketsScreen from "../screens/passenger/PassengerMyTicketsScreen";
import PassengerPaymentScreen from "../screens/passenger/PassengerPaymentScreen";
import PassengerRouteTrackingScreen from "../screens/passenger/PassengerRouteTrackingScreen";
import { LoginResponse } from "../services/apiClient";
import { Ticket } from "../services/ticketService";

type AppScreen =
  | "login"
  | "register"
  | "passenger-home"
  | "passenger-tracking"
  | "passenger-payment"
  | "passenger-my-tickets"
  | "passenger-boarding-pass"
  | "driver-home"
  | "driver-scanner"
  | "admin-dashboard";

export default function AppNavigator() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("login");
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [generatedTicket, setGeneratedTicket] = useState<Ticket | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const stored = await supabase.auth.getSession().catch(() => null);

      if (stored?.data.session) {
        await supabase.auth.signOut().catch(() => undefined);
      }

      if (isMounted) {
        setIsRestoringSession(false);
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const isPassenger = session?.user.role === "Passenger";

  const handleNotificationTripId = useCallback(
    (tripId: string) => {
      setSelectedTripId(tripId);
      setGeneratedTicket(null);
      setCurrentScreen("passenger-tracking");
    },
    [],
  );

  usePushNotifications({
    accessToken: session?.access_token || "",
    enabled: isPassenger,
    onNotificationTripId: handleNotificationTripId,
  });

  function handleLoginSuccess(nextSession: LoginResponse) {
    setSession(nextSession);

    if (nextSession.user.role === "Passenger") {
      setCurrentScreen("passenger-home");
      return;
    }

    if (nextSession.user.role === "Driver") {
      setCurrentScreen("driver-home");
      return;
    }

    if (nextSession.user.role === "Admin") {
      setCurrentScreen("admin-dashboard");
      return;
    }

    setCurrentScreen("login");
  }

  async function handleLogout() {
    await stopDriverTracking().catch(() => undefined);
    await supabase.auth.signOut().catch(() => undefined);

    setSession(null);
    setSelectedTripId(null);
    setGeneratedTicket(null);
    setCurrentScreen("login");
  }

  function handleTrackTrip(tripId: string) {
    setSelectedTripId(tripId);
    setGeneratedTicket(null);
    setCurrentScreen("passenger-tracking");
  }

  function handleBackFromTracking() {
    setCurrentScreen("passenger-home");
  }

  function handleClearTracking() {
    setSelectedTripId(null);
  }

  function handleCheckout() {
    if (!selectedTripId) {
      return;
    }

    setCurrentScreen("passenger-payment");
  }

  function handlePaymentSuccess(ticket: Ticket) {
    setGeneratedTicket(ticket);
    setSelectedTripId(ticket.trip_id);
    setCurrentScreen("passenger-boarding-pass");
  }

  function handleOpenMyTickets() {
    setCurrentScreen("passenger-my-tickets");
  }

  function handleOpenExistingTicket(ticket: Ticket) {
    setGeneratedTicket(ticket);
    setSelectedTripId(ticket.trip_id);
    setCurrentScreen("passenger-boarding-pass");
  }

  function handleOpenScanner() {
    setCurrentScreen("driver-scanner");
  }

  if (isRestoringSession) {
    return (
      <View style={styles.placeholderScreen}>
        <ActivityIndicator color="#0F2141" size="large" />
      </View>
    );
  }

  if (currentScreen === "register") {
    return (
      <View style={styles.screen}>
        <View style={styles.backBar}>
          <Pressable onPress={() => setCurrentScreen("login")}>
            <Text style={styles.backText}>← Volver al login</Text>
          </Pressable>
        </View>

        <RegisterPassengerScreen onRegistered={() => setCurrentScreen("login")} />
      </View>
    );
  }

  if (currentScreen === "passenger-home" && session) {
    return (
      <PassengerHomeScreen
        user={session.user}
        accessToken={session.access_token}
        onLogout={handleLogout}
        onTrackTrip={handleTrackTrip}
        onOpenTickets={handleOpenMyTickets}
        trackingTripId={selectedTripId}
        onClearTracking={handleClearTracking}
      />
    );
  }

  if (currentScreen === "passenger-tracking" && session && selectedTripId) {
    return (
      <PassengerRouteTrackingScreen
        tripId={selectedTripId}
        accessToken={session.access_token}
        onBack={handleBackFromTracking}
        onCheckout={handleCheckout}
      />
    );
  }

  if (currentScreen === "passenger-payment" && session && selectedTripId) {
    return (
      <PassengerPaymentScreen
        tripId={selectedTripId}
        accessToken={session.access_token}
        isSeniorPassenger={!!session.user.is_senior}
        onBack={() => setCurrentScreen("passenger-tracking")}
        onPaymentSuccess={handlePaymentSuccess}
      />
    );
  }

  if (currentScreen === "passenger-my-tickets" && session) {
    return (
      <PassengerMyTicketsScreen
        accessToken={session.access_token}
        onBack={() => setCurrentScreen("passenger-home")}
        onOpenTicket={handleOpenExistingTicket}
      />
    );
  }

  if (currentScreen === "passenger-boarding-pass" && generatedTicket) {
    return (
      <PassengerBoardingPassScreen
        ticket={generatedTicket}
        onBackHome={() => setCurrentScreen("passenger-home")}
        onBackToTrip={() => setCurrentScreen("passenger-tracking")}
      />
    );
  }

  if (currentScreen === "driver-home" && session) {
    return (
      <DriverHomeScreen
        user={session.user}
        accessToken={session.access_token}
        onLogout={handleLogout}
        onOpenScanner={handleOpenScanner}
      />
    );
  }

  if (currentScreen === "driver-scanner" && session) {
    return (
      <DriverScannerScreen
        accessToken={session.access_token}
        onBack={() => setCurrentScreen("driver-home")}
      />
    );
  }

  if (currentScreen === "admin-dashboard") {
    return (
      <View style={styles.placeholderScreen}>
        <Text style={styles.placeholderTitle}>Panel Admin</Text>
        <Text style={styles.placeholderText}>
          Login correcto como administrador. Esta pantalla se conectará después.
        </Text>

        <Pressable style={styles.placeholderButton} onPress={handleLogout}>
          <Text style={styles.placeholderButtonText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <LoginScreen
      onLoginSuccess={handleLoginSuccess}
      onGoToRegister={() => setCurrentScreen("register")}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F1",
  },
  backBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backText: {
    color: "#0F2141",
    fontWeight: "800",
  },
  placeholderScreen: {
    flex: 1,
    backgroundColor: "#F3F4F1",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  placeholderTitle: {
    color: "#0F2141",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 10,
  },
  placeholderText: {
    color: "#697386",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  placeholderButton: {
    backgroundColor: "#FFA70B",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  placeholderButtonText: {
    color: "#0F2141",
    fontWeight: "900",
  },
});