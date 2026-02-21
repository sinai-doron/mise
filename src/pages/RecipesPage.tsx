import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useLanguage } from '../i18n/useLanguage';
import { SEO } from '../components/SEO';
import { useRecipeStore } from '../stores/recipeStore';
import { useAuth } from '../firebase';
import { RecipeSidebar } from '../components/recipes/RecipeSidebar';
import { RecipeList } from '../components/recipes/RecipeList';
import { RecipeDetail } from '../components/recipes/RecipeDetail';
import { RecipeForm } from '../components/recipes/RecipeForm';
import { AIRecipeImport } from '../components/recipes/AIRecipeImport';
import { KeepImportModal } from '../components/recipes/KeepImportModal';
import { UserMenu } from '../components/UserMenu';
import type { Recipe } from '../types/Recipe';

// Color palette
const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
};

const PageContainer = styled.div`
  min-height: 100vh;
  background: ${colors.backgroundLight};
  display: flex;
  flex-direction: column;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow-x: hidden;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  background: rgba(240, 244, 248, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(44, 62, 80, 0.1);
  transition: all 0.3s;
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (min-width: 768px) {
    padding: 16px 32px;
  }
`;

const LogoGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover .logo-icon {
    transform: rotate(6deg);
  }
`;

const LogoIcon = styled.div`
  background: ${colors.primary};
  color: white;
  padding: 6px;
  border-radius: 8px;
  transform: rotate(3deg);
  transition: transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const LogoText = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: ${colors.primary};
  font-family: 'Playfair Display', Georgia, serif;
  letter-spacing: -0.02em;
`;

const Nav = styled.nav`
  display: none;
  align-items: center;
  gap: 32px;

  @media (min-width: 768px) {
    display: flex;
  }
`;

const NavLink = styled.a<{ $active?: boolean }>`
  font-size: 14px;
  font-weight: ${(props) => (props.$active ? '600' : '500')};
  color: ${(props) => (props.$active ? colors.primary : colors.textMain)};
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s;
  padding-bottom: 4px;
  border-bottom: 2px solid ${(props) => (props.$active ? colors.primary : 'transparent')};

  &:hover {
    color: ${colors.primary};
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const MobileMenuButton = styled.button`
  display: flex;
  color: ${colors.textMain};
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;

  @media (min-width: 768px) {
    display: none;
  }
`;

const MobileNav = styled.nav<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  flex-direction: column;
  background: ${colors.surface};
  border-top: 1px solid rgba(44, 62, 80, 0.1);
  padding: 8px 0;

  @media (min-width: 768px) {
    display: none;
  }
`;

const MobileNavLink = styled.a<{ $active?: boolean }>`
  padding: 14px 24px;
  font-size: 15px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  color: ${({ $active }) => ($active ? colors.primary : colors.textMain)};
  text-decoration: none;
  cursor: pointer;
  border-left: 3px solid ${({ $active }) => ($active ? colors.primary : 'transparent')};

  &:hover {
    background: rgba(44, 62, 80, 0.04);
    color: ${colors.primary};
  }
`;

const AddButton = styled.button`
  display: none;
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

  @media (min-width: 768px) {
    display: flex;
  }
`;

const AIImportButton = styled.button`
  display: none;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: ${colors.primary};
  border: 1px solid rgba(44, 62, 80, 0.2);
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(44, 62, 80, 0.05);
    border-color: ${colors.primary};
  }

  .material-symbols-outlined {
    font-size: 18px;
  }

  @media (min-width: 768px) {
    display: flex;
  }
`;

const LanguageToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(44, 62, 80, 0.08);
  border-radius: 8px;
  padding: 4px;
`;

const LanguageButton = styled.button<{ $active: boolean }>`
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  background: ${(props) => (props.$active ? colors.primary : 'transparent')};
  color: ${(props) => (props.$active ? 'white' : colors.textMain)};

  &:hover {
    background: ${(props) => (props.$active ? colors.primary : 'rgba(44, 62, 80, 0.12)')};
  }
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
    font-family: 'Playfair Display', Georgia, serif;
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
  const { currentLanguage, changeLanguage, isRTL } = useLanguage();
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
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

  // Escape key handler - navigate back within Prepd app
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (recipeId) {
          // Go back to recipe list
          navigate('/recipes');
        }
        // Don't navigate away from Prepd on escape when viewing list
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

  // Navigate to home (landing page)
  const handleGoHome = () => {
    navigate('/');
  };

  // Find selected recipe from URL param
  const selectedRecipe = recipeId ? recipes.find((r) => r.id === recipeId) : null;

  const activeFilterCount = [selectedCategory, selectedTag, selectedLanguage, searchQuery, hideBuiltIn ? 'hide' : null].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <PageContainer style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <SEO
        title="Prepd - Recipe Manager"
        description="Organize your recipes with scaling, grocery lists, and step-by-step cooking mode."
        canonical="/recipes"
        keywords="recipes, cooking, meal planning, grocery list"
      />

      <Header>
        <HeaderContent>
          <LogoGroup onClick={handleGoHome}>
            <LogoIcon className="logo-icon">
              <span className="material-symbols-outlined">restaurant_menu</span>
            </LogoIcon>
            <LogoText>Prepd</LogoText>
          </LogoGroup>

          <Nav>
            <NavLink $active={!recipeId} onClick={() => navigate('/recipes')}>{t('nav.recipes')}</NavLink>
            <NavLink onClick={() => navigate('/meal-plan')}>{t('nav.mealPlan')}</NavLink>
            <NavLink onClick={() => navigate('/shopping')}>{t('nav.shopping')}</NavLink>
            <NavLink onClick={() => navigate('/collections')}>{t('nav.collections')}</NavLink>
            <NavLink onClick={() => navigate('/discover')}>{t('discover.title')}</NavLink>
          </Nav>

          <HeaderRight>
            <LanguageToggle>
              <LanguageButton
                $active={currentLanguage === 'en'}
                onClick={() => changeLanguage('en')}
              >
                EN
              </LanguageButton>
              <LanguageButton
                $active={currentLanguage === 'he'}
                onClick={() => changeLanguage('he')}
              >
                עב
              </LanguageButton>
            </LanguageToggle>
            <MobileMenuButton onClick={() => setIsMobileNavOpen(o => !o)}>
              <span className="material-symbols-outlined">{isMobileNavOpen ? 'close' : 'menu'}</span>
            </MobileMenuButton>
            <AIImportButton onClick={() => setIsKeepImportOpen(true)}>
              <span className="material-symbols-outlined">upload_file</span>
              Import Keep
            </AIImportButton>
            <AIImportButton onClick={() => setIsAIImportOpen(true)}>
              <span className="material-symbols-outlined">auto_awesome</span>
              {t('nav.aiImport')}
            </AIImportButton>
            <AddButton onClick={handleAddRecipe}>
              <span className="material-symbols-outlined">add</span>
              {t('nav.addRecipe')}
            </AddButton>
            <UserMenu />
          </HeaderRight>
        </HeaderContent>
        <MobileNav $open={isMobileNavOpen}>
          <MobileNavLink $active={!recipeId} onClick={() => { navigate('/recipes'); setIsMobileNavOpen(false); }}>{t('nav.recipes')}</MobileNavLink>
          <MobileNavLink onClick={() => { navigate('/meal-plan'); setIsMobileNavOpen(false); }}>{t('nav.mealPlan')}</MobileNavLink>
          <MobileNavLink onClick={() => { navigate('/shopping'); setIsMobileNavOpen(false); }}>{t('nav.shopping')}</MobileNavLink>
          <MobileNavLink onClick={() => { navigate('/collections'); setIsMobileNavOpen(false); }}>{t('nav.collections')}</MobileNavLink>
          <MobileNavLink onClick={() => { navigate('/discover'); setIsMobileNavOpen(false); }}>{t('discover.title')}</MobileNavLink>
        </MobileNav>
      </Header>

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
