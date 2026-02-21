/**
 * Open Food Facts API Service
 *
 * Provides product search and lookup functionality using the Open Food Facts database.
 * Includes caching and rate limiting to respect API guidelines.
 *
 * API Documentation: https://openfoodfacts.github.io/openfoodfacts-server/api/
 */

// Use world endpoint (Israel-specific endpoint has limited data)
const OFF_BASE_URL = 'https://world.openfoodfacts.org';

// Cache for search results to reduce API calls
const searchCache = new Map<string, { results: OFFProduct[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting: max 10 search requests per minute
let lastSearchTime = 0;
const MIN_SEARCH_INTERVAL = 6000; // 6 seconds between searches (10 req/min)

export interface OFFProduct {
  code: string; // Barcode
  product_name: string;
  product_name_he?: string; // Hebrew name if available
  brands?: string;
  categories_tags?: string[];
  image_small_url?: string;
  image_thumb_url?: string;
  quantity?: string;
  serving_size?: string;
  nutriments?: {
    energy_kcal_100g?: number;
    fat_100g?: number;
    carbohydrates_100g?: number;
    proteins_100g?: number;
  };
}

export interface OFFSearchResult {
  count: number;
  page: number;
  page_size: number;
  products: OFFProduct[];
}

/**
 * Search for products by name/query
 * Uses caching and respects rate limits
 */
export async function searchProducts(
  query: string,
  options: {
    pageSize?: number;
    country?: string;
  } = {}
): Promise<OFFProduct[]> {
  const { pageSize = 10, country = 'israel' } = options;

  if (!query || query.length < 2) {
    return [];
  }

  const cacheKey = `${query.toLowerCase()}_${pageSize}_${country}`;

  // Check cache first
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }

  // Rate limiting - wait if needed
  const now = Date.now();
  const timeSinceLastSearch = now - lastSearchTime;
  if (timeSinceLastSearch < MIN_SEARCH_INTERVAL) {
    // Return cached results if available, even if stale
    if (cached) {
      return cached.results;
    }
    // Skip this request to respect rate limits
    return [];
  }

  lastSearchTime = now;

  try {
    // Build search URL with parameters
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: pageSize.toString(),
      fields: 'code,product_name,product_name_he,brands,categories_tags,image_small_url,image_thumb_url,quantity',
    });

    // Add country filter for Israel
    if (country === 'israel') {
      params.append('tagtype_0', 'countries');
      params.append('tag_contains_0', 'contains');
      params.append('tag_0', 'israel');
    }

    const response = await fetch(`${OFF_BASE_URL}/cgi/search.pl?${params.toString()}`, {
      headers: {
        'User-Agent': 'Mise Recipe App - https://github.com/mise-app',
      },
    });

    if (!response.ok) {
      console.error('Open Food Facts search failed:', response.status);
      return cached?.results || [];
    }

    const data: OFFSearchResult = await response.json();
    const results = data.products || [];

    // Cache results
    searchCache.set(cacheKey, { results, timestamp: now });

    return results;
  } catch (error) {
    console.error('Open Food Facts search error:', error);
    return cached?.results || [];
  }
}

/**
 * Get product by barcode
 */
export async function getProductByBarcode(barcode: string): Promise<OFFProduct | null> {
  if (!barcode) {
    return null;
  }

  try {
    const response = await fetch(
      `${OFF_BASE_URL}/api/v2/product/${barcode}?fields=code,product_name,product_name_he,brands,categories_tags,image_small_url,quantity`,
      {
        headers: {
          'User-Agent': 'Mise Recipe App - https://github.com/mise-app',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.status === 0 || !data.product) {
      return null;
    }

    return data.product as OFFProduct;
  } catch (error) {
    console.error('Open Food Facts barcode lookup error:', error);
    return null;
  }
}

/**
 * Map OFF category tags to our IngredientCategory
 */
export function mapOFFCategoryToIngredientCategory(
  categoryTags?: string[]
): import('../types/Recipe').IngredientCategory {
  if (!categoryTags || categoryTags.length === 0) {
    return 'other';
  }

  const categories = categoryTags.join(' ').toLowerCase();

  // Produce
  if (
    categories.includes('fruit') ||
    categories.includes('vegetable') ||
    categories.includes('fresh')
  ) {
    return 'produce';
  }

  // Dairy
  if (
    categories.includes('dairy') ||
    categories.includes('milk') ||
    categories.includes('cheese') ||
    categories.includes('yogurt') ||
    categories.includes('eggs')
  ) {
    return 'dairy';
  }

  // Meat
  if (
    categories.includes('meat') ||
    categories.includes('poultry') ||
    categories.includes('fish') ||
    categories.includes('seafood')
  ) {
    return 'meat';
  }

  // Bakery
  if (
    categories.includes('bread') ||
    categories.includes('bakery') ||
    categories.includes('pastries')
  ) {
    return 'bakery';
  }

  // Frozen
  if (categories.includes('frozen')) {
    return 'frozen';
  }

  // Spices
  if (
    categories.includes('spice') ||
    categories.includes('herb') ||
    categories.includes('seasoning')
  ) {
    return 'spices';
  }

  // Cleaning (not typically in OFF, but check anyway)
  if (categories.includes('cleaning') || categories.includes('detergent')) {
    return 'cleaning';
  }

  // Personal care
  if (
    categories.includes('personal-care') ||
    categories.includes('hygiene') ||
    categories.includes('cosmetic')
  ) {
    return 'personal_care';
  }

  // Baby
  if (categories.includes('baby') || categories.includes('infant')) {
    return 'baby';
  }

  // Pet
  if (categories.includes('pet')) {
    return 'pet';
  }

  // Default to pantry for most food items
  return 'pantry';
}

/**
 * Format product name for display (prefer Hebrew if available)
 */
export function formatProductName(product: OFFProduct, preferHebrew = true): string {
  if (preferHebrew && product.product_name_he) {
    return product.product_name_he;
  }

  let name = product.product_name || 'Unknown Product';

  // Add brand if available and not already in name
  if (product.brands && !name.toLowerCase().includes(product.brands.toLowerCase())) {
    name = `${name} (${product.brands})`;
  }

  return name;
}

/**
 * Clear the search cache
 */
export function clearSearchCache(): void {
  searchCache.clear();
}
