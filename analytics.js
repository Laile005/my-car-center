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
