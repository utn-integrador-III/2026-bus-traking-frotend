import { useEffect } from "react";
import NetInfo, {
  type NetInfoState,
} from "@react-native-community/netinfo";
import { initializeOfflineIncidentQueue } from "../database/offlineIncidentQueue";
import type { LoginResponse } from "../services/apiClient";
import {
  hasUsableInternetConnection,
  syncPendingPassengerIncidents,
} from "../services/incidentService";

const stableConnectionDelayMs = 1500;

export function useOfflineIncidentSync(session: LoginResponse | null) {
  useEffect(() => {
    void initializeOfflineIncidentQueue().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!session || session.user.role !== "Passenger") {
      return;
    }

    const userId = session.user.id;
    const accessToken = session.access_token;
    let disposed = false;
    let syncTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleSync(state: NetInfoState) {
      if (syncTimer) {
        clearTimeout(syncTimer);
        syncTimer = null;
      }

      if (!hasUsableInternetConnection(state)) {
        return;
      }

      syncTimer = setTimeout(() => {
        const runSync = async () => {
          const confirmedState = await NetInfo.fetch();

          if (disposed || !hasUsableInternetConnection(confirmedState)) {
            return;
          }

          await syncPendingPassengerIncidents(userId, accessToken);
        };

        void runSync().catch(() => undefined);
      }, stableConnectionDelayMs);
    }

    const unsubscribe = NetInfo.addEventListener(scheduleSync);

    return () => {
      disposed = true;
      unsubscribe();

      if (syncTimer) {
        clearTimeout(syncTimer);
      }
    };
  }, [session]);
}
