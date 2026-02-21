// Discover sync service - handles fetching public recipes and collections for discovery
import type { Recipe, Collection } from '../types/Recipe';
import { isDiscoverable, migrateVisibility } from '../types/Recipe';
import type { PublicRecipeIndex } from './recipeSync';
import { getAccessibleRecipeById } from './recipeSync';
import { db } from './config';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  where,
  type DocumentSnapshot,
} from 'firebase/firestore';

const PUBLIC_RECIPES_COLLECTION = 'publicRecipes';
const COLLECTIONS_COLLECTION = 'collections';

export type SortOption = 'recent' | 'popular';

export interface DiscoverRecipeResult {
  recipes: Recipe[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export interface DiscoverCollectionResult {
  collections: Collection[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

// Fetch public recipes for the discover page with pagination
export const getPublicRecipes = async (options: {
  pageSize?: number;
  startAfterDoc?: DocumentSnapshot | null;
  sortBy?: SortOption;
}): Promise<DiscoverRecipeResult> => {
  const { pageSize = 20, startAfterDoc, sortBy = 'recent' } = options;

  try {
    const publicRecipesRef = collection(db, PUBLIC_RECIPES_COLLECTION);

    // Determine sort field
    const sortField = sortBy === 'popular' ? 'views' : 'updatedAt';

    // Build query with pagination
    let q = query(
      publicRecipesRef,
      orderBy(sortField, 'desc'),
      limit(pageSize + 1)
    );

    if (startAfterDoc) {
      q = query(
        publicRecipesRef,
        orderBy(sortField, 'desc'),
        startAfter(startAfterDoc),
        limit(pageSize + 1)
      );
    }

    const snapshot = await getDocs(q);
    const docs = snapshot.docs;

    // Check if there are more results
    const hasMore = docs.length > pageSize;
    const docsToProcess = hasMore ? docs.slice(0, pageSize) : docs;

    // Get the last document for pagination
    const lastDoc = docsToProcess.length > 0 ? docsToProcess[docsToProcess.length - 1] : null;

    // Fetch full recipe data for each index entry
    const recipePromises = docsToProcess.map(async (doc) => {
      const indexData = doc.data() as PublicRecipeIndex;
      return getAccessibleRecipeById(indexData.recipeId);
    });

    const recipeResults = await Promise.all(recipePromises);

    // Filter out null results (recipes that no longer exist)
    const recipes = recipeResults.filter((r): r is Recipe => r !== null);

    return {
      recipes,
      lastDoc,
      hasMore,
    };
  } catch (error) {
    console.error('Failed to fetch public recipes:', error);
    return {
      recipes: [],
      lastDoc: null,
      hasMore: false,
    };
  }
};

// Fetch public collections for the discover page with pagination
// Handles both new 'visibility' field and legacy 'isPublic' field
export const getPublicCollections = async (options: {
  pageSize?: number;
  startAfterDoc?: DocumentSnapshot | null;
  sortBy?: SortOption;
}): Promise<DiscoverCollectionResult> => {
  const { pageSize = 20, sortBy = 'recent' } = options;

  try {
    const collectionsRef = collection(db, COLLECTIONS_COLLECTION);

    // Run two queries in parallel - one for new visibility field, one for legacy isPublic
    // Note: We don't use orderBy in the query to avoid requiring composite indexes
    // Sorting is done client-side instead
    const [visibilitySnapshot, legacySnapshot] = await Promise.all([
      getDocs(query(
        collectionsRef,
        where('visibility', '==', 'public'),
        limit(100) // Fetch enough to sort client-side
      )),
      getDocs(query(
        collectionsRef,
        where('isPublic', '==', true),
        limit(100)
      )),
    ]);

    console.log('[Discover] Visibility query returned:', visibilitySnapshot.docs.length, 'docs');
    console.log('[Discover] Legacy isPublic query returned:', legacySnapshot.docs.length, 'docs');

    // Merge results, avoiding duplicates
    const collectionsMap = new Map<string, { collection: Collection; sortValue: number }>();

    const processDoc = (docSnapshot: DocumentSnapshot) => {
      const data = docSnapshot.data() as Collection;
      console.log('[Discover] Processing collection:', data?.id, data?.name, 'visibility:', data?.visibility, 'isPublic:', data?.isPublic);
      if (!data) return;

      // Check if actually discoverable
      const visibility = data.visibility ?? migrateVisibility(data.isPublic);
      if (!isDiscoverable(visibility)) return;

      // Get sort value
      const sortValue = sortBy === 'popular'
        ? (data.stats?.views ?? 0)
        : (data.updatedAt ?? 0);

      // Only add if not already present
      if (!collectionsMap.has(data.id)) {
        collectionsMap.set(data.id, { collection: data, sortValue });
      }
    };

    visibilitySnapshot.docs.forEach(processDoc);
    legacySnapshot.docs.forEach(processDoc);

    // Sort by the appropriate field
    const sortedCollections = Array.from(collectionsMap.values())
      .sort((a, b) => b.sortValue - a.sortValue)
      .map(item => item.collection);

    // Apply pagination
    const paginatedCollections = sortedCollections.slice(0, pageSize);
    const hasMore = sortedCollections.length > pageSize;

    console.log('[Discover] Final collections count:', paginatedCollections.length);
    console.log('[Discover] Collections:', paginatedCollections.map(c => ({ id: c.id, name: c.name })));

    return {
      collections: paginatedCollections,
      lastDoc: null, // Pagination is handled client-side for merged queries
      hasMore,
    };
  } catch (error) {
    console.error('[Discover] Failed to fetch public collections:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('[Discover] Error message:', error.message);
      console.error('[Discover] Error stack:', error.stack);
    }
    return {
      collections: [],
      lastDoc: null,
      hasMore: false,
    };
  }
};
