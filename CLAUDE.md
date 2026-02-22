# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Start Vite dev server (http://localhost:5173)
npm run build         # TypeScript check + Vite build (client)
npm run build:server  # Compile server TypeScript (tsconfig.server.json)
npm start             # Run production server (node dist-server/server.js)
npm run lint          # Run ESLint across the project
npm run preview       # Preview production build locally
```

There are no automated tests configured in this project.

## Architecture

**Mise** is a React + TypeScript recipe management app (package name: "prepd") backed by Firebase, with an Express server for SSR of social sharing metadata.

### Tech Stack
- **React 19** with **TypeScript**, built by **Vite 7**
- **Zustand** for state management
- **styled-components 6** for CSS-in-JS
- **Firebase** (Firestore, Auth, Storage) for backend/sync
- **i18next** for English/Hebrew (RTL) internationalization
- **Express** server for OG tag injection and a CORS proxy

### Key Directories

```
src/
├── App.tsx               # Root with React Router routes (public vs. auth-protected)
├── components/           # UI components grouped by feature: recipes/, shopping/, meal-plan/
├── pages/                # One file per route: RecipesPage, MealPlanPage, ShoppingListPage, etc.
├── stores/               # Zustand stores — recipeStore.ts is the largest/most central (~39KB)
├── firebase/             # Firebase init + one sync module per data type (recipeSync, mealPlanSync, etc.)
├── hooks/                # Custom hooks: useRecipeEngine, useTimerManager, useUnitConversion, etc.
├── utils/                # Pure utilities: unitConversion, keepHtmlParser, sanitize, shareUtils, etc.
├── types/                # Shared TypeScript types: Recipe.ts, MealPlan.ts, UserProfile.ts
├── i18n/                 # i18next setup + locales/en and locales/he
└── services/             # External API clients (openFoodFacts.ts)
server.ts                 # Express server (OG tags, /api/proxy CORS proxy)
```

### Data Flow

1. **Auth** — `firebase/AuthContext.tsx` wraps the app; `firebase/auth.ts` initializes Firebase Auth.
2. **Stores** — Zustand stores hold in-memory state. `recipeStore.ts` is the source of truth for recipes.
3. **Firebase sync** — Each `firebase/*Sync.ts` module subscribes to Firestore and pushes changes into the corresponding store. Sync begins after authentication.
4. **Components/Pages** — Read from stores via hooks; dispatch actions to stores which in turn write to Firestore.

### Server (`server.ts`)

The Express server serves the static Vite build and has two special responsibilities:
- **OG tag injection** — For `/recipe/:shareId` and `/u/:collectionId`, it fetches Firestore data and rewrites `<meta>` tags in `index.html` so social crawlers see recipe/collection metadata.
- **CORS proxy** — `/api/proxy` allows the client to fetch external URLs (e.g., for recipe import) while performing security checks server-side.

### TypeScript Configuration

Three separate `tsconfig` files with project references:
- `tsconfig.app.json` — client (Vite)
- `tsconfig.node.json` — Vite config itself
- `tsconfig.server.json` — Express server

`npm run build` runs `tsc -b` (project references) before Vite bundles.

### Vite Code Splitting

`vite.config.ts` splits output into manual chunks: `vendor`, `firebase`, and `ui` — keep this in mind when adding large new dependencies.

### Environment Variables

Copy `.env.example` to `.env` and fill in Firebase project credentials. The server also reads Firebase Admin credentials from environment variables (see `cloudbuild.yaml` for the full list used in Cloud Run).

### Deployment

Google Cloud Build (`cloudbuild.yaml`) builds a Docker image on push to `main` and deploys to Cloud Run in `us-central1`. Firebase credentials are injected as Docker build args.
