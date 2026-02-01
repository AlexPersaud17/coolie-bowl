import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyBk3wQt9SJYaRMDNHvmj-EdOsR8JGtiIng",
  authDomain: "coolie-bowl.firebaseapp.com",
  databaseURL: "https://coolie-bowl-default-rtdb.firebaseio.com",
  projectId: "coolie-bowl",
  storageBucket: "coolie-bowl.firebasestorage.app",
  messagingSenderId: "346287901753",
  appId: "1:346287901753:web:a7552e178d1af54803d1e8",
  measurementId: "G-3B3G9WGWP0"
};

const app = initializeApp(firebaseConfig)

export const db = getDatabase(app)
