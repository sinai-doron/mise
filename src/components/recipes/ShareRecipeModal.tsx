import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import type { Recipe, Collection, Visibility } from '../../types/Recipe';
import { isAccessible, migrateVisibility } from '../../types/Recipe';
import { copyToClipboard } from '../../utils/shareUtils';
import { useRecipeStore } from '../../stores/recipeStore';
import { getPublicCollectionsContainingRecipe } from '../../firebase/collectionSync';
import { PrivacyWarningDialog } from '../PrivacyWarningDialog';

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
  max-width: 480px;
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
  padding: 24px;
`;

const ToggleContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`;

const ToggleOption = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 2px solid ${(props) => (props.$active ? colors.primary : '#e0e0e0')};
  background: ${(props) => (props.$active ? `${colors.primary}08` : 'white')};
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    border-color: ${colors.primary};
  }

  &:active {
    transform: scale(0.98);
  }
`;

const RadioCircle = styled.div<{ $active: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${(props) => (props.$active ? colors.primary : '#ccc')};
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${colors.primary};
    display: ${(props) => (props.$active ? 'block' : 'none')};
  }
`;

const OptionContent = styled.div`
  flex: 1;
`;

const OptionTitle = styled.div`
  font-weight: 600;
  color: ${colors.textMain};
  margin-bottom: 2px;
`;

const OptionDescription = styled.div`
  font-size: 13px;
  color: ${colors.textMuted};
`;

const LinkSection = styled.div`
  margin-top: 8px;
`;

const LinkLabel = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${colors.textMuted};
  margin-bottom: 8px;
`;

const LinkInputContainer = styled.div`
  display: flex;
  gap: 8px;
`;

const LinkInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  color: ${colors.textMain};
  background: ${colors.backgroundLight};

  &:focus {
    outline: none;
    border-color: ${colors.primary};
  }
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
  transition: background 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${(props) => (props.$copied ? colors.green500 : colors.primaryDark)};
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const StatsSection = styled.div`
  display: flex;
  gap: 24px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${colors.textMuted};
  font-size: 14px;

  .material-symbols-outlined {
    font-size: 20px;
  }

  strong {
    color: ${colors.textMain};
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ErrorMessage = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
`;

interface ShareRecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
}

export function ShareRecipeModal({ recipe, onClose }: ShareRecipeModalProps) {
  const { t } = useTranslation();
  const updateRecipe = useRecipeStore((state) => state.updateRecipe);

  // Initialize visibility from recipe
  const initialVisibility = recipe.visibility ?? migrateVisibility(recipe.isPublic);
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(false);
  const [affectedCollections, setAffectedCollections] = useState<Collection[]>([]);

  // Share URL shown when recipe is accessible (public or unlisted)
  const shareUrl = isAccessible(visibility) ? `${window.location.origin}/recipe/${recipe.id}` : '';

  // Load affected collections when recipe is public
  useEffect(() => {
    const currentVisibility = recipe.visibility ?? migrateVisibility(recipe.isPublic);
    if (currentVisibility === 'public') {
      getPublicCollectionsContainingRecipe(recipe.id).then(setAffectedCollections);
    }
  }, [recipe.id, recipe.visibility, recipe.isPublic]);

  const handleVisibilityChange = useCallback(async (newVisibility: Visibility) => {
    if (newVisibility === visibility) return;

    // If making private and recipe is in public collections, show warning
    if (newVisibility === 'private' && affectedCollections.length > 0) {
      setShowPrivacyWarning(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Update the recipe with the new visibility
      // The recipeStore.updateRecipe() will handle syncing to indexes
      updateRecipe(recipe.id, {
        visibility: newVisibility,
        sharedAt: isAccessible(newVisibility) ? Date.now() : undefined,
      });

      setVisibility(newVisibility);
    } catch (err) {
      console.error('Failed to update visibility:', err);
      setError(err instanceof Error ? err.message : 'Failed to update sharing settings');
    } finally {
      setIsLoading(false);
    }
  }, [visibility, recipe.id, updateRecipe, affectedCollections.length]);

  const handleConfirmMakePrivate = useCallback(() => {
    setShowPrivacyWarning(false);
    setIsLoading(true);
    setError(null);
    try {
      updateRecipe(recipe.id, {
        visibility: 'private',
        sharedAt: undefined,
      });
      setVisibility('private');
      setAffectedCollections([]);
    } catch (err) {
      console.error('Failed to update visibility:', err);
      setError(err instanceof Error ? err.message : 'Failed to update sharing settings');
    } finally {
      setIsLoading(false);
    }
  }, [recipe.id, updateRecipe]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;

    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <Overlay onClick={handleOverlayClick}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>
            <span className="material-symbols-outlined">share</span>
            {t('share.title', 'Share Recipe')}
          </Title>
          <CloseButton onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </CloseButton>
        </Header>

        <Content style={{ position: 'relative' }}>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <ToggleContainer>
            <ToggleOption $active={visibility === 'private'} onClick={() => handleVisibilityChange('private')}>
              <RadioCircle $active={visibility === 'private'} />
              <OptionContent>
                <OptionTitle>{t('share.private', 'Private')}</OptionTitle>
                <OptionDescription>
                  {t('share.privateDesc', 'Only you can see this recipe')}
                </OptionDescription>
              </OptionContent>
              <span className="material-symbols-outlined" style={{ color: colors.textMuted }}>
                lock
              </span>
            </ToggleOption>

            <ToggleOption $active={visibility === 'unlisted'} onClick={() => handleVisibilityChange('unlisted')}>
              <RadioCircle $active={visibility === 'unlisted'} />
              <OptionContent>
                <OptionTitle>{t('share.unlisted', 'Unlisted')}</OptionTitle>
                <OptionDescription>
                  {t('share.unlistedDesc', 'Anyone with the link can view, but not discoverable')}
                </OptionDescription>
              </OptionContent>
              <span className="material-symbols-outlined" style={{ color: colors.textMuted }}>
                link
              </span>
            </ToggleOption>

            <ToggleOption $active={visibility === 'public'} onClick={() => handleVisibilityChange('public')}>
              <RadioCircle $active={visibility === 'public'} />
              <OptionContent>
                <OptionTitle>{t('share.public', 'Public')}</OptionTitle>
                <OptionDescription>
                  {t('share.publicDesc', 'Anyone with the link can view')}
                </OptionDescription>
              </OptionContent>
              <span className="material-symbols-outlined" style={{ color: colors.textMuted }}>
                public
              </span>
            </ToggleOption>
          </ToggleContainer>

          {isAccessible(visibility) && shareUrl && (
            <LinkSection>
              <LinkLabel>{t('share.linkLabel', 'Share link')}</LinkLabel>
              <LinkInputContainer>
                <LinkInput
                  type="text"
                  value={shareUrl}
                  readOnly
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <CopyButton $copied={copied} onClick={handleCopy}>
                  <span className="material-symbols-outlined">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  {copied ? t('share.copied', 'Copied!') : t('share.copy', 'Copy')}
                </CopyButton>
              </LinkInputContainer>

              {recipe.shareStats && (recipe.shareStats.views > 0 || recipe.shareStats.copies > 0) && (
                <StatsSection>
                  <StatItem>
                    <span className="material-symbols-outlined">visibility</span>
                    <strong>{recipe.shareStats.views}</strong> {t('share.views', 'views')}
                  </StatItem>
                  <StatItem>
                    <span className="material-symbols-outlined">library_add</span>
                    <strong>{recipe.shareStats.copies}</strong> {t('share.copies', 'copies')}
                  </StatItem>
                </StatsSection>
              )}
            </LinkSection>
          )}

          {isLoading && (
            <LoadingOverlay>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: colors.primary }}>
                hourglass_empty
              </span>
            </LoadingOverlay>
          )}
        </Content>
      </Modal>

      {showPrivacyWarning && (
        <PrivacyWarningDialog
          recipeName={recipe.title}
          affectedCollections={affectedCollections}
          onConfirm={handleConfirmMakePrivate}
          onCancel={() => setShowPrivacyWarning(false)}
        />
      )}
    </Overlay>
  );
}
