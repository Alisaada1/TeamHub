import { createContext, useContext, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { getOnlineUsers, sendPresenceHeartbeat } from "../api";
import { queryKeys } from "../api/queryKeys";

const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const POLL_INTERVAL_MS = 15 * 1000;

const PresenceContext = createContext(null);

export function PresenceProvider({ children }) {
  const { isLoaded, isSignedIn } = useAuth();

  const enabled = isLoaded && isSignedIn;

  const { data, isSuccess } = useQuery({
    queryKey: queryKeys.presence,
    queryFn: getOnlineUsers,
    enabled,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    retry: false,
    staleTime: POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (!enabled) return;
    sendPresenceHeartbeat().catch(() => {});
    const id = setInterval(() => {
      sendPresenceHeartbeat().catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled]);

  const onlineIds = useMemo(() => new Set(data?.data ?? []), [data]);

  const value = useMemo(
    () => ({
      isOnline: (userId) => (userId ? onlineIds.has(userId) : false),
      ready: enabled && isSuccess,
    }),
    [onlineIds, enabled, isSuccess]
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error("usePresence must be used within PresenceProvider");
  return ctx;
}
