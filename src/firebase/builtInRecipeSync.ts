// Built-in recipe sync service - fetches from global Firestore collection
import type { Recipe } from '../types/Recipe';
import {
  getGlobalCollection,
  subscribeToGlobalCollection,
  setGlobalDocument,
} from './firestore';
import { builtInRecipes as localBuiltInRecipes } from '../data/mockRecipes';

// Global collection name (not user-scoped)
const BUILT_IN_RECIPES_COLLECTION = 'builtInRecipes';

// Cache for built-in recipes (to avoid repeated fetches)
let cachedBuiltInRecipes: Recipe[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Load built-in recipes from global Firestore collection
export const loadBuiltInRecipesFromFirestore = async (): Promise<Recipe[]> => {
  // Return cache if valid
  if (cachedBuiltInRecipes && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedBuiltInRecipes;
  }

  try {
    const recipes = await getGlobalCollection<Recipe>(BUILT_IN_RECIPES_COLLECTION);

    // If Firestore is empty, fall back to local recipes
    if (recipes.length === 0) {
      console.log('No built-in recipes in Firestore, using local fallback');
      return localBuiltInRecipes;
    }

    // Ensure all recipes have isBuiltIn flag
    const builtInRecipes = recipes.map((r) => ({ ...r, isBuiltIn: true }));

    // Update cache
    cachedBuiltInRecipes = builtInRecipes;
    cacheTimestamp = Date.now();

    return builtInRecipes;
  } catch (error) {
    console.error('Failed to load built-in recipes from Firestore:', error);
    // Fall back to local recipes on error
    return localBuiltInRecipes;
  }
};

// Subscribe to built-in recipe changes (real-time updates)
export const subscribeToBuiltInRecipes = (
  onUpdate: (recipes: Recipe[]) => void
): (() => void) => {
  return subscribeToGlobalCollection<Recipe>(
    BUILT_IN_RECIPES_COLLECTION,
    (recipes) => {
      // If empty, don't update (keep local fallback)
      if (recipes.length === 0) return;

      // Ensure all recipes have isBuiltIn flag
      const builtInRecipes = recipes.map((r) => ({ ...r, isBuiltIn: true }));

      // Update cache
      cachedBuiltInRecipes = builtInRecipes;
      cacheTimestamp = Date.now();

      onUpdate(builtInRecipes);
    }
  );
};

// Clear the cache (useful for testing or force refresh)
export const clearBuiltInRecipesCache = (): void => {
  cachedBuiltInRecipes = null;
  cacheTimestamp = 0;
};

// Seed built-in recipes to Firestore (admin use only)
// This should be run once to populate the collection
export const seedBuiltInRecipesToFirestore = async (): Promise<void> => {
  console.log('Seeding built-in recipes to Firestore...');

  try {
    for (const recipe of localBuiltInRecipes) {
      // Remove timestamps since Firestore will handle them
      const recipeData = {
        ...recipe,
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await setGlobalDocument(BUILT_IN_RECIPES_COLLECTION, recipe.id, recipeData);
      console.log(`Seeded: ${recipe.title}`);
    }

    console.log(`Successfully seeded ${localBuiltInRecipes.length} built-in recipes!`);
  } catch (error) {
    console.error('Failed to seed built-in recipes:', error);
    throw error;
  }
};
