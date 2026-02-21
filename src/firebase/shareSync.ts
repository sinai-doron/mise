// Share sync service - DEPRECATED
// This file is kept for backward compatibility during the transition to the new
// publicRecipes index system. The sharedRecipes collection is no longer used.
//
// New architecture:
// - Recipe visibility is controlled by isPublic flag on the Recipe itself
// - Public recipes are indexed in the publicRecipes global collection
// - Use setRecipePublicStatus() from recipeSync.ts to manage visibility
// - Use getPublicRecipeById() from recipeSync.ts to fetch public recipes

import type { Recipe } from '../types/Recipe';

// Legacy SharedRecipeData type - DEPRECATED, use Recipe instead
// Kept for backward compatibility with any remaining type references
export interface SharedRecipeData {
  id: string;
  recipeId: string;
  ownerId: string;
  ownerName?: string;
  title: string;
  description: string;
  image?: string;
  prepTime: number;
  cookTime: number;
  difficulty: string;
  defaultServings: number;
  ingredients: Recipe['ingredients'];
  steps: Recipe['steps'];
  tags: string[];
  category: string;
  author?: string;
  sourceUrl?: string;
  nutrition?: Recipe['nutrition'];
  chefTip?: string;
  language?: string;
  sharedAt: number;
  shareStats: { views: number; copies: number };
}

// DEPRECATED: Use setRecipePublicStatus from recipeSync.ts instead
export const saveSharedRecipe = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _recipe: Recipe,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _shareId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ownerName?: string
): Promise<void> => {
  console.warn(
    'saveSharedRecipe is deprecated. Use setRecipePublicStatus from recipeSync.ts instead.'
  );
  // No-op - the new system uses publicRecipes index
};

// DEPRECATED: Use setRecipePublicStatus(recipe, false) from recipeSync.ts instead
export const removeSharedRecipe = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _shareId: string
): Promise<void> => {
  console.warn(
    'removeSharedRecipe is deprecated. Use setRecipePublicStatus from recipeSync.ts instead.'
  );
  // No-op - the new system uses publicRecipes index
};

// DEPRECATED: Use getPublicRecipeById from recipeSync.ts instead
export const getSharedRecipe = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _shareId: string
): Promise<SharedRecipeData | null> => {
  console.warn(
    'getSharedRecipe is deprecated. Use getPublicRecipeById from recipeSync.ts instead.'
  );
  return null;
};

// DEPRECATED: Use incrementPublicRecipeViews from recipeSync.ts instead
export const incrementShareViews = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _shareId: string
): Promise<void> => {
  console.warn(
    'incrementShareViews is deprecated. Use incrementPublicRecipeViews from recipeSync.ts instead.'
  );
  // No-op
};

// DEPRECATED: Use incrementPublicRecipeCopies from recipeSync.ts instead
export const incrementShareCopies = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _shareId: string
): Promise<void> => {
  console.warn(
    'incrementShareCopies is deprecated. Use incrementPublicRecipeCopies from recipeSync.ts instead.'
  );
  // No-op
};

// DEPRECATED: This was used to update the user's recipe with share info
// The new system just uses recipe.isPublic directly
export const updateRecipeShareStatus = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _recipeId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _shareId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isPublic: boolean
): Promise<void> => {
  console.warn(
    'updateRecipeShareStatus is deprecated. Just update the recipe isPublic field directly.'
  );
  // No-op
};
