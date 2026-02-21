import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { getCollection, incrementCollectionViews, getCollectionRecipes } from '../firebase/collectionSync';
import { useAuth } from '../firebase';
import { SEO } from '../components/SEO';
import { generateAvatar } from '../utils/avatarGenerator';
import { generateRecipePlaceholder } from '../utils/recipePlaceholder';
import { CollectionManager } from '../components/CollectionManager';
import { useRecipeStore } from '../stores/recipeStore';
import type { Collection, Recipe, Visibility } from '../types/Recipe';
import { isAccessible, migrateVisibility } from '../types/Recipe';

const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
  green500: '#22c55e',
};

const NavBar = styled.nav`
  background: ${colors.surface};
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e0e0e0;
`;

const NavLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HomeButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: ${colors.backgroundLight};
  color: ${colors.textMain};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #e0e0e0;
  }

  .material-symbols-outlined {
    font-size: 22px;
  }
`;

const NavBrand = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${colors.primary};
`;

const Container = styled.div`
  min-height: 100vh;
  background: ${colors.backgroundLight};
`;

const LoadingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
  color: ${colors.textMuted};
`;

const ErrorContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  text-align: center;
`;

const ErrorIcon = styled.span`
  font-size: 64px;
  color: ${colors.textMuted};
`;

const ErrorTitle = styled.h1`
  font-size: 24px;
  color: ${colors.textMain};
  margin: 0;
`;

const ErrorDescription = styled.p`
  font-size: 16px;
  color: ${colors.textMuted};
  margin: 0;
  max-width: 400px;
`;

const Header = styled.div`
  background: ${colors.surface};
  padding: 48px 24px;
  text-align: center;
  border-bottom: 1px solid #e0e0e0;
`;

const Avatar = styled.div<{ $image?: string }>`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin: 0 auto 16px;
  background: ${(props) =>
    props.$image
      ? `url("${props.$image.replace(/"/g, '%22')}") center/cover`
      : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 40px;
  font-weight: 700;
`;

const OwnerName = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: ${colors.textMain};
  margin: 0 0 8px;
`;

const CollectionName = styled.h2`
  font-size: 18px;
  font-weight: 500;
  color: ${colors.textMuted};
  margin: 0 0 8px;
`;

const Description = styled.p`
  font-size: 16px;
  color: ${colors.textMuted};
  margin: 0 0 16px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
`;

const Stats = styled.div`
  display: flex;
  gap: 24px;
  justify-content: center;
  color: ${colors.textMuted};
  font-size: 14px;
`;

const StatItem = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const RecipeGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
`;

const RecipeCard = styled.div`
  background: ${colors.surface};
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
`;

const RecipeImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 180px;
`;

const RecipeImage = styled.div<{ $image?: string }>`
  width: 100%;
  height: 100%;
  background-image: ${(props) =>
    props.$image
      ? `url("${props.$image.replace(/"/g, '%22')}")`
      : `linear-gradient(135deg, ${colors.backgroundLight} 0%, #e0e0e0 100%)`};
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
`;

const VisibilityBadge = styled.div<{ $visibility: Visibility }>`
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
    font-size: 14px;
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

const RecipeContent = styled.div`
  padding: 16px;
`;

const RecipeTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${colors.textMain};
  margin: 0 0 8px;
`;

const RecipeDescription = styled.p`
  font-size: 14px;
  color: ${colors.textMuted};
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const RecipeMeta = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 12px;
  color: ${colors.textMuted};
  font-size: 13px;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 64px 24px;
  color: ${colors.textMuted};

  .material-symbols-outlined {
    font-size: 64px;
    margin-bottom: 16px;
  }
`;

const EditButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: ${colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin: 16px auto 0;
  transition: background 0.2s;

  &:hover {
    background: ${colors.primaryDark};
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const EditModeContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
`;

const EditModeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
`;

const EditModeBackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: ${colors.backgroundLight};
  color: ${colors.textMain};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #e0e0e0;
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const EditModeTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${colors.textMain};
  margin: 0;
`;

export function CollectionPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const userRecipes = useRecipeStore((state) => state.userRecipes);
  const hasInitialized = useRecipeStore((state) => state.hasInitialized);
  const initializeFirebaseSync = useRecipeStore((state) => state.initializeFirebaseSync);
  const isOwner = user?.uid === collection?.ownerId;

  // Initialize recipe store when user is logged in
  useEffect(() => {
    if (!user || hasInitialized) return;

    let cleanup: (() => void) | undefined;
    const init = async () => {
      cleanup = await initializeFirebaseSync();
    };
    init();

    return () => {
      if (cleanup) cleanup();
    };
  }, [user, hasInitialized, initializeFirebaseSync]);

  useEffect(() => {
    const fetchCollection = async () => {
      if (!collectionId) {
        setError('not_found');
        setLoading(false);
        return;
      }

      // Wait for auth to be ready before checking ownership
      if (authLoading) {
        return;
      }

      // Wait for recipe store to initialize if user is logged in (owner needs their recipes)
      if (user && !hasInitialized) {
        return;
      }

      try {
        const collectionData = await getCollection(collectionId);
        if (!collectionData) {
          setError('not_found');
          setLoading(false);
          return;
        }

        // Check if collection is accessible (public or unlisted) or user is owner
        const isCollectionOwner = user?.uid === collectionData.ownerId;
        const visibility = collectionData.visibility ?? migrateVisibility(collectionData.isPublic);
        if (!isAccessible(visibility) && !isCollectionOwner) {
          setError('not_found');
          setLoading(false);
          return;
        }

        setCollection(collectionData);

        // Increment view count (fire and forget)
        if (!isCollectionOwner) {
          incrementCollectionViews(collectionId);
        }

        // Fetch recipes using the new visibility-aware function
        const collectionRecipes = await getCollectionRecipes(
          collectionData,
          user?.uid ?? null,
          isCollectionOwner ? userRecipes : undefined
        );
        setRecipes(collectionRecipes);
      } catch (err) {
        console.error('Failed to fetch collection:', err);
        setError('not_found');
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [collectionId, user, userRecipes, authLoading, hasInitialized]);

  const handleRecipeClick = (recipe: Recipe) => {
    if (isOwner) {
      // Owner navigates to their own recipe view
      navigate(`/recipes/${recipe.id}`);
    } else {
      // Non-owner navigates to the public recipe page
      navigate(`/recipe/${recipe.id}`);
    }
  };

  if (loading) {
    return (
      <LoadingContainer>
        <span className="material-symbols-outlined" style={{ fontSize: 48 }}>
          hourglass_empty
        </span>
        <span>{t('common.loading')}</span>
      </LoadingContainer>
    );
  }

  if (error || !collection) {
    return (
      <ErrorContainer>
        <ErrorIcon className="material-symbols-outlined">search_off</ErrorIcon>
        <ErrorTitle>{t('collection.notFound', 'Collection not found')}</ErrorTitle>
        <ErrorDescription>
          {t('collection.notFoundDesc', 'This collection may have been deleted or the link is invalid.')}
        </ErrorDescription>
      </ErrorContainer>
    );
  }

  // Edit mode for owners
  if (isOwner && isEditMode) {
    return (
      <Container>
        <SEO
          title={`Edit ${collection.name}`}
          description="Manage your collection"
          canonical={`/u/${collectionId}`}
        />
        <NavBar>
          <NavLeft>
            <HomeButton onClick={() => navigate('/')} title={t('common.home', 'Home')}>
              <span className="material-symbols-outlined">home</span>
            </HomeButton>
            <NavBrand>Prepd</NavBrand>
          </NavLeft>
        </NavBar>
        <EditModeContainer>
          <EditModeHeader>
            <EditModeBackButton onClick={() => setIsEditMode(false)}>
              <span className="material-symbols-outlined">arrow_back</span>
            </EditModeBackButton>
            <EditModeTitle>{t('collection.manageCollection')}</EditModeTitle>
          </EditModeHeader>
          <CollectionManager
            collectionId={collectionId!}
            onCollectionChange={() => {
              // Refetch collection data after changes
              getCollection(collectionId!).then((data) => {
                if (data) setCollection(data);
              });
            }}
          />
        </EditModeContainer>
      </Container>
    );
  }

  return (
    <Container>
      <SEO
        title={`${collection.name} by ${collection.ownerName || 'Chef'}`}
        description={collection.description || `${recipes.length} recipes`}
        ogImage={collection.coverImage || recipes[0]?.image}
        canonical={`/u/${collectionId}`}
      />

      <NavBar>
        <NavLeft>
          <HomeButton onClick={() => navigate('/')} title={t('common.home', 'Home')}>
            <span className="material-symbols-outlined">home</span>
          </HomeButton>
          <NavBrand>Prepd</NavBrand>
        </NavLeft>
      </NavBar>

      <Header>
        <Avatar $image={collection.ownerAvatar || generateAvatar(collection.id)}>
        </Avatar>
        <OwnerName>{collection.ownerName || t('collection.chef', 'Chef')}</OwnerName>
        <CollectionName>{collection.name}</CollectionName>
        {collection.description && <Description>{collection.description}</Description>}
        <Stats>
          <StatItem>
            <span className="material-symbols-outlined">menu_book</span>
            {recipes.length} {t('common.recipes', 'recipes')}
          </StatItem>
          <StatItem>
            <span className="material-symbols-outlined">visibility</span>
            {collection.stats.views} {t('share.views', 'views')}
          </StatItem>
        </Stats>
        {isOwner && (
          <EditButton onClick={() => setIsEditMode(true)}>
            <span className="material-symbols-outlined">edit</span>
            {t('collection.manageCollection')}
          </EditButton>
        )}
      </Header>

      {recipes.length === 0 ? (
        <EmptyState>
          <span className="material-symbols-outlined">restaurant_menu</span>
          <p>{t('collection.noRecipes', 'No recipes in this collection yet.')}</p>
        </EmptyState>
      ) : (
        <RecipeGrid>
          {recipes.map((recipe) => {
            const visibility = recipe.visibility ?? migrateVisibility(recipe.isPublic);
            return (
              <RecipeCard key={recipe.id} onClick={() => handleRecipeClick(recipe)}>
                <RecipeImageContainer>
                  <RecipeImage $image={recipe.image?.trim() || generateRecipePlaceholder(recipe.id, recipe.title)} />
                  <VisibilityBadge $visibility={visibility} title={t(`share.${visibility}`)}>
                    <span className="material-symbols-outlined">{getVisibilityIcon(visibility)}</span>
                  </VisibilityBadge>
                </RecipeImageContainer>
                <RecipeContent>
                  <RecipeTitle>{recipe.title}</RecipeTitle>
                  <RecipeDescription>{recipe.description}</RecipeDescription>
                  <RecipeMeta>
                    <span>
                      <span className="material-symbols-outlined">schedule</span>
                      {recipe.prepTime + recipe.cookTime}m
                    </span>
                    <span>
                      <span className="material-symbols-outlined">restaurant</span>
                      {recipe.defaultServings}
                    </span>
                  </RecipeMeta>
                </RecipeContent>
              </RecipeCard>
            );
          })}
        </RecipeGrid>
      )}
    </Container>
  );
}
