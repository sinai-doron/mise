# AI-Powered Recipe Import & Translation System

**Date:** 2026-02-03
**Status:** Planned

## Overview

Transform the existing manual AI recipe import (copy/paste to ChatGPT) into an automated backend service supporting:
- **Text import** - Pasted recipe text
- **Image import** - Photos of recipes, cookbook pages, handwritten notes
- **Video import** - YouTube cooking videos
- **Translation** - Between supported languages (EN/HE/AR/FA/UR)

---

## Architecture Decision

**Backend API approach** (extend existing Express server)

| Factor | Why Backend |
|--------|-------------|
| API Key Security | Keys stay on server, never exposed to browser |
| Cost Control | Server-side rate limiting and quotas |
| Video Processing | Can integrate transcription APIs |
| Caching | Cache transcripts and translations |

---

## AI Provider Recommendation

**Primary: Claude API (claude-sonnet-4-20250514)**

- Excellent structured JSON output
- Strong multilingual support (including RTL: Hebrew, Arabic, Farsi, Urdu)
- Native image understanding
- Cost-effective (~$3/1M input tokens)

**For Video: YouTube transcript extraction** (free) with Claude for recipe parsing

---

## Implementation Plan (All Input Types Together)

### Step 1: Backend AI Service

**New files to create:**
```
server/
  ai/
    anthropicClient.ts      # Claude API wrapper with retry logic
    recipePrompts.ts        # Prompts for text/image/video/translation
    youtubeTranscript.ts    # YouTube transcript extraction
  middleware/
    authMiddleware.ts       # Firebase token verification
    rateLimit.ts            # Per-user rate limiting
  routes/
    aiRoutes.ts             # All AI endpoint handlers
```

**Modify:** `server.ts` - Import and mount AI routes

**New API Endpoints:**
```
POST /api/ai/import
Body: {
  type: 'text' | 'image' | 'video',
  content: string,           // text content OR base64 images OR video URL
  images?: string[],         // for multi-image import
  sourceUrl?: string
}
Response: { recipe: Recipe, confidence: number, source: string }

POST /api/ai/translate
Body: { recipe: Recipe, targetLanguage: 'en'|'he'|'ar'|'fa'|'ur' }
Response: { translatedRecipe: Recipe }
```

### Step 2: Frontend - Unified Import Component

**Modify:** `src/components/recipes/AIRecipeImport.tsx`
- Add tab interface: Text | Image | Video
- Remove manual copy/paste workflow
- Call backend API directly
- Show loading/progress states

**New files:**
```
src/components/recipes/
  AIImportTabs.tsx          # Tab container for input types
  ImageDropzone.tsx         # Drag-drop image upload with compression
  VideoUrlInput.tsx         # YouTube URL input with thumbnail preview
  ImportPreview.tsx         # Recipe preview before saving
  TranslateButton.tsx       # One-click translation on recipe detail
```

**New hook:** `src/hooks/useAIImport.ts`
```typescript
const { importRecipe, translateRecipe, isLoading, error } = useAIImport();

// Usage
const recipe = await importRecipe({ type: 'image', images: [base64] });
const translated = await translateRecipe(recipe, 'he');
```

### Step 3: Input Type Handling

**Text Import:**
- Reuse existing prompt from AIRecipeImport.tsx
- Single Claude API call

**Image Import:**
- Client compresses images (max 1920px, 80% quality)
- Send up to 4 images as base64
- Claude vision analyzes and extracts recipe
- Works for: printed recipes, cookbook pages, handwritten notes

**Video Import:**
- Extract YouTube video ID from URL
- Fetch transcript using `youtube-transcript` package
- Send transcript to Claude for recipe extraction
- Show video thumbnail during import

### Step 4: Translation Integration

**Add to RecipeDetail.tsx:**
- "Translate" button in action bar
- Opens language picker modal
- Calls `/api/ai/translate`
- Saves translated recipe as new copy OR updates in place

**Caching:** Store translations in Firestore
```
translations/{recipeId}_{targetLang} -> translated Recipe
```

---

## Cost Estimates

| Operation | Est. Cost |
|-----------|-----------|
| Text import | ~$0.01 |
| Image import (1-4 images) | ~$0.02-0.05 |
| Video import (transcript) | ~$0.02 |
| Translation | ~$0.02 |

---

## Rate Limiting Strategy

```typescript
// Per-user daily limits (stored in Firestore)
interface UserAIQuota {
  dailyImports: number;      // Max 5 per day (free tier)
  dailyTranslations: number; // Max 3 per day (free tier)
  lastReset: Timestamp;
}
```

---

## Security

- API keys in server environment variables only (`ANTHROPIC_API_KEY`)
- Firebase auth token verification on all AI endpoints
- Input sanitization before sending to AI
- URL validation for video/image sources
- Block internal network URLs (localhost, 10.x, 192.168.x)

---

## Dependencies to Add

```bash
npm install @anthropic-ai/sdk youtube-transcript
```

---

## Environment Variables

Add to `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Key Files to Modify

| File | Change |
|------|--------|
| `server.ts` | Add AI routes, auth middleware, body parser for JSON |
| `src/components/recipes/AIRecipeImport.tsx` | Convert to API-based flow with tabs |
| `src/components/recipes/RecipeDetail.tsx` | Add translate button |
| `package.json` | Add Anthropic SDK, youtube-transcript |
| `.env` | Add `ANTHROPIC_API_KEY` |
| `tsconfig.server.json` | Include new server/* files |

---

## Verification Checklist

- [ ] Text import: Paste recipe text → get structured JSON → save to collection
- [ ] Image import: Upload cookbook photo → get recipe with ingredients/steps
- [ ] Video import: Paste YouTube URL → get recipe from transcript
- [ ] Translation: Click translate → select language → get translated recipe
- [ ] Rate limiting: Exceed limit → show friendly message
- [ ] Error handling: Invalid input → show helpful error

---

## Future Enhancements

- **Premium tier** with unlimited imports
- **Batch import** - multiple recipes from one cookbook
- **Voice input** - dictate recipes
- **OCR confidence** - highlight low-confidence extractions for user review
- **Recipe suggestions** - "Did you mean..." for similar existing recipes
