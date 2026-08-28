import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { loginPassenger, LoginResponse } from "../services/apiClient";

interface LoginScreenProps {
  onLoginSuccess: (session: LoginResponse) => void;
  onGoToRegister?: () => void;
}

export default function LoginScreen({
  onLoginSuccess,
  onGoToRegister,
}: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Campos requeridos", "Ingresá correo y contraseña.");
      return;
    }

    try {
      setIsLoading(true);

      const session = await loginPassenger({
        email: email.trim(),
        password,
      });

      onLoginSuccess(session);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión.";

      Alert.alert("Error al iniciar sesión", message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>🚌</Text>
          </View>

          <Text style={styles.title}>BusTrack</Text>
          <Text style={styles.subtitle}>Bienvenido de vuelta</Text>
          <Text style={styles.description}>
            Inicia sesión para rastrear tu bus en tiempo real.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="andrea@correo.com"
              placeholderTextColor="#8A94A6"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#8A94A6"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Pressable>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>

          <Pressable
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Iniciar sesión</Text>
            )}
          </Pressable>

          <Pressable onPress={onGoToRegister} disabled={!onGoToRegister}>
            <Text style={styles.registerText}>Crear cuenta</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FFA70B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  logoText: {
    fontSize: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F2141",
  },
  subtitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F2141",
    marginTop: 16,
  },
  description: {
    fontSize: 15,
    color: "#697386",
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 22,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F2141",
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F5F6F8",
    paddingHorizontal: 16,
    color: "#0F2141",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E2E5EA",
  },
  forgotText: {
    alignSelf: "flex-end",
    color: "#0F2141",
    fontWeight: "700",
    marginBottom: 20,
  },
  loginButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#FFA70B",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#0F2141",
    fontWeight: "800",
    fontSize: 16,
  },
  registerText: {
    textAlign: "center",
    color: "#0F2141",
    fontWeight: "700",
    marginTop: 18,
  },
});