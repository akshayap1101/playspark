// Firebase is entirely optional. If the VITE_FIREBASE_* env vars aren't set,
// the app silently runs on localStorage only — nothing breaks.
import { initializeApp } from '@firebase/app'
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from '@firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const isConfigured = Boolean(config.apiKey && config.projectId)

let db = null
if (isConfigured) {
  try {
    const app = initializeApp(config)
    db = getFirestore(app)
  } catch (err) {
    console.warn('Firebase init failed, falling back to local-only mode.', err)
    db = null
  }
}

export const firebaseEnabled = Boolean(db)

/**
 * Logs a feedback event to Firestore ("ideaFeedback" collection) if Firebase
 * is configured. No-ops otherwise. Never throws — feedback is always saved
 * locally regardless (see lib/recommend.js), this is just a bonus cloud copy.
 */
export async function logFeedbackToCloud({ ideaId, title, age, type, assistance, worked }) {
  if (!db) return
  try {
    await addDoc(collection(db, 'ideaFeedback'), {
      ideaId,
      title,
      age,
      type,
      assistance,
      worked,
      createdAt: serverTimestamp(),
    })
  } catch (err) {
    console.warn('Could not write feedback to Firestore:', err)
  }
}
