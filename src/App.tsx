import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { usePageTracking } from './hooks/useAnalytics';
import { AuthProvider, useAuth } from './firebase';
import { SignIn } from './components/SignIn';
import { RecipesPage } from './pages/RecipesPage';
import { ShoppingListPage } from './pages/ShoppingListPage';
import { MealPlanPage } from './pages/MealPlanPage';
import { ProfilePage } from './pages/ProfilePage';
import { PublicRecipePage } from './pages/PublicRecipePage';
import { CollectionPage } from './pages/CollectionPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { useUserProfileStore } from './stores/userProfileStore';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      useUserProfileStore.getState().initializeProfile();
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F0F4F8'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 16 }}>
            hourglass_empty
          </div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <SignIn />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  usePageTracking();

  return (
    <Routes>
      {/* Public routes - no auth required */}
      <Route path="/recipe/:recipeId" element={<PublicRecipePage />} />
      {/* Legacy route for backward compatibility with old share links */}
      <Route path="/share/:shareId" element={<PublicRecipePage />} />
      <Route path="/u/:collectionId" element={<CollectionPage />} />
      <Route path="/discover" element={<DiscoverPage />} />

      {/* Protected routes */}
      <Route path="/" element={<AuthGuard><RecipesPage /></AuthGuard>} />
      <Route path="/recipes" element={<AuthGuard><RecipesPage /></AuthGuard>} />
      <Route path="/recipes/:recipeId" element={<AuthGuard><RecipesPage /></AuthGuard>} />
      <Route path="/shopping" element={<AuthGuard><ShoppingListPage /></AuthGuard>} />
      <Route path="/meal-plan" element={<AuthGuard><MealPlanPage /></AuthGuard>} />
      <Route path="/collections" element={<AuthGuard><CollectionsPage /></AuthGuard>} />
      <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
