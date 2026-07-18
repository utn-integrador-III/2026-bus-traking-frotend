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
import { getMyTickets, Ticket } from "../../services/ticketService";

interface PassengerMyTicketsScreenProps {
  accessToken: string;
  onBack: () => void;
  onOpenTicket: (ticket: Ticket) => void;
}

export default function PassengerMyTicketsScreen({
  accessToken,
  onBack,
  onOpenTicket,
}: PassengerMyTicketsScreenProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadTickets() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const nextTickets = await getMyTickets(accessToken);

      setTickets(nextTickets);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar tus boletos.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, [accessToken]);

  function renderContent() {
    if (isLoading) {
      return (
        <View style={styles.centerCard}>
          <ActivityIndicator color="#FFA70B" size="large" />
          <Text style={styles.loadingText}>Cargando boletos...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.centerCard}>
          <Text style={styles.errorTitle}>No se pudieron cargar</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>

          <Pressable style={styles.primaryButton} onPress={loadTickets}>
            <Text style={styles.primaryButtonText}>Intentar de nuevo</Text>
          </Pressable>
        </View>
      );
    }

    if (tickets.length === 0) {
      return (
        <View style={styles.centerCard}>
          <Text style={styles.emptyIcon}>🎫</Text>
          <Text style={styles.emptyTitle}>Aún no tenés boletos</Text>
          <Text style={styles.emptyText}>
            Cuando comprés un boleto, aparecerá en esta sección.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <Pressable
            style={styles.ticketCard}
            onPress={() => onOpenTicket(item)}
          >
            <View style={styles.ticketLeft}>
              <View style={styles.ticketIconBox}>
                <Text style={styles.ticketIcon}>QR</Text>
              </View>

              <View style={styles.ticketInfo}>
                <Text style={styles.ticketTitle}>
                  Boleto #{tickets.length - index}
                </Text>

                <Text style={styles.ticketSubtitle}>
                  Viaje {item.trip_id.slice(0, 8).toUpperCase()}
                </Text>

                <Text style={styles.ticketDate}>
                  {new Date(
                    item.generated_at || item.created_at,
                  ).toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={styles.ticketRight}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {item.status === "Generated" ? "Activo" : item.status}
                </Text>
              </View>

              <Text style={styles.openText}>Ver QR</Text>
            </View>
          </Pressable>
        )}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mis boletos</Text>
          <Text style={styles.headerSubtitle}>
            Boletos comprados para tus viajes
          </Text>
        </View>

        {renderContent()}

        <View style={styles.bottomTabs}>
          <Pressable onPress={onBack}>
            <Text style={styles.tab}>Inicio</Text>
          </Pressable>

          <Text style={styles.tab}>Rutas</Text>
          <Text style={styles.activeTab}>Boletos</Text>
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
    marginBottom: 22,
  },
  headerTitle: {
    color: "#0F2141",
    fontSize: 34,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#697386",
    fontWeight: "700",
    marginTop: 4,
    fontSize: 15,
  },
  centerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E4E7EB",
  },
  loadingText: {
    color: "#697386",
    fontWeight: "800",
    marginTop: 14,
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
    marginTop: 8,
    lineHeight: 20,
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: 10,
  },
  emptyTitle: {
    color: "#0F2141",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: "#697386",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 110,
  },
  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E4E7EB",
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ticketLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  ticketIconBox: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#0F2141",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  ticketIcon: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  ticketInfo: {
    flex: 1,
  },
  ticketTitle: {
    color: "#0F2141",
    fontSize: 17,
    fontWeight: "900",
  },
  ticketSubtitle: {
    color: "#697386",
    fontWeight: "700",
    marginTop: 4,
  },
  ticketDate: {
    color: "#8A94A6",
    fontWeight: "600",
    marginTop: 4,
    fontSize: 12,
  },
  ticketRight: {
    alignItems: "flex-end",
    marginLeft: 10,
  },
  statusBadge: {
    backgroundColor: "#E7F7EE",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  statusText: {
    color: "#087D3B",
    fontWeight: "900",
    fontSize: 12,
  },
  openText: {
    color: "#FFA70B",
    fontWeight: "900",
  },
  primaryButton: {
    backgroundColor: "#FFA70B",
    borderRadius: 18,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    marginTop: 18,
  },
  primaryButtonText: {
    color: "#0F2141",
    fontWeight: "900",
    fontSize: 16,
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