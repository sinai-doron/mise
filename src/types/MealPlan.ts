import type { IngredientCategory } from './Recipe';

// Meal types for planning
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// Display order for meal types
export const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// A single planned meal (recipe scheduled for a specific date and meal slot)
export interface PlannedMeal {
  id: string;
  recipeId: string;
  date: string;           // YYYY-MM-DD format
  mealType: MealType;
  servings: number;       // Custom servings for this meal
  notes?: string;         // Optional notes (e.g., "make extra for leftovers")
  createdAt: number;      // Timestamp
}

// Helper type for organizing meals by day
export interface MealPlanDay {
  date: string;           // YYYY-MM-DD
  dayOfWeek: number;      // 0=Sunday, 1=Monday, etc.
  isToday: boolean;
  meals: Record<MealType, PlannedMeal[]>;
}

// Result of aggregating ingredients from multiple planned meals
export interface AggregatedIngredient {
  name: string;
  totalQuantity: number;
  unit: string;
  category: IngredientCategory;
  sources: {
    recipeId: string;
    recipeName: string;
    date: string;
    mealType: MealType;
    quantity: number;
  }[];
}

// Drag-and-drop context for meal planning
export interface DraggedRecipe {
  recipeId: string;
  recipeTitle: string;
  sourceDate?: string;        // If dragging from calendar (for move)
  sourceMealType?: MealType;  // If dragging from calendar (for move)
  sourcePlannedMealId?: string; // ID of the planned meal being moved
}

// Drop target information
export interface DropTarget {
  date: string;
  mealType: MealType;
}

// Helper function to generate unique IDs
export function generateMealPlanId(): string {
  return `meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to get date string in YYYY-MM-DD format
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to parse YYYY-MM-DD string to Date
export function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Helper function to get start of week (Sunday)
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper function to get end of week (Saturday)
export function getWeekEnd(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  d.setHours(23, 59, 59, 999);
  return d;
}

// Helper function to add days to a date
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Helper function to check if two dates are the same day
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Helper function to get week days starting from a given date
export function getWeekDays(weekStart: Date): MealPlanDay[] {
  const today = new Date();
  const days: MealPlanDay[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    days.push({
      date: formatDateString(date),
      dayOfWeek: date.getDay(),
      isToday: isSameDay(date, today),
      meals: {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
      },
    });
  }

  return days;
}
