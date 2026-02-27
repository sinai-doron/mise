import React from 'react';
import styled from 'styled-components';
import { useShoppingListStore } from '../../stores/shoppingListStore';
import type { ShoppingList } from '../../types/ShoppingList';

const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  textMain: '#333333',
  textMuted: '#64748b',
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
  overflow: hidden;
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
  font-size: 18px;
  font-weight: 700;
  color: ${colors.textMain};
  display: flex;
  align-items: center;
  gap: 8px;

  .material-symbols-outlined {
    font-size: 22px;
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

const ListContainer = styled.div`
  padding: 8px;
  max-height: 360px;
  overflow-y: auto;
`;

const ListOption = styled.button<{ $active: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 2px solid ${(props) => (props.$active ? colors.primary : 'transparent')};
  border-radius: 12px;
  background: ${(props) => (props.$active ? 'rgba(44, 62, 80, 0.04)' : 'transparent')};
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;

  &:hover {
    background: ${colors.backgroundLight};
  }
`;

const ListIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${colors.backgroundLight};
  color: ${colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const ListInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ListName = styled.span`
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: ${colors.textMain};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ListMeta = styled.span`
  display: block;
  font-size: 12px;
  color: ${colors.textMuted};
  margin-top: 2px;
`;

const SharedBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: #e0f2fe;
  color: #0369a1;
  white-space: nowrap;
`;

interface ListPickerModalProps {
  onSelect: (listId: string) => void;
  onClose: () => void;
  title?: string;
}

export const ListPickerModal: React.FC<ListPickerModalProps> = ({
  onSelect,
  onClose,
  title = 'Add to Shopping List',
}) => {
  const lists = useShoppingListStore((s) => s.lists);
  const activeListId = useShoppingListStore((s) => s.activeListId);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>
            <span className="material-symbols-outlined">shopping_cart</span>
            {title}
          </Title>
          <CloseButton onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </CloseButton>
        </Header>

        <ListContainer>
          {lists.map((list: ShoppingList) => (
            <ListOption
              key={list.id}
              $active={list.id === activeListId}
              onClick={() => onSelect(list.id)}
            >
              <ListIcon>
                <span className="material-symbols-outlined">
                  {list.memberIds.length > 1 ? 'group' : 'shopping_cart'}
                </span>
              </ListIcon>
              <ListInfo>
                <ListName>{list.name}</ListName>
                <ListMeta>
                  {list.itemCount} item{list.itemCount !== 1 ? 's' : ''}
                </ListMeta>
              </ListInfo>
              {list.memberIds.length > 1 && (
                <SharedBadge>{list.memberIds.length} members</SharedBadge>
              )}
            </ListOption>
          ))}
        </ListContainer>
      </Modal>
    </Overlay>
  );
};
