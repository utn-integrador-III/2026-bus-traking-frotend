import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getPassengerTripTrackingData,
  PassengerTripTrackingData,
} from "../../services/apiClient";
import { checkoutTicket, Ticket } from "../../services/ticketService";

interface PassengerPaymentScreenProps {
  tripId: string;
  accessToken: string;
  isSeniorPassenger?: boolean;
  onBack: () => void;
  onPaymentSuccess: (ticket: Ticket) => void;
}

const ADULT_FARE = 600;
const SERVICE_FEE = 0;

export default function PassengerPaymentScreen({
  tripId,
  accessToken,
  isSeniorPassenger = false,
  onBack,
  onPaymentSuccess,
}: PassengerPaymentScreenProps) {
  const [tripData, setTripData] = useState<PassengerTripTrackingData | null>(null);
  const [isLoadingTrip, setIsLoadingTrip] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fare = isSeniorPassenger ? 0 : ADULT_FARE;
  const total = fare + SERVICE_FEE;

  async function loadTripData() {
    try {
      setIsLoadingTrip(true);
      setErrorMessage("");

      const nextTripData = await getPassengerTripTrackingData(
        tripId,
        accessToken,
      );

      setTripData(nextTripData);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la información del viaje.",
      );
    } finally {
      setIsLoadingTrip(false);
    }
  }

  async function handlePayment() {
    try {
      setIsProcessingPayment(true);
      setErrorMessage("");

      const ticket = await checkoutTicket(
        {
          trip_id: tripId,
        },
        accessToken,
      );

      onPaymentSuccess(ticket);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo generar el boleto.",
      );
    } finally {
      setIsProcessingPayment(false);
    }
  }

  useEffect(() => {
    loadTripData();
  }, [tripId, accessToken]);

  if (isLoadingTrip) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerCard}>
          <ActivityIndicator color="#FFA70B" size="large" />
          <Text style={styles.loadingTitle}>Cargando pago...</Text>
          <Text style={styles.loadingText}>
            Estamos preparando la información del boleto.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tripData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerCard}>
          <Text style={styles.errorTitle}>No se pudo abrir el pago</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>

          <Pressable style={styles.primaryButton} onPress={loadTripData}>
            <Text style={styles.primaryButtonText}>Intentar de nuevo</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={onBack}>
            <Text style={styles.secondaryButtonText}>Volver</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isProcessingPayment) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerCard}>
          <View style={styles.processingIcon}>
            <Text style={styles.processingIconText}>₡</Text>
          </View>

          <ActivityIndicator color="#FFA70B" size="large" />

          <Text style={styles.loadingTitle}>
            {isSeniorPassenger
              ? "Generando boleto gratuito"
              : "Procesando pago simulado"}
          </Text>

          <Text style={styles.loadingText}>
            Validando viaje, creando ticket y preparando tu código QR.
          </Text>

          <View style={styles.processingBox}>
            <Text style={styles.processingBoxText}>
              Esto puede tardar unos segundos...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>←</Text>
          </Pressable>

          <View>
            <Text style={styles.headerTitle}>Pago de boleto</Text>
            <Text style={styles.headerSubtitle}>Confirmá tu compra</Text>
          </View>
        </View>

        <View style={styles.routeCard}>
          <View style={styles.routeCodeBox}>
            <Text style={styles.routeCodeText}>{tripData.code}</Text>
          </View>

          <View style={styles.routeInfo}>
            <Text style={styles.routeName}>{tripData.name}</Text>
            <Text style={styles.routeDetail}>
              Hoy · {formatTime(tripData.departureTime)} · Parada Sabana
            </Text>
          </View>
        </View>

        {isSeniorPassenger ? (
          <View style={styles.seniorCard}>
            <Text style={styles.seniorTitle}>Exención adulto mayor aplicada</Text>
            <Text style={styles.seniorText}>
              Tu perfil está verificado como adulto mayor. El boleto se generará
              sin cobro.
            </Text>
          </View>
        ) : null}

        <View style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>Resumen</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              {isSeniorPassenger ? "Tarifa adulto mayor" : "Tarifa adulto"}
            </Text>
            <Text style={styles.rowValue}>₡{fare}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Cargo de servicio</Text>
            <Text style={styles.rowValue}>₡{SERVICE_FEE}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₡{total}</Text>
          </View>
        </View>

        <View style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>Método de pago</Text>

          <View style={styles.methodBox}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardIconText}>💳</Text>
            </View>

            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>
                {isSeniorPassenger
                  ? "Beneficio adulto mayor"
                  : "Tarjeta simulada"}
              </Text>
              <Text style={styles.methodSubtitle}>
                {isSeniorPassenger ? "Exención verificada" : "•••• 4242"}
              </Text>
            </View>
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable style={styles.payButton} onPress={handlePayment}>
          <Text style={styles.payButtonText}>
            {isSeniorPassenger
              ? "Generar boleto gratis"
              : `Pagar ₡${total} (simulado)`}
          </Text>
        </Pressable>

        <Text style={styles.footerNote}>
          Esta compra usa un flujo de pago simulado para pruebas académicas.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "7:00";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
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
    alignItems: "center",
    gap: 14,
    marginBottom: 22,
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
  headerTitle: {
    color: "#0F2141",
    fontSize: 26,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#697386",
    fontWeight: "700",
    marginTop: 2,
  },
  routeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4E7EB",
    marginBottom: 16,
  },
  routeCodeBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "#0F2141",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  routeCodeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    color: "#0F2141",
    fontSize: 18,
    fontWeight: "900",
  },
  routeDetail: {
    color: "#697386",
    fontWeight: "700",
    marginTop: 5,
  },
  seniorCard: {
    backgroundColor: "#E7F7EE",
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#B9E7C8",
  },
  seniorTitle: {
    color: "#087D3B",
    fontWeight: "900",
    fontSize: 16,
  },
  seniorText: {
    color: "#275A3A",
    marginTop: 6,
    lineHeight: 20,
    fontWeight: "600",
  },
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E4E7EB",
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#0F2141",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  rowLabel: {
    color: "#697386",
    fontWeight: "700",
  },
  rowValue: {
    color: "#0F2141",
    fontWeight: "900",
  },
  divider: {
    height: 1,
    backgroundColor: "#E4E7EB",
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    color: "#0F2141",
    fontWeight: "900",
    fontSize: 18,
  },
  totalValue: {
    color: "#FFA70B",
    fontWeight: "900",
    fontSize: 30,
  },
  methodBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F1",
    borderRadius: 18,
    padding: 14,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardIconText: {
    fontSize: 22,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    color: "#0F2141",
    fontWeight: "900",
    fontSize: 15,
  },
  methodSubtitle: {
    color: "#697386",
    fontWeight: "700",
    marginTop: 3,
  },
  payButton: {
    backgroundColor: "#FFA70B",
    borderRadius: 20,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  payButtonText: {
    color: "#0F2141",
    fontWeight: "900",
    fontSize: 16,
  },
  footerNote: {
    color: "#8A94A6",
    textAlign: "center",
    fontWeight: "700",
    marginTop: 16,
    lineHeight: 20,
  },
  centerCard: {
    flex: 1,
    margin: 22,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  processingIcon: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: "#FFF2D9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  processingIconText: {
    color: "#FFA70B",
    fontSize: 38,
    fontWeight: "900",
  },
  loadingTitle: {
    color: "#0F2141",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 18,
    textAlign: "center",
  },
  loadingText: {
    color: "#697386",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  processingBox: {
    backgroundColor: "#F3F4F1",
    borderRadius: 18,
    padding: 14,
    marginTop: 24,
  },
  processingBoxText: {
    color: "#0F2141",
    fontWeight: "800",
    textAlign: "center",
  },
  errorTitle: {
    color: "#0F2141",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  errorText: {
    color: "#697386",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
    marginBottom: 22,
  },
  errorBox: {
    backgroundColor: "#FDECEC",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  errorBoxText: {
    color: "#A21D1D",
    fontWeight: "700",
    lineHeight: 20,
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
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
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