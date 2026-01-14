import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyALvUtsh9ugyT40yfApmaY0b-fNCIT_b-E",
    authDomain: "muslim-5cbad.firebaseapp.com",
    projectId: "muslim-5cbad",
    storageBucket: "muslim-5cbad.firebasestorage.app",
    messagingSenderId: "489229557197",
    appId: "1:489229557197:web:758bb9bd6db96520ceb884"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
