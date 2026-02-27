import { create } from 'zustand';
import type { Recipe, IngredientCategory, Ingredient, PurchaseHistoryEntry } from '../types/Recipe';
import { generateId, normalizeItemName, scaleQuantity } from '../types/Recipe';
import { useRecipeStore } from './recipeStore';
import type { ShoppingList, CollaborativeShoppingItem } from '../types/ShoppingList';
import {
  createShoppingList,
  getUserShoppingLists,
  updateShoppingList,
  deleteShoppingList as deleteShoppingListFromFirestore,
  saveShoppingListItem,
  saveShoppingListItems,
  deleteShoppingListItem,
  clearPurchasedListItems,
  clearAllListItems,
  subscribeToUserShoppingLists,
  subscribeToShoppingListItems,
  migrateToShoppingList,
  generateInviteCode as generateInviteCodeFirestore,
  disableInviteLink as disableInviteLinkFirestore,
  joinShoppingList as joinShoppingListFirestore,
  removeMemberFromList as removeMemberFirestore,
  leaveShoppingList as leaveShoppingListFirestore,
  updatePresence,
  removePresence,
  subscribeToListPresence,
} from '../firebase/shoppingListSync';
import {
  loadShoppingItemsFromFirestore,
  logPurchaseHistory,
  getPurchaseHistory,
  subscribeToPurchaseHistory,
} from '../firebase/recipeSync';
import { loadShoppingItems, savePurchaseHistory } from '../utils/recipeStorage';
import { isSignedIn } from '../firebase';
import { getUserId } from '../firebase/auth';
import { auth as firebaseAuth } from '../firebase/config';
import { doc as fsDoc, updateDoc as fsUpdate } from 'firebase/firestore';
import { db as fsDb } from '../firebase/config';
import { useUserProfileStore } from './userProfileStore';
import type { ListPresenceEntry } from '../types/ShoppingList';

const ACTIVE_LIST_KEY = 'prepd-active-list-id';
const PRESENCE_INTERVAL_MS = 60_000; // 60 seconds
const PRESENCE_STALE_MS = 5 * 60_000; // 5 minutes

interface ShoppingListStore {
  // Multi-list state
  lists: ShoppingList[];
  activeListId: string | null;
  activeListItems: CollaborativeShoppingItem[];
  isLoadingLists: boolean;
  isLoadingItems: boolean;
  hasMigrated: boolean;

  // Purchase history (per-user, global)
  purchaseHistory: PurchaseHistoryEntry[];

  // Presence
  activeListPresence: Record<string, ListPresenceEntry>;

  // Sync state
  isSyncing: boolean;
  lastSyncError: string | null;

  // Subscription cleanup
  _unsubscribers: (() => void)[];
  _presenceInterval: ReturnType<typeof setInterval> | null;
  _itemsUnsubscriber: (() => void) | null;
  _presenceUnsubscriber: (() => void) | null;

  // Initialization
  initialize: () => Promise<void>;
  cleanupSubscriptions: () => void;

  // List management
  createList: (name: string) => Promise<ShoppingList>;
  renameList: (listId: string, name: string) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  setActiveList: (listId: string) => void;

  // Sharing
  generateInviteCode: (listId: string) => Promise<string>;
  disableInviteLink: (listId: string) => Promise<void>;
  joinList: (inviteCode: string) => Promise<ShoppingList>;
  removeMember: (listId: string, userId: string) => Promise<void>;
  leaveList: (listId: string) => Promise<void>;

  // Item actions (operate on active list)
  addManualItem: (name: string, quantity: number, unit: string, category: IngredientCategory, notes?: string) => void;
  addRecipeItemToShoppingList: (ingredient: Ingredient, recipeId: string, recipeName: string, scaledQty: number) => void;
  addRecipeToShoppingList: (recipeId: string, listId?: string) => Promise<void>;
  updateShoppingItemQuantity: (itemId: string, newQuantity: number) => void;
  toggleShoppingItem: (itemId: string) => void;
  deleteShoppingItem: (itemId: string) => void;
  clearPurchasedItems: () => void;
  clearShoppingList: () => void;

  // Internal
  _subscribeToActiveList: (listId: string) => void;

  // Helpers
  getActiveList: () => ShoppingList | null;
  isOwner: (listId?: string) => boolean;
  getActivePresenceUsers: () => Record<string, ListPresenceEntry>;
}

export const useShoppingListStore = create<ShoppingListStore>((set, get) => ({
  lists: [],
  activeListId: localStorage.getItem(ACTIVE_LIST_KEY),
  activeListItems: [],
  isLoadingLists: false,
  isLoadingItems: false,
  hasMigrated: false,
  purchaseHistory: [],
  activeListPresence: {},
  isSyncing: false,
  lastSyncError: null,
  _unsubscribers: [],
  _presenceInterval: null,
  _itemsUnsubscriber: null,
  _presenceUnsubscriber: null,

  initialize: async () => {
    console.log('[ShoppingListStore] initialize called, isSignedIn:', isSignedIn());
    if (!isSignedIn()) return;

    set({ isLoadingLists: true, lastSyncError: null });

    try {
      // Load lists and purchase history in parallel
      console.log('[ShoppingListStore] Fetching lists and purchase history...');
      const [lists, history] = await Promise.all([
        getUserShoppingLists(),
        getPurchaseHistory(100),
      ]);
      console.log('[ShoppingListStore] Got lists:', lists.length, 'history:', history.length);

      // Migration: if user has no lists, check for old shopping items
      let finalLists = lists;
      let activeListId = get().activeListId;

      if (lists.length === 0) {
        console.log('[ShoppingListStore] No lists found, checking for migration...');
        const oldItems = await loadShoppingItemsFromFirestore();
        console.log('[ShoppingListStore] Old items from Firestore:', oldItems.length);
        if (oldItems.length > 0) {
          const migratedList = await migrateToShoppingList(oldItems);
          if (migratedList) {
            finalLists = [migratedList];
            activeListId = migratedList.id;
            set({ hasMigrated: true });
          }
        } else {
          // Check localStorage as last resort
          const localItems = loadShoppingItems();
          console.log('[ShoppingListStore] Local items from localStorage:', localItems.length);
          if (localItems.length > 0) {
            const migratedList = await migrateToShoppingList(localItems);
            if (migratedList) {
              finalLists = [migratedList];
              activeListId = migratedList.id;
              set({ hasMigrated: true });
            }
          }
        }
      }

      // If no lists exist at all, create a default one
      if (finalLists.length === 0) {
        console.log('[ShoppingListStore] Still no lists, creating default...');
        try {
          const defaultList = await createShoppingList('My Shopping List');
          console.log('[ShoppingListStore] Default list created:', defaultList.id);
          finalLists = [defaultList];
          activeListId = defaultList.id;
        } catch (err) {
          console.error('[ShoppingListStore] Failed to create default shopping list:', err);
        }
      }

      // If still no active list, use the first one
      if (!activeListId && finalLists.length > 0) {
        activeListId = finalLists[0].id;
      }

      // Validate activeListId exists in the list
      if (activeListId && !finalLists.find((l) => l.id === activeListId)) {
        activeListId = finalLists.length > 0 ? finalLists[0].id : null;
      }

      console.log('[ShoppingListStore] Setting state: lists:', finalLists.length, 'activeListId:', activeListId);
      set({
        lists: finalLists,
        activeListId,
        purchaseHistory: history,
        isLoadingLists: false,
      });

      // Persist active list choice
      if (activeListId) {
        localStorage.setItem(ACTIVE_LIST_KEY, activeListId);
      }

      // Repair stale member info (e.g., missing avatar from race condition at creation)
      try {
        const userId = getUserId();
        const profile = useUserProfileStore.getState().profile;
        const currentUser = firebaseAuth.currentUser;
        const displayName = profile?.displayName || currentUser?.displayName || undefined;
        const avatarUrl = profile?.avatarUrl || currentUser?.photoURL || undefined;

        if (displayName) {
          for (const list of finalLists) {
            const memberInfo = list.members[userId];
            if (memberInfo && (!memberInfo.avatarUrl && avatarUrl || memberInfo.displayName === 'Unknown')) {
              const listRef = fsDoc(fsDb, 'shoppingLists', list.id);
              fsUpdate(listRef, {
                [`members.${userId}.displayName`]: displayName,
                [`members.${userId}.avatarUrl`]: avatarUrl || null,
                ownerName: list.ownerId === userId ? displayName : list.ownerName,
                ...(list.ownerId === userId && avatarUrl ? { ownerAvatar: avatarUrl } : {}),
              }).catch(() => {});
            }
          }
        }
      } catch {
        // Non-critical repair, ignore errors
      }

      // Subscribe to list changes
      const newUnsubscribers: (() => void)[] = [];

      newUnsubscribers.push(
        subscribeToUserShoppingLists((updatedLists) => {
          const state = get();
          if (state.isSyncing) return;
          set({ lists: updatedLists });

          // If active list was deleted, switch to first available
          if (state.activeListId && !updatedLists.find((l) => l.id === state.activeListId)) {
            const newActiveId = updatedLists.length > 0 ? updatedLists[0].id : null;
            set({ activeListId: newActiveId });
            if (newActiveId) {
              localStorage.setItem(ACTIVE_LIST_KEY, newActiveId);
              get()._subscribeToActiveList(newActiveId);
            }
          }
        })
      );

      // Subscribe to purchase history
      newUnsubscribers.push(
        subscribeToPurchaseHistory((history) => {
          const state = get();
          if (state.isSyncing) return;
          set({ purchaseHistory: history });
        })
      );

      set({ _unsubscribers: newUnsubscribers });

      // Subscribe to active list items
      if (activeListId) {
        get()._subscribeToActiveList(activeListId);
      }
    } catch (error) {
      console.error('[ShoppingListStore] Failed to initialize:', error);
      set({ isLoadingLists: false, lastSyncError: (error as Error).message });
    }
  },

  // Internal: subscribe to items + presence for the active list
  _subscribeToActiveList: (listId: string) => {
    const state = get();

    // Clean up previous subscriptions
    state._itemsUnsubscriber?.();
    state._presenceUnsubscriber?.();
    if (state._presenceInterval) clearInterval(state._presenceInterval);

    // Remove presence from old list
    if (state.activeListId && state.activeListId !== listId) {
      removePresence(state.activeListId).catch(() => {});
    }

    set({ isLoadingItems: true });

    // Subscribe to items
    const itemsUnsub = subscribeToShoppingListItems(listId, (items) => {
      const currentState = get();
      if (currentState.isSyncing) return;
      set({ activeListItems: items, isLoadingItems: false });
    });

    // Subscribe to presence
    const presenceUnsub = subscribeToListPresence(listId, (presence) => {
      set({ activeListPresence: presence });
    });

    // Start presence heartbeat
    updatePresence(listId).catch(() => {});
    const presenceInterval = setInterval(() => {
      updatePresence(listId).catch(() => {});
    }, PRESENCE_INTERVAL_MS);

    set({
      _itemsUnsubscriber: itemsUnsub,
      _presenceUnsubscriber: presenceUnsub,
      _presenceInterval: presenceInterval,
    });
  },

  cleanupSubscriptions: () => {
    const state = get();
    state._unsubscribers.forEach((unsub) => unsub());
    state._itemsUnsubscriber?.();
    state._presenceUnsubscriber?.();
    if (state._presenceInterval) clearInterval(state._presenceInterval);

    // Remove presence from active list
    if (state.activeListId) {
      removePresence(state.activeListId).catch(() => {});
    }

    set({
      _unsubscribers: [],
      _itemsUnsubscriber: null,
      _presenceUnsubscriber: null,
      _presenceInterval: null,
    });
  },

  // List management
  createList: async (name) => {
    const list = await createShoppingList(name);
    set((state) => ({ lists: [...state.lists, list] }));
    return list;
  },

  renameList: async (listId, name) => {
    await updateShoppingList(listId, { name });
    set((state) => ({
      lists: state.lists.map((l) => (l.id === listId ? { ...l, name, updatedAt: Date.now() } : l)),
    }));
  },

  deleteList: async (listId) => {
    await deleteShoppingListFromFirestore(listId);
    set((state) => {
      const newLists = state.lists.filter((l) => l.id !== listId);
      let newActiveId = state.activeListId;
      if (state.activeListId === listId) {
        newActiveId = newLists.length > 0 ? newLists[0].id : null;
        if (newActiveId) {
          localStorage.setItem(ACTIVE_LIST_KEY, newActiveId);
        } else {
          localStorage.removeItem(ACTIVE_LIST_KEY);
        }
      }
      return { lists: newLists, activeListId: newActiveId };
    });

    // Subscribe to new active list if changed
    const newActiveId = get().activeListId;
    if (newActiveId && newActiveId !== listId) {
      get()._subscribeToActiveList(newActiveId);
    }
  },

  setActiveList: (listId) => {
    const state = get();
    if (state.activeListId === listId) return;

    localStorage.setItem(ACTIVE_LIST_KEY, listId);
    set({ activeListId: listId, activeListItems: [], isLoadingItems: true });
    get()._subscribeToActiveList(listId);
  },

  // Sharing
  generateInviteCode: async (listId) => {
    const code = await generateInviteCodeFirestore(listId);
    set((state) => ({
      lists: state.lists.map((l) =>
        l.id === listId ? { ...l, inviteCode: code, inviteEnabled: true } : l
      ),
    }));
    return code;
  },

  disableInviteLink: async (listId) => {
    await disableInviteLinkFirestore(listId);
    set((state) => ({
      lists: state.lists.map((l) =>
        l.id === listId ? { ...l, inviteEnabled: false } : l
      ),
    }));
  },

  joinList: async (inviteCode) => {
    const list = await joinShoppingListFirestore(inviteCode);
    set((state) => ({ lists: [...state.lists, list] }));
    return list;
  },

  removeMember: async (listId, userId) => {
    await removeMemberFirestore(listId, userId);
  },

  leaveList: async (listId) => {
    await leaveShoppingListFirestore(listId);
    set((state) => {
      const newLists = state.lists.filter((l) => l.id !== listId);
      let newActiveId = state.activeListId;
      if (state.activeListId === listId) {
        newActiveId = newLists.length > 0 ? newLists[0].id : null;
      }
      return { lists: newLists, activeListId: newActiveId };
    });
  },

  // Item actions
  addManualItem: (name, quantity, unit, category, notes) => {
    const state = get();
    const listId = state.activeListId;
    if (!listId) return;

    const normalized = normalizeItemName(name);
    const now = Date.now();
    const userId = getUserId();

    const existingItem = state.activeListItems.find(
      (item) => item.normalizedName === normalized && item.unit === unit
    );

    let updatedItems: CollaborativeShoppingItem[];

    if (existingItem) {
      const newSource = { type: 'manual' as const, quantity, unit, addedAt: now };
      const updatedItem: CollaborativeShoppingItem = {
        ...existingItem,
        totalQuantity: existingItem.totalQuantity + quantity,
        sources: [...existingItem.sources, newSource],
        notes: notes || existingItem.notes,
        updatedAt: now,
      };
      updatedItems = state.activeListItems.map((item) =>
        item.id === existingItem.id ? updatedItem : item
      );
      set({ activeListItems: updatedItems, isSyncing: true });
      saveShoppingListItem(listId, updatedItem)
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to sync shopping item:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      const newItem: CollaborativeShoppingItem = {
        id: generateId('shop'),
        name,
        normalizedName: normalized,
        category,
        totalQuantity: quantity,
        unit,
        bought: false,
        sources: [{ type: 'manual', quantity, unit, addedAt: now }],
        notes,
        addedBy: userId,
        createdAt: now,
        updatedAt: now,
      };
      updatedItems = [...state.activeListItems, newItem];
      set({ activeListItems: updatedItems, isSyncing: true });
      saveShoppingListItem(listId, newItem)
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to sync shopping item:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    }
  },

  addRecipeItemToShoppingList: (ingredient, recipeId, recipeName, scaledQty) => {
    const state = get();
    const listId = state.activeListId;
    if (!listId) return;

    const normalized = normalizeItemName(ingredient.name);
    const now = Date.now();
    const userId = getUserId();

    const existingItem = state.activeListItems.find(
      (item) => item.normalizedName === normalized && item.unit === ingredient.unit
    );

    if (existingItem) {
      const newSource = {
        type: 'recipe' as const,
        recipeId,
        recipeName,
        quantity: scaledQty,
        unit: ingredient.unit,
        addedAt: now,
      };
      const updatedItem: CollaborativeShoppingItem = {
        ...existingItem,
        totalQuantity: existingItem.totalQuantity + scaledQty,
        sources: [...existingItem.sources, newSource],
        updatedAt: now,
      };
      set({
        activeListItems: state.activeListItems.map((item) =>
          item.id === existingItem.id ? updatedItem : item
        ),
        isSyncing: true,
      });
      saveShoppingListItem(listId, updatedItem)
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to sync shopping item:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    } else {
      const newItem: CollaborativeShoppingItem = {
        id: generateId('shop'),
        name: ingredient.name,
        normalizedName: normalized,
        category: ingredient.category,
        totalQuantity: scaledQty,
        unit: ingredient.unit,
        bought: false,
        sources: [{ type: 'recipe', recipeId, recipeName, quantity: scaledQty, unit: ingredient.unit, addedAt: now }],
        notes: ingredient.notes,
        addedBy: userId,
        createdAt: now,
        updatedAt: now,
      };
      set({
        activeListItems: [...state.activeListItems, newItem],
        isSyncing: true,
      });
      saveShoppingListItem(listId, newItem)
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to sync shopping item:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    }
  },

  addRecipeToShoppingList: async (recipeId, listId) => {
    const recipeStore = useRecipeStore.getState();
    const recipe = (recipeStore.recipes as Recipe[]).find((r) => r.id === recipeId);
    if (!recipe) return;

    const state = get();
    const targetListId = listId || state.activeListId;
    if (!targetListId) return;

    const servings = (recipeStore.getServings as (id: string) => number)(recipeId);
    const scale = servings / recipe.defaultServings;
    const now = Date.now();
    const userId = getUserId();

    // Build updated items list
    let newItems = [...state.activeListItems];

    // Remove existing items from this recipe to avoid duplicates
    newItems = newItems
      .map((item: CollaborativeShoppingItem) => {
        const filteredSources = item.sources.filter(
          (s) => !(s.type === 'recipe' && s.recipeId === recipeId)
        );
        if (filteredSources.length === 0) return null;
        if (filteredSources.length !== item.sources.length) {
          const newTotal = filteredSources.reduce((sum, s) => sum + s.quantity, 0);
          return { ...item, sources: filteredSources, totalQuantity: newTotal, updatedAt: now };
        }
        return item;
      })
      .filter((item): item is CollaborativeShoppingItem => item !== null);

    // Add each ingredient
    recipe.ingredients.forEach((ing: Ingredient) => {
      const normalized = normalizeItemName(ing.name);
      const scaledQty = scaleQuantity(ing.quantity, scale);
      const existing = newItems.find(
        (item) => item.normalizedName === normalized && item.unit === ing.unit
      );

      if (existing) {
        const newSource = {
          type: 'recipe' as const,
          recipeId,
          recipeName: recipe.title,
          quantity: scaledQty,
          unit: ing.unit,
          addedAt: now,
        };
        const updatedItem: CollaborativeShoppingItem = {
          ...existing,
          totalQuantity: existing.totalQuantity + scaledQty,
          sources: [...existing.sources, newSource],
          updatedAt: now,
        };
        newItems = newItems.map((item) => (item.id === existing.id ? updatedItem : item));
      } else {
        newItems.push({
          id: generateId('shop'),
          name: ing.name,
          normalizedName: normalized,
          category: ing.category,
          totalQuantity: scaledQty,
          unit: ing.unit,
          bought: false,
          sources: [{ type: 'recipe', recipeId, recipeName: recipe.title, quantity: scaledQty, unit: ing.unit, addedAt: now }],
          notes: ing.notes,
          addedBy: userId,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    set({ activeListItems: newItems, isSyncing: true });
    saveShoppingListItems(targetListId, newItems)
      .then(() => set({ isSyncing: false }))
      .catch((error) => {
        console.error('Failed to sync shopping items:', error);
        set({ isSyncing: false, lastSyncError: error.message });
      });
  },

  updateShoppingItemQuantity: (itemId, newQuantity) => {
    const state = get();
    const listId = state.activeListId;
    if (!listId) return;

    const updatedItems = state.activeListItems.map((item) =>
      item.id === itemId ? { ...item, totalQuantity: Math.max(0, newQuantity), updatedAt: Date.now() } : item
    );
    set({ activeListItems: updatedItems, isSyncing: true });

    const updatedItem = updatedItems.find((item) => item.id === itemId);
    if (updatedItem) {
      saveShoppingListItem(listId, updatedItem)
        .then(() => set({ isSyncing: false }))
        .catch((error) => {
          console.error('Failed to sync shopping item:', error);
          set({ isSyncing: false, lastSyncError: error.message });
        });
    }
  },

  toggleShoppingItem: (itemId) => {
    const state = get();
    const listId = state.activeListId;
    if (!listId) return;

    const item = state.activeListItems.find((i) => i.id === itemId);
    if (!item) return;

    const newBoughtState = !item.bought;
    const updatedItem: CollaborativeShoppingItem = { ...item, bought: newBoughtState, updatedAt: Date.now() };

    set({
      activeListItems: state.activeListItems.map((i) => (i.id === itemId ? updatedItem : i)),
      isSyncing: true,
    });

    // Log purchase history (per-user)
    if (newBoughtState) {
      if (isSignedIn()) {
        logPurchaseHistory(item).catch((error) => {
          console.error('Failed to log purchase history:', error);
        });
      }
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

    saveShoppingListItem(listId, updatedItem)
      .then(() => set({ isSyncing: false }))
      .catch((error) => {
        console.error('Failed to sync shopping item:', error);
        set({ isSyncing: false, lastSyncError: error.message });
      });
  },

  deleteShoppingItem: (itemId) => {
    const state = get();
    const listId = state.activeListId;
    if (!listId) return;

    set({
      activeListItems: state.activeListItems.filter((item) => item.id !== itemId),
      isSyncing: true,
    });
    deleteShoppingListItem(listId, itemId)
      .then(() => set({ isSyncing: false }))
      .catch((error) => {
        console.error('Failed to delete shopping item:', error);
        set({ isSyncing: false, lastSyncError: error.message });
      });
  },

  clearPurchasedItems: () => {
    const state = get();
    const listId = state.activeListId;
    if (!listId) return;

    set({
      activeListItems: state.activeListItems.filter((item) => !item.bought),
      isSyncing: true,
    });
    clearPurchasedListItems(listId)
      .then(() => set({ isSyncing: false }))
      .catch((error) => {
        console.error('Failed to clear purchased items:', error);
        set({ isSyncing: false, lastSyncError: error.message });
      });
  },

  clearShoppingList: () => {
    const state = get();
    const listId = state.activeListId;
    if (!listId) return;

    set({ activeListItems: [], isSyncing: true });
    clearAllListItems(listId)
      .then(() => set({ isSyncing: false }))
      .catch((error) => {
        console.error('Failed to clear shopping list:', error);
        set({ isSyncing: false, lastSyncError: error.message });
      });
  },

  // Helpers
  getActiveList: () => {
    const state = get();
    return state.lists.find((l) => l.id === state.activeListId) || null;
  },

  isOwner: (listId) => {
    const state = get();
    const id = listId || state.activeListId;
    if (!id) return false;
    const list = state.lists.find((l) => l.id === id);
    if (!list) return false;
    try {
      return list.ownerId === getUserId();
    } catch {
      return false;
    }
  },

  getActivePresenceUsers: () => {
    const state = get();
    const now = Date.now();
    const active: Record<string, ListPresenceEntry> = {};
    const userId = getUserId();

    for (const [uid, entry] of Object.entries(state.activeListPresence)) {
      // Filter out self and stale entries
      if (uid !== userId && entry.lastSeen > 0 && now - entry.lastSeen < PRESENCE_STALE_MS) {
        active[uid] = entry;
      }
    }
    return active;
  },
}));
