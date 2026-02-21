import { create } from 'zustand';
import type { Collection } from '../types/Recipe';
import {
  getUserCollections,
  createCollection,
  deleteCollection,
  addRecipeToCollection,
  removeRecipeFromCollection,
} from '../firebase/collectionSync';
import { getUserId } from '../firebase/auth';
import { useUserProfileStore } from './userProfileStore';

interface CollectionsStore {
  collections: Collection[];
  isLoading: boolean;
  error: string | null;

  loadCollections: () => Promise<void>;
  createNewCollection: (name: string, description?: string) => Promise<Collection | null>;
  addRecipe: (collectionId: string, recipeId: string) => Promise<void>;
  removeRecipe: (collectionId: string, recipeId: string) => Promise<void>;
  removeCollection: (collectionId: string) => Promise<void>;
  getCollectionsForRecipe: (recipeId: string) => string[];
  getDefaultCollection: () => Collection | undefined;
}

export const useCollectionsStore = create<CollectionsStore>((set, get) => ({
  collections: [],
  isLoading: false,
  error: null,

  loadCollections: async () => {
    const userId = getUserId();
    if (!userId) return;

    set({ isLoading: true, error: null });
    try {
      const collections = await getUserCollections(userId);
      set({ collections, isLoading: false });
    } catch (error) {
      console.error('Failed to load collections:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load collections',
        isLoading: false,
      });
    }
  },

  createNewCollection: async (name: string, description?: string) => {
    set({ error: null });
    try {
      const collection = await createCollection(name, description, 'private');
      set((state) => ({
        collections: [collection, ...state.collections],
      }));
      return collection;
    } catch (error) {
      console.error('Failed to create collection:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to create collection',
      });
      return null;
    }
  },

  addRecipe: async (collectionId: string, recipeId: string) => {
    try {
      await addRecipeToCollection(collectionId, recipeId);
      // Update local state
      set((state) => ({
        collections: state.collections.map((c) =>
          c.id === collectionId
            ? { ...c, recipeIds: [...c.recipeIds, recipeId], updatedAt: Date.now() }
            : c
        ),
      }));
    } catch (error) {
      console.error('Failed to add recipe to collection:', error);
      throw error;
    }
  },

  removeRecipe: async (collectionId: string, recipeId: string) => {
    try {
      await removeRecipeFromCollection(collectionId, recipeId);
      // Update local state
      set((state) => ({
        collections: state.collections.map((c) =>
          c.id === collectionId
            ? { ...c, recipeIds: c.recipeIds.filter((id) => id !== recipeId), updatedAt: Date.now() }
            : c
        ),
      }));
    } catch (error) {
      console.error('Failed to remove recipe from collection:', error);
      throw error;
    }
  },

  removeCollection: async (collectionId: string) => {
    try {
      await deleteCollection(collectionId);
      set((state) => ({
        collections: state.collections.filter((c) => c.id !== collectionId),
      }));
    } catch (error) {
      console.error('Failed to delete collection:', error);
      throw error;
    }
  },

  getCollectionsForRecipe: (recipeId: string) => {
    return get()
      .collections.filter((c) => c.recipeIds.includes(recipeId))
      .map((c) => c.id);
  },

  getDefaultCollection: () => {
    const profile = useUserProfileStore.getState().profile;
    if (!profile?.defaultCollectionId) return undefined;
    return get().collections.find((c) => c.id === profile.defaultCollectionId);
  },
}));
