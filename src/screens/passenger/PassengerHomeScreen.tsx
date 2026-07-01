import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  AuthUser,
  getPassengerHomeTrips,
  PassengerTripCard,
} from "../../services/apiClient";

interface PassengerHomeScreenProps {
  user: AuthUser;
  accessToken: string;
  onLogout: () => void;
  onTrackTrip: (tripId: string) => void;
}

export default function PassengerHomeScreen({
  user,
  accessToken,
  onLogout,
  onTrackTrip,
}: PassengerHomeScreenProps) {
  const [trips, setTrips] = useState<PassengerTripCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadTrips() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const nextTrips = await getPassengerHomeTrips(accessToken);

      setTrips(nextTrips);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los viajes.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTrips();
  }, [accessToken]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.routeCode}>BusTrack</Text>
            <Text style={styles.greeting}>¿A dónde vas hoy?</Text>
            <Text style={styles.userText}>{user.name || user.email}</Text>
          </View>

          <Pressable style={styles.logoutButton} onPress={onLogout}>
            <Text style={styles.logoutText}>Salir</Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchText}>Buscar ruta o destino</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Viajes disponibles</Text>

          <Pressable onPress={loadTrips}>
            <Text style={styles.viewAllText}>Actualizar</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator color="#FFA70B" size="large" />
            <Text style={styles.loadingText}>Cargando viajes...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No se pudieron cargar los viajes</Text>
            <Text style={styles.emptyText}>{errorMessage}</Text>

            <Pressable style={styles.retryButton} onPress={loadTrips}>
              <Text style={styles.retryButtonText}>Intentar de nuevo</Text>
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
                style={styles.card}
                onPress={() => onTrackTrip(item.tripId)}
              >
                <View style={styles.busBadge}>
                  <Text style={styles.busBadgeText}>{item.code}</Text>
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.routeName}>{item.name}</Text>
                  <Text style={styles.routeDescription}>
                    {item.origin} → {item.destination}
                  </Text>
                  <Text style={styles.tripIdText}>
                    Trip {item.tripId.slice(0, 8)}
                  </Text>
                </View>

                <View style={styles.cardRight}>
                  <Text
                    style={[
                      styles.statusBadge,
                      item.status === "Delayed"
                        ? styles.delayedBadge
                        : item.status === "In Progress"
                          ? styles.progressBadge
                          : styles.scheduledBadge,
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
          <Text style={styles.tab}>Boletos</Text>
          <Text style={styles.tab}>Perfil</Text>
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
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  routeCode: {
    color: "#0F2141",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 18,
  },
  greeting: {
    color: "#0F2141",
    fontSize: 28,
    fontWeight: "800",
  },
  userText: {
    color: "#697386",
    fontSize: 14,
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logoutText: {
    color: "#0F2141",
    fontWeight: "800",
  },
  searchBox: {
    height: 52,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E4E7EB",
  },
  searchText: {
    color: "#8A94A6",
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#0F2141",
    fontSize: 20,
    fontWeight: "800",
  },
  viewAllText: {
    color: "#0F2141",
    fontWeight: "700",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 100,
  },
  loadingText: {
    color: "#697386",
    marginTop: 12,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E4E7EB",
  },
  emptyTitle: {
    color: "#0F2141",
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    color: "#697386",
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#FFA70B",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#0F2141",
    fontWeight: "900",
  },
  listContent: {
    paddingBottom: 110,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4E7EB",
  },
  busBadge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#0F2141",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  busBadgeText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  cardContent: {
    flex: 1,
  },
  routeName: {
    color: "#0F2141",
    fontSize: 16,
    fontWeight: "800",
  },
  routeDescription: {
    color: "#697386",
    fontSize: 13,
    marginTop: 4,
  },
  tripIdText: {
    color: "#8A94A6",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "700",
  },
  cardRight: {
    alignItems: "flex-end",
  },
  statusBadge: {
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
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
  etaText: {
    color: "#0F2141",
    fontWeight: "800",
  },
  bottomTabs: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 18,
    height: 68,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4E7EB",
  },
  activeTab: {
    color: "#0F2141",
    fontWeight: "900",
  },
  tab: {
    color: "#8A94A6",
    fontWeight: "700",
  },
});