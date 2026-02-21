import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useCollectionsStore } from '../stores/collectionsStore';
import type { Collection } from '../types/Recipe';

const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
  green500: '#22c55e',
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
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: ${colors.textMain};
  display: flex;
  align-items: center;
  gap: 8px;

  .material-symbols-outlined {
    color: ${colors.primary};
  }
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

const Content = styled.div`
  padding: 16px 24px;
  overflow-y: auto;
  flex: 1;
`;

const CreateNewSection = styled.div`
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
`;

const CreateNewButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: ${colors.backgroundLight};
  border: 2px dashed rgba(44, 62, 80, 0.2);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: ${colors.primary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;

  &:hover {
    border-color: ${colors.primary};
    background: rgba(44, 62, 80, 0.05);
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const CreateNewForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
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

const FormActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const SmallButton = styled.button<{ $primary?: boolean }>`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
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

const CollectionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CollectionItem = styled.label<{ $inCollection: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  background: ${(props) => (props.$inCollection ? `${colors.primary}08` : 'transparent')};
  border: 1px solid ${(props) => (props.$inCollection ? colors.primary : '#e0e0e0')};

  &:hover {
    background: ${(props) => (props.$inCollection ? `${colors.primary}12` : colors.backgroundLight)};
  }
`;

const Checkbox = styled.input`
  appearance: none;
  width: 22px;
  height: 22px;
  border: 2px solid ${colors.primary};
  border-radius: 6px;
  cursor: pointer;
  display: grid;
  place-content: center;
  transition: all 0.15s;
  flex-shrink: 0;

  &::before {
    content: '';
    width: 12px;
    height: 12px;
    transform: scale(0);
    transition: transform 0.12s ease-in-out;
    box-shadow: inset 1em 1em white;
    clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
  }

  &:checked {
    background: ${colors.primary};
  }

  &:checked::before {
    transform: scale(1);
  }
`;

const CollectionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const CollectionName = styled.span`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${colors.textMain};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CollectionCount = styled.span`
  display: block;
  font-size: 12px;
  color: ${colors.textMuted};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px 16px;
  color: ${colors.textMuted};

  .material-symbols-outlined {
    font-size: 40px;
    color: #ddd;
    margin-bottom: 12px;
  }

  p {
    font-size: 14px;
    margin: 0;
  }
`;

const SuccessMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #dcfce7;
  border-radius: 8px;
  color: ${colors.green500};
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 16px;

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

interface AddToCollectionModalProps {
  recipeId: string;
  onClose: () => void;
}

export function AddToCollectionModal({ recipeId, onClose }: AddToCollectionModalProps) {
  const { t } = useTranslation();
  const {
    collections,
    isLoading,
    loadCollections,
    createNewCollection,
    addRecipe,
    removeRecipe,
    getCollectionsForRecipe,
  } = useCollectionsStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recipeCollections, setRecipeCollections] = useState<string[]>([]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    setRecipeCollections(getCollectionsForRecipe(recipeId));
  }, [collections, recipeId, getCollectionsForRecipe]);

  const handleToggleCollection = useCallback(
    async (collection: Collection) => {
      const isInCollection = recipeCollections.includes(collection.id);

      try {
        if (isInCollection) {
          await removeRecipe(collection.id, recipeId);
          setSuccessMessage(t('collection.removeFromCollection'));
        } else {
          await addRecipe(collection.id, recipeId);
          setSuccessMessage(t('collection.addToCollection'));
        }
        setRecipeCollections(getCollectionsForRecipe(recipeId));
        setTimeout(() => setSuccessMessage(null), 2000);
      } catch (error) {
        console.error('Failed to toggle collection:', error);
      }
    },
    [recipeId, recipeCollections, addRecipe, removeRecipe, getCollectionsForRecipe, t]
  );

  const handleCreateAndAdd = useCallback(async () => {
    if (!newCollectionName.trim()) return;

    setIsCreating(true);
    try {
      const collection = await createNewCollection(newCollectionName.trim());
      if (collection) {
        await addRecipe(collection.id, recipeId);
        setNewCollectionName('');
        setShowCreateForm(false);
        setSuccessMessage(t('collection.addToCollection'));
        setRecipeCollections(getCollectionsForRecipe(recipeId));
        setTimeout(() => setSuccessMessage(null), 2000);
      }
    } catch (error) {
      console.error('Failed to create and add:', error);
    } finally {
      setIsCreating(false);
    }
  }, [newCollectionName, createNewCollection, addRecipe, recipeId, getCollectionsForRecipe, t]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <Overlay onClick={handleOverlayClick}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>
            <span className="material-symbols-outlined">library_add</span>
            {t('collection.addToCollection')}
          </Title>
          <CloseButton onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </CloseButton>
        </Header>

        <Content>
          {successMessage && (
            <SuccessMessage>
              <span className="material-symbols-outlined">check_circle</span>
              {successMessage}
            </SuccessMessage>
          )}

          <CreateNewSection>
            {showCreateForm ? (
              <CreateNewForm>
                <Input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder={t('collection.newCollectionName')}
                  autoFocus
                />
                <FormActions>
                  <SmallButton onClick={() => setShowCreateForm(false)}>
                    {t('common.cancel')}
                  </SmallButton>
                  <SmallButton
                    $primary
                    onClick={handleCreateAndAdd}
                    disabled={!newCollectionName.trim() || isCreating}
                  >
                    {isCreating ? t('common.loading') : t('collection.createAndAdd')}
                  </SmallButton>
                </FormActions>
              </CreateNewForm>
            ) : (
              <CreateNewButton onClick={() => setShowCreateForm(true)}>
                <span className="material-symbols-outlined">add</span>
                {t('collection.createNew')}
              </CreateNewButton>
            )}
          </CreateNewSection>

          {isLoading ? (
            <EmptyState>
              <span className="material-symbols-outlined">hourglass_empty</span>
              <p>{t('common.loading')}</p>
            </EmptyState>
          ) : collections.length === 0 ? (
            <EmptyState>
              <span className="material-symbols-outlined">collections_bookmark</span>
              <p>{t('collection.emptyState')}</p>
            </EmptyState>
          ) : (
            <CollectionList>
              {collections.map((collection) => {
                const isInCollection = recipeCollections.includes(collection.id);
                return (
                  <CollectionItem
                    key={collection.id}
                    $inCollection={isInCollection}
                    onClick={() => handleToggleCollection(collection)}
                  >
                    <Checkbox type="checkbox" checked={isInCollection} onChange={() => {}} />
                    <CollectionInfo>
                      <CollectionName>{collection.name}</CollectionName>
                      <CollectionCount>
                        {t('collection.recipesCount', { count: collection.recipeIds.length })}
                      </CollectionCount>
                    </CollectionInfo>
                  </CollectionItem>
                );
              })}
            </CollectionList>
          )}
        </Content>
      </Modal>
    </Overlay>
  );
}
