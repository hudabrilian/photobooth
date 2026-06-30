# SnapBooth — Agent Instructions

## Project Overview

Kiosk photobooth app — React 19 + Express 5 + SQLite (better-sqlite3) + Vite 6.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start client + server concurrently |
| `npm run dev:client` | Vite dev server (port 5173) |
| `npm run dev:server` | tsx watch Express (port 3000) |
| `npm run build` | Vite production build |
| `npm run start` | Build + run server |
| `npm run typecheck` | `tsc --noEmit` (client + server) |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run test:watch` | Vitest watch |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `NODE_ENV` | `development` | Environment mode |
| `MAX_BODY_SIZE` | `10mb` | Max request body size |
| `API_KEY` | `""` | API key for admin endpoints |

Create a `.env` file in the project root to override defaults.

## Import Aliases

```
@client/*  → src/client/*
@server/*  → src/server/*
@shared/*  → src/shared/*
```

## Coding Conventions

- TypeScript strict mode — always type props, state, and API responses explicitly
- Use `type` over `interface` for props and union types
- React 19 — use `useCallback`/`useMemo` for stable references, avoid classes
- No React Router; screen routing via `state.screen` + `SCREENS` lookup object
- Image data (`ImageData[]`) stored in `useRef` — never in reactive state (avoids serialization overhead)
- CSS in `globals.css` only — monochrome Courier design system, no CSS-in-JS or Tailwind
- Server uses layered architecture: routes → controllers → services → db
- All Express request handlers explicitly typed with `Request, Response`
- Prefer `OffscreenCanvas` for image processing to avoid blocking the main thread

## Project Structure

```
src/client/          # React SPA
  screens/           # 7 screen components (one per app screen)
  components/        # Reusable UI (ScreenHeader, ErrorBoundary)
  hooks/             # useCamera, useTimer
  utils/             # canvas, templates, filters, assets, testData
  context/           # AppStateContext (useReducer)
  api/               # HTTP client (fetch wrapper)
  types/             # AppState, AppAction, constants
  styles/            # globals.css only

src/server/          # Express backend
  routes/            # photo, health
  controllers/       # photoController
  services/          # photoService, printService, cleanup
  validation/        # Zod schemas
  config/            # env.ts (validated with Zod)
  utils/             # logger (Pino), image (JPEG validation)
  db/                # better-sqlite3 singleton
  types/             # Shared TS types
  views/             # view.html (server-rendered)
```

## Screen Flow

```
idle → payment → template → capture → filter → form → print
```

## Key Behaviors

- Session auto-resets after 5 minutes or 20s idle on print screen
- Photos expire after 3 days (cleaned hourly by scheduler)
- Payment is simulated (not real QRIS)
- Dev shortcut: `Ctrl+Shift+F` in dev mode injects test images
- Logo 4-tap on idle screen enables test mode (no production guard — do not add one unless specified)
- Print service supports `exe` (CatPrinterBLE.exe) and `usb` (node-thermal-printer) modes

## Style Guide

- Monochrome palette (`#000000`, `#ffffff`, `#555555`, `#f4f4f4`)
- Font: `'Courier New', Courier, monospace` throughout
- Square corners — `--radius: 0px`
- No box-shadows, no gradients
- Accessible: large touch targets (min 44px), `touch-action: manipulation`, high contrast

## Security Notes

- CORS locked to `CORS_ORIGIN` env var
- Body limit `10mb`
- Rate limit on `/api` (10 requests/15min per IP)
- API key required for `GET /api/photos`
- Zod validation on all request payloads
- No console.log in production code (use Pino logger)

## Tests

- **Vitest** with jsdom + React Testing Library
- Test files co-located: `__tests__/*.test.ts` next to source
- Unit test all services, utils, and controllers
- Integration tests with supertest for API endpoints
- Component tests for screen rendering and state transitions

## When Making Changes

1. Run `npm run typecheck` after any TypeScript changes
2. Run `npm run lint` to check code style
3. Run `npm run test` to verify tests pass
4. Read neighboring files to understand conventions before adding new code
5. Follow layered server pattern — don't put DB logic in controllers
6. Don't add comments unless the code is non-obvious
