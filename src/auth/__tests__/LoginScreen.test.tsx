import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

const mockLogin = jest.fn();

jest.mock("../../services/apiClient", () => ({
  loginPassenger: (...args: unknown[]) => mockLogin(...args),
}));

import LoginScreen from "../LoginScreen";

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  it("validates required fields and opens registration", async () => {
    const onRegister = jest.fn();
    const screen = await render(
      <LoginScreen onLoginSuccess={jest.fn()} onGoToRegister={onRegister} />,
    );

    await fireEvent.press(screen.getByText(/Iniciar sesi/));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Campos requeridos",
      expect.any(String),
    );
    await fireEvent.press(screen.getByText("Crear cuenta"));
    expect(onRegister).toHaveBeenCalled();
    await screen.unmount();
  });

  it("submits trimmed credentials and returns the session", async () => {
    const onSuccess = jest.fn();
    const session = { access_token: "jwt", user: { id: "u1" } };
    mockLogin.mockResolvedValueOnce(session);
    const screen = await render(<LoginScreen onLoginSuccess={onSuccess} />);

    await fireEvent.changeText(screen.getByPlaceholderText("andrea@correo.com"), " user@test.com ");
    await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "secret");
    await fireEvent.press(screen.getByText(/Iniciar sesi/));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "secret",
      }),
    );
    expect(onSuccess).toHaveBeenCalledWith(session);
    await screen.unmount();
  });

  it.each([
    [new Error("Invalid credentials"), "Invalid credentials"],
    ["unknown", "No se pudo iniciar"],
  ])("shows login failures", async (failure, expected) => {
    mockLogin.mockRejectedValueOnce(failure);
    const screen = await render(<LoginScreen onLoginSuccess={jest.fn()} />);
    await fireEvent.changeText(screen.getByPlaceholderText("andrea@correo.com"), "a@b.com");
    await fireEvent.changeText(screen.getAllByDisplayValue("")[0], "secret");
    await fireEvent.press(screen.getByText(/Iniciar sesi/));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringMatching(/^Error al iniciar sesi/),
        expect.stringContaining(expected),
      ),
    );
    await screen.unmount();
  });
});
