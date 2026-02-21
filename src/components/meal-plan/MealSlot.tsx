import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { PlannedMealCard } from './PlannedMealCard';
import type { MealType, PlannedMeal } from '../../types/MealPlan';
import type { Recipe } from '../../types/Recipe';

const colors = {
  primary: '#2C3E50',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
  breakfast: '#f59e0b',
  lunch: '#22c55e',
  dinner: '#3b82f6',
  snack: '#a855f7',
};

const mealColors: Record<MealType, string> = {
  breakfast: colors.breakfast,
  lunch: colors.lunch,
  dinner: colors.dinner,
  snack: colors.snack,
};

const SlotContainer = styled.div<{ $isOver: boolean; $mealColor: string }>`
  min-height: 80px;
  border: 2px dashed ${(props) => (props.$isOver ? props.$mealColor : 'rgba(44, 62, 80, 0.15)')};
  border-radius: 12px;
  padding: 8px;
  background: ${(props) =>
    props.$isOver ? `${props.$mealColor}10` : 'rgba(255, 255, 255, 0.5)'};
  transition: all 0.15s;

  &:hover {
    border-color: ${(props) => props.$mealColor};
    background: ${(props) => `${props.$mealColor}08`};
  }
`;

const SlotHeader = styled.div<{ $mealColor: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding-inline-start: 4px;
`;

const MealIcon = styled.span<{ $mealColor: string }>`
  font-size: 14px;
  color: ${(props) => props.$mealColor};
`;

const MealLabel = styled.span<{ $mealColor: string }>`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(props) => props.$mealColor};
`;

const EmptyHint = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  font-size: 12px;
  color: ${colors.textMuted};
  opacity: 0.6;
`;

const MealsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

// Get icon for meal type
const getMealIcon = (mealType: MealType): string => {
  switch (mealType) {
    case 'breakfast':
      return 'egg_alt';
    case 'lunch':
      return 'lunch_dining';
    case 'dinner':
      return 'dinner_dining';
    case 'snack':
      return 'cookie';
  }
};

interface MealSlotProps {
  date: string;
  mealType: MealType;
  meals: PlannedMeal[];
  recipes: Recipe[];
}

export function MealSlot({ date, mealType, meals, recipes }: MealSlotProps) {
  const { t } = useTranslation();

  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${date}-${mealType}`,
    data: { date, mealType },
  });

  const mealColor = mealColors[mealType];

  return (
    <SlotContainer ref={setNodeRef} $isOver={isOver} $mealColor={mealColor}>
      <SlotHeader $mealColor={mealColor}>
        <MealIcon className="material-symbols-outlined" $mealColor={mealColor}>
          {getMealIcon(mealType)}
        </MealIcon>
        <MealLabel $mealColor={mealColor}>{t(`mealPlan.mealTypes.${mealType}`)}</MealLabel>
      </SlotHeader>

      {meals.length > 0 ? (
        <MealsContainer>
          {meals.map((meal) => {
            const recipe = recipes.find((r) => r.id === meal.recipeId);
            if (!recipe) return null;
            return <PlannedMealCard key={meal.id} meal={meal} recipe={recipe} />;
          })}
        </MealsContainer>
      ) : (
        <EmptyHint>{isOver ? '+ ' : ''}{t('mealPlan.dragHint')}</EmptyHint>
      )}
    </SlotContainer>
  );
}
