# Ryezenn Motion — Alight Motion Premium Store & Admin Dashboard

Ryezenn Motion adalah aplikasi web modern dan premium untuk penjualan akun Alight Motion Premium. Dilengkapi dengan sistem pembayaran otomatis QRIS via Mustika Payment, sistem manajemen stok akun, riwayat pembelian pelanggan, papan peringkat (leaderboard) pembelian, serta Dashboard Admin yang interaktif.

Proyek ini telah direfaktor untuk memisahkan kode markup (HTML), kode gaya (CSS), dan logika program (JavaScript/API Calls) secara modular untuk performa yang optimal dan kemudahan pemeliharaan.

---

## 📁 Struktur Proyek (Modular)

```text
ryezen-motion/
├── public/                 # Folder publik yang disajikan oleh Express
│   ├── css/
│   │   └── style.css       # Seluruh styling, tema Obsidian Glow, responsivitas, & animasi
│   ├── js/
│   │   └── app.js          # Logika frontend, Anti-DevTools, Auth, QRIS, & Admin Dashboard
│   └── index.html          # Markup HTML bersih (menghubungkan ke CSS & JS eksternal)
├── .dockerignore           # Daftar berkas yang diabaikan saat build Docker
├── .env                    # Berkas variabel lingkungan lokal (jangan di-commit ke Git)
├── .env.example            # Template berkas .env untuk panduan deployment
├── Dockerfile              # Konfigurasi container untuk platform Docker/Cloud Run
├── package.json            # Daftar dependensi dan script aplikasi Node.js
├── package-lock.json       # Lockfile npm
└── server.js               # Backend API Server berbasis Express & Mongoose (MongoDB)
```

---

## 🛠️ Persiapan Lokal & Cara Menjalankan

### Prerequisites
- Node.js versi 18 atau yang lebih baru
- MongoDB Atlas (Cloud Database) atau MongoDB Local

### Langkah Instalasi
1. **Clone / Salin Proyek** ke komputer Anda.
2. Buka terminal di direktori proyek tersebut.
3. Install dependensi proyek:
   ```bash
   npm install
   ```
4. Salin berkas `.env.example` menjadi `.env`:
   ```bash
   copy .env.example .env
   ```
5. Sesuaikan variabel di dalam `.env` dengan kredensial MongoDB, Mustika Payment API Key, serta JWT Secret pilihan Anda.
6. Jalankan aplikasi dalam mode pengembangan (dev):
   ```bash
   npm run dev
   ```
   *Atau jalankan secara langsung dalam mode produksi:*
   ```bash
   npm start
   ```
7. Buka browser Anda dan kunjungi `http://localhost:5000`.

---

## 🚀 Panduan Deployment ke Berbagai Platform

Aplikasi ini mendukung kemudahan deployment ("Support All Deploy") karena port dan koneksi database dikonfigurasi secara dinamis melalui environment variables.

### 1. Render (Node Hosting)
- Buat Web Service baru di Render.
- Hubungkan dengan repositori GitHub proyek ini.
- Konfigurasi Build & Start Settings:
  - **Runtime**: `Node`
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`
- Masuk ke tab **Environment** dan tambahkan variabel-variabel berikut sesuai isi `.env.example`:
  - `MONGODB_URI`
  - `MUSTIKA_API_KEY`
  - `ADMIN_KEY`
  - `JWT_SECRET`
- Simpan dan Deploy. Render akan otomatis memberikan URL HTTPS publik gratis.

### 2. Google Cloud Run (Container Deployment)
Aplikasi ini sudah dilengkapi dengan berkas `Dockerfile`.
- Install Google Cloud CLI di komputer Anda.
- Jalankan perintah berikut untuk melakukan build dan deploy langsung dari terminal lokal Anda:
  ```bash
  gcloud run deploy ryezen-motion --source . --platform managed --allow-unauthenticated
  ```
- Masukkan environment variables (`MONGODB_URI`, `MUSTIKA_API_KEY`, `ADMIN_KEY`, `JWT_SECRET`) saat diminta di Google Cloud Console atau lewat argumen `--set-env-vars`.

### 3. VPS dengan PM2 (Virtual Private Server)
- Hubungkan VPS Anda via SSH.
- Pastikan Node.js dan MongoDB/git sudah terinstall di VPS.
- Clone proyek dan jalankan `npm install`.
- Install PM2 secara global:
  ```bash
  npm install -g pm2
  ```
- Buat berkas `.env` dan masukkan variabel konfigurasinya.
- Jalankan aplikasi menggunakan PM2 agar berjalan di background selamanya:
  ```bash
  pm2 start server.js --name "ryezen-motion"
  ```
- Untuk mengaktifkan auto-restart saat VPS reboot:
  ```bash
  pm2 startup
  pm2 save
  ```

---

## 🔐 Keamanan & Fitur Tambahan
- **Anti-DevTools**: Melindungi kode dari pembongkaran dengan memblokir interaksi ketika Developer Tools dibuka (bisa dilewati saat pengujian lokal dengan parameter URL `?bypass_dev=true`).
- **Autentikasi Pelanggan**: Registrasi wajib untuk mencatat riwayat transaksi tanpa harus bergantung pada tautan eksternal.
- **Auto Data Seeder**: Backend akan otomatis menginisiasi data stok akun awal, pengaturan, dan riwayat simulasi saat database pertama kali terhubung dalam keadaan kosong.
