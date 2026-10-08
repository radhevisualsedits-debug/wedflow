import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCHoQgAaP97-lY0MQAR5kh_uPFZLlqsqTY",
  authDomain: "wedflow-c0f6a.firebaseapp.com",
  projectId: "wedflow-c0f6a",
  storageBucket: "wedflow-c0f6a.firebasestorage.app",
  messagingSenderId: "393608472644",
  appId: "1:393608472644:web:8cb052a6980454a2757411",
};

export const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = getAuth(app);

if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Firebase persistence error:", error);
  });
}