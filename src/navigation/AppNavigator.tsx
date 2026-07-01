import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import LoginScreen from "../auth/LoginScreen";
import RegisterPassengerScreen from "../auth/RegisterPassengerScreen";
import PassengerHomeScreen from "../screens/passenger/PassengerHomeScreen";
import PassengerRouteTrackingScreen from "../screens/passenger/PassengerRouteTrackingScreen";
import { LoginResponse } from "../services/apiClient";

type AppScreen =
  | "login"
  | "register"
  | "passenger-home"
  | "passenger-tracking"
  | "driver-home"
  | "admin-dashboard";

export default function AppNavigator() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("login");
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

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

  function handleLogout() {
    setSession(null);
    setSelectedTripId(null);
    setCurrentScreen("login");
  }

  function handleTrackTrip(tripId: string) {
    setSelectedTripId(tripId);
    setCurrentScreen("passenger-tracking");
  }

  if (currentScreen === "register") {
    return (
      <View style={styles.screen}>
        <View style={styles.backBar}>
          <Pressable onPress={() => setCurrentScreen("login")}>
            <Text style={styles.backText}>← Volver al login</Text>
          </Pressable>
        </View>

        <RegisterPassengerScreen />
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
      />
    );
  }

  if (currentScreen === "passenger-tracking" && session && selectedTripId) {
    return (
      <PassengerRouteTrackingScreen
        tripId={selectedTripId}
        accessToken={session.access_token}
        onBack={() => setCurrentScreen("passenger-home")}
      />
    );
  }

  if (currentScreen === "driver-home") {
    return (
      <View style={styles.placeholderScreen}>
        <Text style={styles.placeholderTitle}>Portal Conductor</Text>
        <Text style={styles.placeholderText}>
          Login correcto como conductor. Esta pantalla se conectará después.
        </Text>

        <Pressable style={styles.placeholderButton} onPress={handleLogout}>
          <Text style={styles.placeholderButtonText}>Cerrar sesión</Text>
        </Pressable>
      </View>
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