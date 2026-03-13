const { initializeApp } = require("firebase/app");
const { getAuth, GoogleAuthProvider } = require("firebase/auth");
const { getFirestore } = require("firebase/firestore");
const { getStorage } = require("firebase/storage");

const firebaseConfig = {
  apiKey: "AIzaSyAKQVDRTt5i5i0cNyrSxxW_N-S1vpwm4Ec",
  authDomain: "valsco-jurident.firebaseapp.com",
  projectId: "valsco-jurident",
  storageBucket: "valsco-jurident.firebasestorage.app",
  messagingSenderId: "596718606544",
  appId: "1:596718606544:web:4dc72fd5ccab6b72bd66d5",
  measurementId: "G-CVM890582X",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/calendar.readonly");
const storage = getStorage(app);

module.exports = { auth, db, googleProvider, storage, app };
