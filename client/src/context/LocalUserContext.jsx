import { createContext, useContext, useEffect, useCallback, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, updateCurrentUser } from "../api";
import { queryKeys } from "../api/queryKeys";

const LocalUserContext = createContext(null);

export function LocalUserProvider({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const queryClient = useQueryClient();
  const syncingImage = useRef(false);

  const enabled = isLoaded && isSignedIn;

  const { data } = useQuery({
    queryKey: queryKeys.user,
    queryFn: getCurrentUser,
    enabled,
    retry: false,
  });

  const user = enabled ? (data?.data ?? null) : null;

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      queryClient.setQueryData(queryKeys.user, null);
    }
  }, [isLoaded, isSignedIn, queryClient]);

  useEffect(() => {
    const clerkImageUrl = clerkUser?.imageUrl || null;
    if (!enabled || !user || !clerkImageUrl) return;
    if (user.imageUrl === clerkImageUrl) return;
    if (syncingImage.current) return;
    syncingImage.current = true;
    updateCurrentUser({ imageUrl: clerkImageUrl })
      .then(() => {
        queryClient.setQueryData(queryKeys.user, (old) =>
          old ? { ...old, data: { ...old.data, imageUrl: clerkImageUrl } } : old
        );
      })
      .catch(() => {})
      .finally(() => {
        syncingImage.current = false;
      });
  }, [enabled, user, clerkUser?.imageUrl, queryClient]);

  const signOut = useCallback(() => {
    window.Clerk?.signOut?.();
  }, []);

  const updateUser = useCallback(
    (patch) => {
      queryClient.setQueryData(queryKeys.user, (old) =>
        old ? { ...old, data: { ...old.data, ...patch } } : old
      );
    },
    [queryClient]
  );

  return (
    <LocalUserContext.Provider value={{ user, signOut, updateUser }}>
      {children}
    </LocalUserContext.Provider>
  );
}

export function useLocalUser() {
  const ctx = useContext(LocalUserContext);
  if (!ctx) throw new Error("useLocalUser must be used within LocalUserProvider");
  return ctx;
}
