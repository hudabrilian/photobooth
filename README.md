# SnapBooth 📸

SnapBooth adalah aplikasi photobooth interaktif berbasis web untuk perangkat kios (kiosk photobooth) yang dibangun dengan menggunakan **React 19**, **Express 5**, **SQLite (better-sqlite3)**, dan **Vite 6**.

Aplikasi ini didesain dengan tampilan monokrom minimalis bergaya monospace (Courier) dan mendukung pemrosesan gambar cepat (di bawah 1 detik) menggunakan *Offscreen Canvas* serta integrasi printer thermal untuk mencetak foto secara instan.

---

## 🚀 Fitur Utama

- **Alur Kios Lengkap**: `Idle` ➔ `Payment` ➔ `Template Selection` ➔ `Photo Capture` ➔ `Filter & Doodle` ➔ `Form` ➔ `Print`.
- **Deteksi Wajah & Doodle Pintar**: Menggunakan MediaPipe untuk memetakan landmark wajah secara lokal dan menempatkan doodle/stiker secara otomatis tanpa menutupi area wajah penting (mata, hidung, mulut).
- **Simulasi Pembayaran**: Sistem simulasi pembayaran QRIS untuk interaksi pembayaran sebelum memulai sesi foto.
- **Dukungan Cetak Thermal**:
  - **USB Mode**: Menggunakan `node-thermal-printer` untuk printer thermal komersial (Epson, Xprinter, dll.).
  - **Bluetooth Mode**: Menggunakan program utilitas khusus untuk koneksi ke printer thermal mini Bluetooth (seperti Cat Printer/Meow Printer).
- **Pembersihan Otomatis**: Sesi foto otomatis di-reset setelah 5 menit tidak ada aktivitas, dan file foto yang disimpan akan dihapus secara berkala setelah 3 hari demi keamanan data.
- **Developer & Test Mode**:
  - Ketuk logo sebanyak 4 kali pada halaman utama (`Idle`) untuk mengaktifkan test mode.
  - Gunakan shortcut `Ctrl + Shift + F` saat dalam mode pengembangan untuk menyuntikkan gambar uji (*test images*).

---

## 🛠️ Persyaratan Sistem

- **Node.js** v18 atau lebih baru.
- **npm** v9 atau lebih baru.
- **Sistem Operasi**: Windows (disarankan untuk kompatibilitas utilitas cetak Bluetooth .exe) / macOS / Linux.

---

## ⚙️ Instalasi dan Konfigurasi

### 1. Kloning Repositori
```bash
git clone <repository-url>
cd photobooth
```

### 2. Pasang Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env` di direktori utama:
```bash
cp .env.example .env
```
Sesuaikan konfigurasi di dalam file `.env` jika diperlukan (seperti `PORT` server, `CORS_ORIGIN`, atau `API_KEY` untuk administrasi).

### 4. Setup Utilitas CatPrinterBLE (Khusus Mode Bluetooth)
Berkas eksekusi `CatPrinterBLE.exe` (7.9 MB) telah dikecualikan dari repositori Git untuk menjaga efisiensi ukuran repositori.
Jika Anda menggunakan fitur pencetakan berbasis **Bluetooth Low Energy (BLE)**:
1. Unduh berkas `CatPrinterBLE.exe` dari bagian **Releases** repositori ini (atau dari tautan yang disediakan oleh administrator).
2. Tempatkan berkas `CatPrinterBLE.exe` langsung di direktori utama (*root*) proyek Anda.

---

## 💻 Perintah Pengembangan

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan client (Vite) dan server (Express) secara bersamaan |
| `npm run dev:client` | Menjalankan server dev Vite saja (port 5173) |
| `npm run dev:server` | Menjalankan Express backend saja dengan `tsx watch` (port 3000) |
| `npm run build` | Melakukan build produksi untuk client Vite |
| `npm run start` | Membangun aset dan menjalankan server produksi |
| `npm run typecheck` | Memeriksa tipe TypeScript (client + server) |
| `npm run lint` | Menjalankan linter ESLint |
| `npm run test` | Menjalankan pengujian menggunakan Vitest |

---

## 📁 Struktur Direktori

```
├── docs/                  # Dokumentasi arsitektur dan rencana proyek
├── public/                # Aset statis & tema doodle
├── src/
│   ├── client/            # Frontend React SPA
│   │   ├── components/    # Komponen antarmuka pengguna bersama
│   │   ├── context/       # State management (AppStateContext)
│   │   ├── hooks/         # React hooks (useCamera, useTimer)
│   │   ├── screens/       # Komponen layar utama (Idle, Payment, dll.)
│   │   └── utils/         # Utilitas canvas, filter, dan template
│   └── server/            # Backend Express API
│       ├── controllers/   # Logika pengontrol endpoint
│       ├── services/      # Layanan printer, db, cleanup, dll.
│       └── db/            # Integrasi database SQLite
```

---

## 🔒 Catatan Keamanan & Batasan

- **CORS**: Dikunci hanya untuk origin yang diizinkan pada `.env` (`CORS_ORIGIN`).
- **Rate Limit**: Pembatasan IP pada endpoint `/api` untuk mencegah penyalahgunaan.
- **Admin API**: Endpoint untuk melihat foto admin memerlukan `API_KEY` yang sesuai.
- **Kepatuhan Gaya**: Aplikasi ini mematuhi gaya desain monokrom monospaced Courier dengan sudut tajam tanpa shadow/gradient demi konsistensi gaya retro/kios.
