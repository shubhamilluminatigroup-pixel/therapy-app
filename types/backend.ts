export type AppUser = {
  uid: string;
  email: string;
  fullName: string;
  phone?: string | null;
  isStaff?: boolean;
};

export type Course = {
  id: string;
  categoryId?: string;
  categoryName?: string;
  courseName?: string;
  subCourseName?: string;
  description?: string;
  detailedDescription?: string;
  language?: string;
  contentType?: string;
  isPaid?: boolean;
  price?: number;
  priceMonth?: number | null;
  isActive?: boolean;
  sortOrder?: number;
  instructor?: string | null;
  imageUrl?: string | null;
  demoVideoUrl?: string | null;
  validateFor?: number | null;
};

export type Session = {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  audioUrl: string;
  mediaType?: "audio" | "video";
  duration: number;
  order: number;
  isActive: boolean;
};

export type SessionProgress = {
  [sessionId: string]: {
    completed: boolean;
    lastPosition: number;
    completedAt?: string | null;
    totalDuration?: number;
  };
};

export type PurchaseHistoryItem = {
  id: string;
  courseId: string;
  courseName: string;
  amount: number;
  status: string;
  paymentId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
};

export type MyCourseItem = Course & {
  paymentStatus?: string;
  totalSessions?: number;
  completedSessions?: number;
  sessionProgress?: SessionProgress;
  enrolledAt?: string | null;
};

export type HomeCategoryGroup = {
  id: string;
  name: string;
  imageUrl?: string | null;
  courses: Course[];
};

export type HomeTopMediaItem = {
  id: string;
  url: string;
  courseId: string;
  courseName?: string;
  courseImageUrl?: string | null;
  sortOrder?: number;
};

export type AccountOverview = {
  user: AppUser;
  purchases: PurchaseHistoryItem[];
  myCourses: MyCourseItem[];
};

export interface FeedbackImageItem {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: string;
}

export interface CourseItem {
  id: string;
  name: string;
  screen_order: number;
  rating: number;
}
