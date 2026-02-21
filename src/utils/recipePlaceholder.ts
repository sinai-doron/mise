/**
 * Escape a URL for safe use in CSS url() function.
 * Escapes characters that could break CSS parsing: quotes, parentheses, whitespace.
 */
export const escapeCssUrl = (url: string): string => {
  return url
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
};

/**
 * Generate a unique placeholder image URL for recipes without images.
 * Uses DiceBear's shapes style to create food-friendly abstract patterns.
 *
 * @param recipeId - The recipe's unique identifier
 * @param title - The recipe's title for additional variety
 * @returns URL string for the generated placeholder SVG (CSS-safe)
 */
export const generateRecipePlaceholder = (recipeId: string, title: string): string => {
  // Combine id and title for more variety
  const seed = `${recipeId}-${title}`;
  // Use shapes style with warm food-related colors
  // Note: encodeURIComponent handles URL encoding, but CSS url() also needs escaping
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed)}&backgroundColor=f0f4f8`;
};
