// public/js/app.js — Interaksi UI TokoAdmin

// ── Auto-dismiss alert setelah 5 detik ──────────────────────────────────────
document.querySelectorAll('.alert').forEach((el) => {
  setTimeout(() => {
    el.style.transition = 'opacity .4s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
  }, 5000);
});

// ── Konfirmasi sebelum submit form berbahaya (cancel/aktifkan) ───────────────
document.querySelectorAll('[data-confirm]').forEach((btn) => {
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    const msg = this.dataset.confirm || 'Apakah Anda yakin?';
    openModal(msg, this.dataset.confirmTitle || 'Konfirmasi', this.closest('form'));
  });
});

// ── Modal konfirmasi ─────────────────────────────────────────────────────────
function openModal(desc, title, formToSubmit) {
  const overlay = document.getElementById('confirmModal');
  if (!overlay) return;

  overlay.querySelector('.modal-title').textContent = title;
  overlay.querySelector('.modal-desc').textContent = desc;
  overlay.classList.add('open');

  const btnOk = overlay.querySelector('#modalOkBtn');
  // Hapus listener lama supaya tidak double-fire
  const newBtn = btnOk.cloneNode(true);
  btnOk.replaceWith(newBtn);

  newBtn.addEventListener('click', () => {
    overlay.classList.remove('open');
    if (formToSubmit) formToSubmit.submit();
  });

  overlay.querySelector('#modalCancelBtn').addEventListener(
    'click',
    () => {
      overlay.classList.remove('open');
    },
    { once: true },
  );
}

// Tutup modal kalau klik overlay
document.getElementById('confirmModal')?.addEventListener('click', function (e) {
  if (e.target === this) this.classList.remove('open');
});

// ── Format angka input ke tampilan Rupiah (hanya display, value tetap angka) ─
document.querySelectorAll('.input-harga').forEach((input) => {
  input.addEventListener('focus', function () {
    this.select();
  });
});
