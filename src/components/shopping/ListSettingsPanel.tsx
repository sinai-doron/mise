import React, { useState } from 'react';
import styled from 'styled-components';
import { useShoppingListStore } from '../../stores/shoppingListStore';
import { ShareListModal } from './ShareListModal';
import { CurrencySelector } from './CurrencySelector';
import type { ShoppingList } from '../../types/ShoppingList';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;

  @media (min-width: 768px) {
    align-items: center;
  }
`;

const Panel = styled.div`
  background: white;
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  padding: 24px;

  @media (min-width: 768px) {
    border-radius: 20px;
    max-width: 480px;
    max-height: 80vh;
  }
`;

const Handle = styled.div`
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: #e2e8f0;
  margin: 0 auto 20px;

  @media (min-width: 768px) {
    display: none;
  }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`;

const PanelTitle = styled.h2`
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 22px;
  font-weight: 600;
  color: #333;
  margin: 0;
`;

const CloseButton = styled.button`
  width: 36px;
  height: 36px;
  border: none;
  background: #f1f5f9;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: all 0.15s;

  &:hover {
    background: #e2e8f0;
    color: #333;
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const Section = styled.div`
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionLabel = styled.h3`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #94a3b8;
  margin: 0 0 12px;
`;

const RenameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RenameInput = styled.input`
  flex: 1;
  border: 1px solid rgba(44, 62, 80, 0.2);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 15px;
  font-weight: 500;
  color: #333;
  outline: none;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;

  &:focus {
    border-color: #2C3E50;
  }
`;

const SmallButton = styled.button<{ $variant?: 'primary' | 'danger' | 'default' }>`
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;

  ${(props) => {
    switch (props.$variant) {
      case 'primary':
        return `
          background: #2C3E50;
          color: white;
          border: none;
          &:hover { background: #1a252f; }
        `;
      case 'danger':
        return `
          background: #fee2e2;
          color: #dc2626;
          border: none;
          &:hover { background: #fecaca; }
        `;
      default:
        return `
          background: white;
          color: #333;
          border: 1px solid rgba(44, 62, 80, 0.2);
          &:hover { background: #f8f9fa; border-color: #2C3E50; }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MemberRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(44, 62, 80, 0.06);

  &:last-child {
    border-bottom: none;
  }
`;

const MemberAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  overflow: hidden;
  flex-shrink: 0;
`;

const MemberAvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const MemberInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const MemberName = styled.span`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
`;

const MemberRole = styled.span`
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-top: 1px;
`;

const RemoveButton = styled.button`
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: #94a3b8;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.15s;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;

  &:hover {
    background: #fee2e2;
    color: #dc2626;
  }
`;

const DangerZone = styled.div`
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 16px;
  background: #fef2f2;
`;

const DangerText = styled.p`
  font-size: 13px;
  color: #991b1b;
  margin: 0 0 12px;
`;

const ConfirmDialog = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`;

const ConfirmText = styled.span`
  font-size: 13px;
  color: #dc2626;
  font-weight: 600;
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`;

const ToggleLabel = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #333;
`;

const Toggle = styled.button<{ $active: boolean }>`
  width: 48px;
  height: 28px;
  border-radius: 14px;
  border: none;
  background: ${(props) => (props.$active ? '#22c55e' : '#e2e8f0')};
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${(props) => (props.$active ? '23px' : '3px')};
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    transition: left 0.2s;
  }
`;

const CurrencyRow = styled.div`
  margin-top: 8px;
`;

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

interface ListSettingsPanelProps {
  list: ShoppingList;
  onClose: () => void;
}

export const ListSettingsPanel: React.FC<ListSettingsPanelProps> = ({ list, onClose }) => {
  const [renameValue, setRenameValue] = useState(list.name);
  const [isRenaming, setIsRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const renameList = useShoppingListStore((s) => s.renameList);
  const deleteList = useShoppingListStore((s) => s.deleteList);
  const leaveList = useShoppingListStore((s) => s.leaveList);
  const removeMember = useShoppingListStore((s) => s.removeMember);
  const isOwner = useShoppingListStore((s) => s.isOwner);
  const enableCostSplitting = useShoppingListStore((s) => s.enableCostSplitting);
  const setListCurrency = useShoppingListStore((s) => s.setListCurrency);

  const isListOwner = isOwner(list.id);
  const memberEntries = Object.entries(list.members);

  const handleRename = async () => {
    if (!renameValue.trim() || renameValue === list.name || isProcessing) return;
    setIsProcessing(true);
    try {
      await renameList(list.id, renameValue.trim());
      setIsRenaming(false);
    } catch (error) {
      console.error('Failed to rename list:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await deleteList(list.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete list:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLeave = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await leaveList(list.id);
      onClose();
    } catch (error) {
      console.error('Failed to leave list:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await removeMember(list.id, userId);
    } catch (error) {
      console.error('Failed to remove member:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <Handle />
        <PanelHeader>
          <PanelTitle>List Settings</PanelTitle>
          <CloseButton onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </CloseButton>
        </PanelHeader>

        {/* Rename (owner only) */}
        {isListOwner && (
          <Section>
            <SectionLabel>List Name</SectionLabel>
            {isRenaming ? (
              <RenameRow>
                <RenameInput
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') { setIsRenaming(false); setRenameValue(list.name); }
                  }}
                  maxLength={50}
                  autoFocus
                />
                <SmallButton $variant="primary" onClick={handleRename} disabled={!renameValue.trim() || isProcessing}>
                  Save
                </SmallButton>
                <SmallButton onClick={() => { setIsRenaming(false); setRenameValue(list.name); }}>
                  Cancel
                </SmallButton>
              </RenameRow>
            ) : (
              <RenameRow>
                <RenameInput value={list.name} readOnly onClick={() => setIsRenaming(true)} style={{ cursor: 'pointer' }} />
                <SmallButton onClick={() => setIsRenaming(true)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                </SmallButton>
              </RenameRow>
            )}
          </Section>
        )}

        {/* Share (owner only) */}
        {isListOwner && (
          <Section>
            <SectionLabel>Sharing</SectionLabel>
            <SmallButton $variant="primary" onClick={() => setShowShareModal(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>share</span>
              Share List
            </SmallButton>
          </Section>
        )}

        {/* Members */}
        <Section>
          <SectionLabel>Members ({memberEntries.length})</SectionLabel>
          {memberEntries.map(([uid, member]) => (
            <MemberRow key={uid}>
              <MemberAvatar>
                {member.avatarUrl ? (
                  <MemberAvatarImg src={member.avatarUrl} alt={member.displayName} />
                ) : (
                  getInitials(member.displayName)
                )}
              </MemberAvatar>
              <MemberInfo>
                <MemberName>{member.displayName}</MemberName>
                <MemberRole>{member.role === 'owner' ? 'Owner' : 'Editor'}</MemberRole>
              </MemberInfo>
              {isListOwner && member.role !== 'owner' && (
                <RemoveButton onClick={() => handleRemoveMember(uid)} disabled={isProcessing}>
                  Remove
                </RemoveButton>
              )}
            </MemberRow>
          ))}
        </Section>

        {/* Cost Splitting (owner only) */}
        {isListOwner && (
          <Section>
            <SectionLabel>Cost Splitting</SectionLabel>
            <ToggleRow>
              <ToggleLabel>Enable Cost Splitting</ToggleLabel>
              <Toggle
                $active={!!list.costSplittingEnabled}
                onClick={() => enableCostSplitting(list.id, !list.costSplittingEnabled)}
              />
            </ToggleRow>
            {list.costSplittingEnabled && (
              <CurrencyRow>
                <CurrencySelector
                  value={list.currency}
                  onChange={(code) => setListCurrency(list.id, code)}
                />
              </CurrencyRow>
            )}
          </Section>
        )}

        {/* Danger zone */}
        <Section>
          {isListOwner ? (
            <DangerZone>
              <SectionLabel>Danger Zone</SectionLabel>
              <DangerText>
                Deleting this list will remove it for all members and permanently delete all items.
              </DangerText>
              {confirmDelete ? (
                <ConfirmDialog>
                  <ConfirmText>Are you sure?</ConfirmText>
                  <SmallButton $variant="danger" onClick={handleDelete} disabled={isProcessing}>
                    {isProcessing ? 'Deleting...' : 'Yes, Delete'}
                  </SmallButton>
                  <SmallButton onClick={() => setConfirmDelete(false)}>Cancel</SmallButton>
                </ConfirmDialog>
              ) : (
                <SmallButton $variant="danger" onClick={() => setConfirmDelete(true)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>delete</span>
                  Delete List
                </SmallButton>
              )}
            </DangerZone>
          ) : (
            <DangerZone>
              <SectionLabel>Leave List</SectionLabel>
              <DangerText>
                You will lose access to this shared list and its items.
              </DangerText>
              {confirmLeave ? (
                <ConfirmDialog>
                  <ConfirmText>Are you sure?</ConfirmText>
                  <SmallButton $variant="danger" onClick={handleLeave} disabled={isProcessing}>
                    {isProcessing ? 'Leaving...' : 'Yes, Leave'}
                  </SmallButton>
                  <SmallButton onClick={() => setConfirmLeave(false)}>Cancel</SmallButton>
                </ConfirmDialog>
              ) : (
                <SmallButton $variant="danger" onClick={() => setConfirmLeave(true)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>logout</span>
                  Leave List
                </SmallButton>
              )}
            </DangerZone>
          )}
        </Section>
      </Panel>

      {showShareModal && (
        <ShareListModal list={list} onClose={() => setShowShareModal(false)} />
      )}
    </Overlay>
  );
};
