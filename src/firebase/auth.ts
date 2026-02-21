import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './config';

const googleProvider = new GoogleAuthProvider();

// Sign in with Google popup
export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

// Sign out
export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

// Get current user (null if not signed in)
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Subscribe to auth state changes
export const onAuthChange = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

// Get user ID (throws if not signed in)
export const getUserId = (): string => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not signed in');
  }
  return user.uid;
};

// Check if user is signed in
export const isSignedIn = (): boolean => {
  return auth.currentUser !== null;
};
