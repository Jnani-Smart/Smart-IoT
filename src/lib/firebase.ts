import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBEoVLTwmsIZE7HryBcvj3UTgbC6qXy-NA",
  authDomain: "smart-iot-e87ac.firebaseapp.com",
  projectId: "smart-iot-e87ac",
  storageBucket: "smart-iot-e87ac.firebasestorage.app",
  messagingSenderId: "919398159936",
  appId: "1:919398159936:web:8a906ec9174fc61378f1a5",
  measurementId: "G-08XJDKZFJW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { googleProvider };