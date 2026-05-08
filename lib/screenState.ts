import { NativeEventEmitter, NativeModules, Platform } from "react-native";

type ScreenStateEvent = {
  isScreenOff: boolean;
};

type ScreenStateModuleType = {
  isScreenOff: () => Promise<boolean>;
};

const nativeScreenState = NativeModules.ScreenState as ScreenStateModuleType | undefined;
const screenStateEmitter =
  Platform.OS === "android" && nativeScreenState
    ? new NativeEventEmitter(NativeModules.ScreenState)
    : null;

let screenOff = false;

export async function refreshScreenOffState() {
  if (Platform.OS !== "android" || !nativeScreenState) {
    screenOff = false;
    return false;
  }

  try {
    screenOff = await nativeScreenState.isScreenOff();
  } catch {
    screenOff = false;
  }

  return screenOff;
}

export function getScreenOffState() {
  return screenOff;
}

export function subscribeToScreenState(
  listener: (event: ScreenStateEvent) => void
) {
  if (!screenStateEmitter) {
    return { remove: () => {} };
  }

  return screenStateEmitter.addListener("ScreenStateChanged", (event) => {
    screenOff = Boolean(event?.isScreenOff);
    listener({ isScreenOff: screenOff });
  });
}
