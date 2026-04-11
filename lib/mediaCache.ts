import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

const CACHE_DIRECTORY = `${FileSystem.documentDirectory ?? ""}protected-media/`;
const CACHE_INDEX_KEY = "therapy-app-protected-media-index";

type CacheIndex = Record<string, string>;

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function getExtensionFromUrl(url: string) {
  const cleanUrl = url.split("?")[0] ?? "";
  const lastSegment = cleanUrl.split("/").pop() ?? "";
  const extension = lastSegment.includes(".") ? lastSegment.split(".").pop() : "";
  return extension ? `.${extension}` : ".bin";
}

async function ensureCacheDirectory() {
  if (!FileSystem.documentDirectory) {
    throw new Error("Local file storage is not available on this device.");
  }

  const info = await FileSystem.getInfoAsync(CACHE_DIRECTORY);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, { intermediates: true });
  }
}

async function readCacheIndex(): Promise<CacheIndex> {
  const raw = await AsyncStorage.getItem(CACHE_INDEX_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as CacheIndex;
  } catch {
    return {};
  }
}

async function writeCacheIndex(index: CacheIndex) {
  await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
}

export async function getCachedMediaUri(sessionId: string) {
  const index = await readCacheIndex();
  const uri = index[sessionId];
  if (!uri) return null;

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    delete index[sessionId];
    await writeCacheIndex(index);
    return null;
  }

  return uri;
}

export async function downloadProtectedMedia(sessionId: string, remoteUrl: string) {
  await ensureCacheDirectory();

  const existing = await getCachedMediaUri(sessionId);
  if (existing) {
    return existing;
  }

  const fileName = `${hashString(`${sessionId}:${remoteUrl}`)}${getExtensionFromUrl(remoteUrl)}`;
  const targetUri = `${CACHE_DIRECTORY}${fileName}`;

  await FileSystem.downloadAsync(remoteUrl, targetUri);

  const index = await readCacheIndex();
  index[sessionId] = targetUri;
  await writeCacheIndex(index);

  return targetUri;
}
