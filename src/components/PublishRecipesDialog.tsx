import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import type { Recipe } from '../types/Recipe';
import { generateRecipePlaceholder } from '../utils/recipePlaceholder';

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
  max-width: 500px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
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
  padding: 24px;
  overflow-y: auto;
`;

const Description = styled.p`
  margin: 0 0 20px;
  color: ${colors.textMuted};
  line-height: 1.6;
`;

const RecipeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
  max-height: 300px;
  overflow-y: auto;
`;

const RecipeItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${colors.backgroundLight};
  border-radius: 8px;
`;

const RecipeImage = styled.div<{ $image?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: ${(props) =>
    props.$image
      ? `url("${props.$image.replace(/"/g, '%22')}") center/cover`
      : `linear-gradient(135deg, #e0e0e0 0%, #ccc 100%)`};
  flex-shrink: 0;
`;

const RecipeInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const RecipeTitle = styled.div`
  font-weight: 600;
  color: ${colors.textMain};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RecipeStatus = styled.div`
  font-size: 12px;
  color: ${colors.textMuted};
  display: flex;
  align-items: center;
  gap: 4px;

  .material-symbols-outlined {
    font-size: 14px;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
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

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

interface PublishRecipesDialogProps {
  privateRecipes: Recipe[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PublishRecipesDialog({
  privateRecipes,
  onConfirm,
  onCancel,
  isLoading = false,
}: PublishRecipesDialogProps) {
  const { t } = useTranslation();

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onCancel();
    }
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>
            <span className="material-symbols-outlined">visibility</span>
            {t('collection.publishRecipes', 'Publish Recipes')}
          </Title>
          <CloseButton onClick={onCancel} disabled={isLoading}>
            <span className="material-symbols-outlined">close</span>
          </CloseButton>
        </Header>

        <Content>
          <Description>
            {t(
              'collection.publishRecipesDesc',
              'This collection is public. The following recipes are currently private and will be hidden from others viewing this collection. Would you like to make them public?'
            )}
          </Description>

          <RecipeList>
            {privateRecipes.map((recipe) => (
              <RecipeItem key={recipe.id}>
                <RecipeImage $image={recipe.image || generateRecipePlaceholder(recipe.id, recipe.title)} />
                <RecipeInfo>
                  <RecipeTitle>{recipe.title}</RecipeTitle>
                  <RecipeStatus>
                    <span className="material-symbols-outlined">lock</span>
                    {t('share.private', 'Private')}
                  </RecipeStatus>
                </RecipeInfo>
              </RecipeItem>
            ))}
          </RecipeList>

          <ButtonRow>
            <Button onClick={onCancel} disabled={isLoading}>
              {t('collection.keepPrivate', 'Keep Private')}
            </Button>
            <Button $variant="primary" onClick={onConfirm} disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined">hourglass_empty</span>
                  {t('common.loading', 'Loading...')}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">public</span>
                  {t('collection.publishAll', 'Publish All')}
                </>
              )}
            </Button>
          </ButtonRow>
        </Content>
      </Modal>
    </Overlay>
  );
}
