import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  getCollection,
  updateCollection,
  removeRecipeFromCollection,
  reorderCollectionRecipes,
} from '../firebase/collectionSync';
import { setRecipeVisibility } from '../firebase/recipeSync';
import type { Visibility } from '../types/Recipe';
import { isAccessible, migrateVisibility } from '../types/Recipe';
import { copyToClipboard } from '../utils/shareUtils';
import { useRecipeStore } from '../stores/recipeStore';
import { PublishRecipesDialog } from './PublishRecipesDialog';
import { ImageUploader } from './recipes/ImageUploader';
import { generateAvatar } from '../utils/avatarGenerator';
import { generateRecipePlaceholder } from '../utils/recipePlaceholder';
import type { Collection, Recipe } from '../types/Recipe';

const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
  green500: '#22c55e',
  red500: '#ef4444',
};

const Container = styled.div`
  background: ${colors.surface};
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: ${colors.textMain};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  .material-symbols-outlined {
    color: ${colors.primary};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  ${(props) =>
    props.$variant === 'primary'
      ? `
    background: ${colors.primary};
    color: white;
    &:hover { background: ${colors.primaryDark}; }
  `
      : `
    background: ${colors.backgroundLight};
    color: ${colors.textMain};
    &:hover { background: #e0e0e0; }
  `}

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const SettingsSection = styled.div`
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e0e0e0;
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const CoverImageSection = styled.div`
  margin-top: 20px;
  margin-bottom: 20px;
`;

const AvatarSection = styled.div`
  margin-top: 20px;
  margin-bottom: 20px;
`;

const AvatarPreviewContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
`;

const AvatarPreview = styled.div<{ $image?: string }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${(props) =>
    props.$image
      ? `url("${props.$image.replace(/"/g, '%22')}") center/cover`
      : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`};
  flex-shrink: 0;
`;

const AvatarActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const AvatarButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  ${(props) =>
    props.$variant === 'primary'
      ? `
    background: ${colors.primary};
    color: white;
    &:hover { background: ${colors.primaryDark}; }
  `
      : `
    background: ${colors.backgroundLight};
    color: ${colors.textMuted};
    &:hover { background: #e0e0e0; color: ${colors.textMain}; }
  `}

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

const AvatarHint = styled.span`
  font-size: 12px;
  color: ${colors.textMuted};
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${colors.textMuted};
`;

const Input = styled.input`
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
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  color: ${colors.textMain};
  resize: vertical;
  min-height: 80px;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
  }
`;

const VisibilitySection = styled.div`
  margin-top: 16px;
`;

const VisibilityLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${colors.textMuted};
  margin-bottom: 12px;
`;

const VisibilityOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const VisibilityOption = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 2px solid ${(props) => (props.$active ? colors.primary : '#e0e0e0')};
  background: ${(props) => (props.$active ? `${colors.primary}08` : 'white')};
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    border-color: ${colors.primary};
  }
`;

const RadioCircle = styled.div<{ $active: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid ${(props) => (props.$active ? colors.primary : '#ccc')};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &::after {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${colors.primary};
    display: ${(props) => (props.$active ? 'block' : 'none')};
  }
`;

const VisibilityOptionContent = styled.div`
  flex: 1;
`;

const VisibilityOptionTitle = styled.span`
  font-weight: 600;
  color: ${colors.textMain};
  font-size: 14px;
`;

const VisibilityOptionDesc = styled.span`
  font-size: 12px;
  color: ${colors.textMuted};
  margin-left: 8px;
`;

const ShareLinkSection = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;

const ShareLinkInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  color: ${colors.textMain};
  background: ${colors.backgroundLight};
`;

const CopyButton = styled.button<{ $copied: boolean }>`
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  background: ${(props) => (props.$copied ? colors.green500 : colors.primary)};
  color: white;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const RecipesSection = styled.div``;

const RecipesSectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const RecipesTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${colors.textMain};
  margin: 0;
`;

const ReorderHint = styled.span`
  font-size: 13px;
  color: ${colors.textMuted};
  display: flex;
  align-items: center;
  gap: 4px;

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

const RecipeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
`;

const SortableRecipeCard = styled.div<{ $isDragging?: boolean }>`
  background: ${colors.backgroundLight};
  border-radius: 12px;
  overflow: hidden;
  cursor: grab;
  opacity: ${(props) => (props.$isDragging ? 0.5 : 1)};
  touch-action: none;

  &:active {
    cursor: grabbing;
  }
`;

const RecipeImage = styled.div<{ $image?: string }>`
  width: 100%;
  height: 120px;
  background: ${(props) =>
    props.$image
      ? `url("${props.$image.replace(/"/g, '%22')}") center/cover`
      : `linear-gradient(135deg, #e0e0e0 0%, #ccc 100%)`};
`;

const RecipeInfo = styled.div`
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const RecipeTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.textMain};
  flex: 1;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: ${colors.textMuted};

  &:hover {
    color: ${colors.red500};
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: ${colors.textMuted};
  background: ${colors.backgroundLight};
  border-radius: 12px;

  .material-symbols-outlined {
    font-size: 48px;
    margin-bottom: 12px;
  }
`;

// Sortable recipe item component
function SortableRecipeItem({
  recipe,
  onRemove,
}: {
  recipe: Recipe;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: recipe.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <SortableRecipeCard
      ref={setNodeRef}
      style={style}
      $isDragging={isDragging}
      {...attributes}
      {...listeners}
    >
      <RecipeImage $image={recipe.image || generateRecipePlaceholder(recipe.id, recipe.title)} />
      <RecipeInfo>
        <RecipeTitle>{recipe.title}</RecipeTitle>
        <RemoveButton
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remove from collection"
        >
          <span className="material-symbols-outlined">close</span>
        </RemoveButton>
      </RecipeInfo>
    </SortableRecipeCard>
  );
}

interface CollectionManagerProps {
  collectionId: string;
  onCollectionChange?: () => void;
}

export function CollectionManager({
  collectionId,
  onCollectionChange,
}: CollectionManagerProps) {
  const { t } = useTranslation();

  // Get recipes from the store
  const allRecipes = useRecipeStore((s) => s.recipes);

  const [collection, setCollection] = useState<Collection | null>(null);
  const [orderedRecipes, setOrderedRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishingRecipes, setPublishingRecipes] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [coverImage, setCoverImage] = useState('');
  const [ownerAvatar, setOwnerAvatar] = useState('');
  const [showAvatarUploader, setShowAvatarUploader] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const shareUrl = collection && isAccessible(visibility) ? `${window.location.origin}/u/${collection.id}` : '';

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const data = await getCollection(collectionId);
        if (data) {
          setCollection(data);
          setName(data.name);
          setDescription(data.description || '');
          setVisibility(data.visibility ?? migrateVisibility(data.isPublic));
          setCoverImage(data.coverImage || '');
          setOwnerAvatar(data.ownerAvatar || '');
        }
      } catch (error) {
        console.error('Failed to fetch collection:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [collectionId]);

  // Update ordered recipes when collection or allRecipes change
  useEffect(() => {
    if (collection && allRecipes.length > 0) {
      const recipes = collection.recipeIds
        .map((id) => allRecipes.find((r) => r.id === id))
        .filter((r): r is Recipe => r !== undefined);
      setOrderedRecipes(recipes);
    }
  }, [collection, allRecipes]);

  // Get private recipes in the collection (not accessible)
  const privateRecipes = orderedRecipes.filter((r) => {
    const recipeVisibility = r.visibility ?? migrateVisibility(r.isPublic);
    return !isAccessible(recipeVisibility);
  });

  // Pending visibility change (used when showing publish dialog)
  const [pendingVisibility, setPendingVisibility] = useState<Visibility | null>(null);

  const handleVisibilityChange = useCallback((newVisibility: Visibility) => {
    if (newVisibility === visibility) return;

    // If making accessible and there are private recipes, show the dialog
    if (isAccessible(newVisibility) && privateRecipes.length > 0) {
      setPendingVisibility(newVisibility);
      setShowPublishDialog(true);
    } else {
      setVisibility(newVisibility);
    }
  }, [visibility, privateRecipes.length]);

  const handlePublishAllRecipes = useCallback(async () => {
    if (!pendingVisibility) return;

    setPublishingRecipes(true);
    try {
      // Make all private recipes match the collection visibility
      await Promise.all(
        privateRecipes.map((recipe) => setRecipeVisibility(recipe, pendingVisibility))
      );

      // Also update the local state through the store
      const updateRecipe = useRecipeStore.getState().updateRecipe;
      privateRecipes.forEach((recipe) => {
        updateRecipe(recipe.id, { visibility: pendingVisibility });
      });

      setVisibility(pendingVisibility);
      setPendingVisibility(null);
      setShowPublishDialog(false);
    } catch (error) {
      console.error('Failed to publish recipes:', error);
    } finally {
      setPublishingRecipes(false);
    }
  }, [privateRecipes, pendingVisibility]);

  const handleCancelPublish = useCallback(() => {
    // Cancel the visibility change
    setPendingVisibility(null);
    setShowPublishDialog(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!collection) return;

    setSaving(true);
    try {
      await updateCollection(collection.id, {
        name,
        description: description || undefined,
        visibility,
        isPublic: isAccessible(visibility), // Backward compat
        coverImage: coverImage || undefined,
        ownerAvatar: ownerAvatar || undefined,
      });
      setCollection({ ...collection, name, description, visibility, isPublic: isAccessible(visibility), coverImage, ownerAvatar });
      onCollectionChange?.();
    } catch (error) {
      console.error('Failed to save collection:', error);
    } finally {
      setSaving(false);
    }
  }, [collection, name, description, visibility, coverImage, ownerAvatar, onCollectionChange]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleRemoveRecipe = useCallback(
    async (recipeId: string) => {
      if (!collection) return;

      try {
        await removeRecipeFromCollection(collection.id, recipeId);
        setOrderedRecipes((prev) => prev.filter((r) => r.id !== recipeId));
        // Update local collection state
        setCollection((prev) =>
          prev ? { ...prev, recipeIds: prev.recipeIds.filter((id) => id !== recipeId) } : prev
        );
        onCollectionChange?.();
      } catch (error) {
        console.error('Failed to remove recipe:', error);
      }
    },
    [collection, onCollectionChange]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id || !collection) return;

      const oldIndex = orderedRecipes.findIndex((r) => r.id === active.id);
      const newIndex = orderedRecipes.findIndex((r) => r.id === over.id);

      const newRecipes = arrayMove(orderedRecipes, oldIndex, newIndex);
      setOrderedRecipes(newRecipes);

      // Update Firestore
      const newRecipeIds = newRecipes.map((r) => r.id);
      try {
        await reorderCollectionRecipes(collection.id, newRecipeIds);
      } catch (error) {
        console.error('Failed to reorder recipes:', error);
        // Revert on error
        setOrderedRecipes(orderedRecipes);
      }
    },
    [collection, orderedRecipes]
  );

  if (loading) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>
          {t('common.loading')}
        </div>
      </Container>
    );
  }

  if (!collection) {
    return null;
  }

  return (
    <Container>
      <Header>
        <Title>
          <span className="material-symbols-outlined">collections_bookmark</span>
          {t('collection.manageCollection')}
        </Title>
        <Actions>
          <Button onClick={handleSave} $variant="primary" disabled={saving}>
            <span className="material-symbols-outlined">save</span>
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </Actions>
      </Header>

      <SettingsSection>
        <SettingsGrid>
          <InputGroup>
            <Label>{t('collection.collectionName')}</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Recipes"
            />
          </InputGroup>
          <InputGroup>
            <Label>{t('collection.description')}</Label>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell others about your collection..."
            />
          </InputGroup>
        </SettingsGrid>

        <CoverImageSection>
          <Label>{t('collection.coverImage', 'Cover Image')}</Label>
          <ImageUploader value={coverImage} onChange={setCoverImage} />
        </CoverImageSection>

        <AvatarSection>
          <Label>{t('collection.chefAvatar', 'Chef Avatar')}</Label>
          <AvatarPreviewContainer>
            <AvatarPreview $image={ownerAvatar || generateAvatar(collection.id)} />
            <AvatarActions>
              {showAvatarUploader ? (
                <ImageUploader
                  value={ownerAvatar}
                  onChange={(value) => {
                    setOwnerAvatar(value);
                    setShowAvatarUploader(false);
                  }}
                />
              ) : (
                <>
                  <AvatarButton $variant="primary" onClick={() => setShowAvatarUploader(true)}>
                    <span className="material-symbols-outlined">upload</span>
                    {t('collection.uploadAvatar', 'Upload Custom Avatar')}
                  </AvatarButton>
                  {ownerAvatar && (
                    <AvatarButton onClick={() => setOwnerAvatar('')}>
                      <span className="material-symbols-outlined">refresh</span>
                      {t('collection.useGeneratedAvatar', 'Use Generated Avatar')}
                    </AvatarButton>
                  )}
                  <AvatarHint>
                    {ownerAvatar
                      ? t('collection.customAvatarActive', 'Using custom avatar')
                      : t('collection.generatedAvatarActive', 'Using auto-generated avatar')}
                  </AvatarHint>
                </>
              )}
            </AvatarActions>
          </AvatarPreviewContainer>
        </AvatarSection>

        <VisibilitySection>
          <VisibilityLabel>{t('share.title', 'Visibility')}</VisibilityLabel>
          <VisibilityOptions>
            <VisibilityOption $active={visibility === 'private'} onClick={() => handleVisibilityChange('private')}>
              <RadioCircle $active={visibility === 'private'} />
              <VisibilityOptionContent>
                <VisibilityOptionTitle>{t('share.private')}</VisibilityOptionTitle>
                <VisibilityOptionDesc>{t('share.privateDesc')}</VisibilityOptionDesc>
              </VisibilityOptionContent>
              <span className="material-symbols-outlined" style={{ color: colors.textMuted, fontSize: 20 }}>lock</span>
            </VisibilityOption>

            <VisibilityOption $active={visibility === 'unlisted'} onClick={() => handleVisibilityChange('unlisted')}>
              <RadioCircle $active={visibility === 'unlisted'} />
              <VisibilityOptionContent>
                <VisibilityOptionTitle>{t('share.unlisted', 'Unlisted')}</VisibilityOptionTitle>
                <VisibilityOptionDesc>{t('share.unlistedDesc', 'Anyone with link, not discoverable')}</VisibilityOptionDesc>
              </VisibilityOptionContent>
              <span className="material-symbols-outlined" style={{ color: colors.textMuted, fontSize: 20 }}>link</span>
            </VisibilityOption>

            <VisibilityOption $active={visibility === 'public'} onClick={() => handleVisibilityChange('public')}>
              <RadioCircle $active={visibility === 'public'} />
              <VisibilityOptionContent>
                <VisibilityOptionTitle>{t('share.public')}</VisibilityOptionTitle>
                <VisibilityOptionDesc>{t('share.publicDesc')}</VisibilityOptionDesc>
              </VisibilityOptionContent>
              <span className="material-symbols-outlined" style={{ color: colors.textMuted, fontSize: 20 }}>public</span>
            </VisibilityOption>
          </VisibilityOptions>
        </VisibilitySection>

        {isAccessible(visibility) && shareUrl && (
          <ShareLinkSection>
            <ShareLinkInput
              type="text"
              value={shareUrl}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <CopyButton $copied={copied} onClick={handleCopyLink}>
              <span className="material-symbols-outlined">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? t('share.copied') : t('share.copy')}
            </CopyButton>
          </ShareLinkSection>
        )}
      </SettingsSection>

      <RecipesSection>
        <RecipesSectionHeader>
          <RecipesTitle>
            {t('common.recipes')} ({orderedRecipes.length})
          </RecipesTitle>
          {orderedRecipes.length > 1 && (
            <ReorderHint>
              <span className="material-symbols-outlined">drag_indicator</span>
              {t('collection.reorderHint')}
            </ReorderHint>
          )}
        </RecipesSectionHeader>

        {orderedRecipes.length === 0 ? (
          <EmptyState>
            <span className="material-symbols-outlined">restaurant_menu</span>
            <p>{t('collection.noRecipes')}</p>
          </EmptyState>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedRecipes.map((r) => r.id)}
              strategy={rectSortingStrategy}
            >
              <RecipeGrid>
                {orderedRecipes.map((recipe) => (
                  <SortableRecipeItem
                    key={recipe.id}
                    recipe={recipe}
                    onRemove={() => handleRemoveRecipe(recipe.id)}
                  />
                ))}
              </RecipeGrid>
            </SortableContext>
          </DndContext>
        )}
      </RecipesSection>

      {showPublishDialog && (
        <PublishRecipesDialog
          privateRecipes={privateRecipes}
          onConfirm={handlePublishAllRecipes}
          onCancel={handleCancelPublish}
          isLoading={publishingRecipes}
        />
      )}
    </Container>
  );
}
