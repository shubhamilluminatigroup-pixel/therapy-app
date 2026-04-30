import AsyncStorage from "@react-native-async-storage/async-storage";
import { SessionProgress } from "../types/backend";

const PROGRESS_PREFIX = "therapy-app-session-progress:";

function progressKey(courseId: string, uid?: string | null) {
  return `${PROGRESS_PREFIX}${uid || "guest"}:${courseId}`;
}

export async function getCourseProgress(courseId: string, uid?: string | null): Promise<SessionProgress> {
  const raw = await AsyncStorage.getItem(progressKey(courseId, uid));
  if (!raw) return {};

  try {
    return JSON.parse(raw) as SessionProgress;
  } catch {
    await AsyncStorage.removeItem(progressKey(courseId, uid));
    return {};
  }
}

export async function saveSessionProgress(
  courseId: string,
  sessionId: string,
  progress: SessionProgress[string],
  uid?: string | null
) {
  const existing = await getCourseProgress(courseId, uid);
  const previous = existing[sessionId];
  const nextProgress = {
    ...previous,
    ...progress,
    completed: previous?.completed || progress.completed,
    lastPosition: progress.lastPosition || 0,
  };

  const next = {
    ...existing,
    [sessionId]: nextProgress,
  };

  await AsyncStorage.setItem(progressKey(courseId, uid), JSON.stringify(next));
  return next;
}
