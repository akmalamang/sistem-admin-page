// routes/produk.js - Manajemen produk dan stock
const express = require('express');
const router = express.Router();
const { queryAll, queryOne } = require('../db/database');

// GET /produk - Tampilkan semua produk beserta stock
router.get('/', (req, res) => {
  const produk = queryAll(`
    SELECT 
      p.id, p.kode_produk, p.nama_produk, p.kategori,
      p.harga_beli, p.harga_jual, p.satuan,
      COALESCE(s.jumlah_stock, 0) as jumlah_stock,
      COALESCE(s.stok_minimum, 5) as stok_minimum,
      s.updated_at as stock_updated_at
    FROM produk p
    LEFT JOIN stock s ON s.produk_id = p.id
    ORDER BY p.kategori, p.nama_produk
  `);

  // Kelompokkan berdasarkan kategori untuk tampilan
  const kategori = [...new Set(produk.map((p) => p.kategori))];

  const stats = {
    total: produk.length,
    kritis: produk.filter((p) => p.jumlah_stock <= p.stok_minuman).length,
    aktif: produk.filter((p) => p.jumlah_stock > 0).length,
  };

  const filter = {
    search: req.query.search || '',
    status: req.query.status || '',
  };

  const pembelian =
    queryAll(`
    SELECT * FROM pembelian ORDER BY tanggal_pembelian DESC LIMIT 10
  `) || [];

  res.render('produk/index', {
    title: 'Daftar Produk & Stock',
    produk,
    stats,
    filter,
    pembelian,
    kategori,
    messages: req.flash ? req.flash() : {},
    activePage: 'produk',
  });
});

// GET /produk/:id/detail - Detail produk dan riwayat pembelian
router.get('/:id/detail', (req, res) => {
  const produk = queryOne(
    `
    SELECT p.*, COALESCE(s.jumlah_stock, 0) as jumlah_stock,
           COALESCE(s.stok_minimum, 5) as stok_minimum
    FROM produk p
    LEFT JOIN stock s ON s.produk_id = p.id
    WHERE p.id = ?
  `,
    [req.params.id],
  );

  if (!produk) {
    req.flash && req.flash('error', 'Produk tidak ditemukan');
    return res.redirect('/produk');
  }

  // Riwayat pembelian produk ini
  const riwayat = queryAll(
    `
    SELECT dp.jumlah, dp.harga_beli, dp.subtotal,
           pb.nomor_po, pb.supplier, pb.tanggal_pembelian, pb.status
    FROM detail_pembelian dp
    JOIN pembelian pb ON pb.id = dp.pembelian_id
    WHERE dp.produk_id = ?
    ORDER BY pb.tanggal_pembelian DESC
    LIMIT 10
  `,
    [req.params.id],
  );

  res.render('produk/detail', {
    title: `Detail: ${produk.nama_produk}`,
    produk,
    riwayat,
    messages: req.flash ? req.flash() : {},
    activePage: 'produk',
  });
});

module.exports = router;
