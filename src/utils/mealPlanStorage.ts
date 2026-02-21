import type { PlannedMeal } from '../types/MealPlan';

const MEAL_PLAN_KEY = 'mise-meal-plan-v1';

// Load meal plan from localStorage
export const loadMealPlan = (): PlannedMeal[] => {
  try {
    const stored = localStorage.getItem(MEAL_PLAN_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load meal plan:', error);
    return [];
  }
};

// Save meal plan to localStorage
export const saveMealPlan = (meals: PlannedMeal[]): void => {
  try {
    localStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(meals));
  } catch (error) {
    console.error('Failed to save meal plan:', error);
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      alert('Storage quota exceeded. Try clearing old meal plans.');
    }
  }
};

// Get meals for a specific date range
export const getMealsForDateRange = (
  meals: PlannedMeal[],
  startDate: string,
  endDate: string
): PlannedMeal[] => {
  return meals.filter((meal) => meal.date >= startDate && meal.date <= endDate);
};

// Get meals for a specific date
export const getMealsForDate = (
  meals: PlannedMeal[],
  date: string
): PlannedMeal[] => {
  return meals.filter((meal) => meal.date === date);
};

// Clean up old meal plans (optional - removes meals older than X days)
export const cleanupOldMeals = (meals: PlannedMeal[], daysToKeep: number = 30): PlannedMeal[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffString = cutoffDate.toISOString().split('T')[0];

  return meals.filter((meal) => meal.date >= cutoffString);
};
