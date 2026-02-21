import { useState, useCallback } from 'react';
import type { Recipe } from '../types/Recipe';
import { formatRecipeForShare } from '../utils/formatRecipeForShare';

export function useRecipeShare() {
  const [isSharing, setIsSharing] = useState(false);

  const canUseNativeShare = typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function';

  const shareRecipe = useCallback(async (recipe: Recipe, scale: number = 1) => {
    setIsSharing(true);
    const text = formatRecipeForShare(recipe, scale);

    try {
      if (canUseNativeShare) {
        await navigator.share({ title: recipe.title, text });
        return { success: true, method: 'native' as const };
      }

      await navigator.clipboard.writeText(text);
      return { success: true, method: 'clipboard' as const };
    } catch (error) {
      // User cancelled - not an error
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, method: 'cancelled' as const };
      }

      // Try clipboard as fallback
      try {
        await navigator.clipboard.writeText(text);
        return { success: true, method: 'clipboard' as const };
      } catch {
        return { success: false, method: 'failed' as const };
      }
    } finally {
      setIsSharing(false);
    }
  }, [canUseNativeShare]);

  return { shareRecipe, isSharing, canUseNativeShare };
}
