# Recipe Sharing Design

## Purpose
Allow users to share recipes via public links. Anyone with the link can view and cook with the recipe. Logged-in users can add shared recipes to their own collection.

## Users
- Recipe owners who want to share their recipes
- Anyone who receives a share link (guests can view, members can save)
- Social platform crawlers (for rich previews)

## Success Criteria
- [ ] Users can generate and copy shareable links easily
- [ ] Links show rich previews with image/title on WhatsApp, Facebook, LinkedIn
- [ ] Viewers can sign up and add shared recipes to their accounts
- [ ] Copy count is tracked per recipe

## Constraints
- Must use existing Firebase infrastructure
- App runs on Cloud Run (currently static serving)

## Out of Scope
- Comments/ratings on shared recipes
- Collaborative editing
- Public recipe discovery/search
- Recipe collections/folders sharing

## Approach Chosen
**Express layer on Cloud Run**: Add lightweight Express server that intercepts share routes, fetches recipe from Firestore, injects Open Graph meta tags, and serves the SPA.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloud Run Container                      │
├─────────────────────────────────────────────────────────────┤
│  Express Server                                              │
│  ┌─────────────────┐     ┌─────────────────────────────┐    │
│  │ /recipe/:shareId├────>│ Fetch from Firestore        │    │
│  │ (crawler check) │     │ Inject OG tags              │    │
│  └────────┬────────┘     └──────────────┬──────────────┘    │
│           │                              │                   │
│           v                              v                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Data Model Changes

```typescript
interface Recipe {
  // ... existing fields
  shareId?: string;      // Unique ID for public URL (8 chars, URL-safe)
  isPublic?: boolean;    // Whether share link is active
  sharedAt?: Timestamp;  // When sharing was enabled
  shareStats?: {
    views: number;       // Link views
    copies: number;      // "Add to my recipes" count
  };
}
```

### 2. Share UI Component

Location: Recipe detail page or recipe menu

```
┌─────────────────────────────────────────┐
│  Share Recipe                           │
├─────────────────────────────────────────┤
│  ○ Private (only you)                   │
│  ● Public (anyone with link)            │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ https://mise.app/recipe/abc123xy   ││
│  └─────────────────────────────────────┘│
│            [Copy Link]                  │
└─────────────────────────────────────────┘
```

### 3. Public Recipe Page

Route: `/recipe/:shareId`
- Read-only view of recipe
- Uses existing recipe display components
- Shows "Add to My Recipes" button for logged-in users
- Shows "Sign up to save" prompt for guests

### 4. Express Server

New file: `server.ts` (~50 lines)
- Intercepts `/recipe/:shareId` requests
- Detects crawler User-Agents
- Fetches recipe from Firestore (admin SDK)
- Injects OG meta tags into index.html
- Falls through to static serving for all other routes

## Data Flow

### Flow 1: Generating a Share Link
```
User clicks "Share" →
  Generate unique shareId (if none) →
    Set isPublic: true →
      Save to Firestore →
        Show copyable link
```

### Flow 2: Viewing a Shared Recipe (Social Crawler)
```
WhatsApp requests /recipe/abc123 →
  Express detects crawler User-Agent →
    Fetch recipe from Firestore →
      Inject OG meta tags (title, description, image) →
        Return modified HTML →
          Crawler shows preview
```

### Flow 3: Viewing a Shared Recipe (User)
```
User opens /recipe/abc123 →
  Express serves SPA HTML (with or without OG tags) →
    React app hydrates →
      Fetch recipe by shareId (client-side) →
        Show public recipe view →
          Increment view count
```

### Flow 4: Adding to My Recipes
```
Logged-in user clicks "Add to My Recipes" →
  Clone recipe data (excluding owner-specific fields) →
    Add as new recipe in user's collection →
      Increment original's copies count →
        Navigate to user's copy
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| Share link for deleted recipe | Show "Recipe not found" page |
| Share link for now-private recipe | Show "This recipe is no longer shared" |
| Firestore fetch fails (server-side) | Serve HTML without OG tags, let client handle |
| User tries to copy own recipe | Show "This is already your recipe" |
| Image URL expired/broken | Use placeholder image in OG tags |

### Firestore Security Rules Update

```javascript
match /recipes/{recipeId} {
  allow read: if resource.data.isPublic == true
              || request.auth.uid == resource.data.userId;
}
```

## Testing Strategy

### Unit Tests
- `generateShareId()`: Produces unique, URL-safe 8-char IDs
- OG tag injection: Correct meta tags for recipe data
- Recipe cloning: All fields copied except owner-specific ones

### Integration Tests
- Share toggle updates Firestore correctly
- Public recipe route fetches by `shareId`
- Copy action creates new recipe in user's collection
- Firestore rules allow public read, block unauthorized write

### Manual Testing
- Copy link to WhatsApp/Facebook → verify preview shows
- Open share link in incognito → see recipe without auth
- Open share link while logged in → "Add to My Recipes" works
- Disable sharing → link returns "no longer shared"

### Crawler Testing Tools
- Facebook Sharing Debugger
- Twitter Card Validator
- LinkedIn Post Inspector
- WhatsApp: paste link in chat

## Questions Resolved
- Q: Who controls whether a recipe is shareable?
  A: Recipe owner - default private, generates link when needed
- Q: What about social previews?
  A: Express layer injects OG tags for crawlers
- Q: Track usage?
  A: Yes - view count and copy count per recipe
- Q: Deployment constraint?
  A: Must use Firebase, app runs on Cloud Run (currently static)

## Implementation Notes
- Need to add Firebase Admin SDK to server for Firestore access
- Share ID generation: use nanoid or similar for URL-safe random strings
- Consider caching recipe data briefly to reduce Firestore reads from crawlers
