import React, { useState } from 'react';
import styled from 'styled-components';
import type { ShoppingItem, IngredientCategory } from '../../types/Recipe';
import type { ListMember } from '../../types/ShoppingList';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../types/Recipe';
import { ShoppingItemRow } from './ShoppingItemRow';

const Container = styled.div`
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px -2px rgba(44, 62, 80, 0.08);
  border: 1px solid rgba(44, 62, 80, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(44, 62, 80, 0.12);
  }
`;

const Header = styled.div<{ $collapsed: boolean }>`
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  border-bottom: ${(props) =>
    props.$collapsed ? 'none' : '1px solid rgba(44, 62, 80, 0.06)'};
  transition: background 0.15s;

  &:hover {
    background: #f8fafc;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const IconWrapper = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #f0f4f8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2C3E50;

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const Title = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: #2C3E50;
  margin: 0;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Progress = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
`;

const ProgressBar = styled.div`
  width: 48px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $percent: number }>`
  width: ${(props) => props.$percent}%;
  height: 100%;
  background: #22c55e;
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const CollapseIcon = styled.span<{ $collapsed: boolean }>`
  color: #94a3b8;
  transition: transform 0.2s;
  transform: rotate(${(props) => (props.$collapsed ? '0deg' : '180deg')});

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const ItemList = styled.div<{ $collapsed: boolean }>`
  padding: ${(props) => (props.$collapsed ? '0' : '4px 8px 8px')};
  max-height: ${(props) => (props.$collapsed ? '0' : '1000px')};
  overflow: hidden;
  transition: all 0.3s ease;
  opacity: ${(props) => (props.$collapsed ? '0' : '1')};
`;

interface CategorySectionProps {
  category: IngredientCategory;
  items: ShoppingItem[];
  onToggleItem: (itemId: string) => void;
  onQuantityChange: (itemId: string, newQuantity: number) => void;
  onDeleteItem: (itemId: string) => void;
  defaultCollapsed?: boolean;
  members?: Record<string, ListMember>;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  items,
  onToggleItem,
  onQuantityChange,
  onDeleteItem,
  defaultCollapsed = false,
  members,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const boughtCount = items.filter((item) => item.bought).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (boughtCount / totalCount) * 100 : 0;

  // Sort items: unbought first, then bought
  const sortedItems = [...items].sort((a, b) => {
    if (a.bought === b.bought) return 0;
    return a.bought ? 1 : -1;
  });

  return (
    <Container>
      <Header $collapsed={collapsed} onClick={() => setCollapsed(!collapsed)}>
        <HeaderLeft>
          <IconWrapper>
            <span className="material-symbols-outlined">
              {CATEGORY_ICONS[category]}
            </span>
          </IconWrapper>
          <Title>{CATEGORY_LABELS[category]}</Title>
        </HeaderLeft>
        <HeaderRight>
          <Progress>
            {boughtCount}/{totalCount}
          </Progress>
          <ProgressBar>
            <ProgressFill $percent={progressPercent} />
          </ProgressBar>
          <CollapseIcon $collapsed={collapsed}>
            <span className="material-symbols-outlined">expand_more</span>
          </CollapseIcon>
        </HeaderRight>
      </Header>
      <ItemList $collapsed={collapsed}>
        {sortedItems.map((item) => (
          <ShoppingItemRow
            key={item.id}
            item={item}
            onToggle={() => onToggleItem(item.id)}
            onQuantityChange={(qty) => onQuantityChange(item.id, qty)}
            onDelete={() => onDeleteItem(item.id)}
            members={members}
          />
        ))}
      </ItemList>
    </Container>
  );
};
