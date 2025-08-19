document.addEventListener('DOMContentLoaded', () => {
  initCurrentYear();
  setupHamburgerMenu();
  startHeroSlideshow();
  initCompanyYears();
  initAgeSelect();
  initEntryFormFeedback();
  setupConsentGate();
  setupPrivacyModal();
});

// 年表示を現在の年に更新
function initCurrentYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

// ハンバーガーメニュー処理
function setupHamburgerMenu() {
  const hamburger = document.getElementById('hamburger');
  const navMobile = document.getElementById('nav-mobile');
  const closeMenu = document.getElementById('close-menu');
  const body = document.body;

  if (!hamburger || !navMobile || !closeMenu) return;

  hamburger.addEventListener('click', () => {
    navMobile.classList.add('show');
    body.classList.add('no-scroll');
  });

  closeMenu.addEventListener('click', () => {
    navMobile.classList.remove('show');
    body.classList.remove('no-scroll');
  });

  document.addEventListener('click', (e) => {
    if (
      navMobile.classList.contains('show') &&
      !navMobile.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      navMobile.classList.remove('show');
      body.classList.remove('no-scroll');
    }
  });
}

// ヒーロー画像スライドショー
const SLIDE_INTERVAL = 5000;
let currentIndex = 0;

function showHeroImage(index) {
  const images = document.querySelectorAll('.hero-img');
  images.forEach((img, i) => {
    img.classList.toggle('active', i === index);
  });
}

function startHeroSlideshow() {
  const images = document.querySelectorAll('.hero-img');
  if (images.length === 0) return;

  // 初期表示
  showHeroImage(currentIndex);

  // 一定間隔で切り替え
  setInterval(() => {
    currentIndex = (currentIndex + 1) % images.length;
    showHeroImage(currentIndex);
  }, SLIDE_INTERVAL);
}

// 創業年数計算
function initCompanyYears() {
  const established = 1981;
  const yearsEl = document.getElementById('company-years');
  if (yearsEl) {
    const now = new Date().getFullYear();
    yearsEl.textContent = now - established;
  }
}

// 年齢セレクト
function initAgeSelect() {
  const sel = document.getElementById('age-select');
  if (!sel) return;
  for (let i = 15; i <= 64; i++) {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = i;
    sel.appendChild(o);
  }
}

function initEntryFormFeedback() {
  const form = document.querySelector('form.rg-form');
  if (!form) return;

  // 親オリジンをhiddenにセット
  const originField = document.getElementById('origin-field');
  if (originField) originField.value = location.origin;

  const resultEl = document.getElementById('entry-result');
  const submitBtn = document.getElementById('submit-btn');

  // 送信開始時（多重送信防止＆状態表示）
  form.addEventListener('submit', () => {
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '送信中…'; }
    if (resultEl)  { resultEl.style.display = 'block'; resultEl.textContent = '送信中…'; }

    // 応答が来なかった場合の保険（10秒でエラー表示）
    clearTimeout(initEntryFormFeedback._t);
    initEntryFormFeedback._t = setTimeout(() => {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '送信する'; }
      if (resultEl)  { resultEl.style.display = 'block'; resultEl.textContent = '送信が混み合っています。しばらくして再度お試しください。'; }
    }, 10000);
  });

  // GAS からの postMessage を受信
  window.addEventListener('message', (ev) => {
    // 送信元のオリジンを確認（script.google.com / script.googleusercontent.com）
    const o = ev.origin;
    const okOrigin = /^https:\/\/script\.google(usercontent)?\.com$/i.test(new URL(o).origin);
    if (!okOrigin) return;

    clearTimeout(initEntryFormFeedback._t);

    const data = ev.data || {};
    if (data.ok) {
      // 成功：フォームをリセットしてメッセージ表示
      form.reset();
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '送信する'; }
      if (resultEl)  { resultEl.style.display = 'block'; resultEl.textContent = '送信ありがとうございました。担当よりご連絡します。'; }
      resultEl && resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // 失敗：エラーメッセージ
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '送信する'; }
      if (resultEl)  { resultEl.style.display = 'block'; resultEl.textContent = '送信に失敗しました。時間をおいて再度お試しください。'; }
      console.error('Entry submit error:', data.error);
    }
  });
}

function setupConsentGate(){
  const agree = document.getElementById('consent');
  const submit = document.getElementById('submit-btn');
  const label = document.querySelector('.rg-consent');
  if (!agree || !submit || !label) return;

  const sync = () => {
    if (agree.checked){ submit.disabled = false; label.classList.remove('invalid'); }
    else { submit.disabled = true; }
  };
  agree.addEventListener('change', sync);
  submit.addEventListener('click', (e) => {
    if (!agree.checked){ e.preventDefault(); label.classList.add('invalid'); }
  });
  sync();
}

function setupPrivacyModal(){
  const open = document.getElementById('open-privacy');
  const modal = document.getElementById('privacy-modal');
  const close = document.getElementById('close-privacy');
  if (!open || !modal || !close) return;

  const show = () => { modal.classList.add('show'); document.body.classList.add('no-scroll'); };
  const hide = () => { modal.classList.remove('show'); document.body.classList.remove('no-scroll'); };

  open.addEventListener('click', (e) => { e.preventDefault(); show(); });
  close.addEventListener('click', hide);
  modal.addEventListener('click', (e) => { if (e.target === modal) hide(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('show')) hide(); });
}
