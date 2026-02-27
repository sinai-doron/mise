// Shopping List types for multi-list collaborative shopping

import type { ShoppingItem } from './Recipe';

// Re-export ShoppingItem for convenience (addedBy is optional for backward compat)
export type { ShoppingItem };

// Member of a shopping list
export interface ListMember {
  role: 'owner' | 'editor';
  displayName: string;
  avatarUrl?: string;
  joinedAt: number;
}

// Shopping list metadata (stored at shoppingLists/{listId})
export interface ShoppingList {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  members: Record<string, ListMember>; // keyed by userId
  memberIds: string[]; // flat array for Firestore array-contains queries
  inviteCode?: string;
  inviteEnabled: boolean;
  itemCount: number;
  createdAt: number;
  updatedAt: number;
}

// Shopping item with addedBy for collaborative lists
export interface CollaborativeShoppingItem extends ShoppingItem {
  addedBy?: string; // userId of who added the item
}

// Presence entry for active users on a list
export interface ListPresenceEntry {
  displayName: string;
  avatarUrl?: string;
  lastSeen: number;
}

// Limits
export const SHOPPING_LIST_LIMITS = {
  MAX_LISTS_PER_USER: 10,
  MAX_MEMBERS_PER_LIST: 10,
} as const;
