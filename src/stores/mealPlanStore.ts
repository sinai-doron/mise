import { create } from 'zustand';
import type {
  PlannedMeal,
  MealType,
  MealPlanDay,
  AggregatedIngredient,
} from '../types/MealPlan';
import {
  generateMealPlanId,
  formatDateString,
  getWeekStart,
  getWeekDays,
  addDays,
} from '../types/MealPlan';
import type { Recipe, GroceryItem, IngredientCategory } from '../types/Recipe';
import { scaleQuantity, generateId } from '../types/Recipe';
import { loadMealPlan, saveMealPlan } from '../utils/mealPlanStorage';

interface MealPlanStore {
  // State
  plannedMeals: PlannedMeal[];
  currentWeekStart: Date;

  // Actions - Loading
  loadFromStorage: () => void;

  // Actions - CRUD
  addPlannedMeal: (
    recipeId: string,
    date: string,
    mealType: MealType,
    servings: number,
    notes?: string
  ) => PlannedMeal;
  updatePlannedMeal: (id: string, updates: Partial<PlannedMeal>) => void;
  removePlannedMeal: (id: string) => void;
  movePlannedMeal: (id: string, newDate: string, newMealType: MealType) => void;

  // Actions - Navigation
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
  goToToday: () => void;
  goToWeek: (date: Date) => void;

  // Selectors
  getMealsForDate: (date: string) => PlannedMeal[];
  getMealsForWeek: () => MealPlanDay[];
  getMealsForDateRange: (startDate: string, endDate: string) => PlannedMeal[];

  // Aggregation for shopping list
  aggregateIngredients: (
    startDate: string,
    endDate: string,
    recipes: Recipe[]
  ) => AggregatedIngredient[];

  // Convert to grocery items
  createGroceryItemsFromPlan: (
    startDate: string,
    endDate: string,
    recipes: Recipe[]
  ) => GroceryItem[];
}

export const useMealPlanStore = create<MealPlanStore>((set, get) => ({
  // Initial state
  plannedMeals: [],
  currentWeekStart: getWeekStart(new Date()),

  // Load from localStorage
  loadFromStorage: () => {
    const meals = loadMealPlan();
    set({ plannedMeals: meals });
  },

  // Add a new planned meal
  addPlannedMeal: (recipeId, date, mealType, servings, notes) => {
    const newMeal: PlannedMeal = {
      id: generateMealPlanId(),
      recipeId,
      date,
      mealType,
      servings,
      notes,
      createdAt: Date.now(),
    };

    set((state) => {
      const plannedMeals = [...state.plannedMeals, newMeal];
      saveMealPlan(plannedMeals);
      return { plannedMeals };
    });

    return newMeal;
  },

  // Update an existing planned meal
  updatePlannedMeal: (id, updates) => {
    set((state) => {
      const plannedMeals = state.plannedMeals.map((meal) =>
        meal.id === id ? { ...meal, ...updates } : meal
      );
      saveMealPlan(plannedMeals);
      return { plannedMeals };
    });
  },

  // Remove a planned meal
  removePlannedMeal: (id) => {
    set((state) => {
      const plannedMeals = state.plannedMeals.filter((meal) => meal.id !== id);
      saveMealPlan(plannedMeals);
      return { plannedMeals };
    });
  },

  // Move a planned meal to a different date/meal type
  movePlannedMeal: (id, newDate, newMealType) => {
    set((state) => {
      const plannedMeals = state.plannedMeals.map((meal) =>
        meal.id === id ? { ...meal, date: newDate, mealType: newMealType } : meal
      );
      saveMealPlan(plannedMeals);
      return { plannedMeals };
    });
  },

  // Week navigation
  goToNextWeek: () => {
    set((state) => ({
      currentWeekStart: addDays(state.currentWeekStart, 7),
    }));
  },

  goToPreviousWeek: () => {
    set((state) => ({
      currentWeekStart: addDays(state.currentWeekStart, -7),
    }));
  },

  goToToday: () => {
    set({ currentWeekStart: getWeekStart(new Date()) });
  },

  goToWeek: (date: Date) => {
    set({ currentWeekStart: getWeekStart(date) });
  },

  // Get meals for a specific date
  getMealsForDate: (date) => {
    return get().plannedMeals.filter((meal) => meal.date === date);
  },

  // Get organized meals for the current week
  getMealsForWeek: () => {
    const { plannedMeals, currentWeekStart } = get();
    const weekDays = getWeekDays(currentWeekStart);

    // Populate each day with its meals
    return weekDays.map((day) => {
      const dayMeals = plannedMeals.filter((meal) => meal.date === day.date);

      return {
        ...day,
        meals: {
          breakfast: dayMeals.filter((m) => m.mealType === 'breakfast'),
          lunch: dayMeals.filter((m) => m.mealType === 'lunch'),
          dinner: dayMeals.filter((m) => m.mealType === 'dinner'),
          snack: dayMeals.filter((m) => m.mealType === 'snack'),
        },
      };
    });
  },

  // Get meals in a date range
  getMealsForDateRange: (startDate, endDate) => {
    return get().plannedMeals.filter(
      (meal) => meal.date >= startDate && meal.date <= endDate
    );
  },

  // Aggregate ingredients from planned meals for shopping list
  aggregateIngredients: (startDate, endDate, recipes) => {
    const meals = get().getMealsForDateRange(startDate, endDate);
    const aggregated: Map<string, AggregatedIngredient> = new Map();

    for (const meal of meals) {
      const recipe = recipes.find((r) => r.id === meal.recipeId);
      if (!recipe) continue;

      const scale = meal.servings / recipe.defaultServings;

      for (const ingredient of recipe.ingredients) {
        const scaledQuantity = scaleQuantity(ingredient.quantity, scale);
        // Create a key for grouping: lowercase name + unit
        const key = `${ingredient.name.toLowerCase()}-${ingredient.unit.toLowerCase()}`;

        const existing = aggregated.get(key);
        if (existing) {
          existing.totalQuantity += scaledQuantity;
          existing.sources.push({
            recipeId: recipe.id,
            recipeName: recipe.title,
            date: meal.date,
            mealType: meal.mealType,
            quantity: scaledQuantity,
          });
        } else {
          aggregated.set(key, {
            name: ingredient.name,
            totalQuantity: scaledQuantity,
            unit: ingredient.unit,
            category: ingredient.category,
            sources: [
              {
                recipeId: recipe.id,
                recipeName: recipe.title,
                date: meal.date,
                mealType: meal.mealType,
                quantity: scaledQuantity,
              },
            ],
          });
        }
      }
    }

    // Convert to array and sort by category
    const categoryOrder: IngredientCategory[] = [
      'produce',
      'dairy',
      'meat',
      'bakery',
      'frozen',
      'pantry',
      'spices',
      'other',
    ];

    return Array.from(aggregated.values()).sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.name.localeCompare(b.name);
    });
  },

  // Convert aggregated ingredients to grocery items
  createGroceryItemsFromPlan: (startDate, endDate, recipes) => {
    const aggregated = get().aggregateIngredients(startDate, endDate, recipes);

    return aggregated.map((agg) => ({
      id: generateId('grocery'),
      name: agg.name,
      quantity: agg.totalQuantity, // Original quantity field
      unit: agg.unit,
      category: agg.category,
      recipeId: `meal-plan-${startDate}-${endDate}`,
      recipeName: `Meal Plan (${startDate} to ${endDate})`,
      bought: false,
      scaledQuantity: agg.totalQuantity,
    }));
  },
}));

// Helper to get current week date range
export function getCurrentWeekRange(weekStart: Date): { startDate: string; endDate: string } {
  const startDate = formatDateString(weekStart);
  const endDate = formatDateString(addDays(weekStart, 6));
  return { startDate, endDate };
}
