// db/database.js - SQLite database wrapper menggunakan sql.js
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'toko.db');

let db = null;

// Simpan database ke file setiap ada perubahan
function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

async function initDatabase() {
  const SQL = await initSqlJs();

  // Load dari file jika sudah ada, kalau tidak buat baru
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
    seedDatabase();
    saveDatabase();
  }

  return db;
}

// Buat tabel dan isi data awal
function seedDatabase() {
  // Tabel Produk
  db.run(`
    CREATE TABLE IF NOT EXISTS produk (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kode_produk TEXT UNIQUE NOT NULL,
      nama_produk TEXT NOT NULL,
      kategori TEXT NOT NULL,
      harga_beli REAL NOT NULL,
      harga_jual REAL NOT NULL,
      satuan TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabel Stock
  db.run(`
    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produk_id INTEGER NOT NULL,
      jumlah_stock INTEGER NOT NULL DEFAULT 0,
      stok_minimum INTEGER NOT NULL DEFAULT 5,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (produk_id) REFERENCES produk(id)
    )
  `);

  // Tabel Pembelian (header)
  db.run(`
    CREATE TABLE IF NOT EXISTS pembelian (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor_po TEXT UNIQUE NOT NULL,
      supplier TEXT NOT NULL,
      tanggal_pembelian DATE NOT NULL,
      total_harga REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'aktif',
      catatan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabel Detail Pembelian (item per transaksi)
  db.run(`
    CREATE TABLE IF NOT EXISTS detail_pembelian (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pembelian_id INTEGER NOT NULL,
      produk_id INTEGER NOT NULL,
      jumlah INTEGER NOT NULL,
      harga_beli REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (pembelian_id) REFERENCES pembelian(id),
      FOREIGN KEY (produk_id) REFERENCES produk(id)
    )
  `);

  // Seed 10 produk
  const produkList = [
    ['PRD-001', 'Beras Premium 5kg', 'Sembako', 55000, 65000, 'Karung'],
    ['PRD-002', 'Minyak Goreng Bimoli 2L', 'Sembako', 28000, 33000, 'Botol'],
    ['PRD-003', 'Gula Pasir 1kg', 'Sembako', 14000, 17000, 'Kg'],
    ['PRD-004', 'Tepung Terigu Segitiga 1kg', 'Sembako', 11000, 14000, 'Kg'],
    ['PRD-005', 'Susu Indomilk Cair 1L', 'Minuman', 17500, 21000, 'Liter'],
    ['PRD-006', 'Sabun Lifebuoy 250ml', 'Kebersihan', 12000, 15500, 'Botol'],
    ['PRD-007', 'Shampo Pantene 170ml', 'Kebersihan', 18500, 23000, 'Botol'],
    ['PRD-008', 'Mie Instan Indomie Goreng', 'Makanan', 2800, 3500, 'Bungkus'],
    ['PRD-009', 'Kopi Kapal Api 165gr', 'Minuman', 14000, 17500, 'Bungkus'],
    ['PRD-010', 'Teh Sosro Kotak 250ml', 'Minuman', 3500, 4500, 'Kotak'],
  ];

  const stmtProduk = db.prepare(`
    INSERT INTO produk (kode_produk, nama_produk, kategori, harga_beli, harga_jual, satuan)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  produkList.forEach((p) => stmtProduk.run(p));
  stmtProduk.free();

  // Seed stock awal untuk setiap produk
  const stockAwal = [120, 85, 200, 150, 60, 90, 75, 500, 110, 300];
  const stmtStock = db.prepare(`
    INSERT INTO stock (produk_id, jumlah_stock, stok_minimum)
    VALUES (?, ?, ?)
  `);

  stockAwal.forEach((stok, i) => {
    stmtStock.run([i + 1, stok, 10]);
  });
  stmtStock.free();

  // Seed beberapa data pembelian contoh
  const pembelianContoh = [
    ['PO-2026-001', 'CV Sumber Makmur', '2026-06-01', 3250000, 'aktif', 'Pembelian rutin awal bulan'],
    ['PO-2026-002', 'UD Jaya Abadi', '2026-06-10', 1850000, 'aktif', 'Restok produk kebersihan'],
    ['PO-2026-003', 'PT Nusa Raya', '2026-06-15', 950000, 'dibatalkan', 'Supplier tidak tersedia'],
  ];

  const stmtPO = db.prepare(`
    INSERT INTO pembelian (nomor_po, supplier, tanggal_pembelian, total_harga, status, catatan)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  pembelianContoh.forEach((p) => stmtPO.run(p));
  stmtPO.free();

  // Detail untuk PO-2026-001
  const detailPO1 = [
    [1, 1, 50, 55000, 2750000],
    [1, 3, 100, 14000, 1400000], // harga berbeda, ini contoh negosiasi
  ];

  // Detail untuk PO-2026-002
  const detailPO2 = [
    [2, 6, 80, 12000, 960000],
    [2, 7, 60, 18500, 1110000],
  ];

  const stmtDetail = db.prepare(`
    INSERT INTO detail_pembelian (pembelian_id, produk_id, jumlah, harga_beli, subtotal)
    VALUES (?, ?, ?, ?, ?)
  `);
  [...detailPO1, ...detailPO2].forEach((d) => stmtDetail.run(d));
  stmtDetail.free();
}

// Helper untuk menjalankan query SELECT (kembalikan array objek)
function queryAll(sql, params = []) {
  if (!db) throw new Error('Database belum diinisialisasi');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper untuk query SELECT single row
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

// Helper untuk INSERT/UPDATE/DELETE
function run(sql, params = []) {
  if (!db) throw new Error('Database belum diinisialisasi');
  db.run(sql, params);
  // Ambil lastInsertRowid dari sqlite_sequence atau cara lain
  const result = queryOne('SELECT last_insert_rowid() as id');
  saveDatabase(); // Simpan ke file setelah setiap perubahan
  return result ? result.id : null;
}

module.exports = { initDatabase, queryAll, queryOne, run, saveDatabase };
