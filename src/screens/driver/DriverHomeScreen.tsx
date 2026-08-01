import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Location from "expo-location";
import {
  AuthUser,
  DriverTrip,
  cancelDriverTrip,
  completeDriverTrip,
  createDriverIncident,
  getAssignedDriverTrips,
  startDriverTrip,
} from "../../services/apiClient";
import {
  isDriverTrackingActive,
  startDriverTracking,
  stopDriverTracking,
} from "../../services/driverLocationService";

interface DriverHomeScreenProps {
  user: AuthUser;
  accessToken: string;
  onLogout: () => void;
  onOpenScanner?: () => void;
}

const STARTABLE_STATUSES = ["Scheduled", "Pending"];

function formatDeparture(value?: string | null): string {
  if (!value) {
    return "Sin horario";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin horario";
  }

  return date.toLocaleString();
}

export default function DriverHomeScreen({
  user,
  accessToken,
  onLogout,
  onOpenScanner,
}: DriverHomeScreenProps) {
  const [assignedTrips, setAssignedTrips] = useState<DriverTrip[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const activeTrip = useMemo(
    () => assignedTrips.find((trip) => trip.status === "In_Progress") || null,
    [assignedTrips],
  );

  const startableTrips = useMemo(
    () => assignedTrips.filter((trip) => STARTABLE_STATUSES.includes(trip.status)),
    [assignedTrips],
  );

  async function loadAssignedTrips() {
    const [trips, tracking] = await Promise.all([
      getAssignedDriverTrips(accessToken),
      isDriverTrackingActive(),
    ]);

    setAssignedTrips(trips || []);
    setIsTracking(tracking);
  }

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        await loadAssignedTrips();
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar tus viajes asignados.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        return;
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 0,
        },
        (loc) => {
          if (!cancelled) {
            const rawSpeedMs = loc.coords.speed ?? 0;
            const speedKmh = rawSpeedMs >= 1
              ? Number((rawSpeedMs * 3.6).toFixed(1))
              : 0;
            setCurrentSpeed(speedKmh);
          }
        },
      );

      if (!cancelled) {
        locationSubRef.current = sub;
      } else {
        sub.remove();
      }
    })();

    return () => {
      cancelled = true;
      if (locationSubRef.current) {
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }
    };
  }, []);

  function resetMessages() {
    setStatusMessage("");
    setErrorMessage("");
  }

  async function handleStartTrip(tripId: string) {
    resetMessages();
    setIsBusy(true);

    try {
      await startDriverTrip(tripId, accessToken);
      await startDriverTracking(tripId, accessToken);
      await loadAssignedTrips();
      setStatusMessage("Viaje iniciado. Transmitiendo ubicación en segundo plano.");
    } catch (error) {
      await stopDriverTracking().catch(() => undefined);
      setIsTracking(false);
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo iniciar el viaje.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleToggleTracking() {
    if (!activeTrip) {
      return;
    }

    resetMessages();
    setIsBusy(true);

    try {
      if (isTracking) {
        await stopDriverTracking();
        setIsTracking(false);
        setStatusMessage("Transmisión pausada.");
      } else {
        await startDriverTracking(activeTrip.id, accessToken);
        setIsTracking(true);
        setStatusMessage("Transmitiendo ubicación en segundo plano.");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado de la transmisión.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function submitPanicIncident(incidentType: string) {
    if (!activeTrip) {
      return;
    }

    setIsBusy(true);

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      await createDriverIncident(
        {
          trip_id: activeTrip.id,
          type: incidentType,
          description: "Reporte de panico del conductor.",
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        },
        accessToken,
      );

      Alert.alert("Reporte enviado", "El incidente ha sido registrado.");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo enviar el reporte.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  function handlePanicIncident() {
    if (!activeTrip) {
      return;
    }

    if (currentSpeed > 0) {
      Alert.alert(
        "Accion bloqueada",
        "El boton de panico solo esta disponible con el vehiculo detenido.",
      );
      return;
    }

    Alert.alert(
      "Reportar incidente critico",
      "Selecciona el tipo de incidente:",
      [
        {
          text: "Accidente",
          onPress: () => {
            void submitPanicIncident("Accident");
          },
        },
        {
          text: "Demora",
          onPress: () => {
            void submitPanicIncident("Delay");
          },
        },
        {
          text: "Sobrecupo",
          onPress: () => {
            void submitPanicIncident("Overcrowding");
          },
        },
        {
          text: "Otro",
          onPress: () => {
            void submitPanicIncident("Other");
          },
        },
        { text: "Cancelar", style: "cancel" },
      ],
    );
  }

  async function finishTrip(mode: "complete" | "cancel") {
    if (!activeTrip) {
      return;
    }

    resetMessages();
    setIsBusy(true);

    try {
      await stopDriverTracking();
      setIsTracking(false);

      if (mode === "complete") {
        await completeDriverTrip(activeTrip.id, accessToken);
        setStatusMessage("Viaje finalizado. La transmisión se detuvo.");
      } else {
        await cancelDriverTrip(activeTrip.id, accessToken);
        setStatusMessage("Viaje cancelado. La transmisión se detuvo.");
      }

      await loadAssignedTrips();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo finalizar el viaje.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  function confirmFinish(mode: "complete" | "cancel") {
    const title = mode === "complete" ? "Finalizar viaje" : "Cancelar viaje";
    const message =
      mode === "complete"
        ? "¿Confirmás que el viaje terminó? Se detendrá la transmisión de GPS."
        : "¿Confirmás la cancelación del viaje? Se detendrá la transmisión de GPS.";

    Alert.alert(title, message, [
      { text: "Volver", style: "cancel" },
      {
        text: title,
        style: mode === "cancel" ? "destructive" : "default",
        onPress: () => {
          finishTrip(mode);
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color="#FFA70B" size="large" />
        <Text style={styles.loadingText}>Cargando panel del conductor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Hola, {user.name || "Conductor"}</Text>
            <Text style={styles.subtitle}>Portal del conductor</Text>
          </View>

          <Pressable style={styles.logoutButton} onPress={onLogout}>
            <Text style={styles.logoutText}>Salir</Text>
          </Pressable>
        </View>

        <View style={styles.trackingBanner}>
          <View
            style={[
              styles.trackingDot,
              isTracking ? styles.trackingDotOn : styles.trackingDotOff,
            ]}
          />
          <Text style={styles.trackingBannerText}>
            {isTracking
              ? "GPS activo: transmitiendo en segundo plano"
              : "GPS inactivo: no se está transmitiendo"}
          </Text>
        </View>

        {statusMessage ? (
          <Text style={styles.successMessage}>{statusMessage}</Text>
        ) : null}

        {errorMessage ? (
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        ) : null}

        {activeTrip ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Viaje en curso</Text>
            <Text style={styles.tripCode}>Trip {activeTrip.id.slice(0, 8)}</Text>
            <Text style={styles.tripMeta}>Estado: {activeTrip.status}</Text>
            <Text style={styles.tripMeta}>
              Salida: {formatDeparture(activeTrip.departure_time)}
            </Text>
            <Text style={styles.tripMeta}>
              Bus {activeTrip.bus_id ? activeTrip.bus_id.slice(0, 8) : "asignado"}
            </Text>

            <Pressable
              style={[styles.primaryButton, isTracking ? styles.pauseButton : null]}
              onPress={handleToggleTracking}
              disabled={isBusy}
            >
              <Text style={[styles.primaryButtonText, isTracking ? styles.pauseButtonText : null]}>
                {isTracking ? "Pausar transmisión" : "Reanudar transmisión"}
              </Text>
            </Pressable>

            {onOpenScanner && (
              <Pressable
                style={[styles.primaryButton, styles.scanButton]}
                onPress={onOpenScanner}
                disabled={isBusy}
              >
                <Text style={styles.scanButtonText}>Escanear Codigo QR</Text>
              </Pressable>
            )}

            <Pressable
              style={[
                styles.panicButton,
                currentSpeed > 0 && styles.panicButtonDisabled,
              ]}
              onPress={handlePanicIncident}
              disabled={isBusy || currentSpeed > 0}
            >
              <Text
                style={[
                  styles.panicButtonText,
                  currentSpeed > 0 && styles.panicButtonTextDisabled,
                ]}
              >
                {currentSpeed > 0
                  ? `Bloqueado (${currentSpeed} km/h)`
                  : "Reportar incidente critico"}
              </Text>
            </Pressable>

            <View style={styles.rowButtons}>
              <Pressable
                style={[styles.secondaryButton, styles.cancelButton]}
                onPress={() => confirmFinish("cancel")}
                disabled={isBusy}
              >
                <Text style={styles.cancelButtonText}>Cancelar viaje</Text>
              </Pressable>

              <Pressable
                style={[styles.secondaryButton, styles.completeButton]}
                onPress={() => confirmFinish("complete")}
                disabled={isBusy}
              >
                <Text style={styles.completeButtonText}>Finalizar viaje</Text>
              </Pressable>
            </View>
          </View>
        ) : startableTrips.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tus viajes asignados</Text>
            <Text style={styles.helperText}>
              Estos viajes te fueron asignados. Iniciá uno para comenzar a
              transmitir tu ubicación automáticamente.
            </Text>

            {startableTrips.map((trip) => (
              <View key={trip.id} style={styles.card}>
                <Text style={styles.tripCode}>Trip {trip.id.slice(0, 8)}</Text>
                <Text style={styles.tripMeta}>Estado: {trip.status}</Text>
                <Text style={styles.tripMeta}>
                  Salida: {formatDeparture(trip.departure_time)}
                </Text>
                <Text style={styles.tripMeta}>
                  Bus {trip.bus_id ? trip.bus_id.slice(0, 8) : "asignado"}
                </Text>

                <Pressable
                  style={styles.primaryButton}
                  onPress={() => handleStartTrip(trip.id)}
                  disabled={isBusy}
                >
                  <Text style={styles.primaryButtonText}>Iniciar viaje</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sin viajes asignados</Text>
            <Text style={styles.helperText}>
              No tenés viajes asignados por ahora. Cuando el administrador te
              asigne uno, aparecerá aquí para iniciarlo con un toque.
            </Text>
          </View>
        )}

        {isBusy ? (
          <ActivityIndicator color="#0F2141" style={styles.inlineSpinner} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F1",
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F3F4F1",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    color: "#0F2141",
    marginTop: 12,
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    color: "#0F2141",
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    color: "#697386",
    fontWeight: "700",
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logoutText: {
    color: "#0F2141",
    fontWeight: "900",
  },
  trackingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginTop: 20,
    gap: 10,
  },
  trackingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  trackingDotOn: {
    backgroundColor: "#087D3B",
  },
  trackingDotOff: {
    backgroundColor: "#B4241C",
  },
  trackingBannerText: {
    flex: 1,
    color: "#0F2141",
    fontWeight: "700",
  },
  successMessage: {
    color: "#087D3B",
    backgroundColor: "#E7F7EE",
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
    fontWeight: "700",
  },
  errorMessage: {
    color: "#B4241C",
    backgroundColor: "#FCE9E7",
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
    fontWeight: "700",
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: "#0F2141",
    fontSize: 18,
    fontWeight: "900",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
  },
  cardTitle: {
    color: "#0F2141",
    fontSize: 18,
    fontWeight: "900",
  },
  tripCode: {
    color: "#0F2141",
    fontSize: 22,
    fontWeight: "900",
  },
  tripMeta: {
    color: "#697386",
    fontWeight: "700",
    marginTop: 6,
  },
  helperText: {
    color: "#697386",
    fontWeight: "600",
    marginTop: 10,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: "#FFA70B",
    borderRadius: 18,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  pauseButton: {
    backgroundColor: "#0F2141",
  },
  pauseButtonText: {
    color: "#FFFFFF",
  },
  primaryButtonText: {
    color: "#0F2141",
    fontWeight: "900",
    fontSize: 16,
  },
  scanButton: {
    backgroundColor: "#E7F7EE",
    borderWidth: 1,
    borderColor: "#087D3B",
    marginTop: 12,
  },
  scanButtonText: {
    color: "#087D3B",
    fontWeight: "900",
    fontSize: 16,
  },
  rowButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 18,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#FCE9E7",
  },
  cancelButtonText: {
    color: "#B4241C",
    fontWeight: "900",
  },
  completeButton: {
    backgroundColor: "#E7F7EE",
  },
  completeButtonText: {
    color: "#087D3B",
    fontWeight: "900",
  },
  inlineSpinner: {
    marginTop: 20,
  },
  panicButton: {
    backgroundColor: "#B4241C",
    borderRadius: 18,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  panicButtonDisabled: {
    backgroundColor: "#E4E7EB",
  },
  panicButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  panicButtonTextDisabled: {
    color: "#8A94A6",
  },
});
