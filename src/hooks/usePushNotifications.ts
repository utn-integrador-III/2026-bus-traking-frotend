import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  addPushTokenRefreshListener,
  clearNotificationListeners,
  configureNotificationChannels,
  getPendingNotificationResponseTripId,
  registerForPushNotifications,
  sendPushTokenToBackend,
  setupNotificationListeners,
} from "../services/notificationService";

interface UsePushNotificationsOptions {
  accessToken: string;
  enabled: boolean;
  onNotificationTripId?: (tripId: string) => void;
}

export type PushTokenRegistrationState = "idle" | "registered" | "failed";

interface UsePushNotificationsResult {
  expoPushToken: string | null;
  permissionGranted: boolean;
  tokenRegistrationState: PushTokenRegistrationState;
}

export function usePushNotifications({
  accessToken,
  enabled,
  onNotificationTripId,
}: UsePushNotificationsOptions): UsePushNotificationsResult {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [tokenRegistrationState, setTokenRegistrationState] =
    useState<PushTokenRegistrationState>("idle");
  const listenersRef = useRef<{
    foregroundSubscription: ReturnType<typeof setupNotificationListeners> | null;
  }>({ foregroundSubscription: null });
  const onTripRef = useRef(onNotificationTripId);
  onTripRef.current = onNotificationTripId;

  const registerToken = useCallback(async () => {
    if (!enabled) return;

    await configureNotificationChannels();

    const token = await registerForPushNotifications();
    if (token) {
      setExpoPushToken(token);
      setPermissionGranted(true);
      const registered = await sendPushTokenToBackend(token, accessToken);
      setTokenRegistrationState(registered ? "registered" : "failed");
    } else {
      setTokenRegistrationState("failed");
    }
  }, [enabled, accessToken]);

  useEffect(() => {
    if (!enabled) return;

    registerToken();

    const { foregroundSubscription, responseSubscription } =
      setupNotificationListeners((tripId) => {
        onTripRef.current?.(tripId);
      });
    listenersRef.current.foregroundSubscription = {
      foregroundSubscription,
      responseSubscription,
    };

    return () => {
      clearNotificationListeners(listenersRef.current.foregroundSubscription);
      listenersRef.current.foregroundSubscription = null;
    };
  }, [enabled, registerToken]);

  useEffect(() => {
    if (!enabled || !accessToken) return;

    getPendingNotificationResponseTripId().then((tripId) => {
      if (tripId) {
        onTripRef.current?.(tripId);
      }
    });

    const removeTokenRefreshListener = addPushTokenRefreshListener(
      async (refreshedToken) => {
        setExpoPushToken(refreshedToken);
        await sendPushTokenToBackend(refreshedToken, accessToken);
      },
    );

    return () => {
      removeTokenRefreshListener();
    };
  }, [enabled, accessToken]);

  useEffect(() => {
    if (!enabled || !accessToken) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active" && !expoPushToken) {
        registerToken();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, [enabled, accessToken, registerToken, expoPushToken]);

  return { expoPushToken, permissionGranted, tokenRegistrationState };
}
