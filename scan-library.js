// Polyko — يمسح مجلد library ويولّد library.js (للاستعمال مع النشر الآلي عبر GitHub أو من حاسوبك).
// الاستعمال:  node scan-library.js           ← يولّد library.js
//             node scan-library.js --init    ← ينشئ مجلدات cours/examens لكل موديل ثم يولّد library.js
const fs = require('fs'), path = require('path'), vm = require('vm');
// إذا وُجد مجلد public (نشر Cloudflare عبر GitHub) فالموقع بداخله، ومجلد library في جذر المستودع يُنسخ إليه
const pub = path.join(__dirname, 'public');
const root = fs.existsSync(path.join(pub, 'data.js')) ? pub : __dirname, lib = path.join(root, 'library');
if (root === pub && fs.existsSync(path.join(__dirname, 'library'))) fs.cpSync(path.join(__dirname, 'library'), lib, { recursive: true });
const sb = { window: {} }; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), sb);
const D = sb.window.POLYKO_DATA;
const ids = new Set(D.modules.map(m => m.id)), fids = new Set(D.filieres.map(f => f.id));
const KINDS = new Set(['cours', 'examens', 'examen', 'exams', 'exam', 'td']);
if (process.argv.includes('--init')) {
  D.modules.forEach(m => ['cours', 'examens'].forEach(k => fs.mkdirSync(path.join(lib, m.id, k), { recursive: true })));
  fs.mkdirSync(path.join(lib, 'edt'), { recursive: true });
}
const ok = [], bad = [], inbox = [];
(function walk(dir, rel) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    if (e.name.startsWith('.')) return;
    const r = rel ? rel + '/' + e.name : e.name;
    if (r === 'inbox' || r.indexOf('inbox/') === 0) { if (!e.isDirectory()) inbox.push(r); else walk(path.join(dir, e.name), r); return; }
    if (e.isDirectory()) return walk(path.join(dir, e.name), r);
    const parts = r.split('/');
    let good = false;
    if (!/\.(pdf|webp|jpe?g|png|gif|avif)$/i.test(e.name)) { bad.push(r + ' — نوع غير مدعوم'); return; }
    if (parts.length === 3 && ids.has(parts[0]) && KINDS.has(parts[1].toLowerCase())) good = true;
    else if (parts.length === 2 && parts[0] === 'edt') {
      const b = e.name.replace(/\.[^.]+$/, '').split('_');
      good = fids.has(b[0]) && /^S[1-6]$/i.test(b[1] || '');
    }
    if (!good) { bad.push(r + ' — مكانه أو اسمه غير معروف'); return; }
    ok.push(r);
  });
})(lib, '');

// ===== صندوق الاستقبال: ضع الملفات في library/inbox وسيصنّفها السكريبت حسب اسم الملف =====
// أمثلة:  probabilites-examen-2023.pdf   |   cours maths chapitre 1.pdf   |   edt tc-gestion S1 grp A.webp
const strip = x => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ');
const ALIAS = {
  'probabilites': ['proba'], 'mathematique': ['math', 'analyse'], 'sociologie-organisations': ['socio'],
  'management-organisations': ['management', 'manag'], 'economie-maroc': ['economie maroc', 'eco maroc'],
  'compta-analytique': ['analytique'], 'droit-entreprises': ['droit entreprise', 'droit des entreprise'],
  'langues-francais': ['francais', 'french'], 'fiscalite-entreprises-1': ['fiscalite', 'fiscal'],
  'controle-gestion': ['controle gestion', 'controle de gestion', 'cdg'], 'droit-affaires': ['droit affaires', 'droit des affaires'],
  'choix-investissement': ['investissement', 'financement'], 'langues-anglais-gff': ['anglais', 'english'],
  'langues-anglais-mac': ['anglais', 'english'], 'excel-avance': ['excel'], 'comptabilite-approfondie': ['approfondie'],
  'crm': ['crm', 'relation client'], 'tec': ['tec', 'expression'], 'marketing-strategique': ['marketing'],
  'etude-marche': ['etude marche', 'etude de marche'], 'techniques-vente': ['vente'], 'droit-commercial': ['droit commercial'],
  'microeconomie-1': ['micro'], 'intro-science-gestion': ['science de gestion', 'science gestion'],
  'compta-generale-1': ['compta generale', 'comptabilite generale'], 'intro-etude-droit': ['etude de droit', 'etude droit', 'intro droit', 'introduction droit'],
  'macroeconomie-1': ['macro'], 'mtu': ['mtu']
};
const EXAMW = ['exam', 'ds', 'rattrap', 'normale', 'session', 'td', 'serie', 'exercice', 'corrige', 'correction', 'qcm'];
const COURSW = ['cours', 'chapitre', 'resume', 'support', 'poly'];
const has = (n, w) => (' ' + n).indexOf(' ' + w) >= 0;
inbox.sort().forEach(r => {
  const name = r.split('/').pop(), n = strip(name.replace(/\.[^.]+$/, ''));
  if (!/\.(pdf|webp|jpe?g|png|gif|avif)$/i.test(name)) { bad.push(r + ' — نوع غير مدعوم'); return; }
  let dest = '';
  const f = D.filieres.map(x => x.id).find(id => has(n, strip(id).trim()));
  const sm = n.match(/(?:^| )s([1-6])(?: |$)/);
  if (f && sm && (has(n, 'edt') || has(n, 'emploi') || has(n, 'timetable') || has(n, 'horaire'))) {
    const g = n.match(/(?:grp|groupe|group) ?([a-e])\b/);
    dest = 'edt/' + f + '_S' + sm[1] + (g ? '_' + (((D.filieres.find(x => x.id === f) || {}).groups || {})['S' + sm[1]] || []).find(z => z === 'GRP-' + g[1].toUpperCase()) || g[1].toUpperCase() : '') + path.extname(name).toLowerCase();
  } else {
    let mods = Object.keys(ALIAS).filter(id => ALIAS[id].some(a => has(n, a)) && ids.has(id));
    if (mods.length === 2 && mods.every(m => /^langues-anglais/.test(m))) mods = mods.filter(m => has(n, m.split('-').pop()));
    const ex = EXAMW.some(w => has(n, w)), co = COURSW.some(w => has(n, w));
    if (mods.length !== 1) { bad.push(r + (mods.length ? ' — يطابق أكثر من موديل' : ' — لم أجد اسم الموديل في اسم الملف')); return; }
    if (ex === co) { bad.push(r + ' — لا أعرف هل هو درس أم امتحان (أضف كلمة cours أو examen للاسم)'); return; }
    dest = mods[0] + '/' + (ex ? 'examens' : 'cours') + '/' + name;
  }
  const to = path.join(lib, dest); fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(lib, r), to); ok.push(dest); console.log('صُنِّف: ' + r + '  ←  ' + dest);
});
if (root === pub) fs.rmSync(path.join(lib, 'inbox'), { recursive: true, force: true });
ok.sort();
fs.writeFileSync(path.join(root, 'library.js'),
  '// Polyko — قائمة ملفات المجلد library. تُولَّد آلياً، لا تعدّلها يدوياً\nwindow.POLYKO_LIBRARY = [\n' +
  ok.map(x => '  ' + JSON.stringify(x)).join(',\n') + (ok.length ? '\n' : '') + '];\n');
console.log(ok.length + ' ملف في library.js');
bad.forEach(b => console.log('تم تجاهل: ' + b));
