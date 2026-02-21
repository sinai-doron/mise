export interface KeepNote {
  title: string;
  content: string;
  sourceFileName: string;
}

/**
 * Parse Google Keep HTML export format
 * Google Takeout exports Keep notes as individual HTML files with specific structure
 */
export function parseKeepHtml(html: string, fileName: string): KeepNote | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Get title from .heading div or <title> tag
  const title =
    doc.querySelector('.heading')?.textContent?.trim() ||
    doc.querySelector('title')?.textContent?.trim() ||
    '';

  // Get content from .content div
  const content = doc.querySelector('.content')?.textContent?.trim() || '';

  if (!title && !content) return null;
  return { title, content, sourceFileName: fileName };
}

/**
 * Heuristic to detect if a note is likely a recipe
 * Looks for common recipe-related keywords
 */
export function isLikelyRecipe(note: KeepNote): boolean {
  const text = `${note.title} ${note.content}`.toLowerCase();
  const recipeIndicators = [
    'ingredients',
    'instructions',
    'directions',
    'recipe',
    'cups',
    'tbsp',
    'tsp',
    'oz',
    'grams',
    'ml',
    'bake',
    'cook',
    'mix',
    'stir',
    'preheat',
    'minutes',
  ];
  return recipeIndicators.filter((word) => text.includes(word)).length >= 2;
}
