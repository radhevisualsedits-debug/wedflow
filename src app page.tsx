import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCHoQgAaP97-lY0MQAR5kh_uPFZLlqsqTY",
  authDomain: "wedflow-c0f6a.firebaseapp.com",
  projectId: "wedflow-c0f6a",
  storageBucket: "wedflow-c0f6a.firebasestorage.app",
  messagingSenderId: "393608472644",
  appId: "1:393608472644:web:8cb052a6980454a2757411",
  measurementId: "G-2BTR13CS73",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);