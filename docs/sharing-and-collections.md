# Recipe Sharing and Collections

This document describes how recipe sharing and collections work in Mise, including visibility settings and access control.

## Visibility Levels

Mise uses a three-tier visibility system for both recipes and collections:

| Level | Accessible via Link | Discoverable in Search | Description |
|-------|---------------------|------------------------|-------------|
| **Private** | No | No | Only you can see this recipe |
| **Unlisted** | Yes | No | Anyone with the link can view, but not discoverable |
| **Public** | Yes | Yes | Anyone can view and find via search |

### Private

- Default state for all new recipes and collections
- Only the owner can view
- Not shareable - no share link is generated
- Stored only in the user's personal Firestore collection

### Unlisted (Link-Only)

- Anyone with the direct link can view
- Does not appear in public search or browsing
- Perfect for sharing with specific people without making content fully public
- Share URL format: `/recipe/{recipeId}` or `/u/{collectionId}`

### Public

- Anyone can view via direct link
- Appears in public search and discovery features
- Indexed for public browsing
- Same URL format as unlisted

## Recipe Sharing

### How to Share a Recipe

1. Open the recipe you want to share
2. Click the share button to open the Share Recipe modal
3. Select your desired visibility level:
   - **Private**: Only you (no share link)
   - **Unlisted**: Link-only access
   - **Public**: Discoverable + link access
4. Copy the generated share link (available for unlisted/public)

### Share Statistics

When you share a recipe, the system tracks:
- **Views**: Number of times the share link was accessed
- **Copies**: Number of times someone added the recipe to their collection

Statistics appear in the Share Recipe modal once you have views or copies.

### Making a Recipe Private Again

When you change a shared recipe back to private:
- The share link stops working immediately
- Visitors see a "recipe no longer shared" message
- If the recipe is in public collections, you'll see a warning dialog listing affected collections

### Data Model

Recipes include these sharing-related fields:

```typescript
interface Recipe {
  shareId?: string;          // Unique 8-character URL-safe ID
  visibility?: Visibility;   // 'public' | 'unlisted' | 'private'
  sharedAt?: number;         // Timestamp when sharing was enabled
  shareStats?: {
    views: number;
    copies: number;
  };
}
```

## Collections

Collections are curated groups of recipes that can be shared together.

### Creating a Collection

1. Navigate to your collections page
2. Create a new collection with a name and optional description
3. Add recipes to the collection
4. Optionally set a cover image and chef avatar

### Collection Visibility

Collections use the same three-tier visibility system as recipes:

| Visibility | Who Can View | Share URL |
|------------|--------------|-----------|
| Private | Only owner | None |
| Unlisted | Anyone with link | `/u/{collectionId}` |
| Public | Anyone (discoverable) | `/u/{collectionId}` |

### Collection Statistics

Collections track:
- **Views**: Number of times the collection page was accessed
- **Recipes Copied**: Total count of recipes copied from this collection

## Visibility Sync Between Recipes and Collections

### Adding Recipes to Collections

When you add a recipe to an accessible (public/unlisted) collection:
- If the recipe is private, it automatically inherits the collection's visibility
- If the recipe is already accessible, it keeps its current visibility

**Example scenarios:**
| Recipe Visibility | Collection Visibility | Result |
|-------------------|----------------------|--------|
| Private | Private | No change |
| Private | Unlisted | Recipe becomes unlisted |
| Private | Public | Recipe becomes public |
| Public | Private | Recipe stays public |

### Making a Collection Public

When you make a collection public that contains private recipes:
1. A dialog appears listing all private recipes
2. You can choose to:
   - **Keep Private**: Cancel the operation
   - **Publish All**: Make all recipes match the collection visibility

### What Visitors See

When someone views your public/unlisted collection:
- They only see recipes that are accessible (public or unlisted)
- Private recipes in the collection are hidden from visitors
- The owner always sees all recipes in their collection

## Access Control Summary

### Recipe Access

| Viewer | Private | Unlisted | Public |
|--------|---------|----------|--------|
| Owner | Yes | Yes | Yes |
| With link | No | Yes | Yes |
| Via search | No | No | Yes |

### Collection Access

| Viewer | Private | Unlisted | Public |
|--------|---------|----------|--------|
| Owner | Yes | Yes | Yes |
| With link | No | Yes | Yes |
| Via search | No | No | Yes |

## Database Structure

### User-Scoped Data

```
users/{userId}/recipes/{recipeId}
  - Full recipe document
  - Only owner can read/write directly
```

### Global Indexes

```
publicRecipes/{recipeId}
  - Contains: recipeId, ownerId, title, image, updatedAt
  - Used for public search/discovery

accessibleRecipes/{recipeId}
  - Contains: recipeId, ownerId, visibility, updatedAt
  - Used for link access verification

collections/{collectionId}
  - Full collection document
  - Direct access for public/unlisted collections
```

## URL Formats

| Content Type | URL Format | Example |
|--------------|------------|---------|
| Shared Recipe | `/recipe/{recipeId}` | `/recipe/abc123xy` |
| Shared Collection | `/u/{collectionId}` | `/u/chef-favs` |

## Error States

| Scenario | User Experience |
|----------|-----------------|
| Recipe doesn't exist | "Recipe not found" page |
| Recipe made private | "This recipe is no longer shared" |
| Collection doesn't exist | 404 page |
| Collection made private | 404 page (for non-owners) |

## Privacy Considerations

- All new content defaults to private
- Private recipes are never indexed or accessible via link
- Making content private immediately revokes access
- Statistics are only visible to the recipe/collection owner
- Visitors cannot see which recipes in a collection are hidden from them
