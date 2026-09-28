/* copypaste — the symbol catalogue: every unicode symbol (no letters, no emoji) + the cute picks. click = copy. */

var CP = (function () {
  var $ = function (s) { return document.querySelector(s); };
  var side = $('#side'), grid = $('#grid'), title = $('#title'), search = $('#search');
  var tray = $('#trayText'), toast = $('#toast');
  var DATA = {}, NAMES = null, MARKS = new Set(), BLANKS = new Set(), current = null, toastTimer;

  function store(k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null');
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  var saved = store('cp-saved') || [], recent = store('cp-recent') || [];
  tray.value = store('cp-tray') || '';

  /* ---------- copying ---------- */

  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).catch(function () { legacy(t); });
    legacy(t);
    return Promise.resolve();
  }
  function legacy(t) {
    var a = document.createElement('textarea');
    a.value = t;
    a.style.position = 'fixed';
    a.style.opacity = '0';
    document.body.appendChild(a);
    a.select();
    try { document.execCommand('copy'); } catch (e) { /* nothing else to try */ }
    a.remove();
  }
  function flash(msg) {
    toast.textContent = msg;
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('on'); }, 1100);
  }
  // copy one thing, and keep a running string of everything clicked in the tray
  function copy(t, el, noTray) {
    copyText(t);
    if (!noTray) {
      tray.value += t;
      store('cp-tray', tray.value);
      recent = [t].concat(recent.filter(function (x) { return x !== t; })).slice(0, 80);
      store('cp-recent', recent);
    }
    flash('copied ' + (t.length > 24 ? t.slice(0, 24) + '…' : t));
    if (el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  }
  $('#trayCopy').addEventListener('click', function () { if (tray.value) copy(tray.value, null, true); });
  $('#trayClear').addEventListener('click', function () { tray.value = ''; store('cp-tray', ''); });
  tray.addEventListener('input', function () { store('cp-tray', tray.value); });

  /* ---------- data ---------- */

  function runs(r) {
    var out = [];
    for (var i = 0; i < r.length; i += 2) for (var k = 0; k < r[i + 1]; k++) out.push(r[i] + k);
    return out;
  }
  function nameOf(cp) {
    if (NAMES && NAMES.has(cp)) return NAMES.get(cp);
    var rg = (DATA.blocks.ranges || []).filter(function (r) { return cp >= r[0] && cp <= r[1]; })[0];
    return rg ? rg[2].toUpperCase() + '-' + cp.toString(16).toUpperCase() : '';
  }
  // which google noto font draws this character (fonts.json = [start, end, font, block] sorted by start)
  function fontFor(cp) {
    var f = DATA.fonts, lo = 0, hi = f.length - 1;
    if (!f.length) return null;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (f[mid][0] <= cp) lo = mid; else hi = mid - 1; }
    return cp >= f[lo][0] && cp <= f[lo][1] ? f[lo][2] : null;
  }
  function label(cp) { return 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'); }
  function shortName(cp) {
    var n = nameOf(cp) || label(cp);
    return n.replace(/ZERO WIDTH/, 'ZW').replace(/SPACE/, 'SP').toLowerCase();
  }

  /* ---------- tiles ---------- */

  function tile(text, opts) {
    opts = opts || {};
    var d = document.createElement('div');
    var cp = [...text].length === 1 ? text.codePointAt(0) : null;
    d.className = 't' + (opts.combo ? ' combo' : '');
    if (cp != null && BLANKS.has(cp)) {
      d.className += ' blank';
      d.textContent = shortName(cp);
    } else if (cp != null && MARKS.has(cp)) {
      d.textContent = '◌' + text;
    } else {
      d.textContent = text;
    }
    if (cp != null) d.title = (nameOf(cp) ? nameOf(cp).toLowerCase() + '  ' : '') + label(cp);
    var fav = document.createElement('i');
    fav.className = 'fav' + (saved.indexOf(text) >= 0 ? ' on' : '');
    fav.textContent = '♡';
    fav.addEventListener('click', function (e) {
      e.stopPropagation();
      var i = saved.indexOf(text);
      if (i >= 0) saved.splice(i, 1); else saved.unshift(text);
      store('cp-saved', saved);
      fav.classList.toggle('on', i < 0);
      fav.textContent = i < 0 ? '♥' : '♡';
      if (current === 'saved') show('saved');
    });
    if (saved.indexOf(text) >= 0) fav.textContent = '♥';
    d.appendChild(fav);
    d.addEventListener('click', function () { copy(text, d); });
    return d;
  }

  function fill(sections, opts) {
    grid.innerHTML = '';
    grid.className = opts && opts.wide ? 'wide' : '';
    if (opts && opts.font) grid.style.fontFamily = ''; // per-block font goes on the tiles below
    var frag = document.createDocumentFragment();
    sections.forEach(function (s) {
      if (s.head) { var h = document.createElement('h4'); h.textContent = s.head; frag.appendChild(h); }
      s.items.forEach(function (t) {
        var el = tile(t, { combo: opts && opts.wide });
        if (opts && opts.font) el.style.fontFamily = "'" + opts.font + "', " + getComputedStyle(document.documentElement).getPropertyValue('--glyph');
        frag.appendChild(el);
      });
    });
    grid.appendChild(frag);
    document.getElementById('main').scrollTop = 0;
  }

  function setTitle(t, n) { title.innerHTML = ''; title.textContent = t; if (n != null) { var s = document.createElement('small'); s.textContent = n; title.appendChild(s); } }

  // noto fonts for the rarer blocks, loaded only when a block is opened
  var loadedFonts = {}, extraFams = [];
  var BASE = getComputedStyle(document.documentElement).getPropertyValue('--glyph').replace(/,\s*sans-serif\s*$/, '');
  function needFont(fam) {
    if (!fam || loadedFonts[fam]) return;
    loadedFonts[fam] = true;
    // also a fallback for every tile, so rare symbols anywhere (cute picks, search) draw instead of boxes
    extraFams.push("'" + fam + "'");
    document.documentElement.style.setProperty('--glyph', BASE + ', ' + extraFams.join(', ') + ', sans-serif');
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + fam.replace(/ /g, '+') + '&display=swap';
    document.head.appendChild(l);
  }

  /* ---------- views ---------- */

  var VIEWS = {};
  function show(key) {
    current = key;
    store('cp-view', key);
    [].forEach.call(side.querySelectorAll('a'), function (a) { a.classList.toggle('on', a.dataset.key === key); });
    search.value = '';
    VIEWS[key] && VIEWS[key]();
  }

  function nav(head, items) {
    var h = document.createElement('h3');
    h.textContent = head;
    side.appendChild(h);
    items.forEach(function (it) {
      var a = document.createElement('a');
      a.dataset.key = it.key;
      a.textContent = it.label;
      if (it.count != null) { var s = document.createElement('span'); s.textContent = it.count; a.appendChild(s); }
      a.addEventListener('click', function () { show(it.key); });
      side.appendChild(a);
      VIEWS[it.key] = it.view;
    });
  }

  function build() {
    var cute = DATA.cute, combos = DATA.combos, cols = DATA.collections, blocks = DATA.blocks.blocks, fonts = DATA.fonts;
    runs(DATA.blocks.marks).forEach(function (cp) { MARKS.add(cp); });
    runs(DATA.blocks.blanks).forEach(function (cp) { BLANKS.add(cp); });
    var cuteCount = cute.reduce(function (n, s) { return n + s.c.length; }, 0);
    // load the fonts the cute picks + combos need (the rare-block ones)
    var need = {};
    cute.concat(combos).forEach(function (s) {
      s.c.forEach(function (t) { [...t].forEach(function (ch) { var f = fontFor(ch.codePointAt(0)); if (f) need[f] = 1; }); });
    });
    Object.keys(need).forEach(needFont);

    nav('yours', [
      { key: 'saved', label: 'saved', view: function () { setTitle('saved', saved.length); fill([{ items: saved }]); } },
      { key: 'recent', label: 'recent', view: function () { setTitle('recent', recent.length); fill([{ items: recent }]); } }
    ]);
    nav('cute', [{ key: 'cute', label: 'all the cute ones', count: cuteCount, view: function () {
      setTitle('all the cute ones', cuteCount);
      fill(cute.map(function (s) { return { head: s.n, items: s.c }; }));
    } }].concat(cute.map(function (s, i) {
      return { key: 'cute' + i, label: s.n, count: s.c.length, view: function () { setTitle(s.n, s.c.length); fill([{ items: s.c }]); } };
    })));
    nav('combos', combos.map(function (s, i) {
      return { key: 'combo' + i, label: s.n, count: s.c.length, view: function () { setTitle(s.n, s.c.length); fill([{ items: s.c }], { wide: true }); } };
    }));
    nav('collections', cols.map(function (s, i) {
      return { key: 'col' + i, label: s.n, count: s.c.length, view: function () {
        setTitle(s.n, s.c.length);
        fill([{ items: s.c.map(function (cp) { return String.fromCodePoint(cp); }) }]);
      } };
    }));
    var total = blocks.reduce(function (n, b) { return n + b.r.filter(function (x, i) { return i % 2; }).reduce(function (a, c) { return a + c; }, 0); }, 0);
    nav('every symbol (' + total.toLocaleString() + ')', blocks.map(function (b, i) {
      var n = b.r.filter(function (x, k) { return k % 2; }).reduce(function (a, c) { return a + c; }, 0);
      return { key: 'block' + i, label: b.n.toLowerCase(), count: n, view: function () {
        var fam = fontFor(b.a);
        needFont(fam);
        setTitle(b.n.toLowerCase(), n);
        fill([{ items: runs(b.r).map(function (cp) { return String.fromCodePoint(cp); }) }], { font: fam });
      } };
    }));

    var start = store('cp-view');
    show(VIEWS[start] ? start : 'cute');
  }

  /* ---------- search (by official name, e.g. "heart", "skull", "arrow up") ---------- */

  var searchTimer;
  search.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 150);
  });
  function runSearch() {
    var q = search.value.trim().toLowerCase();
    if (!q) { VIEWS[current] && VIEWS[current](); return; }
    [].forEach.call(side.querySelectorAll('a'), function (a) { a.classList.remove('on'); });
    var words = q.split(/\s+/);
    var hits = [];
    // a pasted symbol finds itself
    if ([...q].length <= 3 && /[^\x00-\x7f]/.test(q)) [...q].forEach(function (ch) { hits.push(ch); });
    if (NAMES) {
      NAMES.forEach(function (n, cp) {
        if (hits.length > 2000) return;
        var low = n.toLowerCase();
        if (words.every(function (w) { return low.indexOf(w) >= 0; })) hits.push(String.fromCodePoint(cp));
      });
    }
    var combos = [];
    DATA.combos.forEach(function (s) { if (s.n.indexOf(q) >= 0) combos = combos.concat(s.c); });
    hits.forEach(function (h) { needFont(fontFor(h.codePointAt(0))); });
    setTitle('“' + q + '”', hits.length + combos.length);
    fill([{ items: hits }].concat(combos.length ? [{ head: 'combos', items: combos }] : []));
  }

  /* ---------- start ---------- */

  function get(f, type) { return fetch('data/' + f).then(function (r) { return type === 'text' ? r.text() : r.json(); }); }
  Promise.all([get('cute.json'), get('combos.json'), get('collections.json'), get('blocks.json'), get('fonts.json')]).then(function (r) {
    DATA = { cute: r[0], combos: r[1], collections: r[2], blocks: r[3], fonts: r[4] };
    build();
    return get('names.txt', 'text');
  }).then(function (txt) {
    NAMES = new Map();
    txt.split('\n').forEach(function (l) { var i = l.indexOf(';'); NAMES.set(parseInt(l.slice(0, i), 16), l.slice(i + 1)); });
    if (search.value) runSearch();
  });

  /* ---------- pages ---------- */

  function page() {
    var p = location.hash.slice(1) === 'fonts' ? 'fonts' : 'symbols';
    [].forEach.call(document.querySelectorAll('.page'), function (m) { m.classList.toggle('on', m.id === p); });
    [].forEach.call(document.querySelectorAll('#pages a'), function (a) { a.classList.toggle('on', a.dataset.page === p); });
  }
  window.addEventListener('hashchange', page);
  page();

  return { copy: copy, show: function (k) { show(k); }, data: function () { return DATA; }, names: function () { return NAMES; } };
})();
