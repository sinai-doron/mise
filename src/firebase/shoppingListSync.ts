// Shopping list sync service - handles multi-list collaborative shopping with Firestore
import type { ShoppingItem } from '../types/Recipe';
import type { ShoppingList, ListMember, CollaborativeShoppingItem, ListPresenceEntry } from '../types/ShoppingList';
import { SHOPPING_LIST_LIMITS } from '../types/ShoppingList';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import { auth } from './config';
import { getUserId } from './auth';
import { generateShareId } from '../utils/shareUtils';
import { useUserProfileStore } from '../stores/userProfileStore';

// Collection names
const SHOPPING_LISTS_COLLECTION = 'shoppingLists';
const ITEMS_SUBCOLLECTION = 'items';
const ACTIVE_LIST_USERS_COLLECTION = 'activeListUsers';

// Helper: remove undefined values for Firestore
const removeUndefined = <T>(obj: T): T => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefined) as T;
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = removeUndefined(value);
      }
    }
    return result as T;
  }
  return obj;
};

// ============ Shopping List CRUD ============

// Create a new shopping list
export const createShoppingList = async (
  name: string,
  initialItems?: ShoppingItem[]
): Promise<ShoppingList> => {
  const userId = getUserId();

  // Check list count limit
  const userLists = await getUserShoppingLists();
  const ownedLists = userLists.filter((l) => l.ownerId === userId);
  if (ownedLists.length >= SHOPPING_LIST_LIMITS.MAX_LISTS_PER_USER) {
    throw new Error(`You can create up to ${SHOPPING_LIST_LIMITS.MAX_LISTS_PER_USER} lists`);
  }

  const id = generateShareId();
  const now = Date.now();

  // Get user profile info for denormalization (fall back to Firebase Auth)
  const profile = useUserProfileStore.getState().profile;
  const firebaseUser = auth.currentUser;
  const displayName = profile?.displayName || firebaseUser?.displayName || 'Unknown';
  const avatarUrl = profile?.avatarUrl || firebaseUser?.photoURL || undefined;

  const member: ListMember = {
    role: 'owner',
    displayName,
    avatarUrl,
    joinedAt: now,
  };

  const list: ShoppingList = {
    id,
    name,
    ownerId: userId,
    ownerName: displayName,
    ownerAvatar: avatarUrl,
    members: { [userId]: member },
    memberIds: [userId],
    inviteEnabled: false,
    itemCount: initialItems?.length ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = doc(db, SHOPPING_LISTS_COLLECTION, id);
  await setDoc(docRef, removeUndefined(list));

  // If initial items provided (e.g., migration), batch-write them
  if (initialItems && initialItems.length > 0) {
    const batch = writeBatch(db);
    for (const item of initialItems) {
      const itemRef = doc(db, SHOPPING_LISTS_COLLECTION, id, ITEMS_SUBCOLLECTION, item.id);
      const itemWithOwner: CollaborativeShoppingItem = { ...item, addedBy: item.addedBy || userId };
      batch.set(itemRef, removeUndefined(itemWithOwner));
    }
    await batch.commit();
  }

  return list;
};

// Get a single shopping list by ID
export const getShoppingList = async (listId: string): Promise<ShoppingList | null> => {
  const docRef = doc(db, SHOPPING_LISTS_COLLECTION, listId);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as ShoppingList) : null;
};

// Get all shopping lists the current user is a member of
export const getUserShoppingLists = async (): Promise<ShoppingList[]> => {
  const userId = getUserId();
  const q = query(
    collection(db, SHOPPING_LISTS_COLLECTION),
    where('memberIds', 'array-contains', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ShoppingList));
};

// Update shopping list metadata (owner only)
export const updateShoppingList = async (
  listId: string,
  updates: Partial<Pick<ShoppingList, 'name' | 'costSplittingEnabled' | 'currency'>>
): Promise<void> => {
  const docRef = doc(db, SHOPPING_LISTS_COLLECTION, listId);
  await updateDoc(docRef, removeUndefined({ ...updates, updatedAt: Date.now() }));
};

// Delete a shopping list and its items (owner only)
export const deleteShoppingList = async (listId: string): Promise<void> => {
  // Delete all items in the subcollection first
  const itemsRef = collection(db, SHOPPING_LISTS_COLLECTION, listId, ITEMS_SUBCOLLECTION);
  const itemsSnapshot = await getDocs(itemsRef);

  if (itemsSnapshot.docs.length > 0) {
    const batch = writeBatch(db);
    itemsSnapshot.docs.forEach((itemDoc) => batch.delete(itemDoc.ref));
    await batch.commit();
  }

  // Delete the list document
  const docRef = doc(db, SHOPPING_LISTS_COLLECTION, listId);
  await deleteDoc(docRef);

  // Clean up presence
  const presenceRef = doc(db, ACTIVE_LIST_USERS_COLLECTION, listId);
  await deleteDoc(presenceRef).catch(() => {}); // ignore if doesn't exist
};

// Subscribe to all shopping lists the user is a member of (real-time)
export const subscribeToUserShoppingLists = (
  onUpdate: (lists: ShoppingList[]) => void
): Unsubscribe => {
  const userId = getUserId();
  const q = query(
    collection(db, SHOPPING_LISTS_COLLECTION),
    where('memberIds', 'array-contains', userId)
  );
  return onSnapshot(q, (snapshot) => {
    const lists = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ShoppingList));
    onUpdate(lists);
  });
};

// ============ Shopping List Items ============

// Get all items in a shopping list
export const getShoppingListItems = async (listId: string): Promise<CollaborativeShoppingItem[]> => {
  const itemsRef = collection(db, SHOPPING_LISTS_COLLECTION, listId, ITEMS_SUBCOLLECTION);
  const snapshot = await getDocs(itemsRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CollaborativeShoppingItem));
};

// Save a single item to a shopping list
export const saveShoppingListItem = async (
  listId: string,
  item: CollaborativeShoppingItem
): Promise<void> => {
  const itemRef = doc(db, SHOPPING_LISTS_COLLECTION, listId, ITEMS_SUBCOLLECTION, item.id);
  await setDoc(itemRef, removeUndefined(item));
  // Update item count on the list
  await updateListItemCount(listId);
};

// Save multiple items to a shopping list (batch)
export const saveShoppingListItems = async (
  listId: string,
  items: CollaborativeShoppingItem[]
): Promise<void> => {
  const BATCH_SIZE = 500;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const itemRef = doc(db, SHOPPING_LISTS_COLLECTION, listId, ITEMS_SUBCOLLECTION, item.id);
      batch.set(itemRef, removeUndefined(item));
    }
    await batch.commit();
  }
  await updateListItemCount(listId);
};

// Delete a single item from a shopping list
export const deleteShoppingListItem = async (
  listId: string,
  itemId: string
): Promise<void> => {
  const itemRef = doc(db, SHOPPING_LISTS_COLLECTION, listId, ITEMS_SUBCOLLECTION, itemId);
  await deleteDoc(itemRef);
  await updateListItemCount(listId);
};

// Clear all purchased items from a shopping list
export const clearPurchasedListItems = async (listId: string): Promise<void> => {
  const items = await getShoppingListItems(listId);
  const boughtItems = items.filter((item) => item.bought);
  if (boughtItems.length === 0) return;

  const batch = writeBatch(db);
  for (const item of boughtItems) {
    const itemRef = doc(db, SHOPPING_LISTS_COLLECTION, listId, ITEMS_SUBCOLLECTION, item.id);
    batch.delete(itemRef);
  }
  await batch.commit();
  await updateListItemCount(listId);
};

// Clear all items from a shopping list
export const clearAllListItems = async (listId: string): Promise<void> => {
  const itemsRef = collection(db, SHOPPING_LISTS_COLLECTION, listId, ITEMS_SUBCOLLECTION);
  const snapshot = await getDocs(itemsRef);
  if (snapshot.docs.length === 0) return;

  const BATCH_SIZE = 500;
  for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
    const chunk = snapshot.docs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((itemDoc) => batch.delete(itemDoc.ref));
    await batch.commit();
  }

  // Reset item count
  const listRef = doc(db, SHOPPING_LISTS_COLLECTION, listId);
  await updateDoc(listRef, { itemCount: 0, updatedAt: Date.now() });
};

// Subscribe to items in a shopping list (real-time)
export const subscribeToShoppingListItems = (
  listId: string,
  onUpdate: (items: CollaborativeShoppingItem[]) => void
): Unsubscribe => {
  const itemsRef = collection(db, SHOPPING_LISTS_COLLECTION, listId, ITEMS_SUBCOLLECTION);
  return onSnapshot(itemsRef, (snapshot) => {
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CollaborativeShoppingItem));
    onUpdate(items);
  });
};

// Helper: update item count on the list document
const updateListItemCount = async (listId: string): Promise<void> => {
  try {
    const itemsRef = collection(db, SHOPPING_LISTS_COLLECTION, listId, ITEMS_SUBCOLLECTION);
    const snapshot = await getDocs(itemsRef);
    const listRef = doc(db, SHOPPING_LISTS_COLLECTION, listId);
    await updateDoc(listRef, { itemCount: snapshot.size, updatedAt: Date.now() });
  } catch (error) {
    console.error('Failed to update list item count:', error);
  }
};

// ============ Invite / Sharing ============

// Generate or regenerate invite code for a list
export const generateInviteCode = async (listId: string): Promise<string> => {
  const inviteCode = generateShareId();
  const listRef = doc(db, SHOPPING_LISTS_COLLECTION, listId);
  await updateDoc(listRef, {
    inviteCode,
    inviteEnabled: true,
    updatedAt: Date.now(),
  });
  return inviteCode;
};

// Disable invite link
export const disableInviteLink = async (listId: string): Promise<void> => {
  const listRef = doc(db, SHOPPING_LISTS_COLLECTION, listId);
  await updateDoc(listRef, {
    inviteEnabled: false,
    updatedAt: Date.now(),
  });
};

// Find a shopping list by invite code
export const findListByInviteCode = async (inviteCode: string): Promise<ShoppingList | null> => {
  const q = query(
    collection(db, SHOPPING_LISTS_COLLECTION),
    where('inviteCode', '==', inviteCode),
    where('inviteEnabled', '==', true)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as ShoppingList;
};

// Join a shopping list via invite code
export const joinShoppingList = async (inviteCode: string): Promise<ShoppingList> => {
  const userId = getUserId();

  const list = await findListByInviteCode(inviteCode);
  if (!list) {
    throw new Error('Invalid or expired invite link');
  }

  // Check if already a member
  if (list.memberIds.includes(userId)) {
    return list; // Already a member, just return the list
  }

  // Check member limit
  if (list.memberIds.length >= SHOPPING_LIST_LIMITS.MAX_MEMBERS_PER_LIST) {
    throw new Error(`This list has reached the maximum of ${SHOPPING_LIST_LIMITS.MAX_MEMBERS_PER_LIST} members`);
  }

  // Get user profile for denormalization (fall back to Firebase Auth)
  const profile = useUserProfileStore.getState().profile;
  const joiningUser = auth.currentUser;

  const member: ListMember = {
    role: 'editor',
    displayName: profile?.displayName || joiningUser?.displayName || 'Unknown',
    avatarUrl: profile?.avatarUrl || joiningUser?.photoURL || undefined,
    joinedAt: Date.now(),
  };

  const listRef = doc(db, SHOPPING_LISTS_COLLECTION, list.id);
  await updateDoc(listRef, {
    [`members.${userId}`]: removeUndefined(member),
    memberIds: [...list.memberIds, userId],
    updatedAt: Date.now(),
  });

  return { ...list, members: { ...list.members, [userId]: member }, memberIds: [...list.memberIds, userId] };
};

// Remove a member from a shopping list (owner action)
export const removeMemberFromList = async (listId: string, memberUserId: string): Promise<void> => {
  const list = await getShoppingList(listId);
  if (!list) throw new Error('List not found');

  const userId = getUserId();
  if (list.ownerId !== userId) throw new Error('Only the owner can remove members');
  if (memberUserId === userId) throw new Error('Owner cannot remove themselves');

  const newMemberIds = list.memberIds.filter((id) => id !== memberUserId);
  const newMembers = { ...list.members };
  delete newMembers[memberUserId];

  const listRef = doc(db, SHOPPING_LISTS_COLLECTION, listId);
  await updateDoc(listRef, {
    members: removeUndefined(newMembers),
    memberIds: newMemberIds,
    updatedAt: Date.now(),
  });
};

// Leave a shopping list (editor action)
export const leaveShoppingList = async (listId: string): Promise<void> => {
  const list = await getShoppingList(listId);
  if (!list) throw new Error('List not found');

  const userId = getUserId();
  if (list.ownerId === userId) throw new Error('Owner cannot leave their own list. Delete the list instead.');

  const newMemberIds = list.memberIds.filter((id) => id !== userId);
  const newMembers = { ...list.members };
  delete newMembers[userId];

  const listRef = doc(db, SHOPPING_LISTS_COLLECTION, listId);
  await updateDoc(listRef, {
    members: removeUndefined(newMembers),
    memberIds: newMemberIds,
    updatedAt: Date.now(),
  });
};

// ============ Presence ============

// Update presence heartbeat for a list
export const updatePresence = async (listId: string): Promise<void> => {
  try {
    const userId = getUserId();
    const profile = useUserProfileStore.getState().profile;
    const currentUser = auth.currentUser;

    const presenceRef = doc(db, ACTIVE_LIST_USERS_COLLECTION, listId);
    const presenceData: Record<string, ListPresenceEntry> = {
      [userId]: {
        displayName: profile?.displayName || currentUser?.displayName || 'Unknown',
        avatarUrl: profile?.avatarUrl || currentUser?.photoURL || undefined,
        lastSeen: Date.now(),
      },
    };

    // Use set with merge to avoid overwriting other users' presence
    await setDoc(presenceRef, presenceData, { merge: true });
  } catch (error) {
    console.error('Failed to update presence:', error);
  }
};

// Remove presence when leaving a list view
export const removePresence = async (listId: string): Promise<void> => {
  try {
    const userId = getUserId();
    const presenceRef = doc(db, ACTIVE_LIST_USERS_COLLECTION, listId);

    // We can't delete a single field with updateDoc easily, so we set lastSeen to 0
    // which the client will treat as "offline"
    await updateDoc(presenceRef, {
      [`${userId}.lastSeen`]: 0,
    }).catch(() => {}); // ignore if document doesn't exist
  } catch (error) {
    console.error('Failed to remove presence:', error);
  }
};

// Subscribe to presence for a list
export const subscribeToListPresence = (
  listId: string,
  onUpdate: (presence: Record<string, ListPresenceEntry>) => void
): Unsubscribe => {
  const presenceRef = doc(db, ACTIVE_LIST_USERS_COLLECTION, listId);
  return onSnapshot(presenceRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data() as Record<string, ListPresenceEntry>);
    } else {
      onUpdate({});
    }
  });
};

// ============ Migration ============

// Migrate old user-scoped shopping items to a new shopping list
export const migrateToShoppingList = async (
  oldItems: ShoppingItem[]
): Promise<ShoppingList | null> => {
  if (oldItems.length === 0) return null;

  const userId = getUserId();

  // Add addedBy to all migrated items
  const itemsWithOwner: CollaborativeShoppingItem[] = oldItems.map((item) => ({
    ...item,
    addedBy: userId,
  }));

  // Create the default list with migrated items
  const list = await createShoppingList('My Shopping List', itemsWithOwner);
  return list;
};
