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
      page_title: document.title
    }, params || {});

    if (typeof window.gtag === 'function') {
      window.gtag('event', name, payload);
    }
    if (typeof window.clarity === 'function') {
      window.clarity('event', name);
    }
  }

  window.MCCTrackEvent = sendEvent;

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
      subtitle.textContent = 'キズ・へこみ修理、保険修理、車検、購入後の相談を、町の修理工場目線でわかりやすく発信します。';
    }
    if (grid) {
      grid.innerHTML = [
        '<article class="column-card"><p class="column-card__date">2026.07.05</p><h3><a href="/column/bankin-direct-repair-shop/">車のキズ・へこみ修理はどこに頼む？</a></h3><p>町の板金塗装工場に直接相談するメリットと、見積りで確認したいポイントを解説します。</p></article>',
        '<article class="column-card"><p class="column-card__date">2026.07.01</p><h3><a href="/column/dealer-vs-local-repair/">ディーラー車検・修理と町の整備工場の使い分け</a></h3><p>ディーラーの良さを活かしつつ、日常整備や板金修理を町の工場へ相談する考え方です。</p></article>',
        '<article class="column-card"><p class="column-card__date">2026.06.26</p><h3><a href="/column/used-car-repair-shop-merit/">中古車を買う時に町の修理工場へ相談するメリット</a></h3><p>仕入れ、整備、板金塗装、購入後の車検まで同じ窓口で相談できる安心感を整理しました。</p></article>'
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
      if (!row || row.querySelector('a[href="' + item.href + '"]')) return;
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
      if (!card || card.querySelector('a[href="' + item.href + '"]')) return;
      var p = document.createElement('p');
      p.innerHTML = '<a class="recruit-cta" href="' + item.href + '">' + item.text + '</a>';
      card.appendChild(p);
    });
  }

  initCtaLinkPresentation();
  initHomeColumnFocus();
  initHomeServiceLinks();

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
      flushQueue();
    });
})();
