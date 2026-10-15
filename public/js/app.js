/* Polyko — app.js
   موقع ثابت: كل البيانات في data.js. التنقل بالـ hash:
   #/ #/pick #/modules #/profs #/edt #/m/<id> #/p/<id>
   اللغة: عربي أو فرنسي عبر الدالة T(ar, fr) المعرّفة في common.js */
(function () {
  'use strict';

  var D = window.POLYKO_DATA;
  var app = document.getElementById('app');
  var T = window.T || function (ar) { return ar; };
  var isFr = function () { return window.POLYKO_LANG && POLYKO_LANG() === 'fr'; };
  if (!D) {
    app.innerHTML = '<div class="empty">data.js introuvable / تعذّر تحميل data.js</div>';
    return;
  }

  var DAYS = [
    ['lundi', 'الإثنين', 'Lundi'], ['mardi', 'الثلاثاء', 'Mardi'], ['mercredi', 'الأربعاء', 'Mercredi'],
    ['jeudi', 'الخميس', 'Jeudi'], ['vendredi', 'الجمعة', 'Vendredi'], ['samedi', 'السبت', 'Samedi']
  ];
  var PALETTE = ['#2F5BFF', '#E8590C', '#0E9F6E', '#7C3AED', '#DB2777', '#0891B2', '#B45309', '#4F46E5'];
  var LOGO = '<svg viewBox="0 0 200 200" aria-hidden="true"><g transform="rotate(-5 100 100)"><path d="M50 30 H122 L160 68 V160 a14 14 0 0 1 -14 14 H50 a14 14 0 0 1 -14 -14 V44 a14 14 0 0 1 14 -14 Z" fill="#FFFFFF"/><path d="M122 30 V58 a10 10 0 0 0 10 10 H160 Z" fill="#FFD60A"/><circle cx="74" cy="100" r="14" fill="#2D3BFF"/><circle cx="78" cy="98" r="6.5" fill="#14142B"/><circle cx="76" cy="95.5" r="2" fill="#FFFFFF"/><circle cx="118" cy="100" r="14" fill="#2D3BFF"/><circle cx="122" cy="98" r="6.5" fill="#14142B"/><circle cx="120" cy="95.5" r="2" fill="#FFFFFF"/><path d="M76 134 Q96 152 118 134" fill="none" stroke="#14142B" stroke-width="6" stroke-linecap="round"/></g></svg>';

  var filieres = D.filieres || [], modules = D.modules || [], professors = D.professors || [];
  var sessions = D.sessions || [], files = (D.files || []).slice(), timetables = (D.timetables || []).slice();
  var F = index(filieres), M = index(modules), P = index(professors);

  function index(arr) { var o = {}; arr.forEach(function (x) { o[x.id] = x; }); return o; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function enc(p) { return String(p || '').split('/').map(encodeURIComponent).join('/'); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ًͯ-ْـ]/g, '');
  }
  function semLabel(s) { return s === 'S?' ? T('السداسي غير محدد', 'Semestre non précisé') : s; }
  function countFiles(n) {
    if (isFr()) return n === 0 ? 'Aucun fichier' : (n === 1 ? '1 fichier' : n + ' fichiers');
    if (n === 0) return 'بدون ملفات';
    if (n === 1) return 'ملف واحد';
    if (n === 2) return 'ملفان';
    return n + (n <= 10 ? ' ملفات' : ' ملفاً');
  }
  function countMods(n) {
    if (isFr()) return n + (n > 1 ? ' modules' : ' module');
    return n + (n === 1 ? ' موديل' : ' موديلات');
  }
  function countSess(n) {
    if (isFr()) return n === 0 ? 'Aucune' : (n + (n > 1 ? ' séances' : ' séance'));
    return n === 0 ? 'لا حصص' : (n + (n === 1 ? ' حصة' : ' حصص'));
  }
  var chevBack = function () { return isFr() ? '‹' : '›'; };
  var chevGo = function () { return isFr() ? '›' : '‹'; };
  function profName(id) { return P[id] ? P[id].name : ''; }
  function modColor(id) {
    var i = modules.findIndex(function (m) { return m.id === id; });
    return PALETTE[(i < 0 ? 0 : i) % PALETTE.length];
  }
  function groupsFor(f, s) {
    var fl = F[f];
    if (fl && fl.groups && fl.groups[s] && fl.groups[s].length) return fl.groups[s].slice();
    var seen = {}, out = [];
    sessions.forEach(function (x) {
      if (x.filiere === f && x.semester === s && x.group && !seen[x.group]) { seen[x.group] = 1; out.push(x.group); }
    });
    return out.sort();
  }
  function modFiles(id) { return files.filter(function (x) { return x.module === id; }); }
  function dayIdx(d) { return DAYS.findIndex(function (x) { return x[0] === d; }); }
  function dayName(d) { var i = dayIdx(d); return i < 0 ? d : T(DAYS[i][1], DAYS[i][2]); }
  function sortSessions(a, b) {
    return (dayIdx(a.day) - dayIdx(b.day)) || String(a.start).localeCompare(String(b.start));
  }


  /* ---------- مجلد library: ملفات يضعها المشرف يدوياً بدون تعديل data.js ----------
     library.js (يولَّد آلياً) يحتوي قائمة مسارات مثل: probabilites/cours/ملف.pdf  أو  edt/gff_S5.webp */
  (function () {
    var list = window.POLYKO_LIBRARY;
    if (!Array.isArray(list)) return;
    var known = {};
    files.forEach(function (x) { known[x.file] = 1; });
    var EXAM = { examens: 1, examen: 1, exams: 1, exam: 1, td: 1 };
    list.slice().sort().forEach(function (rel) {
      if (typeof rel !== 'string') return;
      var parts = rel.split('/'), name = parts[parts.length - 1], path = 'library/' + rel;
      if (!/\.(pdf|webp|jpe?g|png|gif|avif)$/i.test(name) || known[path]) return;
      var base = name.replace(/\.[^.]+$/, '');
      if (parts.length === 3 && M[parts[0]]) {
        var kind = parts[1].toLowerCase();
        if (kind !== 'cours' && !EXAM[kind]) return;
        files.push({ module: parts[0], type: EXAM[kind] ? 'exam' : 'cours', title: base.replace(/_+/g, ' ').trim(), file: path });
      } else if (parts.length === 2 && parts[0] === 'edt') {
        var b = base.split('_'), fl = F[b[0]];
        if (!fl || !b[1]) return;
        timetables.push({ filiere: b[0], semester: b[1].toUpperCase(), group: b[2] ? b[2].toUpperCase() : '', title: fl.name + ' ' + b[1].toUpperCase() + (b[2] ? ' — ' + b[2].toUpperCase() : ''), file: path });
      }
    });
  })();

  /* ---------- الحالة ---------- */
  function validSel(s) {
    if (!s || !F[s.f]) return null;
    if ((F[s.f].semesters || []).indexOf(s.s) < 0) return null;
    return { f: s.f, s: s.s, g: s.g || '' };
  }
  var sel = validSel(load('polyko-sel', null));
  var draft = sel ? { f: sel.f, s: sel.s, g: sel.g } : { f: '', s: '', g: '' };
  var day = '';
  var showAllProfs = false;
  var query = '';
  var adIdx = 0, adUnits = 0;

  /* ---------- مكونات صغيرة ---------- */
  function adSlot() {
    var st = D.site || {};
    if (st.adSlots === false) return '';
    var tag = '<span class="ad-tag">' + T('إعلان', 'Annonce') + '</span>';
    var sp = D.sponsors || [];
    if (sp.length) {
      var x = sp[adIdx++ % sp.length], u = safeUrl(x.url);
      return '<aside class="ad real">' + tag + '<div class="ad-body"><strong>' +
        esc(x.name) + '</strong><span>' + esc(x.text || '') + '</span>' +
        (u ? '<a href="' + esc(u) + '" target="_blank" rel="sponsored noopener">' + T('زيارة', 'Visiter') + '</a>' : '') + '</div></aside>';
    }
    var A = window.POLYKO_ADS || {};
    if (A.client && A.slot) {
      if (adUnits >= 2) return '';           // وحدتان كحد أقصى في الصفحة الواحدة
      adUnits++;
      return '<aside class="ad-unit" aria-label="' + T('إعلان', 'Annonce') + '">' + tag +
        '<ins class="adsbygoogle" style="display:block" data-ad-client="' + esc(A.client) + '" data-ad-slot="' + esc(A.slot) +
        '" data-ad-format="auto" data-full-width-responsive="true"></ins></aside>';
    }
    if (A.client) return '';                  // الإعلانات التلقائية تضعها Google بنفسها
    if (String(st.adHtml || '').trim()) {     // كود إعلان مخصص من أي شبكة، داخل إطار معزول
      if (adUnits >= 2) return '';
      adUnits++;
      var hh = Math.min(Math.max(parseInt(st.adHtmlHeight, 10) || 250, 50), 600);
      return '<aside class="ad-unit custom" aria-label="' + T('إعلان', 'Annonce') + '">' + tag +
        '<iframe class="adframe" title="' + T('إعلان', 'Annonce') + '" loading="lazy" style="height:' + hh + 'px" ' +
        'sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"></iframe></aside>';
    }
    if (!st.adPlaceholder) return '';
    return '<aside class="ad">' + tag + '<div class="ad-body"><strong>' + T('مساحة إعلانية', 'Espace publicitaire') + '</strong>' +
      '<span>' + ''  +
      '</span></div></aside>';
  }
  function pickbar() {
    var f = F[sel.f];
    return '<div class="pickbar"><div class="pk"><span class="chip dot" style="--c:' + esc(f.color) + '"><span class="fr">' + esc(f.name) +
      '</span></span><span class="chip">' + esc(semLabel(sel.s)) + '</span>' +
      (sel.g ? '<span class="chip fr">' + esc(sel.g) + '</span>' : '') +
      '</div><a class="btn sm ghost" href="#/pick">' + T('تغيير', 'Changer') + '</a></div>';
  }
  function updatedNote() {
    return D.site && D.site.updated ? '<p class="sub" style="margin-top:14px">' + T('آخر تحديث للبيانات: ', 'Dernière mise à jour : ') + '<span class="ltr">' + esc(D.site.updated) + '</span></p>' : '';
  }
  function notFound() {
    return '<div class="empty">' + T('الصفحة غير موجودة.', 'Page introuvable.') + ' <a href="#/">' + T('العودة للرئيسية', 'Retour à l\'accueil') + '</a></div>';
  }


  /* ---------- توزيع المجموعات حسب الحرف الأول من الاسم العائلي ---------- */
  var RANGE = /^\s*([A-Za-z])\s*-\s*([A-Za-z])\s*$/;
  function letterRules(f, s) { var fl = F[f]; return (fl && fl.letters && fl.letters[s]) || null; }
  function ruleText(r) {
    if (Array.isArray(r)) return r.join(' · ');
    var m = RANGE.exec(r || ''); return m ? m[1].toUpperCase() + ' → ' + m[2].toUpperCase() : String(r || '');
  }
  function ruleHas(r, ch) {
    ch = ch.toUpperCase();
    if (Array.isArray(r)) return r.some(function (x) { return String(x).toUpperCase() === ch; });
    var m = RANGE.exec(r || ''); return !!m && ch >= m[1].toUpperCase() && ch <= m[2].toUpperCase();
  }
  var letterVal = '', letterMsg = '';
  function lettersBlock(gs) {
    var rules = letterRules(draft.f, draft.s), notes = ((F[draft.f] || {}).groupNotes || {})[draft.s] || {};
    var rows = '';
    gs.forEach(function (g) {
      var r = rules && rules[g], n = notes[g];
      if (!r && !n) return;
      rows += '<div class="lr"><b class="fr">' + esc(g) + '</b>' + (r ? '<span class="ltr">' + esc(ruleText(r)) + '</span>' : '') +
        (n ? '<small>' + esc(isFr() ? n.fr : n.ar) + '</small>' : '') + '</div>';
    });
    if (!rows) return '';
    var h = '<div class="lrules"><h3>' + (rules ? T('توزيع المجموعات حسب الحرف الأول من الاسم العائلي', 'Répartition des groupes selon la première lettre du nom') : T('ملاحظات', 'Remarques')) + '</h3>' + rows;
    if (rules) {
      h += '<label class="lfind" for="lt">' + T('اكتب الحرف الأول من اسمك العائلي', 'Première lettre de votre nom') +
        '<input id="lt" class="fr" maxlength="1" autocomplete="off" autocapitalize="characters" inputmode="text" value="' + esc(letterVal) + '"></label>' +
        '<div class="lmsg" id="ltMsg" aria-live="polite">' + esc(letterMsg) + '</div>';
    }
    return h + '</div>';
  }

  /* ---------- اختيار الشعبة ---------- */
  function viewPick() {
    var h = '<section class="hero">' + LOGO + '<div><h1>' + T('أهلاً بك في Polyko', 'Bienvenue sur Polyko') + '</h1><p>' +
      T('اختر شعبتك مرة واحدة، وسيتذكرها الموقع في المرات القادمة.', 'Choisissez votre filière une seule fois, le site s\'en souviendra.') + '</p></div></section>';
    if (!filieres.length) return h + '<div class="empty">' + T('لا توجد شعب بعد.', 'Aucune filière pour le moment.') + '</div>';
    h += '<h2>' + T('الشعبة', 'Filière') + '</h2><div class="steps">' + filieres.map(function (f) {
      return '<button type="button" class="pcard' + (draft.f === f.id ? ' on' : '') + '" style="--c:' + esc(f.color) +
        '" data-act="pickF" data-v="' + esc(f.id) + '"><i></i><span>' + esc(f.name) + '</span></button>';
    }).join('') + '</div>';

    if (draft.f) {
      var sems = F[draft.f].semesters || [];
      if (sems.length > 1) {
        h += '<h2>' + T('السداسي', 'Semestre') + '</h2><div class="chips">' + sems.map(function (s) {
          return '<button type="button" class="opt' + (draft.s === s ? ' on' : '') + '" data-act="pickS" data-v="' + esc(s) + '">' + esc(semLabel(s)) + '</button>';
        }).join('') + '</div>';
      }
      if (draft.s) {
        var gs = groupsFor(draft.f, draft.s);
        if (gs.length) {
          h += '<h2>' + T('المجموعة', 'Groupe') + '</h2><div class="chips"><button type="button" class="opt' + (draft.g === '' ? ' on' : '') + '" data-act="pickG" data-v="">' + T('الكل', 'Tous') + '</button>' +
            gs.map(function (g) {
              return '<button type="button" class="opt fr' + (draft.g === g ? ' on' : '') + '" data-act="pickG" data-v="' + esc(g) + '">' + esc(g) + '</button>';
            }).join('') + '</div>' + lettersBlock(gs);
        }
      }
    }
    h += '<div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="btn" data-act="confirm"' +
      (draft.f && draft.s ? '' : ' disabled') + '>' + T('ابدأ التصفح', 'Commencer') + '</button>' +
      (sel ? '<a class="btn ghost" href="#/modules">' + T('إلغاء', 'Annuler') + '</a>' : '') + '</div>';
    return h;
  }

  /* ---------- الموديلات ---------- */
  function viewModules() {
    var list = modules.filter(function (m) { return m.filiere === sel.f && m.semester === sel.s; });
    var h = pickbar() + '<h1>' + T('الموديلات', 'Modules') + '</h1><p class="sub">' + countMods(list.length) + '. ' +
      T('اضغط على موديل لترى الدروس والامتحانات السابقة.', 'Touchez un module pour voir les cours et les anciens examens.') + '</p><div style="height:12px"></div>';
    if (!list.length) return h + '<div class="empty">' + T('لا توجد موديلات لهذه الشعبة والسداسي بعد.', 'Aucun module pour cette filière et ce semestre pour le moment.') + '</div>' + adSlot();
    h += '<div class="grid">' + list.map(function (m) {
      var n = modFiles(m.id).length;
      var prs = (m.professors || []).map(function (p) { return 'Pr. ' + profName(p); }).join(' · ');
      return '<a class="mcard" href="#/m/' + encodeURIComponent(m.id) + '" style="--c:' + modColor(m.id) + '"><h3>' + esc(m.name) +
        '</h3><div class="meta"><div class="pr">' + esc(prs) + '</div><span>' + countFiles(n) + '</span></div></a>';
    }).join('') + '</div>' + adSlot() + updatedNote();
    return h;
  }

  /* ---------- صفحة الموديل ---------- */
  function profGroups(modId) {
    var map = {};
    ((M[modId] || {}).professors || []).forEach(function (p) { map[p] = {}; });
    sessions.forEach(function (x) {
      if (x.module === modId && x.professor) { map[x.professor] = map[x.professor] || {}; if (x.group) map[x.professor][x.group] = 1; }
    });
    return map;
  }
  function fileRow(x) {
    var url = enc(x.file);
    var ext = String(x.file || '').split('.').pop().toLowerCase();
    if (['webp', 'jpg', 'jpeg', 'png', 'gif', 'avif'].indexOf(ext) >= 0) {
      return '<button type="button" class="imgf" data-act="zoom" data-src="' + esc(url) + '" data-title="' + esc(x.title) + '"><img loading="lazy" src="' +
        esc(url) + '" alt="' + esc(x.title) + '"><span>' + esc(x.title) + '</span></button>';
    }
    return '<div class="file"><span class="ext">' + esc(ext.toUpperCase() || 'FILE') + '</span><div class="ft">' + esc(x.title) +
      '</div><div class="act"><a class="btn sm" href="' + esc(url) + '" target="_blank" rel="noopener">' + T('فتح', 'Ouvrir') + '</a>' +
      '<a class="btn sm ghost" href="' + esc(url) + '" download>' + T('تحميل', 'Télécharger') + '</a></div></div>';
  }
  function fileBlock(arr) {
    if (!arr.length) return '<div class="empty">' + T('لا توجد ملفات هنا بعد.', 'Aucun fichier pour le moment.') + '</div>';
    var imgs = arr.filter(function (x) { return !/\.pdf$/i.test(x.file || ''); });
    var docs = arr.filter(function (x) { return /\.pdf$/i.test(x.file || ''); });
    return (docs.length ? '<div class="list">' + docs.map(fileRow).join('') + '</div>' : '') +
      (imgs.length ? '<div class="imgs" style="margin-top:10px">' + imgs.map(fileRow).join('') + '</div>' : '');
  }
  function viewModule(id) {
    var m = M[id]; if (!m) return notFound();
    var f = F[m.filiere] || { color: '#2D3BFF', name: '' };
    var pg = profGroups(id), mine = sel && sel.f === m.filiere && sel.g;
    var chips = Object.keys(pg).map(function (p) {
      var gs = Object.keys(pg[p]);
      var isMine = mine && pg[p][sel.g];
      return '<a class="chip fr' + (isMine ? ' mine' : '') + '" href="#/p/' + encodeURIComponent(p) + '">Pr. ' + esc(profName(p)) +
        (gs.length ? ' · ' + esc(gs.join(', ')) : '') + (isMine ? ' (' + T('أستاذك', 'votre prof') + ')' : '') + '</a>';
    }).join('');
    var all = modFiles(id);
    var cours = all.filter(function (x) { return x.type !== 'exam'; });
    var exams = all.filter(function (x) { return x.type === 'exam'; });
    var ss = sessions.filter(function (x) { return x.module === id; }).sort(sortSessions);

    var h = '<a class="back" href="#/modules">' + chevBack() + ' ' + T('الموديلات', 'Modules') + '</a><section class="mhead" style="--c:' + modColor(id) + '"><h1>' + esc(m.name) + '</h1>' +
      '<div class="chips"><span class="chip fr">' + esc(f.name) + '</span><span class="chip">' + esc(semLabel(m.semester)) + '</span></div>' +
      (chips ? '<div class="chips">' + chips + '</div>' : '<div class="chips"><span class="chip">' + T('الأستاذ غير محدد', 'Professeur non précisé') + '</span></div>') + '</section>';
    h += '<h2>' + T('الدروس والبوليكوبي', 'Cours et polycopiés') + '</h2>' + fileBlock(cours);
    h += '<h2>' + T('الامتحانات والتمارين السابقة', 'Anciens examens et exercices') + '</h2>' + fileBlock(exams);
    if (ss.length) {
      h += '<h2>' + T('حصص هذا الموديل', 'Séances de ce module') + '</h2><div class="list">' + ss.map(function (x) {
        return '<div class="sess"><b>' + esc(dayName(x.day)) + '</b><span class="ltr">' + esc(x.start) + ' – ' + esc(x.end) + '</span>' +
          (x.group ? '<span class="chip fr">' + esc(x.group) + '</span>' : '') +
          (x.room ? '<span class="sub fr">' + esc(x.room) + '</span>' : '') + '</div>';
      }).join('') + '</div>';
    }
    return h + adSlot();
  }

  /* ---------- الأساتذة ---------- */
  function viewProfs() {
    var ids = {};
    var scoped = sel && !showAllProfs;
    modules.forEach(function (m) {
      if (scoped && !(m.filiere === sel.f && m.semester === sel.s)) return;
      (m.professors || []).forEach(function (p) { ids[p] = 1; });
    });
    var list = professors.filter(function (p) { return !scoped ? true : ids[p.id]; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
    var h = (sel ? pickbar() : '') + '<h1>' + T('الأساتذة', 'Professeurs') + '</h1><p class="sub">' + T('اضغط على أستاذ لترى موديلاته وملفاته.', 'Touchez un professeur pour voir ses modules et ses fichiers.') + '</p>';
    if (sel) {
      h += '<div style="margin:12px 0"><button type="button" class="btn sm ghost" data-act="toggleProfs">' +
        (scoped ? T('عرض كل الأساتذة', 'Voir tous les professeurs') : T('عرض أساتذة شعبتي فقط', 'Voir seulement ma filière')) + '</button></div>';
    }
    if (!list.length) return h + '<div class="empty">' + T('لا يوجد أساتذة بعد.', 'Aucun professeur pour le moment.') + '</div>';
    h += '<div class="list" style="margin-top:12px">' + list.map(function (p) {
      var n = modules.filter(function (m) { return (m.professors || []).indexOf(p.id) >= 0; }).length;
      return '<a class="row" href="#/p/' + encodeURIComponent(p.id) + '"><span class="av">' + esc(p.name.charAt(0)) + '</span><div class="tx"><b>Pr. ' + esc(p.name) +
        '</b><small>' + countMods(n) + '</small></div><span class="go">' + chevGo() + '</span></a>';
    }).join('') + '</div>' + adSlot();
    return h;
  }
  function viewProf(id) {
    var p = P[id]; if (!p) return notFound();
    var mods = modules.filter(function (m) { return (m.professors || []).indexOf(id) >= 0; });
    var h = '<a class="back" href="#/profs">' + chevBack() + ' ' + T('الأساتذة', 'Professeurs') + '</a><section class="hero" style="padding:16px 18px"><div><h1 class="fr" style="text-align:start">Pr. ' + esc(p.name) +
      '</h1><p>' + countMods(mods.length) + '</p></div></section>';
    if (!mods.length) return h + '<div class="empty">' + T('لا توجد موديلات مرتبطة بهذا الأستاذ.', 'Aucun module lié à ce professeur.') + '</div>';
    h += '<div class="list">' + mods.map(function (m) {
      var f = F[m.filiere] || { color: '#2D3BFF', name: '' }, n = modFiles(m.id).length;
      return '<a class="row" href="#/m/' + encodeURIComponent(m.id) + '"><div class="tx"><b>' + esc(m.name) + '</b><small><span class="mini" style="--c:' + esc(f.color) +
        '"></span><span class="fr">' + esc(f.name) + '</span> · ' + esc(semLabel(m.semester)) + ' · ' + countFiles(n) + '</small></div><span class="go">' + chevGo() + '</span></a>';
    }).join('') + '</div>' + adSlot();
    return h;
  }

  /* ---------- التوقيت ---------- */
  function viewEdt() {
    if (!sel) return viewPick();
    var ss = sessions.filter(function (x) {
      return x.filiere === sel.f && x.semester === sel.s && (!sel.g || !x.group || x.group === sel.g);
    });
    var count = {};
    ss.forEach(function (x) { count[x.day] = (count[x.day] || 0) + 1; });
    var todayIdx = new Date().getDay(); // 0 = الأحد
    var today = todayIdx >= 1 && todayIdx <= 6 ? DAYS[todayIdx - 1][0] : '';
    if (!day || dayIdx(day) < 0) {
      day = today || (DAYS.find(function (d) { return count[d[0]]; }) || DAYS[0])[0];
    }
    var h = pickbar() + '<h1>' + T('التوقيت', 'Emploi du temps') + '</h1><p class="sub"><span class="fr">' + esc(((F[sel.f] || {}).name) || '') + '</span> · ' + esc(semLabel(sel.s)) + '</p>';
    if (!ss.length) {
      h += '<div class="empty" style="margin-top:14px">' + T('لا توجد حصص مسجلة لهذه الشعبة والسداسي بعد.', 'Aucune séance enregistrée pour cette filière et ce semestre.') + '</div>';
    } else {
      h += '<div class="days" role="tablist" style="margin-top:12px">' + DAYS.map(function (d) {
        var c = count[d[0]] || 0;
        return '<button type="button" role="tab" class="day' + (day === d[0] ? ' on' : '') + (today === d[0] ? ' today' : '') + '" data-act="day" data-v="' + d[0] + '">' +
          T(d[1], d[2]) + '<small>' + countSess(c) + '</small></button>';
      }).join('') + '</div>';
      var todays = ss.filter(function (x) { return x.day === day; }).sort(sortSessions);
      if (!todays.length) {
        h += '<div class="empty">' + T('لا توجد حصص يوم ', 'Aucune séance le ') + esc(dayName(day)) + '.</div>';
      } else {
        h += todays.map(function (x) {
          var m = M[x.module] || { name: x.module };
          return '<article class="slot" style="--c:' + modColor(x.module) + '"><div class="tm">' + esc(x.start) + '<small>' + esc(x.end) + '</small></div><div><h3><a href="#/m/' +
            encodeURIComponent(x.module) + '">' + esc(m.name) + '</a></h3><div class="d">' +
            (x.professor ? '<span class="chip fr">Pr. ' + esc(profName(x.professor)) + '</span>' : '') +
            (x.room ? '<span class="fr">' + esc(x.room) + '</span>' : '') +
            (x.group ? '<span class="chip fr">' + esc(x.group) + '</span>' : '') + '</div>' +
            (x.note ? '<div class="nt">' + esc(x.note) + '</div>' : '') + '</div></article>';
        }).join('');
      }
    }
    var tts = timetables.filter(function (t) {
      return t.filiere === sel.f && t.semester === sel.s && t.file && (!sel.g || !t.group || t.group === sel.g);
    });
    if (tts.length) {
      h += '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">' + tts.map(function (tt) {
        var u = enc(tt.file), lab = T('عرض الجدول الأصلي', 'Voir le tableau original') + (tts.length > 1 && tt.group ? ' — ' + tt.group : '');
        return /\.pdf$/i.test(tt.file)
          ? '<a class="btn ghost" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(lab) + '</a>'
          : '<button type="button" class="btn ghost" data-act="zoom" data-src="' + esc(u) + '" data-title="' + esc(tt.title || '') + '">' + esc(lab) + '</button>';
      }).join('') + '</div>';
    }
    return h + adSlot() + updatedNote();
  }

  /* ---------- البحث ---------- */
  function viewSearch() {
    var toks = norm(query).split(/\s+/).filter(Boolean);
    function hit(hay) { var n = norm(hay); return toks.every(function (t) { return n.indexOf(t) >= 0; }); }
    var ms = modules.filter(function (m) {
      return hit(m.name + ' ' + (m.professors || []).map(profName).join(' ') + ' ' + ((F[m.filiere] || {}).name || ''));
    });
    var ps = professors.filter(function (p) { return hit(p.name); });
    var h = '<h1>' + T('نتائج البحث', 'Résultats') + '</h1><p class="sub">«' + esc(query.trim()) + '»</p>';
    if (!ms.length && !ps.length) return h + '<div class="empty" style="margin-top:12px">' + T('لا نتائج. جرّب كلمة أخرى.', 'Aucun résultat. Essayez un autre mot.') + '</div>';
    if (ms.length) {
      h += '<h2>' + T('الموديلات', 'Modules') + '</h2><div class="list">' + ms.map(function (m) {
        var f = F[m.filiere] || { color: '#2D3BFF', name: '' };
        return '<a class="row" href="#/m/' + encodeURIComponent(m.id) + '"><div class="tx"><b>' + esc(m.name) + '</b><small><span class="mini" style="--c:' + esc(f.color) +
          '"></span><span class="fr">' + esc(f.name) + '</span> · ' + esc(semLabel(m.semester)) + '</small></div><span class="go">' + chevGo() + '</span></a>';
      }).join('') + '</div>';
    }
    if (ps.length) {
      h += '<h2>' + T('الأساتذة', 'Professeurs') + '</h2><div class="list">' + ps.map(function (p) {
        return '<a class="row" href="#/p/' + encodeURIComponent(p.id) + '"><span class="av">' + esc(p.name.charAt(0)) + '</span><div class="tx"><b>Pr. ' + esc(p.name) +
          '</b></div><span class="go">' + chevGo() + '</span></a>';
      }).join('') + '</div>';
    }
    return h;
  }

  /* ---------- الموجّه ---------- */
  function parse() {
    var p = location.hash.replace(/^#\/?/, '').split('/');
    var arg = ''; try { arg = decodeURIComponent(p[1] || ''); } catch (e) { arg = p[1] || ''; }
    return { name: p[0] || '', arg: arg };
  }

  function render(scroll) {
    adIdx = 0; adUnits = 0;
    var r = parse(), html = '', tab = '', title = '';
    if (query.trim()) {
      html = viewSearch(); title = T('بحث', 'Recherche');
    } else {
      switch (r.name) {
        case '': case 'modules':
          if (!sel) { html = viewPick(); title = T('اختيار الشعبة', 'Choix de la filière'); } else { html = viewModules(); tab = 'modules'; title = T('الموديلات', 'Modules'); }
          break;
        case 'pick': html = viewPick(); title = T('اختيار الشعبة', 'Choix de la filière'); break;
        case 'profs': html = viewProfs(); tab = 'profs'; title = T('الأساتذة', 'Professeurs'); break;
        case 'edt': html = viewEdt(); tab = 'edt'; title = T('التوقيت', 'Emploi du temps'); break;
        case 'm': html = viewModule(r.arg); tab = 'modules'; title = (M[r.arg] || {}).name || ''; break;
        case 'p': html = viewProf(r.arg); tab = 'profs'; title = (P[r.arg] || {}).name || ''; break;
        default: html = notFound();
      }
    }
    app.innerHTML = html;
    Array.prototype.forEach.call(app.querySelectorAll('iframe.adframe'), function (fr) {
      fr.srcdoc = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<style>html,body{margin:0;background:transparent}body{display:flex;justify-content:center;align-items:flex-start}</style>' + String((D.site || {}).adHtml || '');
    });
    Array.prototype.forEach.call(app.querySelectorAll('ins.adsbygoogle'), function () {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    });
    var bk = document.getElementById('backBtn');
    if (bk) bk.hidden = !(query.trim() || (r.name && r.name !== 'modules' && !(r.name === 'pick' && !sel)));
    document.title = (title ? title + ' — ' : '') + 'Polyko';
    Array.prototype.forEach.call(document.querySelectorAll('.tabs a'), function (a) {
      var on = a.getAttribute('data-tab') === tab;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (scroll) window.scrollTo(0, 0);
  }

  /* ---------- الأحداث ---------- */
  // التنقل الداخلي: نعالج الروابط #/… برمجياً حتى تعمل داخل أي معاينة أو إطار محصور
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    var href = a.getAttribute('href');
    e.preventDefault();
    if (location.hash === href) render(true); else location.hash = href;
  });

  app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var a = t.getAttribute('data-act'), v = t.getAttribute('data-v');
    if (a === 'pickF') {
      var sems = (F[v] || {}).semesters || [];
      draft.f = v; draft.g = ''; letterVal = ''; letterMsg = '';
      draft.s = sems.length === 1 ? sems[0] : (sems.indexOf(draft.s) >= 0 ? draft.s : '');
      render(false);
    } else if (a === 'pickS') {
      draft.s = v; draft.g = ''; letterVal = ''; letterMsg = ''; render(false);
    } else if (a === 'pickG') {
      draft.g = v; render(false);
    } else if (a === 'confirm') {
      if (!draft.f || !draft.s) return;
      sel = { f: draft.f, s: draft.s, g: draft.g || '' };
      save('polyko-sel', sel);
      day = '';
      if (location.hash === '#/modules') render(true); else location.hash = '#/modules';
    } else if (a === 'day') {
      day = v; render(false);
    } else if (a === 'toggleProfs') {
      showAllProfs = !showAllProfs; render(false);
    } else if (a === 'zoom') {
      openLightbox(t.getAttribute('data-src'), t.getAttribute('data-title'));
    }
  });

  app.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'lt') return;
    var ch = (e.target.value || '').trim().charAt(0);
    letterVal = ch;
    var rules = letterRules(draft.f, draft.s) || {}, hit = '';
    if (!ch) letterMsg = '';
    else if (!/[A-Za-z]/.test(ch)) letterMsg = T('اكتب حرفاً لاتينياً (A–Z).', 'Saisissez une lettre latine (A–Z).');
    else {
      Object.keys(rules).forEach(function (g) { if (!hit && ruleHas(rules[g], ch)) hit = g; });
      if (hit) { draft.g = hit; letterMsg = T('مجموعتك: ', 'Votre groupe : ') + hit; }
      else letterMsg = T('هذا الحرف غير مذكور في جدول التوزيع. اختر مجموعتك يدوياً أو اسأل الإدارة.', 'Cette lettre ne figure pas dans le tableau de répartition. Choisissez votre groupe à la main.');
    }
    render(false);
    var el = document.getElementById('lt');
    if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (x) {} }
  });

  var qInput = document.getElementById('q');
  qInput.addEventListener('input', function () { query = qInput.value; render(false); });
  qInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { qInput.value = ''; query = ''; render(false); }
  });

  var navStack = [], lastHash = location.hash, goingBack = false;
  window.addEventListener('hashchange', function () {
    if (!goingBack && lastHash !== location.hash) { navStack.push(lastHash); if (navStack.length > 40) navStack.shift(); }
    goingBack = false; lastHash = location.hash;
    if (query) { query = ''; qInput.value = ''; }
    render(true);
  });
  var backBtn = document.getElementById('backBtn');
  if (backBtn) backBtn.addEventListener('click', function () {
    if (query.trim()) { query = ''; qInput.value = ''; render(false); return; }
    var prev = navStack.length ? navStack.pop() : (sel ? '#/modules' : '#/pick');
    if (prev === location.hash || prev === '') prev = sel ? '#/modules' : '#/pick';
    goingBack = true;
    if (location.hash === prev) { goingBack = false; render(true); } else location.hash = prev;
  });
  document.addEventListener('polyko:lang', function () { render(false); });

  /* ---------- عارض الصور ---------- */
  var lb = document.getElementById('lb'), lbImg = document.getElementById('lbImg'),
      lbTitle = document.getElementById('lbTitle'), lbClose = document.getElementById('lbClose'), lbBox = document.getElementById('lbBox');
  function openLightbox(src, title) {
    lbImg.src = src; lbImg.alt = title || ''; lbTitle.textContent = title || '';
    lb.classList.remove('zoom'); lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }
  function closeLightbox() {
    lb.classList.remove('open', 'zoom'); lbImg.removeAttribute('src');
    document.body.style.overflow = '';
  }
  lbClose.addEventListener('click', closeLightbox);
  lbImg.addEventListener('click', function () { lb.classList.toggle('zoom'); });
  lbBox.addEventListener('click', function (e) { if (e.target === lbBox) closeLightbox(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb.classList.contains('open')) closeLightbox(); });

  render(false);
})();
