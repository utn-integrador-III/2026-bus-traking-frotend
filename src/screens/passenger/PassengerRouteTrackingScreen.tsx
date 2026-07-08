import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  getTripEtaMinutes,
  PassengerTripTrackingData,
  TripStatus,
  watchStop,
} from "../../services/apiClient";
import { supabase } from "../../lib/supabase";
import { BOARDING_RADIUS_METERS } from "../../config/constants";

const ETA_REFRESH_INTERVAL_MS = 20000;

interface PassengerRouteTrackingScreenProps {
  tripId: string;
  accessToken: string;
  onBack: () => void;
  onCheckout: () => void;
}

function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
}

interface LiveBusLocation {
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading?: number | null;
  status?: TripStatus;
  updatedAt: string;
}

interface StopPoint {
  coordinate: LatLng;
  index: number;
  label: string;
  isBoarding: boolean;
  isDestination: boolean;
}

function geoJsonToLatLng(route: PassengerTripTrackingData): LatLng[] {
  return route.geojson.geometry.coordinates.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));
}

function buildStopPoints(coords: LatLng[]): StopPoint[] {
  if (coords.length === 0) return [];
  const stops: StopPoint[] = [];
  stops.push({
    coordinate: coords[0],
    index: 0,
    label: "Abordaje",
    isBoarding: true,
    isDestination: false,
  });
  if (coords.length > 2) {
    const step = Math.max(1, Math.floor((coords.length - 2) / 4));
    for (let i = step; i < coords.length - 1; i += step) {
      if (stops.length >= 6) break;
      stops.push({
        coordinate: coords[i],
        index: i,
        label: `Parada ${stops.length}`,
        isBoarding: false,
        isDestination: false,
      });
    }
  }
  if (coords.length > 1) {
    stops.push({
      coordinate: coords[coords.length - 1],
      index: coords.length - 1,
      label: "Destino",
      isBoarding: false,
      isDestination: true,
    });
  }
  return stops;
}

function getInitialRegion(points: LatLng[]) {
  const first = points[0] || { latitude: 9.9281, longitude: -84.0907 };
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
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
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
  if (status === "Delayed") return "Delayed";
  if (status === "In Progress") return "In Progress";
  if (status === "Stopped") return "Stopped";
  if (status === "Scheduled" || status === "Pending") return "Scheduled";
  return String(status);
}

function isStopDownstream(stopIdx: number, busIdx: number): boolean {
  return stopIdx > busIdx;
}

function findClosestStopIndex(busPos: LatLng, stops: StopPoint[]): number {
  let minDist = Infinity;
  let closestIdx = -1;
  stops.forEach((s, i) => {
    const d = haversineMeters(busPos, s.coordinate);
    if (d < minDist) {
      minDist = d;
      closestIdx = i;
    }
  });
  return closestIdx;
}

export default function PassengerRouteTrackingScreen({
  tripId,
  accessToken,
  onBack,
  onCheckout,
}: PassengerRouteTrackingScreenProps) {
  const [tripData, setTripData] = useState<PassengerTripTrackingData | null>(null);
  const [liveLocation, setLiveLocation] = useState<LiveBusLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasBoarded, setHasBoarded] = useState(false);
  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number | null>(null);
  const [selectedStopIdx, setSelectedStopIdx] = useState<number>(0);
  const [watchedStopId, setWatchedStopId] = useState<string | null>(null);

  const animatedCoordinate = useRef(
    new AnimatedRegion({
      latitude: 9.9281,
      longitude: -84.0907,
      latitudeDelta: 0,
      longitudeDelta: 0,
    }),
  ).current;

  const wasInsideBoardingZone = useRef(false);
  const missedAlertShown = useRef(false);
  const hasBoardedRef = useRef(false);
  const lastEtaAt = useRef(0);
  const selectedStopIdxRef = useRef(0);
  const stopPointsRef = useRef<StopPoint[]>([]);

  const routePoints = useMemo(() => {
    return tripData ? geoJsonToLatLng(tripData) : [];
  }, [tripData]);

  const stopPoints = useMemo(() => buildStopPoints(routePoints), [routePoints]);

  const stopPointCoords = useMemo(
    () => stopPoints.map((sp) => sp.coordinate),
    [stopPoints],
  );

  const currentStop = stopPoints[selectedStopIdx] || stopPoints[0] || null;

  const previousStop =
    selectedStopIdx > 0 ? stopPoints[selectedStopIdx - 1] : null;

  useEffect(() => {
    stopPointsRef.current = stopPoints;
  }, [stopPoints]);

  useEffect(() => {
    selectedStopIdxRef.current = selectedStopIdx;
  }, [selectedStopIdx]);

  const currentStatus = liveLocation?.status || tripData?.status || "Scheduled";
  const statusLabel = buildStatusLabel(currentStatus);

  function redirectToScheduleSelection() {
    onBack();
  }

  function handleConfirmBoarding() {
    hasBoardedRef.current = true;
    setHasBoarded(true);
  }

  function handleCancelTracking() {
    Alert.alert(
      "Cancelar rastreo",
      "¿Querés dejar de seguir este bus y elegir otro horario?",
      [
        { text: "Seguir viendo", style: "cancel" },
        {
          text: "Elegir otro horario",
          style: "destructive",
          onPress: redirectToScheduleSelection,
        },
      ],
    );
  }

  async function handleSelectStop(stop: StopPoint) {
    setSelectedStopIdx(stop.index);
    selectedStopIdxRef.current = stop.index;
    wasInsideBoardingZone.current = false;
    missedAlertShown.current = false;
    try {
      const result = await watchStop(tripId, `stop-${stop.index}`, accessToken);
      setWatchedStopId(result.stop_id);
    } catch {
      setWatchedStopId(`stop-${stop.index}`);
    }
  }

  function triggerMissedBusAlert() {
    if (missedAlertShown.current) return;
    missedAlertShown.current = true;
    const stops = stopPointsRef.current;
    const selIdx = selectedStopIdxRef.current;
    const downstream = stops.filter((s) => s.index > selIdx && !s.isDestination);
    if (downstream.length > 0) {
      Alert.alert(
        "Bus perdido",
        `El bus ya pasó tu parada "${stops[selIdx]?.label || "seleccionada"}". ¿Querés elegir otra parada más adelante?`,
        [
          {
            text: "Elegir otra parada",
            onPress: () => {
              missedAlertShown.current = false;
              setSelectedStopIdx(downstream[0].index);
              selectedStopIdxRef.current = downstream[0].index;
              wasInsideBoardingZone.current = false;
            },
          },
          {
            text: "Ver otros horarios",
            style: "destructive",
            onPress: redirectToScheduleSelection,
          },
        ],
        { cancelable: false },
      );
    } else {
      Alert.alert(
        "Última parada superada",
        "El bus ya pasó todas las paradas. Te recomendamos buscar otro viaje.",
        [
          {
            text: "Ver otros horarios",
            onPress: redirectToScheduleSelection,
          },
        ],
        { cancelable: false },
      );
    }
  }

  function evaluateBoardingGeofence(busPoint: LatLng) {
    if (!currentStop || hasBoardedRef.current) return;
    const distance = haversineMeters(busPoint, currentStop.coordinate);
    const isInside = distance <= BOARDING_RADIUS_METERS;
    if (isInside) {
      wasInsideBoardingZone.current = true;
      return;
    }
    if (wasInsideBoardingZone.current && !isInside) {
      const closestIdx = findClosestStopIndex(busPoint, stopPointsRef.current);
      if (closestIdx > selectedStopIdxRef.current) {
        wasInsideBoardingZone.current = false;
        triggerMissedBusAlert();
      }
    }
    if (!wasInsideBoardingZone.current) {
      const closestIdx = findClosestStopIndex(busPoint, stopPointsRef.current);
      if (
        closestIdx > selectedStopIdxRef.current &&
        selectedStopIdxRef.current > 0
      ) {
        triggerMissedBusAlert();
      }
    }
  }

  async function refreshEta(busPoint: LatLng) {
    const destination =
      stopPoints.length > 0 ? stopPoints[stopPoints.length - 1].coordinate : null;
    if (!destination) return;
    const now = Date.now();
    if (now - lastEtaAt.current < ETA_REFRESH_INTERVAL_MS) return;
    lastEtaAt.current = now;
    const minutes = await getTripEtaMinutes(busPoint, destination, accessToken);
    if (minutes !== null) setLiveEtaMinutes(minutes);
  }

  function moveBusMarker(nextLocation: LiveBusLocation) {
    setLiveLocation(nextLocation);
    const busPoint: LatLng = {
      latitude: nextLocation.latitude,
      longitude: nextLocation.longitude,
    };
    evaluateBoardingGeofence(busPoint);
    refreshEta(busPoint);
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
        const nextTripData = await getPassengerTripTrackingData(tripId, accessToken);
        if (!isMounted) return;
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
            error instanceof Error ? error.message : "No se pudo cargar el viaje.",
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadTrip();
    return () => {
      isMounted = false;
    };
  }, [accessToken, animatedCoordinate, tripId]);

  useEffect(() => {
    if (!tripId) return;
    const channel = supabase
      .channel(`trip:${tripId}:driver-location`)
      .on("broadcast", { event: "location" }, (payload) => {
        const nextLocation = normalizeRealtimePayload(payload);
        if (nextLocation) moveBusMarker(nextLocation);
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
          if (nextLocation) moveBusMarker(nextLocation);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  useEffect(() => {
    if (!selectedStopIdx) return;
    watchStop(tripId, `stop-${selectedStopIdx}`, accessToken).catch(() => {});
  }, []);

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
      <MapView style={styles.map} initialRegion={getInitialRegion(routePoints)}>
        <Polyline
          coordinates={routePoints}
          strokeWidth={5}
          strokeColor="#0F2141"
        />

        {stopPoints.map((sp, i) => (
          <Marker
            key={`stop-${sp.index}`}
            coordinate={stopPointCoords[i]}
            onPress={() => handleSelectStop(sp)}
          >
            <View
              style={[
                styles.stopMarker,
                selectedStopIdx === sp.index && styles.stopSelected,
                sp.isDestination && styles.destMarker,
              ]}
            >
              <Text
                style={[
                  styles.stopMarkerText,
                  selectedStopIdx === sp.index && styles.stopSelectedText,
                ]}
              >
                {sp.isBoarding
                  ? "Abordaje"
                  : sp.isDestination
                    ? "Destino"
                    : `P${sp.index}`}
              </Text>
            </View>
          </Marker>
        ))}

        <Marker.Animated coordinate={animatedCoordinate as any}>
          <View style={styles.busMarker}>
            <Text style={styles.busMarkerText}>{tripData.code}</Text>
          </View>
        </Marker.Animated>
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
            {liveEtaMinutes ?? tripData.estimatedArrivalMinutes ?? 4} min
          </Text>
        </Text>

        <View style={styles.stopInfoRow}>
          <Text style={styles.stopInfoLabel}>Parada seleccionada:</Text>
          <Text style={styles.stopInfoValue}>
            {currentStop?.label || "No seleccionada"}
          </Text>
        </View>

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

        {currentStop && !currentStop.isBoarding && !currentStop.isDestination && (
          <Pressable
            style={styles.resetStopBtn}
            onPress={() => handleSelectStop(stopPoints[0])}
          >
            <Text style={styles.resetStopBtnText}>
              Volver a parada de abordaje
            </Text>
          </Pressable>
        )}

        {hasBoarded ? (
          <Text style={styles.boardedNote}>Abordaje confirmado ✓</Text>
        ) : null}

        <View style={styles.actionsRow}>
          <Pressable style={styles.secondaryButton} onPress={handleCancelTracking}>
            <Text style={styles.secondaryButtonText}>Cancelar rastreo</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={onCheckout}>
            <Text style={styles.primaryButtonText}>Comprar boleto</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.confirmButton, hasBoarded && styles.disabledButton]}
          onPress={handleConfirmBoarding}
          disabled={hasBoarded}
        >
          <Text style={styles.primaryButtonText}>
            {hasBoarded ? "Abordaste" : "Confirmar abordaje"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F3F4F1" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F3F4F1",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: { color: "#0F2141", marginTop: 12, fontWeight: "700" },
  errorTitle: {
    color: "#0F2141",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  errorText: { color: "#697386", textAlign: "center", marginTop: 10, lineHeight: 22 },
  errorButton: {
    backgroundColor: "#FFA70B",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 20,
  },
  errorButtonText: { color: "#0F2141", fontWeight: "900" },
  map: { flex: 1 },
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
  backButtonText: { color: "#0F2141", fontSize: 24, fontWeight: "900" },
  topTextBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 18,
    padding: 12,
  },
  routeTitle: { color: "#0F2141", fontSize: 20, fontWeight: "900" },
  routeSubtitle: { color: "#697386", fontWeight: "700", marginTop: 2 },
  stopMarker: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: "#0F2141",
  },
  stopSelected: {
    backgroundColor: "#FFA70B",
    borderColor: "#FFA70B",
  },
  destMarker: { borderColor: "#087D3B" },
  stopMarkerText: { color: "#0F2141", fontWeight: "800", fontSize: 10 },
  stopSelectedText: { color: "#0F2141" },
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
  busMarkerText: { color: "#FFFFFF", fontWeight: "900" },
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
  routeCode: { color: "#0F2141", fontSize: 22, fontWeight: "900" },
  statusBadge: {
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontWeight: "900",
  },
  progressBadge: { color: "#087D3B", backgroundColor: "#E7F7EE" },
  delayedBadge: { color: "#A66100", backgroundColor: "#FFF2D9" },
  scheduledBadge: { color: "#0F2141", backgroundColor: "#EEF2FF" },
  mainText: {
    color: "#0F2141",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 18,
    lineHeight: 30,
  },
  highlightText: { color: "#FFA70B", fontSize: 30, fontWeight: "900" },
  stopInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  stopInfoLabel: { color: "#697386", fontSize: 14, fontWeight: "700" },
  stopInfoValue: {
    color: "#0F2141",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 6,
  },
  stopText: { color: "#697386", fontSize: 15, fontWeight: "700", marginTop: 6 },
  metricsRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  metricBox: {
    width: 92,
    borderRadius: 20,
    backgroundColor: "#F3F4F1",
    padding: 14,
    alignItems: "center",
  },
  metricValue: { color: "#0F2141", fontSize: 24, fontWeight: "900" },
  metricLabel: { color: "#697386", fontWeight: "700" },
  driverBox: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: "#F3F4F1",
    padding: 14,
    justifyContent: "center",
  },
  driverName: { color: "#0F2141", fontSize: 15, fontWeight: "900" },
  busText: { color: "#697386", marginTop: 4, fontWeight: "600" },
  updateText: {
    color: "#8A94A6",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
  },
  resetStopBtn: {
    marginTop: 10,
    paddingVertical: 6,
  },
  resetStopBtnText: {
    color: "#0F2141",
    fontWeight: "800",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  actionsRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  secondaryButton: {
    flex: 1,
    borderRadius: 18,
    height: 52,
    backgroundColor: "#F3F4F1",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { color: "#0F2141", fontWeight: "900" },
  primaryButton: {
    flex: 1,
    borderRadius: 18,
    height: 52,
    backgroundColor: "#FFA70B",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButton: {
    borderRadius: 18,
    height: 52,
    backgroundColor: "#FFA70B",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  primaryButtonText: { color: "#0F2141", fontWeight: "900" },
  disabledButton: { backgroundColor: "#E7F7EE" },
  boardedNote: { color: "#087D3B", fontWeight: "900", marginTop: 10 },
});
