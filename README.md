# Mise - Recipe Manager

A recipe management app with meal planning, shopping lists, and cooking mode.

## Features

- Recipe management (create, edit, import)
- AI-powered recipe import
- Google Keep recipe import
- Meal planning with drag-and-drop
- Shopping list generation organized by category
- Cooking mode with step-by-step instructions
- Timer management for cooking steps
- Servings adjustment with automatic ingredient scaling
- Unit conversion (metric/imperial)
- Multi-language support (English, Hebrew with RTL)
- Cloud sync with Firebase

## Development

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build

```bash
npm run build
npm run preview
```

## Environment Variables

Copy `.env.example` to `.env` and fill in Firebase credentials:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Tech Stack

- React 19
- TypeScript
- Vite
- Zustand (state management)
- Firebase (auth, Firestore, storage)
- styled-components
- i18next (internationalization)
- @dnd-kit (drag and drop)
