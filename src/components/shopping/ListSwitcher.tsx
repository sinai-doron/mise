import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useShoppingListStore } from '../../stores/shoppingListStore';
import { useAuth } from '../../firebase';
import type { ShoppingList } from '../../types/ShoppingList';
import { SHOPPING_LIST_LIMITS } from '../../types/ShoppingList';

const Container = styled.div`
  position: relative;
  margin-bottom: 16px;

  @media (min-width: 768px) {
    margin-bottom: 24px;
  }
`;

const CurrentListButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: #ffffff;
  border: 1px solid rgba(44, 62, 80, 0.12);
  border-radius: 14px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;

  &:hover {
    border-color: #2C3E50;
    box-shadow: 0 2px 8px rgba(44, 62, 80, 0.1);
  }
`;

const ListIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #f0f4f8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2C3E50;
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
  font-size: 16px;
  font-weight: 700;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ListMeta = styled.span`
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-top: 1px;
`;

const MemberAvatars = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

const Avatar = styled.div<{ $offset: number }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e2e8f0;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  margin-left: ${(props) => (props.$offset > 0 ? '-8px' : '0')};
  overflow: hidden;
`;

const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ChevronIcon = styled.span<{ $open: boolean }>`
  color: #94a3b8;
  transition: transform 0.2s;
  transform: rotate(${(props) => (props.$open ? '180deg' : '0deg')});
  flex-shrink: 0;

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border-radius: 14px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(44, 62, 80, 0.08);
  z-index: 100;
  overflow: hidden;
  max-height: 400px;
  overflow-y: auto;
`;

const DropdownItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background: ${(props) => (props.$active ? '#f0f4f8' : 'transparent')};
  border: none;
  border-bottom: 1px solid rgba(44, 62, 80, 0.06);
  cursor: pointer;
  text-align: left;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  transition: background 0.15s;

  &:hover {
    background: #f8fafc;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const DropdownListInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const DropdownListName = styled.span`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DropdownListMeta = styled.span`
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-top: 1px;
`;

const SharedBadge = styled.span`
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: #e0f2fe;
  color: #0369a1;
  white-space: nowrap;
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 14px 16px;
  background: transparent;
  border: none;
  border-top: 1px solid rgba(44, 62, 80, 0.1);
  cursor: pointer;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #2C3E50;
  transition: background 0.15s;

  &:hover {
    background: #f0f4f8;
  }

  &:disabled {
    color: #94a3b8;
    cursor: not-allowed;
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const CreateForm = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid rgba(44, 62, 80, 0.1);
`;

const CreateInput = styled.input`
  flex: 1;
  border: 1px solid rgba(44, 62, 80, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  outline: none;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;

  &:focus {
    border-color: #2C3E50;
  }
`;

const CreateSubmit = styled.button`
  padding: 8px 14px;
  background: #2C3E50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;

  &:hover {
    background: #1a252f;
  }

  &:disabled {
    background: #e2e8f0;
    color: #94a3b8;
    cursor: not-allowed;
  }
`;

const CreateCancel = styled.button`
  padding: 8px 10px;
  background: transparent;
  color: #64748b;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;

  &:hover {
    color: #333;
  }
`;

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function getMemberCount(list: ShoppingList): number {
  return list.memberIds.length;
}

function isShared(list: ShoppingList): boolean {
  return list.memberIds.length > 1;
}

export const ListSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const lists = useShoppingListStore((s) => s.lists);
  const activeListId = useShoppingListStore((s) => s.activeListId);
  const setActiveList = useShoppingListStore((s) => s.setActiveList);
  const createList = useShoppingListStore((s) => s.createList);

  const activeList = lists.find((l) => l.id === activeListId);
  const ownedListCount = lists.filter((l) => user && l.ownerId === user.uid).length;
  const canCreateMore = ownedListCount < SHOPPING_LIST_LIMITS.MAX_LISTS_PER_USER;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Focus input when creating
  useEffect(() => {
    if (isCreating) {
      inputRef.current?.focus();
    }
  }, [isCreating]);

  const handleSelectList = (listId: string) => {
    setActiveList(listId);
    setIsOpen(false);
    setIsCreating(false);
  };

  const handleCreate = async () => {
    if (!newListName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const list = await createList(newListName.trim());
      setActiveList(list.id);
      setNewListName('');
      setIsCreating(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to create list:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeList) return null;

  const memberCount = getMemberCount(activeList);
  const memberEntries = Object.entries(activeList.members);

  return (
    <Container ref={containerRef}>
      <CurrentListButton onClick={() => setIsOpen((o) => !o)}>
        <ListIcon>
          <span className="material-symbols-outlined">
            {isShared(activeList) ? 'group' : 'shopping_cart'}
          </span>
        </ListIcon>
        <ListInfo>
          <ListName>{activeList.name}</ListName>
          <ListMeta>
            {activeList.itemCount} item{activeList.itemCount !== 1 ? 's' : ''}
            {memberCount > 1 && ` · ${memberCount} members`}
          </ListMeta>
        </ListInfo>
        {memberCount > 1 && (
          <MemberAvatars>
            {memberEntries.slice(0, 3).map(([uid, member], i) => (
              <Avatar key={uid} $offset={i}>
                {member.avatarUrl ? (
                  <AvatarImg src={member.avatarUrl} alt={member.displayName} />
                ) : (
                  getInitials(member.displayName)
                )}
              </Avatar>
            ))}
            {memberCount > 3 && (
              <Avatar $offset={3}>+{memberCount - 3}</Avatar>
            )}
          </MemberAvatars>
        )}
        <ChevronIcon $open={isOpen}>
          <span className="material-symbols-outlined">expand_more</span>
        </ChevronIcon>
      </CurrentListButton>

      {isOpen && (
        <Dropdown>
          {lists.map((list) => (
            <DropdownItem
              key={list.id}
              $active={list.id === activeListId}
              onClick={() => handleSelectList(list.id)}
            >
              <ListIcon>
                <span className="material-symbols-outlined">
                  {isShared(list) ? 'group' : 'shopping_cart'}
                </span>
              </ListIcon>
              <DropdownListInfo>
                <DropdownListName>{list.name}</DropdownListName>
                <DropdownListMeta>
                  {list.itemCount} item{list.itemCount !== 1 ? 's' : ''}
                </DropdownListMeta>
              </DropdownListInfo>
              {isShared(list) && (
                <SharedBadge>{getMemberCount(list)} members</SharedBadge>
              )}
            </DropdownItem>
          ))}

          {isCreating ? (
            <CreateForm>
              <CreateInput
                ref={inputRef}
                type="text"
                placeholder="List name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setIsCreating(false); setNewListName(''); }
                }}
                maxLength={50}
              />
              <CreateSubmit onClick={handleCreate} disabled={!newListName.trim() || isSubmitting}>
                {isSubmitting ? '...' : 'Create'}
              </CreateSubmit>
              <CreateCancel onClick={() => { setIsCreating(false); setNewListName(''); }}>
                Cancel
              </CreateCancel>
            </CreateForm>
          ) : (
            <CreateButton
              onClick={() => setIsCreating(true)}
              disabled={!canCreateMore}
            >
              <span className="material-symbols-outlined">add</span>
              {canCreateMore ? 'Create New List' : `Limit: ${SHOPPING_LIST_LIMITS.MAX_LISTS_PER_USER} lists`}
            </CreateButton>
          )}
        </Dropdown>
      )}
    </Container>
  );
};
