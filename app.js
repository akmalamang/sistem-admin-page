// app.js - Entry point aplikasi Admin Toko
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
const { initDatabase } = require('./db/database');

const app = express();
const PORT = 3000;

// ─── View Engine ─────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

// Session untuk flash messages
app.use(
  session({
    secret: 'toko-admin-secret-key-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 }, // 1 jam
  }),
);
app.use(flash());

// Inject flash ke semua views
app.use((req, res, next) => {
  res.locals.flash_success = req.flash('success');
  res.locals.flash_error = req.flash('error');
  res.locals.flash_info = req.flash('info');
  next();
});

// ─── Format currency helper tersedia di EJS ───────────────────────────────────
app.locals.formatRupiah = (angka) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(angka);
};

app.locals.formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/', require('./routes/dashboard'));
app.use('/produk', require('./routes/produk'));
app.use('/pembelian', require('./routes/pembelian'));

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Halaman Tidak Ditemukan', activePage: '' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server berjalan di http://localhost:${PORT}`);
      console.log(`📦 Database SQLite siap digunakan`);
    });
  })
  .catch((err) => {
    console.error('❌ Gagal menginisialisasi database:', err);
    process.exit(1);
  });
