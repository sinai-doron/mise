import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useLanguage } from '../i18n/useLanguage';
import { SEO } from '../components/SEO';
import { UserMenu } from '../components/UserMenu';
import { useAuth } from '../firebase';
import {
  getPublicRecipes,
  getPublicCollections,
  type DiscoverRecipeResult,
  type DiscoverCollectionResult,
  type SortOption,
} from '../firebase/discoverSync';
import { generateAvatar } from '../utils/avatarGenerator';
import { generateRecipePlaceholder } from '../utils/recipePlaceholder';
import type { Recipe, Collection, Visibility } from '../types/Recipe';
import { migrateVisibility } from '../types/Recipe';
import type { DocumentSnapshot } from 'firebase/firestore';

// Color palette
const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
  accent: '#3498db',
  green: '#22c55e',
};

const PageContainer = styled.div`
  min-height: 100vh;
  background: ${colors.backgroundLight};
  display: flex;
  flex-direction: column;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  background: rgba(240, 244, 248, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(44, 62, 80, 0.1);
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
  background: ${(props) => (props.$active ? colors.primary : 'transparent')};
  color: ${(props) => (props.$active ? 'white' : colors.textMain)};

  &:hover {
    background: ${(props) => (props.$active ? colors.primary : 'rgba(44, 62, 80, 0.12)')};
  }
`;

const HeroSection = styled.div`
  background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%);
  color: white;
  padding: 48px 24px;
  text-align: center;

  @media (min-width: 768px) {
    padding: 64px 32px;
  }
`;

const HeroTitle = styled.h1`
  margin: 0 0 12px 0;
  font-size: 32px;
  font-weight: 700;
  font-family: 'Playfair Display', Georgia, serif;

  @media (min-width: 768px) {
    font-size: 42px;
  }
`;

const HeroSubtitle = styled.p`
  margin: 0 auto;
  font-size: 16px;
  opacity: 0.9;
  max-width: 500px;
  line-height: 1.6;

  @media (min-width: 768px) {
    font-size: 18px;
  }
`;

const MainContent = styled.main`
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  width: 100%;
  box-sizing: border-box;

  @media (min-width: 768px) {
    padding: 32px;
  }
`;

const ControlsBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const TabsWrapper = styled.div`
  display: flex;
  gap: 8px;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid ${(props) => (props.$active ? colors.primary : 'rgba(44, 62, 80, 0.15)')};
  background: ${(props) => (props.$active ? colors.primary : colors.surface)};
  color: ${(props) => (props.$active ? 'white' : colors.textMain)};
  display: flex;
  align-items: center;
  gap: 8px;

  .material-symbols-outlined {
    font-size: 18px;
  }

  &:hover {
    border-color: ${colors.primary};
  }
`;

const FiltersRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
`;

const SearchWrapper = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 320px;

  .material-symbols-outlined {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: ${colors.textMuted};
    font-size: 20px;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 16px 10px 44px;
  border: 1px solid rgba(44, 62, 80, 0.15);
  border-radius: 10px;
  font-size: 14px;
  background: ${colors.surface};
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.1);
  }
`;

const SortDropdown = styled.select`
  padding: 10px 32px 10px 14px;
  border: 1px solid rgba(44, 62, 80, 0.15);
  border-radius: 10px;
  font-size: 14px;
  background: ${colors.surface};
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
  }
`;

const FilterChips = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 24px;
`;

const FilterChip = styled.button<{ $active: boolean }>`
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid ${(props) => (props.$active ? colors.primary : 'rgba(44, 62, 80, 0.15)')};
  background: ${(props) => (props.$active ? colors.primary : colors.surface)};
  color: ${(props) => (props.$active ? 'white' : colors.textMain)};

  &:hover {
    border-color: ${colors.primary};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
`;

const Card = styled.div`
  background: ${colors.surface};
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgba(44, 62, 80, 0.08);
  transition: all 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(44, 62, 80, 0.12);
  }
`;

const CardImage = styled.div<{ $src?: string }>`
  height: 180px;
  background-image: ${(props) =>
    props.$src ? `url("${props.$src.replace(/"/g, '%22')}")` : 'none'};
  background-color: #e0e5ec;
  background-size: cover;
  background-position: center;
  position: relative;
`;

const SaveButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  .material-symbols-outlined {
    font-size: 20px;
    color: ${colors.textMuted};
  }

  &:hover {
    transform: scale(1.1);
    background: white;

    .material-symbols-outlined {
      color: ${colors.primary};
    }
  }
`;

const VisibilityBadge = styled.div<{ $visibility: Visibility }>`
  position: absolute;
  top: 12px;
  inset-inline-start: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  font-size: 11px;
  font-weight: 600;
  color: ${(props) => {
    switch (props.$visibility) {
      case 'public': return '#22c55e';
      case 'unlisted': return '#f59e0b';
      case 'private': return '#64748b';
      default: return '#64748b';
    }
  }};

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

const getVisibilityIcon = (visibility: Visibility): string => {
  switch (visibility) {
    case 'public': return 'public';
    case 'unlisted': return 'link';
    case 'private': return 'lock';
    default: return 'lock';
  }
};

const CardContent = styled.div`
  padding: 16px;
`;

const CardTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: ${colors.textMain};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CardDescription = styled.p`
  margin: 0 0 12px 0;
  font-size: 13px;
  color: ${colors.textMuted};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: ${colors.textMuted};
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

const CategoryBadge = styled.span`
  background: rgba(44, 62, 80, 0.08);
  color: ${colors.primary};
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
`;

const CollectionAvatar = styled.div<{ $src?: string }>`
  width: 100%;
  height: 180px;
  background: ${(props) =>
    props.$src
      ? `url("${props.$src.replace(/"/g, '%22')}") center/cover`
      : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;

  .material-symbols-outlined {
    font-size: 64px;
    opacity: 0.8;
  }
`;

const OwnerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(44, 62, 80, 0.08);
`;

const OwnerAvatar = styled.div<{ $src?: string }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${(props) =>
    props.$src
      ? `url(${props.$src}) center/cover`
      : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`};
`;

const OwnerName = styled.span`
  font-size: 12px;
  color: ${colors.textMuted};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  color: ${colors.textMuted};
  text-align: center;

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

const LoadMoreButton = styled.button`
  display: block;
  margin: 32px auto 0;
  padding: 12px 32px;
  background: ${colors.surface};
  border: 1px solid rgba(44, 62, 80, 0.15);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: ${colors.primary};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${colors.primary};
    color: white;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  color: ${colors.textMuted};

  .material-symbols-outlined {
    font-size: 48px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// Sign-in prompt modal
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 400px;
  width: 100%;
  text-align: center;
`;

const ModalIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(44, 62, 80, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;

  .material-symbols-outlined {
    font-size: 32px;
    color: ${colors.primary};
  }
`;

const ModalTitle = styled.h2`
  margin: 0 0 12px 0;
  font-size: 22px;
  font-weight: 700;
  color: ${colors.textMain};
  font-family: 'Playfair Display', Georgia, serif;
`;

const ModalDescription = styled.p`
  margin: 0 0 24px 0;
  font-size: 14px;
  color: ${colors.textMuted};
  line-height: 1.6;
`;

const ModalButton = styled.button`
  width: 100%;
  padding: 14px;
  background: ${colors.primary};
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 12px;

  &:hover {
    background: ${colors.primaryDark};
  }
`;

const ModalSecondaryButton = styled.button`
  width: 100%;
  padding: 14px;
  background: transparent;
  color: ${colors.textMuted};
  border: none;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    color: ${colors.textMain};
  }
`;

type TabType = 'recipes' | 'collections';

export function DiscoverPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, isRTL } = useLanguage();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('recipes');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Recipes state
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [recipesLastDoc, setRecipesLastDoc] = useState<DocumentSnapshot | null>(null);
  const [recipesHasMore, setRecipesHasMore] = useState(true);
  const [recipesLoadingMore, setRecipesLoadingMore] = useState(false);

  // Collections state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [collectionsLastDoc, setCollectionsLastDoc] = useState<DocumentSnapshot | null>(null);
  const [collectionsHasMore, setCollectionsHasMore] = useState(true);
  const [collectionsLoadingMore, setCollectionsLoadingMore] = useState(false);

  // Sign-in prompt modal
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  // Fetch recipes
  const fetchRecipes = useCallback(async (reset = false) => {
    if (reset) {
      setRecipesLoading(true);
    }

    const result: DiscoverRecipeResult = await getPublicRecipes({
      pageSize: 20,
      startAfterDoc: reset ? null : recipesLastDoc,
      sortBy,
    });

    if (reset) {
      setRecipes(result.recipes);
    } else {
      setRecipes((prev) => [...prev, ...result.recipes]);
    }
    setRecipesLastDoc(result.lastDoc);
    setRecipesHasMore(result.hasMore);
    setRecipesLoading(false);
    setRecipesLoadingMore(false);
  }, [recipesLastDoc, sortBy]);

  // Fetch collections
  const fetchCollections = useCallback(async (reset = false) => {
    if (reset) {
      setCollectionsLoading(true);
    }

    const result: DiscoverCollectionResult = await getPublicCollections({
      pageSize: 20,
      startAfterDoc: reset ? null : collectionsLastDoc,
      sortBy,
    });

    if (reset) {
      setCollections(result.collections);
    } else {
      setCollections((prev) => [...prev, ...result.collections]);
    }
    setCollectionsLastDoc(result.lastDoc);
    setCollectionsHasMore(result.hasMore);
    setCollectionsLoading(false);
    setCollectionsLoadingMore(false);
  }, [collectionsLastDoc, sortBy]);

  // Initial fetch
  useEffect(() => {
    fetchRecipes(true);
    fetchCollections(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when sort changes
  useEffect(() => {
    fetchRecipes(true);
    fetchCollections(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  // Load more handlers
  const handleLoadMoreRecipes = () => {
    if (recipesLoadingMore || !recipesHasMore) return;
    setRecipesLoadingMore(true);
    fetchRecipes(false);
  };

  const handleLoadMoreCollections = () => {
    if (collectionsLoadingMore || !collectionsHasMore) return;
    setCollectionsLoadingMore(true);
    fetchCollections(false);
  };

  // Extract unique categories from recipes
  const categories = useMemo(() => {
    return [...new Set(recipes.map((r) => r.category))].filter(Boolean).sort();
  }, [recipes]);

  // Client-side filtering for recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      if (selectedCategory && recipe.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          recipe.title.toLowerCase().includes(q) ||
          recipe.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [recipes, selectedCategory, searchQuery]);

  // Client-side filtering for collections
  const filteredCollections = useMemo(() => {
    if (!searchQuery) return collections;
    const q = searchQuery.toLowerCase();
    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false)
    );
  }, [collections, searchQuery]);

  const handleRecipeClick = (recipeId: string) => {
    navigate(`/recipe/${recipeId}`);
  };

  const handleCollectionClick = (collectionId: string) => {
    navigate(`/u/${collectionId}`);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setShowSignInPrompt(true);
    } else {
      // User is logged in - could open a "add to collection" modal
      // For now, just navigate to the item
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const isLoading = activeTab === 'recipes' ? recipesLoading : collectionsLoading;
  const currentItems = activeTab === 'recipes' ? filteredRecipes : filteredCollections;
  const hasMore = activeTab === 'recipes' ? recipesHasMore : collectionsHasMore;
  const loadingMore = activeTab === 'recipes' ? recipesLoadingMore : collectionsLoadingMore;
  const handleLoadMore = activeTab === 'recipes' ? handleLoadMoreRecipes : handleLoadMoreCollections;

  return (
    <PageContainer style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <SEO
        title={`${t('discover.title')} - Prepd`}
        description="Browse and discover recipes and collections shared by the community."
        canonical="/discover"
        keywords="discover recipes, community recipes, public recipes, cooking"
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
            <NavLink onClick={() => navigate('/recipes')}>{t('nav.recipes')}</NavLink>
            <NavLink onClick={() => navigate('/meal-plan')}>{t('nav.mealPlan')}</NavLink>
            <NavLink onClick={() => navigate('/shopping')}>{t('nav.shopping')}</NavLink>
            <NavLink onClick={() => navigate('/collections')}>{t('nav.collections')}</NavLink>
            <NavLink $active onClick={() => navigate('/discover')}>{t('discover.title')}</NavLink>
          </Nav>

          <HeaderRight>
            <LanguageToggle>
              <LanguageButton $active={currentLanguage === 'en'} onClick={() => changeLanguage('en')}>
                EN
              </LanguageButton>
              <LanguageButton $active={currentLanguage === 'he'} onClick={() => changeLanguage('he')}>
                עב
              </LanguageButton>
            </LanguageToggle>
            <MobileMenuButton onClick={() => setIsMobileNavOpen(o => !o)}>
              <span className="material-symbols-outlined">{isMobileNavOpen ? 'close' : 'menu'}</span>
            </MobileMenuButton>
            <UserMenu />
          </HeaderRight>
        </HeaderContent>
        <MobileNav $open={isMobileNavOpen}>
          <MobileNavLink onClick={() => { navigate('/recipes'); setIsMobileNavOpen(false); }}>{t('nav.recipes')}</MobileNavLink>
          <MobileNavLink onClick={() => { navigate('/meal-plan'); setIsMobileNavOpen(false); }}>{t('nav.mealPlan')}</MobileNavLink>
          <MobileNavLink onClick={() => { navigate('/shopping'); setIsMobileNavOpen(false); }}>{t('nav.shopping')}</MobileNavLink>
          <MobileNavLink onClick={() => { navigate('/collections'); setIsMobileNavOpen(false); }}>{t('nav.collections')}</MobileNavLink>
          <MobileNavLink $active>{t('discover.title')}</MobileNavLink>
        </MobileNav>
      </Header>

      <HeroSection>
        <HeroTitle>{t('discover.heroTitle')}</HeroTitle>
        <HeroSubtitle>{t('discover.heroSubtitle')}</HeroSubtitle>
      </HeroSection>

      <MainContent>
        <ControlsBar>
          <TabsWrapper>
            <Tab $active={activeTab === 'recipes'} onClick={() => setActiveTab('recipes')}>
              <span className="material-symbols-outlined">restaurant</span>
              {t('discover.tabRecipes')}
            </Tab>
            <Tab $active={activeTab === 'collections'} onClick={() => setActiveTab('collections')}>
              <span className="material-symbols-outlined">collections_bookmark</span>
              {t('discover.tabCollections')}
            </Tab>
          </TabsWrapper>

          <FiltersRow>
            <SearchWrapper>
              <span className="material-symbols-outlined">search</span>
              <SearchInput
                type="text"
                placeholder={t('discover.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </SearchWrapper>
            <SortDropdown value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
              <option value="recent">{t('discover.sortRecent')}</option>
              <option value="popular">{t('discover.sortPopular')}</option>
            </SortDropdown>
          </FiltersRow>
        </ControlsBar>

        {activeTab === 'recipes' && categories.length > 0 && (
          <FilterChips>
            <FilterChip $active={selectedCategory === null} onClick={() => setSelectedCategory(null)}>
              {t('discover.filterAll')}
            </FilterChip>
            {categories.map((category) => (
              <FilterChip
                key={category}
                $active={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </FilterChip>
            ))}
          </FilterChips>
        )}

        {isLoading ? (
          <LoadingState>
            <span className="material-symbols-outlined">progress_activity</span>
            <p>{t('common.loading')}</p>
          </LoadingState>
        ) : currentItems.length > 0 ? (
          <>
            <Grid>
              {activeTab === 'recipes'
                ? filteredRecipes.map((recipe) => {
                    const visibility = recipe.visibility ?? migrateVisibility(recipe.isPublic);
                    return (
                    <Card key={recipe.id} onClick={() => handleRecipeClick(recipe.id)}>
                      <CardImage $src={recipe.image?.trim() || generateRecipePlaceholder(recipe.id, recipe.title)}>
                        <VisibilityBadge $visibility={visibility} title={t(`share.${visibility}`)}>
                          <span className="material-symbols-outlined">{getVisibilityIcon(visibility)}</span>
                        </VisibilityBadge>
                        <SaveButton onClick={handleSaveClick} title={t('discover.save')}>
                          <span className="material-symbols-outlined">bookmark_add</span>
                        </SaveButton>
                      </CardImage>
                      <CardContent>
                        <CardTitle>{recipe.title}</CardTitle>
                        <CardDescription>{recipe.description}</CardDescription>
                        <CardMeta>
                          <MetaItem>
                            <span className="material-symbols-outlined">schedule</span>
                            {recipe.prepTime + recipe.cookTime} {t('common.mins')}
                          </MetaItem>
                          {recipe.category && <CategoryBadge>{recipe.category}</CategoryBadge>}
                        </CardMeta>
                      </CardContent>
                    </Card>
                  );})
                : filteredCollections.map((collection) => {
                    const visibility = collection.visibility ?? migrateVisibility(collection.isPublic);
                    return (
                    <Card key={collection.id} onClick={() => handleCollectionClick(collection.id)}>
                      <div style={{ position: 'relative' }}>
                        <CollectionAvatar $src={collection.coverImage || generateAvatar(collection.id)}>
                          {!collection.coverImage && (
                            <span className="material-symbols-outlined">collections_bookmark</span>
                          )}
                        </CollectionAvatar>
                        <VisibilityBadge $visibility={visibility} title={t(`share.${visibility}`)} style={{ position: 'absolute', top: 12, left: 12 }}>
                          <span className="material-symbols-outlined">{getVisibilityIcon(visibility)}</span>
                        </VisibilityBadge>
                      </div>
                      <CardContent>
                        <CardTitle>{collection.name}</CardTitle>
                        <CardDescription>
                          {collection.description || `${collection.recipeIds.length} ${t('common.recipes')}`}
                        </CardDescription>
                        <CardMeta>
                          <MetaItem>
                            <span className="material-symbols-outlined">menu_book</span>
                            {collection.recipeIds.length} {t('common.recipes')}
                          </MetaItem>
                          <MetaItem>
                            <span className="material-symbols-outlined">visibility</span>
                            {collection.stats.views} {t('share.views')}
                          </MetaItem>
                        </CardMeta>
                        {collection.ownerName && (
                          <OwnerInfo>
                            <OwnerAvatar $src={collection.ownerAvatar} />
                            <OwnerName>{t('common.by')} {collection.ownerName}</OwnerName>
                          </OwnerInfo>
                        )}
                      </CardContent>
                    </Card>
                  );})
            }</Grid>

            {hasMore && !searchQuery && !selectedCategory && (
              <LoadMoreButton onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? t('common.loading') : t('discover.loadMore')}
              </LoadMoreButton>
            )}
          </>
        ) : activeTab === 'recipes' && recipes.length === 0 ? (
          <EmptyState>
            <span className="material-symbols-outlined">explore</span>
            <h3>{t('discover.empty')}</h3>
            <p>{t('discover.emptyHint')}</p>
          </EmptyState>
        ) : activeTab === 'collections' && collections.length === 0 ? (
          <EmptyState>
            <span className="material-symbols-outlined">collections_bookmark</span>
            <h3>{t('discover.emptyCollections')}</h3>
            <p>{t('discover.emptyCollectionsHint')}</p>
          </EmptyState>
        ) : (
          <EmptyState>
            <span className="material-symbols-outlined">search_off</span>
            <h3>{t('discover.noResults')}</h3>
            <p>{t('empty.noRecipesHint')}</p>
          </EmptyState>
        )}
      </MainContent>

      {showSignInPrompt && (
        <ModalOverlay onClick={() => setShowSignInPrompt(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalIcon>
              <span className="material-symbols-outlined">bookmark</span>
            </ModalIcon>
            <ModalTitle>{t('discover.signInTitle')}</ModalTitle>
            <ModalDescription>{t('discover.signInDescription')}</ModalDescription>
            <ModalButton onClick={() => navigate('/recipes')}>
              {t('discover.signInButton')}
            </ModalButton>
            <ModalSecondaryButton onClick={() => setShowSignInPrompt(false)}>
              {t('discover.maybeLater')}
            </ModalSecondaryButton>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
}
