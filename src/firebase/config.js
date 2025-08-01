// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDBzlclGbG2l1N5oKnqp36bmy4b-KtfsaQ",
  authDomain: "event-management-90b33.firebaseapp.com",
  projectId: "event-management-90b33",
  storageBucket: "event-management-90b33.firebasestorage.app",
  messagingSenderId: "356397508262",
  appId: "1:356397508262:web:38154678050b1a97527667",
  measurementId: "G-7KG9H99MVD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Simple Firestore configuration without complex offline handling

export { auth, db, storage, analytics };
export default app;
