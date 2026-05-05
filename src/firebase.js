import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAlaxDaLBab72msF3AkjO-nHwIWMB9oRSo",
  authDomain: "pro-believer-cd0e7.firebaseapp.com",
  projectId: "pro-believer-cd0e7",
  storageBucket: "pro-believer-cd0e7.firebasestorage.app",
  messagingSenderId: "519303050245",
  appId: "1:519303050245:web:8a491f904e39fb1cf6986c",
  measurementId: "G-R1T7BQ0LR8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
