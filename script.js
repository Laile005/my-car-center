document.addEventListener('DOMContentLoaded', () => {
  initCurrentYear();
  setupHamburgerMenu();
  startHeroSlideshow();
  initCompanyYears();
  initAgeSelect();
  initSiteEnhancements();
  initMarketingAnalytics();
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
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('nav-mobile');
  const close= document.getElementById('close-menu');

  if(!btn || !menu) return;

  const open = () => {
    menu.classList.add('show');
    document.body.classList.add('no-scroll');
    btn.setAttribute('aria-expanded', 'true');
  };
  const hide = () => {
    menu.classList.remove('show');
    document.body.classList.remove('no-scroll');
    btn.setAttribute('aria-expanded', 'false');
  };

  btn.addEventListener('click', open);
  if(close) close.addEventListener('click', hide);

  menu.addEventListener('click', (e) => {
    if(e.target.closest('a')) hide();
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') hide();
  });
}

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
  showHeroImage(0);
  if (images.length <= 1) return;
  setInterval(() => {
    currentIndex = (currentIndex + 1) % images.length;
    showHeroImage(currentIndex);
  }, SLIDE_INTERVAL);
}

function initCompanyYears() {
  const established = 1964;
  const yearsEl = document.getElementById('company-years');
  if (yearsEl) {
    const now = new Date().getFullYear();
    yearsEl.textContent = now - established;
  }
}

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

  const originField = document.getElementById('origin-field');
  if (originField) originField.value = location.origin;

  const resultEl = document.getElementById('entry-result');
  const submitBtn = document.getElementById('submit-btn');
  let waitingForGasMessage = false;

  form.addEventListener('submit', () => {
    trackMarketingEvent('recruit_form_submit_start');
    waitingForGasMessage = true;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '送信中…'; }
    if (resultEl)  { resultEl.style.display = 'block'; resultEl.textContent = '送信中…'; }

    clearTimeout(initEntryFormFeedback._t);
    initEntryFormFeedback._t = setTimeout(() => {
      waitingForGasMessage = false;
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '送信する'; }
      if (resultEl)  { resultEl.style.display = 'block'; resultEl.textContent = '送信結果の確認に時間がかかっています。応募が届いている可能性がありますので、再送前にお電話でも確認できます。'; }
    }, 30000);
  });

  window.addEventListener('message', (ev) => {
    if (!waitingForGasMessage) return;
    let okOrigin = false;
    try {
      okOrigin = /^https:\/\/script\.google(usercontent)?\.com$/i.test(new URL(ev.origin).origin);
    } catch (_) {
      okOrigin = false;
    }
    if (!okOrigin) return;

    clearTimeout(initEntryFormFeedback._t);
    waitingForGasMessage = false;

    const data = ev.data || {};
    if (data.ok) {
      trackMarketingEvent('recruit_form_submit_success');
      form.reset();
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '送信する'; }
      if (resultEl)  { resultEl.style.display = 'block'; resultEl.textContent = '送信ありがとうございました。担当よりご連絡します。'; }
      resultEl && resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      trackMarketingEvent('recruit_form_submit_error', { error_message: String(data.error || '') });
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '送信する'; }
      if (resultEl)  { resultEl.style.display = 'block'; resultEl.textContent = '送信に失敗しました。時間をおいて再度お試しください。'; }
      console.error('Entry submit error:', data.error);
    }
  });
}

function initSiteEnhancements() {
  addGlobalSalesStyles();
  enhanceGlobalNavigation();
  enhanceHomeSalesAndColumns();
  enhanceRecruitColumns();
}

function initMarketingAnalytics() {
  if (document.getElementById('mcc-analytics')) return;
  const script = document.createElement('script');
  script.id = 'mcc-analytics';
  script.src = '/analytics.js';
  script.defer = true;
  document.head.appendChild(script);
}

function trackMarketingEvent(name, params = {}) {
  window.MCC_EVENT_QUEUE = window.MCC_EVENT_QUEUE || [];
  if (typeof window.MCCTrackEvent === 'function') {
    window.MCCTrackEvent(name, params);
  } else {
    window.MCC_EVENT_QUEUE.push({ name, params });
  }
}

function addGlobalSalesStyles() {
  if (document.getElementById('codex-sales-styles')) return;
  const style = document.createElement('style');
  style.id = 'codex-sales-styles';
  style.textContent = `
    .stock-status{text-align:center;color:#475569;margin:-1.3rem auto 1.3rem}
    .stock-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}
    .stock-card{border:1px solid var(--line);border-radius:12px;background:#fff;box-shadow:var(--shadow);overflow:hidden}
    .stock-card img{width:100%;aspect-ratio:4/3;object-fit:cover;background:#e5e7eb}
    .stock-card__body{padding:1rem}
    .stock-card__body h3{font-size:1rem;margin:0 0 .4rem}
    .stock-card__meta{color:#64748b;font-size:.9rem;margin:0 0 .35rem}
    .stock-card__price{color:var(--sky);font-weight:800;margin:0 0 .7rem}
    .stock-card__link{display:inline-flex;color:#2563eb;font-weight:700;font-size:.9rem}
    @media (max-width:900px){.stock-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function enhanceGlobalNavigation() {
  const isRecruitPage = !!document.querySelector('form.rg-form') || location.pathname.includes('/recruit');
  document.querySelectorAll('.nav-desktop ul, .nav-mobile ul').forEach((list) => {
    const links = Array.from(list.querySelectorAll('a'));
    links.forEach((a) => {
      if (/column\/?$/.test(a.getAttribute('href') || '') && a.textContent.trim() === 'コラム') {
        if (isRecruitPage) {
          a.textContent = '求職者向け情報';
          a.setAttribute('href', '#recruit-column');
        } else {
          a.textContent = 'お役立ち情報';
        }
      }
      if (a.textContent.trim() === '企業TOP' || a.textContent.trim() === '企業トップ') a.textContent = 'TOP';
      if (a.textContent.trim() === '採用TOP') a.textContent = '採用トップ';
    });
    if (!links.some((a) => (a.getAttribute('href') || '').includes('used-cars') || a.textContent.trim() === '車を買う')) {
      const service = links.find((a) => /#service$/.test(a.getAttribute('href') || ''));
      if (service) {
        const li = document.createElement('li');
        li.innerHTML = '<a href="/used-cars/">車を買う</a>';
        service.closest('li').after(li);
      }
    }
    const isHomePage = location.pathname === '/' || /\/index\.html$/.test(location.pathname);
    if (isHomePage) {
      const order = ['#service', '#sales', '#column', '#flow', '#works', 'recruit', '#company', 'tel:0849761000'];
      Array.from(list.children)
        .sort((a, b) => {
          const ah = a.querySelector('a')?.getAttribute('href') || '';
          const bh = b.querySelector('a')?.getAttribute('href') || '';
          const ai = order.findIndex((key) => ah === key || ah.endsWith(key));
          const bi = order.findIndex((key) => bh === key || bh.endsWith(key));
          return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
        })
        .forEach((item) => list.appendChild(item));
    }
  });
}

function enhanceHomeSalesAndColumns() {
  if (!document.body || !document.getElementById('hero')) return;
  if (!document.getElementById('sales')) {
    const localGuide = document.getElementById('local-guide');
    const section = document.createElement('section');
    section.id = 'sales';
    section.className = 'section section-sales skin-paper';
    section.setAttribute('role', 'region');
    section.setAttribute('aria-labelledby', 'sales-title');
    section.innerHTML = `
      <div class="container">
        <h2 class="section-title" id="sales-title">車の購入相談</h2>
        <p class="section-subtitle">スズキの看板が目印ですが、新車は国内全メーカー相談可能です。中古車はグーネット掲載在庫も確認できます。</p>
        <div class="guide-grid">
          <article class="guide-card"><h3>新車相談</h3><p>軽自動車、コンパクト、ミニバン、商用車まで、用途・予算・納期に合わせて国内メーカーからご提案します。</p></article>
          <article class="guide-card"><h3>中古車在庫</h3><p>掲載在庫はグーネットで更新しています。気になる車は、来店前に電話で在庫状況をご確認ください。</p></article>
          <article class="guide-card"><h3>購入後も安心</h3><p>納車後の点検、車検、整備、板金塗装まで同じ窓口で相談できます。</p></article>
        </div>
        <div class="section-link"><a href="/used-cars/" class="link-with-arrow">在庫車・購入相談を見る <span class="arrow">›</span></a></div>
      </div>`;
    if (localGuide) localGuide.before(section);
  }

  const column = document.getElementById('column');
  if (column) {
    const title = column.querySelector('.section-title');
    const subtitle = column.querySelector('.section-subtitle');
    const grid = column.querySelector('.column-card-grid');
    if (title) title.textContent = 'カーライフお役立ち情報';
    if (subtitle) subtitle.textContent = '車検・修理・保険・購入相談のことを、地域のお客様に向けてわかりやすく発信します。';
    if (grid) {
      grid.innerHTML = `
        <article class="column-card"><p class="column-card__date">2026.07.02</p><h3><a href="/column/shaken-fukuyama/">車検を受ける前に確認したいこと</a></h3><p>費用・日数・必要書類・整備内容を、予約前に見ておきたいポイントに絞って整理しました。</p></article>
        <article class="column-card"><p class="column-card__date">2026.06.28</p><h3><a href="/column/used-car-checkpoints/">中古車を選ぶ前に確認したいこと</a></h3><p>価格だけで決める前に、整備履歴・保証・購入後のメンテナンスを確認しましょう。</p></article>
        <article class="column-card"><p class="column-card__date">2026.06.24</p><h3><a href="/column/bankin-paint-insurance/">板金塗装と保険修理の流れ</a></h3><p>キズ・へこみ・事故修理で迷いやすい、見積りから納車までの流れをまとめています。</p></article>
      `;
    }
    const listLink = column.querySelector('.section-link a');
    if (listLink) listLink.innerHTML = 'お役立ち情報を見る <span class="arrow">›</span>';
  }
}

function enhanceRecruitColumns() {
  const requirements = document.getElementById('requirements');
  if (!requirements || document.getElementById('recruit-column')) return;
  const section = document.createElement('section');
  section.className = 'rg-section';
  section.id = 'recruit-column';
  section.innerHTML = `
    <div class="rg-container">
      <h2 class="rg-sec__eyebrow">CAREER GUIDE</h2>
      <h3 class="rg-sec__title">求職者向け情報</h3>
      <div class="rg-cards rg-cards--2">
        <article class="rg-card"><p class="column-card__date">2026.06.12</p><h4 class="rg-card__title"><a href="/recruit-column/work-life/">整備士として無理なく働く職場選び</a></h4><p class="rg-card__text">休日・残業・資格取得支援など、長く働ける職場を見極める観点を紹介します。</p></article>
        <article class="rg-card"><p class="column-card__date">見学歓迎</p><h4 class="rg-card__title"><a href="#entry">まずは話を聞くだけでもOK</a></h4><p class="rg-card__text">応募前の見学や仕事内容の確認も歓迎しています。フォームまたはお電話でご相談ください。</p></article>
      </div>
    </div>`;
  requirements.before(section);
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
