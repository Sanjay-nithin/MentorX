// Firebase client setup using Vite env vars
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate config on load
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain) {
  console.error('[Firebase] ❌ Missing environment variables! Check your .env file');
  console.error('Required: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID');
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

export async function signInWithGoogle() {
  try {
    console.info('[Firebase] Opening Google popup...');
    const result = await signInWithPopup(auth, googleProvider);
    console.info('[Firebase] ✓ Sign-in successful:', result.user.email);
    return result;
  } catch (error) {
    console.error('[Firebase] ❌ Sign-in failed:', error.code, error.message);
    throw error;
  }
}
