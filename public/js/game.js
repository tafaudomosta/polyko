/* Polyko — game.js: «Game ys». بوليكو يهرب والأستاذ وراءه. لا يحتاج إنترنت. */
(function () {
  'use strict';
  var T = window.T || function (ar) { return ar; };
  var canvas = document.getElementById('gc');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var W = 800, H = 320, GROUND = 262, PX = 190;     // أبعاد منطقية
  var GRAV = 2400, JUMP_V = -820, BEST_KEY = 'polyko-game-best';
  var PALE = { day: ['#DCE3FF', '#F4F6FF'], night: ['#0D0E24', '#222660'] };

  /* ---------- أدوات ---------- */
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function mix(a, b, t) {
    var x = hex(a), y = hex(b);
    return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * t) + ',' + Math.round(x[1] + (y[1] - x[1]) * t) + ',' + Math.round(x[2] + (y[2] - x[2]) * t) + ')';
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function isFr() { return window.POLYKO_LANG && POLYKO_LANG() === 'fr'; }
  var best = 0;
  try { best = parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) {}


  /* ---------- الأصوات (مولَّدة بالمتصفح، بدون ملفات، وتعمل بدون إنترنت) ---------- */
  var MUTE_KEY = 'polyko-game-mute', muted = false, ac = null;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}
  function A() {
    if (muted) return null;
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
    return ac;
  }
  function tone(f, d, type, vol, to, delay) {
    var c = A(); if (!c) return;
    var t0 = c.currentTime + (delay || 0), o = c.createOscillator(), gn = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
    gn.gain.setValueAtTime(vol || .07, t0); gn.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(gn); gn.connect(c.destination); o.start(t0); o.stop(t0 + d + .02);
  }
  function noise(d, vol) {
    var c = A(); if (!c) return;
    var n = Math.floor(c.sampleRate * d), buf = c.createBuffer(1, n, c.sampleRate), data = buf.getChannelData(0);
    for (var i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = c.createBufferSource(), gn = c.createGain(); s.buffer = buf; gn.gain.value = vol || .12; s.connect(gn); gn.connect(c.destination); s.start();
  }
  var SFX = {
    start: function () { tone(330, .09, 'square', .06); tone(494, .09, 'square', .06, 0, .09); tone(659, .14, 'square', .06, 0, .18); },
    jump: function () { tone(360, .16, 'square', .05, 760); },
    coin: function () { tone(880, .08, 'triangle', .09); tone(1320, .16, 'triangle', .09, 0, .08); },
    shield: function () { tone(520, .12, 'sine', .1, 1040); },
    hit: function () { noise(.18, .16); tone(190, .22, 'sawtooth', .09, 55); },
    block: function () { tone(900, .1, 'square', .06, 300); },
    caught: function () { noise(.12, .12); [523, 440, 349, 262].forEach(function (f, i) { tone(f, .22, 'square', .07, f * .93, i * .2); }); tone(110, .5, 'sawtooth', .08, 60, .75); },
    calm: function () { tone(440, .1, 'sine', .07); tone(587, .16, 'sine', .07, 0, .1); }
  };
  function sfx(n) { try { SFX[n](); } catch (e) {} }
  function muteLabel() { var b = document.getElementById('bMute'); if (b) { b.textContent = muted ? '🔇' : '🔊'; b.setAttribute('aria-pressed', muted ? 'true' : 'false'); } }
  var bm = document.getElementById('bMute');
  if (bm) bm.addEventListener('click', function () {
    muted = !muted; try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
    muteLabel(); if (!muted) sfx('coin');
  });
  muteLabel();

  /* ---------- نصوص ---------- */
  var CHASE = {
    ar: ['وقّف!', 'فين غادي؟!', 'غادي نغيّبك!', 'رجع للمدرج!', 'الحضور إجباري!', 'فين الورقة ديالك؟'],
    fr: ['Arrête-toi !', 'Reviens en cours !', 'Tu es absent !', 'Présence obligatoire !', 'Où est ta feuille ?']
  };
  var OVER = {
    ar: ['تمّ القبض عليك! الحضور إجباري 😂', 'الأستاذ ربح هاد الجولة!', 'غادي تسجّل في الاستدراك 😅', 'جرّب مرة أخرى، المدرج بعيد بزاف!'],
    fr: ['Attrapé ! La présence est obligatoire 😂', 'Le prof gagne cette manche !', 'Direction le rattrapage 😅', 'Réessaie, l\'amphi est encore loin !']
  };
  var OUCH = { ar: ['أوتش!', 'قريب!', 'انتبه!'], fr: ['Aïe !', 'Près !', 'Attention !'] };

  /* ---------- الحالة ---------- */
  var state = 'idle';                 // idle | play | caught | over
  var g;                              // حالة الجولة
  var bg = { builds: [], clouds: [], dash: 0 };
  var dark = (document.documentElement.getAttribute('data-theme') === 'dark') ||
    (!document.documentElement.getAttribute('data-theme') && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  var night = dark ? 1 : 0, nightTarget = night;
  var duckHeld = false;

  function reset() {
    g = {
      t: 0, score: 0, speed: 330, y: 0, vy: 0, duck: false, onGround: true, strikes: 0, calm: 0, inv: 0,
      shield: false, star: 0, slow: 0, obs: [], items: [], fx: [], spawn: 500, itemSpawn: 900,
      gap: 140, bubble: null, bubbleT: 3, anim: 0, caughtT: 0
    };
  }
  function makeBg() {
    bg.builds = []; var x = 0;
    while (x < W + 200) { var w = rnd(60, 120), h = rnd(60, 150); bg.builds.push({ x: x, w: w, h: h, win: Math.floor(rnd(2, 5)) }); x += w + rnd(8, 40); }
    bg.clouds = [];
    for (var i = 0; i < 4; i++) bg.clouds.push({ x: rnd(0, W), y: rnd(30, 110), s: rnd(.7, 1.3) });
  }
  reset(); makeBg();

  /* ---------- أشياء اللعبة ---------- */
  function spawnObstacle() {
    var pool = ['books', 'books', 'clock'];
    if (g.score > 60) pool.push('queue');
    if (g.score > 150) pool.push('paper', 'paper');
    var k = pick(pool), o = { k: k, x: W + 40, passed: false, hit: false };
    if (k === 'books') { o.w = 44; o.h = 38; o.y = GROUND - 38; o.c = [pick(['#E8590C', '#0E9F6E', '#7C3AED', '#DB2777']), pick(['#2F5BFF', '#B45309', '#0891B2'])]; }
    else if (k === 'clock') { o.w = 36; o.h = 42; o.y = GROUND - 42; }
    else if (k === 'queue') { o.w = 92; o.h = 52; o.y = GROUND - 52; }
    else { o.w = 50; o.h = 30; o.y = GROUND - 78; }         // ورقة طائرة: تحتها مرور بالانحناء
    g.obs.push(o);
    var minGap = 300 + g.speed * 0.55;
    g.spawn = rnd(minGap, minGap * 1.7) + o.w;
  }
  function spawnItem() {
    var last = g.obs[g.obs.length - 1];
    if (last && last.x > W - 170) { g.itemSpawn = 120; return; }
    var kinds = ['coffee', 'coffee', 'star'];
    if (!g.shield) kinds.push('pen', 'pen');
    g.items.push({ k: pick(kinds), x: W + 30, y: GROUND - rnd(34, 105), w: 28, h: 28 });
    g.itemSpawn = rnd(900, 1700);
  }
  function say(txt, ms) { g.bubble = txt; g.bubbleT = ms || 1.6; }
  function poof(x, y, c) { for (var i = 0; i < 8; i++) g.fx.push({ x: x, y: y, vx: rnd(-160, 160), vy: rnd(-260, -40), l: .5, c: c }); }

  function playerBox() {
    var h = g.duck && g.onGround ? 30 : 50;
    return { x: PX + 8, y: GROUND - g.y - h + 6, w: 24, h: h - 8 };
  }

  /* ---------- التحكم ---------- */
  function jump() {
    if (state === 'idle' || state === 'over') { start(); return; }
    if (state !== 'play') return;
    if (g.onGround) { g.vy = JUMP_V; g.onGround = false; sfx('jump'); }
  }
  function setDuck(v) { duckHeld = v; if (g) g.duck = v; }
  function start() {
    reset(); state = 'play'; setOverlay(false); hud(); sfx('start');
    say(pick(CHASE[isFr() ? 'fr' : 'ar']), 1.4);
  }
  var overlay = document.getElementById('gOverlay'), oTitle = document.getElementById('gTitle'),
      oMsg = document.getElementById('gMsg'), oBtn = document.getElementById('gBtn'), status = document.getElementById('gStatus');
  function setOverlay(show, title, msg, btn) {
    overlay.hidden = !show;
    if (show) { oTitle.textContent = title; oMsg.textContent = msg; oBtn.textContent = btn; try { oBtn.focus({ preventScroll: true }); } catch (e) {} }
  }
  function hud() { status.textContent = ''; }
  function idleScreen() {
    setOverlay(true, 'Game ys', T('الأستاذ يطارد بوليكو! اقفز فوق العقبات، وانحنِ تحت الأوراق الطائرة.', 'Le prof court après Polyko ! Saute par-dessus les obstacles et baisse-toi sous les copies volantes.'), T('ابدأ', 'Jouer'));
  }

  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') { if (e.target && e.target.tagName === 'BUTTON' && k === ' ') return; e.preventDefault(); jump(); }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); setDuck(true); }
    else if (k === 'Enter' && (state === 'idle' || state === 'over') && !(e.target && e.target.tagName === 'BUTTON')) { start(); }
  });
  document.addEventListener('keyup', function (e) { if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') setDuck(false); });
  canvas.addEventListener('pointerdown', function (e) { e.preventDefault(); jump(); });
  oBtn.addEventListener('click', function () { start(); });
  var bj = document.getElementById('bJump'), bd = document.getElementById('bDuck');
  bj.addEventListener('pointerdown', function (e) { e.preventDefault(); jump(); });
  ['pointerdown'].forEach(function (ev) { bd.addEventListener(ev, function (e) { e.preventDefault(); setDuck(true); }); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { bd.addEventListener(ev, function () { setDuck(false); }); });
  [bj, bd].forEach(function (b) { b.addEventListener('contextmenu', function (e) { e.preventDefault(); }); });

  /* ---------- التحديث ---------- */
  function update(dt) {
    bg.dash = (bg.dash + dt * g.speed) % 40;
    bg.builds.forEach(function (b) { b.x -= dt * g.speed * 0.18; });
    while (bg.builds.length && bg.builds[0].x + bg.builds[0].w < -10) bg.builds.shift();
    var lb = bg.builds[bg.builds.length - 1];
    if (!lb || lb.x + lb.w < W + 60) { var w = rnd(60, 120); bg.builds.push({ x: (lb ? lb.x + lb.w : W) + rnd(8, 40), w: w, h: rnd(60, 150), win: Math.floor(rnd(2, 5)) }); }
    bg.clouds.forEach(function (c) { c.x -= dt * g.speed * 0.07; if (c.x < -80) { c.x = W + 60; c.y = rnd(30, 110); } });
    night += (nightTarget - night) * Math.min(1, dt * 1.5);

    if (state === 'caught') {
      g.caughtT += dt; g.gap += (18 - g.gap) * Math.min(1, dt * 7); g.anim += dt * 6;
      if (g.caughtT > 0.7) finish();
      return;
    }
    if (state !== 'play') { g.anim += dt * 4; return; }

    var slow = g.slow > 0 ? 0.75 : 1;
    g.t += dt; g.anim += dt * (g.speed / 55);
    g.speed = Math.min(W < 700 ? 680 : 780, g.speed + dt * 7);
    var v = g.speed * slow;
    g.score += dt * v / 10 * (g.star > 0 ? 2 : 1);
    nightTarget = (Math.floor(g.score / 300) % 2) ^ (dark ? 1 : 0);
    if (g.slow > 0) g.slow -= dt;
    if (g.star > 0) g.star -= dt;
    if (g.inv > 0) g.inv -= dt;

    // قفز
    g.duck = duckHeld;
    if (!g.onGround) {
      g.vy += (GRAV + (g.duck ? 2600 : 0)) * dt; g.y -= g.vy * dt;
      if (g.y <= 0) { g.y = 0; g.vy = 0; g.onGround = true; }
    }
    // الأستاذ
    var tgt = g.strikes === 0 ? 140 : 66;
    g.gap += (tgt - g.gap) * Math.min(1, dt * 2.2);
    if (g.strikes === 1) { g.calm += dt; if (g.calm > 12) { g.strikes = 0; g.calm = 0; sfx('calm'); say(T('الأستاذ تعب...', 'Le prof est essoufflé...'), 1.6); } }
    g.bubbleT -= dt;
    if (g.bubbleT <= 0) { if (g.bubble) g.bubble = null; g.bubbleT = rnd(3, 6); say(pick(CHASE[isFr() ? 'fr' : 'ar']), 1.5); }

    // عقبات
    g.spawn -= v * dt; if (g.spawn <= 0) spawnObstacle();
    g.itemSpawn -= v * dt; if (g.itemSpawn <= 0) spawnItem();
    var pb = playerBox();
    g.obs.forEach(function (o) {
      o.x -= v * dt;
      if (!o.hit && g.inv <= 0 && hit(pb, { x: o.x + 3, y: o.y + 3, w: o.w - 6, h: o.h - 4 })) {
        o.hit = true;
        if (g.shield) { g.shield = false; sfx('block'); poof(o.x + o.w / 2, o.y + o.h / 2, '#FFD60A'); say(T('القلم أنقذك!', 'Le stylo t\'a sauvé !'), 1.4); }
        else {
          g.strikes++; g.calm = 0; g.inv = 1.3; poof(PX + 20, GROUND - g.y - 25, '#E5484D');
          if (g.strikes >= 2) { state = 'caught'; g.caughtT = 0; g.bubble = null; sfx('caught'); return; }
          sfx('hit');
          say(pick(OUCH[isFr() ? 'fr' : 'ar']), 1.2);
        }
      }
    });
    g.obs = g.obs.filter(function (o) { return o.x + o.w > -20; });
    // أشياء للجمع
    g.items.forEach(function (it) {
      it.x -= v * dt;
      if (!it.got && hit(pb, it)) {
        it.got = true; sfx(it.k === 'pen' ? 'shield' : 'coin'); poof(it.x + 14, it.y + 14, '#FFD60A');
        if (it.k === 'coffee') { g.slow = 5; if (g.strikes === 1) { g.strikes = 0; g.calm = 0; } g.score += 20; say(T('قهوة! الأستاذ تأخر', 'Café ! Le prof ralentit'), 1.5); }
        else if (it.k === 'pen') { g.shield = true; say(T('قلم: حماية لمرة واحدة', 'Stylo : une protection'), 1.5); }
        else { g.star = 8; say(T('نقاط مضاعفة 8 ثوانٍ', 'Points x2 pendant 8 s'), 1.5); }
      }
    });
    g.items = g.items.filter(function (it) { return !it.got && it.x > -40; });
    g.fx.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; p.l -= dt; });
    g.fx = g.fx.filter(function (p) { return p.l > 0; });
  }

  function finish() {
    state = 'over';
    var s = Math.floor(g.score), isBest = s > best;
    if (isBest) { best = s; try { localStorage.setItem(BEST_KEY, String(s)); } catch (e) {} }
    var title = pick(OVER[isFr() ? 'fr' : 'ar']);
    setOverlay(true, title, T('نتيجتك: ', 'Score : ') + s + ' · ' + T('أفضل نتيجة: ', 'Meilleur : ') + best + (isBest ? ' 🏆' : ''), T('من جديد', 'Rejouer'));
  }

  /* ---------- الرسم ---------- */
  function drawPolyko(x, bottom, duck, t, blink) {
    var h = duck ? 32 : 50, w = 40, y = bottom - h;
    if (blink) ctx.globalAlpha = .45;
    // قدمان
    var sw = g.onGround && state === 'play' ? Math.sin(t) * 5 : 0;
    ctx.fillStyle = '#14142B'; rr(x + 8 + sw, bottom - 5, 10, 5, 2); ctx.fill(); rr(x + 22 - sw, bottom - 5, 10, 5, 2); ctx.fill();
    // الورقة
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#14142B'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 4, y); ctx.lineTo(x + w - 12, y); ctx.lineTo(x + w, y + 12); ctx.lineTo(x + w, bottom - 6); ctx.arcTo(x + w, bottom - 2, x + w - 4, bottom - 2, 4);
    ctx.lineTo(x + 4, bottom - 2); ctx.arcTo(x, bottom - 2, x, bottom - 6, 4); ctx.lineTo(x, y + 4); ctx.arcTo(x, y, x + 4, y, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFD60A'; ctx.beginPath(); ctx.moveTo(x + w - 12, y); ctx.lineTo(x + w - 12, y + 9); ctx.arcTo(x + w - 12, y + 12, x + w - 9, y + 12, 3); ctx.lineTo(x + w, y + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    // العينان والفم
    var ey = y + (duck ? 13 : 20);
    ctx.fillStyle = '#2D3BFF'; ctx.beginPath(); ctx.arc(x + 12, ey, 5, 0, 7); ctx.arc(x + 26, ey, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#14142B'; ctx.beginPath(); ctx.arc(x + 13.5, ey - .5, 2.4, 0, 7); ctx.arc(x + 27.5, ey - .5, 2.4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#14142B'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
    if (g.strikes > 0 && state !== 'idle') { ctx.arc(x + 19, ey + 12, 4, Math.PI, 0); } else { ctx.arc(x + 19, ey + 7, 6, .15 * Math.PI, .85 * Math.PI); }
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (g.shield) { ctx.strokeStyle = '#FFD60A'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.arc(x + 20, bottom - h / 2, 36, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  }
  function drawProf(x, bottom, t, reach) {
    var s = 1.15, sw = Math.sin(t) * 9;
    ctx.save(); ctx.translate(x, bottom); ctx.scale(s, s);
    // ساقان
    ctx.strokeStyle = '#1B1E4D'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5, -20); ctx.lineTo(-5 + sw, -2); ctx.moveTo(7, -20); ctx.lineTo(7 - sw, -2); ctx.stroke();
    ctx.fillStyle = '#111'; rr(-12 + sw, -5, 14, 5, 2); ctx.fill(); rr(0 - sw, -5, 14, 5, 2); ctx.fill();
    // حقيبة
    ctx.fillStyle = '#8B5A2B'; rr(-26, -30 + sw / 3, 18, 14, 3); ctx.fill();
    // جسم
    ctx.fillStyle = '#2B2F77'; rr(-14, -52, 30, 36, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-3, -52); ctx.lineTo(3, -40); ctx.lineTo(9, -52); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#E5484D'; ctx.fillRect(2, -48, 3, 14);
    // ذراع ممدودة
    ctx.strokeStyle = '#2B2F77'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(10, -44); ctx.lineTo(28 + reach * 8, -46 - reach * 6 + Math.sin(t * 1.5) * 3); ctx.stroke();
    ctx.fillStyle = '#F2C18D'; ctx.beginPath(); ctx.arc(30 + reach * 8, -47 - reach * 6 + Math.sin(t * 1.5) * 3, 5, 0, 7); ctx.fill();
    // رأس
    ctx.fillStyle = '#F2C18D'; ctx.beginPath(); ctx.arc(2, -66, 13, 0, 7); ctx.fill();
    ctx.fillStyle = '#9AA0B5'; ctx.beginPath(); ctx.arc(2, -70, 13, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.strokeStyle = '#14142B'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-1, -65, 4.5, 0, 7); ctx.arc(10, -65, 4.5, 0, 7); ctx.moveTo(3.5, -65); ctx.lineTo(5.5, -65); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -73); ctx.lineTo(3, -70); ctx.moveTo(8, -70); ctx.lineTo(15, -74); ctx.stroke();
    ctx.beginPath(); ctx.arc(5, -56, 4, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
    ctx.restore();
  }
  function drawObstacle(o, t) {
    var x = o.x, y = o.y;
    if (o.k === 'books') {
      ctx.fillStyle = o.c[0]; rr(x, y + 18, o.w, 20, 3); ctx.fill(); ctx.fillStyle = o.c[1]; rr(x + 3, y + 2, o.w - 8, 17, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x + 6, y + 26, o.w - 14, 3); ctx.fillRect(x + 9, y + 9, o.w - 20, 3);
    } else if (o.k === 'clock') {
      var sh = Math.sin(t * 40) * 1.5;
      ctx.save(); ctx.translate(x + o.w / 2 + sh, y + 24); ctx.fillStyle = '#E5484D'; ctx.beginPath(); ctx.arc(-9, -19, 7, Math.PI, 0); ctx.arc(9, -19, 7, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#14142B'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -9); ctx.moveTo(0, 0); ctx.lineTo(7, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-10, 15); ctx.lineTo(-14, 19); ctx.moveTo(10, 15); ctx.lineTo(14, 19); ctx.stroke(); ctx.restore();
    } else if (o.k === 'queue') {
      var cols = ['#E8590C', '#0E9F6E', '#7C3AED'];
      for (var i = 0; i < 3; i++) {
        var px = x + i * 30 + 2, bob = Math.sin(t * 6 + i) * 1.5;
        ctx.fillStyle = cols[i]; rr(px, y + 22 + bob, 24, 30, 6); ctx.fill();
        ctx.fillStyle = '#F2C18D'; ctx.beginPath(); ctx.arc(px + 12, y + 14 + bob, 10, 0, 7); ctx.fill();
        ctx.fillStyle = '#14142B'; ctx.fillRect(px + 7, y + 12 + bob, 3, 3); ctx.fillRect(px + 14, y + 12 + bob, 3, 3);
        ctx.fillStyle = '#fff'; rr(px + 5, y + 30 + bob, 14, 11, 2); ctx.fill();
      }
    } else {
      var by = y + Math.sin(t * 5 + o.x / 40) * 4;
      ctx.save(); ctx.translate(x + o.w / 2, by + 15); ctx.rotate(Math.sin(t * 4 + o.x / 50) * .12);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#14142B'; ctx.lineWidth = 2; rr(-25, -15, 50, 30, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#E5484D'; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'center'; ctx.direction = 'ltr'; ctx.fillText('0/20', 0, 5);
      ctx.strokeStyle = '#9AA0B5'; ctx.beginPath(); ctx.moveTo(-19, -8); ctx.lineTo(19, -8); ctx.stroke(); ctx.restore();
    }
  }
  function drawItem(it, t) {
    var y = it.y + Math.sin(t * 5 + it.x) * 3, cx = it.x + 14, cy = y + 14;
    ctx.fillStyle = 'rgba(255,214,10,.28)'; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, 7); ctx.fill();
    if (it.k === 'coffee') {
      ctx.fillStyle = '#8B5A2B'; rr(cx - 9, cy - 8, 18, 17, 4); ctx.fill(); ctx.strokeStyle = '#8B5A2B'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx + 10, cy, 5, -1.3, 1.3); ctx.stroke();
      ctx.strokeStyle = '#9AA0B5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 3, cy - 11); ctx.quadraticCurveTo(cx - 7, cy - 15, cx - 3, cy - 18); ctx.moveTo(cx + 3, cy - 11); ctx.quadraticCurveTo(cx + 7, cy - 15, cx + 3, cy - 18); ctx.stroke();
    } else if (it.k === 'pen') {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.7); ctx.fillStyle = '#2D3BFF'; rr(-12, -4, 22, 8, 3); ctx.fill(); ctx.fillStyle = '#FFD60A'; ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(16, 0); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill(); ctx.restore();
    } else {
      ctx.fillStyle = '#FFD60A'; ctx.strokeStyle = '#B88A00'; ctx.lineWidth = 2; ctx.beginPath();
      for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5.5 : 12; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  function bubble(x, y, txt) {
    ctx.font = '700 15px "IBM Plex Sans Arabic", sans-serif'; ctx.direction = isFr() ? 'ltr' : 'rtl'; ctx.textAlign = 'center';
    var w = Math.max(60, ctx.measureText(txt).width + 22), bx = Math.max(6, Math.min(W - w - 6, x - w / 2)), by = y - 32;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#14142B'; ctx.lineWidth = 2; rr(bx, by, w, 28, 10); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, by + 28); ctx.lineTo(x, by + 38); ctx.lineTo(x + 6, by + 28); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.fillStyle = '#14142B'; ctx.fillText(txt, bx + w / 2, by + 19);
  }

  function draw() {
    var sc = canvas.width / W;
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    // سماء
    var grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, mix(PALE.day[0], PALE.night[0], night)); grd.addColorStop(1, mix(PALE.day[1], PALE.night[1], night));
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    // شمس / قمر
    ctx.fillStyle = mix('#FFD60A', '#E8EAFF', night); ctx.beginPath(); ctx.arc(W - 110, 62, 22, 0, 7); ctx.fill();
    if (night > .5) { ctx.fillStyle = mix('#DCE3FF', '#222660', 1 - (night - .5) * 2); ctx.beginPath(); ctx.arc(W - 100, 56, 18, 0, 7); ctx.fill(); }
    // غيوم
    ctx.fillStyle = mix('#FFFFFF', '#343A86', night);
    bg.clouds.forEach(function (c) { ctx.globalAlpha = .85; ctx.beginPath(); ctx.arc(c.x, c.y, 14 * c.s, 0, 7); ctx.arc(c.x + 16 * c.s, c.y + 4, 11 * c.s, 0, 7); ctx.arc(c.x - 16 * c.s, c.y + 5, 10 * c.s, 0, 7); ctx.fill(); ctx.globalAlpha = 1; });
    // بنايات
    bg.builds.forEach(function (b) {
      ctx.fillStyle = mix('#B9C3F5', '#262A66', night); ctx.fillRect(b.x, GROUND - b.h, b.w, b.h);
      ctx.fillStyle = mix('#E8EDFF', '#FFD60A', night * .9); ctx.globalAlpha = .75;
      for (var i = 0; i < b.win; i++) for (var j = 0; j < Math.floor(b.h / 34); j++) ctx.fillRect(b.x + 12 + i * (b.w - 24) / b.win, GROUND - b.h + 12 + j * 30, 9, 13);
      ctx.globalAlpha = 1;
    });
    // أرض
    ctx.fillStyle = mix('#E8EAFF', '#181A3A', night); ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = mix('#14142B', '#A6A9D2', night); ctx.fillRect(0, GROUND, W, 3);
    for (var d = -bg.dash; d < W; d += 40) ctx.fillRect(d, GROUND + 14, 18, 3);

    g.obs.forEach(function (o) { drawObstacle(o, g.t + g.anim * .1); });
    g.items.forEach(function (it) { drawItem(it, g.t); });
    // الأستاذ واللاعب
    var profX = PX - g.gap - 20;
    drawProf(profX, GROUND, g.anim, state === 'caught' ? 1 : (g.strikes ? .7 : .2));
    var blink = g.inv > 0 && Math.floor(g.inv * 12) % 2 === 0;
    var py = GROUND - g.y;
    if (state === 'caught') { ctx.save(); ctx.translate(PX + 20, py - 24); ctx.rotate(Math.sin(g.anim) * .15); ctx.translate(-(PX + 20), -(py - 24)); drawPolyko(PX, py, false, g.anim, false); ctx.restore(); }
    else drawPolyko(PX, py, g.duck && g.onGround, g.anim, blink);
    // فقاعة الأستاذ
    if (g.bubble && state !== 'idle') bubble(profX + 14, GROUND - 90, g.bubble);
    g.fx.forEach(function (p) { ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, p.l * 2); ctx.fillRect(p.x, p.y, 5, 5); ctx.globalAlpha = 1; });

    // لوحة المعلومات
    ctx.font = '700 20px "IBM Plex Sans Arabic", sans-serif'; ctx.direction = 'ltr'; ctx.textAlign = 'right';
    ctx.fillStyle = mix('#14142B', '#F1F2FF', night);
    ctx.fillText(String(Math.floor(g.score)).padStart(5, '0'), W - 16, 30);
    ctx.font = '600 13px "IBM Plex Sans Arabic", sans-serif'; ctx.globalAlpha = .75; ctx.fillText('HI ' + String(best).padStart(5, '0'), W - 16, 50); ctx.globalAlpha = 1;
    // قلوب
    for (var h = 0; h < 2; h++) { ctx.fillStyle = h < 2 - g.strikes ? '#E5484D' : mix('#C9CEF5', '#343A86', night); ctx.beginPath(); ctx.arc(26 + h * 26, 26, 9, 0, 7); ctx.fill(); }
    ctx.textAlign = 'left'; ctx.font = '700 13px "IBM Plex Sans Arabic", sans-serif'; ctx.direction = isFr() ? 'ltr' : 'rtl';
    var bx = 12, by = 50;
    if (g.shield) { ctx.fillStyle = '#B88A00'; ctx.fillText('✎', bx, by + 12); bx += 22; }
    if (g.slow > 0) { ctx.fillStyle = '#8B5A2B'; ctx.fillText('☕ ' + Math.ceil(g.slow), bx, by + 12); bx += 44; }
    if (g.star > 0) { ctx.fillStyle = '#B88A00'; ctx.fillText('★ x2 ' + Math.ceil(g.star), bx, by + 12); }
  }

  /* ---------- الحلقة ---------- */
  function resize() {
    var w = canvas.clientWidth || 800, dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    var nw = w < 600 ? 560 : 800;            // شاشة صغيرة: مجال رؤية أضيق فتكبر الشخصيات
    if (nw !== W) { W = nw; makeBg(); }
    canvas.style.aspectRatio = W + '/' + H;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * dpr * H / W);
  }
  window.addEventListener('resize', resize); resize();
  var last = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    update(dt); draw(); requestAnimationFrame(frame);
  }
  requestAnimationFrame(function (ts) { last = ts; frame(ts); });

  document.addEventListener('polyko:lang', function () { if (state === 'idle') idleScreen(); var h = document.getElementById('gHelp'); if (h) h.textContent = T('مسافة أو ⬆ للقفز · ⬇ للانحناء', 'Espace ou ⬆ pour sauter · ⬇ pour se baisser'); relabel(); });
  function relabel() { bj.textContent = T('قفز', 'Saut'); bd.textContent = T('انحناء', 'Baisser'); }
  relabel();
  var hp = document.getElementById('gHelp'); if (hp) hp.textContent = T('مسافة أو ⬆ للقفز · ⬇ للانحناء', 'Espace ou ⬆ pour sauter · ⬇ pour se baisser');
  idleScreen();

  /* حالة الاتصال */
  function net() { status.textContent = navigator.onLine ? '' : T('لا يوجد اتصال بالإنترنت، لكن اللعبة تعمل 🎮', 'Pas de connexion, mais le jeu fonctionne 🎮'); }
  window.addEventListener('online', net); window.addEventListener('offline', net); net();

  window.PolykoGame = { state: function () { return { state: state, score: Math.floor(g.score), strikes: g.strikes, obstacles: g.obs.length }; } };
})();
