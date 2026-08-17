import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ApiClientError } from "../../services/apiClient";

const mockRegister = jest.fn();
const mockGoogle = jest.fn();
const mockUpload = jest.fn();
const mockPermission = jest.fn();
const mockCamera = jest.fn();

jest.mock("@expo/vector-icons/Feather", () => {
  const React = require("react");
  return (props: object) => React.createElement("Feather", props);
});
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: (...args: unknown[]) => mockPermission(...args),
  launchCameraAsync: (...args: unknown[]) => mockCamera(...args),
}));
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return ({ onChange }: { onChange: (event: object, date: Date) => void }) =>
    React.createElement(
      Pressable,
      { testID: "date-picker", onPress: () => onChange({}, new Date(1950, 4, 6)) },
      React.createElement(Text, null, "date picker"),
    );
});
jest.mock("../../services/authService", () => ({
  registerPassenger: (...args: unknown[]) => mockRegister(...args),
  signInWithGoogle: (...args: unknown[]) => mockGoogle(...args),
  uploadSeniorDocumentPhoto: (...args: unknown[]) => mockUpload(...args),
}));

import RegisterPassengerScreen from "../RegisterPassengerScreen";

async function fillBaseForm(screen: Awaited<ReturnType<typeof render>>, values = {
  name: "Andrea Solis",
  email: "andrea@test.com",
  phone: "88888888",
  password: "password1",
}) {
  await fireEvent.changeText(screen.getByPlaceholderText("Andrea Solis"), values.name);
  await fireEvent.changeText(screen.getByPlaceholderText("andrea@correo.com"), values.email);
  await fireEvent.changeText(screen.getByPlaceholderText("+506 8888 8888"), values.phone);
  await fireEvent.changeText(screen.getByPlaceholderText("Minimo 8 caracteres"), values.password);
}

describe("RegisterPassengerScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRegister.mockResolvedValue({ role: "Passenger" });
    mockUpload.mockResolvedValue("senior-documents/doc.png");
    mockPermission.mockResolvedValue({ granted: true });
    mockCamera.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file://document.png", fileName: " document.png ", mimeType: "image/png" }],
    });
  });

  it("validates invalid public registration fields", async () => {
    const screen = await render(<RegisterPassengerScreen />);
    await fillBaseForm(screen, { name: "A", email: "invalid", phone: "123", password: "short" });
    await fireEvent.press(screen.getAllByText("Crear cuenta")[1]);
    expect(screen.getByText("Ingresa un correo electronico valido.")).toBeTruthy();
    expect(screen.getByText("El telefono debe tener al menos 8 digitos.")).toBeTruthy();
    expect(screen.getByText("La contrasena debe tener al menos 8 caracteres.")).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it("registers a passenger and continues to login", async () => {
    const onRegistered = jest.fn();
    const screen = await render(<RegisterPassengerScreen onRegistered={onRegistered} />);
    await fillBaseForm(screen);
    await fireEvent.press(screen.getAllByText("Crear cuenta")[1]);
    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: "Andrea Solis", email: "andrea@test.com", isSenior: false }),
      { documentImagePath: undefined },
    ));
    expect(screen.getByText(/Cuenta creada como Passenger/)).toBeTruthy();
    await fireEvent.press(screen.getByText("Ir al inicio de sesion"));
    expect(onRegistered).toHaveBeenCalled();
    await screen.unmount();
  });

  it.each([
    [new ApiClientError(409, "duplicate"), "Ese correo ya esta registrado"],
    [new ApiClientError(400, "bad"), "Revisa los datos ingresados"],
    [new ApiClientError(500, "server error"), "server error"],
    [new Error("network"), "No se pudo conectar"],
  ])("maps registration failures to friendly messages", async (failure, expected) => {
    mockRegister.mockRejectedValueOnce(failure);
    const screen = await render(<RegisterPassengerScreen />);
    await fillBaseForm(screen);
    await fireEvent.press(screen.getAllByText("Crear cuenta")[1]);
    await waitFor(() => expect(screen.getByText(new RegExp(expected))).toBeTruthy());
    await screen.unmount();
  });

  it("requires senior fields, captures a document and uploads it", async () => {
    const screen = await render(<RegisterPassengerScreen />);
    await fillBaseForm(screen);
    await fireEvent.press(screen.getByText(/Soy adulto mayor/));
    await fireEvent.press(screen.getAllByText("Crear cuenta")[1]);
    expect(screen.getByText("Usa formato YYYY-MM-DD.")).toBeTruthy();
    expect(screen.getByText("Toma una foto de la cedula.")).toBeTruthy();

    await fireEvent.press(screen.getByText("Seleccionar fecha"));
    await fireEvent.press(screen.getByTestId("date-picker"));
    expect(screen.getByText("1950-05-06")).toBeTruthy();
    await fireEvent.press(screen.getByText("Tomar foto de cedula"));
    await waitFor(() => expect(screen.getByText("document.png")).toBeTruthy());
    await fireEvent.press(screen.getAllByText("Crear cuenta")[1]);

    await waitFor(() => expect(mockUpload).toHaveBeenCalledWith(
      "andrea@test.com",
      { uri: "file://document.png", fileName: "document.png", contentType: "image/png" },
    ));
    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({ isSenior: true, birthDate: "1950-05-06" }),
      { documentImagePath: "senior-documents/doc.png" },
    );
    expect(screen.getByText(/Solicitud senior enviada/)).toBeTruthy();
    await screen.unmount();
  });

  it("handles denied, cancelled and failed document capture", async () => {
    mockPermission.mockResolvedValueOnce({ granted: false });
    const screen = await render(<RegisterPassengerScreen />);
    await fireEvent.press(screen.getByText(/Soy adulto mayor/));
    await fireEvent.press(screen.getByText("Tomar foto de cedula"));
    await waitFor(() => expect(screen.getByText(/Permite acceso a la camara/)).toBeTruthy());

    mockPermission.mockResolvedValueOnce({ granted: true });
    mockCamera.mockResolvedValueOnce({ canceled: true, assets: [] });
    await fireEvent.press(screen.getByText("Tomar foto de cedula"));
    expect(screen.getByText("Tomar foto de cedula")).toBeTruthy();

    mockPermission.mockRejectedValueOnce(new Error("camera error"));
    await fireEvent.press(screen.getByText("Tomar foto de cedula"));
    await waitFor(() => expect(screen.getByText(/No se pudo abrir la camara/)).toBeTruthy());
    await screen.unmount();
  });
});
