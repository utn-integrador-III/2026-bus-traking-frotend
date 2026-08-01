import React, { useMemo, useState } from "react";
import Feather from "@expo/vector-icons/Feather";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import type { ImagePickerAsset } from "expo-image-picker";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { palette, radius, spacing } from "@bustrack/design";
import { ApiClientError } from "../services/apiClient";
import { registerPassenger, signInWithGoogle, uploadSeniorDocumentPhoto } from "../services/authService";
import type { RegisterFormData, SeniorDocumentContentType, SeniorDocumentImage } from "../types/user.types";

type FormErrors = Partial<Record<keyof RegisterFormData, string>>;
type TextFieldName = "fullName" | "email" | "phone" | "password" | "birthDate";
type IconName = React.ComponentProps<typeof Feather>["name"];

type AuthInputProps = {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?: "name" | "email" | "tel" | "off";
  error?: string;
  icon: IconName;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numbers-and-punctuation";
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  textContentType?: "name" | "emailAddress" | "telephoneNumber" | "newPassword" | "none";
  value: string;
};

const initialForm: RegisterFormData = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  isSenior: false,
  birthDate: "",
  documentImage: null,
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const birthDatePattern = /^\d{4}-\d{2}-\d{2}$/;


function formatDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function formatBirthDate(date: Date) {
  const year = date.getFullYear();
  const month = formatDatePart(date.getMonth() + 1);
  const day = formatDatePart(date.getDate());

  return `${year}-${month}-${day}`;
}

function getSeniorMaxBirthDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() - 65);

  return date;
}

function getBirthDatePickerValue(value: string) {
  if (!birthDatePattern.test(value)) {
    return getSeniorMaxBirthDate();
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function validateForm(form: RegisterFormData) {
  const errors: FormErrors = {};
  const fullName = form.fullName.trim();
  const email = form.email.trim();
  const phone = form.phone.trim();
  const birthDate = form.birthDate.trim();

  if (!fullName) {
    errors.fullName = "Ingresa tu nombre completo.";
  }

  if (!emailPattern.test(email)) {
    errors.email = "Ingresa un correo electronico valido.";
  }

  if (phone && phone.length < 8) {
    errors.phone = "El telefono debe tener al menos 8 digitos.";
  }

  if (form.password.length < 8) {
    errors.password = "La contrasena debe tener al menos 8 caracteres.";
  }

  if (form.isSenior && !birthDatePattern.test(birthDate)) {
    errors.birthDate = "Usa formato YYYY-MM-DD.";
  }

  if (form.isSenior && !form.documentImage) {
    errors.documentImage = "Toma una foto de la cedula.";
  }

  return errors;
}


function getImageExtension(contentType: SeniorDocumentContentType) {
  if (contentType === "image/png") {
    return "png";
  }

  if (contentType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function inferContentType(asset: ImagePickerAsset): SeniorDocumentContentType {
  const rawType = (asset.mimeType || asset.fileName || asset.uri).toLowerCase();

  if (rawType.includes("png") || rawType.endsWith(".png")) {
    return "image/png";
  }

  if (rawType.includes("webp") || rawType.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
}

function buildDocumentImage(asset: ImagePickerAsset): SeniorDocumentImage {
  const contentType = inferContentType(asset);
  const extension = getImageExtension(contentType);
  const fallbackName = "cedula-" + Date.now() + "." + extension;
  const fileName = asset.fileName && asset.fileName.trim() ? asset.fileName.trim() : fallbackName;

  return {
    uri: asset.uri,
    fileName,
    contentType,
  };
}

function getFriendlyError(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.status === 409) {
      return "Ese correo ya esta registrado. Intenta iniciar sesion.";
    }

    if (error.status === 400) {
      return "Revisa los datos ingresados. El registro publico solo acepta datos validos de pasajero.";
    }

    return error.message;
  }

  return "No se pudo conectar con el servidor. Revisa tu conexion e intenta otra vez.";
}

function AuthInput({
  autoCapitalize,
  autoComplete,
  error,
  icon,
  keyboardType,
  label,
  onChangeText,
  placeholder,
  secureTextEntry,
  textContentType,
  value,
}: AuthInputProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, error ? styles.inputShellError : null]}>
        <Feather color={palette.neutral[700]} name={icon} size={16} style={styles.inputIcon} />
        <TextInput
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.neutral[500]}
          secureTextEntry={secureTextEntry}
          selectionColor={palette.amber.DEFAULT}
          style={styles.input}
          textContentType={textContentType}
          value={value}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export default function RegisterPassengerScreen() {
  const [form, setForm] = useState<RegisterFormData>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isBirthDatePickerVisible, setIsBirthDatePickerVisible] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const birthDatePickerValue = useMemo(() => getBirthDatePickerValue(form.birthDate), [form.birthDate]);
  const maxBirthDate = useMemo(() => getSeniorMaxBirthDate(), []);

  const isFormReady = useMemo(() => {
    return Boolean(
      form.fullName.trim() &&
        form.email.trim() &&
        form.password &&
        !isSubmitting &&
        !isTakingPhoto &&
        !isGoogleSubmitting,
    );
  }, [form, isSubmitting, isTakingPhoto, isGoogleSubmitting]);

  function updateField(field: TextFieldName, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError(null);
    setSuccessMessage(null);
  }

  function toggleSenior() {
    setForm((current) => ({ ...current, isSenior: !current.isSenior }));
    setErrors((current) => ({ ...current, birthDate: undefined, documentImage: undefined }));
    setServerError(null);
    setSuccessMessage(null);
  }



  function handleBirthDateChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setIsBirthDatePickerVisible(false);
    }

    if (!selectedDate) {
      return;
    }

    updateField("birthDate", formatBirthDate(selectedDate));
  }

  function openBirthDatePicker() {
    setServerError(null);
    setSuccessMessage(null);
    setIsBirthDatePickerVisible(true);
  }

  async function handleTakeDocumentPhoto() {
    setServerError(null);
    setSuccessMessage(null);
    setIsTakingPhoto(true);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        setErrors((current) => ({
          ...current,
          documentImage: "Permite acceso a la camara para tomar la foto.",
        }));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        base64: false,
        mediaTypes: ["images"],
        quality: 0.75,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const documentImage = buildDocumentImage(result.assets[0]);
      setForm((current) => ({ ...current, documentImage }));
      setErrors((current) => ({ ...current, documentImage: undefined }));
    } catch (error) {
      setServerError("No se pudo abrir la camara. Intenta otra vez.");
    } finally {
      setIsTakingPhoto(false);
    }
  }


  async function handleGoogleSignIn() {
    setServerError(null);
    setSuccessMessage(null);
    setIsGoogleSubmitting(true);

    try {
      await signInWithGoogle();
      setSuccessMessage("Sesion iniciada con Google.");
    } catch (error) {
      setServerError(getFriendlyError(error));
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  async function handleSubmit() {
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    setServerError(null);
    setSuccessMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const documentImagePath = form.isSenior && form.documentImage
        ? await uploadSeniorDocumentPhoto(form.email, form.documentImage)
        : undefined;
      const response = await registerPassenger(form, { documentImagePath });
      const message = form.isSenior
        ? "Solicitud senior enviada para verificacion."
        : `Cuenta creada como ${response.role}. Ya puedes iniciar sesion.`;
      setSuccessMessage(message);
      setForm(initialForm);
    } catch (error) {
      setServerError(getFriendlyError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardArea}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable accessibilityRole="button" style={styles.backButton}>
              <Feather color={palette.navy.DEFAULT} name="arrow-left" size={18} />
            </Pressable>
            <Text style={styles.title}>Crear cuenta</Text>
          </View>

          <View style={styles.form}>
            <AuthInput
              autoCapitalize="words"
              autoComplete="name"
              error={errors.fullName}
              icon="user"
              label="Nombre completo"
              onChangeText={(value) => updateField("fullName", value)}
              placeholder="Andrea Solis"
              textContentType="name"
              value={form.fullName}
            />

            <AuthInput
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
              icon="mail"
              keyboardType="email-address"
              label="Correo electronico"
              onChangeText={(value) => updateField("email", value)}
              placeholder="andrea@correo.com"
              textContentType="emailAddress"
              value={form.email}
            />

            <AuthInput
              autoComplete="tel"
              error={errors.phone}
              icon="phone"
              keyboardType="phone-pad"
              label="Telefono"
              onChangeText={(value) => updateField("phone", value)}
              placeholder="+506 8888 8888"
              textContentType="telephoneNumber"
              value={form.phone}
            />

            <AuthInput
              autoCapitalize="none"
              autoComplete="off"
              error={errors.password}
              icon="lock"
              label="Contrasena"
              onChangeText={(value) => updateField("password", value)}
              placeholder="Minimo 8 caracteres"
              secureTextEntry
              textContentType="newPassword"
              value={form.password}
            />


            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting || isTakingPhoto || isGoogleSubmitting}
              onPress={handleGoogleSignIn}
              style={({ pressed }) => [
                styles.googleButton,
                isSubmitting || isTakingPhoto || isGoogleSubmitting ? styles.googleButtonDisabled : null,
                pressed && !isSubmitting && !isTakingPhoto && !isGoogleSubmitting ? styles.pressed : null,
              ]}
            >
              {isGoogleSubmitting ? (
                <ActivityIndicator color={palette.navy.DEFAULT} />
              ) : (
                <>
                  <Feather color={palette.navy.DEFAULT} name="chrome" size={16} />
                  <Text style={styles.googleButtonText}>Continuar con Google</Text>
                </>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: form.isSenior }}
              onPress={toggleSenior}
              style={({ pressed }) => [
                styles.seniorCard,
                form.isSenior ? styles.seniorCardActive : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.seniorTextBlock}>
                <Text style={styles.seniorTitle}>Soy adulto mayor (65+)</Text>
                <Text style={styles.seniorSubtitle}>Viajes sin costo{`\n`}requiere verificacion</Text>
              </View>
              <View style={[styles.switchTrack, form.isSenior ? styles.switchTrackOn : null]}>
                <View style={[styles.switchThumb, form.isSenior ? styles.switchThumbOn : null]} />
              </View>
            </Pressable>

            {form.isSenior ? (
              <View style={styles.seniorFields}>
                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Fecha nacimiento</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSubmitting}
                    onPress={openBirthDatePicker}
                    style={({ pressed }) => [
                      styles.documentButton,
                      errors.birthDate ? styles.inputShellError : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Feather color={palette.neutral[700]} name="calendar" size={16} />
                    <Text
                      style={[
                        styles.documentButtonText,
                        !form.birthDate ? styles.placeholderText : null,
                      ]}
                      numberOfLines={1}
                    >
                      {form.birthDate || "Seleccionar fecha"}
                    </Text>
                  </Pressable>
                  {isBirthDatePickerVisible ? (
                    <DateTimePicker
                      display={Platform.OS === "ios" ? "inline" : "calendar"}
                      maximumDate={maxBirthDate}
                      minimumDate={new Date(1900, 0, 1)}
                      mode="date"
                      onChange={handleBirthDateChange}
                      value={birthDatePickerValue}
                    />
                  ) : null}
                  {errors.birthDate ? <Text style={styles.errorText}>{errors.birthDate}</Text> : null}
                </View>
                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Documento verificacion</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSubmitting || isTakingPhoto}
                    onPress={handleTakeDocumentPhoto}
                    style={({ pressed }) => [
                      styles.documentButton,
                      errors.documentImage ? styles.inputShellError : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    {isTakingPhoto ? (
                      <ActivityIndicator color={palette.navy.DEFAULT} />
                    ) : (
                      <>
                        <Feather color={palette.neutral[700]} name="camera" size={16} />
                        <Text style={styles.documentButtonText} numberOfLines={1}>
                          {form.documentImage ? form.documentImage.fileName : "Tomar foto de cedula"}
                        </Text>
                      </>
                    )}
                  </Pressable>
                  {errors.documentImage ? <Text style={styles.errorText}>{errors.documentImage}</Text> : null}
                </View>
              </View>
            ) : null}

            {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={!isFormReady || isTakingPhoto}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.submitButton,
                !isFormReady || isTakingPhoto ? styles.submitButtonDisabled : null,
                pressed && isFormReady && !isTakingPhoto ? styles.submitButtonPressed : null,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={palette.navy.DEFAULT} />
              ) : (
                <Text style={styles.submitButtonText}>Crear cuenta</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.neutral[0],
  },
  keyboardArea: {
    flex: 1,
  },
  content: {
    alignItems: "center",
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 18,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 20,
    maxWidth: 214,
    width: "100%",
  },
  backButton: {
    alignItems: "center",
    borderColor: palette.neutral[500],
    borderRadius: radius.xs,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    marginRight: 14,
    width: 36,
  },
  title: {
    color: palette.navy.DEFAULT,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 0,
  },
  form: {
    gap: 12,
    maxWidth: 214,
    width: "100%",
  },
  fieldBlock: {
    gap: 7,
  },
  label: {
    color: palette.navy.DEFAULT,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: palette.neutral[50],
    borderColor: palette.neutral[300],
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 43,
    paddingHorizontal: 12,
  },
  inputShellError: {
    backgroundColor: palette.danger.bg,
    borderColor: palette.danger.border,
  },
  inputIcon: {
    marginRight: 12,
    textAlign: "center",
    width: 16,
  },
  input: {
    color: palette.navy.DEFAULT,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    height: 42,
    padding: 0,
  },
  errorText: {
    color: palette.danger.DEFAULT,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },

  googleButton: {
    alignItems: "center",
    backgroundColor: palette.neutral[0],
    borderColor: palette.neutral[300],
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    height: 43,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  googleButtonDisabled: {
    opacity: 0.58,
  },
  googleButtonText: {
    color: palette.navy.DEFAULT,
    fontSize: 13,
    fontWeight: "900",
  },
  seniorCard: {
    alignItems: "center",
    backgroundColor: palette.amber.soft,
    borderColor: palette.amber.border,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    minHeight: 76,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  seniorCardActive: {
    backgroundColor: palette.amber.softAlt,
  },
  seniorTextBlock: {
    flex: 1,
    paddingRight: spacing.md,
  },
  seniorTitle: {
    color: palette.navy.DEFAULT,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 6,
  },
  seniorSubtitle: {
    color: palette.amber.text,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 13,
    maxWidth: 128,
  },
  switchTrack: {
    alignItems: "center",
    backgroundColor: palette.neutral[400],
    borderRadius: radius.full,
    height: 22,
    justifyContent: "center",
    paddingHorizontal: 2,
    width: 39,
  },
  switchTrackOn: {
    backgroundColor: palette.amber.DEFAULT,
  },
  switchThumb: {
    alignSelf: "flex-start",
    backgroundColor: palette.neutral[0],
    borderRadius: radius.full,
    height: 18,
    width: 18,
  },
  switchThumbOn: {
    alignSelf: "flex-end",
  },
  seniorFields: {
    gap: 12,
  },
  documentButton: {
    alignItems: "center",
    backgroundColor: palette.neutral[50],
    borderColor: palette.neutral[300],
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 43,
    paddingHorizontal: 12,
  },
  documentButtonText: {
    color: palette.navy.DEFAULT,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  placeholderText: {
    color: palette.neutral[500],
  },
  serverError: {
    backgroundColor: palette.danger.bg,
    borderColor: palette.danger.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: palette.danger.DEFAULT,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    padding: spacing.md,
  },
  successText: {
    backgroundColor: palette.success.bg,
    borderColor: palette.success.DEFAULT,
    borderRadius: radius.md,
    borderWidth: 1,
    color: palette.success.DEFAULT,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    padding: spacing.md,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: palette.amber.DEFAULT,
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    marginTop: 4,
    shadowColor: "#fca311",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 7,
  },
  submitButtonDisabled: {
    backgroundColor: palette.neutral[300],
    elevation: 0,
    shadowOpacity: 0,
  },
  submitButtonPressed: {
    transform: [{ scale: 0.99 }],
  },
  pressed: {
    opacity: 0.88,
  },
  submitButtonText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },
});
