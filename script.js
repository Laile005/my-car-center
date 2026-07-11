document.addEventListener('DOMContentLoaded', () => {
  initPageIdentity();
  initSharedHeader();
  initSharedFooter();
  initCurrentYear();
  setupHamburgerMenu();
  startHeroSlideshow();
  initCompanyYears();
  initAgeSelect();
  initSiteEnhancements();
  initDesktopPhonePrompt();
  initClickableCards();
  initMarketingAnalytics();
  initArticlePagination();
  initEntryFormFeedback();
  setupConsentGate();
  setupPrivacyModal();
});

function initPageIdentity() {
  const body = document.body;
  if (!body) return;

  const parts = location.pathname.split('/').filter(Boolean);
  const knownPages = [
    'repair-maintenance', 'bankin-toso', 'shaken', 'maintenance', 'new-cars',
    'used-cars', 'business', 'column', 'recruit-column', 'company-guide',
    'partner-repair-preview', 'analytics-optout'
  ];
  const first = knownPages.find((name) => parts.includes(name))
    || (location.pathname.endsWith('/recruit') || location.pathname.endsWith('/recruit.html') ? 'recruit' : 'home');
  const safeName = first.replace(/[^a-z0-9-]/gi, '-');
  body.classList.add(`page-${safeName}`);

  const pageIndex = parts.indexOf(first);
  const columnSlug = pageIndex >= 0 ? (parts[pageIndex + 1] || '') : '';
  if (first === 'column' && columnSlug && columnSlug !== 'index.html') {
    body.classList.add('page-article');
    const slug = columnSlug;
    if (/used-car|new-vs-used/.test(slug)) body.classList.add('article-tone-used');
    else if (/insurance|bankin|bumper|accident|repair/.test(slug)) body.classList.add('article-tone-repair');
    else if (/oil|tire|maintenance|shaken|dealer/.test(slug)) body.classList.add('article-tone-maintenance');
    else if (/new-car/.test(slug)) body.classList.add('article-tone-sales');
  }

  if (first === 'recruit-column') {
    body.classList.add('page-article', 'article-tone-recruit');
  }
}

function initSharedHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const currentPath = location.pathname.replace(/\/+$/, '');
  const isRecruit = currentPath.endsWith('/recruit')
    || currentPath.endsWith('/recruit.html')
    || currentPath.includes('/recruit-column/');

  const mainItems = [
    { label: 'TOP', href: '/#hero' },
    { label: '新車', href: '/new-cars/' },
    { label: '中古車', href: '/used-cars/' },
    { label: '整備・修理', href: '/repair-maintenance/' },
    { label: 'お役立ち情報', href: '/column/' },
    { label: '法人のお客様', href: '/business/' },
    { label: '採用情報', href: '/recruit' },
    {
      label: '会社情報',
      href: '/#company',
      children: [
        { label: 'よくある質問', href: '/#faq' },
        { label: '作業の流れ', href: '/#flow' },
        { label: '施工事例', href: '/#works' },
        { label: '会社案内', href: '/#company' }
      ]
    }
  ];

  const recruitItems = [
    { label: 'TOP', href: '/' },
    { label: '仕事内容', href: '/recruit#job' },
    { label: '働き方', href: '/recruit#about' },
    { label: '先輩の声', href: '/recruit#voice' },
    { label: '募集要項', href: '/recruit#requirements' },
    { label: '採用コラム', href: '/recruit#recruit-column' },
    { label: 'カジュアル面談', href: '/recruit#entry' }
  ];

  const items = isRecruit ? recruitItems : mainItems;
  const logoHref = '/';
  const logoSrc = '/image/Logo.webp';
  const desktopLinks = items.map((item) => {
    const children = item.children || [];
    if (!children.length) return `<li><a href="${item.href}">${item.label}</a></li>`;
    return `<li class="nav-item--has-menu"><a href="${item.href}">${item.label}</a><ul class="nav-submenu">${children.map((child) => `<li><a href="${child.href}">${child.label}</a></li>`).join('')}</ul></li>`;
  }).join('');
  const mobileLinks = `${items.map((item) => {
    const children = item.children || [];
    return `<li><a href="${item.href}">${item.label}</a>${children.length ? `<ul class="nav-mobile-submenu">${children.map((child) => `<li><a href="${child.href}">${child.label}</a></li>`).join('')}</ul>` : ''}</li>`;
  }).join('')}<li><a href="tel:0849761000">お問い合わせ</a></li>`;

  header.innerHTML = `
    <div class="header-inner">
      <a href="${logoHref}" class="logo logo--edge"><img src="${logoSrc}" alt="山本マイカーセンターのロゴ"></a>
      <nav class="nav-desktop nav-desktop--edge" aria-label="グローバルナビゲーション">
        <ul>${desktopLinks}</ul>
      </nav>
      <div class="hamburger hamburger--edge" id="hamburger" aria-expanded="false"><span></span><span></span><span></span></div>
    </div>
    <nav class="nav-mobile" id="nav-mobile" aria-label="モバイルメニュー">
      <div class="close-menu" id="close-menu">&times;</div>
      <ul>${mobileLinks}</ul>
    </nav>
  `;
}

function initSharedFooter() {
  const footer = document.querySelector('.footer');
  if (!footer) return;

  const footerGroups = [
    {
      title: '車のご相談',
      links: [
        ['新車', '/new-cars/'],
        ['中古車', '/used-cars/'],
        ['整備・修理', '/repair-maintenance/'],
        ['お役立ち情報', '/column/']
      ]
    },
    {
      title: '会社情報',
      links: [
        ['法人のお客様', '/business/'],
        ['よくある質問', '/#faq'],
        ['作業の流れ', '/#flow'],
        ['施工事例', '/#works'],
        ['会社情報', '/#company'],
      ]
    },
    {
      title: '採用情報',
      links: [
        ['仕事内容', '/recruit#job'],
        ['働き方', '/recruit#about'],
        ['先輩の声', '/recruit#voice'],
        ['募集要項', '/recruit#requirements'],
        ['求職者向け情報', '/recruit#recruit-column'],
        ['カジュアル面談', '/recruit#entry']
      ]
    }
  ];

  const groupsMarkup = footerGroups.map((group) => `
    <nav class="footer-nav-group" aria-label="${group.title}">
      <h2>${group.title}</h2>
      <ul>${group.links.map(([label, href]) => `<li><a href="${href}">${label}</a></li>`).join('')}</ul>
    </nav>
  `).join('');

  footer.className = 'footer footer--shared';
  footer.innerHTML = `
    <div class="footer-inner">
      <div class="footer-brand">
        <a class="footer-brand__logo" href="/" aria-label="山本マイカーセンター トップへ"><img src="/image/Logo.webp" alt="山本マイカーセンターのロゴ"></a>
        <p>〒720-1144<br>広島県福山市駅家町坊寺174-2</p>
        <a class="footer-brand__phone" href="tel:0849761000">084-976-1000</a>
      </div>
      <div class="footer-navs">${groupsMarkup}</div>
    </div>
    <div class="footer-copy">&copy; <span id="year"></span> 山本マイカーセンター株式会社</div>
  `;
}

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
      trackMarketingEvent('recruit_form_submit_error', { error_source: 'gas_response' });
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

function initArticlePagination() {
  const section = document.getElementById('all-articles');
  if (!section) return;

  const grid = section.querySelector('.column-card-grid');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('.column-card'));
  const pageSize = 12;
  if (cards.length <= pageSize) return;

  const pager = document.createElement('nav');
  pager.className = 'article-pagination';
  pager.setAttribute('aria-label', '記事一覧のページ切り替え');

  const pageCount = Math.ceil(cards.length / pageSize);
  let currentPage = 1;

  function render() {
    cards.forEach((card, index) => {
      const page = Math.floor(index / pageSize) + 1;
      card.hidden = page !== currentPage;
    });

    pager.innerHTML = Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1;
      const current = page === currentPage ? ' aria-current="page"' : '';
      return `<button type="button" class="article-pagination__button"${current} data-page="${page}">${page}</button>`;
    }).join('');
  }

  pager.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-page]');
    if (!button) return;
    currentPage = Number(button.dataset.page);
    render();
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  grid.after(pager);
  render();
}

function trackMarketingEvent(name, params = {}) {
  window.MCC_EVENT_QUEUE = window.MCC_EVENT_QUEUE || [];
  if (typeof window.MCCTrackEvent === 'function') {
    window.MCCTrackEvent(name, params);
  } else {
    window.MCC_EVENT_QUEUE.push({ name, params });
  }
}

function initDesktopPhonePrompt() {
  const phoneLinks = Array.from(document.querySelectorAll('a[href^="tel:"]'));
  if (!phoneLinks.length) return;

  const canCallDirectly = () => {
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const narrowScreen = window.matchMedia('(max-width: 760px)').matches;
    return coarsePointer || narrowScreen;
  };

  const number = '084-976-1000';
  const plainNumber = '0849761000';
  const modal = document.createElement('div');
  modal.className = 'phone-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'phone-modal-title');
  modal.innerHTML = `
    <div class="phone-modal__panel">
      <button class="phone-modal__close" type="button" aria-label="閉じる">&times;</button>
      <p class="phone-modal__eyebrow">お電話でご相談ください</p>
      <h2 id="phone-modal-title">山本マイカーセンター株式会社</h2>
      <p class="phone-modal__number"><a href="tel:${plainNumber}">${number}</a></p>
      <p class="phone-modal__hours">営業時間 8:30-17:30 / 日曜・祝日定休</p>
      <p class="phone-modal__note">中古車探し、板金塗装、車検・整備の相談を承ります。PCからご覧の場合は、お手元の電話で上の番号へおかけください。</p>
      <div class="phone-modal__actions">
        <button class="phone-modal__dismiss" type="button">閉じる</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const closeBtn = modal.querySelector('.phone-modal__close');
  const dismissBtn = modal.querySelector('.phone-modal__dismiss');
  const show = () => {
    modal.classList.add('show');
    document.body.classList.add('no-scroll');
    closeBtn?.focus();
  };
  const hide = () => {
    modal.classList.remove('show');
    document.body.classList.remove('no-scroll');
  };

  phoneLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      if (canCallDirectly()) return;
      event.preventDefault();
      trackMarketingEvent('phone_prompt_open', { link_text: link.textContent.trim() });
      show();
    });
  });

  closeBtn?.addEventListener('click', hide);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) hide();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('show')) hide();
  });
  dismissBtn?.addEventListener('click', hide);
}

function initClickableCards() {
  const cardSelectors = '.column-card, .rg-card, .stock-card';
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented) return;
    if (event.target.closest('a, button, input, select, textarea, label')) return;

    const card = event.target.closest(cardSelectors);
    if (!card) return;

    const link = card.querySelector('a[href]');
    if (!link) return;

    event.preventDefault();
    trackMarketingEvent('card_area_click', {
      card_type: card.classList.contains('stock-card') ? 'stock' : card.classList.contains('rg-card') ? 'recruit' : 'column',
      link_url: link.getAttribute('href') || '',
      link_text: link.textContent.trim().slice(0, 80)
    });
    link.click();
  });
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
    .guide-card .recruit-cta::after{width:.38rem;height:.38rem;padding:0;border:0;border-right:2px solid currentColor;border-bottom:2px solid currentColor;border-radius:0;background:transparent;font-size:0;transform:rotate(-45deg) translate(-.03rem,.03rem)}
    .column-card-grid--editorial .column-card:first-child{background:linear-gradient(135deg,rgba(239,248,255,.98),rgba(255,255,255,1));border-color:rgba(96,165,250,.5)}
    .column-card{position:relative;overflow:hidden}
    .column-card:has(a[href]),.rg-card:has(a[href]),.stock-card:has(a[href]){cursor:pointer}
    .column-card::before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,var(--sky),var(--mint));opacity:.78}
    .guide-card--accent{border-color:rgba(96,165,250,.48);background:linear-gradient(180deg,rgba(239,248,255,.92),rgba(255,255,255,1));box-shadow:0 14px 32px rgba(37,99,235,.09)}
    .stock-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;align-items:stretch}
    .stock-card{border:1px solid var(--line);border-radius:12px;background:#fff;box-shadow:var(--shadow);overflow:hidden;display:flex;flex-direction:column;height:100%}
    .stock-card>a{display:block}
    .stock-card img{width:100%;aspect-ratio:4/3;object-fit:cover;background:#e5e7eb}
    .stock-card__body{padding:1rem;display:flex;flex-direction:column;flex:1}
    .stock-card__body h3{font-size:1rem;line-height:1.65;margin:0 0 .75rem}
    .stock-card__meta{color:#64748b;font-size:.9rem;line-height:1.6;margin:0 0 .9rem}
    .stock-card__price{color:var(--sky);font-weight:800;margin:0 0 .7rem}
    .stock-card__prices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.45rem;margin:0 0 .85rem;padding:.72rem;border:1px solid rgba(96,165,250,.28);border-radius:10px;background:#f8fbff}
    .stock-card__prices span{min-width:0}
    .stock-card__prices b{display:block;color:#64748b;font-size:.68rem;line-height:1.35;margin-bottom:.15rem}
    .stock-card__prices strong{display:block;color:var(--ink);font-size:.9rem;line-height:1.25;letter-spacing:0;white-space:nowrap}
    .stock-card__prices span:first-child strong{color:#e11d48;font-size:1.05rem}
    .stock-card__link{display:inline-flex;color:#2563eb;font-weight:700;font-size:.9rem;margin-top:auto;padding-top:1rem;align-self:center;text-align:center;justify-content:center}
    .stock-card--fallback .stock-card__body{min-height:0;gap:.85rem}
    .stock-card--fallback .stock-card__body h3{min-height:0;margin:0}
    .stock-card--fallback .stock-card__meta{margin:0}
    .stock-card--fallback .stock-card__link{margin-top:.25rem;padding-top:0}
    @media (max-width:900px){.stock-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function enhanceGlobalNavigation() {
  // Header content is generated by initSharedHeader().
  // Keep this function as a no-op so older page-specific markup cannot reorder or duplicate the shared navigation.
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
        <h2 class="section-title" id="sales-title">新車・中古車の購入相談</h2>
        <p class="section-subtitle">中古車は掲載在庫と条件からの車探しに対応しています。新車は国内全メーカーからご相談いただけます。</p>
        <div class="guide-grid">
          <article class="guide-card guide-card--accent"><h3>条件から中古車を探す</h3><p>業者専用オークション等も活用し、仕入れ後の点検・整備・板金塗装を行ってご提案します。掲載在庫に希望の車がない時ほどご相談ください。</p></article>
          <article class="guide-card"><h3>中古車在庫</h3><p>掲載在庫はグーネットで更新しています。気になる車は、来店前に電話で在庫状況をご確認ください。</p></article>
          <article class="guide-card"><h3>新車相談</h3><p>軽自動車、コンパクト、ミニバン、商用車まで、用途・予算・納期に合わせて国内メーカーからご提案します。</p></article>
        </div>
        <div class="section-link section-sales__links"><a href="/used-cars/" class="link-with-arrow">中古車を探す <span class="arrow">›</span></a><a href="/new-cars/" class="link-with-arrow">新車相談を見る <span class="arrow">›</span></a></div>
      </div>`;
    if (localGuide) localGuide.before(section);
  }

  // The home column section is now maintained directly in index.html.
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
        <article class="rg-card"><p class="column-card__date">最終更新 2026.06.12</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">働き方</span><span class="tag-pill tag-pill--subtle">整備士求人</span></div><h4 class="rg-card__title"><a href="/recruit-column/work-life/">整備士として無理なく働く職場選び</a></h4><p class="rg-card__text">休日・残業・資格取得支援など、長く働ける職場を見極める観点を紹介します。</p></article>
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
    '/column/repaired-history-used-car/': ['中古車相談', '修復歴'],
    '/column/used-car-before-repair-photo/': ['中古車相談', '修理前写真'],
    '/column/used-car-repair-shop-choice/': ['中古車相談', '整備付き販売'],
    '/column/oil-grade-car-model/': ['メンテナンス', 'オイル選び'],
    '/column/tire-battery-maintenance-signs/': ['メンテナンス', '消耗品'],
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
