import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { listCourseSessions } from "../lib/api";
import { Session, SessionProgress } from "../types/sessions";
import SessionItem from "./SessionItem";

type SessionListProps = {
  courseId: string;
  enrollmentId?: string;
  onProgressUpdate?: (sessionId: string, position: number, completed: boolean) => void;
};

export default function SessionList({
  courseId,
  enrollmentId,
  onProgressUpdate,
}: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionProgress, setSessionProgress] = useState<SessionProgress>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadSessions();
  }, [courseId]);

  useEffect(() => {
    if (enrollmentId) {
      void loadSessionProgress();
    }
  }, [enrollmentId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const sessionsData = (await listCourseSessions(courseId))
        .filter((session) => session.isActive !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      setSessions(sessionsData);
    } catch (error) {
      console.log("Load sessions error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionProgress = async () => {
    setSessionProgress({});
  };

  const handleProgressUpdate = (sessionId: string, position: number, completed: boolean) => {
    setSessionProgress((prev) => ({
      ...prev,
      [sessionId]: {
        completed,
        lastPosition: position,
        completedAt: completed ? new Date().toISOString() : undefined,
        totalDuration: sessions.find((s) => s.id === sessionId)?.duration || 0,
      },
    }));

    if (onProgressUpdate) {
      onProgressUpdate(sessionId, position, completed);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading sessions...</Text>
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No sessions available for this course yet.</Text>
      </View>
    );
  }

  const completedSessions = Object.values(sessionProgress).filter((p) => p.completed).length;
  const totalSessions = sessions.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Course Sessions</Text>
        <Text style={styles.progress}>
          {completedSessions}/{totalSessions} completed
        </Text>
      </View>

      <View style={styles.sessionsList}>
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            progress={sessionProgress[session.id]}
            onProgressUpdate={handleProgressUpdate}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  center: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    marginTop: 16,
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 16,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  progress: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  sessionsList: {
    gap: 8,
  },
});
