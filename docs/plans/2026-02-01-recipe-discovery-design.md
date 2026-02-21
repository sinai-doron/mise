# Recipe Discovery Design

## Purpose
Help home cooks find inspiration by browsing and searching recipes shared by the community - like Spotify for recipes.

## Users
Home cooks seeking inspiration - people who cook regularly but want new ideas and variety.

## Success Criteria
- [ ] More recipes saved from discovery (users adding public recipes to their collections)
- [ ] More recipes being shared publicly (creators motivated by having an audience)

## Constraints
- MVP approach - simple browse/search first, no complex algorithms
- No moderation burden - community-driven, rely on flags if needed

## Out of Scope (V1)
- Personalized/AI recommendations ("for you" suggestions)
- Social features (following users, comments, likes)
- External recipe import (scraping from other sites)
- Monetization (promoted recipes, premium features)

## Approach Chosen
**Combine Browse Page + Search** - A dedicated Discover page showing all public recipes in a grid with filters AND a search bar for finding specific recipes.

## Architecture

### New Components
1. **DiscoverPage** - Main browse experience at `/discover`
2. **RecipeSearch** - Reusable search component for public recipes
3. **RecipeFilters** - Category, time, difficulty filter chips

### Data Flow
```
User opens /discover
    → Fetch from `publicRecipes` collection (already exists)
    → Display in paginated grid
    → Filters/search query the same collection

User clicks recipe
    → Navigate to /recipe/:id (existing PublicRecipePage)
    → Can save to their collection (existing flow)
```

**No new Firestore collections needed** - leverages existing `publicRecipes` index.

## UI Mockup

```
┌──────────────────────────────────────────────────┐
│  🏠 Mise                              [Profile]  │
├──────────────────────────────────────────────────┤
│  Discover Recipes                                │
│  ┌────────────────────────────────────────────┐  │
│  │ 🔍 Search by name, ingredient, cuisine... │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [All] [Quick <30m] [Dinner] [Dessert] [Vegan]  │
│                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │  📷    │ │  📷    │ │  📷    │ │  📷    │   │
│  │ Title  │ │ Title  │ │ Title  │ │ Title  │   │
│  │ 30m 🍽4 │ │ 45m 🍽6 │ │ 20m 🍽2 │ │ 60m 🍽8 │   │
│  │ by Chef│ │ by Chef│ │ by Chef│ │ by Chef│   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
│                                                  │
│  [Load More]                                     │
└──────────────────────────────────────────────────┘
```

## Components

### DiscoverPage
- Route: `/discover`
- Search bar at top
- Filter chips below search
- Recipe grid (responsive)
- Load More pagination
- Empty state for no recipes

### Recipe Cards
- Image (with placeholder pattern)
- Title
- Time (prep + cook)
- Servings
- Author/chef name

### Filters
| Filter | Implementation |
|--------|----------------|
| Category | Firestore `where('category', '==', value)` |
| Quick (<30m) | Client filter on `prepTime + cookTime` |
| Search | Client filter on title/description (V1) |

## Data Flow

### New Function
```typescript
// recipeSync.ts
export const getPublicRecipes = async (options: {
  search?: string;
  category?: string;
  maxTime?: number;
  limit?: number;
  startAfter?: DocumentSnapshot;
}) => {
  // Query publicRecipes collection with filters
  // Return paginated results
}
```

### Search Strategy
- **V1:** Client-side filtering on fetched recipes
- **Future:** Firestore composite indexes or Algolia for scale

## Error Handling

| Scenario | Handling |
|----------|----------|
| No public recipes | Friendly empty state: "No recipes yet. Be the first to share!" |
| Network error | Show retry button with error message |
| Recipe deleted | PublicRecipePage already handles this |
| Slow loading | Show skeleton cards while loading |
| Too many results | Pagination prevents this (20 per page) |

## Testing Strategy

### Manual Testing
- [ ] Browse with 0 public recipes (empty state)
- [ ] Browse with many recipes (pagination works)
- [ ] Search finds matching recipes
- [ ] Filters narrow results correctly
- [ ] Click through to recipe detail
- [ ] Save recipe to collection works

### Edge Cases
- [ ] Search with special characters
- [ ] Very long recipe titles display correctly
- [ ] Mobile responsive layout

## Navigation Integration
Add "Discover" link to main navigation alongside:
- My Recipes
- Meal Plan
- Shopping List
- Collections
- **Discover** (new)

## Future Enhancements (Post V1)
- Sorting (newest, most saved, trending)
- Cuisine filters
- Ingredient-based search
- Personalized recommendations
- Following chefs
- Recipe ratings/reviews

## Questions Resolved
- Q: What problem does this solve?
  A: Finding new recipe inspiration from community-shared recipes
- Q: Who is this for?
  A: Home cooks seeking inspiration
- Q: What's success?
  A: More recipes saved + more recipes shared publicly
- Q: What's out of scope?
  A: AI recommendations, social features, external import
