import { useEffect, useRef } from "react";
import NetInfo, {
  type NetInfoState,
} from "@react-native-community/netinfo";
import {
  cleanupExpiredOfflineIncidents,
  getEarliestRetryAt,
  initializeOfflineIncidentQueue,
} from "../database/offlineIncidentQueue";
import type { LoginResponse } from "../services/apiClient";
import {
  hasUsableInternetConnection,
  syncPendingPassengerIncidents,
} from "../services/incidentService";

const stableConnectionDelayMs = 1500;
const maxAge7Days = 7 * 24 * 60 * 60 * 1000;

export function useOfflineIncidentSync(session: LoginResponse | null) {
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);

  useEffect(() => {
    void initializeOfflineIncidentQueue()
      .then(() => cleanupExpiredOfflineIncidents(maxAge7Days))
      .catch(() => undefined);

    return () => {
      disposedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!session || session.user.role !== "Passenger") {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      return;
    }

    const userId = session.user.id;
    const accessToken = session.access_token;

    function clearRetryTimer() {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    }

    function scheduleRetryTimer() {
      clearRetryTimer();

      getEarliestRetryAt(userId)
        .then((nextRetryAt) => {
          if (disposedRef.current || !nextRetryAt) {
            return;
          }

          const delay = new Date(nextRetryAt).getTime() - Date.now();
          if (delay <= 0) {
            return;
          }

          retryTimerRef.current = setTimeout(() => {
            if (disposedRef.current) {
              return;
            }

            NetInfo.fetch().then((state) => {
              if (
                !disposedRef.current &&
                hasUsableInternetConnection(state)
              ) {
                syncPendingPassengerIncidents(userId, accessToken)
                  .finally(() => {
                    if (!disposedRef.current) {
                      scheduleRetryTimer();
                    }
                  });
              }
            });
          }, delay + 500);
        })
        .catch(() => undefined);
    }

    function performImmediateSync() {
      clearRetryTimer();

      NetInfo.fetch().then((state) => {
        if (disposedRef.current || !hasUsableInternetConnection(state)) {
          scheduleRetryTimer();
          return;
        }

        syncPendingPassengerIncidents(userId, accessToken)
          .finally(() => {
            if (!disposedRef.current) {
              scheduleRetryTimer();
            }
          });
      });
    }

    function scheduleSync(state: NetInfoState) {
      clearRetryTimer();

      if (!hasUsableInternetConnection(state)) {
        return;
      }

      const syncTimer = setTimeout(() => {
        if (disposedRef.current) {
          return;
        }

        NetInfo.fetch().then((confirmedState) => {
          if (
            disposedRef.current ||
            !hasUsableInternetConnection(confirmedState)
          ) {
            scheduleRetryTimer();
            return;
          }

          syncPendingPassengerIncidents(userId, accessToken)
            .finally(() => {
              if (!disposedRef.current) {
                scheduleRetryTimer();
              }
            });
        });
      }, stableConnectionDelayMs);

      retryTimerRef.current = syncTimer;
    }

    performImmediateSync();

    const unsubscribe = NetInfo.addEventListener(scheduleSync);

    return () => {
      clearRetryTimer();
      unsubscribe();
    };
  }, [session]);
}
