import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../firebase';
import { useUserProfileStore } from '../stores/userProfileStore';
import { UserAvatar } from './UserAvatar';

// Color palette
const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
  border: '#e0e0e0',
  hover: '#f5f5f5',
  danger: '#dc2626',
};

const MenuContainer = styled.div`
  position: relative;
`;

const AvatarButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 50%;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: scale(1.05);
  }

  &:focus {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }
`;

const Dropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 280px;
  background: ${colors.surface};
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid ${colors.border};
  z-index: 1000;
  opacity: ${(props) => (props.$isOpen ? 1 : 0)};
  visibility: ${(props) => (props.$isOpen ? 'visible' : 'hidden')};
  transform: ${(props) => (props.$isOpen ? 'translateY(0)' : 'translateY(-10px)')};
  transition: opacity 0.2s, transform 0.2s, visibility 0.2s;
`;

const UserInfo = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${colors.border};
  display: flex;
  align-items: center;
  gap: 12px;
`;

const UserDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.div`
  font-weight: 600;
  color: ${colors.textMain};
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserEmail = styled.div`
  font-size: 12px;
  color: ${colors.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MenuList = styled.div`
  padding: 8px 0;
`;

const MenuItem = styled.button<{ $danger?: boolean }>`
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 14px;
  color: ${(props) => (props.$danger ? colors.danger : colors.textMain)};
  text-align: left;
  transition: background 0.15s;

  &:hover {
    background: ${(props) => (props.$danger ? '#fef2f2' : colors.hover)};
  }

  &:focus {
    outline: none;
    background: ${(props) => (props.$danger ? '#fef2f2' : colors.hover)};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .material-symbols-outlined {
    font-size: 20px;
    color: ${(props) => (props.$danger ? colors.danger : colors.textMuted)};
  }
`;

const Divider = styled.div`
  height: 1px;
  background: ${colors.border};
  margin: 8px 0;
`;

export function UserMenu() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const profile = useUserProfileStore((s) => s.profile);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (!user) return null;

  // Use profile data if available, otherwise fall back to Firebase Auth data
  const displayName = profile?.displayName || user.displayName || 'User';
  const avatarUrl = profile?.avatarUrl || user.photoURL;
  const email = user.email || '';

  return (
    <MenuContainer ref={menuRef}>
      <AvatarButton
        onClick={handleToggle}
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <UserAvatar src={avatarUrl} name={displayName} size="small" />
      </AvatarButton>

      <Dropdown $isOpen={isOpen}>
        <UserInfo>
          <UserAvatar src={avatarUrl} name={displayName} size="medium" />
          <UserDetails>
            <UserName>{displayName}</UserName>
            <UserEmail>{email}</UserEmail>
          </UserDetails>
        </UserInfo>

        <MenuList>
          <MenuItem onClick={() => handleNavigate('/profile')}>
            <span className="material-symbols-outlined">person</span>
            Profile
          </MenuItem>
          <MenuItem disabled>
            <span className="material-symbols-outlined">settings</span>
            Settings
          </MenuItem>
          <Divider />
          <MenuItem $danger onClick={handleSignOut}>
            <span className="material-symbols-outlined">logout</span>
            Sign Out
          </MenuItem>
        </MenuList>
      </Dropdown>
    </MenuContainer>
  );
}
