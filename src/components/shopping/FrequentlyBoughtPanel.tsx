import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import type { PurchaseHistoryEntry, ShoppingItem, IngredientCategory } from '../../types/Recipe';
import { CATEGORY_ICONS } from '../../types/Recipe';

interface UsualItem {
  normalizedName: string;
  itemName: string;
  category: IngredientCategory;
  quantity: number;
  unit: string;
  count: number;
}

function computeUsuals(
  purchaseHistory: PurchaseHistoryEntry[],
  shoppingItems: ShoppingItem[]
): UsualItem[] {
  const alreadyOnList = new Set(shoppingItems.map((i) => i.normalizedName));

  // Group by normalizedName
  const groups = new Map<string, PurchaseHistoryEntry[]>();
  for (const entry of purchaseHistory) {
    const existing = groups.get(entry.normalizedName);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(entry.normalizedName, [entry]);
    }
  }

  const usuals: UsualItem[] = [];
  groups.forEach((entries, normalizedName) => {
    if (alreadyOnList.has(normalizedName)) return;

    // Most recent entry wins for display values
    const mostRecent = entries.reduce((a, b) => (a.purchasedAt > b.purchasedAt ? a : b));

    usuals.push({
      normalizedName,
      itemName: mostRecent.itemName,
      category: mostRecent.category,
      quantity: mostRecent.quantity,
      unit: mostRecent.unit,
      count: entries.length,
    });
  });

  usuals.sort((a, b) => b.count - a.count);
  return usuals.slice(0, 10);
}

const Panel = styled.div`
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 20px -2px rgba(44, 62, 80, 0.1);
  border: 1px solid rgba(44, 62, 80, 0.08);
  margin-bottom: 16px;
  overflow: hidden;

  @media (min-width: 768px) {
    margin-bottom: 24px;
  }
`;

const PanelHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;

  &:hover {
    background: rgba(44, 62, 80, 0.03);
  }
`;

const PanelTitle = styled.span`
  flex: 1;
  font-size: 13px;
  font-weight: 700;
  color: #2C3E50;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PanelCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 10px;
`;

const ChevronIcon = styled.span<{ $open: boolean }>`
  color: #64748b;
  transition: transform 0.2s;
  transform: ${({ $open }) => ($open ? 'rotate(0deg)' : 'rotate(-90deg)')};

  .material-symbols-outlined {
    font-size: 20px;
    display: block;
  }
`;

const ItemList = styled.div`
  border-top: 1px solid rgba(44, 62, 80, 0.06);
`;

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(44, 62, 80, 0.05);

  &:last-child {
    border-bottom: none;
  }
`;

const CategoryIcon = styled.span`
  color: #94a3b8;
  flex-shrink: 0;

  .material-symbols-outlined {
    font-size: 20px;
    display: block;
  }
`;

const ItemName = styled.span`
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #333333;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemQty = styled.span`
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
  flex-shrink: 0;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1.5px solid rgba(44, 62, 80, 0.2);
  border-radius: 8px;
  background: white;
  color: #2C3E50;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
  touch-action: manipulation;

  &:hover {
    background: #2C3E50;
    color: white;
    border-color: #2C3E50;
  }

  &:active {
    transform: scale(0.95);
  }

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

interface FrequentlyBoughtPanelProps {
  purchaseHistory: PurchaseHistoryEntry[];
  shoppingItems: ShoppingItem[];
  onAdd: (name: string, quantity: number, unit: string, category: IngredientCategory) => void;
}

export const FrequentlyBoughtPanel: React.FC<FrequentlyBoughtPanelProps> = ({
  purchaseHistory,
  shoppingItems,
  onAdd,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const usuals = useMemo(
    () => computeUsuals(purchaseHistory, shoppingItems),
    [purchaseHistory, shoppingItems]
  );

  if (usuals.length === 0) return null;

  return (
    <Panel>
      <PanelHeader onClick={() => setIsOpen((o) => !o)} aria-expanded={isOpen}>
        <ChevronIcon $open={isOpen}>
          <span className="material-symbols-outlined">expand_more</span>
        </ChevronIcon>
        <PanelTitle>Your Usuals</PanelTitle>
        <PanelCount>{usuals.length}</PanelCount>
      </PanelHeader>

      {isOpen && (
        <ItemList>
          {usuals.map((item) => (
            <ItemRow key={item.normalizedName}>
              <CategoryIcon>
                <span className="material-symbols-outlined">
                  {CATEGORY_ICONS[item.category]}
                </span>
              </CategoryIcon>
              <ItemName>{item.itemName}</ItemName>
              {(item.quantity > 0 || item.unit) && (
                <ItemQty>
                  {item.quantity > 0 ? item.quantity : ''}{item.unit ? ` ${item.unit}` : ''}
                </ItemQty>
              )}
              <AddButton
                onClick={() => onAdd(item.itemName, item.quantity || 1, item.unit, item.category)}
              >
                <span className="material-symbols-outlined">add</span>
                Add
              </AddButton>
            </ItemRow>
          ))}
        </ItemList>
      )}
    </Panel>
  );
};
