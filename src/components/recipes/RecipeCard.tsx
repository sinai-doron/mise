import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import type { Recipe, Visibility } from '../../types/Recipe';
import { migrateVisibility } from '../../types/Recipe';
import { generateRecipePlaceholder } from '../../utils/recipePlaceholder';

// Color palette
const colors = {
  primary: '#2C3E50',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
  amber500: '#f59e0b',
};

const Card = styled.div`
  background: ${colors.surface};
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 20px rgba(0, 0, 0, 0.15);
  }
`;

const ImageContainer = styled.div`
  position: relative;
  width: 100%;
  padding-top: 60%;
  background: ${colors.backgroundLight};
  overflow: hidden;
`;

const Image = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.7s ease-out;

  ${Card}:hover & {
    transform: scale(1.05);
  }
`;

const BadgesContainer = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
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

const DifficultyBadge = styled.span<{ $difficulty: string }>`
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  background: ${(props) => {
    switch (props.$difficulty) {
      case 'easy':
        return 'rgba(34, 197, 94, 0.9)';
      case 'medium':
        return 'rgba(245, 158, 11, 0.9)';
      case 'hard':
        return 'rgba(239, 68, 68, 0.9)';
      default:
        return 'rgba(107, 114, 128, 0.9)';
    }
  }};
  color: white;
`;

const LanguageBadge = styled.span`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
`;

const Content = styled.div`
  padding: 20px;
`;

const CategoryBadge = styled.span`
  display: inline-block;
  background: rgba(44, 62, 80, 0.08);
  color: ${colors.primary};
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 8px;
`;

const Title = styled.h3`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  color: ${colors.textMain};
  line-height: 1.3;
  font-family: 'Playfair Display', Georgia, serif;
`;

const Description = styled.p`
  margin: 0 0 16px 0;
  font-size: 14px;
  color: ${colors.textMuted};
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: ${colors.textMuted};
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;

  .material-symbols-outlined {
    font-size: 16px;
    color: ${colors.primary};
  }
`;

const RatingItem = styled.span`
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;

  .material-symbols-outlined {
    font-size: 16px;
    color: ${colors.amber500};
  }
`;

const TagsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(44, 62, 80, 0.08);
`;

const Tag = styled.span`
  padding: 2px 8px;
  background: ${colors.backgroundLight};
  border-radius: 6px;
  font-size: 11px;
  color: ${colors.textMuted};
`;

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇺🇸',
  he: '🇮🇱',
  ar: '🇸🇦',
  fa: '🇮🇷',
  ur: '🇵🇰',
};

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick }) => {
  const { t } = useTranslation();
  const totalTime = recipe.prepTime + recipe.cookTime;
  const languageFlag = recipe.language ? LANGUAGE_FLAGS[recipe.language] : null;
  const visibility = recipe.visibility ?? migrateVisibility(recipe.isPublic);

  return (
    <Card onClick={onClick}>
      <ImageContainer>
        <Image src={recipe.image || generateRecipePlaceholder(recipe.id, recipe.title)} alt={recipe.title} />
        <VisibilityBadge $visibility={visibility} title={t(`share.${visibility}`)}>
          <span className="material-symbols-outlined">{getVisibilityIcon(visibility)}</span>
        </VisibilityBadge>
        <BadgesContainer>
          {languageFlag && <LanguageBadge>{languageFlag}</LanguageBadge>}
          <DifficultyBadge $difficulty={recipe.difficulty}>
            {recipe.difficulty}
          </DifficultyBadge>
        </BadgesContainer>
      </ImageContainer>
      <Content>
        <CategoryBadge>{recipe.category}</CategoryBadge>
        <Title>{recipe.title}</Title>
        <Description>{recipe.description}</Description>
        <Meta>
          <MetaItem>
            <span className="material-symbols-outlined">schedule</span>
            {totalTime} {t('common.min')}
          </MetaItem>
          <MetaItem>
            <span className="material-symbols-outlined">group</span>
            {recipe.defaultServings}
          </MetaItem>
          {recipe.rating && (
            <RatingItem>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
              {recipe.rating.toFixed(1)}
            </RatingItem>
          )}
        </Meta>
        {recipe.tags.length > 0 && (
          <TagsRow>
            {recipe.tags.slice(0, 3).map((tag) => (
              <Tag key={tag}>#{tag}</Tag>
            ))}
            {recipe.tags.length > 3 && (
              <Tag>+{recipe.tags.length - 3}</Tag>
            )}
          </TagsRow>
        )}
      </Content>
    </Card>
  );
};
