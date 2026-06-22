// routes/pembelian.js - CRUD pembelian dan pembatalan
const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run } = require('../db/database');

// Helper: generate nomor PO otomatis
function generateNoPO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const existing = queryAll(`SELECT nomor_po FROM pembelian WHERE nomor_po LIKE ? ORDER BY id DESC LIMIT 1`, [`PO-${year}-${month}-%`]);
  let seq = 1;
  if (existing.length > 0) {
    const lastNo = existing[0].nomor_po;
    const lastSeq = parseInt(lastNo.split('-').pop(), 10);
    seq = lastSeq + 1;
  }
  return `PO-${year}-${month}-${String(seq).padStart(3, '0')}`;
}

// GET /pembelian - Daftar semua pembelian
router.get('/', (req, res) => {
  const { status, search, from, to } = req.query;

  let sql = `
    SELECT pb.*, 
           COUNT(dp.id) as jumlah_item
    FROM pembelian pb
    LEFT JOIN detail_pembelian dp ON dp.pembelian_id = pb.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'semua') {
    sql += ` AND pb.status = ?`;
    params.push(status);
  }
  if (search) {
    sql += ` AND (pb.nomor_po LIKE ? OR pb.supplier LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  if (from) {
    sql += ` AND pb.tanggal_pembelian >= ?`;
    params.push(from);
  }
  if (to) {
    sql += ` AND pb.tanggal_pembelian <= ?`;
    params.push(to);
  }

  sql += ` GROUP BY pb.id ORDER BY pb.created_at DESC`;

  const pembelian = queryAll(sql, params);

  // Statistik ringkas
  const stats = {
    total: pembelian.length,
    aktif: pembelian.filter((p) => p.status === 'aktif').length,
    dibatalkan: pembelian.filter((p) => p.status === 'dibatalkan').length,
    total_nilai: pembelian.filter((p) => p.status === 'aktif').reduce((sum, p) => sum + p.total_harga, 0),
  };

  res.render('pembelian/index', {
    title: 'Manajemen Pembelian',
    pembelian,
    stats,
    filter: { status: status || 'semua', search: search || '', from: from || '', to: to || '' },
    messages: req.flash ? req.flash() : {},
    activePage: 'pembelian',
  });
});

// GET /pembelian/tambah - Form tambah pembelian baru
router.get('/tambah', (req, res) => {
  const produk = queryAll(`
    SELECT p.id, p.kode_produk, p.nama_produk, p.harga_beli, p.satuan,
           COALESCE(s.jumlah_stock, 0) as jumlah_stock
    FROM produk p
    LEFT JOIN stock s ON s.produk_id = p.id
    ORDER BY p.nama_produk
  `);

  const noPO = generateNoPO();
  const today = new Date().toISOString().split('T')[0];

  res.render('pembelian/form', {
    title: 'Tambah Pembelian',
    mode: 'tambah',
    pembelian: null,
    detail: [],
    produk,
    noPO,
    today,
    messages: req.flash ? req.flash() : {},
    activePage: 'pembelian',
  });
});

// POST /pembelian - Simpan pembelian baru
router.post('/', (req, res) => {
  try {
    const { supplier, tanggal_pembelian, catatan, produk_id, jumlah, harga_beli } = req.body;

    // Validasi: minimal 1 item
    const produkIds = Array.isArray(produk_id) ? produk_id : [produk_id];
    const jumlahArr = Array.isArray(jumlah) ? jumlah : [jumlah];
    const hargaArr = Array.isArray(harga_beli) ? harga_beli : [harga_beli];

    if (!produkIds[0] || !supplier || !tanggal_pembelian) {
      req.flash && req.flash('error', 'Data tidak lengkap. Supplier, tanggal, dan minimal 1 produk wajib diisi.');
      return res.redirect('/pembelian/tambah');
    }

    // Hitung total
    let totalHarga = 0;
    const items = produkIds
      .map((pid, i) => {
        const qty = parseInt(jumlahArr[i], 10);
        const harga = parseFloat(hargaArr[i]);
        const subtotal = qty * harga;
        totalHarga += subtotal;
        return { produk_id: pid, jumlah: qty, harga_beli: harga, subtotal };
      })
      .filter((item) => item.produk_id && item.jumlah > 0);

    if (items.length === 0) {
      req.flash && req.flash('error', 'Minimal 1 item produk harus ditambahkan.');
      return res.redirect('/pembelian/tambah');
    }

    const noPO = generateNoPO();

    // Insert header pembelian
    const pembelianId = run(
      `INSERT INTO pembelian (nomor_po, supplier, tanggal_pembelian, total_harga, status, catatan)
       VALUES (?, ?, ?, ?, 'aktif', ?)`,
      [noPO, supplier, tanggal_pembelian, totalHarga, catatan || null],
    );

    // Insert detail item + update stock
    items.forEach((item) => {
      run(
        `INSERT INTO detail_pembelian (pembelian_id, produk_id, jumlah, harga_beli, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [pembelianId, item.produk_id, item.jumlah, item.harga_beli, item.subtotal],
      );

      // Tambah stock
      const existingStock = queryOne('SELECT id FROM stock WHERE produk_id = ?', [item.produk_id]);
      if (existingStock) {
        run(
          `UPDATE stock SET jumlah_stock = jumlah_stock + ?, updated_at = CURRENT_TIMESTAMP
           WHERE produk_id = ?`,
          [item.jumlah, item.produk_id],
        );
      } else {
        run(`INSERT INTO stock (produk_id, jumlah_stock, stok_minimum) VALUES (?, ?, 5)`, [item.produk_id, item.jumlah]);
      }
    });

    req.flash && req.flash('success', `Pembelian ${noPO} berhasil disimpan! Stock telah diperbarui.`);
    res.redirect(`/pembelian/${pembelianId}`);
  } catch (err) {
    console.error('Error simpan pembelian:', err);
    req.flash && req.flash('error', 'Terjadi kesalahan: ' + err.message);
    res.redirect('/pembelian/tambah');
  }
});

// GET /pembelian/:id - Detail pembelian
router.get('/:id', (req, res) => {
  const pembelian = queryOne(`SELECT * FROM pembelian WHERE id = ?`, [req.params.id]);

  if (!pembelian) {
    req.flash && req.flash('error', 'Data pembelian tidak ditemukan.');
    return res.redirect('/pembelian');
  }

  const detail = queryAll(
    `
    SELECT dp.*, p.nama_produk, p.kode_produk, p.satuan, p.kategori
    FROM detail_pembelian dp
    JOIN produk p ON p.id = dp.produk_id
    WHERE dp.pembelian_id = ?
  `,
    [req.params.id],
  );

  res.render('pembelian/detail', {
    title: `Detail Pembelian ${pembelian.nomor_po}`,
    pembelian,
    detail,
    messages: req.flash ? req.flash() : {},
    activePage: 'pembelian',
  });
});

// POST /pembelian/:id/batal - Batalkan pembelian (rollback stock)
router.post('/:id/batal', (req, res) => {
  try {
    const pembelian = queryOne(`SELECT * FROM pembelian WHERE id = ?`, [req.params.id]);

    if (!pembelian) {
      req.flash && req.flash('error', 'Data pembelian tidak ditemukan.');
      return res.redirect('/pembelian');
    }

    if (pembelian.status === 'dibatalkan') {
      req.flash && req.flash('error', 'Pembelian ini sudah dibatalkan sebelumnya.');
      return res.redirect(`/pembelian/${req.params.id}`);
    }

    // Ambil detail untuk rollback stock
    const detail = queryAll(`SELECT produk_id, jumlah FROM detail_pembelian WHERE pembelian_id = ?`, [req.params.id]);

    // Rollback stock: kurangi jumlah yang sudah ditambahkan
    detail.forEach((item) => {
      run(
        `UPDATE stock SET jumlah_stock = MAX(0, jumlah_stock - ?), updated_at = CURRENT_TIMESTAMP
         WHERE produk_id = ?`,
        [item.jumlah, item.produk_id],
      );
    });

    // Update status pembelian
    run(`UPDATE pembelian SET status = 'dibatalkan', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);

    req.flash && req.flash('success', `Pembelian ${pembelian.nomor_po} telah dibatalkan. Stock sudah dikembalikan.`);
    res.redirect(`/pembelian/${req.params.id}`);
  } catch (err) {
    console.error('Error batalkan pembelian:', err);
    req.flash && req.flash('error', 'Gagal membatalkan: ' + err.message);
    res.redirect(`/pembelian/${req.params.id}`);
  }
});

// POST /pembelian/:id/aktifkan - Aktifkan kembali pembelian yang dibatalkan
router.post('/:id/aktifkan', (req, res) => {
  try {
    const pembelian = queryOne(`SELECT * FROM pembelian WHERE id = ?`, [req.params.id]);

    if (!pembelian || pembelian.status !== 'dibatalkan') {
      req.flash && req.flash('error', 'Pembelian tidak valid untuk diaktifkan.');
      return res.redirect(`/pembelian/${req.params.id}`);
    }

    const detail = queryAll(`SELECT produk_id, jumlah FROM detail_pembelian WHERE pembelian_id = ?`, [req.params.id]);

    // Tambah kembali stock
    detail.forEach((item) => {
      run(
        `UPDATE stock SET jumlah_stock = jumlah_stock + ?, updated_at = CURRENT_TIMESTAMP
         WHERE produk_id = ?`,
        [item.jumlah, item.produk_id],
      );
    });

    run(`UPDATE pembelian SET status = 'aktif', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);

    req.flash && req.flash('success', `Pembelian ${pembelian.nomor_po} berhasil diaktifkan kembali.`);
    res.redirect(`/pembelian/${req.params.id}`);
  } catch (err) {
    req.flash && req.flash('error', 'Gagal mengaktifkan: ' + err.message);
    res.redirect(`/pembelian/${req.params.id}`);
  }
});

module.exports = router;
