// User profile type - stored in Firestore, separate from Firebase Auth data
export interface UserProfile {
  uid: string;                    // Firebase Auth UID
  displayName: string;            // Custom name (fallback to Google name)
  avatarUrl?: string;             // Custom avatar URL (fallback to Google photo)
  bio?: string;                   // Short bio/description
  email: string;                  // From Google Auth (read-only)
  isAdmin?: boolean;              // Admin flag - set manually in Firestore
  defaultCollectionId?: string;   // User's default recipe collection
  createdAt: number;
  updatedAt: number;
}

// Profile update payload (partial, without uid/email/createdAt)
export interface ProfileUpdate {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  defaultCollectionId?: string;
}
