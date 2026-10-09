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

## Batasan penting untuk pratinjau

- Login, akun, transaksi, kas, dan kebun masih disimpan di `localStorage` browser. Pengguna di perangkat/browser berbeda tidak berbagi data dan tidak tersinkron.
- Login saat ini berjalan di sisi browser. Password demo dan data awal ada di kode aplikasi, sehingga fitur login ini **bukan perlindungan keamanan** untuk situs publik.
- Data operasional disimpan di penyimpanan browser. Data tetap ada setelah halaman dimuat ulang pada browser dan alamat situs yang sama, dan tab situs yang sama akan menerima perubahan terbaru. Data tidak otomatis dibagikan ke perangkat/browser lain.
- Gunakan GitHub Pages hanya untuk pratinjau. Jangan masukkan data transaksi atau informasi sensitif ke situs publik.
- Agar tim dapat login dengan aman dan memakai data yang sama dari banyak perangkat, aplikasi perlu backend dengan autentikasi dan database sebelum dipakai operasional.

## Fitur utama

- Owner: Ringkasan, Laporan, Operasional Kebun, Kebun Pribadi, Kontrol Transaksi, dan Kelola Admin.
- Admin: Kas Hari Ini, Catat Pembelian, dan Pembelian Hari Ini.
- Tata letak desktop menggunakan sidebar; layar kecil menggunakan menu navigasi yang dapat dibuka dari header.
