import React from 'react';
import styled from 'styled-components';
import type { ItemSource } from '../../types/Recipe';

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
`;

const Badge = styled.span<{ $type: 'recipe' | 'manual' }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: ${(props) =>
    props.$type === 'recipe' ? '#e0f2fe' : '#f0fdf4'};
  color: ${(props) =>
    props.$type === 'recipe' ? '#0369a1' : '#15803d'};
  max-width: 120px;

  .material-symbols-outlined {
    font-size: 12px;
    flex-shrink: 0;
  }
`;

const BadgeText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MoreBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: #f1f5f9;
  color: #64748b;
`;

interface ItemSourceBadgesProps {
  sources: ItemSource[];
  maxVisible?: number;
}

export const ItemSourceBadges: React.FC<ItemSourceBadgesProps> = ({
  sources,
  maxVisible = 2,
}) => {
  const visibleSources = sources.slice(0, maxVisible);
  const remainingCount = sources.length - maxVisible;

  return (
    <Container>
      {visibleSources.map((source, index) => (
        <Badge key={index} $type={source.type}>
          {source.type === 'recipe' ? (
            <>
              <span className="material-symbols-outlined">menu_book</span>
              <BadgeText>{source.recipeName || 'Recipe'}</BadgeText>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">edit</span>
              <BadgeText>Manual</BadgeText>
            </>
          )}
        </Badge>
      ))}
      {remainingCount > 0 && <MoreBadge>+{remainingCount}</MoreBadge>}
    </Container>
  );
};
