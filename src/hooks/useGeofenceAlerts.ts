import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { isDuplicateGeofenceAlert } from "../services/notificationService";

export interface GeofenceAlert {
  tripId: string;
  stopId: string | null;
}

interface UseGeofenceAlertsOptions {
  userId: string | null;
  enabled: boolean;
}

const ALERT_CHANNEL_PREFIX = "passenger:";
const ALERT_CHANNEL_SUFFIX = ":alerts";
const BUS_APPROACHING_EVENT = "bus_approaching";

function buildAlertChannelName(userId: string): string {
  return `${ALERT_CHANNEL_PREFIX}${userId}${ALERT_CHANNEL_SUFFIX}`;
}

export function useGeofenceAlerts({
  userId,
  enabled,
}: UseGeofenceAlertsOptions): {
  alert: GeofenceAlert | null;
  dismissAlert: () => void;
} {
  const [alert, setAlert] = useState<GeofenceAlert | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    if (!enabled || !userId) return undefined;

    const channel = supabase
      .channel(buildAlertChannelName(userId))
      .on(
        "broadcast",
        { event: BUS_APPROACHING_EVENT },
        (payload: any) => {
          const data = payload?.payload || payload;
          const tripId = typeof data?.trip_id === "string" ? data.trip_id : null;
          const stopId =
            typeof data?.stop_id === "string" ? data.stop_id : null;

          if (!tripId || isDuplicateGeofenceAlert(tripId, stopId)) return;

          setAlert({ tripId, stopId });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [enabled, userId]);

  const dismissAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return { alert, dismissAlert };
}
