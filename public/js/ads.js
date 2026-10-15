/* Polyko — ads.js: مكان الإعلان في نهاية صفحات المقالات فقط (وحدة واحدة). */
(function () {
  var box = document.getElementById('adEnd');
  if (!box) return;
  var st = (window.POLYKO_DATA || {}).site || {}, A = window.POLYKO_ADS || {};
  if (st.adSlots === false || document.body.hasAttribute('data-no-ads')) { box.hidden = true; return; }
  var tag = '<span class="ad-tag">إعلان</span>';
  if (A.client && A.slot) {
    box.innerHTML = tag + '<ins class="adsbygoogle" style="display:block" data-ad-client="' + A.client + '" data-ad-slot="' + A.slot + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  } else if (A.client) { box.hidden = true; }
  else if (String(st.adHtml || '').trim()) {
    var h = Math.min(Math.max(parseInt(st.adHtmlHeight, 10) || 250, 50), 600);
    box.innerHTML = tag + '<iframe class="adframe" title="إعلان" loading="lazy" style="height:' + h + 'px" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"></iframe>';
    box.querySelector('iframe').srcdoc = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:transparent}body{display:flex;justify-content:center}</style>' + st.adHtml;
  } else box.hidden = true;
})();
