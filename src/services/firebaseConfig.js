/* ==========================================================================
   FIREBASE CONFIGURATION SPECIFICATION
   College Faculty Secret Santa — St. Nicholas College
   ========================================================================== */

/**
 * Replace these placeholder keys with your actual Firebase Project credentials
 * from the Firebase Console (Project Settings > General > Your apps > Web app).
 * Alternatively, provide them via .env variables:
 *   VITE_FIREBASE_API_KEY=...
 *   VITE_FIREBASE_AUTH_DOMAIN=...
 *   VITE_FIREBASE_PROJECT_ID=...
 *   VITE_FIREBASE_STORAGE_BUCKET=...
 *   VITE_FIREBASE_MESSAGING_SENDER_ID=...
 *   VITE_FIREBASE_APP_ID=...
 */

const getEnvVar = (key) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
      return import.meta.env[key];
    }
  } catch (e) {
    // ignore
  }
  return undefined;
};

export const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || "YOUR_FIREBASE_API_KEY",
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || "st-nicholas-secret-santa.firebaseapp.com",
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || "st-nicholas-secret-santa",
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || "st-nicholas-secret-santa.appspot.com",
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || "123456789012",
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || "1:123456789012:web:abcdef123456"
};

/**
 * Checks whether active production Firebase credentials have been supplied.
 */
export function isFirebaseConfigured() {
  const key = firebaseConfig.apiKey;
  return key && key !== "YOUR_FIREBASE_API_KEY" && !key.startsWith("YOUR_");
}
