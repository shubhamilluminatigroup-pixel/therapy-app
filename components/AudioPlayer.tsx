import Slider from "@react-native-community/slider";
import React, { memo, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuthUid } from "../lib/useAuth";

type AudioPlayerProps = {
  sessionId: string;
  audioUrl: string;
  title: string;
  duration: number;
  onProgressUpdate?: (position: number, completed: boolean) => void;
  initialPosition?: number;
  isCompleted?: boolean;
};

function AudioPlayerComponent({
  audioUrl,
  title,
  duration,
  onProgressUpdate,
  initialPosition = 0,
  isCompleted = false,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [isSeeking, setIsSeeking] = useState(false);
  const uid = useAuthUid();

  useEffect(() => {
    if (!isPlaying || isSeeking) return;
    const interval = setInterval(() => {
      setPosition((current) => {
        const next = Math.min(current + 1, duration);
        if (next >= duration && duration > 0) {
          setIsPlaying(false);
          if (!isCompleted && onProgressUpdate) {
            onProgressUpdate(next, true);
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [duration, isCompleted, isPlaying, isSeeking, onProgressUpdate]);

  useEffect(() => {
    if (!isPlaying || !onProgressUpdate || !uid) return;
    const interval = setInterval(() => {
      onProgressUpdate(position, isCompleted);
    }, 10000);
    return () => clearInterval(interval);
  }, [isCompleted, isPlaying, onProgressUpdate, position, uid]);

  const togglePlayback = async () => {
    if (!audioUrl) return;
    setIsPlaying((current) => !current);
  };

  const onSliderValueChange = async (value: number) => {
    setIsSeeking(true);
    setPosition(value);
    setTimeout(() => setIsSeeking(false), 100);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {isCompleted ? <Text style={styles.completedBadge}>Completed</Text> : null}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.playButton, !audioUrl && styles.disabledButton]}
          onPress={togglePlayback}
          disabled={!audioUrl}
        >
          <Text style={styles.playButtonText}>{isPlaying ? "Pause" : "Play"}</Text>
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={Math.max(duration, 1)}
            value={Math.min(position, Math.max(duration, 1))}
            onValueChange={setPosition}
            onSlidingComplete={onSliderValueChange}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor="#d1d5db"
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>
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
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
  disabledButton: {
    opacity: 0.6,
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
});

const AudioPlayer = memo(AudioPlayerComponent);

export default AudioPlayer;
