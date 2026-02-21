import React from 'react';
import styled from 'styled-components';
import { formatQuantity, CATEGORY_LABELS } from '../../types/Recipe';
import type { IngredientCategory } from '../../types/Recipe';

const Container = styled.div`
  max-width: 600px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  .material-symbols-outlined {
    color: #f59e0b;
  }
`;

const ClearButton = styled.button`
  background: none;
  border: none;
  color: #f59e0b;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;

  &:hover {
    text-decoration: underline;
  }
`;

const Progress = styled.div`
  margin-bottom: 24px;
`;

const ProgressBar = styled.div`
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  width: ${(props) => props.$progress}%;
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #22c55e);
  transition: width 0.3s ease;
`;

const ProgressText = styled.span`
  font-size: 13px;
  color: #666;
`;

const CategoryGroup = styled.div`
  margin-bottom: 24px;
`;

const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`;

const CategoryIcon = styled.span`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;

  .material-symbols-outlined {
    font-size: 16px;
    color: #f59e0b;
  }
`;

const CategoryLabel = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 0;
`;

const ItemList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Item = styled.li<{ $checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${(props) => (props.$checked ? '#f0fdf4' : 'white')};
  border: 1px solid ${(props) => (props.$checked ? '#86efac' : '#e0e0e0')};
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${(props) => (props.$checked ? '#86efac' : '#f59e0b')};
  }
`;

const Checkbox = styled.div<{ $checked: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid ${(props) => (props.$checked ? '#22c55e' : '#ccc')};
  background: ${(props) => (props.$checked ? '#22c55e' : 'white')};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  .material-symbols-outlined {
    font-size: 16px;
    color: white;
  }
`;

const ItemContent = styled.div<{ $checked: boolean }>`
  flex: 1;
  text-decoration: ${(props) => (props.$checked ? 'line-through' : 'none')};
  opacity: ${(props) => (props.$checked ? 0.6 : 1)};
`;

const ItemQuantity = styled.span`
  font-weight: 600;
  color: #f59e0b;
  margin-right: 8px;
`;

const ItemName = styled.span`
  color: #333;
`;

const ItemNotes = styled.span`
  color: #888;
  font-size: 13px;
  margin-left: 4px;
`;

const CATEGORY_ICONS: Record<IngredientCategory, string> = {
  produce: 'nutrition',
  dairy: 'egg_alt',
  meat: 'kebab_dining',
  pantry: 'kitchen',
  frozen: 'ac_unit',
  bakery: 'bakery_dining',
  spices: 'spa',
  cleaning: 'cleaning_services',
  personal_care: 'self_care',
  paper_products: 'receipt_long',
  pet: 'pets',
  baby: 'child_care',
  other: 'category',
};

interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  notes?: string;
  scaledQuantity: number;
  originalQuantity: number;
  bought?: boolean;
}

interface SupermarketContainerProps {
  items: GroceryItem[];
  groceryByCategory: Record<IngredientCategory, GroceryItem[]>;
  sortedCategories: IngredientCategory[];
  checkedItems: Set<string>;
  onToggleItem: (id: string) => void;
  onClearChecked: () => void;
}

export const SupermarketContainer: React.FC<SupermarketContainerProps> = ({
  items,
  groceryByCategory,
  sortedCategories,
  checkedItems,
  onToggleItem,
  onClearChecked,
}) => {
  const totalItems = items.length;
  const checkedCount = checkedItems.size;
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  return (
    <Container>
      <Header>
        <Title>
          <span className="material-symbols-outlined">shopping_cart</span>
          Shopping List
        </Title>
        {checkedCount > 0 && (
          <ClearButton onClick={onClearChecked}>
            Clear checked ({checkedCount})
          </ClearButton>
        )}
      </Header>

      <Progress>
        <ProgressBar>
          <ProgressFill $progress={progress} />
        </ProgressBar>
        <ProgressText>
          {checkedCount} of {totalItems} items collected
        </ProgressText>
      </Progress>

      {sortedCategories.map((category) => (
        <CategoryGroup key={category}>
          <CategoryHeader>
            <CategoryIcon>
              <span className="material-symbols-outlined">
                {CATEGORY_ICONS[category]}
              </span>
            </CategoryIcon>
            <CategoryLabel>{CATEGORY_LABELS[category]}</CategoryLabel>
          </CategoryHeader>
          <ItemList>
            {groceryByCategory[category].map((item) => {
              const isChecked = checkedItems.has(item.id);
              return (
                <Item
                  key={item.id}
                  $checked={isChecked}
                  onClick={() => onToggleItem(item.id)}
                >
                  <Checkbox $checked={isChecked}>
                    {isChecked && (
                      <span className="material-symbols-outlined">check</span>
                    )}
                  </Checkbox>
                  <ItemContent $checked={isChecked}>
                    <ItemQuantity>
                      {formatQuantity(item.scaledQuantity)} {item.unit}
                    </ItemQuantity>
                    <ItemName>{item.name}</ItemName>
                    {item.notes && <ItemNotes>({item.notes})</ItemNotes>}
                  </ItemContent>
                </Item>
              );
            })}
          </ItemList>
        </CategoryGroup>
      ))}
    </Container>
  );
};
