import React, { memo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Session, SessionProgress } from "../types/sessions";
import MediaPlayer from "./MediaPlayer";

type SessionItemProps = {
  session: Session;
  progress?: SessionProgress[string];
  onProgressUpdate: (sessionId: string, position: number, completed: boolean, totalDuration?: number) => void;
};

function SessionItemComponent({
  session,
  progress,
  onProgressUpdate,
}: SessionItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleProgressUpdate = (position: number, completed: boolean, totalDuration?: number) => {
    onProgressUpdate(session.id, position, completed, totalDuration);
  };

  const actualDuration = progress?.totalDuration || session.duration;
  const completionPercentage =
    progress && actualDuration > 0
      ? Math.min((progress.lastPosition / actualDuration) * 100, 100)
      : 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded((current) => !current)}
      >
        <View style={styles.headerLeft}>
          <View style={styles.sessionNumber}>
            <Text style={styles.sessionNumberText}>{session.order}</Text>
          </View>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTitle}>{session.title}</Text>
            <Text style={styles.sessionDuration}>
              {session.mediaType === "video" ? "Video session" : "Audio session"} ·{" "}
              {Math.floor(actualDuration / 60)}:
              {(Math.floor(actualDuration) % 60).toString().padStart(2, "0")}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {progress?.completed ? <Text style={styles.completedIcon}>Done</Text> : null}
          <Text style={styles.expandIcon}>{isExpanded ? "-" : "+"}</Text>
        </View>
      </TouchableOpacity>

      {progress && !progress.completed ? (
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${completionPercentage}%` }]}
          />
          <Text style={styles.progressText}>
            {completionPercentage.toFixed(0)}% complete
          </Text>
        </View>
      ) : null}

      {isExpanded ? (
        <View style={styles.expandedContent}>
          {session.description ? (
            <Text style={styles.description}>{session.description}</Text>
          ) : null}

          <MediaPlayer
            sessionId={`${session.courseId}:${session.id}`}
            mediaUrl={session.audioUrl}
            mediaType={session.mediaType}
            title={session.title}
            duration={session.duration}
            initialPosition={progress?.lastPosition || 0}
            isCompleted={progress?.completed || false}
            onProgressUpdate={handleProgressUpdate}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 12,
  },
  sessionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sessionNumberText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  sessionDuration: {
    fontSize: 14,
    color: "#6b7280",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  completedIcon: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "700",
  },
  expandIcon: {
    fontSize: 20,
    color: "#6b7280",
    fontWeight: "600",
    minWidth: 16,
    textAlign: "center",
  },
  progressBar: {
    height: 24,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    justifyContent: "center",
    position: "relative",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    position: "absolute",
    left: 0,
    top: 0,
  },
  progressText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
    textAlign: "center",
  },
  expandedContent: {
    padding: 16,
    paddingTop: 0,
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 8,
  },
});

const SessionItem = memo(SessionItemComponent);

export default SessionItem;
