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
    document.body.classList.add('no-scroll');  // スクロールロック
    btn.setAttribute('aria-expanded', 'true');
  };
  const hide = () => {
    menu.classList.remove('show');
    document.body.classList.remove('no-scroll');
    btn.setAttribute('aria-expanded', 'false');
  };

  btn.addEventListener('click', open);
  if(close) close.addEventListener('click', hide);

  // メニュー内リンクを押したら閉じる
  menu.addEventListener('click', (e) => {
    if(e.target.closest('a')) hide();
  });

  // Escで閉じる
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') hide();
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
  showHeroImage(0);
  // 1枚しか無ければ切替を回さない（無駄な再描画を防ぐ）
  if (images.length <= 1) return;
  // 一定間隔で切り替え
  setInterval(() => {
    currentIndex = (currentIndex + 1) % images.length;
    showHeroImage(currentIndex);
  }, SLIDE_INTERVAL);
}

// 創業年数計算
function initCompanyYears() {
  const established = 1964;
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
  let waitingForGasMessage = false;

  // 送信開始時（多重送信防止＆状態表示）
  form.addEventListener('submit', () => {
    trackMarketingEvent('recruit_form_submit_start');
    waitingForGasMessage = true;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '送信中…'; }
    if (resultEl)  { resultEl.style.display = 'block'; resultEl.textContent = '送信中…'; }

    // iframeのloadではなく、GAS側HTMLからのpostMessageだけを成功判定に使う。
    // GASのメール送信・スプレッドシート保存が遅い時に備え、失敗とは断定しない。
    clearTimeout(initEntryFormFeedback._t);
    initEntryFormFeedback._t = setTimeout(() => {
      waitingForGasMessage = false;
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '送信する'; }
      if (resultEl)  { resultEl.style.display = 'block'; resultEl.textContent = '送信結果の確認に時間がかかっています。応募が届いている可能性がありますので、再送前にお電話でも確認できます。'; }
    }, 30000);
  });

  // GAS からの postMessage を受信
  window.addEventListener('message', (ev) => {
    if (!waitingForGasMessage) return;
    // 送信元のオリジンを確認（script.google.com / script.googleusercontent.com）
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
      // 成功：フォームをリセットしてメッセージ表示
      form.reset();
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '送信する'; }
      if (resultEl)  { resultEl.style.display = 'block'; resultEl.textContent = '送信ありがとうございました。担当よりご連絡します。'; }
      resultEl && resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      trackMarketingEvent('recruit_form_submit_error', { error_message: String(data.error || '') });
      // 失敗：エラーメッセージ
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
  enhanceArticleTags();
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
    .guide-grid,.column-card-grid,.stock-grid{align-items:stretch}
    .section-faq{background:linear-gradient(180deg,rgba(96,165,250,.06),rgba(34,211,238,.05)),var(--wash);border-top:1px solid rgba(226,232,240,.7);border-bottom:1px solid rgba(226,232,240,.7)}
    .section-company.skin-white{background:var(--paper)}
    .guide-card,.column-card{display:flex;flex-direction:column;gap:var(--flow-sm,.75rem)}
    .guide-card p,.column-card p{margin:0;line-height:1.8}
    .guide-card p:has(.recruit-cta){text-align:center;margin-top:auto;padding-top:var(--flow-lg,1.65rem)}
    .guide-card .recruit-cta{align-self:center;justify-content:center;color:#0f3f73;background:#fff;border:1px solid rgba(96,165,250,.45);box-shadow:0 8px 20px rgba(15,23,42,.07)}
    .guide-card .recruit-cta::after{color:#fff;background:linear-gradient(135deg,var(--sky),var(--mint));border-radius:999px;display:inline-grid;place-items:center;width:1.35rem;height:1.35rem;font-size:1.05rem}
    .guide-card--accent{border-color:rgba(96,165,250,.48);background:linear-gradient(180deg,rgba(239,248,255,.92),rgba(255,255,255,1));box-shadow:0 14px 32px rgba(37,99,235,.09)}
    .stock-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;align-items:stretch}
    .stock-card{border:1px solid var(--line);border-radius:12px;background:#fff;box-shadow:var(--shadow);overflow:hidden;display:flex;flex-direction:column;height:100%}
    .stock-card>a{display:block}
    .stock-card img{width:100%;aspect-ratio:4/3;object-fit:cover;background:#e5e7eb}
    .stock-card__body{padding:1rem;display:flex;flex-direction:column;flex:1}
    .stock-card__body h3{font-size:1rem;margin:0 0 .4rem}
    .stock-card__meta{color:#64748b;font-size:.9rem;margin:0 0 .75rem}
    .stock-card__price{color:var(--sky);font-weight:800;margin:0 0 .7rem}
    .stock-card__link{display:inline-flex;color:#2563eb;font-weight:700;font-size:.9rem;margin-top:auto;align-self:center;text-align:center;justify-content:center}
    .stock-card--fallback .stock-card__body{min-height:0;gap:.85rem}
    .stock-card--fallback .stock-card__body h3{min-height:0;margin:0}
    .stock-card--fallback .stock-card__meta{margin:0}
    .stock-card--fallback .stock-card__link{margin-top:.25rem;padding-top:0}
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
      if (a.textContent.trim() === '事業案内' || a.textContent.trim() === '事業内容') a.textContent = 'サービス';
      if (a.textContent.trim() === '企業TOP' || a.textContent.trim() === '企業トップ') a.textContent = 'TOP';
      if (a.textContent.trim() === '採用TOP') a.textContent = '採用トップ';
    });
    if (!isRecruitPage && !links.some((a) => (a.getAttribute('href') || '').includes('#faq') || a.textContent.trim() === 'よくある質問')) {
      const column = links.find((a) => /#column$|column\/?$/.test(a.getAttribute('href') || ''));
      if (column) {
        const li = document.createElement('li');
        li.innerHTML = '<a href="/#faq">よくある質問</a>';
        column.closest('li').after(li);
      }
    }
    if (!links.some((a) => (a.getAttribute('href') || '').includes('used-cars') || a.textContent.trim() === '車を買う')) {
      const service = links.find((a) => /#service$/.test(a.getAttribute('href') || ''));
      if (service) {
        const li = document.createElement('li');
        li.innerHTML = '<a href="/used-cars/">車を買う</a>';
        service.closest('li').after(li);
      }
    }
    const navRank = (item) => {
      const link = item.querySelector('a');
      const href = link?.getAttribute('href') || '';
      const text = link?.textContent.trim() || '';
      if (text === 'TOP' || href === '/' || href === '../' || href === './index.html') return 0;
      if (href.endsWith('#service') || text === 'サービス') return 1;
      if (href.includes('used-cars') || href.endsWith('#sales') || text === '車を買う') return 2;
      if (href.endsWith('#column') || /column\/?$/.test(href) || text === 'お役立ち情報') return 3;
      if (href.endsWith('#faq') || text === 'よくある質問') return 4;
      if (href.endsWith('#flow') || text === '作業の流れ') return 5;
      if (href.endsWith('#works') || text === '施工事例') return 6;
      if (href.includes('recruit') || text === '採用情報' || text === '採用トップ') return 7;
      if (href.endsWith('#company') || text === '会社案内') return 8;
      if (href.startsWith('tel:') || text === 'お問い合わせ') return 9;
      return 99;
    };
    Array.from(list.children)
      .sort((a, b) => navRank(a) - navRank(b))
      .forEach((item) => list.appendChild(item));
  });
}

function enhanceHomeSalesAndColumns() {
  if (!document.body || !document.getElementById('hero')) return;
  if (!document.getElementById('sales')) {
    const localGuide = document.getElementById('local-guide');
    const section = document.createElement('section');
    section.id = 'sales';
    section.className = 'section section-sales skin-white';
    section.setAttribute('role', 'region');
    section.setAttribute('aria-labelledby', 'sales-title');
    section.innerHTML = `
      <div class="container">
        <h2 class="section-title" id="sales-title">車の購入相談</h2>
        <p class="section-subtitle">掲載在庫だけでなく、条件から中古車を探す相談もできます。新車は国内全メーカー相談可能です。</p>
        <div class="guide-grid">
          <article class="guide-card guide-card--accent"><h3>条件から中古車を探す</h3><p>業者専用オークション等も活用し、仕入れ後の点検・整備・板金塗装まで見てご提案できます。掲載在庫に希望の車がない時ほどご相談ください。</p></article>
          <article class="guide-card"><h3>中古車在庫</h3><p>掲載在庫はグーネットで更新しています。気になる車は、来店前に電話で在庫状況をご確認ください。</p></article>
          <article class="guide-card"><h3>新車相談</h3><p>軽自動車、コンパクト、ミニバン、商用車まで、用途・予算・納期に合わせて国内メーカーからご提案します。</p></article>
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
        <article class="column-card"><p class="column-card__date">2026.07.04</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">板金塗装</span><span class="tag-pill tag-pill--subtle">修理判断</span></div><h3><a href="/column/bumper-repair-or-replace/">バンパーの擦りキズは修理と交換どちらがいい？</a></h3><p>キズの深さ、へこみ、割れ、取付部分の状態から、修理か交換かを判断するポイントを解説します。</p></article>
        <article class="column-card"><p class="column-card__date">2026.06.23</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">保険修理</span><span class="tag-pill tag-pill--subtle">事故修理</span></div><h3><a href="/column/insurance-repair-customer-flow/">保険修理でお客様がやること・工場が手伝えること</a></h3><p>保険会社との確認、修理内容、代車、納車までの役割分担を整理しました。</p></article>
        <article class="column-card"><p class="column-card__date">2026.06.08</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">中古車相談</span><span class="tag-pill tag-pill--subtle">条件相談</span></div><h3><a href="/column/used-car-order-budget/">予算内で中古車を探すなら掲載在庫だけで決めない方がいい？</a></h3><p>予算、用途、納期から中古車探しを相談するメリットを整理しました。</p></article>
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
        <article class="rg-card"><p class="column-card__date">2026.06.12</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">働き方</span><span class="tag-pill tag-pill--subtle">整備士求人</span></div><h4 class="rg-card__title"><a href="/recruit-column/work-life/">整備士として無理なく働く職場選び</a></h4><p class="rg-card__text">休日・残業・資格取得支援など、長く働ける職場を見極める観点を紹介します。</p></article>
        <article class="rg-card"><p class="column-card__date">見学歓迎</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">応募前相談</span><span class="tag-pill tag-pill--subtle">職場見学</span></div><h4 class="rg-card__title"><a href="tel:0849761000">まずは電話で問い合わせる</a></h4><p class="rg-card__text">応募前の見学や仕事内容の確認も歓迎しています。まずはお電話でご相談ください。</p></article>
      </div>
    </div>`;
  requirements.before(section);
}

function enhanceArticleTags() {
  const header = document.querySelector('.article__header');
  if (!header || header.querySelector('.article__tags')) return;

  const articleTags = {
    '/column/insurance-repair-customer-flow/': ['保険修理', '事故修理'],
    '/column/bankin-direct-repair-shop/': ['板金塗装', 'キズ・へこみ'],
    '/column/bumper-repair-or-replace/': ['板金塗装', '修理判断'],
    '/column/insurance-repair-loaner-delivery/': ['保険修理', '代車'],
    '/column/insurance-repair-ja-kyosai/': ['保険相談', 'JA共済'],
    '/column/repair-pickup-loaner-support/': ['修理相談', '代車'],
    '/column/used-car-order-consultation/': ['中古車相談', '注文販売'],
    '/column/used-car-order-budget/': ['中古車相談', '条件相談'],
    '/column/shaken-fukuyama/': ['車検', '整備'],
    '/column/dealer-vs-local-repair/': ['車検', '修理相談'],
    '/column/used-car-repair-shop-merit/': ['中古車相談', '整備付き販売'],
    '/column/bankin-paint-insurance/': ['板金塗装', '保険修理'],
    '/column/repair-loaner-car/': ['板金塗装', '代車'],
    '/column/new-car-aftermarket-parts/': ['新車相談', '用品取付'],
    '/column/bankin-price-varies/': ['板金塗装', '修理費用'],
    '/column/used-car-checkpoints/': ['中古車相談', '購入前確認'],
    '/column/new-car-domestic-makers/': ['新車相談', '国内メーカー'],
    '/column/maintenance-oil-tire/': ['メンテナンス', 'オイル・タイヤ'],
    '/column/repair-pickup-delivery/': ['修理相談', '引き取り・納車'],
    '/column/accident-repair-first/': ['事故修理', '保険相談'],
    '/recruit-column/salary-vs-work-life/': ['働き方', '年収比較'],
    '/recruit-column/factory-tour-questions/': ['職場見学', '応募前確認'],
    '/recruit-column/low-overtime-mechanic/': ['働き方', '残業少なめ'],
    '/recruit-column/inexperienced-mechanic/': ['未経験', '資格取得支援'],
    '/recruit-column/large-company-vs-local-shop/': ['職場選び', '働き方比較'],
    '/recruit-column/bankin-paint-inexperienced/': ['板金塗装求人', '未経験'],
    '/recruit-column/bankin-paint-workplace-equipment/': ['板金塗装求人', '設備'],
    '/recruit-column/work-life/': ['働き方', '整備士求人']
  };

  const path = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;
  const tags = articleTags[path];
  if (!tags) return;

  const wrap = document.createElement('div');
  wrap.className = 'article__tags';
  wrap.setAttribute('aria-label', '記事タグ');
  tags.forEach((tag, index) => {
    const pill = document.createElement('span');
    pill.className = index === 0 ? 'tag-pill' : 'tag-pill tag-pill--subtle';
    pill.textContent = tag;
    wrap.appendChild(pill);
  });

  const date = header.querySelector('.article__date');
  if (date) date.after(wrap);
  else header.prepend(wrap);
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
