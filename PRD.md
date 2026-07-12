# Product Requirement Document (PRD) - FinText (Aplikasi Keuangan Berbasis Teks)

## 1. Overview & Objective
Aplikasi keuangan personal yang dirancang khusus untuk pencatatan instan menggunakan input satu kalimat (Natural Language). Tujuannya adalah memangkas alur pencatatan keuangan tradisional yang rumit menjadi secepat mengirim pesan chat, dilengkapi dengan visualisasi dasbor untuk memantau arus kas harian dan bulanan.

## 2. Target User
- Personal (Diri sendiri) yang membutuhkan pencatatan keuangan cepat, fleksibel, dan tidak ribet di laptop/HP.

## 3. Core Features (MVP Scope)
### A. Authentication
- Login dan Register menggunakan email & password (sebagai pengaman data personal).

### B. Smart Text Input (Fitur Utama)
- Satu kolom form input teks di halaman utama.
- Sistem bisa membaca format kalimat seperti:
  - *"beli makanan bakso 12.000"* -> Mengurangi saldo, kategori: Makanan, nominal: 12000, deskripsi: bakso.
  - *"dapat gaji 120000"* -> Menambah saldo, kategori: Gaji/Pendapatan, nominal: 120000, deskripsi: gaji.
- Menyediakan tombol "Simpan" yang langsung memproses teks tersebut ke database.

### C. Dashboard & Kategori
- **Ringkasan Saldo:** Menampilkan total saldo saat ini (Pemasukan - Pengeluaran).
- **Statistik Arus Kas:** Menampilkan total pemasukan dan total pengeluaran bulan ini.
- **Visualisasi Kategori:** Diagram (Pie Chart/Bar Chart) yang mengelompokkan pengeluaran berdasarkan kategori (misal: Makanan, Transportasi, Tagihan, Hiburan).

### D. Riwayat Transaksi (History)
- Daftar tabel/list transaksi terakhir yang diurutkan dari yang paling baru.
- Menampilkan tanggal, deskripsi, kategori, dan nominal (warna hijau untuk pemasukan, warna merah untuk pengeluaran).
- Fitur untuk menghapus (*delete*) jika ada salah input teks.

## 4. Architectural & Tech Stack (Local Development)
- **Frontend:** React.js / Next.js (TailwindCSS + Chart.js/Recharts untuk grafik dasbor).
- **Backend:** Express.js (Node.js).
- **Database ORM:** Prisma / Drizzle.
- **Database:** PostgreSQL (berjalan lokal di Docker atau local installation).

## 5. Database Schema Plan (PostgreSQL)
### Tabel `users`
- `id` (UUID, Primary Key)
- `email` (String, Unique)
- `password` (String, Hashed)
- `created_at` (Timestamp)

### Tabel `transactions`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key ke `users.id`)
- `type` (Enum: 'INCOME', 'EXPENSE')
- `amount` (Integer)
- `category` (String / Enum: 'Makanan', 'Gaji', 'Transport', 'Lainnya')
- `description` (Text)
- `raw_text` (Text, menyimpan kalimat asli untuk audit/history)
- `created_at` (Timestamp)