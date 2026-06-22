// routes/dashboard.js - Halaman utama dashboard
const express = require('express');
const router = express.Router();
const { queryAll, queryOne } = require('../db/database');

router.get('/', (req, res) => {
  // Statistik utama
  const totalProduk = queryOne('SELECT COUNT(*) as total FROM produk').total;
  const totalPembelian = queryOne("SELECT COUNT(*) as total FROM pembelian WHERE status = 'aktif'").total;
  const nilaiPembelian = queryOne("SELECT COALESCE(SUM(total_harga), 0) as total FROM pembelian WHERE status = 'aktif'").total;
  const stokMenipis = queryOne(`SELECT COUNT(*) as total FROM stock WHERE jumlah_stock <= stok_minimum`).total;

  // 5 pembelian terbaru
  const pembelianTerbaru = queryAll(`
    SELECT pb.id, pb.nomor_po, pb.supplier, pb.tanggal_pembelian,
           pb.total_harga, pb.status,
           COUNT(dp.id) as jumlah_item
    FROM pembelian pb
    LEFT JOIN detail_pembelian dp ON dp.pembelian_id = pb.id
    GROUP BY pb.id
    ORDER BY pb.created_at DESC
    LIMIT 5
  `);

  // Produk dengan stok menipis
  const produkMenipis = queryAll(`
    SELECT p.nama_produk, p.kode_produk, p.kategori, p.satuan,
           s.jumlah_stock, s.stok_minimum
    FROM stock s
    JOIN produk p ON p.id = s.produk_id
    WHERE s.jumlah_stock <= s.stok_minimum
    ORDER BY s.jumlah_stock ASC
    LIMIT 5
  `);

  // Distribusi kategori produk
  const distribusiKategori = queryAll(`
    SELECT p.kategori, COUNT(*) as jumlah,
           SUM(s.jumlah_stock) as total_stock
    FROM produk p
    LEFT JOIN stock s ON s.produk_id = p.id
    GROUP BY p.kategori
  `);

  res.render('../views/dashboard.ejs', {
    title: 'Dashboard Admin',
    stats: {
      totalProduk,
      totalPembelian,
      nilaiPembelian,
      stokMenipis,
    },
    pembelianTerbaru,
    produkMenipis,
    distribusiKategori,
    messages: req.flash ? req.flash() : {},
    activePage: 'dashboard',
  });
});

module.exports = router;
