import type { Recipe, GroceryItem, ShoppingItem, PurchaseHistoryEntry } from '../types/Recipe';
import type { UnitPreferences } from '../types/UnitConversion';

const RECIPES_KEY = 'mise-recipes-v2';
const GROCERY_KEY = 'mise-grocery-list-v2';
const SERVINGS_KEY = 'mise-servings-v2';
const UNIT_PREFS_KEY = 'mise-unit-preferences';
const SHOPPING_ITEMS_KEY = 'mise-shopping-items-v1';
const PURCHASE_HISTORY_KEY = 'mise-purchase-history-v1';

// Load recipes from localStorage
export const loadRecipes = (): Recipe[] => {
  try {
    const stored = localStorage.getItem(RECIPES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load recipes:', error);
    return [];
  }
};

// Save recipes to localStorage
export const saveRecipes = (recipes: Recipe[]): void => {
  try {
    localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
  } catch (error) {
    console.error('Failed to save recipes:', error);
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      alert('Storage quota exceeded. Try removing some recipes with images.');
    }
  }
};

// Load grocery list from localStorage
export const loadGroceryList = (): GroceryItem[] => {
  try {
    const stored = localStorage.getItem(GROCERY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load grocery list:', error);
    return [];
  }
};

// Save grocery list to localStorage
export const saveGroceryList = (items: GroceryItem[]): void => {
  try {
    localStorage.setItem(GROCERY_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save grocery list:', error);
  }
};

// Load shopping items from localStorage
export const loadShoppingItems = (): ShoppingItem[] => {
  try {
    const stored = localStorage.getItem(SHOPPING_ITEMS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load shopping items:', error);
    return [];
  }
};

// Save shopping items to localStorage
export const saveShoppingItems = (items: ShoppingItem[]): void => {
  try {
    localStorage.setItem(SHOPPING_ITEMS_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save shopping items:', error);
  }
};

// Load purchase history from localStorage
export const loadPurchaseHistory = (): PurchaseHistoryEntry[] => {
  try {
    const stored = localStorage.getItem(PURCHASE_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load purchase history:', error);
    return [];
  }
};

// Save purchase history to localStorage
export const savePurchaseHistory = (history: PurchaseHistoryEntry[]): void => {
  try {
    localStorage.setItem(PURCHASE_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save purchase history:', error);
  }
};

// Load servings map from localStorage
export const loadServingsMap = (): Record<string, number> => {
  try {
    const stored = localStorage.getItem(SERVINGS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load servings:', error);
    return {};
  }
};

// Save servings map to localStorage
export const saveServingsMap = (servings: Record<string, number>): void => {
  try {
    localStorage.setItem(SERVINGS_KEY, JSON.stringify(servings));
  } catch (error) {
    console.error('Failed to save servings:', error);
  }
};

// Compress and convert image file to base64
export const imageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Max input file size: 10MB (will be compressed)
    const maxInputSize = 10 * 1024 * 1024;
    if (file.size > maxInputSize) {
      reject(new Error('Image too large. Maximum size is 10MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const compressed = compressImage(img);
          resolve(compressed);
        } catch (error) {
          reject(new Error('Failed to compress image.'));
        }
      };
      img.onerror = () => {
        reject(new Error('Failed to load image.'));
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };
    reader.readAsDataURL(file);
  });
};

// Compress image using canvas
const compressImage = (
  img: HTMLImageElement,
  maxDimension: number = 1200,
  quality: number = 0.85
): string => {
  let { width, height } = img;

  // Scale down if larger than maxDimension
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  // Create canvas and draw resized image
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Use better image smoothing for downscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  // Export as JPEG for better compression (unless PNG with transparency needed)
  return canvas.toDataURL('image/jpeg', quality);
};

// Validate image URL
export const isValidImageUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

// Default unit preferences
const DEFAULT_UNIT_PREFERENCES: UnitPreferences = {
  system: 'original',
  temperature: 'celsius',
};

// Load unit preferences from localStorage
export const loadUnitPreferences = (): UnitPreferences => {
  try {
    const stored = localStorage.getItem(UNIT_PREFS_KEY);
    if (stored) {
      return { ...DEFAULT_UNIT_PREFERENCES, ...JSON.parse(stored) };
    }
    return DEFAULT_UNIT_PREFERENCES;
  } catch (error) {
    console.error('Failed to load unit preferences:', error);
    return DEFAULT_UNIT_PREFERENCES;
  }
};

// Save unit preferences to localStorage
export const saveUnitPreferences = (prefs: UnitPreferences): void => {
  try {
    localStorage.setItem(UNIT_PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Failed to save unit preferences:', error);
  }
};
