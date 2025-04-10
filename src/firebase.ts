// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCUCcHMzBzJkWGFqxm_VSC1fH6MUjpDQcc",
  authDomain: "harimidhu-shop.firebaseapp.com",
  projectId: "harimidhu-shop",
  storageBucket: "harimidhu-shop.appspot.com",
  messagingSenderId: "479567208537",
  appId: "1:479567208537:web:7ba5fe9dac34e1f9ab1148"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Collections
const customersCollection = collection(db, "customers");
const productsCollection = collection(db, "products");
const ordersCollection = collection(db, "orders");
const invoicesCollection = collection(db, "invoices");

// Cloudinary configuration
const cloudinaryConfig = {
  cloudName: "dmhowu6cg",
  uploadPreset: "harimidhu_products"
};

export { 
  auth, 
  db, 
  storage,
  customersCollection,
  productsCollection,
  ordersCollection,
  invoicesCollection,
  cloudinaryConfig
};
export default app;