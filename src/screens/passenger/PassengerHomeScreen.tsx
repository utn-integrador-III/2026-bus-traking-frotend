import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { AnimatedRegion, LatLng, Marker, Polyline } from "react-native-maps";
import * as Notifications from "expo-notifications";
import {
  AuthUser,
  getPassengerHomeTripsPreview,
  PassHomeTripsPreview,
  watchStop,
} from "../../services/apiClient";
import { supabase } from "../../lib/supabase";
import {
  BOARDING_RADIUS_METERS,
  GEOFENCE_RADIUS_METERS,
} from "../../config/constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_HEIGHT = SCREEN_WIDTH * 0.7;

interface LiveBusPosition {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number | null;
  recorded_at: string;
}

interface StopMarker {
  latitude: number;
  longitude: number;
  label: string;
  index: number;
  isBoarding: boolean;
  isDestination: boolean;
}

interface PassengerHomeScreenProps {
  user: AuthUser;
  accessToken: string;
  onLogout: () => void;
  onTrackTrip: (tripId: string) => void;
  onOpenTickets: () => void;
  trackingTripId?: string | null;
  onClearTracking?: () => void;
}

function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const earth = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

function normalizeRealtimePayload(payload: any): LiveBusPosition | null {
  const row = payload?.payload || payload?.new || payload;
  const lat = Number(row?.latitude ?? row?.lat);
  const lng = Number(row?.longitude ?? row?.lng ?? row?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    latitude: lat,
    longitude: lng,
    speed: Number(row?.speed ?? 0),
    heading: row?.heading ?? null,
    recorded_at: String(row?.recorded_at ?? new Date().toISOString()),
  };
}

function parseGeoJsonCoords(geojson: string | null): LatLng[] {
  if (!geojson) return [];
  try {
    const obj = typeof geojson === "string" ? JSON.parse(geojson) : geojson;
    const coords =
      obj?.geometry?.coordinates || obj?.coordinates || [];
    return (coords as [number, number][]).map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }));
  } catch {
    return [];
  }
}

function buildStopMarkers(coords: LatLng[]): StopMarker[] {
  if (coords.length === 0) return [];
  const markers: StopMarker[] = [];
  markers.push({
    ...coords[0],
    label: "Abordaje",
    index: 0,
    isBoarding: true,
    isDestination: false,
  });
  if (coords.length > 2) {
    const step = Math.max(1, Math.floor((coords.length - 2) / 4));
    for (let i = step; i < coords.length - 1; i += step) {
      if (markers.length >= 6) break;
      markers.push({
        ...coords[i],
        label: `Parada ${markers.length}`,
        index: i,
        isBoarding: false,
        isDestination: false,
      });
    }
  }
  if (coords.length > 1) {
    markers.push({
      ...coords[coords.length - 1],
      label: "Destino",
      index: coords.length - 1,
      isBoarding: false,
      isDestination: true,
    });
  }
  return markers;
}

export default function PassengerHomeScreen({
  user,
  accessToken,
  onLogout,
  onTrackTrip,
  onOpenTickets,
  trackingTripId,
  onClearTracking,
}: PassengerHomeScreenProps) {
  const [trips, setTrips] = useState<PassHomeTripsPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [liveLocation, setLiveLocation] = useState<LiveBusPosition | null>(null);
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(null);
  const [watchedStopId, setWatchedStopId] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);
  const wasNearBoarding = useRef(false);
  const missedAlertShown = useRef(false);
  const realtimeChannel = useRef<any>(null);
  const boardingNodeRef = useRef<LatLng | null>(null);
  const selectedStopIndexRef = useRef<number | null>(null);

  const animatedCoord = useRef(
    new AnimatedRegion({
      latitude: 9.9281,
      longitude: -84.0907,
      latitudeDelta: 0,
      longitudeDelta: 0,
    }),
  ).current;

  const selectedTrip = useMemo(
    () => trips.find((t) => t.tripId === selectedTripId) || null,
    [trips, selectedTripId],
  );

  const routeCoords = useMemo(
    () => parseGeoJsonCoords(selectedTrip?.geojson || null),
    [selectedTrip?.geojson],
  );

  const stopMarkers = useMemo(
    () => buildStopMarkers(routeCoords),
    [routeCoords],
  );

  const stopMarkerCoords = useMemo(
    () => stopMarkers.map((m) => ({ latitude: m.latitude, longitude: m.longitude })),
    [stopMarkers],
  );

  const boardingNode: LatLng | null =
    routeCoords.length > 0 ? routeCoords[0] : null;

  const mapRegion = useMemo(() => {
    if (routeCoords.length === 0) {
      return { latitude: 9.9281, longitude: -84.0907, latitudeDelta: 0.1, longitudeDelta: 0.1 };
    }
    const lats = routeCoords.map((c) => c.latitude);
    const lngs = routeCoords.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.5 || 0.05,
      longitudeDelta: (maxLng - minLng) * 1.5 || 0.05,
    };
  }, [routeCoords]);

  async function loadTrips() {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const nextTrips = await getPassengerHomeTripsPreview(accessToken);
      setTrips(nextTrips);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudieron cargar los viajes.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function selectTrip(tripId: string) {
    setSelectedTripId(tripId);
    setLiveLocation(null);
    setSelectedStopIndex(null);
    setWatchedStopId(null);
    wasNearBoarding.current = false;
    missedAlertShown.current = false;
  }

  async function handleSelectStop(marker: StopMarker) {
    setSelectedStopIndex(marker.index);
    if (!selectedTripId) return;
    try {
      const result = await watchStop(selectedTripId, `stop-${marker.index}`, accessToken);
      setWatchedStopId(result.stop_id);
    } catch {
      setWatchedStopId(`stop-${marker.index}`);
    }
  }

  function handleMissedBus() {
    if (missedAlertShown.current) return;
    missedAlertShown.current = true;
    Alert.alert(
      "Bus perdido",
      "El bus ya pasó tu parada seleccionada. ¿Querés elegir otra parada más adelante o cambiar de viaje?",
      [
        {
          text: "Elegir otra parada",
          onPress: () => {
            missedAlertShown.current = false;
            setSelectedStopIndex(null);
            setWatchedStopId(null);
          },
        },
        {
          text: "Ver otros viajes",
          style: "destructive",
          onPress: () => {
            setSelectedTripId(null);
            setLiveLocation(null);
            setSelectedStopIndex(null);
            setWatchedStopId(null);
            wasNearBoarding.current = false;
            missedAlertShown.current = false;
          },
        },
      ],
      { cancelable: false },
    );
  }

  function evaluateBoardingPass(busPos: LatLng) {
    const boarding = boardingNodeRef.current;
    if (!boarding || selectedStopIndexRef.current !== null) return;
    const dist = haversineMeters(busPos, boarding);
    if (dist <= BOARDING_RADIUS_METERS) {
      wasNearBoarding.current = true;
      return;
    }
    if (wasNearBoarding.current && dist > BOARDING_RADIUS_METERS) {
      wasNearBoarding.current = false;
      handleMissedBus();
    }
  }

  function moveBusMarker(pos: LiveBusPosition) {
    setLiveLocation(pos);
    const busPt: LatLng = { latitude: pos.latitude, longitude: pos.longitude };
    evaluateBoardingPass(busPt);
    animatedCoord
      .timing({
        latitude: pos.latitude,
        longitude: pos.longitude,
        duration: 900,
        useNativeDriver: false,
      } as any)
      .start();
  }

  useEffect(() => {
    boardingNodeRef.current = boardingNode;
  }, [boardingNode]);

  useEffect(() => {
    selectedStopIndexRef.current = selectedStopIndex;
  }, [selectedStopIndex]);

  useEffect(() => {
    if (mapRef.current && routeCoords.length > 0) {
      mapRef.current.animateToRegion(mapRegion, 500);
    }
  }, [selectedTripId, mapRegion]);

  useEffect(() => {
    if (trackingTripId) {
      setSelectedTripId(trackingTripId);
    }
  }, [trackingTripId]);

  useEffect(() => {
    loadTrips();
  }, [accessToken]);

  useEffect(() => {
    if (!selectedTripId) {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
        realtimeChannel.current = null;
      }
      return;
    }
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current);
      realtimeChannel.current = null;
    }
    const channel = supabase
      .channel(`home:trip:${selectedTripId}:driver-location`)
      .on("broadcast", { event: "location" }, (payload: any) => {
        const pos = normalizeRealtimePayload(payload);
        if (pos) moveBusMarker(pos);
      })
      .subscribe();
    realtimeChannel.current = channel;
    return () => {
      supabase.removeChannel(channel);
      realtimeChannel.current = null;
    };
  }, [selectedTripId]);

  useEffect(() => {
    if (!accessToken || !user.id) return;
    const alertChannel = supabase
      .channel(`home:passenger:${user.id}:alerts`)
      .on("broadcast", { event: "bus_approaching" }, (payload: any) => {
        const data = payload?.payload || payload;
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Bus acercandose",
            body: `El bus esta a menos de ${GEOFENCE_RADIUS_METERS}m de tu parada. Preparate para abordar.`,
            data: { trip_id: data?.trip_id || selectedTripId, type: "geofence_alert" },
            sound: true,
          },
          trigger: null,
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(alertChannel);
    };
  }, [accessToken, user.id]);

  function getStatusStyle(status: string) {
    if (status === "Delayed") return styles.delayedBadge;
    if (status === "In_Progress") return styles.progressBadge;
    return styles.scheduledBadge;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>BusTrack</Text>
            <Text style={styles.greeting}>
              {selectedTrip ? selectedTrip.name : "¿A dónde vas hoy?"}
            </Text>
            <Text style={styles.userText}>{user.name || user.email}</Text>
          </View>
          <Pressable style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutText}>Salir</Text>
          </Pressable>
        </View>

        {!selectedTrip ? (
          <View style={styles.searchBox}>
            <Text style={styles.searchText}>Seleccioná un viaje para ver el mapa</Text>
          </View>
        ) : null}

        <View style={styles.mapContainer}>
          {selectedTrip && routeCoords.length > 0 ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={mapRegion}
            >
              <Polyline
                coordinates={routeCoords}
                strokeWidth={5}
                strokeColor="#0F2141"
              />

              {stopMarkers.map((m, i) => (
                <Marker
                  key={`stop-${m.index}`}
                  coordinate={stopMarkerCoords[i]}
                  onPress={() => handleSelectStop(m)}
                >
                  <View
                    style={[
                      styles.stopMarker,
                      selectedStopIndex === m.index && styles.stopMarkerSelected,
                      m.isDestination && styles.destMarker,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stopMarkerText,
                        selectedStopIndex === m.index && styles.stopMarkerTextSelected,
                      ]}
                    >
                      {m.isBoarding ? "Abordaje" : m.isDestination ? "Destino" : `P${m.index}`}
                    </Text>
                  </View>
                </Marker>
              ))}

              {liveLocation ? (
                <Marker.Animated coordinate={animatedCoord as any}>
                  <View style={styles.busMarkerLive}>
                    <Text style={styles.busMarkerLiveText}>{selectedTrip.code}</Text>
                  </View>
                </Marker.Animated>
              ) : null}
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderIcon}>📍</Text>
              <Text style={styles.mapPlaceholderText}>
                Seleccioná un viaje para ver la ruta en vivo
              </Text>
            </View>
          )}
        </View>

        {selectedTrip && (
          <View style={styles.selectedBar}>
            <View style={styles.selectedInfo}>
              <View style={styles.selectedCodeRow}>
                <Text style={styles.selectedCode}>{selectedTrip.code}</Text>
                {trackingTripId === selectedTrip.tripId && (
                  <View style={styles.trackingBadge}>
                    <Text style={styles.trackingBadgeText}>Siguiendo</Text>
                  </View>
                )}
              </View>
              <Text style={styles.selectedRoute}>
                {selectedTrip.origin} → {selectedTrip.destination}
              </Text>
            </View>
            <Text
              style={[
                styles.selectedStatus,
                getStatusStyle(String(selectedTrip.status)),
              ]}
            >
              {selectedTrip.badgeText}
            </Text>
            {trackingTripId === selectedTrip.tripId ? (
              onClearTracking && (
                <Pressable
                  style={styles.untrackBtn}
                  onPress={() => {
                    onClearTracking();
                    setSelectedTripId(null);
                    setLiveLocation(null);
                    setSelectedStopIndex(null);
                    setWatchedStopId(null);
                    wasNearBoarding.current = false;
                    missedAlertShown.current = false;
                  }}
                >
                  <Text style={styles.untrackBtnText}>Dejar de seguir</Text>
                </Pressable>
              )
            ) : (
              <Pressable
                style={styles.trackBtn}
                onPress={() => onTrackTrip(selectedTrip.tripId)}
              >
                <Text style={styles.trackBtnText}>Ver tracking</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Viajes disponibles</Text>
          <Pressable onPress={loadTrips}>
            <Text style={styles.refreshText}>Actualizar</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator color="#FFA70B" size="large" />
            <Text style={styles.loadingText}>Cargando viajes...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Error al cargar</Text>
            <Text style={styles.emptyText}>{errorMessage}</Text>
            <Pressable style={styles.retryBtn} onPress={loadTrips}>
              <Text style={styles.retryBtnText}>Intentar de nuevo</Text>
            </Pressable>
          </View>
        ) : trips.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No hay viajes visibles</Text>
            <Text style={styles.emptyText}>
              Cuando existan viajes programados o en progreso, aparecerán aquí.
            </Text>
          </View>
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item) => item.tripId}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.card,
                  selectedTripId === item.tripId && styles.cardSelected,
                ]}
                onPress={() => selectTrip(item.tripId)}
              >
                <View
                  style={[
                    styles.busBadge,
                    selectedTripId === item.tripId && styles.busBadgeActive,
                  ]}
                >
                  <Text style={styles.busBadgeText}>{item.code}</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.routeName}>{item.name}</Text>
                  <Text style={styles.routeDesc}>
                    {item.origin} → {item.destination}
                  </Text>
                  <Text style={styles.tripIdText}>
                    Trip {item.tripId.slice(0, 8)}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  {trackingTripId === item.tripId && (
                    <View style={styles.cardTrackingBadge}>
                      <Text style={styles.cardTrackingText}>Siguiendo</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.statusBadge,
                      getStatusStyle(String(item.status)),
                    ]}
                  >
                    {item.badgeText}
                  </Text>
                  <Text style={styles.etaText}>{item.etaText}</Text>
                </View>
              </Pressable>
            )}
          />
        )}

        <View style={styles.bottomTabs}>
          <Text style={styles.activeTab}>Inicio</Text>
          <Text style={styles.tab}>Rutas</Text>
          <Pressable onPress={onOpenTickets}>
            <Text style={styles.tab}>Boletos</Text>
          </Pressable>
          <Text style={styles.tab}>Perfil</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F3F4F1" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  brand: { color: "#0F2141", fontSize: 16, fontWeight: "800", marginBottom: 6 },
  greeting: { color: "#0F2141", fontSize: 22, fontWeight: "800" },
  userText: { color: "#697386", fontSize: 12, marginTop: 2 },
  logoutBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: { color: "#0F2141", fontWeight: "800", fontSize: 13 },
  searchBox: {
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E4E7EB",
  },
  searchText: { color: "#8A94A6", fontSize: 14 },
  mapContainer: {
    height: MAP_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E4E7EB",
  },
  map: { flex: 1 },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  mapPlaceholderIcon: { fontSize: 40, marginBottom: 8 },
  mapPlaceholderText: {
    color: "#0F2141",
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  stopMarker: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: "#0F2141",
  },
  stopMarkerSelected: {
    backgroundColor: "#FFA70B",
    borderColor: "#FFA70B",
  },
  destMarker: {
    borderColor: "#087D3B",
  },
  stopMarkerText: {
    color: "#0F2141",
    fontWeight: "800",
    fontSize: 10,
  },
  stopMarkerTextSelected: {
    color: "#0F2141",
  },
  busMarker: {
    minWidth: 44,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0F2141",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  busMarkerText: { color: "#FFFFFF", fontWeight: "900", fontSize: 11 },
  busMarkerLive: {
    minWidth: 44,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFA70B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  busMarkerLiveText: { color: "#0F2141", fontWeight: "900", fontSize: 11 },
  selectedBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E4E7EB",
  },
  selectedInfo: { flex: 1 },
  selectedCodeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  selectedCode: { color: "#0F2141", fontSize: 16, fontWeight: "900" },
  selectedRoute: { color: "#697386", fontSize: 12, marginTop: 2 },
  trackingBadge: {
    backgroundColor: "#E7F7EE",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  trackingBadgeText: { color: "#087D3B", fontWeight: "800", fontSize: 10 },
  selectedStatus: {
    overflow: "hidden",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "800",
    marginRight: 10,
  },
  trackBtn: {
    backgroundColor: "#FFA70B",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  trackBtnText: { color: "#0F2141", fontWeight: "900", fontSize: 12 },
  untrackBtn: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  untrackBtnText: { color: "#DC2626", fontWeight: "900", fontSize: 12 },
  cardTrackingBadge: {
    backgroundColor: "#E7F7EE",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  cardTrackingText: { color: "#087D3B", fontWeight: "800", fontSize: 9 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  listTitle: { color: "#0F2141", fontSize: 18, fontWeight: "800" },
  refreshText: { color: "#0F2141", fontWeight: "700", fontSize: 13 },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  loadingText: { color: "#697386", marginTop: 8, fontWeight: "700" },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E4E7EB",
  },
  emptyTitle: { color: "#0F2141", fontSize: 16, fontWeight: "900" },
  emptyText: { color: "#697386", marginTop: 6, lineHeight: 20, fontSize: 14 },
  retryBtn: {
    marginTop: 12,
    backgroundColor: "#FFA70B",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  retryBtnText: { color: "#0F2141", fontWeight: "900" },
  listContent: { paddingBottom: 90 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4E7EB",
  },
  cardSelected: {
    borderColor: "#FFA70B",
    borderWidth: 2,
    backgroundColor: "#FFF9EE",
  },
  busBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#0F2141",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  busBadgeActive: {
    backgroundColor: "#FFA70B",
  },
  busBadgeText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },
  cardContent: { flex: 1 },
  routeName: { color: "#0F2141", fontSize: 14, fontWeight: "800" },
  routeDesc: { color: "#697386", fontSize: 12, marginTop: 3 },
  tripIdText: {
    color: "#8A94A6",
    fontSize: 10,
    marginTop: 3,
    fontWeight: "700",
  },
  cardRight: { alignItems: "flex-end" },
  statusBadge: {
    overflow: "hidden",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 6,
  },
  progressBadge: { color: "#087D3B", backgroundColor: "#E7F7EE" },
  delayedBadge: { color: "#A66100", backgroundColor: "#FFF2D9" },
  scheduledBadge: { color: "#0F2141", backgroundColor: "#EEF2FF" },
  etaText: { color: "#0F2141", fontWeight: "800", fontSize: 12 },
  bottomTabs: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    height: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4E7EB",
  },
  activeTab: { color: "#0F2141", fontWeight: "900", fontSize: 13 },
  tab: { color: "#8A94A6", fontWeight: "700", fontSize: 13 },
});
