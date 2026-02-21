import { useMemo } from 'react';
import { useRecipeStore } from '../stores/recipeStore';
import type { Ingredient, IngredientCategory, Recipe, RecipeStep } from '../types/Recipe';
import { scaleQuantity, CATEGORY_ORDER } from '../types/Recipe';
import { useUnitConversion } from './useUnitConversion';
import type { UnitSystem, TemperatureSystem } from '../types/UnitConversion';

interface ScaledIngredient extends Ingredient {
  scaledQuantity: number;
  originalQuantity: number;
  // Conversion fields
  convertedQuantity: number;
  convertedUnit: string;
  canConvert: boolean;
}

interface UseRecipeEngineResult {
  // Recipe data
  recipe: Recipe | undefined;
  servings: number;
  scale: number;

  // Scaled data
  scaledIngredients: ScaledIngredient[];
  groceryByCategory: Record<IngredientCategory, ScaledIngredient[]>;
  sortedCategories: IngredientCategory[];

  // Unit conversion
  unitSystem: UnitSystem;
  temperatureSystem: TemperatureSystem;
  setUnitSystem: (system: UnitSystem) => void;
  setTemperatureSystem: (temp: TemperatureSystem) => void;
  convertedSteps: RecipeStep[];

  // Actions
  setServings: (servings: number) => void;
  incrementServings: () => void;
  decrementServings: () => void;
  resetServings: () => void;

  // Computed
  totalTime: number;
  stepCount: number;
}

export function useRecipeEngine(recipeId: string | null): UseRecipeEngineResult {
  const recipe = useRecipeStore((s) =>
    recipeId ? s.recipes.find((r) => r.id === recipeId) : undefined
  );
  const servingsMap = useRecipeStore((s) => s.servingsMap);
  const setServingsAction = useRecipeStore((s) => s.setServings);

  // Unit conversion
  const {
    unitSystem,
    temperatureSystem,
    setUnitSystem,
    setTemperatureSystem,
    convertIngredient,
    convertStepText,
  } = useUnitConversion();

  // Calculate current servings
  const servings = useMemo(() => {
    if (!recipeId || !recipe) return 4;
    return servingsMap[recipeId] ?? recipe.defaultServings;
  }, [recipeId, recipe, servingsMap]);

  // Calculate scale factor
  const scale = useMemo(() => {
    if (!recipe) return 1;
    return servings / recipe.defaultServings;
  }, [recipe, servings]);

  // Scale all ingredients and apply unit conversion
  const scaledIngredients = useMemo((): ScaledIngredient[] => {
    if (!recipe) return [];
    return recipe.ingredients.map((ing) => {
      const scaledQty = scaleQuantity(ing.quantity, scale);
      const conversion = convertIngredient(scaledQty, ing.unit);
      return {
        ...ing,
        originalQuantity: ing.quantity,
        scaledQuantity: scaledQty,
        convertedQuantity: conversion.converted.value,
        convertedUnit: conversion.converted.unit,
        canConvert: conversion.canConvert,
      };
    });
  }, [recipe, scale, convertIngredient]);

  // Group ingredients by category
  const groceryByCategory = useMemo(() => {
    const grouped: Record<IngredientCategory, ScaledIngredient[]> = {
      produce: [],
      dairy: [],
      meat: [],
      pantry: [],
      frozen: [],
      bakery: [],
      spices: [],
      cleaning: [],
      personal_care: [],
      paper_products: [],
      pet: [],
      baby: [],
      other: [],
    };

    scaledIngredients.forEach((ing) => {
      grouped[ing.category].push(ing);
    });

    return grouped;
  }, [scaledIngredients]);

  // Get sorted categories (only those with items)
  const sortedCategories = useMemo(() => {
    return CATEGORY_ORDER.filter((cat) => groceryByCategory[cat].length > 0);
  }, [groceryByCategory]);

  // Servings actions
  const setServings = (newServings: number) => {
    if (recipeId && newServings >= 1 && newServings <= 100) {
      setServingsAction(recipeId, newServings);
    }
  };

  const incrementServings = () => {
    setServings(servings + 1);
  };

  const decrementServings = () => {
    if (servings > 1) {
      setServings(servings - 1);
    }
  };

  const resetServings = () => {
    if (recipe) {
      setServings(recipe.defaultServings);
    }
  };

  // Computed values
  const totalTime = recipe ? recipe.prepTime + recipe.cookTime : 0;
  const stepCount = recipe ? recipe.steps.length : 0;

  // Convert temperatures in step descriptions
  const convertedSteps = useMemo((): RecipeStep[] => {
    if (!recipe) return [];
    return recipe.steps.map((step) => ({
      ...step,
      description: convertStepText(step.description),
      tips: step.tips ? convertStepText(step.tips) : undefined,
    }));
  }, [recipe, convertStepText]);

  return {
    recipe,
    servings,
    scale,
    scaledIngredients,
    groceryByCategory,
    sortedCategories,
    unitSystem,
    temperatureSystem,
    setUnitSystem,
    setTemperatureSystem,
    convertedSteps,
    setServings,
    incrementServings,
    decrementServings,
    resetServings,
    totalTime,
    stepCount,
  };
}
