import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useLanguage } from '../i18n/useLanguage';
import { AppHeader } from '../components/AppHeader';
import { SEO } from '../components/SEO';
import { useRecipeStore } from '../stores/recipeStore';
import { useAuth } from '../firebase';
import { RecipeSidebar } from '../components/recipes/RecipeSidebar';
import { RecipeList } from '../components/recipes/RecipeList';
import { RecipeDetail } from '../components/recipes/RecipeDetail';
import { RecipeForm } from '../components/recipes/RecipeForm';
import { AIRecipeImport } from '../components/recipes/AIRecipeImport';
import { KeepImportModal } from '../components/recipes/KeepImportModal';
import type { Recipe } from '../types/Recipe';
import { colors, fonts } from '../styles/theme';

const PageContainer = styled.div`
  min-height: 100vh;
  background: ${colors.background};
  display: flex;
  flex-direction: column;
  font-family: ${fonts.body};
  overflow-x: hidden;
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const SidebarWrapper = styled.aside`
  width: 280px;
  background: ${colors.surface};
  border-right: 1px solid rgba(44, 62, 80, 0.1);
  overflow-y: auto;
  flex-shrink: 0;

  @media (max-width: 768px) {
    display: none;
  }
`;

const ContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;

  @media (min-width: 768px) {
    padding: 32px;
  }
`;

const SearchBar = styled.div`
  position: relative;
  margin-bottom: 16px;

  .material-symbols-outlined {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: ${colors.textMuted};
    font-size: 20px;
    pointer-events: none;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 1px solid rgba(44, 62, 80, 0.15);
  border-radius: 12px;
  font-size: 14px;
  background: ${colors.surface};
  box-sizing: border-box;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.1);
  }

  &::placeholder {
    color: ${colors.textMuted};
  }
`;

const MobileFilterToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${colors.surface};
  border: 1px solid rgba(44, 62, 80, 0.15);
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  color: ${colors.primary};
  cursor: pointer;
  margin-bottom: 16px;
  width: 100%;
  justify-content: space-between;

  @media (min-width: 768px) {
    display: none;
  }
`;

const MobileFilterPanel = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'block' : 'none')};
  background: ${colors.surface};
  border: 1px solid rgba(44, 62, 80, 0.1);
  border-radius: 12px;
  margin-bottom: 16px;

  @media (min-width: 768px) {
    display: none;
  }
`;

const DetailWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${colors.textMuted};
  text-align: center;
  padding: 40px;

  .material-symbols-outlined {
    font-size: 64px;
    color: #ddd;
    margin-bottom: 16px;
  }

  h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
    color: ${colors.textMain};
    font-family: 'Nunito', sans-serif;
  }

  p {
    margin: 0;
    font-size: 14px;
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

export function RecipesPage() {
  const navigate = useNavigate();
  const { recipeId } = useParams<{ recipeId: string }>();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user } = useAuth();

  const recipes = useRecipeStore((s) => s.recipes);
  const isLoading = useRecipeStore((s) => s.isLoading);
  const hasInitialized = useRecipeStore((s) => s.hasInitialized);
  const initializeFirebaseSync = useRecipeStore((s) => s.initializeFirebaseSync);
  const addRecipe = useRecipeStore((s) => s.addRecipe);
  const hideBuiltIn = useRecipeStore((s) => s.hideBuiltInRecipes);
  const setHideBuiltIn = useRecipeStore((s) => s.setHideBuiltInRecipes);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAIImportOpen, setIsAIImportOpen] = useState(false);
  const [isKeepImportOpen, setIsKeepImportOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>(undefined);

  // Initialize Firebase sync on mount (loads from Firestore + sets up real-time listeners)
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      cleanup = await initializeFirebaseSync();
    };

    init();

    return () => {
      if (cleanup) cleanup();
    };
  }, [initializeFirebaseSync, user]);

  // Escape key handler - navigate back within Duckbook app
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (recipeId) {
          // Go back to recipe list
          navigate('/recipes');
        }
        // Don't navigate away from Duckbook on escape when viewing list
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, recipeId]);

  // Get unique categories, tags, and languages
  const categories = [...new Set(recipes.map((r) => r.category))].sort();
  const tags = [...new Set(recipes.flatMap((r) => r.tags))].sort();
  const languages = [...new Set(recipes.map((r) => r.language).filter(Boolean))] as string[];

  // Filter recipes
  const filteredRecipes = recipes.filter((recipe) => {
    if (hideBuiltIn && recipe.isBuiltIn) return false;
    if (selectedCategory && recipe.category !== selectedCategory) return false;
    if (selectedTag && !recipe.tags.includes(selectedTag)) return false;
    if (selectedLanguage && recipe.language !== selectedLanguage) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        recipe.title.toLowerCase().includes(query) ||
        recipe.description.toLowerCase().includes(query) ||
        recipe.tags.some((t) => t.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // Navigate to recipe detail using URL
  const handleSelectRecipe = (id: string) => {
    navigate(`/recipes/${id}`);
  };

  // Navigate back to recipe list
  const handleCloseRecipe = () => {
    navigate('/recipes');
  };

  const handleAddRecipe = () => {
    setEditingRecipe(undefined);
    setIsFormOpen(true);
  };

  const handleSaveRecipe = (data: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingRecipe) {
      useRecipeStore.getState().updateRecipe(editingRecipe.id, data);
    } else {
      addRecipe(data);
    }
    setIsFormOpen(false);
    setEditingRecipe(undefined);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRecipe(undefined);
  };

  const handleAIImport = (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => {
    addRecipe(recipe);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsFormOpen(true);
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    const confirmMessage = recipe.language === 'he'
      ? `האם למחוק את המתכון "${recipe.title}"?`
      : `Delete recipe "${recipe.title}"?`;

    if (window.confirm(confirmMessage)) {
      useRecipeStore.getState().deleteRecipe(recipe.id);
      navigate('/recipes');
    }
  };

  // Find selected recipe from URL param
  const selectedRecipe = recipeId ? recipes.find((r) => r.id === recipeId) : null;

  const activeFilterCount = [selectedCategory, selectedTag, selectedLanguage, searchQuery, hideBuiltIn ? 'hide' : null].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <PageContainer style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <SEO
        title="Duckbook - Recipe Manager"
        description="Organize your recipes with scaling, grocery lists, and step-by-step cooking mode."
        canonical="/recipes"
        keywords="recipes, cooking, meal planning, grocery list"
      />

      <AppHeader
        activePage="recipes"
        onAIImport={() => setIsAIImportOpen(true)}
        onAdd={handleAddRecipe}
      />

      <MainContent>
        {!selectedRecipe && (
          <SidebarWrapper>
            <RecipeSidebar
              categories={categories}
              tags={tags}
              languages={languages}
              selectedCategory={selectedCategory}
              selectedTag={selectedTag}
              selectedLanguage={selectedLanguage}
              searchQuery={searchQuery}
              hideBuiltIn={hideBuiltIn}
              onSelectCategory={setSelectedCategory}
              onSelectTag={setSelectedTag}
              onSelectLanguage={setSelectedLanguage}
              onSearchChange={setSearchQuery}
              onToggleHideBuiltIn={() => setHideBuiltIn(!hideBuiltIn)}
              recipeCount={filteredRecipes.length}
            />
          </SidebarWrapper>
        )}

        <ContentArea>
          {!selectedRecipe && (
            <SearchBar>
              <span className="material-symbols-outlined">search</span>
              <SearchInput
                type="text"
                placeholder={t('sidebar.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </SearchBar>
          )}
          {!selectedRecipe && (
            <>
              <MobileFilterToggle onClick={() => setIsMobileFiltersOpen(o => !o)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>tune</span>
                  Filters{hasActiveFilters ? ` (${activeFilterCount})` : ''}
                </span>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {isMobileFiltersOpen ? 'expand_less' : 'expand_more'}
                </span>
              </MobileFilterToggle>
              <MobileFilterPanel $open={isMobileFiltersOpen}>
                <RecipeSidebar
                  categories={categories}
                  tags={tags}
                  languages={languages}
                  selectedCategory={selectedCategory}
                  selectedTag={selectedTag}
                  selectedLanguage={selectedLanguage}
                  searchQuery={searchQuery}
                  hideBuiltIn={hideBuiltIn}
                  onSelectCategory={setSelectedCategory}
                  onSelectTag={setSelectedTag}
                  onSelectLanguage={setSelectedLanguage}
                  onSearchChange={setSearchQuery}
                  onToggleHideBuiltIn={() => setHideBuiltIn(!hideBuiltIn)}
                  recipeCount={filteredRecipes.length}
                />
              </MobileFilterPanel>
            </>
          )}
          {selectedRecipe ? (
            <DetailWrapper>
              <RecipeDetail
                recipe={selectedRecipe}
                onClose={handleCloseRecipe}
                onEdit={selectedRecipe.isBuiltIn ? undefined : () => handleEditRecipe(selectedRecipe)}
                onDelete={selectedRecipe.isBuiltIn ? undefined : () => handleDeleteRecipe(selectedRecipe)}
              />
            </DetailWrapper>
          ) : !hasInitialized || isLoading ? (
            <LoadingState>
              <span className="material-symbols-outlined">hourglass_empty</span>
            </LoadingState>
          ) : filteredRecipes.length > 0 ? (
            <RecipeList
              recipes={filteredRecipes}
              onSelectRecipe={handleSelectRecipe}
            />
          ) : (
            <EmptyState>
              <span className="material-symbols-outlined">search_off</span>
              <h3>{t('empty.noRecipes')}</h3>
              <p>{t('empty.noRecipesHint')}</p>
            </EmptyState>
          )}
        </ContentArea>
      </MainContent>

      {isFormOpen && (
        <RecipeForm
          recipe={editingRecipe}
          onSave={handleSaveRecipe}
          onClose={handleCloseForm}
        />
      )}

      {isAIImportOpen && (
        <AIRecipeImport
          onImport={handleAIImport}
          onClose={() => setIsAIImportOpen(false)}
        />
      )}

      {isKeepImportOpen && (
        <KeepImportModal
          onImport={handleAIImport}
          onClose={() => setIsKeepImportOpen(false)}
        />
      )}
    </PageContainer>
  );
}
