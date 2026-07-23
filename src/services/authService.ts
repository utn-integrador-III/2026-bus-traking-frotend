import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../lib/supabase";
import { ApiClientError, apiRequest } from "./apiClient";
import type {
  RegisterFormData,
  RegisterPassengerRequest,
  RegisterPassengerResponse,
  SeniorDocumentImage,
  SeniorDocumentUploadUrlRequest,
  SeniorDocumentUploadUrlResponse,
} from "../types/user.types";


WebBrowser.maybeCompleteAuthSession();

function getOAuthCodeFromUrl(url: string) {
  const parsedUrl = new URL(url);
  const queryCode = parsedUrl.searchParams.get("code");

  if (queryCode) {
    return queryCode;
  }

  const hash = parsedUrl.hash.startsWith("#") ? parsedUrl.hash.slice(1) : parsedUrl.hash;
  const hashParams = new URLSearchParams(hash);

  return hashParams.get("code");
}

type RegisterPassengerOptions = {
  documentImagePath?: string;
};

type ReactNativeFile = {
  uri: string;
  name: string;
  type: string;
};

function buildRegisterPassengerPayload(
  form: RegisterFormData,
  options: RegisterPassengerOptions = {},
): RegisterPassengerRequest {
  const phone = form.phone.trim();
  const payload: RegisterPassengerRequest = {
    name: form.fullName.trim(),
    email: form.email.trim().toLowerCase(),
    password: form.password,
    is_senior_request: form.isSenior,
    ...(phone ? { phone } : {}),
  };

  if (form.isSenior) {
    payload.birth_date = form.birthDate.trim();
    payload.document_image_path = options.documentImagePath;
  }

  return payload;
}

async function readUploadError(response: Response) {
  const text = await response.text();

  if (!text) {
    return "Supabase Storage rechazo la subida.";
  }

  try {
    const body = JSON.parse(text) as { message?: string; error?: string };
    return body.message || body.error || text;
  } catch {
    return text;
  }
}

function buildUploadFormData(image: SeniorDocumentImage) {
  const formData = new FormData();
  const file: ReactNativeFile = {
    uri: image.uri,
    name: image.fileName,
    type: image.contentType,
  };

  formData.append("cacheControl", "3600");
  formData.append("", file as unknown as Blob);

  return formData;
}

export async function uploadSeniorDocumentPhoto(email: string, image: SeniorDocumentImage) {
  const uploadRequest: SeniorDocumentUploadUrlRequest = {
    email: email.trim().toLowerCase(),
    file_name: image.fileName,
    content_type: image.contentType,
  };

  const uploadTarget = await apiRequest<SeniorDocumentUploadUrlResponse>(
    "/api/auth/senior-document/upload-url",
    {
      method: "POST",
      body: uploadRequest,
    },
  );

  if (!uploadTarget.signed_url) {
    throw new ApiClientError(500, "El servidor no devolvio una URL valida para subir la cedula.");
  }

  const response = await fetch(uploadTarget.signed_url, {
    method: "PUT",
    headers: {
      "x-upsert": "false",
    },
    body: buildUploadFormData(image),
  });

  if (!response.ok) {
    const details = await readUploadError(response);
    throw new ApiClientError(
      response.status,
      "No se pudo subir la foto de la cedula: " + details,
      undefined,
      details,
    );
  }

  return uploadTarget.path;
}


export async function signInWithGoogle() {
  const redirectTo = Linking.createURL("auth/callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw new ApiClientError(500, "No se pudo iniciar sesion con Google.", undefined, error.message);
  }

  if (!data.url) {
    throw new ApiClientError(500, "Supabase no devolvio la URL de Google.");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success") {
    throw new ApiClientError(0, "Inicio de sesion con Google cancelado.");
  }

  const code = getOAuthCodeFromUrl(result.url);

  if (!code) {
    throw new ApiClientError(500, "Google no devolvio un codigo valido de autenticacion.");
  }

  const sessionResult = await supabase.auth.exchangeCodeForSession(code);

  if (sessionResult.error || !sessionResult.data.session) {
    throw new ApiClientError(
      500,
      "No se pudo completar la sesion con Google.",
      undefined,
      sessionResult.error?.message,
    );
  }

  return sessionResult.data;
}

export function registerPassenger(form: RegisterFormData, options?: RegisterPassengerOptions) {
  return apiRequest<RegisterPassengerResponse>("/api/auth/register", {
    method: "POST",
    body: buildRegisterPassengerPayload(form, options),
  });
}
