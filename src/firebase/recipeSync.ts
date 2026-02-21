// Recipe sync service - handles syncing recipes with Firestore
import type { Recipe, GroceryItem, Visibility, ShoppingItem, PurchaseHistoryEntry } from '../types/Recipe';
import { isAccessible, isDiscoverable, migrateVisibility } from '../types/Recipe';
import {
  getCollection,
  setDocument,
  deleteDocument,
  subscribeToCollection,
  subscribeToDocument,
  setDocuments,
  getGlobalDocument,
  setGlobalDocument,
  orderBy,
} from './firestore';
import { limit } from 'firebase/firestore';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from './config';
import { getUserId } from './auth';

// Collection names
const RECIPES_COLLECTION = 'recipes';
const GROCERY_COLLECTION = 'groceryList';
const PUBLIC_RECIPES_COLLECTION = 'publicRecipes';
const ACCESSIBLE_RECIPES_COLLECTION = 'accessibleRecipes';
const SHOPPING_ITEMS_COLLECTION = 'shoppingItems';
const PURCHASE_HISTORY_COLLECTION = 'purchaseHistory';

// Session-based deduplication for stats to prevent inflation
const viewedRecipesInSession = new Set<string>();
const copiedRecipesInSession = new Set<string>();

// Data stored in the public recipes index
export interface PublicRecipeIndex {
  recipeId: string;
  ownerId: string;
  title: string;
  image?: string;
  updatedAt: number;
}

// Data stored in the accessible recipes index (public + unlisted)
export interface AccessibleRecipeIndex {
  recipeId: string;
  ownerId: string;
  visibility: Visibility;
  updatedAt: number;
}

// Types for Firestore data
interface RecipeSettings {
  servingsMap: Record<string, number>;
}

export interface UserPreferences {
  hideBuiltInRecipes: boolean;
}

// Load all user recipes from Firestore
export const loadRecipesFromFirestore = async (): Promise<Recipe[]> => {
  try {
    const recipes = await getCollection<Recipe>(RECIPES_COLLECTION);
    return recipes;
  } catch (error) {
    console.error('Failed to load recipes from Firestore:', error);
    return [];
  }
};

// Save a single recipe to Firestore
export const saveRecipeToFirestore = async (recipe: Recipe): Promise<void> => {
  try {
    await setDocument(RECIPES_COLLECTION, recipe.id, recipe);
  } catch (error) {
    console.error('Failed to save recipe to Firestore:', error);
    throw error;
  }
};

// Delete a recipe from Firestore
export const deleteRecipeFromFirestore = async (recipeId: string): Promise<void> => {
  try {
    await deleteDocument(RECIPES_COLLECTION, recipeId);
  } catch (error) {
    console.error('Failed to delete recipe from Firestore:', error);
    throw error;
  }
};

// Load grocery list from Firestore
export const loadGroceryListFromFirestore = async (): Promise<GroceryItem[]> => {
  try {
    const items = await getCollection<GroceryItem>(GROCERY_COLLECTION);
    return items;
  } catch (error) {
    console.error('Failed to load grocery list from Firestore:', error);
    return [];
  }
};

// Save grocery list to Firestore (batch operation)
export const saveGroceryListToFirestore = async (items: GroceryItem[]): Promise<void> => {
  try {
    // Convert array to the format expected by setDocuments
    const documents = items.map((item) => ({
      id: item.id,
      data: item,
    }));
    await setDocuments(GROCERY_COLLECTION, documents);
  } catch (error) {
    console.error('Failed to save grocery list to Firestore:', error);
    throw error;
  }
};

// Clear grocery list from Firestore
export const clearGroceryListFromFirestore = async (): Promise<void> => {
  try {
    const items = await getCollection<GroceryItem>(GROCERY_COLLECTION);
    await Promise.all(items.map((item) => deleteDocument(GROCERY_COLLECTION, item.id)));
  } catch (error) {
    console.error('Failed to clear grocery list from Firestore:', error);
    throw error;
  }
};

// Load servings map from Firestore
export const loadServingsMapFromFirestore = async (): Promise<Record<string, number>> => {
  try {
    const settings = await getCollection<RecipeSettings>('settings');
    const recipeSettings = settings.find((s) => (s as { id?: string }).id === 'recipe-settings');
    return recipeSettings?.servingsMap ?? {};
  } catch (error) {
    console.error('Failed to load servings map from Firestore:', error);
    return {};
  }
};

// Save servings map to Firestore
export const saveServingsMapToFirestore = async (servingsMap: Record<string, number>): Promise<void> => {
  try {
    await setDocument('settings', 'recipe-settings', { servingsMap });
  } catch (error) {
    console.error('Failed to save servings map to Firestore:', error);
    throw error;
  }
};

// Subscribe to recipe changes (real-time sync)
export const subscribeToRecipes = (
  onUpdate: (recipes: Recipe[]) => void
): (() => void) => {
  return subscribeToCollection<Recipe>(RECIPES_COLLECTION, onUpdate);
};

// Subscribe to grocery list changes (real-time sync)
export const subscribeToGroceryList = (
  onUpdate: (items: GroceryItem[]) => void
): (() => void) => {
  return subscribeToCollection<GroceryItem>(GROCERY_COLLECTION, onUpdate);
};

// Subscribe to servings map changes (real-time sync)
export const subscribeToServingsMap = (
  onUpdate: (servingsMap: Record<string, number>) => void
): (() => void) => {
  return subscribeToDocument<RecipeSettings>(
    'settings',
    'recipe-settings',
    (data) => {
      onUpdate(data?.servingsMap ?? {});
    }
  );
};

// Load user preferences from Firestore
export const loadUserPreferencesFromFirestore = async (): Promise<UserPreferences> => {
  try {
    const settings = await getCollection<UserPreferences & { id?: string }>('settings');
    const prefs = settings.find((s) => s.id === 'user-preferences');
    return {
      hideBuiltInRecipes: prefs?.hideBuiltInRecipes ?? false,
    };
  } catch (error) {
    console.error('Failed to load user preferences from Firestore:', error);
    return { hideBuiltInRecipes: false };
  }
};

// Save user preferences to Firestore
export const saveUserPreferencesToFirestore = async (preferences: UserPreferences): Promise<void> => {
  try {
    await setDocument('settings', 'user-preferences', preferences);
  } catch (error) {
    console.error('Failed to save user preferences to Firestore:', error);
    throw error;
  }
};

// Subscribe to user preferences changes (real-time sync)
export const subscribeToUserPreferences = (
  onUpdate: (preferences: UserPreferences) => void
): (() => void) => {
  return subscribeToDocument<UserPreferences>(
    'settings',
    'user-preferences',
    (data) => {
      onUpdate(data ?? { hideBuiltInRecipes: false });
    }
  );
};

// ============ Public Recipes Index ============

// Set recipe public status - adds or removes from global publicRecipes index
// Deprecated: use setRecipeVisibility instead
export const setRecipePublicStatus = async (
  recipe: Recipe,
  isPublic: boolean
): Promise<void> => {
  // Delegate to the new visibility function
  await setRecipeVisibility(recipe, isPublic ? 'public' : 'private');
};

// Set recipe visibility - manages both publicRecipes and accessibleRecipes indexes
export const setRecipeVisibility = async (
  recipe: Recipe,
  visibility: Visibility
): Promise<void> => {
  try {
    const ownerId = getUserId();
    const publicDocRef = doc(db, PUBLIC_RECIPES_COLLECTION, recipe.id);
    const accessibleDocRef = doc(db, ACCESSIBLE_RECIPES_COLLECTION, recipe.id);

    if (isDiscoverable(visibility)) {
      // Public: add to both publicRecipes AND accessibleRecipes indexes
      const publicIndexData: PublicRecipeIndex = {
        recipeId: recipe.id,
        ownerId,
        title: recipe.title,
        updatedAt: Date.now(),
      };
      if (recipe.image) {
        publicIndexData.image = recipe.image;
      }

      const accessibleIndexData: AccessibleRecipeIndex = {
        recipeId: recipe.id,
        ownerId,
        visibility,
        updatedAt: Date.now(),
      };

      await Promise.all([
        setGlobalDocument(PUBLIC_RECIPES_COLLECTION, recipe.id, publicIndexData),
        setGlobalDocument(ACCESSIBLE_RECIPES_COLLECTION, recipe.id, accessibleIndexData),
      ]);
    } else if (isAccessible(visibility)) {
      // Unlisted: add to accessibleRecipes only (not publicRecipes)
      const accessibleIndexData: AccessibleRecipeIndex = {
        recipeId: recipe.id,
        ownerId,
        visibility,
        updatedAt: Date.now(),
      };

      await Promise.all([
        deleteDoc(publicDocRef).catch(() => {}), // Remove from public if exists
        setGlobalDocument(ACCESSIBLE_RECIPES_COLLECTION, recipe.id, accessibleIndexData),
      ]);
    } else {
      // Private: remove from both indexes
      await Promise.all([
        deleteDoc(publicDocRef).catch(() => {}),
        deleteDoc(accessibleDocRef).catch(() => {}),
      ]);
    }
  } catch (error) {
    console.error('Failed to set recipe visibility:', error);
    throw error;
  }
};

// Get a public recipe by ID - looks up owner from index, then fetches from user's recipes
// Deprecated: use getAccessibleRecipeById instead
export const getPublicRecipeById = async (
  recipeId: string
): Promise<Recipe | null> => {
  return getAccessibleRecipeById(recipeId);
};

// Get an accessible recipe by ID (public or unlisted) - looks up from accessibleRecipes index
export const getAccessibleRecipeById = async (
  recipeId: string
): Promise<Recipe | null> => {
  try {
    // First, try the accessibleRecipes index (includes both public and unlisted)
    let indexData = await getGlobalDocument<AccessibleRecipeIndex>(
      ACCESSIBLE_RECIPES_COLLECTION,
      recipeId
    );

    // Fallback to publicRecipes index for backward compatibility
    if (!indexData) {
      const publicIndexData = await getGlobalDocument<PublicRecipeIndex>(
        PUBLIC_RECIPES_COLLECTION,
        recipeId
      );
      if (publicIndexData) {
        indexData = {
          recipeId: publicIndexData.recipeId,
          ownerId: publicIndexData.ownerId,
          visibility: 'public',
          updatedAt: publicIndexData.updatedAt,
        };
      }
    }

    if (!indexData) {
      return null; // Recipe not found in any index
    }

    // Fetch the actual recipe from the owner's collection
    const recipeDocRef = doc(db, `users/${indexData.ownerId}/recipes/${recipeId}`);
    const recipeSnapshot = await getDoc(recipeDocRef);

    if (!recipeSnapshot.exists()) {
      return null; // Recipe was deleted
    }

    const recipe = { id: recipeSnapshot.id, ...recipeSnapshot.data() } as Recipe;

    // Double-check it's still accessible (public or unlisted)
    const visibility = recipe.visibility ?? migrateVisibility(recipe.isPublic);
    if (!isAccessible(visibility)) {
      return null;
    }

    return recipe;
  } catch (error) {
    console.error('Failed to get accessible recipe:', error);
    return null;
  }
};

// Get the owner ID for a public/accessible recipe (used by stats tracking)
export const getPublicRecipeOwnerId = async (
  recipeId: string
): Promise<string | null> => {
  try {
    // Try accessible recipes first
    const accessibleData = await getGlobalDocument<AccessibleRecipeIndex>(
      ACCESSIBLE_RECIPES_COLLECTION,
      recipeId
    );
    if (accessibleData) {
      return accessibleData.ownerId;
    }

    // Fallback to public recipes for backward compatibility
    const publicData = await getGlobalDocument<PublicRecipeIndex>(
      PUBLIC_RECIPES_COLLECTION,
      recipeId
    );
    return publicData?.ownerId ?? null;
  } catch (error) {
    console.error('Failed to get recipe owner:', error);
    return null;
  }
};

// Increment view count for a public recipe (deduplicated per session)
export const incrementPublicRecipeViews = async (recipeId: string): Promise<void> => {
  // Deduplicate within session to prevent stats inflation
  if (viewedRecipesInSession.has(recipeId)) {
    return;
  }
  viewedRecipesInSession.add(recipeId);

  try {
    const ownerId = await getPublicRecipeOwnerId(recipeId);
    if (!ownerId) return;

    const recipeDocRef = doc(db, `users/${ownerId}/recipes/${recipeId}`);
    const { increment, updateDoc } = await import('firebase/firestore');
    await updateDoc(recipeDocRef, {
      'shareStats.views': increment(1),
    });
  } catch (error) {
    console.error('Failed to increment recipe views:', error);
    // Non-critical, don't throw
  }
};

// Increment copy count for a public recipe (deduplicated per session)
export const incrementPublicRecipeCopies = async (recipeId: string): Promise<void> => {
  // Deduplicate within session to prevent stats inflation
  if (copiedRecipesInSession.has(recipeId)) {
    return;
  }
  copiedRecipesInSession.add(recipeId);

  try {
    const ownerId = await getPublicRecipeOwnerId(recipeId);
    if (!ownerId) return;

    const recipeDocRef = doc(db, `users/${ownerId}/recipes/${recipeId}`);
    const { increment, updateDoc } = await import('firebase/firestore');
    await updateDoc(recipeDocRef, {
      'shareStats.copies': increment(1),
    });
  } catch (error) {
    console.error('Failed to increment recipe copies:', error);
    // Non-critical, don't throw
  }
};

// Migrate localStorage data to Firestore (one-time migration)
export const migrateLocalStorageToFirestore = async (
  userRecipes: Recipe[],
  groceryItems: GroceryItem[],
  servingsMap: Record<string, number>
): Promise<void> => {
  console.log('Migrating local data to Firestore...');

  try {
    // Save all recipes
    await Promise.all(userRecipes.map((recipe) => saveRecipeToFirestore(recipe)));
    console.log(`Migrated ${userRecipes.length} recipes`);

    // Save grocery list
    if (groceryItems.length > 0) {
      await saveGroceryListToFirestore(groceryItems);
      console.log(`Migrated ${groceryItems.length} grocery items`);
    }

    // Save servings map
    if (Object.keys(servingsMap).length > 0) {
      await saveServingsMapToFirestore(servingsMap);
      console.log('Migrated servings map');
    }

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// ============ Shopping Items (Enhanced Shopping List) ============

// Load all shopping items from Firestore
export const loadShoppingItemsFromFirestore = async (): Promise<ShoppingItem[]> => {
  try {
    const items = await getCollection<ShoppingItem>(SHOPPING_ITEMS_COLLECTION);
    return items;
  } catch (error) {
    console.error('Failed to load shopping items from Firestore:', error);
    return [];
  }
};

// Save a single shopping item to Firestore
export const saveShoppingItemToFirestore = async (item: ShoppingItem): Promise<void> => {
  try {
    await setDocument(SHOPPING_ITEMS_COLLECTION, item.id, item);
  } catch (error) {
    console.error('Failed to save shopping item to Firestore:', error);
    throw error;
  }
};

// Save multiple shopping items to Firestore (batch operation)
export const saveShoppingItemsToFirestore = async (items: ShoppingItem[]): Promise<void> => {
  try {
    const documents = items.map((item) => ({
      id: item.id,
      data: item,
    }));
    await setDocuments(SHOPPING_ITEMS_COLLECTION, documents);
  } catch (error) {
    console.error('Failed to save shopping items to Firestore:', error);
    throw error;
  }
};

// Delete a shopping item from Firestore
export const deleteShoppingItemFromFirestore = async (itemId: string): Promise<void> => {
  try {
    await deleteDocument(SHOPPING_ITEMS_COLLECTION, itemId);
  } catch (error) {
    console.error('Failed to delete shopping item from Firestore:', error);
    throw error;
  }
};

// Clear all shopping items from Firestore
export const clearShoppingItemsFromFirestore = async (): Promise<void> => {
  try {
    const items = await getCollection<ShoppingItem>(SHOPPING_ITEMS_COLLECTION);
    await Promise.all(items.map((item) => deleteDocument(SHOPPING_ITEMS_COLLECTION, item.id)));
  } catch (error) {
    console.error('Failed to clear shopping items from Firestore:', error);
    throw error;
  }
};

// Subscribe to shopping items changes (real-time sync)
export const subscribeToShoppingItems = (
  onUpdate: (items: ShoppingItem[]) => void
): (() => void) => {
  return subscribeToCollection<ShoppingItem>(SHOPPING_ITEMS_COLLECTION, onUpdate);
};

// ============ Purchase History ============

// Log a purchase to history (called when item is checked off)
export const logPurchaseHistory = async (item: ShoppingItem): Promise<void> => {
  try {
    const historyEntry: PurchaseHistoryEntry = {
      id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      itemName: item.name,
      normalizedName: item.normalizedName,
      category: item.category,
      quantity: item.totalQuantity,
      unit: item.unit,
      purchasedAt: Date.now(),
    };
    await setDocument(PURCHASE_HISTORY_COLLECTION, historyEntry.id, historyEntry);
  } catch (error) {
    console.error('Failed to log purchase history:', error);
    // Non-critical, don't throw
  }
};

// Get purchase history (most recent first)
export const getPurchaseHistory = async (limitCount: number = 100): Promise<PurchaseHistoryEntry[]> => {
  try {
    const history = await getCollection<PurchaseHistoryEntry>(
      PURCHASE_HISTORY_COLLECTION,
      orderBy('purchasedAt', 'desc'),
      limit(limitCount)
    );
    return history;
  } catch (error) {
    console.error('Failed to get purchase history from Firestore:', error);
    return [];
  }
};

// Subscribe to purchase history changes (real-time sync)
export const subscribeToPurchaseHistory = (
  onUpdate: (history: PurchaseHistoryEntry[]) => void,
  limitCount: number = 100
): (() => void) => {
  return subscribeToCollection<PurchaseHistoryEntry>(
    PURCHASE_HISTORY_COLLECTION,
    onUpdate,
    orderBy('purchasedAt', 'desc'),
    limit(limitCount)
  );
};
