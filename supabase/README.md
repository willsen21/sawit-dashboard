# Menghubungkan Kebun Kas ke Supabase

Dokumen ini menyiapkan database bersama untuk owner dan admin. Proyek cloud tetap berada di akun Supabase milik Anda.

## 1. Jalankan skema database

1. Buka proyek Supabase → **SQL Editor** → **New query**.
2. Buka `supabase/schema.sql` di repository, salin seluruh isinya, lalu jalankan di SQL Editor.
3. Buka **Authentication → Users** dan buat akun login owner serta admin menggunakan email masing-masing. Di **Authentication → Settings**, matikan public sign-ups agar pengunjung tidak dapat membuat akun sendiri.
4. Salin UUID tiap akun dari daftar pengguna.
5. Di SQL Editor jalankan perintah berikut untuk setiap pengguna. Ganti nilai contoh dengan UUID dan nama yang benar:

   ```sql
   insert into public.profiles (id, display_name, email, role)
   values ('UUID-AKUN', 'Nama Pengguna', 'email-yang-dipakai-login', 'owner');
   ```

   Untuk akun admin, ubah `role` menjadi `'admin'`. Pastikan hanya akun owner tepercaya yang mendapat role `owner`.

## 2. Konfigurasi lokal

1. Salin `.env.example` menjadi `.env.local` di folder proyek.
2. Di Supabase, buka **Connect** dan salin **Project URL** serta **publishable key** ke `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

3. Jalankan ulang `npm run dev` setelah mengubah `.env.local`.

Publishable key memang digunakan browser. Jangan pernah menambahkan `sb_secret_...`, `service_role`, atau password database ke file `VITE_*`, source code, GitHub, maupun chat.

## 3. Konfigurasi GitHub Pages

Sebelum deploy, tambahkan GitHub Actions repository variables `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` melalui **Settings → Secrets and variables → Actions → Variables**. Build GitHub Pages kemudian menggunakan dua nilai tersebut.

## Catatan

- Saat owner pertama kali login, data lama dari localStorage pada perangkat itu digabungkan sekali ke cloud. Baris cloud dengan ID yang sama akan dipertahankan. Lakukan login pertama di perangkat yang menyimpan data lama yang ingin dipindahkan; jangan hapus data browser sebelum proses ini selesai.
- Supabase Auth memakai email dan password. Akun demo lokal bukan akun cloud; buat kredensial baru untuk owner dan admin.
- RLS di `schema.sql` membatasi pembacaan ke anggota aktif dan membatasi koleksi yang bisa ditulis admin. Jangan menonaktifkan RLS.
