// Collection sync service - handles syncing collections with Firestore
import type { Collection, Recipe, Visibility } from '../types/Recipe';
import { isAccessible, isDiscoverable, migrateVisibility } from '../types/Recipe';
import {
  getGlobalDocument,
  setGlobalDocument,
} from './firestore';
import { doc, increment, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from './config';
import { getUserId } from './auth';
import { generateShareId } from '../utils/shareUtils';
import { setRecipeVisibility } from './recipeSync';

// Collection name for globally shared collections
const COLLECTIONS_COLLECTION = 'collections';

// Session-based deduplication for stats to prevent inflation
const viewedCollectionsInSession = new Set<string>();
const copiedCollectionsInSession = new Set<string>();

// Create a new collection
export const createCollection = async (
  name: string = 'My Recipes',
  description?: string,
  visibility: Visibility = 'private'
): Promise<Collection> => {
  const ownerId = getUserId();
  const id = generateShareId();
  const now = Date.now();

  const collection: Collection = {
    id,
    ownerId,
    name,
    visibility,
    isPublic: isAccessible(visibility), // Backward compat
    recipeIds: [],
    createdAt: now,
    updatedAt: now,
    stats: { views: 0, recipesCopied: 0 },
  };

  // Only add optional fields if they have values
  if (description) {
    collection.description = description;
  }

  await setGlobalDocument(COLLECTIONS_COLLECTION, id, collection);
  return collection;
};

// Get a collection by ID
export const getCollection = async (
  collectionId: string
): Promise<Collection | null> => {
  try {
    return await getGlobalDocument<Collection>(COLLECTIONS_COLLECTION, collectionId);
  } catch (error) {
    console.error('Failed to get collection:', error);
    return null;
  }
};

// Update a collection
export const updateCollection = async (
  collectionId: string,
  updates: Partial<Omit<Collection, 'id' | 'ownerId' | 'createdAt' | 'stats'>>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS_COLLECTION, collectionId);

    // Verify ownership before attempting update
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Collection not found');
    }
    if (docSnap.data()?.ownerId !== getUserId()) {
      throw new Error('Not authorized to update this collection');
    }

    // Filter out undefined values
    const cleanUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await updateDoc(docRef, cleanUpdates);
  } catch (error) {
    console.error('Failed to update collection:', error);
    throw error;
  }
};

// Delete a collection
export const deleteCollection = async (collectionId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS_COLLECTION, collectionId);

    // Verify ownership before attempting delete
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Collection not found');
    }
    if (docSnap.data()?.ownerId !== getUserId()) {
      throw new Error('Not authorized to delete this collection');
    }

    await deleteDoc(docRef);
  } catch (error) {
    console.error('Failed to delete collection:', error);
    throw error;
  }
};

// Add a recipe to a collection
// If collection is accessible and recipe is not, auto-set recipe to match collection visibility
export const addRecipeToCollection = async (
  collectionId: string,
  recipeId: string,
  recipe?: Recipe
): Promise<{ recipeVisibilityChanged: boolean; newVisibility?: Visibility }> => {
  try {
    const collectionData = await getCollection(collectionId);
    if (!collectionData) {
      throw new Error('Collection not found');
    }

    // Don't add duplicates
    if (collectionData.recipeIds.includes(recipeId)) {
      return { recipeVisibilityChanged: false };
    }

    let recipeVisibilityChanged = false;
    let newVisibility: Visibility | undefined;

    // Get collection visibility
    const collectionVisibility = collectionData.visibility ?? migrateVisibility(collectionData.isPublic);

    // If collection is accessible (public/unlisted) and recipe is not accessible, auto-set to match
    if (recipe && isAccessible(collectionVisibility)) {
      const recipeVisibility = recipe.visibility ?? migrateVisibility(recipe.isPublic);
      if (!isAccessible(recipeVisibility)) {
        // Set recipe to same visibility as collection
        await setRecipeVisibility(recipe, collectionVisibility);
        recipeVisibilityChanged = true;
        newVisibility = collectionVisibility;
      }
    }

    const newRecipeIds = [...collectionData.recipeIds, recipeId];
    await updateCollection(collectionId, { recipeIds: newRecipeIds });

    return { recipeVisibilityChanged, newVisibility };
  } catch (error) {
    console.error('Failed to add recipe to collection:', error);
    throw error;
  }
};

// Remove a recipe from a collection
export const removeRecipeFromCollection = async (
  collectionId: string,
  recipeId: string
): Promise<void> => {
  try {
    const collection = await getCollection(collectionId);
    if (!collection) {
      throw new Error('Collection not found');
    }

    const newRecipeIds = collection.recipeIds.filter((id) => id !== recipeId);
    await updateCollection(collectionId, { recipeIds: newRecipeIds });
  } catch (error) {
    console.error('Failed to remove recipe from collection:', error);
    throw error;
  }
};

// Reorder recipes in a collection
export const reorderCollectionRecipes = async (
  collectionId: string,
  newRecipeIds: string[]
): Promise<void> => {
  try {
    await updateCollection(collectionId, { recipeIds: newRecipeIds });
  } catch (error) {
    console.error('Failed to reorder collection recipes:', error);
    throw error;
  }
};

// Increment view count for a collection (deduplicated per session)
export const incrementCollectionViews = async (collectionId: string): Promise<void> => {
  // Deduplicate within session to prevent stats inflation
  if (viewedCollectionsInSession.has(collectionId)) {
    return;
  }
  viewedCollectionsInSession.add(collectionId);

  try {
    const docRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    await updateDoc(docRef, {
      'stats.views': increment(1),
    });
  } catch (error) {
    console.error('Failed to increment collection views:', error);
    // Non-critical, don't throw
  }
};

// Increment recipes copied count for a collection (deduplicated per session)
export const incrementCollectionRecipesCopied = async (
  collectionId: string
): Promise<void> => {
  // Deduplicate within session to prevent stats inflation
  if (copiedCollectionsInSession.has(collectionId)) {
    return;
  }
  copiedCollectionsInSession.add(collectionId);

  try {
    const docRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    await updateDoc(docRef, {
      'stats.recipesCopied': increment(1),
    });
  } catch (error) {
    console.error('Failed to increment collection recipes copied:', error);
    // Non-critical, don't throw
  }
};

// Get all collections for a user
export const getUserCollections = async (userId: string): Promise<Collection[]> => {
  try {
    const collectionsRef = collection(db, COLLECTIONS_COLLECTION);
    const q = query(collectionsRef, where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    const collections: Collection[] = [];
    snapshot.forEach((doc) => {
      collections.push(doc.data() as Collection);
    });
    // Sort by updatedAt descending (most recent first)
    return collections.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('Failed to get user collections:', error);
    return [];
  }
};

// Subscribe to a user's collections (for real-time updates)
// Uses query-based subscription to only fetch this user's collections
export const subscribeToUserCollections = (
  userId: string,
  onUpdate: (collections: Collection[]) => void
): (() => void) => {
  const q = query(
    collection(db, COLLECTIONS_COLLECTION),
    where('ownerId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const collections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Collection));
    // Sort by updatedAt descending (most recent first)
    collections.sort((a, b) => b.updatedAt - a.updatedAt);
    onUpdate(collections);
  });
};

// Get user's default collection (create if doesn't exist)
export const getOrCreateDefaultCollection = async (
  ownerName?: string,
  ownerAvatar?: string
): Promise<Collection> => {
  // Create a new default collection (private by default)
  const newCollection = await createCollection('My Recipes', undefined, 'private');

  // Update with owner info if provided
  if (ownerName || ownerAvatar) {
    const updates: Partial<Collection> = {};
    if (ownerName) updates.ownerName = ownerName;
    if (ownerAvatar) updates.ownerAvatar = ownerAvatar;
    await updateCollection(newCollection.id, updates);
  }

  return newCollection;
};

// Sync all recipes to a collection (used for initial sync of existing recipes)
export const syncAllRecipesToCollection = async (
  collectionId: string,
  recipeIds: string[]
): Promise<void> => {
  if (recipeIds.length === 0) return;

  try {
    const existingCollection = await getCollection(collectionId);
    if (!existingCollection) {
      throw new Error('Collection not found');
    }

    // Merge existing recipe IDs with new ones, avoiding duplicates
    const existingIds = new Set(existingCollection.recipeIds);
    const newIds = recipeIds.filter((id) => !existingIds.has(id));

    if (newIds.length === 0) return;

    const mergedRecipeIds = [...existingCollection.recipeIds, ...newIds];
    await updateCollection(collectionId, { recipeIds: mergedRecipeIds });
  } catch (error) {
    console.error('Failed to sync recipes to collection:', error);
    throw error;
  }
};

// Fetch recipes for a collection, respecting visibility
// Owner sees ALL recipes, non-owner only sees accessible (public/unlisted) recipes
// Uses batch fetch with 'in' queries to avoid N+1 pattern
export const getCollectionRecipes = async (
  collectionData: Collection,
  viewerId: string | null,
  ownerRecipes?: Recipe[]
): Promise<Recipe[]> => {
  const isOwner = viewerId === collectionData.ownerId;

  if (isOwner && ownerRecipes) {
    // Owner: get recipes from local store (passed in)
    return collectionData.recipeIds
      .map((id) => ownerRecipes.find((r) => r.id === id))
      .filter((r): r is Recipe => r !== undefined);
  }

  const recipeIds = collectionData.recipeIds;
  if (recipeIds.length === 0) return [];

  // Non-owner: batch fetch accessible recipes using 'in' queries
  // Firestore 'in' query limit is 30
  const BATCH_SIZE = 30;
  const recipes: Recipe[] = [];

  for (let i = 0; i < recipeIds.length; i += BATCH_SIZE) {
    const chunk = recipeIds.slice(i, i + BATCH_SIZE);

    // Use individual getDoc calls (not a query) so unauthenticated users can access
    // public collections — Firestore rules allow `get` on accessibleRecipes for all,
    // but require auth for list/query operations.
    const fullRecipePromises = chunk.map(async (recipeId) => {
      const indexDocRef = doc(db, 'accessibleRecipes', recipeId);
      const indexSnap = await getDoc(indexDocRef);
      if (!indexSnap.exists()) return null;

      const indexData = indexSnap.data();
      // Fetch from owner's collection
      const recipeDocRef = doc(db, `users/${indexData.ownerId}/recipes/${recipeId}`);
      const recipeSnap = await getDoc(recipeDocRef);
      if (!recipeSnap.exists()) return null;
      return { id: recipeSnap.id, ...recipeSnap.data() } as Recipe;
    });

    const fullRecipes = await Promise.all(fullRecipePromises);
    recipes.push(...fullRecipes.filter((r): r is Recipe => r !== null));
  }

  return recipes;
};

// Get all public (discoverable) collections that contain a specific recipe
export const getPublicCollectionsContainingRecipe = async (
  recipeId: string
): Promise<Collection[]> => {
  try {
    const collectionsRef = collection(db, COLLECTIONS_COLLECTION);
    // Query for visibility === 'public' (new field)
    const visibilityQuery = query(
      collectionsRef,
      where('visibility', '==', 'public'),
      where('recipeIds', 'array-contains', recipeId)
    );
    // Also query for isPublic === true (backward compat for old docs without visibility)
    const legacyQuery = query(
      collectionsRef,
      where('isPublic', '==', true),
      where('recipeIds', 'array-contains', recipeId)
    );

    const [visibilitySnapshot, legacySnapshot] = await Promise.all([
      getDocs(visibilityQuery),
      getDocs(legacyQuery),
    ]);

    const collectionsMap = new Map<string, Collection>();

    visibilitySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as Collection;
      collectionsMap.set(data.id, data);
    });

    legacySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as Collection;
      // Only add if it's actually public (visibility check)
      const visibility = data.visibility ?? migrateVisibility(data.isPublic);
      if (isDiscoverable(visibility) && !collectionsMap.has(data.id)) {
        collectionsMap.set(data.id, data);
      }
    });

    return Array.from(collectionsMap.values());
  } catch (error) {
    console.error('Failed to get public collections containing recipe:', error);
    return [];
  }
};
