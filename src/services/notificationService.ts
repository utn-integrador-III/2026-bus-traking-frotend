import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { env } from "../config/env";

export const GEOFENCE_CHANNEL_ID = "bus-alerts";
export const GENERAL_CHANNEL_ID = "general";
export const GEOFENCE_ALERT_TYPE = "bus_approaching";
export const LOCAL_SOURCE = "local";
export const GEOFENCE_DEDUPE_WINDOW_MS = 10_000;

const recentGeofenceAlerts = new Map<string, number>();

export function isGeofenceAlertData(data: Record<string, unknown> | null | undefined): boolean {
  if (!data) return false;
  return data.event === GEOFENCE_ALERT_TYPE || data.type === GEOFENCE_ALERT_TYPE;
}

export function dedupeKey(tripId: string | null, stopId?: string | null): string {
  return `${tripId || "unknown"}:${stopId || "unknown"}`;
}

export function isDuplicateGeofenceAlert(
  tripId: string | null,
  stopId?: string | null,
): boolean {
  const key = dedupeKey(tripId, stopId);
  const now = Date.now();
  const lastSeen = recentGeofenceAlerts.get(key);

  if (lastSeen !== undefined && now - lastSeen < GEOFENCE_DEDUPE_WINDOW_MS) {
    return true;
  }

  recentGeofenceAlerts.set(key, now);
  return false;
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;

    if (isGeofenceAlertData(data) && data?.source !== LOCAL_SOURCE) {
      if (
        isDuplicateGeofenceAlert(
          typeof data?.trip_id === "string" ? data.trip_id : null,
          typeof data?.stop_id === "string" ? data.stop_id : null,
        )
      ) {
        return {
          shouldShowAlert: false,
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      }
    }

    return {
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

function readPublicEnv(key: string): string | undefined {
  return (globalThis as any)?.process?.env?.[key];
}

function getApiUrl(): string {
  const rawApiUrl =
    readPublicEnv("EXPO_PUBLIC_API_BASE_URL") ||
    readPublicEnv("EXPO_PUBLIC_API_URL") ||
    env.apiBaseUrl;

  if (!rawApiUrl) return "";

  const cleanUrl = rawApiUrl.replace(/\/+$/, "");
  if (cleanUrl.endsWith("/api")) return cleanUrl;
  return `${cleanUrl}/api`;
}

function buildApiUrl(path: string): string {
  const apiUrl = getApiUrl();
  const cleanPath = path.replace(/^\/+/, "").replace(/^api\/+/i, "");
  return `${apiUrl}/${cleanPath}`;
}

export async function configureNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(GEOFENCE_CHANNEL_ID, {
    name: "Alertas de proximidad",
    description:
      "Notificaciones cuando el bus se acerca a tu parada seleccionada",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FFA70B",
    enableVibrate: true,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync(GENERAL_CHANNEL_ID, {
    name: "General",
    description: "Notificaciones generales de la aplicacion",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId = readPublicEnv("EXPO_PUBLIC_EAS_PROJECT_ID");

  if (!projectId) {
    console.warn("Push token registration skipped: EXPO_PUBLIC_EAS_PROJECT_ID is missing");
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (error) {
    console.warn("Push token registration failed", error);
    return null;
  }
}

export async function sendPushTokenToBackend(
  token: string,
  accessToken: string,
): Promise<boolean> {
  const url = buildApiUrl("passenger/push-token");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ expo_push_token: token }),
    });

    if (!response.ok) {
      console.warn(
        `Push token registration failed: HTTP ${response.status} from ${url}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("Push token registration failed", error);
    return false;
  }
}

export function setupNotificationListeners(
  onTripId?: (tripId: string) => void,
): {
  foregroundSubscription: Notifications.Subscription;
  responseSubscription: Notifications.Subscription;
} {
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      const data = notification.request.content.data;
      if (!isGeofenceAlertData(data)) return;
      if (data?.source === LOCAL_SOURCE) return;

      isDuplicateGeofenceAlert(
        typeof data?.trip_id === "string" ? data.trip_id : null,
        typeof data?.stop_id === "string" ? data.stop_id : null,
      );
    },
  );

  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.trip_id && typeof data.trip_id === "string" && onTripId) {
        onTripId(data.trip_id);
      }
    });

  return { foregroundSubscription, responseSubscription };
}

export async function getPendingNotificationResponseTripId(): Promise<string | null> {
  const response = await Notifications.getLastNotificationResponseAsync();

  if (!response) {
    return null;
  }

  const data = response.notification.request.content.data;

  if (data?.trip_id && typeof data.trip_id === "string") {
    return data.trip_id;
  }

  return null;
}

export function addPushTokenRefreshListener(
  listener: (token: string) => void,
): () => void {
  const subscription = Notifications.addPushTokenListener((tokenData) => {
    listener(tokenData.data);
  });

  return () => subscription.remove();
}

export function clearNotificationListeners(
  listeners: {
    foregroundSubscription: Notifications.Subscription;
    responseSubscription: Notifications.Subscription;
  } | null,
): void {
  if (!listeners) return;
  listeners.foregroundSubscription.remove();
  listeners.responseSubscription.remove();
}
