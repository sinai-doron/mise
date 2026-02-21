# YouTube Recipe Import Design

## Purpose
Allow users to import recipes from YouTube cooking videos (including Shorts), with the video embedded in the recipe for reference while cooking.

## Users
- Home cooks who discover recipes on YouTube and want to save them in Mise
- Users who prefer video guidance alongside written instructions

## Success Criteria
- [ ] User can paste a YouTube URL and get a recipe extracted
- [ ] Video is embedded at top of recipe detail view
- [ ] Works with both regular YouTube videos and Shorts
- [ ] Recipe is editable after import (like any other recipe)
- [ ] Graceful fallback when video description lacks recipe details

## Constraints
- YouTube only (no TikTok, Instagram, etc. in v1)
- No API key required (use oEmbed API)
- Client-side only (no backend changes)
- Must work with existing AI import infrastructure

## Out of Scope (v1)
- Timestamp-linked steps (jumping to specific video moments)
- Video downloading/storage (just embed from YouTube)
- Auto-language detection and translation
- Support for non-YouTube platforms

## Approach Chosen
**Option A: Extend Existing AI Import**

Modify the existing `AIRecipeImport` component to:
1. Detect YouTube URLs
2. Fetch video metadata via oEmbed
3. Extract recipe from description via AI
4. Store videoUrl on Recipe for embedding

This reuses existing infrastructure and provides a unified import experience.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  AIRecipeImport Modal                                       │
├─────────────────────────────────────────────────────────────┤
│  Input: URL or Text                                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Paste YouTube URL or recipe text...                     ││
│  └─────────────────────────────────────────────────────────┘│
│                           ↓                                 │
│  [Detect Input Type]                                        │
│     ├── YouTube URL → Fetch metadata + description          │
│     │                 → Extract recipe via AI               │
│     │                 → Store videoUrl on Recipe            │
│     └── Text/Other URL → Existing flow (unchanged)         │
├─────────────────────────────────────────────────────────────┤
│  Recipe Preview (with video thumbnail if YouTube)           │
│  [Edit] [Import]                                            │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Recipe Type Extension
```typescript
// In src/types/Recipe.ts
export interface Recipe {
  // ... existing fields ...
  videoUrl?: string;  // YouTube video URL (for embedding)
}
```

### 2. YouTube Utilities (new file)
```typescript
// src/utils/youtube.ts
- isYouTubeUrl(url: string): boolean
- extractVideoId(url: string): string | null
- getEmbedUrl(videoId: string): string
- fetchVideoMetadata(videoId: string): Promise<{title, description, thumbnail}>
```

### 3. YouTubeEmbed Component (new)
```typescript
// src/components/YouTubeEmbed.tsx
- Responsive iframe embed
- Handles regular videos and Shorts
- Loading state with thumbnail placeholder
```

### 4. Modified AIRecipeImport
- Detect YouTube URL on paste/input
- Fetch video description via oEmbed/noembed
- Pass to AI for recipe extraction
- Store videoUrl in resulting recipe

### 5. Modified RecipeDetail
- Check if recipe has videoUrl
- Render YouTubeEmbed at top if present
- Video replaces or appears above the image

## Data Flow

```
User pastes YouTube URL
        ↓
AIRecipeImport detects YouTube URL
        ↓
Call youtube.ts utilities:
  1. extractVideoId("https://youtube.com/watch?v=xyz") → "xyz"
  2. fetchVideoMetadata("xyz") → {title, description, thumbnail}
        ↓
Send to AI (existing flow):
  - Input: video description + title
  - Prompt: "Extract recipe from this video description..."
  - Output: structured recipe JSON
        ↓
Merge AI result with video data:
  - recipe.videoUrl = original YouTube URL
  - recipe.image = thumbnail (if no better image)
  - recipe.sourceUrl = YouTube URL
        ↓
Show preview → User edits → Save to store
        ↓
RecipeDetail checks videoUrl
  → Renders YouTubeEmbed component at top
```

## Error Handling

| Scenario | How Handled |
|----------|-------------|
| Invalid YouTube URL | Show error: "Couldn't recognize this as a YouTube video URL" |
| Video not found / private | Show error: "Video not available or is private" |
| No recipe in description | Offer manual entry: "Couldn't find recipe details. Enter manually?" |
| AI extraction fails | Fall back to manual form pre-filled with title/thumbnail |
| Embed blocked by creator | Show link instead: "Video can't be embedded. [Open on YouTube]" |
| Network error | Retry option with clear error message |

## Testing Strategy

### Unit Tests
- YouTube URL detection (various formats: watch, shorts, youtu.be, etc.)
- Video ID extraction
- Embed URL generation

### Integration Tests
- Full import flow with mock oEmbed responses
- Recipe creation with videoUrl field
- RecipeDetail rendering with embedded video

### Manual Testing
- Test with various YouTube video formats
- Test with Shorts
- Test with videos that have/don't have recipes in description
- Test embed behavior (play, fullscreen, etc.)

## UI Mockup

### RecipeDetail with Embedded Video

```
┌─────────────────────────────────────────────────────────────┐
│  [←]  Chicken Tikka Masala                    [Edit] [Share]│
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │              ▶  YouTube Video Embed                     ││
│  │                 (16:9 responsive)                       ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  A rich, creamy curry with tender chicken...                │
│                                                             │
│  ⏱ 45 min  |  👥 4 servings  |  ⭐ Medium                   │
├─────────────────────────────────────────────────────────────┤
│  INGREDIENTS                           STEPS                │
│  ──────────────                        ─────                │
│  □ 2 lbs chicken thighs               1. Marinate chicken   │
│  □ 1 cup yogurt                       2. Prepare sauce...   │
│  □ 2 tbsp garam masala                3. Cook together...   │
│  ...                                  ...                   │
└─────────────────────────────────────────────────────────────┘
```

## Questions Resolved

- Q: What's the primary use case?
  A: Import cooking videos as recipes (user pastes URL, AI extracts, video embedded)

- Q: How should video be displayed?
  A: Embedded player at top of recipe detail

- Q: How to extract recipe content?
  A: Hybrid - try description first, AI transcription as fallback, manual editing allowed

- Q: Which video sources?
  A: YouTube only (including Shorts) for v1

- Q: How to fetch metadata?
  A: YouTube oEmbed API (no API key required)

## Future Enhancements (Post-v1)
- Timestamp-linked steps
- TikTok / Instagram Reels support
- Video transcription for better extraction
- Browser extension for quick import
- Picture-in-picture during cooking mode

## Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/types/Recipe.ts` | Modify | Add `videoUrl?: string` field |
| `src/utils/youtube.ts` | Create | YouTube URL parsing and metadata utilities |
| `src/components/YouTubeEmbed.tsx` | Create | Responsive video embed component |
| `src/components/recipes/AIRecipeImport.tsx` | Modify | Add YouTube URL detection and handling |
| `src/components/recipes/RecipeDetail.tsx` | Modify | Render video embed when videoUrl present |
