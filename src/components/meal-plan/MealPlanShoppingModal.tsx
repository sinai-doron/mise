import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMealPlanStore, getCurrentWeekRange } from '../../stores/mealPlanStore';
import { useRecipeStore } from '../../stores/recipeStore';
import { useShoppingListStore } from '../../stores/shoppingListStore';
import { ListPickerModal } from '../shopping/ListPickerModal';
import { addDays } from '../../types/MealPlan';
import { formatQuantity, CATEGORY_ORDER } from '../../types/Recipe';
import type { AggregatedIngredient } from '../../types/MealPlan';
import type { IngredientCategory } from '../../types/Recipe';

const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
  success: '#22c55e',
};

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
`;

const Modal = styled.div`
  background: ${colors.surface};
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
`;

const Header = styled.div`
  padding: 24px;
  border-bottom: 1px solid rgba(44, 62, 80, 0.1);
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: ${colors.textMain};
  font-family: 'Playfair Display', Georgia, serif;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${colors.textMuted};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba(44, 62, 80, 0.08);
    color: ${colors.textMain};
  }

  .material-symbols-outlined {
    font-size: 24px;
  }
`;

const RangeSelector = styled.div`
  display: flex;
  gap: 8px;
`;

const RangeButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px 16px;
  border: 1px solid ${(props) => (props.$active ? colors.primary : 'rgba(44, 62, 80, 0.2)')};
  border-radius: 10px;
  background: ${(props) => (props.$active ? colors.primary : 'transparent')};
  color: ${(props) => (props.$active ? 'white' : colors.textMain)};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${colors.primary};
    background: ${(props) => (props.$active ? colors.primary : 'rgba(44, 62, 80, 0.05)')};
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
`;

const CategorySection = styled.div`
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const CategoryTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${colors.primary};
`;

const IngredientList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const IngredientItem = styled.li`
  padding: 10px 0;
  border-bottom: 1px solid rgba(44, 62, 80, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;

  &:last-child {
    border-bottom: none;
  }
`;

const IngredientInfo = styled.div`
  flex: 1;
`;

const IngredientName = styled.span`
  font-size: 15px;
  color: ${colors.textMain};
`;

const IngredientQuantity = styled.span`
  font-weight: 700;
`;

const IngredientSources = styled.div`
  font-size: 12px;
  color: ${colors.textMuted};
  margin-top: 4px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  text-align: center;
  color: ${colors.textMuted};

  .material-symbols-outlined {
    font-size: 64px;
    color: #ddd;
    margin-bottom: 16px;
  }

  p {
    margin: 0;
    font-size: 16px;
  }
`;

const Footer = styled.div`
  padding: 20px 24px;
  border-top: 1px solid rgba(44, 62, 80, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const IngredientCount = styled.span`
  font-size: 14px;
  color: ${colors.textMuted};
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: ${colors.success};
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #16a34a;
    transform: translateY(-1px);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

type DateRange = 'thisWeek' | 'nextWeek';

interface MealPlanShoppingModalProps {
  onClose: () => void;
  weekStart: Date;
}

// Category labels for display
const getCategoryLabel = (category: IngredientCategory, t: (key: string) => string): string => {
  return t(`recipe.categories.${category}`);
};

export function MealPlanShoppingModal({ onClose, weekStart }: MealPlanShoppingModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedRange, setSelectedRange] = useState<DateRange>('thisWeek');
  const [showListPicker, setShowListPicker] = useState(false);

  const recipes = useRecipeStore((s) => s.recipes);

  const shoppingLists = useShoppingListStore((s) => s.lists);
  const addManualItem = useShoppingListStore((s) => s.addManualItem);

  const { aggregateIngredients, createGroceryItemsFromPlan } = useMealPlanStore();

  // Calculate date ranges
  const thisWeekRange = getCurrentWeekRange(weekStart);
  const nextWeekStart = addDays(weekStart, 7);
  const nextWeekRange = getCurrentWeekRange(nextWeekStart);

  // Get current range
  const currentRange = selectedRange === 'thisWeek' ? thisWeekRange : nextWeekRange;

  // Get aggregated ingredients
  const aggregatedIngredients = aggregateIngredients(
    currentRange.startDate,
    currentRange.endDate,
    recipes
  );

  // Group by category
  const groupedIngredients = CATEGORY_ORDER.reduce((acc, category) => {
    const items = aggregatedIngredients.filter((ing) => ing.category === category);
    if (items.length > 0) {
      acc.set(category, items);
    }
    return acc;
  }, new Map<IngredientCategory, AggregatedIngredient[]>());

  // Add aggregated ingredients to a specific shopping list
  const addIngredientsToList = (listId?: string) => {
    if (listId) {
      useShoppingListStore.getState().setActiveList(listId);
    }

    const items = createGroceryItemsFromPlan(
      currentRange.startDate,
      currentRange.endDate,
      recipes
    );

    for (const item of items) {
      addManualItem(item.name, item.scaledQuantity, item.unit, item.category);
    }

    onClose();
    navigate('/shopping');
  };

  // Handle add to shopping list
  const handleAddToShoppingList = () => {
    if (shoppingLists.length > 1) {
      setShowListPicker(true);
    } else {
      addIngredientsToList();
    }
  };

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <Modal>
        <Header>
          <HeaderRow>
            <Title>{t('mealPlan.shoppingList.title')}</Title>
            <CloseButton onClick={onClose}>
              <span className="material-symbols-outlined">close</span>
            </CloseButton>
          </HeaderRow>
          <RangeSelector>
            <RangeButton
              $active={selectedRange === 'thisWeek'}
              onClick={() => setSelectedRange('thisWeek')}
            >
              {t('mealPlan.shoppingList.thisWeek')}
            </RangeButton>
            <RangeButton
              $active={selectedRange === 'nextWeek'}
              onClick={() => setSelectedRange('nextWeek')}
            >
              {t('mealPlan.shoppingList.nextWeek')}
            </RangeButton>
          </RangeSelector>
        </Header>

        <Content>
          {aggregatedIngredients.length > 0 ? (
            Array.from(groupedIngredients.entries()).map(([category, ingredients]) => (
              <CategorySection key={category}>
                <CategoryTitle>{getCategoryLabel(category, t)}</CategoryTitle>
                <IngredientList>
                  {ingredients.map((ing, index) => (
                    <IngredientItem key={`${ing.name}-${ing.unit}-${index}`}>
                      <IngredientInfo>
                        <div>
                          <IngredientQuantity>
                            {formatQuantity(ing.totalQuantity)} {ing.unit}
                          </IngredientQuantity>{' '}
                          <IngredientName>{ing.name}</IngredientName>
                        </div>
                        <IngredientSources>
                          {ing.sources.map((s) => s.recipeName).join(', ')}
                        </IngredientSources>
                      </IngredientInfo>
                    </IngredientItem>
                  ))}
                </IngredientList>
              </CategorySection>
            ))
          ) : (
            <EmptyState>
              <span className="material-symbols-outlined">shopping_cart</span>
              <p>{t('mealPlan.shoppingList.emptyState')}</p>
            </EmptyState>
          )}
        </Content>

        <Footer>
          <IngredientCount>
            {t('mealPlan.shoppingList.ingredientsCount', { count: aggregatedIngredients.length })}
          </IngredientCount>
          <AddButton onClick={handleAddToShoppingList} disabled={aggregatedIngredients.length === 0}>
            <span className="material-symbols-outlined">add_shopping_cart</span>
            {t('mealPlan.shoppingList.addToList')}
          </AddButton>
        </Footer>
      </Modal>

      {showListPicker && (
        <ListPickerModal
          onSelect={(listId) => {
            setShowListPicker(false);
            addIngredientsToList(listId);
          }}
          onClose={() => setShowListPicker(false)}
        />
      )}
    </Overlay>
  );
}
