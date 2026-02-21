import { create } from 'zustand';
import type {
  Recipe,
  GroceryItem,
  TimerState,
  CookingSession,
  Visibility,
  ShoppingItem,
  PurchaseHistoryEntry,
  IngredientCategory,
  Ingredient,
} from '../types/Recipe';
import { generateId, scaleQuantity, isAccessible, migrateVisibility, normalizeItemName } from '../types/Recipe';
import {
  loadRecipes,
  saveRecipes,
  loadGroceryList,
  saveGroceryList,
  loadServingsMap,
  saveServingsMap,
  loadShoppingItems,
  saveShoppingItems,
  loadPurchaseHistory,
  savePurchaseHistory,
} from '../utils/recipeStorage';
import { builtInRecipes as localBuiltInRecipes } from '../data/mockRecipes';
import {
  loadBuiltInRecipesFromFirestore,
  subscribeToBuiltInRecipes,
} from '../firebase/builtInRecipeSync';
import {
  loadRecipesFromFirestore,
  saveRecipeToFirestore,
  deleteRecipeFromFirestore,
  loadGroceryListFromFirestore,
  saveGroceryListToFirestore,
  clearGroceryListFromFirestore,
  loadServingsMapFromFirestore,
  saveServingsMapToFirestore,
  subscribeToRecipes,
  subscribeToGroceryList,
  subscribeToServingsMap,
  migrateLocalStorageToFirestore,
  loadUserPreferencesFromFirestore,
  saveUserPreferencesToFirestore,
  subscribeToUserPreferences,
  setRecipeVisibility,
  loadShoppingItemsFromFirestore,
  saveShoppingItemToFirestore,
  saveShoppingItemsToFirestore,
  deleteShoppingItemFromFirestore,
  clearShoppingItemsFromFirestore,
  subscribeToShoppingItems,
  logPurchaseHistory,
  getPurchaseHistory,
  subscribeToPurchaseHistory,
} from '../firebase/recipeSync';
import { addRecipeToCollection } from '../firebase/collectionSync';
import { isSignedIn } from '../firebase';
import { useUserProfileStore } from './userProfileStore';

interface RecipeStore {
  // Built-in recipes (from Firestore or local fallback)
  builtInRecipes: Recipe[];
  // User recipes (stored in Firestore per user)
  userRecipes: Recipe[];
  // Combined: builtInRecipes + userRecipes
  recipes: Recipe[];
  selectedRecipeId: string | null;

  // Servings (per recipe)
  servingsMap: Record<string, number>;

  // Grocery list (legacy - kept for migration)
  groceryItems: GroceryItem[];
  showCompletedGroceries: boolean;

  // Enhanced shopping list
  shoppingItems: ShoppingItem[];
  purchaseHistory: PurchaseHistoryEntry[];

  // User preferences
  hideBuiltInRecipes: boolean;

  // Cooking session
  cookingSession: CookingSession | null;

  // Timers
  activeTimers: TimerState[];

  // Sync state
  isLoading: boolean;
  isSyncing: boolean;
  hasInitialized: boolean;
  lastSyncError: string | null;

  // Subscription cleanup tracking
  _unsubscribers: (() => void)[];

  // Recipe actions
  loadFromStorage: () => void;
  initializeFirebaseSync: () => Promise<() => void>;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Recipe;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  selectRecipe: (id: string | null) => void;

  // Servings actions
  setServings: (recipeId: string, servings: number) => void;
  getServings: (recipeId: string) => number;

  // Grocery actions (legacy)
  addToGroceryList: (recipeId: string) => void;
  removeFromGroceryList: (recipeId: string) => void;
  toggleGroceryItem: (itemId: string) => void;
  clearGroceryList: () => void;
  toggleShowCompletedGroceries: () => void;

  // Enhanced shopping list actions
  addManualItem: (name: string, quantity: number, unit: string, category: IngredientCategory, notes?: string) => void;
  addRecipeItemToShoppingList: (ingredient: Ingredient, recipeId: string, recipeName: string, scaledQty: number) => void;
  updateShoppingItemQuantity: (itemId: string, newQuantity: number) => void;
  toggleShoppingItem: (itemId: string) => void;
  deleteShoppingItem: (itemId: string) => void;
  clearPurchasedItems: () => void;
  clearShoppingList: () => void;
  migrateGroceryToShopping: () => void;

  // Preferences actions
  setHideBuiltInRecipes: (hide: boolean) => void;

  // Cooking actions
  startCooking: (recipeId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  endCooking: () => void;

  // Timer actions
  startTimer: (stepId: string, recipeId: string, duration: number) => void;
  pauseTimer: (stepId: string) => void;
  resumeTimer: (stepId: string) => void;
  resetTimer: (stepId: string) => void;
  removeTimer: (stepId: string) => void;
  tickTimers: () => void;

  // Session actions
  resetCookingSession: (recipeId: string) => void;

  // Subscription cleanup
  cleanupSubscriptions: () => void;
}

export const useRecipeStore = create<RecipeStore>((set, get) => ({
  // Initial state
  builtInRecipes: [...localBuiltInRecipes], // Start with local, update from Firestore
  userRecipes: [],
  _unsubscribers: [],
  recipes: [...localBuiltInRecipes], // Start with built-in recipes
  selectedRecipeId: null,
  servingsMap: {},
  groceryItems: [],
  showCompletedGroceries: true,
  shoppingItems: [],
  purchaseHistory: [],
  hideBuiltInRecipes: false,
  cookingSession: null,
  activeTimers: [],
  isLoading: false,
  isSyncing: false,
  hasInitialized: false,
  lastSyncError: null,

  // Load from localStorage - combines built-in with user recipes (fallback)
  loadFromStorage: () => {
    const userRecipes = loadRecipes();
    const groceryItems = loadGroceryList();
    const servingsMap = loadServingsMap();
    const shoppingItems = loadShoppingItems();
    const purchaseHistory = loadPurchaseHistory();
    // Combine built-in recipes with user recipes
    const builtIn = get().builtInRecipes;
    const recipes = [...builtIn, ...userRecipes];
    set({ userRecipes, recipes, groceryItems, servingsMap, shoppingItems, purchaseHistory });
  },

  // Initialize Firebase sync - loads from Firestore and sets up real-time listeners
  initializeFirebaseSync: async () => {
    // Clean up any existing subscriptions before setting up new ones
    const { _unsubscribers } = get();
    _unsubscribers.forEach(unsub => unsub());
    set({ _unsubscribers: [], isLoading: true, lastSyncError: null });

    try {
      // Always load built-in recipes from Firestore (global collection)
      const builtIn = await loadBuiltInRecipesFromFirestore();
      set({ builtInRecipes: builtIn });

      if (!isSignedIn()) {
        console.log('Not signed in, using localStorage for user data');
        const userRecipes = loadRecipes();
        const groceryItems = loadGroceryList();
        const servingsMap = loadServingsMap();
        const shoppingItems = loadShoppingItems();
        const purchaseHistory = loadPurchaseHistory();
        const recipes = [...builtIn, ...userRecipes];
        set({ userRecipes, recipes, groceryItems, servingsMap, shoppingItems, purchaseHistory, isLoading: false, hasInitialized: true });

        // Subscribe to built-in recipe updates only
        const unsubBuiltIn = subscribeToBuiltInRecipes((newBuiltIn) => {
          set((state) => {
            const recipes = [...newBuiltIn, ...state.userRecipes];
            return { builtInRecipes: newBuiltIn, recipes };
          });
        });

        return () => {
          unsubBuiltIn();
        };
      }

      // Load user data from Firestore
      const [firestoreRecipes, firestoreGrocery, firestoreServings, firestorePrefs, firestoreShopping, firestoreHistory] = await Promise.all([
        loadRecipesFromFirestore(),
        loadGroceryListFromFirestore(),
        loadServingsMapFromFirestore(),
        loadUserPreferencesFromFirestore(),
        loadShoppingItemsFromFirestore(),
        getPurchaseHistory(100),
      ]);

      // Check if we have local data that needs migration
      const localRecipes = loadRecipes();
      const localGrocery = loadGroceryList();
      const localServings = loadServingsMap();

      // If Firestore is empty but we have local data, migrate it
      if (firestoreRecipes.length === 0 && localRecipes.length > 0) {
        console.log('Migrating local data to Firestore...');
        await migrateLocalStorageToFirestore(localRecipes, localGrocery, localServings);
        // Use local data after migration
        const recipes = [...builtIn, ...localRecipes];
        const localShopping = loadShoppingItems();
        const localHistory = loadPurchaseHistory();
        set({ userRecipes: localRecipes, recipes, groceryItems: localGrocery, servingsMap: localServings, shoppingItems: localShopping, purchaseHistory: localHistory, hideBuiltInRecipes: firestorePrefs.hideBuiltInRecipes });
      } else {
        // Use Firestore data
        const recipes = [...builtIn, ...firestoreRecipes];
        set({ userRecipes: firestoreRecipes, recipes, groceryItems: firestoreGrocery, servingsMap: firestoreServings, shoppingItems: firestoreShopping, purchaseHistory: firestoreHistory, hideBuiltInRecipes: firestorePrefs.hideBuiltInRecipes });
      }

      // Set up real-time listeners for cross-device sync
      const newUnsubscribers: (() => void)[] = [];

      newUnsubscribers.push(subscribeToBuiltInRecipes((newBuiltIn) => {
        set((state) => {
          const recipes = [...newBuiltIn, ...state.userRecipes];
          return { builtInRecipes: newBuiltIn, recipes };
        });
      }));

      newUnsubscribers.push(subscribeToRecipes((userRecipes) => {
        set((state) => {
          // Only update if not currently syncing (to avoid loops)
          if (state.isSyncing) return state;
          const combined = [...state.builtInRecipes, ...userRecipes];
          return { userRecipes, recipes: combined };
        });
      }));

      newUnsubscribers.push(subscribeToGroceryList((items) => {
        set((state) => {
          if (state.isSyncing) return state;
          return { groceryItems: items };
        });
      }));

      newUnsubscribers.push(subscribeToServingsMap((servingsMap) => {
        set((state) => {
          if (state.isSyncing) return state;
          return { servingsMap };
        });
      }));

      newUnsubscribers.push(subscribeToUserPreferences((prefs) => {
        set((state) => {
          if (state.isSyncing) return state;
          return { hideBuiltInRecipes: prefs.hideBuiltInRecipes };
        });
      }));

      newUnsubscribers.push(subscribeToShoppingItems((items) => {
        set((state) => {
          if (state.isSyncing) return state;
          return { shoppingItems: items };
        });
      }));

      newUnsubscribers.push(subscribeToPurchaseHistory((history) => {
        set((state) => {
          if (state.isSyncing) return state;
          return { purchaseHistory: history };
        });
      }));

      set({ isLoading: false, hasInitialized: true, _unsubscribers: newUnsubscribers });

      // Return cleanup function
      return () => {
        newUnsubscribers.forEach(unsub => unsub());
        set({ _unsubscribers: [] });
      };
    } catch (error) {
      console.error('Failed to initialize Firebase sync:', error);
      set({ lastSyncError: (error as Error).message, isLoading: false, hasInitialized: true });
      // Fall back to localStorage
      get().loadFromStorage();
      return () => {};
    }
  },

  // Recipe CRUD
  addRecipe: (recipeData) => {
    const now = Date.now();
    const newRecipe: Recipe = {
      ...recipeData,
      id: generateId('recipe'),
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const userRecipes = [...state.userRecipes, newRecipe];
      saveRecipes(userRecipes); // Keep localStorage as backup
      // Combine built-in + user recipes
      const recipes = [...state.builtInRecipes, ...userRecipes];
      return { userRecipes, recipes, isSyncing: true };
    });

    // Sync to Firestore
    if (isSignedIn()) {
      saveRecipeToFirestore(newRecipe)
        .then(() => {
          set({ isSyncing: false });
          // Add to default collection (pass recipe for auto-publish to public collections)
          const profile = useUserProfileStore.getState().profile;
          if (profile?.defaultCollectionId) {
            addRecipeToCollection(profile.defaultCollectionId, newRecipe.id, newRecipe).catch(
              (err) => console.error('Failed to add to default collection:', err)
            );
          }
        })
        .catch((error) => {
          console.error('Failed to sync new recipe:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      set({ isSyncing: false });
    }

    return newRecipe;
  },

  updateRecipe: (id, updates) => {
    const state = get();
    // Only allow updating user recipes (not built-in)
    const recipe = state.recipes.find((r) => r.id === id);
    if (recipe?.isBuiltIn) return;

    // Handle visibility update: sync isPublic for backward compatibility
    let processedUpdates = { ...updates };
    if (updates.visibility !== undefined) {
      processedUpdates.isPublic = isAccessible(updates.visibility);
    } else if (updates.isPublic !== undefined && updates.visibility === undefined) {
      // Legacy update: convert isPublic to visibility
      processedUpdates.visibility = updates.isPublic ? 'public' : 'private';
    }

    const updatedRecipe = { ...recipe, ...processedUpdates, updatedAt: Date.now() } as Recipe;

    // Check if visibility is changing
    const oldVisibility = recipe?.visibility ?? migrateVisibility(recipe?.isPublic);
    const newVisibility = updatedRecipe.visibility ?? migrateVisibility(updatedRecipe.isPublic);
    const visibilityChanged = oldVisibility !== newVisibility;

    set((state) => {
      const userRecipes = state.userRecipes.map((r) =>
        r.id === id ? updatedRecipe : r
      );
      saveRecipes(userRecipes); // Keep localStorage as backup
      // Combine built-in + user recipes
      const recipes = [...state.builtInRecipes, ...userRecipes];
      return { userRecipes, recipes, isSyncing: true };
    });

    // Sync to Firestore
    if (isSignedIn()) {
      const syncOperations: Promise<void>[] = [saveRecipeToFirestore(updatedRecipe)];

      // If visibility changed, update the recipe indexes
      if (visibilityChanged) {
        syncOperations.push(setRecipeVisibility(updatedRecipe, newVisibility as Visibility));
      }

      Promise.all(syncOperations)
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to sync recipe update:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      set({ isSyncing: false });
    }
  },

  deleteRecipe: (id) => {
    const state = get();
    // Cannot delete built-in recipes
    const recipe = state.recipes.find((r) => r.id === id);
    if (recipe?.isBuiltIn) return;

    const userRecipes = state.userRecipes.filter((recipe) => recipe.id !== id);
    // Also remove from grocery list
    const groceryItems = state.groceryItems.filter((item) => item.recipeId !== id);
    // Remove from servings map
    const servingsMap = { ...state.servingsMap };
    delete servingsMap[id];

    saveRecipes(userRecipes);
    saveGroceryList(groceryItems);
    saveServingsMap(servingsMap);

    // Combine built-in + user recipes
    const recipes = [...state.builtInRecipes, ...userRecipes];

    set({
      userRecipes,
      recipes,
      groceryItems,
      servingsMap,
      selectedRecipeId: state.selectedRecipeId === id ? null : state.selectedRecipeId,
      isSyncing: true,
    });

    // Sync to Firestore
    if (isSignedIn()) {
      Promise.all([
        deleteRecipeFromFirestore(id),
        saveGroceryListToFirestore(groceryItems),
        saveServingsMapToFirestore(servingsMap),
      ])
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to sync recipe deletion:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      set({ isSyncing: false });
    }
  },

  selectRecipe: (id) => {
    set({ selectedRecipeId: id });
  },

  // Servings
  setServings: (recipeId, servings) => {
    const newServingsMap = { ...get().servingsMap, [recipeId]: servings };
    saveServingsMap(newServingsMap);
    set({ servingsMap: newServingsMap, isSyncing: true });

    // Sync to Firestore
    if (isSignedIn()) {
      saveServingsMapToFirestore(newServingsMap)
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to sync servings:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      set({ isSyncing: false });
    }
  },

  getServings: (recipeId) => {
    const state = get();
    const recipe = state.recipes.find((r) => r.id === recipeId);
    return state.servingsMap[recipeId] ?? recipe?.defaultServings ?? 4;
  },

  // Grocery list
  addToGroceryList: (recipeId) => {
    const state = get();
    const recipe = state.recipes.find((r) => r.id === recipeId);
    if (!recipe) return;

    const servings = state.getServings(recipeId);
    const scale = servings / recipe.defaultServings;

    // Create grocery items from ingredients (legacy)
    const newItems: GroceryItem[] = recipe.ingredients.map((ing) => ({
      ...ing,
      id: generateId('grocery'),
      recipeId,
      recipeName: recipe.title,
      bought: false,
      scaledQuantity: scaleQuantity(ing.quantity, scale),
    }));

    // Remove existing items from this recipe first
    const filteredItems = state.groceryItems.filter((item) => item.recipeId !== recipeId);
    const groceryItems = [...filteredItems, ...newItems];
    saveGroceryList(groceryItems);

    // Also add to enhanced shopping list with recipe source
    const now = Date.now();
    let newShoppingItems = [...state.shoppingItems];

    // First, remove any existing items from this recipe to avoid duplicates
    newShoppingItems = newShoppingItems.map((item) => {
      const filteredSources = item.sources.filter(
        (s) => !(s.type === 'recipe' && s.recipeId === recipeId)
      );
      if (filteredSources.length === 0) {
        return null; // Mark for removal
      }
      if (filteredSources.length !== item.sources.length) {
        // Recalculate total quantity
        const newTotal = filteredSources.reduce((sum, s) => sum + s.quantity, 0);
        return { ...item, sources: filteredSources, totalQuantity: newTotal, updatedAt: now };
      }
      return item;
    }).filter((item): item is ShoppingItem => item !== null);

    // Add each ingredient with recipe source
    recipe.ingredients.forEach((ing) => {
      const normalized = normalizeItemName(ing.name);
      const scaledQty = scaleQuantity(ing.quantity, scale);

      const existingItem = newShoppingItems.find(
        (item) => item.normalizedName === normalized && item.unit === ing.unit
      );

      if (existingItem) {
        // Merge with existing item
        const newSource = {
          type: 'recipe' as const,
          recipeId,
          recipeName: recipe.title,
          quantity: scaledQty,
          unit: ing.unit,
          addedAt: now,
        };
        const updatedItem: ShoppingItem = {
          ...existingItem,
          totalQuantity: existingItem.totalQuantity + scaledQty,
          sources: [...existingItem.sources, newSource],
          updatedAt: now,
        };
        newShoppingItems = newShoppingItems.map((item) =>
          item.id === existingItem.id ? updatedItem : item
        );
      } else {
        // Create new item
        const newItem: ShoppingItem = {
          id: generateId('shop'),
          name: ing.name,
          normalizedName: normalized,
          category: ing.category,
          totalQuantity: scaledQty,
          unit: ing.unit,
          bought: false,
          sources: [
            {
              type: 'recipe',
              recipeId,
              recipeName: recipe.title,
              quantity: scaledQty,
              unit: ing.unit,
              addedAt: now,
            },
          ],
          notes: ing.notes,
          createdAt: now,
          updatedAt: now,
        };
        newShoppingItems.push(newItem);
      }
    });

    saveShoppingItems(newShoppingItems);
    set({ groceryItems, shoppingItems: newShoppingItems, isSyncing: true });

    // Sync to Firestore
    if (isSignedIn()) {
      Promise.all([
        saveGroceryListToFirestore(groceryItems),
        saveShoppingItemsToFirestore(newShoppingItems),
      ])
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to sync grocery list:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      set({ isSyncing: false });
    }
  },

  removeFromGroceryList: (recipeId) => {
    const state = get();
    const groceryItems = state.groceryItems.filter((item) => item.recipeId !== recipeId);
    saveGroceryList(groceryItems);

    // Also remove recipe sources from shopping items
    const now = Date.now();
    const itemsToDelete: string[] = [];
    const newShoppingItems = state.shoppingItems.map((item) => {
      const filteredSources = item.sources.filter(
        (s) => !(s.type === 'recipe' && s.recipeId === recipeId)
      );
      if (filteredSources.length === 0) {
        itemsToDelete.push(item.id);
        return null;
      }
      if (filteredSources.length !== item.sources.length) {
        const newTotal = filteredSources.reduce((sum, s) => sum + s.quantity, 0);
        return { ...item, sources: filteredSources, totalQuantity: newTotal, updatedAt: now };
      }
      return item;
    }).filter((item): item is ShoppingItem => item !== null);

    saveShoppingItems(newShoppingItems);
    set({ groceryItems, shoppingItems: newShoppingItems, isSyncing: true });

    // Sync to Firestore
    if (isSignedIn()) {
      Promise.all([
        saveGroceryListToFirestore(groceryItems),
        saveShoppingItemsToFirestore(newShoppingItems),
        ...itemsToDelete.map((id) => deleteShoppingItemFromFirestore(id)),
      ])
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to sync grocery list:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      set({ isSyncing: false });
    }
  },

  toggleGroceryItem: (itemId) => {
    const groceryItems = get().groceryItems.map((item) =>
      item.id === itemId ? { ...item, bought: !item.bought } : item
    );
    saveGroceryList(groceryItems);
    set({ groceryItems, isSyncing: true });

    // Sync to Firestore
    if (isSignedIn()) {
      saveGroceryListToFirestore(groceryItems)
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to sync grocery item:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      set({ isSyncing: false });
    }
  },

  clearGroceryList: () => {
    set({ groceryItems: [], isSyncing: true });
    saveGroceryList([]);

    // Sync to Firestore
    if (isSignedIn()) {
      clearGroceryListFromFirestore()
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to clear grocery list:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      set({ isSyncing: false });
    }
  },

  toggleShowCompletedGroceries: () => {
    set((state) => ({ showCompletedGroceries: !state.showCompletedGroceries }));
  },

  // Enhanced shopping list actions
  addManualItem: (name, quantity, unit, category, notes) => {
    const state = get();
    const normalized = normalizeItemName(name);
    const now = Date.now();

    // Check if item already exists
    const existingItem = state.shoppingItems.find(
      (item) => item.normalizedName === normalized && item.unit === unit
    );

    let newShoppingItems: ShoppingItem[];

    if (existingItem) {
      // Merge with existing item
      const newSource = {
        type: 'manual' as const,
        quantity,
        unit,
        addedAt: now,
      };
      const updatedItem: ShoppingItem = {
        ...existingItem,
        totalQuantity: existingItem.totalQuantity + quantity,
        sources: [...existingItem.sources, newSource],
        notes: notes || existingItem.notes,
        updatedAt: now,
      };
      newShoppingItems = state.shoppingItems.map((item) =>
        item.id === existingItem.id ? updatedItem : item
      );
    } else {
      // Create new item
      const newItem: ShoppingItem = {
        id: generateId('shop'),
        name,
        normalizedName: normalized,
        category,
        totalQuantity: quantity,
        unit,
        bought: false,
        sources: [
          {
            type: 'manual',
            quantity,
            unit,
            addedAt: now,
          },
        ],
        notes,
        createdAt: now,
        updatedAt: now,
      };
      newShoppingItems = [...state.shoppingItems, newItem];
    }

    saveShoppingItems(newShoppingItems);
    set({ shoppingItems: newShoppingItems, isSyncing: true });

    // Sync to Firestore
    if (isSignedIn()) {
      saveShoppingItemsToFirestore(newShoppingItems)
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to sync shopping items:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      set({ isSyncing: false });
    }
  },

  addRecipeItemToShoppingList: (ingredient, recipeId, recipeName, scaledQty) => {
    const state = get();
    const normalized = normalizeItemName(ingredient.name);
    const now = Date.now();

    // Check if item already exists
    const existingItem = state.shoppingItems.find(
      (item) => item.normalizedName === normalized && item.unit === ingredient.unit
    );

    let newShoppingItems: ShoppingItem[];

    if (existingItem) {
      // Merge with existing item
      const newSource = {
        type: 'recipe' as const,
        recipeId,
        recipeName,
        quantity: scaledQty,
        unit: ingredient.unit,
        addedAt: now,
      };
      const updatedItem: ShoppingItem = {
        ...existingItem,
        totalQuantity: existingItem.totalQuantity + scaledQty,
        sources: [...existingItem.sources, newSource],
        updatedAt: now,
      };
      newShoppingItems = state.shoppingItems.map((item) =>
        item.id === existingItem.id ? updatedItem : item
      );
    } else {
      // Create new item
      const newItem: ShoppingItem = {
        id: generateId('shop'),
        name: ingredient.name,
        normalizedName: normalized,
        category: ingredient.category,
        totalQuantity: scaledQty,
        unit: ingredient.unit,
        bought: false,
        sources: [
          {
            type: 'recipe',
            recipeId,
            recipeName,
            quantity: scaledQty,
            unit: ingredient.unit,
            addedAt: now,
          },
        ],
        notes: ingredient.notes,
        createdAt: now,
        updatedAt: now,
      };
      newShoppingItems = [...state.shoppingItems, newItem];
    }

    saveShoppingItems(newShoppingItems);
    set({ shoppingItems: newShoppingItems, isSyncing: true });

    // Sync to Firestore
    if (isSignedIn()) {
      saveShoppingItemsToFirestore(newShoppingItems)
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to sync shopping items:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      set({ isSyncing: false });
    }
  },

  updateShoppingItemQuantity: (itemId, newQuantity) => {
    const state = get();
    const newShoppingItems = state.shoppingItems.map((item) =>
      item.id === itemId
        ? { ...item, totalQuantity: Math.max(0, newQuantity), updatedAt: Date.now() }
        : item
    );

    saveShoppingItems(newShoppingItems);
    set({ shoppingItems: newShoppingItems, isSyncing: true });

    // Sync to Firestore
    if (isSignedIn()) {
      const updatedItem = newShoppingItems.find((item) => item.id === itemId);
      if (updatedItem) {
        saveShoppingItemToFirestore(updatedItem)
          .then(() => set({ isSyncing: false }))
          .catch((error) => {
            console.error('Failed to sync shopping item:', error);
            set({ isSyncing: false, lastSyncError: error.message });
          });
      }
    } else {
      set({ isSyncing: false });
    }
  },

  toggleShoppingItem: (itemId) => {
    const state = get();
    const item = state.shoppingItems.find((i) => i.id === itemId);
    if (!item) return;

    const newBoughtState = !item.bought;
    const newShoppingItems = state.shoppingItems.map((i) =>
      i.id === itemId ? { ...i, bought: newBoughtState, updatedAt: Date.now() } : i
    );

    saveShoppingItems(newShoppingItems);
    set({ shoppingItems: newShoppingItems, isSyncing: true });

    // Log to purchase history when marking as bought
    if (newBoughtState && isSignedIn()) {
      logPurchaseHistory(item).catch((error) => {
        console.error('Failed to log purchase history:', error);
      });
    }

    // Also save to local purchase history
    if (newBoughtState) {
      const historyEntry: PurchaseHistoryEntry = {
        id: generateId('history'),
        itemName: item.name,
        normalizedName: item.normalizedName,
        category: item.category,
        quantity: item.totalQuantity,
        unit: item.unit,
        purchasedAt: Date.now(),
      };
      const newHistory = [historyEntry, ...state.purchaseHistory].slice(0, 100);
      savePurchaseHistory(newHistory);
      set({ purchaseHistory: newHistory });
    }

    // Sync to Firestore
    if (isSignedIn()) {
      const updatedItem = newShoppingItems.find((i) => i.id === itemId);
      if (updatedItem) {
        saveShoppingItemToFirestore(updatedItem)
          .then(() => set({ isSyncing: false }))
          .catch((error) => {
            console.error('Failed to sync shopping item:', error);
            set({ isSyncing: false, lastSyncError: error.message });
          });
      }
    } else {
      set({ isSyncing: false });
    }
  },

  deleteShoppingItem: (itemId) => {
    const state = get();
    const newShoppingItems = state.shoppingItems.filter((item) => item.id !== itemId);

    saveShoppingItems(newShoppingItems);
    set({ shoppingItems: newShoppingItems, isSyncing: true });

    // Sync to Firestore
    if (isSignedIn()) {
      deleteShoppingItemFromFirestore(itemId)
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to delete shopping item:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      set({ isSyncing: false });
    }
  },

  clearPurchasedItems: () => {
    const state = get();
    const newShoppingItems = state.shoppingItems.filter((item) => !item.bought);

    saveShoppingItems(newShoppingItems);
    set({ shoppingItems: newShoppingItems, isSyncing: true });

    // Sync to Firestore
    if (isSignedIn()) {
      const boughtItems = state.shoppingItems.filter((item) => item.bought);
      Promise.all(boughtItems.map((item) => deleteShoppingItemFromFirestore(item.id)))
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to clear purchased items:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      set({ isSyncing: false });
    }
  },

  clearShoppingList: () => {
    set({ shoppingItems: [], isSyncing: true });
    saveShoppingItems([]);

    // Sync to Firestore
    if (isSignedIn()) {
      clearShoppingItemsFromFirestore()
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to clear shopping list:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      set({ isSyncing: false });
    }
  },

  migrateGroceryToShopping: () => {
    const state = get();
    if (state.shoppingItems.length > 0 || state.groceryItems.length === 0) {
      return; // Already migrated or nothing to migrate
    }

    const now = Date.now();
    const itemMap = new Map<string, ShoppingItem>();

    // Convert grocery items to shopping items, consolidating duplicates
    state.groceryItems.forEach((grocery) => {
      const normalized = normalizeItemName(grocery.name);
      const key = `${normalized}|${grocery.unit}`;

      if (itemMap.has(key)) {
        const existing = itemMap.get(key)!;
        existing.totalQuantity += grocery.scaledQuantity;
        existing.sources.push({
          type: 'recipe',
          recipeId: grocery.recipeId,
          recipeName: grocery.recipeName,
          quantity: grocery.scaledQuantity,
          unit: grocery.unit,
          addedAt: now,
        });
        if (!existing.bought && grocery.bought) {
          existing.bought = true;
        }
      } else {
        const newItem: ShoppingItem = {
          id: generateId('shop'),
          name: grocery.name,
          normalizedName: normalized,
          category: grocery.category,
          totalQuantity: grocery.scaledQuantity,
          unit: grocery.unit,
          bought: grocery.bought,
          sources: [
            {
              type: 'recipe',
              recipeId: grocery.recipeId,
              recipeName: grocery.recipeName,
              quantity: grocery.scaledQuantity,
              unit: grocery.unit,
              addedAt: now,
            },
          ],
          notes: grocery.notes,
          createdAt: now,
          updatedAt: now,
        };
        itemMap.set(key, newItem);
      }
    });

    const newShoppingItems = Array.from(itemMap.values());
    saveShoppingItems(newShoppingItems);
    set({ shoppingItems: newShoppingItems, isSyncing: true });

    // Sync to Firestore
    if (isSignedIn()) {
      saveShoppingItemsToFirestore(newShoppingItems)
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to migrate shopping items:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      set({ isSyncing: false });
    }
  },

  // User preferences
  setHideBuiltInRecipes: (hide: boolean) => {
    set({ hideBuiltInRecipes: hide, isSyncing: true });

    // Sync to Firestore
    if (isSignedIn()) {
      saveUserPreferencesToFirestore({ hideBuiltInRecipes: hide })
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to sync preferences:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      set({ isSyncing: false });
    }
  },

  // Cooking session
  startCooking: (recipeId) => {
    const state = get();
    const servings = state.getServings(recipeId);
    set({
      cookingSession: {
        recipeId,
        currentStepIndex: 0,
        servings,
        startedAt: Date.now(),
      },
    });
  },

  nextStep: () => {
    set((state) => {
      if (!state.cookingSession) return state;
      const recipe = state.recipes.find((r) => r.id === state.cookingSession?.recipeId);
      if (!recipe) return state;

      const maxIndex = recipe.steps.length - 1;
      const newIndex = Math.min(state.cookingSession.currentStepIndex + 1, maxIndex);

      return {
        cookingSession: {
          ...state.cookingSession,
          currentStepIndex: newIndex,
        },
      };
    });
  },

  prevStep: () => {
    set((state) => {
      if (!state.cookingSession) return state;
      const newIndex = Math.max(state.cookingSession.currentStepIndex - 1, 0);

      return {
        cookingSession: {
          ...state.cookingSession,
          currentStepIndex: newIndex,
        },
      };
    });
  },

  goToStep: (index) => {
    set((state) => {
      if (!state.cookingSession) return state;
      return {
        cookingSession: {
          ...state.cookingSession,
          currentStepIndex: index,
        },
      };
    });
  },

  endCooking: () => {
    set({ cookingSession: null, activeTimers: [] });
  },

  // Timers
  startTimer: (stepId, recipeId, duration) => {
    set((state) => {
      // Check if timer already exists
      const existing = state.activeTimers.find((t) => t.stepId === stepId);
      if (existing) {
        // Resume if paused
        return {
          activeTimers: state.activeTimers.map((t) =>
            t.stepId === stepId ? { ...t, isRunning: true } : t
          ),
        };
      }

      // Create new timer
      const newTimer: TimerState = {
        stepId,
        recipeId,
        remaining: duration,
        isRunning: true,
        totalDuration: duration,
      };

      return {
        activeTimers: [...state.activeTimers, newTimer],
      };
    });
  },

  pauseTimer: (stepId) => {
    set((state) => ({
      activeTimers: state.activeTimers.map((t) =>
        t.stepId === stepId ? { ...t, isRunning: false } : t
      ),
    }));
  },

  resumeTimer: (stepId) => {
    set((state) => ({
      activeTimers: state.activeTimers.map((t) =>
        t.stepId === stepId ? { ...t, isRunning: true } : t
      ),
    }));
  },

  resetTimer: (stepId) => {
    set((state) => ({
      activeTimers: state.activeTimers.map((t) =>
        t.stepId === stepId
          ? { ...t, remaining: t.totalDuration, isRunning: false }
          : t
      ),
    }));
  },

  removeTimer: (stepId) => {
    set((state) => ({
      activeTimers: state.activeTimers.filter((t) => t.stepId !== stepId),
    }));
  },

  // Called every second to update running timers
  tickTimers: () => {
    set((state) => ({
      activeTimers: state.activeTimers.map((timer) => {
        if (timer.isRunning && timer.remaining > 0) {
          return { ...timer, remaining: timer.remaining - 1 };
        }
        return timer;
      }),
    }));
  },

  // Reset cooking session - clears timers and resets servings to default
  resetCookingSession: (recipeId: string) => {
    const state = get();
    // Clear timers for this recipe
    const activeTimers = state.activeTimers.filter((t) => t.recipeId !== recipeId);
    // Reset servings to default (delete from map, falls back to defaultServings)
    const servingsMap = { ...state.servingsMap };
    delete servingsMap[recipeId];
    saveServingsMap(servingsMap);
    set({ activeTimers, servingsMap, isSyncing: true });

    // Sync to Firestore
    if (isSignedIn()) {
      saveServingsMapToFirestore(servingsMap)
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to sync servings reset:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      set({ isSyncing: false });
    }
  },

  // Cleanup all Firestore subscriptions (call on sign-out or unmount)
  cleanupSubscriptions: () => {
    const { _unsubscribers } = get();
    _unsubscribers.forEach(unsub => unsub());
    set({ _unsubscribers: [] });
  },
}));
