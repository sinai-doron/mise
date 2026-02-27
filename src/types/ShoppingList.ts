// Shopping List types for multi-list collaborative shopping

import type { ShoppingItem } from './Recipe';

// Re-export ShoppingItem for convenience (addedBy is optional for backward compat)
export type { ShoppingItem };

// Currency configuration for cost splitting
export interface CurrencyConfig {
  code: string;       // 'USD', 'EUR', 'ILS'
  symbol: string;     // '$', '€', '₪'
  symbolPosition: 'before' | 'after';
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', symbolPosition: 'before' },
  { code: 'EUR', symbol: '€', symbolPosition: 'before' },
  { code: 'GBP', symbol: '£', symbolPosition: 'before' },
  { code: 'ILS', symbol: '₪', symbolPosition: 'after' },
  { code: 'CAD', symbol: 'CA$', symbolPosition: 'before' },
  { code: 'AUD', symbol: 'A$', symbolPosition: 'before' },
];

// Helper: format a price with currency
export function formatPrice(amount: number, currencyCode?: string): string {
  const config = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  if (!config) return amount.toFixed(2);
  const formatted = amount.toFixed(2);
  return config.symbolPosition === 'before'
    ? `${config.symbol}${formatted}`
    : `${formatted}${config.symbol}`;
}

// Helper: get currency config by code
export function getCurrencyConfig(code?: string): CurrencyConfig | undefined {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code);
}

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
  costSplittingEnabled?: boolean;
  currency?: string; // currency code, e.g. 'USD'
  createdAt: number;
  updatedAt: number;
}

// Shopping item with addedBy for collaborative lists
export interface CollaborativeShoppingItem extends ShoppingItem {
  addedBy?: string; // userId of who added the item
  price?: number;   // item price (set after buying, for cost splitting)
  boughtBy?: string; // userId of who checked it off
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
