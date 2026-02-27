import React, { useState } from 'react';
import styled from 'styled-components';
import { useShoppingListStore } from '../../stores/shoppingListStore';
import { formatPrice } from '../../types/ShoppingList';
import type { ListMember } from '../../types/ShoppingList';

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
  margin-bottom: 20px;
`;

const SectionLabel = styled.h3`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #94a3b8;
  margin: 0 0 12px;
`;

const TotalRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f0fdf4;
  border-radius: 12px;
  margin-bottom: 20px;
`;

const TotalLabel = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const TotalAmount = styled.span`
  font-size: 24px;
  font-weight: 700;
  color: #059669;
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

const MemberSpent = styled.span`
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-top: 1px;
`;

const MemberAmount = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: #333;
`;

const DebtRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fef3c7;
  border-radius: 10px;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const DebtIcon = styled.span`
  color: #d97706;
  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const DebtText = styled.span`
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
`;

const DebtAmount = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: #d97706;
`;

const SettleButton = styled.button`
  width: 100%;
  padding: 14px;
  border: none;
  background: #2C3E50;
  color: white;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;

  &:hover {
    background: #1a252f;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const ConfirmRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
`;

const ConfirmText = styled.span`
  font-size: 14px;
  color: #dc2626;
  font-weight: 600;
  flex: 1;
`;

const ConfirmButton = styled.button<{ $variant?: 'danger' | 'default' }>`
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;

  ${(props) =>
    props.$variant === 'danger'
      ? `background: #dc2626; color: white; border: none; &:hover { background: #b91c1c; }`
      : `background: white; color: #333; border: 1px solid rgba(44,62,80,0.2); &:hover { background: #f8f9fa; }`}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px 16px;
  color: #94a3b8;
  font-size: 14px;
`;

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

interface CostSplitBalanceViewProps {
  onClose: () => void;
}

export const CostSplitBalanceView: React.FC<CostSplitBalanceViewProps> = ({ onClose }) => {
  const [confirmSettle, setConfirmSettle] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  const getCostSummary = useShoppingListStore((s) => s.getCostSummary);
  const settleUp = useShoppingListStore((s) => s.settleUp);
  const activeList = useShoppingListStore((s) => s.getActiveList());

  const summary = getCostSummary();
  const members = activeList?.members || {};
  const currency = activeList?.currency;

  const getMemberName = (uid: string): string => {
    return members[uid]?.displayName || 'Unknown';
  };

  const getMember = (uid: string): ListMember | undefined => {
    return members[uid];
  };

  const handleSettle = async () => {
    setIsSettling(true);
    try {
      await settleUp();
      onClose();
    } catch (error) {
      console.error('Failed to settle up:', error);
    } finally {
      setIsSettling(false);
    }
  };

  const fairShare = summary.total / (activeList?.memberIds.length || 1);

  return (
    <Overlay onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <Handle />
        <PanelHeader>
          <PanelTitle>Settle Up</PanelTitle>
          <CloseButton onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </CloseButton>
        </PanelHeader>

        {summary.total === 0 ? (
          <EmptyState>
            <span className="material-symbols-outlined" style={{ fontSize: 48, display: 'block', marginBottom: 8 }}>receipt_long</span>
            No priced items yet. Swipe left on bought items to add prices.
          </EmptyState>
        ) : (
          <>
            <TotalRow>
              <TotalLabel>Total Spent</TotalLabel>
              <TotalAmount>{formatPrice(summary.total, currency)}</TotalAmount>
            </TotalRow>

            <Section>
              <SectionLabel>Spending Breakdown</SectionLabel>
              {activeList?.memberIds.map((uid) => {
                const member = getMember(uid);
                const spent = summary.perMember[uid] || 0;
                return (
                  <MemberRow key={uid}>
                    <MemberAvatar>
                      {member?.avatarUrl ? (
                        <MemberAvatarImg src={member.avatarUrl} alt={member.displayName} />
                      ) : (
                        getInitials(getMemberName(uid))
                      )}
                    </MemberAvatar>
                    <MemberInfo>
                      <MemberName>{getMemberName(uid)}</MemberName>
                      <MemberSpent>
                        Fair share: {formatPrice(fairShare, currency)}
                      </MemberSpent>
                    </MemberInfo>
                    <MemberAmount>{formatPrice(spent, currency)}</MemberAmount>
                  </MemberRow>
                );
              })}
            </Section>

            {summary.debts.length > 0 && (
              <Section>
                <SectionLabel>Balances</SectionLabel>
                {summary.debts.map((debt, i) => (
                  <DebtRow key={i}>
                    <DebtIcon>
                      <span className="material-symbols-outlined">swap_horiz</span>
                    </DebtIcon>
                    <DebtText>
                      {getMemberName(debt.from)} owes {getMemberName(debt.to)}
                    </DebtText>
                    <DebtAmount>{formatPrice(debt.amount, currency)}</DebtAmount>
                  </DebtRow>
                ))}
              </Section>
            )}

            {!confirmSettle ? (
              <SettleButton onClick={() => setConfirmSettle(true)}>
                <span className="material-symbols-outlined">check_circle</span>
                Mark as Settled
              </SettleButton>
            ) : (
              <ConfirmRow>
                <ConfirmText>This will clear all bought items with prices. Continue?</ConfirmText>
                <ConfirmButton $variant="danger" onClick={handleSettle} disabled={isSettling}>
                  {isSettling ? 'Settling...' : 'Yes'}
                </ConfirmButton>
                <ConfirmButton onClick={() => setConfirmSettle(false)}>Cancel</ConfirmButton>
              </ConfirmRow>
            )}
          </>
        )}
      </Panel>
    </Overlay>
  );
};
