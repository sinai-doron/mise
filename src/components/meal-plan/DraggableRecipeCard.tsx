import { useDraggable } from '@dnd-kit/core';
import styled from 'styled-components';
import type { Recipe } from '../../types/Recipe';
import type { DraggedRecipe } from '../../types/MealPlan';
import { generateRecipePlaceholder } from '../../utils/recipePlaceholder';

// Format minutes to "1h 20m" format
const formatTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const colors = {
  primary: '#2C3E50',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
};

const Card = styled.div<{ $isDragging: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: ${(props) => (props.$isDragging ? colors.backgroundLight : colors.surface)};
  border: 1px solid rgba(44, 62, 80, 0.1);
  border-radius: 12px;
  cursor: grab;
  transition: all 0.15s;
  opacity: ${(props) => (props.$isDragging ? 0.5 : 1)};

  &:hover {
    border-color: ${colors.primary};
    box-shadow: 0 2px 8px rgba(44, 62, 80, 0.1);
  }

  &:active {
    cursor: grabbing;
  }
`;

const ImageContainer = styled.div<{ $image?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 8px;
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

const Title = styled.h4<{ $rtl?: boolean }>`
  margin: 0;
  font-size: 14px;
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

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: ${colors.textMuted};
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 3px;

  .material-symbols-outlined {
    font-size: 14px;
  }
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  color: ${colors.textMuted};

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

interface DraggableRecipeCardProps {
  recipe: Recipe;
}

export function DraggableRecipeCard({ recipe }: DraggableRecipeCardProps) {
  const dragData: DraggedRecipe = {
    recipeId: recipe.id,
    recipeTitle: recipe.title,
  };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `recipe-${recipe.id}`,
    data: dragData,
  });

  const totalTime = recipe.prepTime + recipe.cookTime;

  return (
    <Card ref={setNodeRef} $isDragging={isDragging} {...listeners} {...attributes}>
      <ImageContainer $image={recipe.image || generateRecipePlaceholder(recipe.id, recipe.title)} />
      <Info>
        <Title $rtl={recipe.language === 'he'}>{recipe.title}</Title>
        <Meta>
          <MetaItem>
            <span className="material-symbols-outlined">schedule</span>
            {formatTime(totalTime)}
          </MetaItem>
          <MetaItem>
            <span className="material-symbols-outlined">restaurant</span>
            {recipe.defaultServings}
          </MetaItem>
        </Meta>
      </Info>
      <DragHandle>
        <span className="material-symbols-outlined">drag_indicator</span>
      </DragHandle>
    </Card>
  );
}
