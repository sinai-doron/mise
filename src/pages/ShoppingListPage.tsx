import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { SEO } from '../components/SEO';
import { useRecipeStore } from '../stores/recipeStore';
import { useShoppingListStore } from '../stores/shoppingListStore';
import { useAuth } from '../firebase';
import { UserMenu } from '../components/UserMenu';
import { QuickAddInput, CategorySection, FrequentlyBoughtPanel, ListSwitcher, ListSettingsPanel, PresenceAvatars } from '../components/shopping';
import type { ShoppingItem, IngredientCategory } from '../types/Recipe';
import { CATEGORY_ORDER } from '../types/Recipe';

// Color palette (matching Prepd design)
const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
  green500: '#22c55e',
  orange100: '#ffedd5',
  orange600: '#ea580c',
};

const PageContainer = styled.div`
  min-height: 100vh;
  background: ${colors.backgroundLight};
  display: flex;
  flex-direction: column;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(240, 244, 248, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(44, 62, 80, 0.1);
  padding: 12px 16px;

  @media (min-width: 768px) {
    padding: 16px 24px;
  }
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const LogoGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
`;

const LogoIcon = styled.div`
  width: 32px;
  height: 32px;
  background: ${colors.primary};
  color: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.2);

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const LogoText = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: ${colors.textMain};
  font-family: 'Playfair Display', Georgia, serif;

  @media (max-width: 480px) {
    display: none;
  }
`;

const Nav = styled.nav`
  display: none;
  align-items: center;
  gap: 32px;

  @media (min-width: 768px) {
    display: flex;
  }
`;

const NavLink = styled.a<{ $active?: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${(props) => (props.$active ? colors.primary : colors.textMuted)};
  text-decoration: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: color 0.15s;

  &:hover {
    color: ${colors.primary};
  }
`;

const ActiveDot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${colors.primary};
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const MobileMenuButton = styled.button`
  display: flex;
  color: ${colors.textMain};
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
  background: ${colors.surface};
  border-top: 1px solid rgba(44, 62, 80, 0.1);
  padding: 8px 0;

  @media (min-width: 768px) {
    display: none;
  }
`;

const MobileNavLink = styled.a<{ $active?: boolean }>`
  padding: 14px 24px;
  font-size: 15px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  color: ${({ $active }) => ($active ? colors.primary : colors.textMain)};
  text-decoration: none;
  cursor: pointer;
  border-left: 3px solid ${({ $active }) => ($active ? colors.primary : 'transparent')};

  &:hover {
    background: rgba(44, 62, 80, 0.04);
    color: ${colors.primary};
  }
`;

const MainContent = styled.main`
  flex: 1;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  padding: 16px;
  padding-bottom: 80px;

  @media (min-width: 768px) {
    padding: 24px;
    padding-bottom: 32px;
  }
`;

const QuickAddContainer = styled.div`
  position: sticky;
  top: 60px;
  z-index: 40;
  margin-bottom: 16px;

  @media (min-width: 768px) {
    top: 72px;
    margin-bottom: 24px;
  }
`;

const PageHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32px;
  }
`;

const PageTitleGroup = styled.div``;

const PageLabel = styled.p`
  color: ${colors.primary};
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0 0 4px 0;
`;

const PageTitle = styled.h1`
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 28px;
  font-weight: 500;
  color: ${colors.textMain};
  margin: 0;
  letter-spacing: -0.02em;

  @media (min-width: 768px) {
    font-size: 36px;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ActionButton = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  ${(props) =>
    props.$primary
      ? `
    background: ${colors.primary};
    color: white;
    border: none;
    box-shadow: 0 4px 12px rgba(44, 62, 80, 0.2);

    &:hover {
      background: ${colors.primaryDark};
    }
  `
      : props.$danger
      ? `
    background: #fee2e2;
    color: #dc2626;
    border: none;

    &:hover {
      background: #fecaca;
    }
  `
      : `
    background: white;
    color: ${colors.textMain};
    border: 1px solid rgba(44, 62, 80, 0.15);

    &:hover {
      background: #f8f9fa;
      border-color: ${colors.primary};
    }
  `}

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const CategoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 20px;
  background: white;
  border-radius: 16px;
  border: 2px dashed rgba(44, 62, 80, 0.15);

  .material-symbols-outlined {
    font-size: 56px;
    color: ${colors.textMuted};
    opacity: 0.5;
    margin-bottom: 12px;
  }

  h3 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 22px;
    color: ${colors.textMain};
    margin: 0 0 8px 0;
  }

  p {
    font-size: 14px;
    color: ${colors.textMuted};
    margin: 0 0 20px 0;
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: ${colors.textMuted};

  .material-symbols-outlined {
    font-size: 40px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const BottomStatusBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid rgba(44, 62, 80, 0.1);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 40;

  @media (min-width: 768px) {
    display: none;
  }
`;

const StatusText = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.textMuted};
`;

const StatusButton = styled.button`
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 700;
  color: ${colors.primary};
  cursor: pointer;
  padding: 4px 8px;

  &:hover {
    text-decoration: underline;
  }
`;

export function ShoppingListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Recipe store — still needed for general Firebase init (recipes, etc.)
  const isLoading = useRecipeStore((s) => s.isLoading);
  const hasInitialized = useRecipeStore((s) => s.hasInitialized);
  const initializeFirebaseSync = useRecipeStore((s) => s.initializeFirebaseSync);

  // Shopping list store — new multi-list store
  const shoppingItems = useShoppingListStore((s) => s.activeListItems);
  const purchaseHistory = useShoppingListStore((s) => s.purchaseHistory);
  const isLoadingLists = useShoppingListStore((s) => s.isLoadingLists);
  const isLoadingItems = useShoppingListStore((s) => s.isLoadingItems);
  const addManualItem = useShoppingListStore((s) => s.addManualItem);
  const toggleShoppingItem = useShoppingListStore((s) => s.toggleShoppingItem);
  const updateShoppingItemQuantity = useShoppingListStore((s) => s.updateShoppingItemQuantity);
  const deleteShoppingItem = useShoppingListStore((s) => s.deleteShoppingItem);
  const clearPurchasedItems = useShoppingListStore((s) => s.clearPurchasedItems);
  const clearShoppingList = useShoppingListStore((s) => s.clearShoppingList);
  const initializeShoppingLists = useShoppingListStore((s) => s.initialize);
  const cleanupShoppingLists = useShoppingListStore((s) => s.cleanupSubscriptions);
  const getActiveList = useShoppingListStore((s) => s.getActiveList);
  const activeList = getActiveList();

  // Initialize Firebase sync on mount (recipe store)
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      cleanup = await initializeFirebaseSync();
    };

    init();

    return () => {
      if (cleanup) cleanup();
    };
  }, [initializeFirebaseSync, user]);

  // Initialize shopping list store
  useEffect(() => {
    if (user) {
      initializeShoppingLists();
    }
    return () => {
      cleanupShoppingLists();
    };
  }, [user, initializeShoppingLists, cleanupShoppingLists]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<IngredientCategory, ShoppingItem[]> = {
      produce: [],
      dairy: [],
      meat: [],
      bakery: [],
      frozen: [],
      pantry: [],
      spices: [],
      cleaning: [],
      personal_care: [],
      paper_products: [],
      pet: [],
      baby: [],
      other: [],
    };

    shoppingItems.forEach((item) => {
      groups[item.category].push(item);
    });

    // Return only non-empty categories in order
    return CATEGORY_ORDER.filter((cat) => groups[cat].length > 0).map((cat) => ({
      category: cat,
      items: groups[cat],
    }));
  }, [shoppingItems]);

  // Calculate stats
  const totalItems = shoppingItems.length;
  const boughtItems = shoppingItems.filter((i) => i.bought).length;

  return (
    <PageContainer>
      <SEO
        title="Shopping List - Prepd"
        description="Your grocery shopping list organized by category."
        canonical="/shopping"
        keywords="shopping list, grocery list, recipes"
      />

      <Header>
        <HeaderContent>
          <LogoGroup onClick={() => navigate('/')}>
            <LogoIcon>
              <span className="material-symbols-outlined">soup_kitchen</span>
            </LogoIcon>
            <LogoText>Prepd</LogoText>
          </LogoGroup>

          <Nav>
            <NavLink onClick={() => navigate('/recipes')}>Recipes</NavLink>
            <NavLink onClick={() => navigate('/meal-plan')}>Meal Plan</NavLink>
            <NavLink $active>
              Shopping
              <ActiveDot />
            </NavLink>
            <NavLink onClick={() => navigate('/collections')}>Collections</NavLink>
            <NavLink onClick={() => navigate('/discover')}>Discover</NavLink>
          </Nav>

          <HeaderRight>
            <MobileMenuButton onClick={() => setIsMobileNavOpen(o => !o)}>
              <span className="material-symbols-outlined">{isMobileNavOpen ? 'close' : 'menu'}</span>
            </MobileMenuButton>
            <UserMenu />
          </HeaderRight>
        </HeaderContent>
        <MobileNav $open={isMobileNavOpen}>
          <MobileNavLink onClick={() => { navigate('/recipes'); setIsMobileNavOpen(false); }}>Recipes</MobileNavLink>
          <MobileNavLink onClick={() => { navigate('/meal-plan'); setIsMobileNavOpen(false); }}>Meal Plan</MobileNavLink>
          <MobileNavLink $active>Shopping</MobileNavLink>
          <MobileNavLink onClick={() => { navigate('/collections'); setIsMobileNavOpen(false); }}>Collections</MobileNavLink>
          <MobileNavLink onClick={() => { navigate('/discover'); setIsMobileNavOpen(false); }}>Discover</MobileNavLink>
        </MobileNav>
      </Header>

      <MainContent>
        <PageHeader>
          <PageTitleGroup>
            <PageLabel>My Groceries</PageLabel>
            <PageTitle>Shopping List</PageTitle>
          </PageTitleGroup>

          <HeaderActions>
            {activeList && activeList.memberIds.length > 1 && (
              <PresenceAvatars />
            )}
            {activeList && (
              <ActionButton onClick={() => setShowSettings(true)}>
                <span className="material-symbols-outlined">settings</span>
              </ActionButton>
            )}
            {boughtItems > 0 && (
              <ActionButton onClick={clearPurchasedItems}>
                <span className="material-symbols-outlined">done_all</span>
                Clear Done
              </ActionButton>
            )}
            {totalItems > 0 && (
              <ActionButton $danger onClick={clearShoppingList}>
                <span className="material-symbols-outlined">delete</span>
                Clear All
              </ActionButton>
            )}
          </HeaderActions>
        </PageHeader>

        <ListSwitcher />

        <QuickAddContainer>
          <QuickAddInput onAdd={addManualItem} purchaseHistory={purchaseHistory} />
        </QuickAddContainer>

        <FrequentlyBoughtPanel
          purchaseHistory={purchaseHistory}
          shoppingItems={shoppingItems}
          onAdd={addManualItem}
        />

        {!hasInitialized || isLoading || isLoadingLists || isLoadingItems ? (
          <LoadingState>
            <span className="material-symbols-outlined">hourglass_empty</span>
          </LoadingState>
        ) : totalItems === 0 ? (
          <EmptyState>
            <span className="material-symbols-outlined">shopping_cart</span>
            <h3>Your shopping list is empty</h3>
            <p>Add items above or browse recipes to add ingredients.</p>
            <ActionButton $primary onClick={() => navigate('/recipes')}>
              <span className="material-symbols-outlined">menu_book</span>
              Browse Recipes
            </ActionButton>
          </EmptyState>
        ) : (
          <CategoryList>
            {groupedItems.map(({ category, items }) => (
              <CategorySection
                key={category}
                category={category}
                items={items}
                onToggleItem={toggleShoppingItem}
                onQuantityChange={updateShoppingItemQuantity}
                onDeleteItem={deleteShoppingItem}
                members={activeList && activeList.memberIds.length > 1 ? activeList.members : undefined}
              />
            ))}
          </CategoryList>
        )}
      </MainContent>

      {totalItems > 0 && (
        <BottomStatusBar>
          <StatusText>
            {boughtItems} of {totalItems} items
          </StatusText>
          {boughtItems > 0 && (
            <StatusButton onClick={clearPurchasedItems}>Clear done</StatusButton>
          )}
        </BottomStatusBar>
      )}

      {showSettings && activeList && (
        <ListSettingsPanel list={activeList} onClose={() => setShowSettings(false)} />
      )}
    </PageContainer>
  );
}
