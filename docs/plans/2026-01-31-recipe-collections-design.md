# Recipe Collections Design

## Purpose
Allow users to create a public portfolio/showcase of their recipes. One shareable link to display all their curated recipes, like a personal food blog.

## Users
- Recipe creators who want to showcase their work
- Viewers who receive collection links (friends, family, social media followers)
- Potential new users who discover the app via shared collections

## Success Criteria
- [ ] Users can create and share collections
- [ ] Collections get views and social shares
- [ ] Viewers sign up and add recipes from collections
- [ ] Collection creation rate tracked

## Constraints
- Must use existing Firebase infrastructure
- Reuse existing recipe sharing architecture where possible
- App runs on Cloud Run with Express server

## Out of Scope (v1)
- Social features (following, likes, comments)
- Multiple collections per user (architecture supports it, UI deferred)
- Custom usernames (use auto-generated IDs)
- Public directory/discovery of collections

## Approach Chosen
**Hybrid: Profile Page + Collections**
- User gets a profile page at `/u/:shareId`
- Profile displays one collection (v1), designed for multiple later
- Collections are named groups of recipes with manual ordering
- Auto-generated share ID for v1, custom usernames deferred

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Profile                         │
│  /u/:profileShareId                                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────────────────────────┐  │
│  │   Avatar    │  │  Display Name                       │  │
│  │             │  │  Bio (optional)                     │  │
│  └─────────────┘  │  "X recipes shared"                 │  │
│                   └─────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Collection: "My Recipes" (or custom name)                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Recipe  │ │ Recipe  │ │ Recipe  │ │ Recipe  │          │
│  │  Card   │ │  Card   │ │  Card   │ │  Card   │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

```typescript
// New: Collection entity
interface Collection {
  id: string;              // Auto-generated (also used as shareId)
  ownerId: string;         // User who owns it
  ownerName?: string;      // Display name for OG tags
  name: string;            // "My Recipes" by default
  description?: string;    // Optional bio/description
  isPublic: boolean;       // Public or unlisted (link-only)
  recipeIds: string[];     // Recipes included (ordered by position)
  coverImage?: string;     // Optional cover image
  createdAt: number;
  updatedAt: number;
  stats: {
    views: number;
    recipesCopied: number;
  };
}

// Extend User Profile
interface UserProfile {
  // ... existing fields
  profileShareId?: string;     // ID for /u/:shareId URL
  defaultCollectionId?: string; // Their main collection
}
```

**Firestore structure:**
```
/collections/{collectionId}     <- Global collection, publicly readable
/users/{userId}/profile         <- Existing user profile
```

## Data Flow

### Flow 1: Creating a Collection
```
User goes to Profile/Collections page →
  "Create Collection" (or auto-created) →
    Collection created in /collections/{id} →
      defaultCollectionId set on user profile →
        User sees collection management UI
```

### Flow 2: Adding Recipes to Collection
```
On recipe detail or list →
  "Add to Collection" button →
    Recipe ID added to collection.recipeIds[] →
      If recipe not already public, prompt to make public →
        Collection shows updated recipe list
```

### Flow 3: Viewing a Collection (Public)
```
Visitor opens /u/{shareId} →
  Fetch collection by id →
    Fetch all recipes in recipeIds[] from sharedRecipes →
      Display profile header + recipe grid →
        Increment view count
```

### Flow 4: Reordering Recipes
```
Owner in collection edit mode →
  Drag recipe to new position →
    Update recipeIds[] order in array →
      Save to Firestore
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| Collection not found | Show "Collection not found" page |
| Collection is unlisted, accessed without link | Same as not found |
| Recipe in collection was deleted | Skip it in display |
| Recipe was made private | Skip it (implicit removal) |
| User has no collection | Show "Create your collection" prompt |
| Collection has no recipes | Show empty state with instructions |

## Firestore Security Rules

```javascript
match /collections/{collectionId} {
  // Anyone can read public collections
  allow read: if resource.data.isPublic == true;
  // Owner can read their own (even if private)
  allow read: if request.auth != null
              && request.auth.uid == resource.data.ownerId;
  // Only owner can create/update/delete
  allow create: if request.auth != null;
  allow update, delete: if request.auth != null
                        && request.auth.uid == resource.data.ownerId;
}
```

## UI Components

### New Pages
- `/u/:collectionId` - Public collection view
- Collection management section in Profile page

### New Components
- `CollectionPage.tsx` - Public view of a collection
- `CollectionManager.tsx` - Owner's UI to manage collection
- `AddToCollectionButton.tsx` - Button on recipe cards/detail
- `CollectionRecipeGrid.tsx` - Draggable grid of recipe cards

### Modified Components
- `ProfilePage.tsx` - Add collection management section
- `RecipeCard.tsx` - Add "Add to Collection" action
- `RecipeDetail.tsx` - Add "Add to Collection" button

## Server Changes
- Add `/u/:collectionId` route to Express server
- Inject OG tags for collection pages (title, description, cover image)

## Testing Strategy

### Unit Tests
- Collection CRUD operations
- Recipe ordering logic
- Stats increment

### Integration Tests
- Create → fetch → verify
- Add recipe → appears in collection
- Private collection → access denied

### Manual Testing
- Full flow: create, add, share, view
- Social preview testing (OG tags)
- Drag-drop reordering

## Questions Resolved
- Q: Multiple collections?
  A: V1 has one, architecture supports multiple
- Q: URL structure?
  A: /u/:shareId (auto-generated), usernames deferred
- Q: Discovery/browse?
  A: Deferred to v2
- Q: Social features?
  A: Out of scope for v1
- Q: Recipe ordering?
  A: Yes, recipeIds array preserves order, drag-drop to reorder
