import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMealPlanStore } from '../../stores/mealPlanStore';
import type { PlannedMeal, DraggedRecipe } from '../../types/MealPlan';
import type { Recipe } from '../../types/Recipe';
import { generateRecipePlaceholder } from '../../utils/recipePlaceholder';

const colors = {
  primary: '#2C3E50',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
  danger: '#ef4444',
};

const Card = styled.div<{ $isDragging: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: ${colors.surface};
  border: 1px solid rgba(44, 62, 80, 0.1);
  border-radius: 8px;
  cursor: grab;
  opacity: ${(props) => (props.$isDragging ? 0.5 : 1)};
  transition: all 0.15s;

  &:hover {
    border-color: ${colors.primary};
    box-shadow: 0 2px 6px rgba(44, 62, 80, 0.1);
  }

  &:active {
    cursor: grabbing;
  }
`;

const ImageContainer = styled.div<{ $image?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: ${(props) =>
    props.$image
      ? `url("${props.$image.replace(/"/g, '%22')}") center/cover`
      : `linear-gradient(135deg, ${colors.backgroundLight} 0%, #e0e0e0 100%)`};
  flex-shrink: 0;
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div<{ $rtl?: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: ${colors.textMain};
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.3;
  direction: ${(props) => (props.$rtl ? 'rtl' : 'ltr')};
  text-align: start;
`;

const ServingsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
`;

const ServingsText = styled.span`
  font-size: 11px;
  color: ${colors.textMuted};
`;

const ServingsInput = styled.input`
  width: 32px;
  padding: 2px 4px;
  border: 1px solid rgba(44, 62, 80, 0.2);
  border-radius: 4px;
  font-size: 11px;
  text-align: center;
  color: ${colors.textMain};

  &:focus {
    outline: none;
    border-color: ${colors.primary};
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${colors.textMuted};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba(44, 62, 80, 0.08);
    color: ${colors.textMain};
  }

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

const DeleteButton = styled(ActionButton)`
  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: ${colors.danger};
  }
`;

interface PlannedMealCardProps {
  meal: PlannedMeal;
  recipe: Recipe;
}

export function PlannedMealCard({ meal, recipe }: PlannedMealCardProps) {
  const { t } = useTranslation();
  const { updatePlannedMeal, removePlannedMeal } = useMealPlanStore();
  const [isEditingServings, setIsEditingServings] = useState(false);
  const [servingsValue, setServingsValue] = useState(meal.servings.toString());

  const dragData: DraggedRecipe = {
    recipeId: meal.recipeId,
    recipeTitle: recipe.title,
    sourceDate: meal.date,
    sourceMealType: meal.mealType,
    sourcePlannedMealId: meal.id,
  };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `planned-${meal.id}`,
    data: dragData,
  });

  const handleServingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setServingsValue(e.target.value);
  };

  const handleServingsBlur = () => {
    const newServings = parseInt(servingsValue, 10);
    if (!isNaN(newServings) && newServings > 0 && newServings <= 100) {
      updatePlannedMeal(meal.id, { servings: newServings });
    } else {
      setServingsValue(meal.servings.toString());
    }
    setIsEditingServings(false);
  };

  const handleServingsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleServingsBlur();
    } else if (e.key === 'Escape') {
      setServingsValue(meal.servings.toString());
      setIsEditingServings(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removePlannedMeal(meal.id);
  };

  return (
    <Card ref={setNodeRef} $isDragging={isDragging} {...listeners} {...attributes}>
      <ImageContainer $image={recipe.image || generateRecipePlaceholder(recipe.id, recipe.title)} />
      <Info>
        <Title $rtl={recipe.language === 'he'}>{recipe.title}</Title>
        <ServingsContainer>
          {isEditingServings ? (
            <ServingsInput
              type="number"
              min="1"
              max="100"
              value={servingsValue}
              onChange={handleServingsChange}
              onBlur={handleServingsBlur}
              onKeyDown={handleServingsKeyDown}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <ServingsText onClick={(e) => { e.stopPropagation(); setIsEditingServings(true); }}>
              {t('mealPlan.servings', { count: meal.servings })}
            </ServingsText>
          )}
        </ServingsContainer>
      </Info>
      <Actions onPointerDown={(e) => e.stopPropagation()}>
        <DeleteButton onClick={handleRemove} title={t('mealPlan.removeFromPlan')}>
          <span className="material-symbols-outlined">close</span>
        </DeleteButton>
      </Actions>
    </Card>
  );
}
