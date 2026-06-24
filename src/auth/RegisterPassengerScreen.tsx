import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { palette } from "@bustrack/design";

export default function RegisterPassengerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registro de Pasajeros</Text>
      <Text style={styles.todoText}>
        [TODO 1] Diseñar la interfaz de usuario de autoregistro público en React Native.
      </Text>
      <Text style={styles.todoText}>
        [TODO 2] Integrar el formulario con la API de Supabase Auth para procesar credenciales nativas (correo y contraseña).
      </Text>
      <Text style={styles.todoText}>
        [TODO 3] Prevenir escalamiento de privilegios vertical no autorizado (asegurar rol Passenger en backend/supabase).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.neutral[250],
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: palette.navy.DEFAULT,
    marginBottom: 20,
  },
  todoText: {
    fontSize: 14,
    color: palette.neutral[700],
    marginVertical: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});
