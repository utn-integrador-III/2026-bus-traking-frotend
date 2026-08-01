import React from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Ticket } from "../../services/ticketService";

interface PassengerBoardingPassScreenProps {
  ticket: Ticket;
  onBackHome: () => void;
  onBackToTrip: () => void;
}

export default function PassengerBoardingPassScreen({
  ticket,
  onBackHome,
  onBackToTrip,
}: PassengerBoardingPassScreenProps) {
  async function handleShareTicket() {
    try {
      await Share.share({
        message: ticket.qr_payload,
        title: "Mi boleto BusTrack",
      });
    } catch {
      Alert.alert("Compartir", "No se pudo compartir el boleto.");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Mi boleto</Text>
            <Text style={styles.headerSubtitle}>Pase activo para abordar</Text>
          </View>

          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Activo</Text>
          </View>
        </View>

        <View style={styles.ticketCard}>
          <View style={styles.ticketTop}>
            <View>
              <Text style={styles.brandText}>BusTrack</Text>
              <Text style={styles.ticketTitle}>Boarding Pass</Text>
            </View>

            <View style={styles.statusBox}>
              <Text style={styles.statusText}>{ticket.status}</Text>
            </View>
          </View>

          <View style={styles.qrFrame}>
            <QRCode
              value={ticket.qr_payload}
              size={235}
              backgroundColor="#FFFFFF"
              color="#000000"
            />
          </View>

          <Text style={styles.qrInstruction}>
            Mostrá este código al conductor o al validador.
          </Text>

          <View style={styles.cutLine}>
            <View style={styles.dot} />
            <View style={styles.dashedLine} />
            <View style={styles.dot} />
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Boleto</Text>
              <Text style={styles.infoValue}>{ticket.id.slice(0, 8)}</Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Viaje</Text>
              <Text style={styles.infoValue}>{ticket.trip_id.slice(0, 8)}</Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Pago</Text>
              <Text style={styles.infoValue}>
                {ticket.payment_type || "Mock"}
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Estado</Text>
              <Text style={styles.infoValue}>{ticket.status}</Text>
            </View>
          </View>

          <View style={styles.fullRow}>
            <Text style={styles.fullRowLabel}>Generado</Text>
            <Text style={styles.fullRowValue}>
              {new Date(
                ticket.generated_at || ticket.created_at,
              ).toLocaleString()}
            </Text>
          </View>

          <View style={styles.securityBox}>
            <Text style={styles.securityTitle}>QR de alto contraste</Text>
            <Text style={styles.securityText}>
              El código contiene un payload seguro generado por el backend.
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            onPress={handleShareTicket}
            style={styles.secondarySmallButton}
          >
            <Text style={styles.secondarySmallText}>Compartir</Text>
          </Pressable>
        </View>

        <Pressable style={styles.primaryButton} onPress={onBackHome}>
          <Text style={styles.primaryButtonText}>Volver al inicio</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={onBackToTrip}>
          <Text style={styles.secondaryButtonText}>Volver al viaje</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F1",
  },
  scrollContent: {
    padding: 22,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  headerTitle: {
    color: "#0F2141",
    fontSize: 30,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#697386",
    fontWeight: "700",
    marginTop: 4,
  },
  activeBadge: {
    backgroundColor: "#E7F7EE",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  activeBadgeText: {
    color: "#087D3B",
    fontWeight: "900",
  },
  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E4E7EB",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  ticketTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  brandText: {
    color: "#FFA70B",
    fontSize: 17,
    fontWeight: "900",
  },
  ticketTitle: {
    color: "#0F2141",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4,
  },
  statusBox: {
    backgroundColor: "#E7F7EE",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
    color: "#087D3B",
    fontWeight: "900",
  },
  qrFrame: {
    backgroundColor: "#FFFFFF",
    borderWidth: 5,
    borderColor: "#000000",
    borderRadius: 24,
    padding: 18,
    alignItems: "center",
    alignSelf: "center",
  },
  qrInstruction: {
    color: "#0F2141",
    fontWeight: "800",
    textAlign: "center",
    marginTop: 18,
    fontSize: 15,
    lineHeight: 21,
  },
  cutLine: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F3F4F1",
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#D3D8E0",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoBox: {
    width: "47%",
    backgroundColor: "#F3F4F1",
    borderRadius: 18,
    padding: 14,
  },
  infoLabel: {
    color: "#697386",
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 5,
  },
  infoValue: {
    color: "#0F2141",
    fontWeight: "900",
    fontSize: 15,
  },
  fullRow: {
    backgroundColor: "#F3F4F1",
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
  },
  fullRowLabel: {
    color: "#697386",
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 5,
  },
  fullRowValue: {
    color: "#0F2141",
    fontWeight: "900",
  },
  securityBox: {
    backgroundColor: "#FFF2D9",
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
  },
  securityTitle: {
    color: "#0F2141",
    fontWeight: "900",
    marginBottom: 4,
  },
  securityText: {
    color: "#67512B",
    fontWeight: "600",
    lineHeight: 19,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  secondarySmallButton: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  secondarySmallText: {
    color: "#0F2141",
    fontWeight: "900",
  },
  primaryButton: {
    backgroundColor: "#FFA70B",
    borderRadius: 18,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  primaryButtonText: {
    color: "#0F2141",
    fontWeight: "900",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E4E7EB",
  },
  secondaryButtonText: {
    color: "#0F2141",
    fontWeight: "900",
    fontSize: 16,
  },
});