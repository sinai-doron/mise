// Profile sync service - handles syncing user profile with Firestore
import type { UserProfile, ProfileUpdate } from '../types/UserProfile';
import {
  getDocument,
  setDocument,
  subscribeToDocument,
} from './firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';
import { getUserId } from './auth';

const PROFILE_COLLECTION = 'profile';
const PROFILE_DOC_ID = 'data';

// Load user profile from Firestore
export const loadProfile = async (): Promise<UserProfile | null> => {
  try {
    const profile = await getDocument<UserProfile>(PROFILE_COLLECTION, PROFILE_DOC_ID);
    return profile;
  } catch (error) {
    console.error('Failed to load profile from Firestore:', error);
    return null;
  }
};

// Save user profile to Firestore
export const saveProfile = async (profile: UserProfile): Promise<void> => {
  try {
    await setDocument(PROFILE_COLLECTION, PROFILE_DOC_ID, profile);
  } catch (error) {
    console.error('Failed to save profile to Firestore:', error);
    throw error;
  }
};

// Update profile with partial data
export const updateProfile = async (updates: ProfileUpdate): Promise<UserProfile> => {
  try {
    const currentProfile = await loadProfile();
    if (!currentProfile) {
      throw new Error('No profile found to update');
    }

    const updatedProfile: UserProfile = {
      ...currentProfile,
      ...updates,
      updatedAt: Date.now(),
    };

    await saveProfile(updatedProfile);
    return updatedProfile;
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw error;
  }
};

// Create initial profile from Firebase Auth user data
export const createInitialProfile = async (
  uid: string,
  displayName: string,
  email: string,
  photoUrl?: string
): Promise<UserProfile> => {
  const now = Date.now();
  const profile: UserProfile = {
    uid,
    displayName,
    email,
    avatarUrl: photoUrl,
    bio: '',
    createdAt: now,
    updatedAt: now,
  };

  await saveProfile(profile);
  return profile;
};

// Subscribe to profile changes (real-time sync)
export const subscribeToProfile = (
  onUpdate: (profile: UserProfile | null) => void
): (() => void) => {
  return subscribeToDocument<UserProfile>(
    PROFILE_COLLECTION,
    PROFILE_DOC_ID,
    onUpdate
  );
};

// Upload avatar image to Firebase Storage
export const uploadAvatar = async (file: File): Promise<string> => {
  try {
    const userId = getUserId();

    // Create a reference to the avatar file
    const avatarRef = ref(storage, `users/${userId}/avatar`);

    // Upload the file
    await uploadBytes(avatarRef, file);

    // Get the download URL
    const downloadUrl = await getDownloadURL(avatarRef);

    return downloadUrl;
  } catch (error) {
    console.error('Failed to upload avatar:', error);
    throw error;
  }
};

// Compress image before upload (client-side)
export const compressImage = async (file: File, maxWidth = 200, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};
