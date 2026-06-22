# Toko Admin - Sistem Manajemen Produk & Pembelian

Aplikasi berbasis web untuk mengelola master data produk, memantau stok barang, serta mencatat transaksi pembelian (Purchase Order) ke supplier secara real-time. Projek ini dibuat menggunakan Node.js, Express, EJS, dan database SQLite.

## ✨ Fitur Utama

- **Dashboard Minimalis**: Menampilkan total produk, produk aktif, dan indikator stok kritis.
- **Manajemen Produk & Stok**: Melihat daftar semua barang beserta detail sisa stok yang otomatis berkurang/bertambah.
- **Manajemen Pembelian (PO)**: Pencatatan transaksi pembelian barang, nomor PO otomatis, disertai fitur **Batalkan Pembelian** dan **Aktifkan Kembali** yang otomatis melakukan _rollback_ stok barang.

## 🛠️ Teknologi yang Digunakan

- **Backend**: Node.js, Express.js
- **Template Engine**: EJS (Embedded JavaScript)
- **Database**: SQLite3 / modul database lokal
- **Styling**: Custom CSS (Responsive Design)

---

## 🚀 Panduan Penggunaan & Instalasi

Ikuti langkah-langkah berikut untuk menjalankan aplikasi ini di komputer lokal Anda:

### 1. Clone Repositori

Clone projek ini ke komputer Anda menggunakan Git Bash atau Terminal:

```bash
git clone [https://github.com/USERNAME_KAMU/toko-admin.git](https://github.com/USERNAME_KAMU/toko-admin.git)
cd toko-admin
```

2. Install Dependencies
   Install semua library/package Node.js yang dibutuhkan oleh aplikasi:

Bash
npm install

3. Konfigurasi Database (Opsional)
   Aplikasi ini menggunakan SQLite. Pastikan file database (misal: database.db atau database.sqlite) sudah berada di dalam folder yang sesuai (folder db/) atau akan terbuat otomatis saat aplikasi dijalankan pertama kali.

4. Jalankan Aplikasi
   Jalankan server menggunakan Node.js atau Nodemon:

Bash

# Menggunakan node standar

npm start

# Atau menggunakan nodemon jika tersedia

npm run dev

5. Setelah server berjalan, buka browser Anda dan akses alamat berikut:

Plaintext
http://localhost:3000

Struktur File Utama
routes/produk.js - Mengatur logika rute halaman produk dan detail stok.

routes/pembelian.js - Mengatur logika CRUD pembelian, kalkulasi subtotal, serta fungsi pembatalan transaksi (stok rollback).

views/produk/ - Berisi file tampilan (index.ejs, detail.ejs) untuk modul produk.

views/pembelian/ - Berisi file tampilan (index.ejs, form.ejs, detail.ejs) untuk modul transaksi pembelian.

db/database.js - Konfigurasi koneksi dan fungsi pembantu (helper) untuk query database.
