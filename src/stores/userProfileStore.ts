import { create } from 'zustand';
import type { UserProfile, ProfileUpdate } from '../types/UserProfile';
import {
  loadProfile,
  saveProfile,
  createInitialProfile,
  subscribeToProfile,
  uploadAvatar,
  compressImage,
} from '../firebase/profileSync';
import {
  getOrCreateDefaultCollection,
  syncAllRecipesToCollection,
} from '../firebase/collectionSync';
import { isSignedIn, getCurrentUser } from '../firebase';
import { useRecipeStore } from './recipeStore';

interface UserProfileStore {
  // State
  profile: UserProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  initializeProfile: () => Promise<() => void>;
  updateProfile: (updates: ProfileUpdate) => Promise<void>;
  uploadAndSetAvatar: (file: File) => Promise<void>;
  clearError: () => void;
}

export const useUserProfileStore = create<UserProfileStore>((set, get) => ({
  // Initial state
  profile: null,
  isLoading: false,
  isSaving: false,
  error: null,

  // Initialize profile - loads from Firestore or creates new
  initializeProfile: async () => {
    if (!isSignedIn()) {
      return () => {};
    }

    set({ isLoading: true, error: null });

    try {
      const user = getCurrentUser();
      if (!user) {
        set({ isLoading: false });
        return () => {};
      }

      // Try to load existing profile
      let profile = await loadProfile();

      // If no profile exists, create one from Firebase Auth data
      if (!profile) {
        profile = await createInitialProfile(
          user.uid,
          user.displayName || 'User',
          user.email || '',
          user.photoURL || undefined
        );
      }

      // Create default collection if it doesn't exist
      if (!profile.defaultCollectionId) {
        try {
          const collection = await getOrCreateDefaultCollection(
            profile.displayName,
            profile.avatarUrl
          );
          profile = {
            ...profile,
            defaultCollectionId: collection.id,
            updatedAt: Date.now(),
          };
          await saveProfile(profile);
        } catch (error) {
          console.error('Failed to create default collection:', error);
        }
      }

      // Sync existing recipes to default collection
      if (profile.defaultCollectionId) {
        const recipes = useRecipeStore.getState().userRecipes;
        if (recipes.length > 0) {
          syncAllRecipesToCollection(
            profile.defaultCollectionId,
            recipes.map((r) => r.id)
          ).catch((err) =>
            console.error('Failed to sync recipes to default collection:', err)
          );
        }
      }

      set({ profile, isLoading: false });

      // Set up real-time listener
      const unsubscribe = subscribeToProfile((updatedProfile) => {
        if (updatedProfile) {
          set({ profile: updatedProfile });
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('Failed to initialize profile:', error);
      set({
        isLoading: false,
        error: (error as Error).message,
      });
      return () => {};
    }
  },

  // Update profile fields
  updateProfile: async (updates: ProfileUpdate) => {
    const currentProfile = get().profile;
    if (!currentProfile) {
      set({ error: 'No profile to update' });
      return;
    }

    set({ isSaving: true, error: null });

    try {
      const updatedProfile: UserProfile = {
        ...currentProfile,
        ...updates,
        updatedAt: Date.now(),
      };

      await saveProfile(updatedProfile);
      set({ profile: updatedProfile, isSaving: false });
    } catch (error) {
      console.error('Failed to update profile:', error);
      set({
        isSaving: false,
        error: (error as Error).message,
      });
      throw error;
    }
  },

  // Upload avatar and update profile
  uploadAndSetAvatar: async (file: File) => {
    set({ isSaving: true, error: null });

    try {
      // Compress the image first
      const compressedBlob = await compressImage(file, 200, 0.8);
      const compressedFile = new File([compressedBlob], 'avatar.jpg', {
        type: 'image/jpeg',
      });

      // Upload to Firebase Storage
      const avatarUrl = await uploadAvatar(compressedFile);

      // Update profile with new avatar URL
      await get().updateProfile({ avatarUrl });
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      set({
        isSaving: false,
        error: (error as Error).message,
      });
      throw error;
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
