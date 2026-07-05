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
  locations: Location.LocationObject[];
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

TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }) => {
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
    // Se ignora un fallo puntual de red; el siguiente tick reintentara el envio.
  }
});

export async function ensureLocationPermissions(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();

  if (foreground.status !== "granted") {
    return false;
  }

  const background = await Location.requestBackgroundPermissionsAsync();

  return background.status === "granted";
}

export async function isDriverTrackingActive(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
}

export async function startDriverTracking(
  tripId: string,
  token: string,
): Promise<void> {
  const granted = await ensureLocationPermissions();

  if (!granted) {
    throw new Error(
      "Se requieren permisos de ubicacion en segundo plano para transmitir la ruta.",
    );
  }

  await writeSession({ tripId, token });

  const alreadyRunning = await isDriverTrackingActive();

  if (alreadyRunning) {
    await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  }

  await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 2000,
    distanceInterval: 0,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    activityType: Location.ActivityType.AutomotiveNavigation,
    foregroundService: {
      notificationTitle: "Transmitiendo ruta en vivo",
      notificationBody:
        "La ubicacion del bus se comparte con los pasajeros mientras el viaje este activo.",
      notificationColor: "#14213d",
    },
  });
}

export async function stopDriverTracking(): Promise<void> {
  const running = await isDriverTrackingActive();

  if (running) {
    await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  }

  await clearSession();
}
