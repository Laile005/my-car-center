(function () {
  function loadScriptOnce(src, id) {
    if (id && document.getElementById(id)) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      if (id) script.id = id;
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function sendEvent(name, params) {
    var payload = Object.assign({
      page_path: location.pathname,
      page_title: document.title,
      page_category: getPageCategory()
    }, params || {});

    if (typeof window.gtag === 'function') {
      window.gtag('event', name, payload);
    }
    if (typeof window.clarity === 'function') {
      window.clarity('event', name);
    }
  }

  window.MCCTrackEvent = sendEvent;

  function getPageCategory() {
    var path = location.pathname;
    if (path.indexOf('/recruit-column/') === 0) return 'recruit_column';
    if (path.indexOf('/column/') === 0) return 'customer_column';
    if (path.indexOf('/recruit') === 0) return 'recruit';
    if (path.indexOf('/used-cars/') === 0) return 'used_cars';
    if (path.indexOf('/bankin-toso/') === 0) return 'bankin_toso';
    if (path.indexOf('/shaken/') === 0) return 'shaken';
    if (path.indexOf('/maintenance/') === 0) return 'maintenance';
    if (path.indexOf('/new-cars/') === 0) return 'new_cars';
    return path === '/' ? 'home' : 'other';
  }

  function flushQueue() {
    var queue = window.MCC_EVENT_QUEUE || [];
    window.MCC_EVENT_QUEUE = [];
    queue.forEach(function (item) {
      sendEvent(item.name, item.params);
    });
  }

  function initClickTracking() {
    document.addEventListener('click', function (event) {
      var link = event.target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href') || '';
      var text = link.textContent.replace(/\s+/g, ' ').trim().slice(0, 80);
      var params = { link_text: text, link_url: href };

      if (href.indexOf('tel:') === 0) {
        sendEvent('phone_click', params);
      } else if (href.indexOf('goo-net.com') !== -1) {
        sendEvent('goo_net_click', params);
      } else if (link.closest('.column-card') || link.closest('.rg-card')) {
        sendEvent('article_card_click', params);
      } else if (link.classList.contains('recruit-cta') || link.classList.contains('link-with-arrow')) {
        sendEvent('cta_click', params);
      } else if (href.indexOf('/recruit') !== -1 || href === '#entry') {
        sendEvent('recruit_link_click', params);
      }
    });
  }

  function initScrollDepthTracking() {
    var sent = {};
    var marks = [25, 50, 75, 90];
    var onScroll = function () {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      var depth = Math.round((window.scrollY / scrollable) * 100);
      marks.forEach(function (mark) {
        if (depth >= mark && !sent[mark]) {
          sent[mark] = true;
          sendEvent('scroll_depth', { percent_scrolled: mark });
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initCtaLinkPresentation() {
    var style = document.createElement('style');
    style.textContent = [
      '.link-with-arrow{display:inline-flex;align-items:center;gap:.55rem;padding:.85rem 1.15rem;border-radius:999px;background:linear-gradient(135deg,#4aa3ff,#22c6d8);color:#fff!important;font-weight:700;text-decoration:none;box-shadow:0 12px 28px rgba(34,120,210,.22);transition:transform .18s ease,box-shadow .18s ease}',
      '.link-with-arrow .arrow{display:inline-grid;place-items:center;width:1.35em;height:1.35em;border-radius:999px;background:rgba(255,255,255,.22);line-height:1;font-size:1.1em}',
      '.link-with-arrow:hover{transform:translateY(-1px);box-shadow:0 16px 34px rgba(34,120,210,.28)}',
      '.section-title + .guide-grid{margin-top:1.35rem}'
    ].join('');
    document.head.appendChild(style);
  }

  function initHomeColumnFocus() {
    var column = document.getElementById('column');
    if (!column || !document.getElementById('hero')) return;
    var title = column.querySelector('.section-title');
    var subtitle = column.querySelector('.section-subtitle');
    var grid = column.querySelector('.column-card-grid');

    if (title) title.textContent = '板金塗装・修理のお役立ち情報';
    if (subtitle) {
      subtitle.textContent = 'キズ・へこみ修理、保険修理、車検、購入後の相談を、地域密着の整備工場目線でわかりやすく発信します。';
    }
    if (grid) {
      grid.innerHTML = [
        '<article class="column-card"><p class="column-card__date">2026.07.04</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">板金塗装</span><span class="tag-pill tag-pill--subtle">修理判断</span></div><h3><a href="/column/bumper-repair-or-replace/">バンパーの擦りキズは修理と交換どちらがいい？</a></h3><p>キズの深さ、へこみ、割れ、取付部分の状態から、修理か交換かを判断するポイントを解説します。</p></article>',
        '<article class="column-card"><p class="column-card__date">2026.06.23</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">保険修理</span><span class="tag-pill tag-pill--subtle">事故修理</span></div><h3><a href="/column/insurance-repair-customer-flow/">保険修理でお客様がやること・工場が手伝えること</a></h3><p>保険会社との確認、修理内容、代車、納車までの役割分担を整理しました。</p></article>',
        '<article class="column-card"><p class="column-card__date">2026.06.08</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">中古車相談</span><span class="tag-pill tag-pill--subtle">条件相談</span></div><h3><a href="/column/used-car-order-budget/">予算内で中古車を探すなら掲載在庫だけで決めない方がいい？</a></h3><p>予算、用途、納期から中古車探しを相談するメリットを整理しました。</p></article>'
      ].join('');
    }
  }

  function initHomeServiceLinks() {
    if (!document.getElementById('hero')) return;
    var serviceLinks = [
      { label: '修理・塗装', href: '/bankin-toso/', text: '板金塗装を詳しく見る' },
      { label: '車検・整備', href: '/shaken/', text: '車検・整備を詳しく見る' },
      { label: '新車・中古車販売', href: '/used-cars/', text: '中古車・購入相談を見る' }
    ];

    serviceLinks.forEach(function (item) {
      var row = Array.from(document.querySelectorAll('.svc-row')).find(function (candidate) {
        var kicker = candidate.querySelector('.svc-kicker');
        return kicker && kicker.textContent.trim() === item.label;
      });
      if (!row || Array.from(row.querySelectorAll('a[href]')).some(function (link) {
        return new URL(link.getAttribute('href'), location.origin).pathname === item.href;
      })) return;
      var body = row.querySelector('.svc-body');
      if (!body) return;
      var p = document.createElement('p');
      p.innerHTML = '<a class="recruit-cta" href="' + item.href + '">' + item.text + '</a>';
      body.appendChild(p);
    });

    var salesLinks = [
      { title: '新車相談', href: '/new-cars/', text: '新車相談を見る' },
      { title: '中古車在庫', href: '/used-cars/', text: '中古車相談を見る' },
      { title: '購入後も安心', href: '/maintenance/', text: 'メンテナンスを見る' }
    ];
    salesLinks.forEach(function (item) {
      var card = Array.from(document.querySelectorAll('#sales .guide-card')).find(function (candidate) {
        var heading = candidate.querySelector('h3');
        return heading && heading.textContent.trim() === item.title;
      });
      if (!card || Array.from(card.querySelectorAll('a[href]')).some(function (link) {
        return new URL(link.getAttribute('href'), location.origin).pathname === item.href;
      })) return;
      var p = document.createElement('p');
      p.innerHTML = '<a class="recruit-cta" href="' + item.href + '">' + item.text + '</a>';
      card.appendChild(p);
    });
  }

  function initRecruitColumnCards() {
    var section = document.getElementById('recruit-column');
    if (!section) return;
    var grid = section.querySelector('.rg-cards');
    if (!grid) return;
    grid.innerHTML = [
      '<article class="rg-card"><p class="column-card__date">2026.07.05</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">働き方</span><span class="tag-pill tag-pill--subtle">年収比較</span></div><h4 class="rg-card__title"><a href="/recruit-column/salary-vs-work-life/">整備士求人は年収だけで選んでいい？</a></h4><p class="rg-card__text">給与だけでは見えにくい、残業・休日・有給・働き方の見方を整理します。</p></article>',
      '<article class="rg-card"><p class="column-card__date">2026.07.03</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">職場見学</span><span class="tag-pill tag-pill--subtle">応募前確認</span></div><h4 class="rg-card__title"><a href="/recruit-column/factory-tour-questions/">整備士求人の職場見学で聞いておきたいこと</a></h4><p class="rg-card__text">応募前に残業、休日、仕事内容、資格取得支援を確認する観点です。</p></article>',
      '<article class="rg-card"><p class="column-card__date">2026.06.29</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">未経験</span><span class="tag-pill tag-pill--subtle">資格取得支援</span></div><h4 class="rg-card__title"><a href="/recruit-column/inexperienced-mechanic/">未経験から自動車整備士を目指せる？</a></h4><p class="rg-card__text">最初の仕事、資格取得支援、職場選びで確認したいポイントを紹介します。</p></article>',
      '<article class="rg-card"><p class="column-card__date">2026.06.22</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">職場選び</span><span class="tag-pill tag-pill--subtle">働き方比較</span></div><h4 class="rg-card__title"><a href="/recruit-column/large-company-vs-local-shop/">大手整備工場と地域密着の整備工場、働き方の違い</a></h4><p class="rg-card__text">年収、残業、休日、裁量、身につく技術の違いを整理します。</p></article>',
      '<article class="rg-card"><p class="column-card__date">2026.06.17</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">板金塗装求人</span><span class="tag-pill tag-pill--subtle">未経験</span></div><h4 class="rg-card__title"><a href="/recruit-column/bankin-paint-inexperienced/">板金塗装の仕事は未経験から目指せる？</a></h4><p class="rg-card__text">最初に覚えること、向いている人、職場選びの見方を紹介します。</p></article>',
      '<article class="rg-card"><p class="column-card__date">2026.06.12</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">働き方</span><span class="tag-pill tag-pill--subtle">整備士求人</span></div><h4 class="rg-card__title"><a href="/recruit-column/work-life/">整備士として無理なく働く職場選び</a></h4><p class="rg-card__text">休日・残業・資格取得支援など、長く働ける職場を見極める観点です。</p></article>',
      '<article class="rg-card"><p class="column-card__date">2026.06.07</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">働き方</span><span class="tag-pill tag-pill--subtle">残業少なめ</span></div><h4 class="rg-card__title"><a href="/recruit-column/low-overtime-mechanic/">整備士で残業が少ない職場を探す時に見るポイント</a></h4><p class="rg-card__text">給与だけでなく、予約の入れ方、休日、有給、職場見学で確認したいことを整理します。</p></article>',
      '<article class="rg-card"><p class="column-card__date">2026.06.03</p><div class="column-card__tags" aria-label="記事タグ"><span class="tag-pill">板金塗装求人</span><span class="tag-pill tag-pill--subtle">設備</span></div><h4 class="rg-card__title"><a href="/recruit-column/bankin-paint-workplace-equipment/">板金塗装の求人で設備や作業環境を見る理由</a></h4><p class="rg-card__text">設備、仕事量、残業、教育体制など、応募前に見ておきたいポイントを紹介します。</p></article>'
    ].join('');
  }

  function initVisibilityTracking() {
    if (!('IntersectionObserver' in window)) return;
    var watched = [
      { selector: '#entry', event: 'recruit_entry_view' },
      { selector: '#sales', event: 'sales_section_view' },
      { selector: '#column', event: 'column_section_view' },
      { selector: '.stock-grid', event: 'used_car_stock_view' }
    ];
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var eventName = entry.target.getAttribute('data-mcc-view-event');
        if (!eventName || entry.target.getAttribute('data-mcc-view-sent')) return;
        entry.target.setAttribute('data-mcc-view-sent', '1');
        sendEvent(eventName);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.35 });

    watched.forEach(function (item) {
      var el = document.querySelector(item.selector);
      if (!el) return;
      el.setAttribute('data-mcc-view-event', item.event);
      observer.observe(el);
    });
  }

  initCtaLinkPresentation();
  initHomeColumnFocus();
  initHomeServiceLinks();
  initRecruitColumnCards();

  loadScriptOnce('/analytics-config.js', 'mcc-analytics-config')
    .catch(function () {})
    .finally(function () {
      var config = window.MCC_ANALYTICS || {};
      var ga4Id = String(config.ga4Id || '').trim();
      var clarityId = String(config.clarityId || '').trim();
      var isRecruitPage = !!document.querySelector('form.rg-form') || location.pathname.indexOf('/recruit') !== -1;

      if (ga4Id) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag(){ window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', ga4Id, { send_page_view: true });
        loadScriptOnce('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga4Id), 'mcc-ga4');
      }

      if (clarityId && !(config.disableClarityOnRecruit && isRecruitPage)) {
        window.clarity = window.clarity || function clarity(){ (window.clarity.q = window.clarity.q || []).push(arguments); };
        loadScriptOnce('https://www.clarity.ms/tag/' + encodeURIComponent(clarityId), 'mcc-clarity');
      }

      if (config.enableCtaTracking !== false) initClickTracking();
      if (config.enableScrollDepth !== false) initScrollDepthTracking();
      if (config.enableVisibilityTracking !== false) initVisibilityTracking();
      flushQueue();
    });
})();
