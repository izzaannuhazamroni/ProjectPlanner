# Project Planner & WhatsApp Notification

Aplikasi web untuk merencanakan jadwal proyek, memantau progres, dan mengirim pengingat deadline otomatis lewat WhatsApp.

| Lapisan   | Teknologi                                                      |
| --------- | -------------------------------------------------------------- |
| Frontend  | React 18 (Vite) + Tailwind CSS 3 + Axios → deploy di **Vercel** |
| Backend   | Node.js 20+ + Express 5 + node-cron → deploy di **Render**     |
| Database  | **Supabase** (PostgreSQL)                                      |
| WhatsApp  | **Baileys** (gratis, scan QR) atau **Fonnte** (API free-tier)  |

## Fitur

- CRUD proyek: nama, keterangan, deadline (tanggal + waktu), progres 0–100%, status (To Do / In Progress / Completed), nomor WhatsApp.
- Dashboard dengan kartu statistik (Total, Selesai, Mendekati Deadline, Terlambat), klik kartu untuk memfilter tabel.
- Pencarian, filter status (termasuk *Mendekati Deadline* dan *Terlambat*), dan pengurutan.
- Progress bar dinamis: merah < 50%, kuning 50–80%, hijau > 80%.
- Normalisasi nomor otomatis ke format internasional (`+62 812…`, `0812…`, `812…` → `62812…`).
- Pengiriman manual lewat tombol di tiap baris + **cron job tiap jam** (H-1 dan terlambat, masing-masing dikirim sekali per deadline).
- Log pengiriman (berhasil/gagal) tersimpan di Supabase dan bisa dilihat dari UI.
- Koneksi WhatsApp (scan QR) dikelola langsung dari UI; sesi disimpan di Supabase sehingga **tidak hilang saat Render restart**.

## Struktur Folder

```
project-planner/
├── client/                     # Frontend React
│   ├── src/
│   │   ├── components/         # Navbar, StatsCard, ProjectTable, ProjectModal, dll.
│   │   ├── services/api.js     # Konfigurasi Axios ke backend
│   │   ├── utils/              # format tanggal, normalisasi nomor
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── vercel.json
├── server/                     # Backend Node.js
│   ├── src/
│   │   ├── config/             # env.js, supabase.js
│   │   ├── controllers/        # projectController.js, whatsappController.js
│   │   ├── routes/             # projectRoutes.js, whatsappRoutes.js
│   │   ├── services/           # whatsappService.js, cronJob.js, reminderService.js, supabaseAuthState.js
│   │   ├── middleware/ utils/
│   ├── server.js               # Entry point
│   └── .env.example
├── database/schema.sql         # Skema tabel Supabase
├── render.yaml                 # Blueprint Render (opsional)
└── package.json                # Skrip bantu untuk menjalankan keduanya
```

---

## Prasyarat

- **Node.js 20 atau lebih baru** (`node -v`) dan npm
- Akun [Supabase](https://supabase.com) (gratis)
- Ponsel dengan WhatsApp (disarankan **nomor khusus/sekunder** untuk pengirim, lihat bagian Catatan Penting)
- Untuk deploy: akun [Render](https://render.com), [Vercel](https://vercel.com), dan repositori GitHub

---

## Langkah 1 — Siapkan Supabase

1. Buka <https://supabase.com> → **New project**. Isi nama & password database, pilih region terdekat (mis. Singapore), tunggu proyek selesai dibuat.
2. Buka **SQL Editor → New query**, salin **seluruh isi** `database/schema.sql`, tempel, lalu klik **Run**. Skrip ini membuat tabel `projects`, `notification_logs`, dan `wa_auth` (aman dijalankan ulang).
3. Buka **Project Settings → API** dan catat dua nilai:
   - **Project URL** → untuk `SUPABASE_URL`
   - **service_role** key (bagian *Project API keys*, klik *Reveal*) → untuk `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ Key `service_role` melewati seluruh pengamanan database. Pakai **hanya di backend**, jangan pernah di frontend atau di Git. Tabel sudah memakai Row Level Security tanpa policy publik, jadi data tidak bisa diakses langsung dari browser.

---

## Langkah 2 — Konfigurasi `.env`

### Backend: `server/.env`

```bash
cd server
cp .env.example .env
```

Isi nilainya:

| Variabel | Keterangan | Contoh |
| --- | --- | --- |
| `PORT` | Port server (Render mengisinya otomatis) | `5000` |
| `CLIENT_URL` | Origin frontend untuk CORS, pisahkan koma bila lebih dari satu | `http://localhost:5173` |
| `SUPABASE_URL` | Project URL dari Langkah 1 | `https://abcd.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Key `service_role` dari Langkah 1 | `eyJhbGciOi…` |
| `WA_PROVIDER` | `baileys` (gratis, scan QR), `fonnte`, atau `none` | `baileys` |
| `FONNTE_TOKEN` | Token perangkat Fonnte (hanya jika `fonnte`) | `abc123…` |
| `WA_SEND_DELAY_MS` | Jeda antar pesan saat cron | `4000` |
| `CRON_ENABLED` | Aktif/nonaktif cron | `true` |
| `CRON_SCHEDULE` | Jadwal cron (default tiap jam) | `0 * * * *` |
| `APP_TIMEZONE` | Zona waktu cron & format tanggal pesan | `Asia/Jakarta` |
| `REMINDER_WINDOW_HOURS` | Pengingat H-1 dikirim bila deadline dalam X jam | `24` |
| `CRON_SECRET` | (opsional) secret untuk memicu cron dari luar | `string-acak-panjang` |

### Frontend: `client/.env`

```bash
cd client
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:5000/api
```

> Variabel berawalan `VITE_` terlihat publik di browser. Jangan menaruh rahasia di sini.

---

## Langkah 3 — Menjalankan Secara Lokal (Development)

Cara A — dua terminal:

```bash
# Terminal 1 — backend
cd server
npm install
npm run dev          # http://localhost:5000

# Terminal 2 — frontend
cd client
npm install
npm run dev          # http://localhost:5173
```

Cara B — satu perintah dari folder root:

```bash
npm install                 # memasang concurrently
npm run install:all         # memasang dependensi server + client
npm run dev
```

Cek backend: buka <http://localhost:5000/api/health> → `{"success":true,"status":"ok",…}`.

### Menghubungkan WhatsApp (Baileys)

1. Buka aplikasi di <http://localhost:5173>, klik lencana **WhatsApp** di pojok kanan atas Navbar.
2. Saat server menampilkan QR, pindai dari ponsel: **WhatsApp → Perangkat tertaut → Tautkan perangkat**. (QR juga dicetak di terminal server.)
3. Lencana berubah menjadi **WhatsApp terhubung**. Sesi tersimpan di tabel `wa_auth`, jadi setelah restart server akan tersambung sendiri tanpa scan ulang.

### Mencoba pengiriman

1. Klik **Proyek Baru**, isi data, dan gunakan nomor WhatsApp Anda sendiri untuk uji coba.
2. Klik ikon pesan hijau di baris proyek → konfirmasi → pesan terkirim. Klik ikon riwayat untuk melihat log.
3. Untuk menguji cron tanpa menunggu jam berikutnya, atur `CRON_SCHEDULE=* * * * *` (tiap menit) sementara waktu, atau set `CRON_SECRET` lalu panggil:

```bash
curl -X POST http://localhost:5000/api/cron/run -H "x-cron-secret: NILAI_CRON_SECRET"
```

Cron hanya mengirim untuk proyek **belum selesai** yang (a) deadline-nya dalam `REMINDER_WINDOW_HOURS` ke depan (pesan H-1) atau (b) sudah lewat deadline (pesan terlambat). Masing-masing dikirim sekali; mengubah deadline atau membuka kembali proyek yang selesai akan mengizinkan pengingat dikirim lagi.

### Memakai Fonnte (alternatif tanpa QR di server)

1. Daftar di <https://fonnte.com>, tambahkan perangkat, dan salin **token** perangkat.
2. Di `server/.env`: `WA_PROVIDER=fonnte` dan `FONNTE_TOKEN=token_anda`.
3. Restart server. Batas kuota/free-tier mengikuti kebijakan Fonnte saat ini.

---

## Langkah 4 — Persiapan & Deployment

Urutan yang disarankan: **push ke GitHub → deploy backend (Render) → deploy frontend (Vercel) → perbarui `CLIENT_URL` di Render**.

### 4.1 Push ke GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/project-planner.git
git push -u origin main
```

File `.env` sudah di-`.gitignore`, pastikan tidak ikut ter-commit.

### 4.2 Backend di Render

1. Render Dashboard → **New → Web Service** → hubungkan repositori.
2. Pengaturan:
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
3. Tambahkan **Environment Variables** (tab *Environment*): `NODE_VERSION=20.18.0`, `NODE_ENV=production`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WA_PROVIDER`, `APP_TIMEZONE`, `CRON_SECRET`, dan `CLIENT_URL` (isi sementara `http://localhost:5173`, ubah setelah URL Vercel diketahui). `PORT` tidak perlu diisi.
4. Deploy. Catat URL layanan, mis. `https://project-planner-api.onrender.com`, lalu cek `…/api/health`.

Alternatif: gunakan `render.yaml` di root lewat **New → Blueprint**.

### 4.3 Frontend di Vercel

1. Vercel → **Add New → Project** → impor repositori yang sama.
2. Pengaturan:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite (build `npm run build`, output `dist`)
3. **Environment Variables**: `VITE_API_URL=https://project-planner-api.onrender.com/api`
4. Deploy, lalu catat URL Vercel, mis. `https://project-planner.vercel.app`.

### 4.4 Hubungkan keduanya

Kembali ke Render → Environment → ubah `CLIENT_URL` menjadi URL Vercel (tanpa garis miring di akhir, boleh beberapa dipisah koma) → simpan, Render akan redeploy otomatis. Buka aplikasi Vercel, klik lencana WhatsApp, dan scan QR sekali.

### 4.5 Agar cron tetap hidup di Render gratis (PENTING)

Web Service gratis Render **tertidur setelah ±15 menit tanpa trafik**. Saat tidur, cron dan koneksi WhatsApp ikut mati, sehingga pengingat per jam tidak berjalan. Pilihan:

- **Gratis**: buat monitor di [UptimeRobot](https://uptimerobot.com) atau [cron-job.org](https://cron-job.org) yang memanggil `https://NAMA.onrender.com/api/health` tiap 5 menit agar server tetap bangun.
- **Pemicu eksternal**: buat job tiap jam di cron-job.org: `POST https://NAMA.onrender.com/api/cron/run` dengan header `x-cron-secret: <CRON_SECRET>`. Cocok dipadukan dengan ping di atas.
- **Paling andal**: naikkan ke instance berbayar Render (selalu aktif).

Karena sesi WhatsApp tersimpan di Supabase, server yang bangun kembali akan menyambung otomatis tanpa scan QR ulang.

---

## Referensi API

Base URL: `/api`

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/health` | Cek server |
| GET | `/projects?search=&status=&sort=&order=` | Daftar proyek. `status`: `all`, `todo`, `in_progress`, `completed`, `near`, `overdue`. `sort`: `deadline`, `created_at`, `progress`, `name`. `order`: `asc`/`desc` |
| GET | `/projects/stats` | Statistik dashboard |
| GET | `/projects/:id` | Detail proyek |
| POST | `/projects` | Tambah proyek |
| PUT | `/projects/:id` | Ubah proyek |
| DELETE | `/projects/:id` | Hapus proyek |
| POST | `/projects/:id/remind` | Kirim pengingat WhatsApp manual |
| GET | `/projects/:id/logs` | Riwayat pengiriman (50 terakhir) |
| GET | `/whatsapp/status` | Status koneksi WhatsApp |
| GET | `/whatsapp/qr` | QR (data URL) saat menunggu scan |
| POST | `/whatsapp/logout` | Putuskan nomor & buat QR baru |
| POST | `/whatsapp/reconnect` | Sambung ulang |
| POST | `/cron/run` | Jalankan pemeriksaan deadline (butuh header `x-cron-secret`) |

Contoh body `POST /projects`:

```json
{
  "name": "Redesain Website Klien A",
  "description": "Revisi landing page",
  "deadline": "2026-11-20T10:00:00+07:00",
  "progress": 40,
  "status": "in_progress",
  "whatsapp_number": "+62 812-3456-7890"
}
```

---

## Pemecahan Masalah

| Gejala | Penyebab & solusi |
| --- | --- |
| Server berhenti dengan "Environment variable … belum diisi" | `server/.env` belum dibuat atau `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` kosong. |
| UI: "Tidak dapat terhubung ke server" | Backend belum jalan, atau `VITE_API_URL` salah. Setelah mengubah `.env` client, restart `npm run dev` (di Vercel: redeploy). |
| Error CORS di browser | `CLIENT_URL` di server tidak sama persis dengan origin frontend (periksa `http`/`https`, tanpa `/` di akhir). |
| `relation "projects" does not exist` | `database/schema.sql` belum dijalankan di Supabase. |
| QR tidak muncul | Tunggu beberapa detik; periksa log server. Klik **Sambung ulang** di modal WhatsApp. |
| Terus terputus (kode 440/401) | Nomor sedang dipakai sesi lain atau dikeluarkan dari ponsel. Klik **Putuskan & ganti nomor**, lalu scan ulang. |
| "Nomor … tidak terdaftar di WhatsApp" | Nomor penerima salah atau tidak memiliki WhatsApp. |
| Cron tidak mengirim | WhatsApp belum terhubung, tidak ada proyek yang masuk kriteria, atau Render tertidur (lihat 4.5). Cek log server dengan awalan `[CRON]`. |
| `npm install` server gagal di bagian `libsignal` | Baileys mengambil dependensi dari GitHub; pastikan `git` terpasang dan koneksi ke github.com tidak diblokir. |

---

## Catatan Penting

- **Baileys adalah library tidak resmi.** Penggunaannya melanggar ketentuan layanan WhatsApp dan ada risiko nomor dibatasi/diblokir, terutama bila mengirim massal. Gunakan nomor sekunder, pertahankan jeda antar pesan (`WA_SEND_DELAY_MS`), dan kirim hanya ke penerima yang memang menunggu pengingat. Untuk penggunaan bisnis serius, pertimbangkan WhatsApp Business API resmi.
- **Aplikasi ini belum memiliki login.** Siapa pun yang mengetahui URL frontend dapat melihat/mengubah proyek dan memicu pengiriman WhatsApp (dibatasi 10 pengiriman/menit per IP). Jika dipublikasikan, tambahkan autentikasi (mis. Supabase Auth) atau batasi akses di level jaringan sebelum dipakai untuk data sensitif.
- Validasi nomor saat ini mendukung **nomor seluler Indonesia** (`62 8xx…`), sesuai PRD.
- Jangan pernah meng-commit `.env` atau membagikan `SUPABASE_SERVICE_ROLE_KEY`.
