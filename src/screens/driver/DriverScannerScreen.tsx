import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { scanTicket } from "../../services/ticketService";
import { Feather } from "@expo/vector-icons";

interface DriverScannerScreenProps {
  accessToken: string;
  onBack: () => void;
}

function decodeBase64Url(base64Url: string) {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad) {
    base64 += new Array(5 - pad).join("=");
  }
  return JSON.parse(atob(base64));
}

export default function DriverScannerScreen({
  accessToken,
  onBack,
}: DriverScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = React.useRef(false);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(
    null
  );
  const [feedbackMessage, setFeedbackMessage] = useState("");

  if (!permission) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFA70B" />
        <Text style={styles.loadingText}>Solicitando permisos de cámara...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>
          Necesitamos acceso a la cámara para escanear boletos.
        </Text>
        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Dar permiso</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryButton, styles.cancelButton]}
          onPress={onBack}
        >
          <Text style={styles.cancelButtonText}>Volver</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    setIsScanning(true);
    setFeedbackType(null);
    setFeedbackMessage("");

    try {
      const payload = decodeBase64Url(data);
      const ticketId = payload.ticket_id;

      if (!ticketId) {
        throw new Error("El QR no contiene un ID de boleto válido.");
      }

      await scanTicket(ticketId, accessToken);
      
      setFeedbackType("success");
      setFeedbackMessage("Boleto escaneado correctamente.");
    } catch (error: any) {
      setFeedbackType("error");
      setFeedbackMessage(
        error.message || "Error desconocido al procesar el ticket."
      );
    } finally {
      setTimeout(() => {
        isScanningRef.current = false;
        setIsScanning(false);
      }, 2500);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Feather name="arrow-left" size={24} color="#0F2141" />
          <Text style={styles.backButtonText}>Volver</Text>
        </Pressable>
        <Text style={styles.title}>Escanear Boleto</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={isScanning ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
        </View>
      </View>

      <View style={styles.feedbackContainer}>
        {isScanning && !feedbackType && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator color="#0F2141" />
            <Text style={styles.loadingBannerText}>Validando ticket...</Text>
          </View>
        )}

        {feedbackType === "success" && (
          <View style={[styles.banner, styles.successBanner]}>
            <Feather name="check-circle" size={24} color="#087D3B" />
            <Text style={[styles.bannerText, styles.successText]}>
              {feedbackMessage}
            </Text>
          </View>
        )}

        {feedbackType === "error" && (
          <View style={[styles.banner, styles.errorBanner]}>
            <Feather name="x-circle" size={24} color="#B4241C" />
            <Text style={[styles.bannerText, styles.errorText]}>
              {feedbackMessage}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: "#F3F4F1",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  container: {
    flex: 1,
    backgroundColor: "#0F2141",
  },
  loadingText: {
    color: "#0F2141",
    marginTop: 12,
    fontWeight: "700",
  },
  errorText: {
    color: "#B4241C",
    textAlign: "center",
    fontWeight: "700",
    marginBottom: 20,
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: "#FFA70B",
    borderRadius: 18,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#0F2141",
    fontWeight: "900",
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: "#E4E6EB",
  },
  cancelButtonText: {
    color: "#0F2141",
    fontWeight: "900",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#F3F4F1",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    color: "#0F2141",
    fontWeight: "800",
    marginLeft: 4,
  },
  title: {
    color: "#0F2141",
    fontSize: 18,
    fontWeight: "900",
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#FFA70B",
    backgroundColor: "transparent",
    borderRadius: 20,
  },
  feedbackContainer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
  },
  loadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    justifyContent: "center",
  },
  loadingBannerText: {
    color: "#0F2141",
    fontWeight: "700",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  successBanner: {
    backgroundColor: "#E7F7EE",
  },
  errorBanner: {
    backgroundColor: "#FCE9E7",
  },
  bannerText: {
    flex: 1,
    fontWeight: "700",
    fontSize: 15,
  },
  successText: {
    color: "#087D3B",
  },
});
