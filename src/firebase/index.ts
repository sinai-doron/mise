// Firebase configuration and services
export { app, db, storage, auth } from './config';

// Authentication
export {
  signInWithGoogle,
  signOut,
  getCurrentUser,
  onAuthChange,
  getUserId,
  isSignedIn,
} from './auth';

// Auth context and hook
export { AuthProvider, useAuth } from './AuthContext';

// Firestore helpers
export {
  getDocument,
  getCollection as getFirestoreCollection,
  setDocument,
  updateDocument,
  deleteDocument,
  subscribeToDocument,
  subscribeToCollection,
  setDocuments,
  deleteDocuments,
  where,
  orderBy,
  // Global collections (not user-scoped)
  getGlobalDocument,
  getGlobalCollection,
  subscribeToGlobalCollection,
  setGlobalDocument,
} from './firestore';

// Recipe sync
export {
  loadRecipesFromFirestore,
  saveRecipeToFirestore,
  deleteRecipeFromFirestore,
  loadGroceryListFromFirestore,
  saveGroceryListToFirestore,
  clearGroceryListFromFirestore,
  loadServingsMapFromFirestore,
  saveServingsMapToFirestore,
  subscribeToRecipes,
  subscribeToGroceryList,
  subscribeToServingsMap,
  migrateLocalStorageToFirestore,
  // User preferences
  loadUserPreferencesFromFirestore,
  saveUserPreferencesToFirestore,
  subscribeToUserPreferences,
  // Public recipes index
  setRecipePublicStatus,
  getPublicRecipeById,
  getPublicRecipeOwnerId,
  incrementPublicRecipeViews,
  incrementPublicRecipeCopies,
} from './recipeSync';
export type { UserPreferences, PublicRecipeIndex } from './recipeSync';

// Profile sync
export {
  loadProfile,
  saveProfile,
  updateProfile,
  createInitialProfile,
  subscribeToProfile,
  uploadAvatar,
  compressImage,
} from './profileSync';

// Built-in recipe sync (global collection)
export {
  loadBuiltInRecipesFromFirestore,
  subscribeToBuiltInRecipes,
  seedBuiltInRecipesToFirestore,
  clearBuiltInRecipesCache,
} from './builtInRecipeSync';

// Share sync (DEPRECATED - kept for backward compatibility)
// Use setRecipePublicStatus, getPublicRecipeById from recipeSync instead
export {
  saveSharedRecipe,
  removeSharedRecipe,
  getSharedRecipe,
  incrementShareViews,
  incrementShareCopies,
  updateRecipeShareStatus,
} from './shareSync';
export type { SharedRecipeData } from './shareSync';

// Collection sync (recipe collections)
export {
  createCollection,
  getCollection,
  updateCollection,
  deleteCollection,
  addRecipeToCollection,
  removeRecipeFromCollection,
  reorderCollectionRecipes,
  incrementCollectionViews,
  incrementCollectionRecipesCopied,
  subscribeToUserCollections,
  getOrCreateDefaultCollection,
  getUserCollections,
  getCollectionRecipes,
  getPublicCollectionsContainingRecipe,
} from './collectionSync';
