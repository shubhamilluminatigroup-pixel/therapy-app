import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppUser } from "../types/backend";

type AuthSnapshot = {
  user: AppUser | null;
  token: string | null;
  loading: boolean;
};

const STORAGE_KEY = "therapy-app-auth";

let snapshot: AuthSnapshot = {
  user: null,
  token: null,
  loading: true,
};

let bootstrapped = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

async function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      snapshot = { user: null, token: null, loading: false };
      emit();
      return;
    }

    const parsed = JSON.parse(raw) as { user: AppUser | null; token: string | null };
    snapshot = {
      user: parsed.user,
      token: parsed.token,
      loading: false,
    };
  } catch (error) {
    console.log("Auth bootstrap error:", error);
    snapshot = { user: null, token: null, loading: false };
  }

  emit();
}

export function subscribeAuth(listener: () => void) {
  void bootstrap();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthSnapshot() {
  return snapshot;
}

export async function setAuthSession(user: AppUser, token: string) {
  snapshot = {
    user,
    token,
    loading: false,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
  emit();
}

export async function clearAuthSession() {
  snapshot = {
    user: null,
    token: null,
    loading: false,
  };
  await AsyncStorage.removeItem(STORAGE_KEY);
  emit();
}

export function getAuthToken() {
  return snapshot.token;
}

export function getCurrentUser() {
  return snapshot.user;
}
