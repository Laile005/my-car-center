(function () {
  'use strict';

  var config = {
    ga4Id: 'G-ZR46K2ME6D',
    clarityId: 'xh8bpqs76a',
    enableScrollDepth: true,
    enableCtaTracking: true,
    enableVisibilityTracking: true
  };
  var optOutKey = 'mcc_analytics_optout';
  var productionHosts = ['yamamoto-mycar.com'];

  window.MCC_ANALYTICS = config;

  function syncOptOut() {
    var setting = new URLSearchParams(window.location.search).get('mcc_analytics');
    try {
      if (setting === 'off') {
        window.localStorage.setItem(optOutKey, '1');
      } else if (setting === 'on') {
        window.localStorage.removeItem(optOutKey);
      }
      return window.localStorage.getItem(optOutKey) === '1';
    } catch (error) {
      return setting === 'off';
    }
  }

  var isProduction = window.location.protocol === 'https:'
    && productionHosts.indexOf(window.location.hostname) !== -1;
  var analyticsDisabled = syncOptOut() || !isProduction;

  window.MCC_ANALYTICS_DISABLED = analyticsDisabled;
  window['ga-disable-' + config.ga4Id] = analyticsDisabled;

  if (analyticsDisabled || window.MCC_ANALYTICS_BOOTSTRAPPED) return;
  window.MCC_ANALYTICS_BOOTSTRAPPED = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', config.ga4Id);

  var gaScript = document.createElement('script');
  gaScript.id = 'mcc-ga4';
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(config.ga4Id);
  document.head.appendChild(gaScript);

  window.clarity = window.clarity || function clarity() {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };

  var clarityScript = document.createElement('script');
  clarityScript.id = 'mcc-clarity';
  clarityScript.async = true;
  clarityScript.src = 'https://www.clarity.ms/tag/' + encodeURIComponent(config.clarityId);
  document.head.appendChild(clarityScript);
})();