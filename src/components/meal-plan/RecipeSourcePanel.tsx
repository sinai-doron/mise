import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { DraggableRecipeCard } from './DraggableRecipeCard';
import type { Recipe } from '../../types/Recipe';

const colors = {
  primary: '#2C3E50',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
  border: 'rgba(44, 62, 80, 0.1)',
};

const Panel = styled.aside`
  width: 280px;
  background: ${colors.surface};
  border-right: 1px solid ${colors.border};
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;

  @media (max-width: 1024px) {
    width: 240px;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const PanelHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid ${colors.border};
`;

const PanelTitle = styled.h2`
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 700;
  color: ${colors.textMain};
  font-family: 'Playfair Display', Georgia, serif;
`;

const SearchContainer = styled.div`
  position: relative;
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${colors.textMuted};
  font-size: 20px;

  [dir='rtl'] & {
    left: auto;
    right: 12px;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1px solid ${colors.border};
  border-radius: 10px;
  font-size: 14px;
  background: ${colors.backgroundLight};
  color: ${colors.textMain};
  transition: all 0.15s;

  [dir='rtl'] & {
    padding: 10px 40px 10px 12px;
  }

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    background: white;
  }

  &::placeholder {
    color: ${colors.textMuted};
  }
`;

const RecipeList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DragHint = styled.p`
  font-size: 12px;
  color: ${colors.textMuted};
  text-align: center;
  margin: 0 0 8px 0;
  padding: 0 8px;
`;

const FilterRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  margin-top: 12px;
  cursor: pointer;
  font-size: 13px;
  color: ${colors.textMuted};

  &:hover {
    color: ${colors.textMain};
  }
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: ${colors.primary};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: ${colors.textMuted};

  .material-symbols-outlined {
    font-size: 48px;
    color: #ddd;
    margin-bottom: 12px;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
`;

interface RecipeSourcePanelProps {
  recipes: Recipe[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  hideBuiltIn: boolean;
  onToggleHideBuiltIn: () => void;
}

export function RecipeSourcePanel({
  recipes,
  searchQuery,
  onSearchChange,
  hideBuiltIn,
  onToggleHideBuiltIn,
}: RecipeSourcePanelProps) {
  const { t } = useTranslation();

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t('mealPlan.recipePanel.title')}</PanelTitle>
        <SearchContainer>
          <SearchIcon className="material-symbols-outlined">search</SearchIcon>
          <SearchInput
            type="text"
            placeholder={t('mealPlan.recipePanel.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </SearchContainer>
        <FilterRow>
          <Checkbox
            type="checkbox"
            checked={hideBuiltIn}
            onChange={onToggleHideBuiltIn}
          />
          {t('mealPlan.recipePanel.hideBuiltIn', 'Hide built-in recipes')}
        </FilterRow>
      </PanelHeader>

      <RecipeList>
        {recipes.length > 0 ? (
          <>
            <DragHint>{t('mealPlan.recipePanel.dragHint')}</DragHint>
            {recipes.map((recipe) => (
              <DraggableRecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </>
        ) : (
          <EmptyState>
            <span className="material-symbols-outlined">search_off</span>
            <p>{t('empty.noRecipes')}</p>
          </EmptyState>
        )}
      </RecipeList>
    </Panel>
  );
}
