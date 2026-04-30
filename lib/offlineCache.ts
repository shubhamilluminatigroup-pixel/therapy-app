import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "therapy-app-offline-cache:";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type CacheRecord<T> = {
  savedAt: number;
  data: T;
};

function cacheKey(key: string) {
  return `${CACHE_PREFIX}${key}`;
}

export async function getCachedData<T>(key: string): Promise<CacheRecord<T> | null> {
  const raw = await AsyncStorage.getItem(cacheKey(key));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CacheRecord<T>;
  } catch {
    await AsyncStorage.removeItem(cacheKey(key));
    return null;
  }
}

export async function setCachedData<T>(key: string, data: T) {
  const record: CacheRecord<T> = {
    savedAt: Date.now(),
    data,
  };
  await AsyncStorage.setItem(cacheKey(key), JSON.stringify(record));
}

export async function loadCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  maxAgeMs = ONE_DAY_MS,
  forceRefresh = false
): Promise<T> {
  const cached = await getCachedData<T>(key);
  const isFresh = cached ? Date.now() - cached.savedAt < maxAgeMs : false;

  if (!forceRefresh && cached && isFresh) {
    return cached.data;
  }

  try {
    const data = await fetcher();
    await setCachedData(key, data);
    return data;
  } catch (error) {
    if (cached && !forceRefresh) {
      return cached.data;
    }
    throw error;
  }
}
