import { useState, useEffect, useRef, useCallback } from 'react';
import {
  searchProducts,
  formatProductName,
  mapOFFCategoryToIngredientCategory,
} from '../services/openFoodFacts';
import type { IngredientCategory, PurchaseHistoryEntry } from '../types/Recipe';

export interface ProductSuggestion {
  id: string;
  name: string;
  displayName: string;
  category: IngredientCategory;
  barcode?: string;
  brand?: string;
  imageUrl?: string;
  source: 'history' | 'openfoodfacts';
  lastPurchased?: number;
}

interface UseProductSearchOptions {
  purchaseHistory?: PurchaseHistoryEntry[];
  debounceMs?: number;
  maxResults?: number;
  preferHebrew?: boolean;
}

interface UseProductSearchResult {
  suggestions: ProductSuggestion[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearSuggestions: () => void;
}

/**
 * Hook for searching products with combined history and Open Food Facts results
 */
export function useProductSearch(options: UseProductSearchOptions = {}): UseProductSearchResult {
  const {
    purchaseHistory = [],
    debounceMs = 500,
    maxResults = 10,
    preferHebrew = true,
  } = options;

  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // Search function that will be called by the component
  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setQuery('');
    setError(null);
  }, []);

  // Effect to handle debounced searching
  useEffect(() => {
    // Clear previous timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }

    // If query is too short, show only history matches
    if (!query || query.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    // Start loading
    setIsLoading(true);
    setError(null);

    // Get history suggestions immediately
    const historyResults = getHistorySuggestions(query, purchaseHistory, maxResults);
    setSuggestions(historyResults);

    // Debounce the API call
    debounceTimeout.current = setTimeout(async () => {
      abortController.current = new AbortController();

      try {
        // Search Open Food Facts
        const offProducts = await searchProducts(query, { pageSize: maxResults });

        // Convert OFF products to suggestions
        const offSuggestions: ProductSuggestion[] = offProducts.map((product) => ({
          id: `off_${product.code}`,
          name: product.product_name || 'Unknown',
          displayName: formatProductName(product, preferHebrew),
          category: mapOFFCategoryToIngredientCategory(product.categories_tags),
          barcode: product.code,
          brand: product.brands,
          imageUrl: product.image_thumb_url || product.image_small_url,
          source: 'openfoodfacts' as const,
        }));

        // Combine history (first) with OFF results, deduplicate by normalized name
        const combined = deduplicateSuggestions([...historyResults, ...offSuggestions]);
        setSuggestions(combined.slice(0, maxResults));
        setIsLoading(false);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Product search error:', err);
          setError('Failed to search products');
          // Keep history results on error
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [query, purchaseHistory, debounceMs, maxResults, preferHebrew]);

  return {
    suggestions,
    isLoading,
    error,
    search,
    clearSuggestions,
  };
}

/**
 * Get suggestions from purchase history
 */
function getHistorySuggestions(
  query: string,
  history: PurchaseHistoryEntry[],
  maxResults: number
): ProductSuggestion[] {
  const normalizedQuery = query.toLowerCase().trim();

  // Filter and deduplicate history entries
  const seen = new Set<string>();
  const matches: ProductSuggestion[] = [];

  for (const entry of history) {
    if (matches.length >= maxResults) break;

    const normalizedName = entry.normalizedName || entry.itemName.toLowerCase();

    // Skip duplicates
    if (seen.has(normalizedName)) continue;

    // Check if matches query
    if (normalizedName.includes(normalizedQuery) || entry.itemName.toLowerCase().includes(normalizedQuery)) {
      seen.add(normalizedName);
      matches.push({
        id: `history_${entry.id}`,
        name: entry.itemName,
        displayName: entry.itemName,
        category: entry.category,
        source: 'history',
        lastPurchased: entry.purchasedAt,
      });
    }
  }

  return matches;
}

/**
 * Remove duplicate suggestions based on normalized name
 */
function deduplicateSuggestions(suggestions: ProductSuggestion[]): ProductSuggestion[] {
  const seen = new Set<string>();
  const result: ProductSuggestion[] = [];

  for (const suggestion of suggestions) {
    const key = suggestion.name.toLowerCase().trim();

    if (!seen.has(key)) {
      seen.add(key);
      result.push(suggestion);
    }
  }

  return result;
}
