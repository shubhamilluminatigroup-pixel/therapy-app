import { addDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import seedCourses from "../data/mrc_courses_seed.json";

export async function seedMrcCourses() {
  const existing = await getDocs(collection(db, "courses"));
  if (!existing.empty) return;

  for (const course of seedCourses as Array<Record<string, unknown>>) {
    await addDoc(collection(db, "courses"), course);
  }
}
