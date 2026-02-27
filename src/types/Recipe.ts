// Ingredient categories for grocery grouping (by aisle)
export type IngredientCategory =
  | 'produce'
  | 'dairy'
  | 'meat'
  | 'pantry'
  | 'frozen'
  | 'bakery'
  | 'spices'
  | 'cleaning'
  | 'personal_care'
  | 'paper_products'
  | 'pet'
  | 'baby'
  | 'other';

// Ingredient with scaling support
export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  notes?: string;
}

// Step with optional timer
export interface RecipeStep {
  id: string;
  order: number;
  description: string;
  timer?: number; // seconds
  tips?: string;
}

// Difficulty levels
export type Difficulty = 'easy' | 'medium' | 'hard';

// Supported languages
export type RecipeLanguage = 'en' | 'he' | 'ar' | 'fa' | 'ur';

// RTL languages
export const RTL_LANGUAGES: RecipeLanguage[] = ['he', 'ar', 'fa', 'ur'];

// Check if a language is RTL
export const isRTL = (language?: RecipeLanguage): boolean => {
  return language ? RTL_LANGUAGES.includes(language) : false;
};

// Nutrition information
export interface NutritionInfo {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
}

// Share statistics
export interface ShareStats {
  views: number;
  copies: number;
}

// Visibility levels for sharing
export type Visibility = 'public' | 'unlisted' | 'private';

// Check if content is accessible (viewable via link)
export const isAccessible = (v?: Visibility): boolean =>
  v === 'public' || v === 'unlisted';

// Check if content is discoverable (appears in public listings)
export const isDiscoverable = (v?: Visibility): boolean =>
  v === 'public';

// Migrate old isPublic boolean to new visibility
export const migrateVisibility = (isPublic?: boolean): Visibility =>
  isPublic === true ? 'public' : 'private';

// Collection statistics
export interface CollectionStats {
  views: number;
  recipesCopied: number;
}

// Recipe Collection - a curated group of recipes
export interface Collection {
  id: string; // Also used as shareId for URL
  ownerId: string;
  ownerName?: string;
  ownerAvatar?: string;
  name: string; // "My Recipes" by default
  description?: string;
  visibility?: Visibility; // New visibility field
  isPublic?: boolean; // Deprecated: kept for backward compatibility
  recipeIds: string[]; // Ordered list of recipe IDs in collection
  coverImage?: string;
  createdAt: number;
  updatedAt: number;
  stats: CollectionStats;
}

// Main Recipe interface
export interface Recipe {
  id: string;
  title: string;
  description: string;
  aboutDish?: string; // Extended description for detail view
  image?: string; // URL or base64
  prepTime: number; // minutes
  cookTime: number; // minutes
  difficulty: Difficulty;
  defaultServings: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  tags: string[];
  category: string;
  author?: string;
  sourceUrl?: string; // Original URL where recipe was imported from
  rating?: number; // 0-5 scale
  reviewCount?: number;
  nutrition?: NutritionInfo;
  chefTip?: string;
  language?: RecipeLanguage; // Language for RTL/LTR support
  isBuiltIn?: boolean; // True for built-in recipes that cannot be edited/deleted
  // Sharing fields
  shareId?: string; // Unique ID for public URL (8 chars, URL-safe)
  visibility?: Visibility; // New visibility field
  isPublic?: boolean; // Deprecated: kept for backward compatibility
  sharedAt?: number; // Timestamp when sharing was enabled
  shareStats?: ShareStats; // View and copy counts
  createdAt: number;
  updatedAt: number;
}

// Grocery item (ingredient + bought state + recipe info)
// Legacy type - kept for migration, prefer ShoppingItem for new code
export interface GroceryItem extends Ingredient {
  recipeId: string;
  recipeName: string;
  bought: boolean;
  scaledQuantity: number; // quantity after scaling
}

// Item source tracking for multi-source shopping items
export interface ItemSource {
  type: 'recipe' | 'manual';
  recipeId?: string;
  recipeName?: string;
  quantity: number;
  unit: string;
  addedAt: number;
}

// Enhanced shopping item with multi-source support
export interface ShoppingItem {
  id: string;
  name: string;
  normalizedName: string; // lowercase for matching
  category: IngredientCategory;
  totalQuantity: number;
  unit: string;
  bought: boolean;
  sources: ItemSource[];
  notes?: string;
  addedBy?: string; // userId of who added the item (for collaborative lists)
  createdAt: number;
  updatedAt: number;
}

// Purchase history entry for cadence tracking
export interface PurchaseHistoryEntry {
  id: string;
  itemName: string;
  normalizedName: string;
  category: IngredientCategory;
  quantity: number;
  unit: string;
  purchasedAt: number;
}

// Timer state for a step
export interface TimerState {
  stepId: string;
  recipeId: string;
  remaining: number; // seconds
  isRunning: boolean;
  totalDuration: number; // original duration in seconds
}

// Cooking session state
export interface CookingSession {
  recipeId: string;
  currentStepIndex: number;
  servings: number;
  startedAt: number;
}

// Recipe view modes
export type RecipeViewMode = 'reading' | 'supermarket' | 'cooking';

// Category display order for grocery grouping
export const CATEGORY_ORDER: IngredientCategory[] = [
  'produce',
  'dairy',
  'meat',
  'bakery',
  'frozen',
  'pantry',
  'spices',
  'cleaning',
  'personal_care',
  'paper_products',
  'pet',
  'baby',
  'other',
];

// Category display names
export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  produce: 'Produce',
  dairy: 'Dairy & Eggs',
  meat: 'Meat & Seafood',
  bakery: 'Bakery',
  frozen: 'Frozen',
  pantry: 'Pantry',
  spices: 'Spices & Seasonings',
  cleaning: 'Cleaning',
  personal_care: 'Personal Care',
  paper_products: 'Paper Products',
  pet: 'Pet',
  baby: 'Baby',
  other: 'Other',
};

// Category icons for display
export const CATEGORY_ICONS: Record<IngredientCategory, string> = {
  produce: 'nutrition',
  dairy: 'water_drop',
  meat: 'set_meal',
  bakery: 'bakery_dining',
  frozen: 'ac_unit',
  pantry: 'kitchen',
  spices: 'local_fire_department',
  cleaning: 'cleaning_services',
  personal_care: 'self_care',
  paper_products: 'receipt_long',
  pet: 'pets',
  baby: 'child_care',
  other: 'category',
};

// Category keyword detection for auto-categorization
export const CATEGORY_KEYWORDS: Record<IngredientCategory, string[]> = {
  produce: ['apple', 'banana', 'lettuce', 'spinach', 'tomato', 'onion', 'garlic', 'carrot', 'potato', 'lemon', 'lime', 'orange', 'avocado', 'cucumber', 'pepper', 'broccoli', 'celery', 'mushroom', 'fruit', 'vegetable'],
  dairy: ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'egg', 'eggs', 'sour cream', 'cottage cheese', 'cream cheese'],
  meat: ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'fish', 'salmon', 'shrimp', 'bacon', 'sausage', 'ground', 'steak', 'ham'],
  bakery: ['bread', 'roll', 'baguette', 'croissant', 'muffin', 'bagel', 'tortilla', 'pita'],
  frozen: ['frozen', 'ice cream', 'pizza', 'frozen vegetable'],
  pantry: ['rice', 'pasta', 'cereal', 'oat', 'flour', 'sugar', 'oil', 'vinegar', 'sauce', 'can', 'canned', 'bean', 'lentil', 'nut', 'honey'],
  spices: ['salt', 'pepper', 'cumin', 'paprika', 'oregano', 'basil', 'thyme', 'cinnamon', 'curry', 'spice', 'herb', 'seasoning'],
  cleaning: ['dish soap', 'detergent', 'cleaner', 'bleach', 'sponge', 'trash bag', 'garbage bag', 'wipe', 'disinfectant', 'cleaning'],
  personal_care: ['shampoo', 'conditioner', 'soap', 'body wash', 'toothpaste', 'toothbrush', 'deodorant', 'razor', 'lotion', 'sunscreen'],
  paper_products: ['paper towel', 'toilet paper', 'tissue', 'napkin', 'paper plate', 'paper cup', 'aluminum foil', 'plastic wrap'],
  pet: ['dog food', 'cat food', 'pet food', 'litter', 'cat litter', 'pet treat', 'dog treat'],
  baby: ['diaper', 'formula', 'baby food', 'baby wipe', 'baby lotion', 'pacifier'],
  other: [],
};

// Helper: Normalize item name for matching
export const normalizeItemName = (name: string): string => {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
};

// Helper: Auto-detect category from item name
export const detectCategory = (name: string): IngredientCategory => {
  const normalized = normalizeItemName(name);
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return category as IngredientCategory;
      }
    }
  }
  return 'other';
};

// Difficulty labels and colors
export const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string }> = {
  easy: { label: 'Easy', color: '#22c55e' },
  medium: { label: 'Medium', color: '#f59e0b' },
  hard: { label: 'Hard', color: '#ef4444' },
};

// Helper: Scale ingredient quantity
export const scaleQuantity = (quantity: number, scale: number): number => {
  const scaled = quantity * scale;
  return Math.round(scaled * 100) / 100; // 2 decimal places
};

// Helper: Format time in minutes to display string
export const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// Helper: Format seconds to MM:SS
export const formatTimerDisplay = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Helper: Generate unique ID
export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Helper: Format quantity for display (converts decimals to fractions when appropriate)
export const formatQuantity = (quantity: number): string => {
  if (quantity === 0) return '0';

  // Handle common fractions
  const fractions: Record<number, string> = {
    0.25: '1/4',
    0.33: '1/3',
    0.5: '1/2',
    0.67: '2/3',
    0.75: '3/4',
  };

  const wholePart = Math.floor(quantity);
  const decimalPart = Math.round((quantity - wholePart) * 100) / 100;

  // Check if decimal part matches a common fraction
  let fractionStr = '';
  for (const [decimal, fraction] of Object.entries(fractions)) {
    if (Math.abs(decimalPart - parseFloat(decimal)) < 0.02) {
      fractionStr = fraction;
      break;
    }
  }

  if (wholePart === 0 && fractionStr) {
    return fractionStr;
  } else if (wholePart > 0 && fractionStr) {
    return `${wholePart} ${fractionStr}`;
  } else if (wholePart > 0 && decimalPart === 0) {
    return wholePart.toString();
  } else {
    // Show as decimal, removing trailing zeros
    return quantity.toFixed(2).replace(/\.?0+$/, '');
  }
};
