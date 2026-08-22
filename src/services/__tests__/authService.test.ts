const mockApiRequest = jest.fn();
const mockCreateUrl = jest.fn(() => "bustrack://auth/callback");
const mockOpenAuthSession = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockExchangeCode = jest.fn();

jest.mock("expo-linking", () => ({
  createURL: (...args: unknown[]) => (mockCreateUrl as jest.Mock)(...args),
}));
jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: (...args: unknown[]) => mockOpenAuthSession(...args),
}));
jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCode(...args),
    },
  },
}));
jest.mock("../apiClient", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  ApiClientError: class ApiClientError extends Error {
    status: number;
    details: unknown;
    constructor(status: number, message: string, _code?: string, details?: unknown) {
      super(message);
      this.name = "ApiClientError";
      this.status = status;
      this.details = details;
    }
  },
}));

import {
  registerPassenger,
  signInWithGoogle,
  uploadSeniorDocumentPhoto,
} from "../authService";

const baseForm = {
  fullName: "  Ana Pérez  ",
  email: "  ANA@EXAMPLE.COM ",
  password: "secret123",
  phone: " 8888-8888 ",
  isSenior: false,
  birthDate: "",
  documentImage: null,
};

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithOAuth.mockResolvedValue({ data: { url: "https://google.test/auth" }, error: null });
    mockOpenAuthSession.mockResolvedValue({ type: "success", url: "bustrack://auth/callback?code=oauth-code" });
    mockExchangeCode.mockResolvedValue({ data: { session: { access_token: "jwt" } }, error: null });
  });

  it("normalizes a regular passenger registration", async () => {
    mockApiRequest.mockResolvedValueOnce({ user_id: "user-1" });
    await registerPassenger(baseForm);

    expect(mockApiRequest).toHaveBeenCalledWith("/api/auth/register", {
      method: "POST",
      body: {
        name: "Ana Pérez",
        email: "ana@example.com",
        password: "secret123",
        phone: "8888-8888",
        is_senior_request: false,
      },
    });
  });

  it("adds senior fields and omits an empty phone", async () => {
    mockApiRequest.mockResolvedValueOnce({ user_id: "user-2" });
    await registerPassenger(
      { ...baseForm, phone: " ", isSenior: true, birthDate: " 1950-01-01 " },
      { documentImagePath: "senior/id.jpg" },
    );

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({
        body: expect.objectContaining({
          birth_date: "1950-01-01",
          document_image_path: "senior/id.jpg",
        }),
      }),
    );
    expect(mockApiRequest.mock.calls[0][1].body).not.toHaveProperty("phone");
  });

  it("uploads the senior document to the signed URL", async () => {
    mockApiRequest.mockResolvedValueOnce({
      path: "senior/id.jpg",
      signed_url: "https://storage.test/upload",
    });
    jest.spyOn(global, "fetch").mockResolvedValueOnce({ ok: true } as Response);

    await expect(
      uploadSeniorDocumentPhoto(" ANA@EXAMPLE.COM ", {
        uri: "file:///id.jpg",
        fileName: "id.jpg",
        contentType: "image/jpeg",
      }),
    ).resolves.toBe("senior/id.jpg");

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/auth/senior-document/upload-url",
      expect.objectContaining({
        body: expect.objectContaining({ email: "ana@example.com", file_name: "id.jpg" }),
      }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "https://storage.test/upload",
      expect.objectContaining({ method: "PUT", headers: { "x-upsert": "false" } }),
    );
  });

  it("rejects a missing signed upload URL", async () => {
    mockApiRequest.mockResolvedValueOnce({ path: "id.jpg", signed_url: "" });
    await expect(
      uploadSeniorDocumentPhoto("a@example.com", {
        uri: "file:///id.jpg",
        fileName: "id.jpg",
        contentType: "image/jpeg",
      }),
    ).rejects.toMatchObject({ status: 500 });
  });

  it.each([
    [JSON.stringify({ message: "Storage full" }), "Storage full"],
    [JSON.stringify({ error: "Rejected" }), "Rejected"],
    ["plain failure", "plain failure"],
    ["", "Supabase Storage rechazo la subida."],
  ])("reports upload response details", async (body, expected) => {
    mockApiRequest.mockResolvedValueOnce({ path: "id.jpg", signed_url: "https://storage.test" });
    jest.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue(body),
    } as unknown as Response);

    await expect(
      uploadSeniorDocumentPhoto("a@example.com", {
        uri: "file:///id.jpg",
        fileName: "id.jpg",
        contentType: "image/jpeg",
      }),
    ).rejects.toMatchObject({ status: 400, details: expected });
  });

  it("completes Google OAuth using a query code", async () => {
    await expect(signInWithGoogle()).resolves.toEqual({ session: { access_token: "jwt" } });
    expect(mockExchangeCode).toHaveBeenCalledWith("oauth-code");
  });

  it("accepts an OAuth code in the URL hash", async () => {
    mockOpenAuthSession.mockResolvedValueOnce({ type: "success", url: "bustrack://auth/callback#code=hash-code" });
    await signInWithGoogle();
    expect(mockExchangeCode).toHaveBeenCalledWith("hash-code");
  });

  it.each([
    [{ data: {}, error: { message: "provider error" } }, "No se pudo iniciar sesion con Google."],
    [{ data: {}, error: null }, "Supabase no devolvio la URL de Google."],
  ])("handles OAuth startup failures", async (oauthResult, message) => {
    mockSignInWithOAuth.mockResolvedValueOnce(oauthResult);
    await expect(signInWithGoogle()).rejects.toThrow(message);
  });

  it("handles cancellation and missing callback codes", async () => {
    mockOpenAuthSession.mockResolvedValueOnce({ type: "cancel" });
    await expect(signInWithGoogle()).rejects.toThrow("cancelado");

    mockOpenAuthSession.mockResolvedValueOnce({ type: "success", url: "bustrack://auth/callback" });
    await expect(signInWithGoogle()).rejects.toThrow("codigo valido");
  });

  it("handles session exchange failures", async () => {
    mockExchangeCode.mockResolvedValueOnce({ data: { session: null }, error: { message: "expired" } });
    await expect(signInWithGoogle()).rejects.toMatchObject({
      message: "No se pudo completar la sesion con Google.",
      details: "expired",
    });
  });
});
