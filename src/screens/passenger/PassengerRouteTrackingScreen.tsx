import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, {
  AnimatedRegion,
  LatLng,
  Marker,
  Polyline,
} from "react-native-maps";
import {
  getPassengerTripTrackingData,
  PassengerTripTrackingData,
  TripStatus,
} from "../../services/apiClient";
import { supabase } from "../../lib/supabase";

interface PassengerRouteTrackingScreenProps {
  tripId: string;
  accessToken: string;
  onBack: () => void;
}

interface LiveBusLocation {
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading?: number | null;
  status?: TripStatus;
  updatedAt: string;
}

function geoJsonToLatLng(route: PassengerTripTrackingData): LatLng[] {
  return route.geojson.geometry.coordinates.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));
}

function getInitialRegion(points: LatLng[]) {
  const first = points[0] || {
    latitude: 9.9281,
    longitude: -84.0907,
  };

  return {
    latitude: first.latitude,
    longitude: first.longitude,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };
}

function normalizeRealtimePayload(payload: any): LiveBusLocation | null {
  const row = payload?.new || payload?.payload || payload;

  const latitude = Number(row?.latitude ?? row?.lat);
  const longitude = Number(row?.longitude ?? row?.lng ?? row?.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    speedKmh: Number(row?.speed_kmh ?? row?.speed ?? 0),
    heading: row?.heading ?? null,
    status: row?.status,
    updatedAt: String(
      row?.recorded_at ?? row?.updated_at ?? row?.created_at ?? new Date().toISOString(),
    ),
  };
}

function buildStatusLabel(status: TripStatus): string {
  if (status === "In Progress") {
    return "In Progress";
  }

  if (status === "Delayed") {
    return "Delayed";
  }

  if (status === "Stopped") {
    return "Stopped";
  }

  if (status === "Scheduled" || status === "Pending") {
    return "Scheduled";
  }

  return String(status);
}

export default function PassengerRouteTrackingScreen({
  tripId,
  accessToken,
  onBack,
}: PassengerRouteTrackingScreenProps) {
  const [tripData, setTripData] = useState<PassengerTripTrackingData | null>(null);
  const [liveLocation, setLiveLocation] = useState<LiveBusLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const animatedCoordinate = useRef(
    new AnimatedRegion({
      latitude: 9.9281,
      longitude: -84.0907,
      latitudeDelta: 0,
      longitudeDelta: 0,
    }),
  ).current;

  const routePoints = useMemo(() => {
    return tripData ? geoJsonToLatLng(tripData) : [];
  }, [tripData]);

  const currentStatus = liveLocation?.status || tripData?.status || "Scheduled";
  const statusLabel = buildStatusLabel(currentStatus);

  function moveBusMarker(nextLocation: LiveBusLocation) {
    setLiveLocation(nextLocation);

    animatedCoordinate
      .timing({
        latitude: nextLocation.latitude,
        longitude: nextLocation.longitude,
        duration: 900,
        useNativeDriver: false,
      } as any)
      .start();
  }

  useEffect(() => {
    let isMounted = true;

    async function loadTrip() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const nextTripData = await getPassengerTripTrackingData(
          tripId,
          accessToken,
        );

        if (!isMounted) {
          return;
        }

        setTripData(nextTripData);

        const points = geoJsonToLatLng(nextTripData);
        const firstPoint = points[0];

        if (firstPoint) {
          animatedCoordinate.setValue({
            latitude: firstPoint.latitude,
            longitude: firstPoint.longitude,
            latitudeDelta: 0,
            longitudeDelta: 0,
          });

          setLiveLocation({
            latitude: firstPoint.latitude,
            longitude: firstPoint.longitude,
            speedKmh: nextTripData.speedKmh || 0,
            status: nextTripData.status,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el viaje.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTrip();

    return () => {
      isMounted = false;
    };
  }, [accessToken, animatedCoordinate, tripId]);

  useEffect(() => {
    if (!tripId) {
      return;
    }

    const channel = supabase
      .channel(`trip:${tripId}:driver-location`)
      .on("broadcast", { event: "location" }, (payload) => {
        const nextLocation = normalizeRealtimePayload(payload);

        if (nextLocation) {
          moveBusMarker(nextLocation);
        }
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "locations",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const nextLocation = normalizeRealtimePayload(payload);

          if (nextLocation) {
            moveBusMarker(nextLocation);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color="#FFA70B" size="large" />
        <Text style={styles.loadingText}>Cargando viaje en vivo...</Text>
      </SafeAreaView>
    );
  }

  if (errorMessage || !tripData) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorTitle}>No se pudo abrir el rastreo</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>

        <Pressable style={styles.errorButton} onPress={onBack}>
          <Text style={styles.errorButtonText}>Volver</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <MapView
        style={styles.map}
        initialRegion={getInitialRegion(routePoints)}
      >
        <Polyline
          coordinates={routePoints}
          strokeWidth={5}
          strokeColor="#0F2141"
        />

        <Marker.Animated coordinate={animatedCoordinate as any}>
          <View style={styles.busMarker}>
            <Text style={styles.busMarkerText}>{tripData.code}</Text>
          </View>
        </Marker.Animated>

        {routePoints.length > 0 ? (
          <Marker coordinate={routePoints[routePoints.length - 1]}>
            <View style={styles.stopMarker}>
              <Text style={styles.stopMarkerText}>Destino</Text>
            </View>
          </Marker>
        ) : null}
      </MapView>

      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>

        <View style={styles.topTextBox}>
          <Text style={styles.routeTitle}>Ruta {tripData.code}</Text>
          <Text style={styles.routeSubtitle}>{tripData.name}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.statusRow}>
          <Text style={styles.routeCode}>{tripData.code}</Text>

          <Text
            style={[
              styles.statusBadge,
              currentStatus === "Delayed"
                ? styles.delayedBadge
                : currentStatus === "In Progress"
                  ? styles.progressBadge
                  : styles.scheduledBadge,
            ]}
          >
            {statusLabel}
          </Text>
        </View>

        <Text style={styles.mainText}>
          Llega a tu parada en{" "}
          <Text style={styles.highlightText}>
            {tripData.estimatedArrivalMinutes || 4} min
          </Text>
        </Text>

        <Text style={styles.stopText}>
          {tripData.origin} → {tripData.destination}
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>
              {Math.round(liveLocation?.speedKmh || tripData.speedKmh || 0)}
            </Text>
            <Text style={styles.metricLabel}>km/h</Text>
          </View>

          <View style={styles.driverBox}>
            <Text style={styles.driverName}>
              {tripData.driverName || "Conductor asignado"}
            </Text>
            <Text style={styles.busText}>
              Bus {tripData.busPlate || "Asignado"} · Trip{" "}
              {tripData.tripId.slice(0, 8)}
            </Text>
          </View>
        </View>

        <Text style={styles.updateText}>
          Última actualización:{" "}
          {liveLocation
            ? new Date(liveLocation.updatedAt).toLocaleTimeString()
            : "Esperando GPS"}
        </Text>

        <View style={styles.actionsRow}>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Reportar</Text>
          </Pressable>

          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Comprar boleto</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F1",
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
  errorTitle: {
    color: "#0F2141",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  errorText: {
    color: "#697386",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },
  errorButton: {
    backgroundColor: "#FFA70B",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 20,
  },
  errorButtonText: {
    color: "#0F2141",
    fontWeight: "900",
  },
  map: {
    flex: 1,
  },
  topBar: {
    position: "absolute",
    top: 48,
    left: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    color: "#0F2141",
    fontSize: 24,
    fontWeight: "900",
  },
  topTextBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 18,
    padding: 12,
  },
  routeTitle: {
    color: "#0F2141",
    fontSize: 20,
    fontWeight: "900",
  },
  routeSubtitle: {
    color: "#697386",
    fontWeight: "700",
    marginTop: 2,
  },
  busMarker: {
    minWidth: 48,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0F2141",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  busMarkerText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  stopMarker: {
    backgroundColor: "#FFA70B",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  stopMarkerText: {
    color: "#0F2141",
    fontWeight: "900",
    fontSize: 12,
  },
  infoCard: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routeCode: {
    color: "#0F2141",
    fontSize: 22,
    fontWeight: "900",
  },
  statusBadge: {
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontWeight: "900",
  },
  progressBadge: {
    color: "#087D3B",
    backgroundColor: "#E7F7EE",
  },
  delayedBadge: {
    color: "#A66100",
    backgroundColor: "#FFF2D9",
  },
  scheduledBadge: {
    color: "#0F2141",
    backgroundColor: "#EEF2FF",
  },
  mainText: {
    color: "#0F2141",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 18,
    lineHeight: 30,
  },
  highlightText: {
    color: "#FFA70B",
    fontSize: 30,
    fontWeight: "900",
  },
  stopText: {
    color: "#697386",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 6,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  metricBox: {
    width: 92,
    borderRadius: 20,
    backgroundColor: "#F3F4F1",
    padding: 14,
    alignItems: "center",
  },
  metricValue: {
    color: "#0F2141",
    fontSize: 24,
    fontWeight: "900",
  },
  metricLabel: {
    color: "#697386",
    fontWeight: "700",
  },
  driverBox: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: "#F3F4F1",
    padding: 14,
    justifyContent: "center",
  },
  driverName: {
    color: "#0F2141",
    fontSize: 15,
    fontWeight: "900",
  },
  busText: {
    color: "#697386",
    marginTop: 4,
    fontWeight: "600",
  },
  updateText: {
    color: "#8A94A6",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 18,
    height: 52,
    backgroundColor: "#F3F4F1",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#0F2141",
    fontWeight: "900",
  },
  primaryButton: {
    flex: 1,
    borderRadius: 18,
    height: 52,
    backgroundColor: "#FFA70B",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#0F2141",
    fontWeight: "900",
  },
});