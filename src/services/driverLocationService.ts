import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { reportDriverLocation } from "./apiClient";

export const DRIVER_LOCATION_TASK = "driver-location-tracking";

const STORAGE_KEY = "driver.tracking.session";

interface TrackingSession {
  tripId: string;
  token: string;
}

interface LocationTaskData {
  locations?: Location.LocationObject[];
}

interface BackgroundLocationTaskParams {
  data?: unknown;
  error?: unknown;
}

function toBackendSpeed(speedMetersPerSecond?: number | null): number | undefined {
  if (speedMetersPerSecond === undefined || speedMetersPerSecond === null) {
    return undefined;
  }

  if (!Number.isFinite(speedMetersPerSecond) || speedMetersPerSecond < 0) {
    return undefined;
  }

  return Number((speedMetersPerSecond * 3.6).toFixed(2));
}

function toBackendHeading(heading?: number | null): number | undefined {
  if (heading === undefined || heading === null) {
    return undefined;
  }

  if (!Number.isFinite(heading) || heading < 0 || heading > 360) {
    return undefined;
  }

  return Number(heading.toFixed(2));
}

async function readSession(): Promise<TrackingSession | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as TrackingSession;
  } catch {
    return null;
  }
}

async function writeSession(session: TrackingSession): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

TaskManager.defineTask(
  DRIVER_LOCATION_TASK,
  async ({ data, error }: BackgroundLocationTaskParams) => {
    if (error) {
      return;
    }

    const payload = data as LocationTaskData | undefined;
    const locations = payload?.locations;

    if (!locations || locations.length === 0) {
      return;
    }

    const session = await readSession();

    if (!session) {
      return;
    }

    const latest = locations[locations.length - 1];
    const { coords, timestamp } = latest;

    try {
      await reportDriverLocation(
        session.tripId,
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          speed: toBackendSpeed(coords.speed),
          heading: toBackendHeading(coords.heading),
          recorded_at: new Date(timestamp).toISOString(),
        },
        session.token,
      );
    } catch {
      // A temporary network failure is ignored; the next tracking tick will retry.
    }
  },
);

let foregroundSubscription: Location.LocationSubscription | null = null;

export async function ensureLocationPermissions(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();

  if (foreground.status !== "granted") {
    return false;
  }

  try {
    const background = await Location.requestBackgroundPermissionsAsync();
    return background.status === "granted";
  } catch (error) {
    // In Expo Go on iOS, requesting background permissions throws an Info.plist error.
    console.warn("Background location permission error (likely Expo Go iOS):", error);
    return false;
  }
}

export async function isDriverTrackingActive(): Promise<boolean> {
  const backgroundActive = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  return backgroundActive || foregroundSubscription !== null;
}

export async function startDriverTracking(
  tripId: string,
  token: string,
): Promise<void> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    throw new Error("Se requieren permisos de ubicación para transmitir la ruta.");
  }

  const alreadyRunning = await isDriverTrackingActive();
  if (alreadyRunning) {
    await stopDriverTracking();
  }

  await writeSession({ tripId, token });

  let backgroundGranted = false;
  try {
    const bgPerm = await Location.requestBackgroundPermissionsAsync();
    backgroundGranted = bgPerm.status === "granted";
  } catch (e) {
    console.warn("No se pudo pedir permiso de fondo. Usando fallback.", e);
  }

  if (backgroundGranted) {
    try {
      await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 0,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.AutomotiveNavigation,
        foregroundService: {
          notificationTitle: "Transmitiendo ruta en vivo",
          notificationBody: "La ubicación se comparte con los pasajeros.",
          notificationColor: "#14213d",
        },
      });
      return;
    } catch (error) {
      console.warn("Fallo startLocationUpdatesAsync, intentando fallback foreground", error);
    }
  }

  // Fallback to foreground tracking (useful for Expo Go iOS)
  foregroundSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 2000,
      distanceInterval: 0,
    },
    async (location) => {
      try {
        await reportDriverLocation(
          tripId,
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            speed: toBackendSpeed(location.coords.speed),
            heading: toBackendHeading(location.coords.heading),
            recorded_at: new Date(location.timestamp).toISOString(),
          },
          token,
        );
      } catch (err) {
        // Ignore network errors
      }
    }
  );
}

export async function stopDriverTracking(): Promise<void> {
  if (foregroundSubscription) {
    foregroundSubscription.remove();
    foregroundSubscription = null;
  }
  
  const running = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  if (running) {
    await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  }

  await clearSession();
}