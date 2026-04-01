import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useLanguage } from '../i18n/useLanguage';
import { AppHeader } from '../components/AppHeader';
import { SEO } from '../components/SEO';
import { useRecipeStore } from '../stores/recipeStore';
import { useMealPlanStore } from '../stores/mealPlanStore';
import { useAuth } from '../firebase';
import { MealPlanWeekView } from '../components/meal-plan/MealPlanWeekView';
import { RecipeSourcePanel } from '../components/meal-plan/RecipeSourcePanel';
import { MealPlanShoppingModal } from '../components/meal-plan/MealPlanShoppingModal';
import type { MealType, DraggedRecipe } from '../types/MealPlan';
import type { Recipe } from '../types/Recipe';
import { colors, fonts } from '../styles/theme';

const PageContainer = styled.div`
  min-height: 100vh;
  background: ${colors.background};
  display: flex;
  flex-direction: column;
  font-family: ${fonts.body};
`;

const ShoppingListButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${colors.primary};
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${colors.primaryDark};
    transform: translateY(-1px);
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const WeekNavigation = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const WeekNavButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: rgba(44, 62, 80, 0.08);
  color: ${colors.textMain};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba(44, 62, 80, 0.15);
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const TodayButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: rgba(44, 62, 80, 0.08);
  color: ${colors.textMain};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba(44, 62, 80, 0.15);
  }
`;

const WeekLabel = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: ${colors.textMain};
  min-width: 200px;
  text-align: center;
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const CalendarArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;

  @media (min-width: 768px) {
    padding: 32px;
  }
`;

const DragOverlayCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 250px;
`;

const DragOverlayImage = styled.div<{ $image?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: ${(props) =>
    props.$image
      ? `url("${props.$image.replace(/"/g, '%22')}") center/cover`
      : `linear-gradient(135deg, ${colors.background} 0%, #e0e0e0 100%)`};
  flex-shrink: 0;
`;

const DragOverlayTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.textMain};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export function MealPlanPage() {
  const { t } = useTranslation();
  const { currentLanguage, isRTL } = useLanguage();
  const { user } = useAuth();

  const recipes = useRecipeStore((s) => s.recipes);
  const isLoading = useRecipeStore((s) => s.isLoading);
  const hasInitialized = useRecipeStore((s) => s.hasInitialized);
  const hideBuiltInRecipes = useRecipeStore((s) => s.hideBuiltInRecipes);
  const setHideBuiltInRecipes = useRecipeStore((s) => s.setHideBuiltInRecipes);
  const initializeFirebaseSync = useRecipeStore((s) => s.initializeFirebaseSync);

  const {
    currentWeekStart,
    loadFromStorage: loadMealPlan,
    addPlannedMeal,
    movePlannedMeal,
    goToNextWeek,
    goToPreviousWeek,
    goToToday,
  } = useMealPlanStore();

  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDragItem, setActiveDragItem] = useState<DraggedRecipe | null>(null);

  // Load data on mount
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      cleanup = await initializeFirebaseSync();
      loadMealPlan();
    };

    init();

    return () => {
      if (cleanup) cleanup();
    };
  }, [initializeFirebaseSync, loadMealPlan, user]);

  // Filter recipes by search query and built-in preference
  const filteredRecipes = recipes.filter((recipe) => {
    // Hide built-in recipes if preference is set
    if (hideBuiltInRecipes && recipe.isBuiltIn) return false;

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      recipe.title.toLowerCase().includes(query) ||
      recipe.tags.some((t) => t.toLowerCase().includes(query))
    );
  });

  // Format week label
  const formatWeekLabel = () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const startMonth = currentWeekStart.toLocaleDateString(currentLanguage, { month: 'short' });
    const startDay = currentWeekStart.getDate();
    const endMonth = weekEnd.toLocaleDateString(currentLanguage, { month: 'short' });
    const endDay = weekEnd.getDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const dragData = active.data.current as DraggedRecipe | undefined;
    if (dragData) {
      setActiveDragItem(dragData);
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const dragData = active.data.current as DraggedRecipe | undefined;
    const dropData = over.data.current as { date: string; mealType: MealType } | undefined;

    if (!dragData || !dropData) return;

    const { date, mealType } = dropData;

    // If moving an existing planned meal
    if (dragData.sourcePlannedMealId) {
      movePlannedMeal(dragData.sourcePlannedMealId, date, mealType);
    } else {
      // Adding a new recipe to the plan
      const recipe = recipes.find((r) => r.id === dragData.recipeId);
      if (recipe) {
        addPlannedMeal(dragData.recipeId, date, mealType, recipe.defaultServings);
      }
    }
  };

  // Get the active recipe for drag overlay
  const getActiveRecipe = (): Recipe | undefined => {
    if (!activeDragItem) return undefined;
    return recipes.find((r) => r.id === activeDragItem.recipeId);
  };

  const activeRecipe = getActiveRecipe();

  return (
    <PageContainer style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <SEO
        title="Meal Plan - Duckbook"
        description="Plan your weekly meals with our drag-and-drop meal planner."
        canonical="/meal-plan"
        keywords="meal planning, weekly meals, recipe planner"
      />

      <AppHeader activePage="meal-plan" />

      <WeekNavigation>
        <WeekNavButton onClick={goToPreviousWeek} title={t('mealPlan.previousWeek')}>
          <span className="material-symbols-outlined">
            {isRTL ? 'chevron_right' : 'chevron_left'}
          </span>
        </WeekNavButton>
        <TodayButton onClick={goToToday}>{t('mealPlan.today')}</TodayButton>
        <WeekLabel>{formatWeekLabel()}</WeekLabel>
        <WeekNavButton onClick={goToNextWeek} title={t('mealPlan.nextWeek')}>
          <span className="material-symbols-outlined">
            {isRTL ? 'chevron_left' : 'chevron_right'}
          </span>
        </WeekNavButton>
        <ShoppingListButton onClick={() => setShowShoppingModal(true)}>
          <span className="material-symbols-outlined">shopping_cart</span>
          {t('mealPlan.shoppingList.generateButton')}
        </ShoppingListButton>
      </WeekNavigation>

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <MainContent>
          <RecipeSourcePanel
            recipes={filteredRecipes}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            hideBuiltIn={hideBuiltInRecipes}
            onToggleHideBuiltIn={() => setHideBuiltInRecipes(!hideBuiltInRecipes)}
          />

          <CalendarArea>
            <MealPlanWeekView recipes={recipes} isLoading={!hasInitialized || isLoading} />
          </CalendarArea>
        </MainContent>

        <DragOverlay>
          {activeDragItem && activeRecipe && (
            <DragOverlayCard>
              <DragOverlayImage $image={activeRecipe.image} />
              <DragOverlayTitle>{activeRecipe.title}</DragOverlayTitle>
            </DragOverlayCard>
          )}
        </DragOverlay>
      </DndContext>

      {showShoppingModal && (
        <MealPlanShoppingModal
          onClose={() => setShowShoppingModal(false)}
          weekStart={currentWeekStart}
        />
      )}
    </PageContainer>
  );
}
