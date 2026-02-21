import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useLanguage } from '../i18n/useLanguage';
import { SEO } from '../components/SEO';
import { useCollectionsStore } from '../stores/collectionsStore';
import { useRecipeStore } from '../stores/recipeStore';
import { useAuth } from '../firebase';
import { UserMenu } from '../components/UserMenu';
import type { Collection, Recipe, Visibility } from '../types/Recipe';
import { migrateVisibility } from '../types/Recipe';

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
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 32px 24px;

  @media (min-width: 768px) {
    padding: 48px 32px;
  }
`;

const PageHeader = styled.div`
  margin-bottom: 32px;
`;

const PageTitle = styled.h1`
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 36px;
  font-weight: 700;
  color: ${colors.textMain};
  margin: 0;
  letter-spacing: -0.02em;

  @media (min-width: 768px) {
    font-size: 48px;
  }
`;

const CollectionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
`;

const CollectionCard = styled.div`
  background: ${colors.surface};
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px -2px rgba(44, 62, 80, 0.08);
  border: 1px solid rgba(44, 62, 80, 0.08);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px -4px rgba(44, 62, 80, 0.15);
  }
`;

const CollectionCoverContainer = styled.div`
  position: relative;
  width: 100%;
  height: 160px;
`;

const CollectionCover = styled.div<{ $image?: string }>`
  width: 100%;
  height: 100%;
  background: ${(props) =>
    props.$image
      ? `url("${props.$image.replace(/"/g, '%22')}") center/cover`
      : `linear-gradient(135deg, ${colors.backgroundLight} 0%, #dde4ed 100%)`};
  display: flex;
  align-items: center;
  justify-content: center;

  .material-symbols-outlined {
    font-size: 48px;
    color: ${colors.textMuted};
    opacity: 0.5;
  }
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

const CollectionInfo = styled.div`
  padding: 20px;
`;

const CollectionName = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: ${colors.textMain};
  margin: 0 0 8px 0;
`;

const CollectionMeta = styled.p`
  font-size: 14px;
  color: ${colors.textMuted};
  margin: 0;
`;

const CreateCard = styled.div`
  background: ${colors.surface};
  border-radius: 16px;
  border: 2px dashed rgba(44, 62, 80, 0.2);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  padding: 32px;

  &:hover {
    border-color: ${colors.primary};
    background: rgba(44, 62, 80, 0.02);
  }

  .material-symbols-outlined {
    font-size: 48px;
    color: ${colors.primary};
    margin-bottom: 12px;
  }
`;

const CreateText = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: ${colors.primary};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 24px;
  color: ${colors.textMuted};

  .material-symbols-outlined {
    font-size: 72px;
    color: #ddd;
    margin-bottom: 24px;
  }

  h3 {
    font-size: 24px;
    font-weight: 600;
    color: ${colors.textMain};
    margin: 0 0 8px 0;
    font-family: 'Playfair Display', Georgia, serif;
  }

  p {
    font-size: 16px;
    margin: 0 0 32px 0;
  }
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${colors.primary};
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin: 0 auto;

  &:hover {
    background: ${colors.primaryDark};
    transform: translateY(-2px);
  }

  .material-symbols-outlined {
    font-size: 20px;
    color: white;
  }
`;

const CreateModal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: ${colors.textMain};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: #666;

  &:hover {
    color: #333;
  }

  .material-symbols-outlined {
    font-size: 24px;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const InputGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${colors.textMain};
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  color: ${colors.textMain};

  &:focus {
    outline: none;
    border-color: ${colors.primary};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  color: ${colors.textMain};
  resize: vertical;
  min-height: 80px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button<{ $primary?: boolean }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${(props) =>
    props.$primary
      ? `
    background: ${colors.primary};
    color: white;
    border: none;

    &:hover:not(:disabled) {
      background: ${colors.primaryDark};
    }
  `
      : `
    background: white;
    color: ${colors.textMain};
    border: 1px solid #e0e0e0;

    &:hover:not(:disabled) {
      background: ${colors.backgroundLight};
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

function getCollectionCoverImage(collection: Collection, recipes: Recipe[]): string | undefined {
  // Find first recipe in collection that has an image
  for (const recipeId of collection.recipeIds) {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (recipe?.image) {
      return recipe.image;
    }
  }
  return collection.coverImage;
}

export function CollectionsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, isRTL } = useLanguage();
  const { user } = useAuth();

  const { collections, isLoading, loadCollections, createNewCollection } = useCollectionsStore();
  const recipes = useRecipeStore((s) => s.recipes);
  const initializeFirebaseSync = useRecipeStore((s) => s.initializeFirebaseSync);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      cleanup = await initializeFirebaseSync();
      loadCollections();
    };

    init();

    return () => {
      if (cleanup) cleanup();
    };
  }, [initializeFirebaseSync, loadCollections, user]);

  const handleCreateCollection = async () => {
    if (!newName.trim()) return;

    setIsCreating(true);
    const collection = await createNewCollection(newName.trim(), newDescription.trim() || undefined);
    setIsCreating(false);

    if (collection) {
      setShowCreateModal(false);
      setNewName('');
      setNewDescription('');
      navigate(`/u/${collection.id}`);
    }
  };

  const handleGoHome = () => navigate('/');

  return (
    <PageContainer style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <SEO
        title="Collections - Mise"
        description="Organize your favorite recipes into collections."
        canonical="/collections"
        keywords="recipe collections, recipe organization, favorites"
      />

      <Header>
        <HeaderContent>
          <LogoGroup onClick={handleGoHome}>
            <LogoIcon className="logo-icon">
              <span className="material-symbols-outlined">restaurant_menu</span>
            </LogoIcon>
            <LogoText>Mise</LogoText>
          </LogoGroup>

          <Nav>
            <NavLink onClick={() => navigate('/recipes')}>{t('nav.recipes')}</NavLink>
            <NavLink onClick={() => navigate('/meal-plan')}>{t('nav.mealPlan')}</NavLink>
            <NavLink onClick={() => navigate('/shopping')}>{t('nav.shopping')}</NavLink>
            <NavLink $active>{t('nav.collections')}</NavLink>
            <NavLink onClick={() => navigate('/discover')}>{t('discover.title')}</NavLink>
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
            <UserMenu />
          </HeaderRight>
        </HeaderContent>
      </Header>

      <MainContent>
        <PageHeader>
          <PageTitle>{t('collection.title')}</PageTitle>
        </PageHeader>

        {isLoading ? (
          <LoadingState>
            <span className="material-symbols-outlined">hourglass_empty</span>
          </LoadingState>
        ) : collections.length === 0 ? (
          <EmptyState>
            <span className="material-symbols-outlined">collections_bookmark</span>
            <h3>{t('collection.emptyState')}</h3>
            <p>{t('collection.emptyStateHint')}</p>
            <CreateButton onClick={() => setShowCreateModal(true)}>
              <span className="material-symbols-outlined">add</span>
              {t('collection.createNew')}
            </CreateButton>
          </EmptyState>
        ) : (
          <CollectionsGrid>
            <CreateCard onClick={() => setShowCreateModal(true)}>
              <span className="material-symbols-outlined">add</span>
              <CreateText>{t('collection.createNew')}</CreateText>
            </CreateCard>

            {collections.map((collection) => {
              const visibility = collection.visibility ?? migrateVisibility(collection.isPublic);
              const coverImage = getCollectionCoverImage(collection, recipes);
              return (
                <CollectionCard key={collection.id} onClick={() => navigate(`/u/${collection.id}`)}>
                  <CollectionCoverContainer>
                    <CollectionCover $image={coverImage}>
                      {!coverImage && (
                        <span className="material-symbols-outlined">collections_bookmark</span>
                      )}
                    </CollectionCover>
                    <VisibilityBadge $visibility={visibility} title={t(`share.${visibility}`)}>
                      <span className="material-symbols-outlined">{getVisibilityIcon(visibility)}</span>
                    </VisibilityBadge>
                  </CollectionCoverContainer>
                  <CollectionInfo>
                    <CollectionName>{collection.name}</CollectionName>
                    <CollectionMeta>
                      {t('collection.recipesCount', { count: collection.recipeIds.length })}
                    </CollectionMeta>
                  </CollectionInfo>
                </CollectionCard>
              );
            })}
          </CollectionsGrid>
        )}
      </MainContent>

      {showCreateModal && (
        <CreateModal onClick={() => setShowCreateModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{t('collection.createNew')}</ModalTitle>
              <CloseButton onClick={() => setShowCreateModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              <InputGroup>
                <Label>{t('collection.collectionName')}</Label>
                <Input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t('collection.newCollectionName')}
                  autoFocus
                />
              </InputGroup>
              <InputGroup>
                <Label>{t('collection.description')}</Label>
                <TextArea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={t('collection.description')}
                />
              </InputGroup>
              <ModalActions>
                <Button onClick={() => setShowCreateModal(false)}>{t('common.cancel')}</Button>
                <Button
                  $primary
                  onClick={handleCreateCollection}
                  disabled={!newName.trim() || isCreating}
                >
                  {isCreating ? t('common.loading') : t('collection.createNew')}
                </Button>
              </ModalActions>
            </ModalBody>
          </ModalContent>
        </CreateModal>
      )}
    </PageContainer>
  );
}
