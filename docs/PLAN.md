# SnapBooth — Improvement Plan

## ✅ Phase 1: Foundation (Security & Infrastructure) — COMPLETED

Dependencies installed: `helmet`, `compression`, `express-rate-limit`, `zod`, `dotenv`, `eslint`, `@eslint/js`, `typescript-eslint`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `supertest`, `@types/supertest`, `@types/compression`

### ✅ 1.1 Security Headers
**Files:** `src/server/app.ts`
- Added `helmet()` middleware
- Locked down CORS to `env.CORS_ORIGIN` (default `http://localhost:5173`)

### ✅ 1.2 Rate Limiting
**Files:** `src/server/app.ts`
- Added `express-rate-limit` on `/api` routes: 10 requests/15min per IP

### ✅ 1.3 Body Parser Size Limit
**Files:** `src/server/app.ts`
- Reduced `limit` from `50mb` to `env.MAX_BODY_SIZE` (default `10mb`)

### ✅ 1.4 Environment Variables
**Files:** `src/server/config/env.ts` (new), `src/server/index.ts`
- Created centralized env config with `dotenv` + Zod validation schema
- Validates `PORT`, `CORS_ORIGIN`, `NODE_ENV`, `MAX_BODY_SIZE`, `API_KEY` at startup
- Process exits with clear error message on invalid env

### ✅ 1.5 Compression
**Files:** `src/server/app.ts`
- Added `compression()` middleware for all responses

### ✅ 1.6 Error Boundary (React)
**Files:** `src/client/components/ErrorBoundary.tsx` (new), `src/client/main.tsx`
- Created React class-based Error Boundary with fallback UI (error message + restart button)
- Wrapped `<App />` in `main.tsx`

### ✅ 1.7 Guard Dev Shortcut
**Files:** `src/client/App.tsx`
- Wrapped `Ctrl+Shift+F` handler in `import.meta.env.DEV` check — no-op in production

---

## ✅ Phase 2: Input Validation & Data Integrity — COMPLETED

### ✅ 2.1 Request Validation with Zod
**Files:** `src/server/validation/photoSchema.ts` (new), `src/server/controllers/photoController.ts`
- Zod schema validates `composedBase64` + `photos[]` as base64 data URIs, `userData` fields max lengths, email format
- Controller validates request body with `savePhotoSchema.safeParse()` — returns 400 + field errors on failure
- `SavePhotoInput` type exported for type safety

### ✅ 2.2 Image Payload Validation
**Files:** `src/server/utils/image.ts` (new), `src/server/services/photoService.ts`
- `validateJpeg()` checks decoded buffer starts with JPEG magic bytes `FF D8 FF`
- Enforces max 5MB per image
- `saveBase64Image()` calls validation before writing to disk — throws on invalid

### ✅ 2.3 Sanitize User Data
**Files:** `src/server/services/photoService.ts`
- `sanitizeUserData()` strips HTML tags (`<[^>]*>`), trims whitespace, normalizes WA digits
- Applied in both `createSession()` and legacy `savePhoto()` before DB insert

---

## Phase 3: Testing

### 3.1 Test Infrastructure
**Files:** `vitest.config.ts` (new), `src/client/test-setup.ts` (new)
- Configure vitest with jsdom + React testing library
- Create test setup with cleanup

### 3.2 Unit Tests — Server Logic
**Files:** `src/server/services/__tests__/photoService.test.ts` (new)
- `saveBase64Image` — valid/invalid base64, filename format
- `createSession` — DB insertion, session_id format
- `getSession` — valid/expired/not-found sessions
- `cleanupExpiredSessions` — deletion count

### 3.3 Unit Tests — Client Utils
**Files:** `src/client/utils/__tests__/canvas.test.ts` (new), `src/client/utils/__tests__/filters.test.ts` (new)
- Canvas utils: imageDataToBase64, drawImageDataInRect, preloadFrames
- Filter utils: each filter produces expected pixel transformations

### 3.4 Integration Tests — API
**Files:** `src/server/__tests__/api.test.ts` (new)
- Supertest-based tests for `POST /api/save-photo`, `GET /api/photos`, `GET /api/sessions/:id`
- Test validation errors, success paths, edge cases

### 3.5 Component Tests
**Files:** `src/client/screens/__tests__/*.test.tsx` (new)
- Screen rendering + state transitions for key flows (IdleScreen, PaymentScreen, CaptureScreen)

---

## ✅ Phase 4: Monitoring & Observability — COMPLETED

### ✅ 4.1 Logging — Pino
**Files:** `src/server/utils/logger.ts` (new), all server files
- Pino logger with configurable level via `LOG_LEVEL` env var
- All `console.*` calls across server replaced with `logger.*` (app.ts, index.ts, photoController.ts, photoService.ts, printService.ts, db/index.ts)
- Structured JSON output in production, readable stdout in dev

### ✅ 4.2 Health Check
**Files:** `src/server/routes/health.ts` (new), `src/server/app.ts`
- `GET /api/health` — returns uptime, DB connection status, DB size, print file count, memory usage, Node version, environment
- Mounted at `/api/health` with rate limit protection

### ✅ 4.3 Scheduled Session Cleanup
**Files:** `src/server/services/photoService.ts`, `src/server/index.ts`
- `setInterval` calls `runCleanup()` every 1 hour (both DB + file cleanup)
- Runs immediately on startup before first interval

### ✅ 4.4 File Cleanup — Prints Directory
**Files:** `src/server/services/cleanup.ts` (new)
- `cleanupOrphanedFiles()` scans `prints/`, compares filenames against all referenced files in active sessions + photos table
- Deletes unreferenced `.jpg` files (skips `.gif` without active session match, skips `.gitkeep`)

### ✅ 4.5 Fix Hardcoded Paths
**Files:** `src/server/config/env.ts`, `src/server/services/photoService.ts`, `src/server/app.ts`, `src/server/db/index.ts`, `src/server/services/printService.ts`
- `env.ts` exports `PROJECT_ROOT`, `PRINTS_DIR`, `DATA_DIR` using `process.cwd()`
- All server files use these constants instead of `__dirname`-based path calculations
- View HTML path uses `path.join(PROJECT_ROOT, 'src', 'server', 'views', ...)`

---

## Phase 5: Polish & DX

### 5.1 ESLint Configuration
**Files:** `eslint.config.js` (new), `.vscode/settings.json`
- Flat config with `@eslint/js` + `typescript-eslint`
- Rules: no-unused-vars, no-console (warn), strict equality, consistent return

### 5.2 HTTP Client Improvements
**Files:** `src/client/api/photobooth.ts`
- Add timeout (AbortSignal, 30s)
- Add retry logic (1 retry on network error)
- Add typed error handling, not just `throw Error`

### 5.3 Auth for Admin Endpoint
**Files:** `src/server/controllers/photoController.ts`, `src/server/routes/photo.ts`
- Add simple API key check via header (`X-API-Key`) for `GET /api/photos`
- Key configured via env var

### 5.4 Fix Catch-all Route
**Files:** `src/server/app.ts`
- Express 5 uses `app.get('/{*path}', ...)` which is non-standard
- Verify compatibility or use standard `app.get('*', ...)` for SPA fallback

---

## Execution Order

```
Phase 1 ──────────────────────────────┐ ✅ COMPLETED
  Foundation (Security, Env, DX)       │
                                       ├──▶ Phase 3 ────▶ Phase 5
Phase 2 ──────────────────────────────┘ ✅ COMPLETED  Testing       Polish
  Validation                           │
                                        └── Phase 4 ────┘ ✅ COMPLETED
                                           Observ.
```
