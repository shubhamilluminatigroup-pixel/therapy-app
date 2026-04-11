export type { Session, SessionProgress } from "./backend";

export type EnrollmentWithProgress = {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string | null;
  paymentStatus: string;
  sessionProgress?: import("./backend").SessionProgress;
};
