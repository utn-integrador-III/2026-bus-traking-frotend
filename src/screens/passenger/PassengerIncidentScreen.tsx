import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import { createPassengerIncident } from "../../services/apiClient";
import { INCIDENT_TYPES } from "../../types/incident.types";

interface PassengerIncidentScreenProps {
  tripId: string;
  accessToken: string;
  onBack: () => void;
  onSubmitted: () => void;
}

export default function PassengerIncidentScreen({
  tripId,
  accessToken,
  onBack,
  onSubmitted,
}: PassengerIncidentScreenProps) {
  const [selectedType, setSelectedType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        if (!cancelled) {
          setLocationError("Se requiere acceso a la ubicacion para reportar un incidente.");
        }
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      if (!cancelled) {
        setCoords({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit() {
    if (!selectedType) {
      Alert.alert("Tipo requerido", "Selecciona un tipo de incidente.");
      return;
    }

    if (!coords) {
      Alert.alert("Ubicacion no disponible", "Espera a que se obtenga la ubicacion.");
      return;
    }

    setSubmitting(true);

    try {
      await createPassengerIncident(
        {
          trip_id: tripId,
          type: selectedType,
          description: description.trim() || undefined,
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
        accessToken,
      );

      Alert.alert("Reporte enviado", "Tu reporte ha sido registrado.", [
        { text: "OK", onPress: onSubmitted },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al enviar el reporte.";
      Alert.alert("Error", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} disabled={submitting}>
          <Text style={styles.backText}>← Volver</Text>
        </Pressable>
        <Text style={styles.title}>Reportar incidente</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {locationError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{locationError}</Text>
          </View>
        ) : coords ? (
          <Text style={styles.locationInfo}>
            Ubicacion capturada: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
          </Text>
        ) : (
          <ActivityIndicator size="small" color="#FFA70B" style={{ marginBottom: 16 }} />
        )}

        <Text style={styles.label}>Tipo de incidente</Text>

        <View style={styles.typeGrid}>
          {INCIDENT_TYPES.map((incidentType) => (
            <Pressable
              key={incidentType}
              style={[
                styles.typeChip,
                selectedType === incidentType && styles.typeChipSelected,
              ]}
              onPress={() => setSelectedType(incidentType)}
              disabled={submitting}
            >
              <Text
                style={[
                  styles.typeChipText,
                  selectedType === incidentType && styles.typeChipTextSelected,
                ]}
              >
                {incidentType === "Delay" ? "Demora" : incidentType === "Accident" ? "Accidente" : incidentType === "Overcrowding" ? "Sobrecupo" : "Otro"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Descripcion (opcional)</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Describe lo que observas..."
          placeholderTextColor="#8A94A6"
          value={description}
          onChangeText={(text) => setDescription(text.slice(0, 500))}
          multiline
          textAlignVertical="top"
          editable={!submitting}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>

        <Pressable
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#0F2141" />
          ) : (
            <Text style={styles.submitButtonText}>Enviar reporte</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F4F1",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backText: {
    color: "#0F2141",
    fontWeight: "800",
    fontSize: 15,
  },
  title: {
    color: "#0F2141",
    fontWeight: "900",
    fontSize: 18,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  locationInfo: {
    color: "#087D3B",
    fontWeight: "700",
    fontSize: 13,
    backgroundColor: "#E7F7EE",
    padding: 12,
    borderRadius: 14,
    marginBottom: 20,
    overflow: "hidden",
  },
  errorBanner: {
    backgroundColor: "#FCE9E7",
    padding: 12,
    borderRadius: 14,
    marginBottom: 20,
  },
  errorText: {
    color: "#B4241C",
    fontWeight: "700",
    fontSize: 13,
  },
  label: {
    color: "#0F2141",
    fontWeight: "800",
    fontSize: 15,
    marginBottom: 10,
    marginTop: 8,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E4E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  typeChipSelected: {
    backgroundColor: "#0F2141",
    borderColor: "#0F2141",
  },
  typeChipText: {
    color: "#697386",
    fontWeight: "700",
    fontSize: 14,
  },
  typeChipTextSelected: {
    color: "#FFA70B",
  },
  descriptionInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E4E7EB",
    color: "#0F2141",
    fontSize: 14,
    lineHeight: 20,
    minHeight: 100,
  },
  charCount: {
    color: "#8A94A6",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 4,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: "#FFA70B",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFA70B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#0F2141",
    fontWeight: "900",
    fontSize: 16,
  },
});
