import Slider from "@react-native-community/slider";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { downloadProtectedMedia, getCachedMediaUri } from "../lib/mediaCache";
import { useAuthUid } from "../lib/useAuth";

type MediaPlayerProps = {
  sessionId: string;
  mediaUrl: string;
  mediaType?: "audio" | "video";
  title: string;
  duration: number;
  onProgressUpdate?: (position: number, completed: boolean) => void;
  initialPosition?: number;
  isCompleted?: boolean;
};

type LoadedMediaSurfaceProps = {
  mediaUri: string;
  mediaType: "audio" | "video";
  title: string;
  duration: number;
  initialPosition: number;
  isCompleted: boolean;
  downloaded: boolean;
  onProgressUpdate?: (position: number, completed: boolean) => void;
};

function buildPlayerSource(mediaUri: string) {
  const cleanUri = mediaUri.toLowerCase().split("?")[0] ?? "";
  let contentType: "auto" | "progressive" | "hls" = "auto";

  if (cleanUri.endsWith(".m3u8")) {
    contentType = "hls";
  } else if (/\.(mp3|m4a|aac|wav|ogg|mp4|mov|m4v|webm|mkv)$/.test(cleanUri)) {
    contentType = "progressive";
  }

  return { uri: mediaUri, contentType };
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function LoadedMediaSurfaceComponent({
  mediaUri,
  mediaType,
  title,
  duration,
  initialPosition,
  isCompleted,
  downloaded,
  onProgressUpdate,
}: LoadedMediaSurfaceProps) {
  const uid = useAuthUid();
  const [position, setPosition] = useState(initialPosition);
  const [resolvedDuration, setResolvedDuration] = useState(duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pendingPlay, setPendingPlay] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lastSavedRef = useRef(0);
  const latestPositionRef = useRef(initialPosition);
  const latestDurationRef = useRef(duration);
  const pendingPlayRef = useRef(false);
  const progressCallbackRef = useRef(onProgressUpdate);

  const playerSource = useMemo(() => buildPlayerSource(mediaUri), [mediaUri]);
  const player = useVideoPlayer(playerSource, (videoPlayer) => {
    videoPlayer.timeUpdateEventInterval = 1;
    videoPlayer.loop = false;
    videoPlayer.muted = false;
    videoPlayer.audioMixingMode = "auto";
    videoPlayer.staysActiveInBackground = true;
    videoPlayer.showNowPlayingNotification = mediaType === "audio";
  });

  useEffect(() => {
    latestPositionRef.current = position;
  }, [position]);

  useEffect(() => {
    latestDurationRef.current = resolvedDuration;
  }, [resolvedDuration]);

  useEffect(() => {
    pendingPlayRef.current = pendingPlay;
  }, [pendingPlay]);

  useEffect(() => {
    progressCallbackRef.current = onProgressUpdate;
  }, [onProgressUpdate]);

  useEffect(() => {
    const subscriptions = [
      player.addListener("timeUpdate", ({ currentTime }) => {
        setPosition(currentTime || 0);
      }),
      player.addListener("playingChange", ({ isPlaying: nextIsPlaying }) => {
        setIsPlaying(Boolean(nextIsPlaying));
      }),
      player.addListener("statusChange", ({ status, error }) => {
        if (status === "readyToPlay") {
          setIsLoaded(true);
          setLoadError(null);
          if (pendingPlayRef.current) {
            pendingPlayRef.current = false;
            setPendingPlay(false);
            player.play();
          }
        }

        if (status === "error") {
          setLoadError(error?.message || "Unable to load this media file.");
          setPendingPlay(false);
          setIsPlaying(false);
        }
      }),
      player.addListener("sourceLoad", ({ duration: loadedDuration }) => {
        setResolvedDuration(loadedDuration || duration || 0);
        setIsLoaded(true);
        setLoadError(null);
        if (initialPosition > 0) {
          player.currentTime = initialPosition;
        }
      }),
      player.addListener("playToEnd", () => {
        setIsPlaying(false);
        progressCallbackRef.current?.(
          latestDurationRef.current || duration || latestPositionRef.current,
          true
        );
      }),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [duration, initialPosition, player]);

  useEffect(() => {
    if (!onProgressUpdate || !uid) return;
    if (isPlaying && Math.abs(position - lastSavedRef.current) >= 10) {
      lastSavedRef.current = position;
      onProgressUpdate(position, false);
    }
  }, [isPlaying, onProgressUpdate, position, uid]);

  const togglePlayback = () => {
    if (loadError) {
      Alert.alert("Playback error", loadError);
      return;
    }

    if (!isLoaded) {
      setPendingPlay(true);
      return;
    }

    if (isPlaying) {
      setPendingPlay(false);
      player.pause();
    } else {
      player.play();
    }
  };

  const handleSeek = (value: number) => {
    player.currentTime = value;
    setPosition(value);
  };

  return (
    <>
      {mediaType === "video" ? (
        <View style={styles.videoWrap}>
          <VideoView
            player={player}
            style={styles.video}
            nativeControls
            contentFit="contain"
            allowsFullscreen
          />
        </View>
      ) : (
        <>
          <View style={styles.audioHeader}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {isCompleted ? <Text style={styles.completedBadge}>Completed</Text> : null}
          </View>
          <View style={styles.audioSurfaceWrap}>
            <VideoView
              player={player}
              style={styles.audioSurface}
              nativeControls={false}
              contentFit="contain"
            />
          </View>
        </>
      )}

      <View style={styles.controls}>
        <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
          <Text style={styles.playButtonText}>{isPlaying ? "Pause" : "Play"}</Text>
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={Math.max(resolvedDuration, 1)}
            value={Math.min(position, Math.max(resolvedDuration, 1))}
            onSlidingComplete={handleSeek}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor="#d1d5db"
          />
          <Text style={styles.timeText}>{formatTime(resolvedDuration)}</Text>
        </View>
      </View>

      {loadError ? (
        <Text style={styles.helperText}>{loadError}</Text>
      ) : !isLoaded ? (
        <Text style={styles.helperText}>
          {pendingPlay ? `Loading secure ${mediaType} player...` : `Tap play to start this ${mediaType} session.`}
        </Text>
      ) : downloaded ? (
        <Text style={styles.helperText}>Saved in app-only protected storage for offline playback.</Text>
      ) : (
        <Text style={styles.helperText}>Download to keep this session available offline inside the app.</Text>
      )}
    </>
  );
}

function MediaPlayerComponent({
  sessionId,
  mediaUrl,
  mediaType = "audio",
  title,
  duration,
  onProgressUpdate,
  initialPosition = 0,
  isCompleted = false,
}: MediaPlayerProps) {
  const [playableUri, setPlayableUri] = useState("");
  const [loadingSource, setLoadingSource] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    let active = true;

    const loadLocalMedia = async () => {
      try {
        setLoadingSource(true);
        const cachedUri = await getCachedMediaUri(sessionId);
        if (!active) return;

        if (cachedUri) {
          setPlayableUri(cachedUri);
          setDownloaded(true);
        } else {
          setPlayableUri(mediaUrl);
          setDownloaded(false);
        }
      } catch {
        if (!active) return;
        setPlayableUri(mediaUrl);
        setDownloaded(false);
      } finally {
        if (active) {
          setLoadingSource(false);
        }
      }
    };

    void loadLocalMedia();

    return () => {
      active = false;
    };
  }, [mediaUrl, sessionId]);

  const handleDownload = async () => {
    if (!mediaUrl || downloading) return;

    try {
      setDownloading(true);
      const localUri = await downloadProtectedMedia(sessionId, mediaUrl);
      setPlayableUri(localUri);
      setDownloaded(true);
      Alert.alert("Saved offline", "This session is now available inside the app without internet.");
    } catch (error) {
      Alert.alert("Download failed", error instanceof Error ? error.message : "Unable to download this session.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.metaWrap}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{mediaType === "video" ? "VIDEO" : "AUDIO"}</Text>
          </View>
          {downloaded ? (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>OFFLINE</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.downloadButton, downloading && styles.downloadButtonDisabled]}
          onPress={handleDownload}
          disabled={downloading || !mediaUrl}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <Text style={styles.downloadButtonText}>{downloaded ? "Downloaded" : "Download"}</Text>
          )}
        </TouchableOpacity>
      </View>

      {loadingSource ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color="#0f172a" />
          <Text style={styles.helperText}>Preparing secure media...</Text>
        </View>
      ) : playableUri ? (
        <LoadedMediaSurfaceComponent
          mediaUri={playableUri}
          mediaType={mediaType}
          title={title}
          duration={duration}
          initialPosition={initialPosition}
          isCompleted={isCompleted}
          downloaded={downloaded}
          onProgressUpdate={onProgressUpdate}
        />
      ) : (
        <Text style={styles.helperText}>This session media is not available right now.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  metaWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  typeBadge: {
    backgroundColor: "#dbeafe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typeBadgeText: {
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: "800",
  },
  offlineBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  offlineBadgeText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "800",
  },
  downloadButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  downloadButtonDisabled: {
    opacity: 0.7,
  },
  downloadButtonText: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
  },
  loaderWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  audioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  completedBadge: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "600",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  videoWrap: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#020617",
    marginBottom: 12,
  },
  video: {
    width: "100%",
    height: "100%",
    backgroundColor: "#020617",
  },
  audioSurfaceWrap: {
    width: "100%",
    height: 52,
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  audioSurface: {
    width: "100%",
    height: 52,
  },
  controls: {
    alignItems: "center",
  },
  playButton: {
    width: 90,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  playButtonText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "700",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  timeText: {
    fontSize: 12,
    color: "#6b7280",
    width: 40,
    textAlign: "center",
  },
  slider: {
    flex: 1,
    height: 40,
  },
  helperText: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});

const MediaPlayer = memo(MediaPlayerComponent);

export default MediaPlayer;
