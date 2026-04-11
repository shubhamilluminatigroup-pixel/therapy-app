import { useSyncExternalStore } from "react";
import { getAuthSnapshot, subscribeAuth } from "./authStore";

export function useAuthUser() {
  return useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthSnapshot);
}

export function useAuthUid() {
  const current = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthSnapshot);
  return current.user?.uid ?? null;
}
