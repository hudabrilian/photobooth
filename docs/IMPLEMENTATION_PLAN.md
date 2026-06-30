# SnapBooth — Implementation Plan

> Fitur-fitur tambahan untuk SnapBooth photobooth app.

---

## 📍 Phase 6: Boomerang / Video Loop (PENDING)

### Description

Tambahkan mode **Boomerang** (video pendek maju-mundur) sebagai alternatif dari foto statis. Pengguna dapat memilih mode "Foto" atau "Boomerang" di awal sesi. Mode boomerang merekam ~15 frame dalam ~2 detik, lalu menghasilkan GIF looping maju-mundur sebagai output utama.

### Files Affected

| File | Change |
|---|---|
| `src/client/types/index.ts` | Tambah `captureMode: 'photo' \| 'boomerang'` ke `AppState`, `SET_CAPTURE_MODE` ke `AppAction`, `capture` ke `Screen` flow |
| `src/client/context/AppStateContext.tsx` | Handle `SET_CAPTURE_MODE`, default `'photo'` |
| `src/client/screens/TemplateScreen.tsx` | Tambah opsi pilih mode (Photo / Boomerang) sebelum template |
| `src/client/screens/CaptureScreen.tsx` | Ganti flow: jika `boomerang`, panggil `captureBoomerangFrames()` tanpa countdown antar frame |
| `src/client/utils/canvas.ts` | Tambah `captureBoomerangFrames(video, count, intervalMs)` → `Promise<ImageData[]>` |
| `src/client/utils/templates.ts` | Opsional: tambah slot khusus boomerang (single large slot) |
| `src/server/services/photoService.ts` | `generateGif()` — ubah delay ke ~150ms, tambah reverse frame untuk efek boomerang |
| `src/client/styles/globals.css` | Styling untuk mode toggle (Photo / Boomerang) |

### Flow Detail

```
TemplateScreen
  ├── Pilih mode: [Photo] [Boomerang]
  │   └── Photo  → flow existing (pilih template, 3 foto)
  └── Boomerang → pilih template (atau single slot), langsung ke capture
                      │
                      ▼
CaptureScreen (boomerang mode)
  1. Countdown 3-2-1
  2. Rekam 15 frame, interval 150ms (~2.25 detik)
  3. Preview GIF langsung di canvas (putar loop)
  4. Tombol Retake / Keep
                      │
                      ▼
FilterScreen (opsional, filter diterapkan per frame)
                      │
                      ▼
Form → Print (GIF sebagai output utama, QR tetap)
```

### Key Implementation Details

- `captureBoomerangFrames()` menggunakan `requestAnimationFrame` loop dengan timing manual:
```ts
function captureBoomerangFrames(
  video: HTMLVideoElement,
  frameCount: number,
  intervalMs: number
): Promise<ImageData[]> {
  return new Promise((resolve) => {
    const frames: ImageData[] = [];
    const offscreen = new OffscreenCanvas(video.videoWidth, video.videoHeight);
    const ctx = offscreen.getContext('2d')!;
    let captured = 0;
    const start = performance.now();

    function tick() {
      const elapsed = performance.now() - start;
      while (captured < frameCount && elapsed >= captured * intervalMs) {
        ctx.save();
        ctx.translate(video.videoWidth, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        ctx.restore();
        frames.push(ctx.getImageData(0, 0, video.videoWidth, video.videoHeight));
        captured++;
      }
      if (captured < frameCount) {
        requestAnimationFrame(tick);
      } else {
        resolve(frames);
      }
    }
    tick();
  });
}
```

- Di server, `generateGif()` untuk boomerang: frame array = `frames + frames.reverse().slice(1)`, delay 150ms, repeat 0
- Jika filter diterapkan, `applyFilterToImageData()` dipanggil untuk setiap frame — pertimbangkan performance (OffscreenCanvas tiap frame)

### Dependencies

- `gifencoder` ✅ (sudah terinstall)
- `jpeg-js` ✅ (sudah terinstall)

### Tests

- `src/client/utils/__tests__/canvas.test.ts` — test `captureBoomerangFrames()` returns correct frame count
- `src/client/screens/__tests__/CaptureScreen.test.tsx` — test mode toggle + boomerang flow
- `src/server/services/__tests__/photoService.test.ts` — test boomerang GIF generation (reverse order, delay)

---

## 📍 Phase 7: Animated Overlays (PENDING)

### Description

Tambahkan efek overlay animasi di atas foto — seperti confetti jatuh, bintang berkilau, atau bingkai neon berkedip. Overlay dirender di canvas sebagai lapisan terpisah di atas template, dengan animasi berbasis `requestAnimationFrame`.

### Files Affected

| File | Change |
|---|---|
| `src/client/utils/canvas.ts` | Tambah `drawAnimatedOverlay()`, `renderComposedPhotoWithOverlay()` |
| `src/client/utils/overlays.ts` | **Baru** — definisi overlay (konfigurasi partikel/animasi, frame generator) |
| `src/client/types/index.ts` | Tambah `activeOverlay: string` ke `AppState`, `SET_OVERLAY` ke `AppAction` |
| `src/client/context/AppStateContext.tsx` | Handle `SET_OVERLAY` |
| `src/client/screens/FilterScreen.tsx` | Tambah tab/pilihan Overlay di samping Filter |
| `src/client/screens/PrintScreen.tsx` | Render overlay animasi di canvas preview + print |
| `src/client/styles/globals.css` | Styling overlay picker UI |

### Overlay Types

```ts
export interface OverlayConfig {
  id: string;
  label: string;
  type: 'particle' | 'frame_sequence' | 'css_animation';
  draw: (ctx: CanvasRenderingContext2D, timestamp: number, W: number, H: number) => void;
}
```

### Built-in Overlays

| ID | Label | Type | Description |
|---|---|---|---|
| `none` | None | — | No overlay |
| `confetti` | Confetti | particle | Falling monochrome confetti (kotak putih/hitam) |
| `sparkle` | Sparkle | particle | Bintang putih berkedip di sudut |
| `neon_glow` | Neon Glow | css_animation | Efek pinggir canvas berkedip |
| `scanlines` | Scanlines | frame_sequence | Garis horizontal bergerak (seperti efek TV) |
| `frame_pulse` | Pulse Frame | css_animation | Border frame overlay yang berdenyut opacity |

### Key Implementation Details

- Confetti particle system:
```ts
interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number; life: number;
}

function confettiDraw(ctx: CanvasRenderingContext2D, t: number, W: number, H: number) {
  // Particle loop — spawn, update, draw, remove
}
```

- `renderComposedPhotoWithOverlay()` — mirip `renderComposedPhoto()` tapi ditambahkan parameter overlay + timestamp, dipanggil di `requestAnimationFrame` loop
- Di `FilterScreen`, setelah user pilih filter, user bisa tambah overlay (opsional)
- Di `PrintScreen`, overlay animasi di-render sekali (freeze frame terakhir) untuk print statis, atau sebagai GIF layer

### Performance Considerations

- Gunakan `OffscreenCanvas` untuk render overlay secara terpisah, lalu composite dengan `ctx.drawImage()`
- Batasi partikel maksimal ~200 untuk menjaga performa di perangkat kiosk entry-level
- Simpan `requestAnimationFrame` handle untuk cleanup saat unmount

### Tests

- `src/client/utils/__tests__/overlays.test.ts` — test particle system, tidak ada infinite loop, frame sequence correct
- `src/client/utils/__tests__/canvas.test.ts` — test `drawAnimatedOverlay()` compositing

---

## ✅ Phase 8: Screen Transition Animations — COMPLETED

### Description

Tambahkan animasi transisi antar 7 screen (idle → payment → template → capture → filter → form → print) dengan efek slide, fade, dan scale yang konsisten. Saat ini transisi hanya menggunakan opacity + translateY sederhana.

### Files Changed

| File | Change |
|---|---|
| `src/client/styles/globals.css` | Tambah keyframes animasi + `.screen-wrap` + 6 kelas animasi |
| `src/client/App.tsx` | Refactor: `renderedScreenRef`, `wrapperClass`, state machine exit→swap→enter |

### Transition Map

| From → To | Direction | Animation |
|---|---|---|
| idle → payment | Forward | Slide up + fade |
| payment → template | Forward | Slide left |
| template → capture | Forward | Slide left |
| capture → filter | Forward | Slide left |
| filter → form | Forward | Slide left |
| form → print | Forward | Slide left |
| **Any → previous (back)** | Backward | Slide right |
| **Any → idle (reset)** | — | Fade out + fade in |

### Key Implementation Details

```css
@keyframes slide-in-right {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
@keyframes slide-out-left {
  from { transform: translateX(0); opacity: 1; }
  to   { transform: translateX(-100%); opacity: 0; }
}
@keyframes slide-in-left {
  from { transform: translateX(-100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
@keyframes slide-out-right {
  from { transform: translateX(0); opacity: 1; }
  to   { transform: translateX(100%); opacity: 0; }
}
```

- `renderedScreenRef.current` melacak screen yang sedang di-DOM (tidak sinkron dengan `state.screen`)
- Saat `state.screen` berubah, 3-phase sequence menggunakan `setTimeout` dengan refs:
  1. **Exit** — wrapper mendapat class `screen-exit-{dir}` (250ms)
  2. **Swap** — `renderedScreenRef.current = target`, wrapper mendapat class `screen-enter-{dir}` (300ms)
  3. **Done** — wrapper class di-clear

```ts
const renderedScreenRef = useRef(state.screen);
const [wrapperClass, setWrapperClass] = useState('');
const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

### Edge Cases

- **Dev shortcut (Ctrl+Shift+F):** loncat ke filter — animasi skip langsung muncul
- **Reset dari print:** fade out semua, idle muncul
- **Back-to-back cepat:** debounce/tahan navigasi selama animasi (~300ms)
- **Timer expired alert + reset:** tidak perlu animasi, langsung reset

### Tests

- `src/client/__tests__/App.test.tsx` — test screen mount/unmount dengan animasi class
- `src/client/screens/__tests__/transitions.test.tsx` — test forward/backward direction

---

## ✅ Phase 9: Admin Dashboard — COMPLETED

### Description

Web dashboard untuk admin memonitor dan mengelola photobooth. Menampilkan daftar sessions, stats real-time, preview foto, dan kontrol manual (print ulang, hapus session). Dilindungi oleh API key + basic session auth.

### Files Created / Changed

| File | Change |
|---|---|
| `src/server/middleware/auth.ts` | **Baru** — Basic Auth + API Key middleware |
| `src/server/services/adminService.ts` | **Baru** — `getAdminStats`, `getSessions` (pagination), `deleteAdminSession`, `reprintAdminSession` |
| `src/server/controllers/adminController.ts` | **Baru** — 5 handler untuk admin endpoints |
| `src/server/routes/admin.ts` | **Baru** — `GET /api/admin/stats`, `GET /api/admin/sessions`, `GET /api/admin/sessions/:id`, `DELETE /api/admin/sessions/:id`, `POST /api/admin/reprint/:id` |
| `src/server/config/env.ts` | Tambah `ADMIN_USER`, `ADMIN_PASSWORD` |
| `src/server/app.ts` | Mount admin routes + serve admin SPA |
| `src/client/admin/admin.html` | **Baru** — entry HTML |
| `src/client/admin/admin.tsx` | **Baru** — entry React |
| `src/client/admin/AdminDashboard.tsx` | **Baru** — layout sidebar + 3 page router |
| `src/client/admin/pages/StatsPage.tsx` | **Baru** — stat cards |
| `src/client/admin/pages/SessionsPage.tsx` | **Baru** — table + search + pagination |
| `src/client/admin/api/admin.ts` | **Baru** — typed HTTP client |
| `src/client/admin/styles/admin.css` | **Baru** — monochrome dashboard styles |
| `vite.config.ts` | Multi-page build: `admin.html` entry |

### Admin Middleware

```ts
export function adminAuth(req: Request, res: Response, next: NextFunction) {
  // Option A: Basic Auth (untuk dashboard web)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="SnapBooth Admin"');
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }
  // Verify credentials from env
  // Option B: X-API-Key header (untuk API clients)
  // Fallback: both work
}
```

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/stats` | Basic/API Key | Total sessions hari ini, total prints, storage used, DB size |
| `GET` | `/api/admin/sessions` | Basic/API Key | List sessions (pagination: `?page=1&limit=20`), filter by date |
| `GET` | `/api/admin/sessions/:id` | Basic/API Key | Detail session + all files |
| `DELETE` | `/api/admin/sessions/:id` | Basic/API Key | Hapus session + file terkait |
| `POST` | `/api/admin/reprint/:id` | Basic/API Key | Cetak ulang session |
| `GET` | `/api/admin/health` | Basic/API Key | Health detail (disk, uptime, queue) |

### Admin SPA

Minimal dashboard di `src/client/admin/` dengan entry terpisah (`admin.html`, `admin.tsx`) agar tidak campur dengan kiosk SPA:

```
src/client/admin/
├── admin.html            # Entry HTML
├── admin.tsx             # Root React component
├── AdminDashboard.tsx    # Layout: sidebar + content
├── pages/
│   ├── StatsPage.tsx     # Kartu statistik
│   ├── SessionsPage.tsx  # Table sessions + search
│   └── SessionDetail.tsx # Detail + preview foto + actions
├── api/
│   └── admin.ts          # HTTP client untuk admin endpoints
└── styles/
    └── admin.css         # Styling dashboard
```

- Build terpisah dengan Vite multi-page entry (`vite.config.ts`)
- Serve di `/admin/*` oleh Express
- Basic auth via browser native login prompt

### Key Implementation Details

```ts
// adminService.ts
export function getAdminStats() {
  const db = getDb();
  const todaySessions = db.prepare(
    "SELECT COUNT(*) as count FROM sessions WHERE date(created_at) = date('now')"
  ).get() as { count: number };
  const totalSessions = db.prepare(
    "SELECT COUNT(*) as count FROM sessions"
  ).get() as { count: number };
  const activeSessions = db.prepare(
    "SELECT COUNT(*) as count FROM sessions WHERE expires_at > datetime('now')"
  ).get() as { count: number };
  // ... print count, storage stats
}
```

### Pagination

```ts
export function getSessions(page: number, limit: number, search?: string) {
  const db = getDb();
  const offset = (page - 1) * limit;
  let query = 'SELECT * FROM sessions';
  let countQuery = 'SELECT COUNT(*) as total FROM sessions';
  const params: any[] = [];

  if (search) {
    query += ' WHERE name LIKE ? OR wa LIKE ? OR email LIKE ?';
    countQuery += ' WHERE name LIKE ? OR wa LIKE ? OR email LIKE ?';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const sessions = db.prepare(query).all(...params) as SessionRecord[];
  const { total } = db.prepare(countQuery).get(...params) as { total: number };

  return { sessions, total, page, limit, pages: Math.ceil(total / limit) };
}
```

### Vite Multi-Page Config

```ts
// vite.config.ts — tambah entry
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'src/client/admin/admin.html',
      },
    },
  },
});
```

### Express Admin Routes

```ts
// app.ts
import adminRoutes from './routes/admin';
app.use('/api/admin', adminLimiter, adminAuth, adminRoutes);

// Serve admin SPA
app.use('/admin', express.static(path.join(distPath, 'admin.html')));
```

### Env Vars

| Variable | Default | Description |
|---|---|---|
| `ADMIN_USER` | `admin` | Username untuk Basic Auth |
| `ADMIN_PASSWORD` | (required) | Password untuk Basic Auth |
| `ADMIN_RATE_LIMIT` | `30` | Requests per 15 menit |

### UI Design (Admin Dashboard)

- Monochrome sesuai design system kiosk
- Tabel sessions dengan kolom: Nama, WA, Template, Filter, Waktu, Aksi
- Kartu statistik di atas: Total Sessions, Active, Today, Storage
- Detail session: preview foto (composed + individual), QR code, info user, tombol reprint/delete
- Search by name/WA/email
- Konfirmasi delete (modal)

### Tests

- `src/server/__tests__/admin.test.ts` — supertest integration tests for all admin endpoints
  - Test 401 tanpa auth
  - Test 200 dengan auth
  - Test delete + file cleanup
  - Test pagination
- `src/server/services/__tests__/adminService.test.ts` — unit test stats queries

---

## Execution Order

```
Phase 6 ──▶ Phase 7 ──▶ Phase 8 ──▶ Phase 9
PENDING    PENDING      COMPLETED    COMPLETED
```

### Status

| Phase | Status |
|---|---|
| Phase 6 — Boomerang / Video Loop | ⏳ PENDING |
| Phase 7 — Animated Overlays | ⏳ PENDING |
| Phase 8 — Screen Transition Animations | ✅ COMPLETED |
| Phase 9 — Admin Dashboard | ✅ COMPLETED |
