import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";

const sampleSessions = [
  {
    courseId: "", // Will be filled with actual course IDs
    title: "Session 1: Introduction to Mindfulness",
    description: "Learn the basics of mindfulness meditation and its benefits for mental health.",
    audioUrl: "https://example.com/audio/session1.mp3", // Replace with actual audio URLs
    duration: 1800, // 30 minutes in seconds
    order: 1,
    isActive: true,
  },
  {
    courseId: "", // Will be filled with actual course IDs
    title: "Session 2: Breathing Techniques",
    description: "Master different breathing techniques for stress relief and relaxation.",
    audioUrl: "https://example.com/audio/session2.mp3",
    duration: 2100, // 35 minutes
    order: 2,
    isActive: true,
  },
  {
    courseId: "", // Will be filled with actual course IDs
    title: "Session 3: Body Scan Meditation",
    description: "A guided body scan meditation to release tension and promote healing.",
    audioUrl: "https://example.com/audio/session3.mp3",
    duration: 2400, // 40 minutes
    order: 3,
    isActive: true,
  },
];

export const seedSessions = async () => {
  try {
    console.log("Seeding sessions...");

    // Get all courses
    const coursesSnapshot = await getDocs(collection(db, "courses"));
    const courses = coursesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    for (const course of courses) {
      // Check if sessions already exist for this course
      const existingSessionsQuery = query(
        collection(db, "sessions"),
        where("courseId", "==", course.id)
      );
      const existingSessions = await getDocs(existingSessionsQuery);

      if (existingSessions.empty) {
        console.log(`Adding sessions for course: ${(course as any).courseName || course.id}`);

        for (const session of sampleSessions) {
          await addDoc(collection(db, "sessions"), {
            ...session,
            courseId: course.id,
          });
        }
      }
    }

    console.log("Sessions seeded successfully!");
  } catch (error) {
    console.error("Error seeding sessions:", error);
  }
};

// For development: call this function to seed data
// seedSessions();