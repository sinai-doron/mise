# Production Deployment Plan for Mise Recipe Manager

## Overview

This plan migrates the Mise Recipe Manager to production with your existing Firebase production project, manual Cloud Run deployment to a separate GCP project, and proper security configuration.

**Current State:**
- React 19 SPA + Express.js backend for OG tags
- Firebase: Auth (Google), Firestore, Storage
- Docker containerization for Cloud Run
- Security audit completed (February 2026) - see Phase 1A below

**Your Setup:**
- Production Firebase project: Already created
- Deployment: Manual to Cloud Run
- GCP Project: Separate from Firebase project

---

## Phase 1: Security Fixes (Critical - Do First) - COMPLETED

> **Status:** Completed in Security Audit (February 2026)

### Step 1.1: Remove .env from Git Tracking - DONE

The `.env` file has been removed from git tracking:
```bash
git rm --cached .env
```

### Step 1.2: Update .gitignore - DONE

The `.gitignore` file now includes:
```
# Environment files
.env
.env.local
.env.production
.env.*.local

# Firebase
*-firebase-adminsdk-*.json
service-account*.json
firestore-debug.log
firebase-debug.log
```

### Step 1.3: Rotate API Keys (Recommended)

Since the `.env` was previously in git history, consider rotating:
1. Go to Firebase Console > Project Settings > API Keys
2. Generate new API key
3. Update `.env` with new key
4. Restrict old key or delete it

### Step 1.4: Create Environment File Templates

**Create `.env.development.example`:**
```bash
# Development Firebase Configuration
VITE_FIREBASE_API_KEY=your_dev_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-dev-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-dev-project
VITE_FIREBASE_STORAGE_BUCKET=your-dev-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ENVIRONMENT=development
```

**Create `.env.production.example`:**
```bash
# Production Firebase Configuration
VITE_FIREBASE_API_KEY=your_prod_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-prod-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-prod-project
VITE_FIREBASE_STORAGE_BUCKET=your-prod-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-YYYYYYYYYY
VITE_ENVIRONMENT=production
```

---

## Phase 1A: Security Audit Implementation - COMPLETED

> **Status:** Completed February 2026

The following security improvements were implemented as part of a comprehensive security audit:

### 1A.1: Firestore & Storage Security Rules - DONE

Security rules files have been created:
- `firestore.rules` - Comprehensive user-scoped data protection
- `storage.rules` - Avatar and recipe image upload restrictions

**Deploy to production:**
```bash
firebase login
firebase deploy --only firestore:rules,storage:rules --project <your-prod-project-id>
```

### 1A.2: Query Optimizations - DONE

| Fix | File | Description |
|-----|------|-------------|
| Collection subscription | `collectionSync.ts` | Uses `where('ownerId', '==', userId)` instead of fetching all |
| Owner validation | `collectionSync.ts` | Verifies ownership before update/delete operations |
| Batch writes | `firestore.ts` | Uses `writeBatch` instead of `Promise.all` for transaction safety |
| N+1 query fix | `collectionSync.ts` | Uses Firestore `in` queries (30 per batch) |
| Default limit | `firestore.ts` | Added 1000 document limit as safety net |

### 1A.3: Stats Inflation Prevention - DONE

Session-based deduplication prevents repeated view/copy counting:
- `collectionSync.ts`: `viewedCollectionsInSession`, `copiedCollectionsInSession`
- `recipeSync.ts`: `viewedRecipesInSession`, `copiedRecipesInSession`

### 1A.4: XSS Prevention - DONE

Installed DOMPurify for sanitizing user-generated content:
```bash
npm install dompurify
npm install -D @types/dompurify
```

Created `src/utils/sanitize.ts` with:
- `sanitize()` - Strips all HTML (for plain text fields)
- `sanitizeHtml()` - Allows basic formatting (b, i, em, strong, br)
- `sanitizeUrl()` - Validates and sanitizes URLs

Applied in:
- `PublicRecipePage.tsx` - title, description, steps, chefTip
- `RecipeDetail.tsx` - title, description, steps, tips, chefTip

### 1A.5: Backend Proxy for External URLs - DONE

Replaced public CORS proxies with backend proxy endpoint in `server.ts`:

```typescript
// /api/proxy?url=<encoded-url>
// - Validates URL (blocks internal networks)
// - 10 second timeout
// - Falls back to public proxies if backend unavailable
```

Updated clients to use backend proxy first:
- `src/utils/imageExtractor.ts`
- `src/components/recipes/AIRecipeImport.tsx`

### 1A.6: Memory Leak Prevention - DONE

Added subscription cleanup in `recipeStore.ts`:
- `_unsubscribers` array tracks all Firestore subscriptions
- `cleanupSubscriptions()` method for cleanup on sign-out
- `initializeFirebaseSync()` cleans up existing subscriptions before creating new ones

**Usage in auth handler:**
```typescript
// On sign-out
useRecipeStore.getState().cleanupSubscriptions();
```

---

## Phase 2: Configure Production Firebase Project

### Step 2.1: Get Production Firebase Config

1. Go to Firebase Console > Your production project
2. Project Settings > Your apps > Web app
3. Copy the `firebaseConfig` values

### Step 2.2: Create Local Production Environment File

**Create `.env.production`** (this file stays local, never committed):

```bash
VITE_FIREBASE_API_KEY=<your-prod-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-prod-project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<your-prod-project>
VITE_FIREBASE_STORAGE_BUCKET=<your-prod-project>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
VITE_FIREBASE_APP_ID=<your-app-id>
VITE_FIREBASE_MEASUREMENT_ID=<your-measurement-id>
VITE_ENVIRONMENT=production
```

### Step 2.3: Configure Google Authentication

1. Go to Firebase Console > Authentication > Sign-in method
2. Verify "Google" provider is enabled
3. Go to Settings > Authorized domains
4. Note: You'll add the Cloud Run URL here after deployment

---

## Phase 3: Firestore Security Rules - COMPLETED

> **Status:** Rules files created in Security Audit. Deploy to production using Step 3.3.

### Step 3.1: Create Firestore Security Rules File - DONE

The `firestore.rules` file has been created with the following content:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isDocOwner() {
      return isAuthenticated() && resource.data.ownerId == request.auth.uid;
    }

    function isAccessible() {
      return resource.data.visibility in ['public', 'unlisted'] ||
             resource.data.isPublic == true;
    }

    // ========== USER-SCOPED DATA ==========
    // Only owner can access their data

    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /recipes/{recipeId} {
        // Owner has full access
        allow read, write: if isOwner(userId);
        // Anyone can read accessible (public/unlisted) recipes
        allow read: if isAccessible();
      }

      match /groceryList/{itemId} {
        allow read, write: if isOwner(userId);
      }

      match /settings/{settingId} {
        allow read, write: if isOwner(userId);
      }

      match /profile/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /mealPlans/{planId} {
        allow read, write: if isOwner(userId);
      }

      match /collections/{collectionId} {
        allow read, write: if isOwner(userId);
      }
    }

    // ========== GLOBAL COLLECTIONS ==========

    // Public recipes index - for discovery/search
    match /publicRecipes/{recipeId} {
      allow read: if true;
      allow create, update: if isAuthenticated() &&
                              request.resource.data.ownerId == request.auth.uid;
      allow delete: if isAuthenticated() &&
                      resource.data.ownerId == request.auth.uid;
    }

    // Accessible recipes index - for link sharing
    match /accessibleRecipes/{recipeId} {
      allow read: if true;
      allow create, update: if isAuthenticated() &&
                              request.resource.data.ownerId == request.auth.uid;
      allow delete: if isAuthenticated() &&
                      resource.data.ownerId == request.auth.uid;
    }

    // Global collections - shareable recipe groups
    match /collections/{collectionId} {
      allow read: if isDocOwner() || isAccessible();
      allow create: if isAuthenticated() &&
                      request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if isDocOwner();
    }

    // Built-in recipes - global read-only (seeded by admin)
    match /builtInRecipes/{recipeId} {
      allow read: if true;
      allow write: if false;
    }

    // Legacy shared recipes
    match /sharedRecipes/{shareId} {
      allow read: if true;
      allow write: if false;
    }

    // Deny all other paths
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 3.2: Create Storage Security Rules File - DONE

The `storage.rules` file has been created with the following content:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {

    // User avatars - public read, owner write
    match /users/{userId}/avatar {
      allow read: if true;
      allow write: if request.auth != null &&
                     request.auth.uid == userId &&
                     request.resource.size < 2 * 1024 * 1024 &&
                     request.resource.contentType.matches('image/.*');
    }

    // Recipe images - public read, owner write
    match /users/{userId}/recipes/{imageId} {
      allow read: if true;
      allow write: if request.auth != null &&
                     request.auth.uid == userId &&
                     request.resource.size < 10 * 1024 * 1024 &&
                     request.resource.contentType.matches('image/.*');
    }

    // Deny all other paths
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 3.3: Deploy Security Rules to Production Firebase

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project (if not already done)
firebase init firestore --project <your-prod-project-id>
firebase init storage --project <your-prod-project-id>

# When prompted, accept existing firestore.rules and storage.rules files

# Deploy security rules to production
firebase deploy --only firestore:rules --project <your-prod-project-id>
firebase deploy --only storage:rules --project <your-prod-project-id>
```

### Step 3.4: Verify Rules Deployed

1. Go to Firebase Console > Firestore > Rules
2. Verify the rules match what you deployed
3. Go to Storage > Rules and verify as well

---

## Phase 4: Express Server Security Hardening

> **Note:** The server already includes a `/api/proxy` endpoint for secure external URL fetching (added in Security Audit Phase 1A.5).

### Step 4.1: Install Security Dependencies

```bash
cd /Users/doron/workspaces/test-project/mise

npm install helmet cors express-rate-limit express-validator
npm install -D @types/cors
```

### Step 4.2: Update server.ts

**File:** `server.ts`

Replace the entire file with this security-hardened version:

```typescript
import express, { Request, Response, NextFunction } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { param, validationResult } from 'express-validator';

const app = express();
const PORT = process.env.PORT || 8080;
const DIST_DIR = join(process.cwd(), 'dist');

// ============ SECURITY MIDDLEWARE ============

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        "https://*.firebaseio.com",
        "https://*.googleapis.com",
        "https://*.firebaseapp.com",
        "wss://*.firebaseio.com",
      ],
      frameSrc: ["https://*.firebaseapp.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS - allow Cloud Run domain and localhost
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:8080',
    /\.run\.app$/,  // Cloud Run domains
    // Add your custom domain here if you have one:
    // 'https://your-domain.com',
  ],
  credentials: true,
}));

// Rate limiting for API-like routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/recipe/:shareId', limiter);
app.use('/u/:collectionId', limiter);

// ============ FIREBASE INITIALIZATION ============

if (getApps().length === 0) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({
      credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
    });
  } else {
    // Cloud Run provides default credentials
    initializeApp();
  }
}

const db = getFirestore();

// ============ UTILITY FUNCTIONS ============

const CRAWLER_USER_AGENTS = [
  'facebookexternalhit', 'Facebot', 'LinkedInBot', 'Twitterbot',
  'WhatsApp', 'Slackbot', 'TelegramBot', 'Discordbot',
  'Pinterest', 'Googlebot', 'bingbot',
];

function isCrawler(userAgent: string): boolean {
  if (!userAgent) return false;
  return CRAWLER_USER_AGENTS.some((crawler) =>
    userAgent.toLowerCase().includes(crawler.toLowerCase())
  );
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateOgTags(data: {
  title: string;
  description: string;
  image?: string;
  url?: string;
}): string {
  const title = escapeHtml(data.title);
  const description = escapeHtml(data.description).substring(0, 200);
  const image = data.image ? escapeHtml(data.image) : '';
  const url = data.url ? escapeHtml(data.url) : '';

  return `
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:site_name" content="Mise - Recipe Manager" />
    ${url ? `<meta property="og:url" content="${url}" />` : ''}
    ${image ? `<meta property="og:image" content="${image}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    ${image ? `<meta name="twitter:image" content="${image}" />` : ''}
    <meta name="description" content="${description}" />
    <title>${title} | Mise</title>
  `;
}

// Input validators
const validateShareId = param('shareId')
  .isString()
  .isLength({ min: 1, max: 50 })
  .matches(/^[a-zA-Z0-9_-]+$/)
  .withMessage('Invalid share ID');

const validateCollectionId = param('collectionId')
  .isString()
  .isLength({ min: 1, max: 50 })
  .matches(/^[a-zA-Z0-9_-]+$/)
  .withMessage('Invalid collection ID');

// ============ ROUTES ============

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Shared recipe OG tags
app.get('/recipe/:shareId', validateShareId, async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const indexPath = join(DIST_DIR, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    return res.send(html);
  }

  const { shareId } = req.params;

  try {
    // Try accessibleRecipes first
    let ownerId: string | null = null;
    const accessibleDoc = await db.collection('accessibleRecipes').doc(shareId).get();

    if (accessibleDoc.exists) {
      ownerId = accessibleDoc.data()?.ownerId;
    } else {
      // Fallback to publicRecipes
      const publicDoc = await db.collection('publicRecipes').doc(shareId).get();
      if (publicDoc.exists) {
        ownerId = publicDoc.data()?.ownerId;
      }
    }

    if (ownerId) {
      const recipeDoc = await db.collection(`users/${ownerId}/recipes`).doc(shareId).get();

      if (recipeDoc.exists) {
        const recipe = recipeDoc.data();
        if (recipe) {
          const indexPath = join(DIST_DIR, 'index.html');
          let html = readFileSync(indexPath, 'utf-8');

          const ogTags = generateOgTags({
            title: recipe.title,
            description: recipe.description || '',
            image: recipe.image,
            url: `${req.protocol}://${req.get('host')}/recipe/${shareId}`,
          });

          html = html.replace('</head>', `${ogTags}\n  </head>`);
          return res.send(html);
        }
      }
    }

    const indexPath = join(DIST_DIR, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error fetching shared recipe:', error);
    const indexPath = join(DIST_DIR, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    res.send(html);
  }
});

// Collection OG tags
app.get('/u/:collectionId', validateCollectionId, async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const indexPath = join(DIST_DIR, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    return res.send(html);
  }

  const { collectionId } = req.params;

  try {
    const docSnap = await db.collection('collections').doc(collectionId).get();

    if (docSnap.exists) {
      const collection = docSnap.data();
      const isAccessible = collection?.visibility === 'public' ||
                          collection?.visibility === 'unlisted' ||
                          collection?.isPublic === true;

      if (collection && isAccessible) {
        const indexPath = join(DIST_DIR, 'index.html');
        let html = readFileSync(indexPath, 'utf-8');

        const ownerName = collection.ownerName || 'Chef';
        const title = `${collection.name} by ${ownerName}`;
        const description = collection.description ||
                           `${collection.recipeIds?.length || 0} recipes`;

        const ogTags = generateOgTags({
          title,
          description,
          image: collection.coverImage,
          url: `${req.protocol}://${req.get('host')}/u/${collectionId}`,
        });

        html = html.replace('</head>', `${ogTags}\n  </head>`);
        return res.send(html);
      }
    }

    const indexPath = join(DIST_DIR, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error fetching collection:', error);
    const indexPath = join(DIST_DIR, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    res.send(html);
  }
});

// Serve static files with caching
app.use(express.static(DIST_DIR, {
  maxAge: '1d',
  etag: true,
}));

// SPA fallback
app.get('*', (_req, res) => {
  const indexPath = join(DIST_DIR, 'index.html');
  res.sendFile(indexPath);
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 4.3: Rebuild Server

```bash
npm run build:server
```

---

## Phase 5: Cloud Run Deployment (Manual)

### Step 5.1: Set Environment Variables

```bash
# Your Firebase project ID
export FIREBASE_PROJECT_ID="<your-prod-firebase-project>"

# Your separate GCP project for Cloud Run
export GCP_PROJECT_ID="<your-gcp-project>"

export REGION="us-central1"
```

### Step 5.2: Enable Required APIs in GCP Project

```bash
gcloud services enable \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  --project=$GCP_PROJECT_ID
```

### Step 5.3: Create Artifact Registry Repository

```bash
gcloud artifacts repositories create mise \
  --repository-format=docker \
  --location=$REGION \
  --description="Mise Recipe Manager" \
  --project=$GCP_PROJECT_ID
```

### Step 5.4: Create Cloud Run Service Account

```bash
# Create service account in GCP project
gcloud iam service-accounts create mise-cloudrun \
  --display-name="Mise Cloud Run" \
  --project=$GCP_PROJECT_ID

# Grant Firestore read access in the FIREBASE project
gcloud projects add-iam-policy-binding $FIREBASE_PROJECT_ID \
  --member="serviceAccount:mise-cloudrun@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/datastore.viewer"
```

### Step 5.5: Build Production Assets

```bash
cd /Users/doron/workspaces/test-project/mise

# Install dependencies
npm ci

# Build frontend with production Firebase config
npm run build -- --mode production

# Build server
npm run build:server
```

### Step 5.6: Build and Push Docker Image

```bash
# Configure Docker for Artifact Registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Set image tag
export IMAGE="${REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/mise/mise-app:v1"

# Build image
docker build -t $IMAGE .

# Push to registry
docker push $IMAGE
```

### Step 5.7: Deploy to Cloud Run

```bash
gcloud run deploy mise-app \
  --image=$IMAGE \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --service-account=mise-cloudrun@${GCP_PROJECT_ID}.iam.gserviceaccount.com \
  --set-env-vars="NODE_ENV=production" \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --project=$GCP_PROJECT_ID
```

### Step 5.8: Get Cloud Run URL

```bash
gcloud run services describe mise-app \
  --region=$REGION \
  --project=$GCP_PROJECT_ID \
  --format='value(status.url)'

# Output: https://mise-app-xxxxx-uc.a.run.app
```

### Step 5.9: Add Cloud Run URL to Firebase Auth

1. Go to Firebase Console > Your production project
2. Authentication > Settings > Authorized domains
3. Click "Add domain"
4. Add: `mise-app-xxxxx-uc.a.run.app` (your Cloud Run URL without https://)

---

## Phase 6: Verification

### Step 6.1: Health Check

```bash
export CLOUD_RUN_URL="https://mise-app-xxxxx-uc.a.run.app"

curl -s $CLOUD_RUN_URL/health
# Expected: {"status":"healthy"}
```

### Step 6.2: Verify Page Loads

```bash
curl -sI $CLOUD_RUN_URL | head -n 1
# Expected: HTTP/2 200
```

### Step 6.3: Verify Security Headers

```bash
curl -sI $CLOUD_RUN_URL | grep -iE "(x-content-type|x-frame|strict-transport|content-security)"
```

### Step 6.4: Manual Testing Checklist

- [ ] Open Cloud Run URL in browser
- [ ] Click "Sign in with Google"
- [ ] Complete sign-in - verify redirect back works
- [ ] Create a new recipe
- [ ] Refresh page - verify recipe persists
- [ ] Make recipe public
- [ ] Copy share link, open in incognito - verify it works
- [ ] Test OG tags by pasting link in Slack/Twitter/Facebook

### Step 6.5: Test OG Tags

```bash
# Simulate social media crawler
curl -A "facebookexternalhit" $CLOUD_RUN_URL/recipe/<recipe-id> | grep "og:title"
```

---

## Phase 7: Custom Domain (Optional)

### Step 7.1: Map Custom Domain

```bash
export CUSTOM_DOMAIN="your-domain.com"

gcloud run domain-mappings create \
  --service mise-app \
  --domain $CUSTOM_DOMAIN \
  --region $REGION \
  --project $GCP_PROJECT_ID
```

### Step 7.2: Get DNS Records

```bash
gcloud run domain-mappings describe \
  --domain $CUSTOM_DOMAIN \
  --region $REGION \
  --project $GCP_PROJECT_ID
```

### Step 7.3: Configure DNS

Add the CNAME or A records to your domain registrar.

### Step 7.4: Add Custom Domain to Firebase Auth

1. Firebase Console > Authentication > Settings > Authorized domains
2. Add your custom domain

---

## Redeployment Procedure

For future deployments:

```bash
cd /Users/doron/workspaces/test-project/mise

# Build frontend
npm run build -- --mode production

# Build server
npm run build:server

# Build and push new image
export NEW_VERSION="v2"  # increment this
export IMAGE="${REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/mise/mise-app:${NEW_VERSION}"
docker build -t $IMAGE .
docker push $IMAGE

# Deploy new version
gcloud run deploy mise-app \
  --image=$IMAGE \
  --region=$REGION \
  --project=$GCP_PROJECT_ID
```

---

## Rollback Procedure

```bash
# List revisions
gcloud run revisions list --service mise-app --region $REGION --project $GCP_PROJECT_ID

# Route traffic to previous revision
gcloud run services update-traffic mise-app \
  --to-revisions=mise-app-00001-abc=100 \
  --region $REGION \
  --project $GCP_PROJECT_ID
```

---

## Files Modified/Created Summary

| File | Action | Status |
|------|--------|--------|
| `.gitignore` | Edit - add .env exclusions | DONE |
| `.env` | Remove from git tracking | DONE |
| `.env.development.example` | Create | TODO |
| `.env.production.example` | Create | TODO |
| `.env.production` | Create locally (never commit) | TODO |
| `firestore.rules` | Create | DONE |
| `storage.rules` | Create | DONE |
| `server.ts` | Add /api/proxy endpoint | DONE |
| `server.ts` | Add helmet, CORS, rate limiting | TODO |
| `package.json` | Add security dependencies (dompurify) | DONE |
| `src/utils/sanitize.ts` | Create XSS sanitization utilities | DONE |
| `src/firebase/collectionSync.ts` | Fix query patterns, add deduplication | DONE |
| `src/firebase/recipeSync.ts` | Add stats deduplication | DONE |
| `src/firebase/firestore.ts` | Add batch writes, default limits | DONE |
| `src/stores/recipeStore.ts` | Add subscription cleanup | DONE |
| `src/utils/imageExtractor.ts` | Use backend proxy | DONE |
| `src/components/recipes/AIRecipeImport.tsx` | Use backend proxy | DONE |
| `src/pages/PublicRecipePage.tsx` | Add XSS sanitization | DONE |
| `src/components/recipes/RecipeDetail.tsx` | Add XSS sanitization | DONE |

---

## Security Checklist

### Completed in Security Audit
- [x] `.env` removed from git tracking
- [x] `.gitignore` updated with all sensitive patterns
- [x] `firestore.rules` created with comprehensive security
- [x] `storage.rules` created with upload restrictions
- [x] XSS sanitization with DOMPurify
- [x] Backend proxy replaces public CORS proxies
- [x] Query optimizations (batch writes, N+1 fixes)
- [x] Stats inflation prevention (session deduplication)
- [x] Memory leak prevention (subscription cleanup)
- [x] Owner validation on collection mutations

### Deployment Steps Remaining
- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Deploy Storage rules: `firebase deploy --only storage:rules`
- [ ] Rotate Firebase API key (recommended since old .env was in git)
- [ ] Add helmet, CORS, rate limiting to server.ts
- [ ] Deploy to Cloud Run
- [ ] Add Cloud Run URL to Firebase authorized domains
- [ ] Create production environment files
