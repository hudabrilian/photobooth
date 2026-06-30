# SnapBooth — Architecture & Codebase Guide

## Overview

SnapBooth is a **kiosk-style photobooth application** for events. Users pay (simulated QRIS), select a template, take photos via camera, apply filters, fill in contact details, and receive a printed receipt-style photo strip with a QR code for digital download.

**Stack:** React 19 + Express 5 + SQLite (better-sqlite3) + Vite 6

---

## Project Structure

```
snapbooth/
├── index.html                  # SPA entry HTML
├── package.json                # Dependencies & scripts
├── tsconfig.json               # Client TS config
├── tsconfig.server.json        # Server TS config
├── vite.config.ts              # Vite bundler + dev proxy
├── eslint.config.js            # ESLint flat config
├── vitest.config.ts            # Test runner config
│
├── public/
│   └── assets/
│       ├── logo.png            # SnapBooth logo (idle screen)
│       ├── 1.png               # Frame overlay for template "frame1"
│       └── 2.png               # Frame overlay for template "frame2"
│
├── src/
│   ├── client/                 # Frontend (React SPA)
│   │   ├── main.tsx            # Entry: StrictMode + AppProvider + ErrorBoundary + frame preload
│   │   ├── App.tsx             # Root component: screen router + global timer + dev shortcut guard
│   │   ├── vite-env.d.ts       # Vite type declarations
│   │   │
│   │   ├── types/
│   │   │   └── index.ts        # AppState, AppAction, Screen, UserData, constants
│   │   │
│   │   ├── context/
│   │   │   └── AppStateContext.tsx   # Single Context + useReducer state manager
│   │   │
│   │   ├── api/
│   │   │   └── photobooth.ts   # HTTP client: POST /api/save-photo
│   │   │
│   │   ├── hooks/
│   │   │   ├── useCamera.ts    # getUserMedia lifecycle (start/stop/error)
│   │   │   └── useTimer.ts     # Session countdown timer (5 min)
│   │   │
│   │   ├── utils/
│   │   │   ├── canvas.ts       # Image capture, composition, rendering, preloading
│   │   │   ├── templates.ts    # Slot coordinates for each template
│   │   │   ├── filters.ts      # CSS-based image filters via OffscreenCanvas
│   │   │   ├── assets.ts       # In-memory image cache
│   │   │   └── testData.ts     # Colored test images for development
│   │   │
│   │   ├── screens/            # One component per screen (7 total)
│   │   │   ├── IdleScreen.tsx      # Attract loop — tap to start
│   │   │   ├── PaymentScreen.tsx   # Mock QRIS payment (Rp 25,000)
│   │   │   ├── TemplateScreen.tsx  # Pick template (Receipt Style 1 or 2)
│   │   │   ├── CaptureScreen.tsx   # Live camera + 3-2-1 countdown + shutter
│   │   │   ├── FilterScreen.tsx    # Apply CSS filters to composed photo
│   │   │   ├── FormScreen.tsx      # Name/WA/Email form + virtual keyboard
│   │   │   └── PrintScreen.tsx     # QR code + preview + auto-return timer
│   │   │
│   │   ├── components/
│   │   │   ├── ScreenHeader.tsx    # Back button + title + step indicator
│   │   │   └── ErrorBoundary.tsx   # React error boundary class component
│   │   │
│   │   └── styles/
│   │       └── globals.css     # Monochrome Courier design system (367 lines)
│   │
│   └── server/                 # Backend (Express 5)
│       ├── index.ts            # Server entry — listen on env.PORT
│       ├── app.ts              # Express app: helmet, cors, compression, rate-limit, body parser, routes, static
│       │
│       ├── config/
│       │   └── env.ts          # Centralized env vars with dotenv + Zod validation
│       │
│       ├── types/
│       │   ├── index.ts        # UserData, SavePhotoRequest/Response, DB records
│       │   └── gifencoder.d.ts # Ambient type declarations for gifencoder
│       │
│       ├── routes/
│       │   ├── photo.ts        # POST /api/save-photo, GET /api/sessions/:id, GET /api/photos
│       │   └── health.ts       # GET /api/health
│       │
│       ├── controllers/
│       │   └── photoController.ts  # Request parsing → service calls → response
│       │
│       ├── services/
│       │   ├── photoService.ts # Core logic: save images, generate GIF, create session
│       │   ├── printService.ts # Print abstraction: BLE exe or USB thermal printer
│       │   └── cleanup.ts      # Orphaned file deletion for expired sessions
│       │
│       ├── validation/
│       │   └── photoSchema.ts  # Zod schemas for request validation
│       │
│       ├── utils/
│       │   ├── logger.ts       # Pino logger
│       │   └── image.ts        # Magic-byte JPEG validation
│       │
│       ├── db/
│       │   └── index.ts        # Singleton better-sqlite3 (WAL mode, auto-migrate)
│       │
│       └── views/
│           └── view.html       # Server-rendered HTML for /view/:sessionId (440 lines)
│
├── prints/                     # Runtime output: composed_*.jpg, gif_*.gif, photo_*.jpg
├── data/                       # SQLite database (snapbooth.db)
├── dist/                       # Vite build output
│
└── docs/
    ├── PLAN.md                 # Improvement plan (5 phases)
    └── ARCHITECTURE.md         # This file
```

---

## Screen Flow

```
Idle ──tap──▶ Payment ──simulate──▶ Template ──select──▶ Capture ──done──▶ Filter
                                                                             │
                                    Print ◀── submit ── Form ◀──────────────┘
```

State machine managed by `state.screen` in `AppStateContext`, mapped to components via `SCREENS` object in `App.tsx`.

---

## Key Data Flow

### Photo Capture → Save

```
Camera (getUserMedia)
    │
    ▼
captureFrame() → ImageData          # Mirror-flipped snapshot
    │
    ▼
capturedImages (useRef<ImageData[]>)  # Stored in mutable ref (not reactive)
    │
    ▼ (optional)
applyFilter() → filteredImages       # OffscreenCanvas CSS filter compositing
    │
    ▼
renderComposedPhoto() → <canvas>    # Composite photos onto template + frame overlay
    │
    ▼
canvas.toDataURL('image/jpeg')      # base64 JPG
    │
    ▼
POST /api/save-photo                # Send to Express
    │
    ▼
createSession():
  1. saveBase64Image() → prints/composed_{uuid8}.jpg
  2. saveBase64Image() for each → prints/photo_{uuid8}_{n}.jpg
  3. generateGif() → prints/gif_{uuid8}.gif
  4. INSERT INTO sessions (SQLite)
    │
    ▼
Response: { session_id, expires_at }
    │
    ▼
PrintScreen: QRCodeSVG(qr_url)      # /view/:sessionId
```

---

## Database Schema

### `sessions` table
| Column | Type | Description |
|---|---|---|
| session_id | TEXT PK | UUID v4 |
| composed_file | TEXT | Filename in prints/ |
| photos_json | TEXT | JSON array of photo filenames |
| name | TEXT? | User name |
| wa | TEXT? | WhatsApp number |
| email | TEXT? | Email address |
| template | TEXT? | Template ID (frame1/frame2) |
| filter_text | TEXT? | Filter ID applied |
| expires_at | TEXT | ISO 8601, 3 days from creation |
| created_at | TEXT | Default: datetime('now') |

### `photos` table (legacy)
| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| filename | TEXT | Saved filename |
| name | TEXT? | User name |
| wa | TEXT? | WhatsApp number |
| email | TEXT? | Email address |
| template | TEXT? | Template ID |
| filter | TEXT? | Filter ID |
| created_at | TEXT | Default: datetime('now') |

---

## Templates & Canvas Dimensions

| Template | Canvas (W×H) | Photo Count | Slot Positions |
|---|---|---|---|
| `frame1` | 600 × 1800 | 3 | y=100, 500, 940 |
| `frame2` | 600 × 1800 | 3 | y=270, 738, 1206 |

Each slot is 510×396 px, centered horizontally (x=45). Frame overlays from `public/assets/{id}.png` are drawn on top.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/save-photo` | Save composed photo + session |
| GET | `/api/sessions/:sessionId` | Get session data (composed_url, gif_url, photos) |
| GET | `/api/photos` | List all saved photos (legacy) |
| GET | `/api/health` | Health check (DB status, uptime, memory, print file count) |
| GET | `/view/:sessionId` | Static HTML photo viewer page |
| GET | `/prints/*` | Static file server for prints/ |

---

## State Management (Client)

Single `useReducer` pattern via React Context:

- **State:** `AppState` — screen, template, filter, count, timer, sessionId
- **Actions:** `SET_SCREEN`, `SELECT_TEMPLATE`, `SET_FILTER`, `INCREMENT_CAPTURED`, `TICK_TIMER`, `RESET`, etc.
- **Mutable Refs:** `capturedImages` and `filteredImages` hold raw `ImageData` outside React state (avoid serialization overhead of large pixel arrays)

---

## Scheduled Cleanup

Runs on startup and every 1 hour via `setInterval`:

1. **`cleanupExpiredSessions()`** — `DELETE FROM sessions WHERE expires_at < datetime('now')`
2. **`cleanupOrphanedFiles()`** — scans `prints/` directory, deletes files not referenced by any active session or photos table

---

## Logging

All server-side logging uses **Pino** (structured JSON). Level controlled via `LOG_LEVEL` env var (default `debug` in dev, `info` in prod).

Previous `console.*` calls are fully replaced with `logger.info`, `logger.error`, `logger.warn`, `logger.debug`.

---

## Print Service

Two backends for physical printing, configured via `PrintConfig.type`:

| Mode | Method | Description |
|---|---|---|
| `exe` | `child_process.exec` | Calls `CatPrinterBLE.exe` (Windows BLE printer) |
| `usb` | `node-thermal-printer` | Epson-compatible thermal printer over USB |

---

## Key Dev Commands

```bash
npm run dev          # Start client + server concurrently
npm run dev:client   # Vite dev server (port 5173)
npm run dev:server   # tsx watch (port 3000)
npm run build        # Vite production build
npm run start        # Build + run server
npm run typecheck    # tsc --noEmit for client + server
npm run lint         # ESLint check
npm run test         # Vitest
npm run test:watch   # Vitest watch mode
```

---

## Dev Shortcuts

| Shortcut | Screen | Action |
|---|---|---|
| `Ctrl+Shift+F` | Any (dev mode only) | Injects 3 test images, jumps to filter screen |
| Logo 4× tap | Idle screen | Same as above (no guard) |

---

## Path Aliases

| Alias | Resolves to |
|---|---|
| `@client/*` | `src/client/*` |
| `@server/*` | `src/server/*` |
| `@shared/*` | `src/shared/*` |

---

## Known Architecture Notes

- **No router library:** Screen transitions use a simple `SCREENS` lookup object instead of React Router.
- **OffscreenCanvas heavy:** All image processing (capture, filter, compose) uses `OffscreenCanvas` to avoid blocking the main thread.
- **Single Context:** All app state lives in one `AppStateContext` via `useReducer` — scales fine for 7 screens but not modular.
- **Vite proxy:** In dev, Vite proxies `/api` to `localhost:3000`. In production, Express serves the built `dist/` directory.
- **Session expiry:** 3-day TTL, cleaned up by scheduler every hour. Corresponding files in `prints/` are also cleaned.
- **Pino logging:** All server console.* replaced with structured JSON logger.
- **Health endpoint:** `GET /api/health` exposes uptime, DB status, memory for monitoring.
- **Paths:** All `__dirname`-based paths replaced with `process.cwd()` constants from `env.ts` (`PROJECT_ROOT`, `PRINTS_DIR`, `DATA_DIR`).
