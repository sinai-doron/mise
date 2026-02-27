import React from 'react';
import styled from 'styled-components';
import { useShoppingListStore } from '../../stores/shoppingListStore';

const AvatarStack = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
`;

const AvatarWrapper = styled.div<{ $offset: number }>`
  margin-left: ${(props) => (props.$offset > 0 ? '-8px' : '0')};
  position: relative;
  z-index: ${(props) => 10 - props.$offset};
`;

const Avatar = styled.div`
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
  overflow: hidden;
  flex-shrink: 0;
`;

const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ActiveDot = styled.div`
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  border: 2px solid white;
`;

const Label = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-left: 8px;
  white-space: nowrap;
`;

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export const PresenceAvatars: React.FC = () => {
  const getActivePresenceUsers = useShoppingListStore((s) => s.getActivePresenceUsers);
  const presenceUsers = getActivePresenceUsers();

  const entries = Object.entries(presenceUsers);
  if (entries.length === 0) return null;

  const MAX_SHOWN = 3;
  const shown = entries.slice(0, MAX_SHOWN);
  const overflow = entries.length - MAX_SHOWN;

  return (
    <AvatarStack>
      {shown.map(([uid, user], index) => (
        <AvatarWrapper key={uid} $offset={index}>
          <Avatar title={user.displayName}>
            {user.avatarUrl ? (
              <AvatarImg src={user.avatarUrl} alt={user.displayName} />
            ) : (
              getInitials(user.displayName)
            )}
          </Avatar>
          <ActiveDot />
        </AvatarWrapper>
      ))}
      {overflow > 0 && (
        <AvatarWrapper $offset={shown.length}>
          <Avatar title={`${overflow} more`}>+{overflow}</Avatar>
        </AvatarWrapper>
      )}
      <Label>
        {entries.length === 1
          ? `${entries[0][1].displayName} is here`
          : `${entries.length} people here`}
      </Label>
    </AvatarStack>
  );
};
