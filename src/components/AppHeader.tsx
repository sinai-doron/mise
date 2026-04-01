import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { colors, fonts } from '../styles/theme';
import LanguageSelector from './LanguageSelector';
import { UserMenu } from './UserMenu';

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  background: ${colors.primary};
  transition: all 0.3s;
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 32px;

  @media (min-width: 768px) {
    padding: 12px 32px;
  }
`;

const LogoGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: transform 0.2s;
  flex-shrink: 0;

  &:hover .logo-icon {
    transform: rotate(6deg);
  }
`;

const LogoIcon = styled.img`
  width: 40px;
  height: 40px;
  transform: rotate(3deg);
  transition: transform 0.2s;
`;

const LogoText = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: ${colors.onPrimary};
  font-family: ${fonts.logo};
  letter-spacing: -0.02em;
`;

const Nav = styled.nav`
  display: none;
  align-items: center;
  gap: 8px;
  flex: 1;

  @media (min-width: 768px) {
    display: flex;
  }
`;

const NavLink = styled.a<{ $active?: boolean }>`
  font-size: 14px;
  font-family: ${fonts.label};
  font-weight: ${(props) => (props.$active ? '600' : '500')};
  color: ${(props) => (props.$active ? colors.onPrimary : 'rgba(255, 255, 255, 0.7)')};
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
  padding: 8px 14px;
  border-radius: ${`0.5rem`};
  background: ${(props) => (props.$active ? 'rgba(255, 255, 255, 0.12)' : 'transparent')};

  &:hover {
    color: ${colors.onPrimary};
    background: rgba(255, 255, 255, 0.08);
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
`;

const MobileMenuButton = styled.button`
  display: flex;
  color: ${colors.onPrimary};
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;

  @media (min-width: 768px) {
    display: none;
  }
`;

const MobileNav = styled.nav<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  flex-direction: column;
  background: ${colors.primaryContainer};
  padding: 8px 0;

  @media (min-width: 768px) {
    display: none;
  }
`;

const MobileNavLink = styled.a<{ $active?: boolean }>`
  padding: 14px 24px;
  font-size: 15px;
  font-family: ${fonts.label};
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  color: ${({ $active }) => ($active ? colors.onPrimary : 'rgba(255, 255, 255, 0.7)')};
  text-decoration: none;
  cursor: pointer;
  border-left: 3px solid ${({ $active }) => ($active ? colors.secondaryContainer : 'transparent')};

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    color: ${colors.onPrimary};
  }
`;

const HeaderActionButton = styled.button`
  display: none;
  align-items: center;
  gap: 6px;
  background: ${colors.inverseSurface};
  color: ${colors.inverseOnSurface};
  border: none;
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 13px;
  font-family: ${fonts.label};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: #3d4244;
    transform: translateY(-1px);
  }

  .material-symbols-outlined {
    font-size: 18px;
  }

  @media (min-width: 768px) {
    display: flex;
  }
`;

const AddCircleButton = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: ${colors.inverseSurface};
  color: ${colors.inverseOnSurface};
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #3d4244;
    transform: translateY(-1px);
  }

  .material-symbols-outlined {
    font-size: 20px;
  }

  @media (min-width: 768px) {
    display: flex;
  }
`;

export type ActivePage = 'recipes' | 'meal-plan' | 'shopping' | 'collections' | 'discover';

interface AppHeaderProps {
  activePage: ActivePage;
  onAIImport?: () => void;
  onAdd?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ activePage, onAIImport, onAdd }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleGoHome = () => navigate('/recipes');

  const navItems: { key: ActivePage; label: string; path: string }[] = [
    { key: 'recipes', label: t('nav.recipes'), path: '/recipes' },
    { key: 'meal-plan', label: t('nav.mealPlan'), path: '/meal-plan' },
    { key: 'shopping', label: t('nav.shopping'), path: '/shopping' },
    { key: 'collections', label: t('nav.collections'), path: '/collections' },
    { key: 'discover', label: t('discover.title'), path: '/discover' },
  ];

  return (
    <Header>
      <HeaderContent>
        <LogoGroup onClick={handleGoHome}>
          <LogoIcon className="logo-icon" src="/logo.png" alt="Duckbook" />
          <LogoText>Duckbook</LogoText>
        </LogoGroup>

        <Nav>
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              $active={activePage === item.key}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </NavLink>
          ))}
        </Nav>

        <HeaderRight>
          {onAIImport && (
            <HeaderActionButton onClick={onAIImport}>
              <span className="material-symbols-outlined">auto_awesome</span>
              {t('nav.aiImport')}
            </HeaderActionButton>
          )}
          {onAdd && (
            <AddCircleButton onClick={onAdd} title={t('nav.addRecipe')}>
              <span className="material-symbols-outlined">add</span>
            </AddCircleButton>
          )}
          <LanguageSelector />
          <MobileMenuButton onClick={() => setIsMobileNavOpen((o) => !o)}>
            <span className="material-symbols-outlined">
              {isMobileNavOpen ? 'close' : 'menu'}
            </span>
          </MobileMenuButton>
          <UserMenu />
        </HeaderRight>
      </HeaderContent>
      <MobileNav $open={isMobileNavOpen}>
        {navItems.map((item) => (
          <MobileNavLink
            key={item.key}
            $active={activePage === item.key}
            onClick={() => {
              navigate(item.path);
              setIsMobileNavOpen(false);
            }}
          >
            {item.label}
          </MobileNavLink>
        ))}
      </MobileNav>
    </Header>
  );
};
