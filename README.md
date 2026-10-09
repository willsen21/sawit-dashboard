# Kebun Kas

Aplikasi pencatatan pembelian sawit berbasis React, Vite, dan Tailwind CSS.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka alamat yang ditampilkan Vite, biasanya `http://localhost:5173`.

## Pratinjau di GitHub Pages

Proyek ini sudah memiliki workflow GitHub Actions untuk membangun dan menerbitkan folder `dist` ke GitHub Pages setiap kali ada push ke branch `main`.

1. Buat repository baru di GitHub. Untuk pratinjau yang dapat dibuka orang lain, repository dan situs Pages harus dianggap **publik**.
2. Di terminal pada folder proyek, jalankan perintah berikut dan ganti alamat remote dengan URL repository Anda:

   ```bash
   git init
   git add .
   git commit -m "Siapkan Kebun Kas untuk GitHub Pages"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPOSITORY.git
   git push -u origin main
   ```

3. Di GitHub, buka **Settings → Pages**, lalu pilih **GitHub Actions** sebagai sumber deployment.
4. Buka tab **Actions** dan tunggu workflow selesai. URL situs akan muncul di **Settings → Pages**.

Aplikasi memakai URL berbasis hash supaya halaman seperti Laporan tetap bisa dibuka langsung pada hosting statis GitHub Pages.

## Supabase: login dan data bersama

Aplikasi dapat memakai Supabase Auth dan PostgreSQL agar owner/admin melihat data yang sama dari berbagai perangkat. Panduan setup ada di [supabase/README.md](supabase/README.md), dan skema dengan Row Level Security ada di `supabase/schema.sql`.

- Untuk lokal, salin `.env.example` menjadi `.env.local`, isi Project URL dan publishable key, lalu jalankan ulang `npm run dev`.
- Untuk GitHub Pages, tambahkan Actions Variables bernama `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` di repository Settings.
- Buat Auth users serta profil owner/admin di Supabase sebelum login cloud. Akun demo hanya tersedia pada mode lokal.
- Ketika owner pertama kali masuk ke database yang masih kosong, data localStorage pada browser tersebut akan dimigrasikan. Jangan hapus data browser sebelum migrasi berhasil.
- Publishable key boleh berada di browser jika RLS tetap aktif. Jangan pernah menggunakan secret key atau `service_role` di aplikasi frontend.

Tanpa konfigurasi Supabase, build production menolak login demo. Data lokal yang lama tetap tersimpan sebagai cache di browser.

## Fitur utama

- Owner: Ringkasan, Laporan, Operasional Kebun, Kebun Pribadi, Kontrol Transaksi, dan Kelola Admin.
- Admin: Kas Hari Ini, Catat Pembelian, dan Pembelian Hari Ini.
- Tata letak desktop menggunakan sidebar; layar kecil menggunakan menu navigasi yang dapat dibuka dari header.
