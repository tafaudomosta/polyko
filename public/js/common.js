/* Polyko — common.js: اللغة (AR/FR) + الوضع الداكن + روابط التواصل. يعمل في كل الصفحات. */
(function () {
  'use strict';
  var root = document.documentElement;
  var D = window.POLYKO_DATA || {}, site = D.site || {};

  /* ---------- اللغة ---------- */
  var lang = 'ar';
  try { lang = localStorage.getItem('polyko-lang') === 'fr' ? 'fr' : 'ar'; } catch (e) {}
  window.T = function (ar, fr) { return lang === 'fr' ? fr : ar; };
  window.POLYKO_LANG = function () { return lang; };

  function applyLang() {
    root.setAttribute('lang', lang);
    root.setAttribute('dir', lang === 'fr' ? 'ltr' : 'rtl');
    var lb = document.getElementById('langBtn');
    if (lb) {
      lb.textContent = lang === 'fr' ? 'عربي' : 'FR';
      lb.setAttribute('aria-label', lang === 'fr' ? 'التبديل إلى العربية' : 'Passer en français');
    }
    var tb = document.getElementById('themeBtn');
    if (tb) tb.setAttribute('aria-label', lang === 'fr' ? 'Mode sombre' : 'تبديل الوضع الداكن');
    Array.prototype.forEach.call(document.querySelectorAll('[data-ph-ar]'), function (el) {
      el.setAttribute('placeholder', lang === 'fr' ? el.getAttribute('data-ph-fr') : el.getAttribute('data-ph-ar'));
    });
    var t = document.documentElement.getAttribute('data-title-' + lang);
    if (t) document.title = t;
    wireContacts();
  }
  function setLang(l) {
    lang = l === 'fr' ? 'fr' : 'ar';
    try { localStorage.setItem('polyko-lang', lang); } catch (e) {}
    applyLang();
    document.dispatchEvent(new CustomEvent('polyko:lang'));
  }
  var langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.addEventListener('click', function () { setLang(lang === 'fr' ? 'ar' : 'fr'); });

  /* ---------- الوضع الداكن ---------- */
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  var btn = document.getElementById('themeBtn');
  if (btn) btn.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('polyko-theme', next); } catch (e) {}
  });

  /* ---------- أرقام وروابط التواصل ---------- */
  function waDigits(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2);
    else if (d.charAt(0) === '0' && d.length === 10) d = '212' + d.slice(1); // رقم مغربي محلي
    return d;
  }
  window.POLYKO_WA = function (text) {
    var d = waDigits(site.whatsapp);
    return d ? 'https://wa.me/' + d + (text ? '?text=' + encodeURIComponent(text) : '') : '';
  };
  window.POLYKO_MAIL = function (subject) {
    return site.contactEmail ? 'mailto:' + site.contactEmail + '?subject=' + encodeURIComponent(subject || 'Polyko') : '';
  };

  /* أي زر فيه data-contact يفتح واتساب إن وُجد الرقم، وإلا البريد، وإلا يختفي */
  function wireContacts() {
    var any = false;
    Array.prototype.forEach.call(document.querySelectorAll('[data-contact]'), function (el) {
      var subj = el.getAttribute('data-subject-' + lang) || el.getAttribute('data-subject-ar') || 'Polyko';
      var href = POLYKO_WA(subj) || POLYKO_MAIL(subj);
      if (href) { el.setAttribute('href', href); el.hidden = false; any = true; if (/^https?:/.test(href)) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener'); } }
      else { el.removeAttribute('href'); el.hidden = true; }
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-no-contact]'), function (el) { el.hidden = any; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-site-email]'), function (el) {
      if (!site.contactEmail) { el.hidden = true; return; }
      el.hidden = false; el.textContent = site.contactEmail; el.setAttribute('href', 'mailto:' + site.contactEmail);
    });
  }

  /* روابط الرفع تظهر فقط عندما يكون الرفع مفعَّلاً (واتساب أو نموذج Google) */
  var uploadOn = !!site.whatsapp || /^https:\/\//i.test(site.uploadUrl || '');
  Array.prototype.forEach.call(document.querySelectorAll('[data-needs-upload]'), function (el) { el.hidden = !uploadOn; });

  /* Google AdSense: يُحمَّل فقط عند ضبط معرّف الناشر، ولا يُحمَّل أبداً في صفحة التحرير */
  var ad = site.adsense || {};
  var adClient = /^ca-pub-\d{10,20}$/.test(ad.client || '') ? ad.client : '';
  var adSlot = /^\d{6,15}$/.test(ad.slot || '') ? ad.slot : '';
  window.POLYKO_ADS = { client: adClient, slot: adSlot };
  if (adClient && !document.body.hasAttribute('data-no-ads')) {
    var sc = document.createElement('script');
    sc.async = true; sc.crossOrigin = 'anonymous';
    sc.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + adClient;
    document.head.appendChild(sc);
  }

  /* زر الرجوع في الصفحات الثابتة (الصفحة الرئيسية يديره app.js) */
  var bb = document.getElementById('backBtn');
  if (bb && !document.getElementById('app')) {
    bb.hidden = false;
    bb.addEventListener('click', function () {
      var ref = document.referrer || '';
      if (ref && location.origin !== 'null' && ref.indexOf(location.origin) === 0 && history.length > 1) history.back();
      else location.href = 'index.html';
    });
  }

  /* شريط «بدون إنترنت» + حفظ الموقع على الجهاز (https فقط) */
  function offlineBar() {
    var bar = document.getElementById('offBar');
    if (navigator.onLine) { if (bar) bar.parentNode.removeChild(bar); return; }
    if (bar || /game\.html$/.test(location.pathname)) return;
    bar = document.createElement('div'); bar.id = 'offBar'; bar.className = 'offline-bar'; bar.setAttribute('role', 'status');
    bar.innerHTML = '<span>' + (lang === 'fr' ? 'Hors connexion : le site fonctionne depuis la mémoire.' : 'لا يوجد إنترنت: الموقع يعمل من الذاكرة.') +
      '</span><a href="game.html">🎮 Game ys</a>';
    document.body.insertBefore(bar, document.body.firstChild);
  }
  window.addEventListener('online', offlineBar); window.addEventListener('offline', offlineBar); offlineBar();
  try {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
    }
  } catch (e) {}

  applyLang();
})();
