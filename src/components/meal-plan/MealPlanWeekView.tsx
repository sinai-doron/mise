import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMealPlanStore } from '../../stores/mealPlanStore';
import { MealPlanDayColumn } from './MealPlanDayColumn';
import { getWeekDays } from '../../types/MealPlan';
import type { Recipe } from '../../types/Recipe';

const colors = {
  primary: '#2C3E50',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
};

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
`;

const WeekGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(140px, 1fr));
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(7, minmax(130px, 1fr));
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(4, minmax(150px, 1fr));
  }

  @media (max-width: 650px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 400px) {
    grid-template-columns: 1fr;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;

  .material-symbols-outlined {
    font-size: 80px;
    color: #ddd;
    margin-bottom: 24px;
  }

  h3 {
    margin: 0 0 12px 0;
    font-size: 24px;
    font-weight: 700;
    color: ${colors.textMain};
    font-family: 'Playfair Display', Georgia, serif;
  }

  p {
    margin: 0;
    font-size: 16px;
    color: ${colors.textMuted};
    max-width: 400px;
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px;
  color: ${colors.textMuted};

  .material-symbols-outlined {
    font-size: 48px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

interface MealPlanWeekViewProps {
  recipes: Recipe[];
  isLoading?: boolean;
}

export function MealPlanWeekView({ recipes, isLoading }: MealPlanWeekViewProps) {
  const { t } = useTranslation();

  // Select raw state (stable references)
  const plannedMeals = useMealPlanStore((s) => s.plannedMeals);
  const currentWeekStart = useMealPlanStore((s) => s.currentWeekStart);

  // Compute week days with memoization to avoid infinite loops
  const weekDays = useMemo(() => {
    const days = getWeekDays(currentWeekStart);

    return days.map((day) => {
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
  }, [plannedMeals, currentWeekStart]);

  // Check if any meals are planned
  const hasMeals = weekDays.some((day) =>
    Object.values(day.meals).some((mealList) => mealList.length > 0)
  );

  return (
    <Container>
      <WeekGrid>
        {weekDays.map((day) => (
          <MealPlanDayColumn key={day.date} day={day} recipes={recipes} />
        ))}
      </WeekGrid>

      {isLoading ? (
        <LoadingState>
          <span className="material-symbols-outlined">hourglass_empty</span>
        </LoadingState>
      ) : !hasMeals && (
        <EmptyState>
          <span className="material-symbols-outlined">calendar_month</span>
          <h3>{t('mealPlan.empty.title')}</h3>
          <p>{t('mealPlan.empty.description')}</p>
        </EmptyState>
      )}
    </Container>
  );
}
