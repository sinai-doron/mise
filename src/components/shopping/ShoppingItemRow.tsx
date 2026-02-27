import React, { useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import type { ShoppingItem } from '../../types/Recipe';
import { formatQuantity } from '../../types/Recipe';
import type { ListMember, CurrencyConfig } from '../../types/ShoppingList';
import { formatPrice } from '../../types/ShoppingList';
import { ItemSourceBadges } from './ItemSourceBadges';
import { QuantityControl } from './QuantityControl';

const Row = styled.div<{ $bought: boolean; $editing: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  min-height: 56px;
  border-radius: 12px;
  cursor: ${(props) => (props.$editing ? 'default' : 'pointer')};
  transition: background 0.15s, box-shadow 0.15s;
  touch-action: manipulation;
  background: ${(props) => (props.$editing ? '#f8fafc' : 'transparent')};
  box-shadow: ${(props) =>
    props.$editing ? 'inset 0 0 0 2px #2C3E50' : 'none'};

  &:hover {
    background: ${(props) => (props.$editing ? '#f8fafc' : '#f0f4f8')};
  }

  ${(props) =>
    props.$bought &&
    `
    .item-name {
      text-decoration: line-through;
      color: #94a3b8;
    }
    .item-quantity {
      color: #cbd5e1;
    }
  `}
`;

const Checkbox = styled.input`
  appearance: none;
  width: 28px;
  height: 28px;
  min-width: 28px;
  border: 2px solid rgba(44, 62, 80, 0.25);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: grid;
  place-content: center;
  touch-action: manipulation;

  &::before {
    content: '';
    width: 16px;
    height: 16px;
    transform: scale(0);
    transition: transform 0.12s ease-in-out;
    box-shadow: inset 1em 1em white;
    clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
  }

  &:checked {
    background: #22c55e;
    border-color: #22c55e;
  }

  &:checked::before {
    transform: scale(1);
  }
`;

const ItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemName = styled.p`
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
  line-height: 1.3;
  transition: all 0.2s;
`;

const ItemQuantity = styled.p`
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  margin: 2px 0 0 0;
  transition: all 0.2s;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const EditButton = styled.button`
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: all 0.15s;

  &:hover {
    background: #e2e8f0;
    color: #2C3E50;
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const DeleteButton = styled.button`
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: all 0.15s;

  &:hover {
    background: #fee2e2;
    color: #ef4444;
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const EditControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 12px;
  border-top: 1px solid #e2e8f0;
  margin-top: 8px;
`;

const EditQuantitySection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`;

const QuantityDisplay = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: #2C3E50;
  min-width: 48px;
  text-align: center;
`;

const UnitText = styled.span`
  font-size: 14px;
  color: #64748b;
`;

const SaveButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  background: #2C3E50;
  color: white;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #1a252f;
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const CancelButton = styled.button`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #f1f5f9;
    color: #333;
  }
`;

const EditWrapper = styled.div`
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.1);
  overflow: hidden;
`;

const AddedByText = styled.span`
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
`;

const PriceBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: #ecfdf5;
  color: #059669;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
`;

const SwipeContainer = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 12px;
`;

const SwipeContent = styled.div<{ $offset: number }>`
  transform: translateX(${(props) => props.$offset}px);
  transition: ${(props) => (props.$offset === 0 ? 'transform 0.25s ease' : 'none')};
`;

const PricePanel = styled.div<{ $rtl: boolean }>`
  position: absolute;
  top: 0;
  ${(props) => (props.$rtl ? 'left: 0;' : 'right: 0;')}
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: #f0fdf4;
  gap: 8px;
`;

const PriceInput = styled.input`
  width: 80px;
  padding: 8px 10px;
  border: 2px solid #22c55e;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  text-align: center;
  outline: none;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;

  &:focus {
    border-color: #16a34a;
  }
`;

const PriceSaveButton = styled.button`
  width: 36px;
  height: 36px;
  border: none;
  background: #22c55e;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.15s;

  &:hover {
    background: #16a34a;
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const SWIPE_THRESHOLD = 60;
const DIRECTION_LOCK_THRESHOLD = 10;

interface ShoppingItemRowProps {
  item: ShoppingItem & { addedBy?: string; price?: number; boughtBy?: string };
  onToggle: () => void;
  onQuantityChange: (newQuantity: number) => void;
  onDelete: () => void;
  showSources?: boolean;
  members?: Record<string, ListMember>;
  costSplittingEnabled?: boolean;
  currency?: CurrencyConfig;
  onPriceSet?: (price: number) => void;
}

export const ShoppingItemRow: React.FC<ShoppingItemRowProps> = ({
  item,
  onToggle,
  onQuantityChange,
  onDelete,
  showSources = true,
  members,
  costSplittingEnabled,
  currency,
  onPriceSet,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editQuantity, setEditQuantity] = useState(item.totalQuantity);

  // Swipe state for price input
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [priceValue, setPriceValue] = useState('');
  const touchRef = useRef<{ startX: number; startY: number; locked: 'h' | 'v' | null }>({ startX: 0, startY: 0, locked: null });
  const isSwiping = useRef(false);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const isRtl = document.dir === 'rtl' || document.documentElement.dir === 'rtl';
  const canSwipe = costSplittingEnabled && item.bought && !isEditing && onPriceSet;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!canSwipe) return;
    const touch = e.touches[0];
    touchRef.current = { startX: touch.clientX, startY: touch.clientY, locked: null };
    isSwiping.current = false;
  }, [canSwipe]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!canSwipe) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchRef.current.startX;
    const deltaY = touch.clientY - touchRef.current.startY;

    // Direction lock
    if (!touchRef.current.locked) {
      if (Math.abs(deltaX) > DIRECTION_LOCK_THRESHOLD) {
        touchRef.current.locked = 'h';
      } else if (Math.abs(deltaY) > DIRECTION_LOCK_THRESHOLD) {
        touchRef.current.locked = 'v';
        return;
      } else {
        return;
      }
    }
    if (touchRef.current.locked === 'v') return;

    e.preventDefault();
    isSwiping.current = true;

    // In LTR: swipe left (negative deltaX) to reveal panel on right
    // In RTL: swipe right (positive deltaX) to reveal panel on left
    const offset = isRtl ? Math.max(0, Math.min(deltaX, 150)) : Math.min(0, Math.max(deltaX, -150));
    setSwipeOffset(offset);
  }, [canSwipe, isRtl]);

  const handleTouchEnd = useCallback(() => {
    if (!canSwipe) return;
    const absOffset = Math.abs(swipeOffset);
    if (absOffset >= SWIPE_THRESHOLD) {
      setShowPriceInput(true);
      setPriceValue(item.price != null ? item.price.toString() : '');
      setTimeout(() => priceInputRef.current?.focus(), 100);
    }
    setSwipeOffset(0);
    setTimeout(() => { isSwiping.current = false; }, 50);
  }, [canSwipe, swipeOffset, item.price]);

  const handlePriceSave = () => {
    const price = parseFloat(priceValue);
    if (!isNaN(price) && price >= 0 && onPriceSet) {
      onPriceSet(price);
    }
    setShowPriceInput(false);
    setSwipeOffset(0);
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handlePriceSave();
    if (e.key === 'Escape') { setShowPriceInput(false); setSwipeOffset(0); }
  };

  const handlePriceButtonClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowPriceInput(true);
    setPriceValue(item.price != null ? item.price.toString() : '');
    setTimeout(() => priceInputRef.current?.focus(), 100);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing && !isSwiping.current) {
      onToggle();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditQuantity(item.totalQuantity);
    setIsEditing(true);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editQuantity !== item.totalQuantity) {
      onQuantityChange(editQuantity);
    }
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditQuantity(item.totalQuantity);
    setIsEditing(false);
  };

  const handleRowClick = () => {
    if (!isEditing && !isSwiping.current && !showPriceInput) {
      onToggle();
    }
  };

  // Determine attribution text
  const boughtByName = costSplittingEnabled && item.boughtBy && members?.[item.boughtBy]?.displayName;
  const addedByName = members && item.addedBy && members[item.addedBy]?.displayName;

  if (isEditing) {
    return (
      <EditWrapper>
        <Row $bought={item.bought} $editing={true} onClick={(e) => e.stopPropagation()}>
          <Checkbox
            type="checkbox"
            checked={item.bought}
            onChange={() => {}}
            onClick={handleCheckboxClick}
          />
          <ItemInfo>
            <ItemName className="item-name">{item.name}</ItemName>
            {item.notes && (
              <ItemQuantity className="item-quantity">{item.notes}</ItemQuantity>
            )}
            {showSources && item.sources.length > 0 && (
              <ItemSourceBadges sources={item.sources} />
            )}
          </ItemInfo>
          <DeleteButton onClick={handleDeleteClick}>
            <span className="material-symbols-outlined">delete</span>
          </DeleteButton>
        </Row>
        <EditControls onClick={(e) => e.stopPropagation()}>
          <EditQuantitySection>
            <QuantityControl
              value={editQuantity}
              min={1}
              onIncrement={() => setEditQuantity((q) => q + 1)}
              onDecrement={() => setEditQuantity((q) => Math.max(1, q - 1))}
              showValue={false}
            />
            <QuantityDisplay>{formatQuantity(editQuantity)}</QuantityDisplay>
            <UnitText>{item.unit}</UnitText>
          </EditQuantitySection>
          <CancelButton onClick={handleCancel}>Cancel</CancelButton>
          <SaveButton onClick={handleSave}>
            <span className="material-symbols-outlined">check</span>
            Save
          </SaveButton>
        </EditControls>
      </EditWrapper>
    );
  }

  const rowContent = (
    <Row $bought={item.bought} $editing={false} onClick={handleRowClick}>
      <Checkbox
        type="checkbox"
        checked={item.bought}
        onChange={() => {}}
        onClick={handleCheckboxClick}
      />
      <ItemInfo>
        <ItemName className="item-name">{item.name}</ItemName>
        <ItemQuantity className="item-quantity">
          {formatQuantity(item.totalQuantity)} {item.unit}
          {item.notes && ` • ${item.notes}`}
        </ItemQuantity>
        {showSources && item.sources.length > 0 && (
          <ItemSourceBadges sources={item.sources} />
        )}
        {boughtByName && (
          <AddedByText>Bought by {boughtByName}</AddedByText>
        )}
        {!boughtByName && addedByName && (
          <AddedByText>Added by {addedByName}</AddedByText>
        )}
      </ItemInfo>
      <RightSection>
        {costSplittingEnabled && item.bought && onPriceSet && (
          item.price != null ? (
            <PriceBadge onClick={(e) => { e.stopPropagation(); handlePriceButtonClick(); }} style={{ cursor: 'pointer' }}>
              {formatPrice(item.price, currency?.code)}
            </PriceBadge>
          ) : (
            <EditButton onClick={handlePriceButtonClick} title="Set price">
              <span className="material-symbols-outlined">attach_money</span>
            </EditButton>
          )
        )}
        {!item.bought && (
          <EditButton onClick={handleEditClick}>
            <span className="material-symbols-outlined">edit</span>
          </EditButton>
        )}
        <DeleteButton onClick={handleDeleteClick}>
          <span className="material-symbols-outlined">delete</span>
        </DeleteButton>
      </RightSection>
    </Row>
  );

  const priceInputPanel = showPriceInput && (
    <PricePanel $rtl={isRtl} onClick={(e) => e.stopPropagation()} style={{ position: 'relative', borderRadius: 10, marginTop: 4, justifyContent: 'center' }}>
      {currency && currency.symbolPosition === 'before' && (
        <span style={{ fontWeight: 700, color: '#059669' }}>{currency.symbol}</span>
      )}
      <PriceInput
        ref={priceInputRef}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={priceValue}
        onChange={(e) => setPriceValue(e.target.value)}
        onKeyDown={handlePriceKeyDown}
        placeholder="0.00"
      />
      {currency && currency.symbolPosition === 'after' && (
        <span style={{ fontWeight: 700, color: '#059669' }}>{currency.symbol}</span>
      )}
      <PriceSaveButton onClick={handlePriceSave}>
        <span className="material-symbols-outlined">check</span>
      </PriceSaveButton>
    </PricePanel>
  );

  // Wrap in swipe container on touch devices when cost splitting is enabled and item is bought
  if (canSwipe) {
    return (
      <SwipeContainer>
        <SwipeContent
          $offset={swipeOffset}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {rowContent}
        </SwipeContent>
        {priceInputPanel}
      </SwipeContainer>
    );
  }

  return (
    <>
      {rowContent}
      {priceInputPanel}
    </>
  );
};
