/* copypaste — the font generator. every style is real unicode, so it pastes anywhere. click a row to copy it. */

(function () {
  var input = document.getElementById('fontin'), list = document.getElementById('styles');
  var UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', LO = 'abcdefghijklmnopqrstuvwxyz', DG = '0123456789';

  // math-alphabet styles: offsets into unicode + the letters that live somewhere else
  function alpha(up, lo, dg, holes) {
    holes = holes || {};
    return function (ch) {
      if (holes[ch]) return holes[ch];
      var i;
      if ((i = UP.indexOf(ch)) >= 0 && up) return String.fromCodePoint(up + i);
      if ((i = LO.indexOf(ch)) >= 0 && lo) return String.fromCodePoint(lo + i);
      if ((i = DG.indexOf(ch)) >= 0 && dg) return String.fromCodePoint(dg + i);
      return ch;
    };
  }
  // letter-for-letter swaps: 'from' and 'to' as matching lists
  function table(from, to) {
    var f = [...from], t = [...to], m = {};
    f.forEach(function (c, i) { if (t[i] && t[i] !== '_') m[c] = t[i]; });
    return function (ch) { return m[ch] || ch; };
  }
  function both(fn) { return function (ch) { return fn(ch.toLowerCase()) !== ch.toLowerCase() ? fn(ch.toLowerCase()) : fn(ch); }; }
  function mark(m) { return function (s) { return [...s].map(function (c) { return c === ' ' || c === '\n' ? c : c + m; }).join(''); }; }
  function each(fn) { return function (s) { return [...s].map(fn).join(''); }; }
  function flip(fn) { return function (s) { return [...s].map(fn).reverse().join(''); }; }
  function wrap(a, b) { return function (s) { return a + s + b; }; }
  function between(x) { return function (s) { return [...s].join(x); }; }

  var UPSIDE = table('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,?!()[]{}<>&_\'"',
    'ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz∀ꓭƆᗡƎℲ⅁HIſꓘ˥WNOԀΌꓤS⊥∩ΛMX⅄Z0ƖᄅƐㄣϛ9ㄥ86˙\'¿¡)(][}{><⅋‾,„');
  var MIRROR = table('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ?()[]{}<>',
    'ɒdɔbɘᆿǫʜiꞁʞlmnoqpɿꙅƚuvwxyzAᙠƆᗡƎꟻӘHIႱ⋊⅃MИOꟼỌЯꙄTUVWXYZ⸮)(][}{><');
  var SMALL = table(LO, 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ');
  var SUPER = table(LO + UP + DG + '+-=()', 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖ𐞥ʳˢᵗᵘᵛʷˣʸᶻᴬᴮꟲᴰᴱꟳᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾꟴᴿˢᵀᵁⱽᵂˣʸᶻ⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾');
  var SUB = table('aehijklmnoprstuvx' + DG + '+-=()', 'ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎');

  // look-alike alphabets (same letters, borrowed from other scripts)
  function fake(to) { return both(table(LO, to)); }

  // glitch: marks piled on each letter (same every time for the same text)
  var ABOVE = [], BELOW = [];
  for (var c = 0x300; c <= 0x315; c++) ABOVE.push(String.fromCharCode(c));
  for (c = 0x316; c <= 0x333; c++) BELOW.push(String.fromCharCode(c));
  function glitch(n) {
    return function (s) {
      return [...s].map(function (ch, i) {
        if (ch === ' ' || ch === '\n') return ch;
        var out = ch, seed = (ch.codePointAt(0) * 7 + i * 13) | 0;
        for (var k = 0; k < n; k++) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          out += (k % 2 ? BELOW : ABOVE)[seed % (k % 2 ? BELOW.length : ABOVE.length)];
        }
        return out;
      }).join('');
    };
  }

  var S = [
    ['fonts', [
      ['bold', each(alpha(0x1D400, 0x1D41A, 0x1D7CE))],
      ['italic', each(alpha(0x1D434, 0x1D44E, 0, { h: 'ℎ' }))],
      ['bold italic', each(alpha(0x1D468, 0x1D482))],
      ['cursive', each(alpha(0x1D49C, 0x1D4B6, 0, { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ' }))],
      ['bold cursive', each(alpha(0x1D4D0, 0x1D4EA))],
      ['gothic', each(alpha(0x1D504, 0x1D51E, 0, { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ' }))],
      ['bold gothic', each(alpha(0x1D56C, 0x1D586))],
      ['outlined', each(alpha(0x1D538, 0x1D552, 0x1D7D8, { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' }))],
      ['sans', each(alpha(0x1D5A0, 0x1D5BA, 0x1D7E2))],
      ['sans bold', each(alpha(0x1D5D4, 0x1D5EE, 0x1D7EC))],
      ['sans italic', each(alpha(0x1D608, 0x1D622))],
      ['sans bold italic', each(alpha(0x1D63C, 0x1D656))],
      ['typewriter', each(alpha(0x1D670, 0x1D68A, 0x1D7F6))],
      ['wide', each(function (ch) { var n = ch.codePointAt(0); return ch === ' ' ? '　' : n > 0x20 && n < 0x7F ? String.fromCodePoint(n + 0xFEE0) : ch; })],
      ['small caps', each(both(SMALL))]
    ]],
    ['lines', [
      ['underline', mark('̲')],
      ['double underline', mark('̳')],
      ['strikethrough', mark('̶')],
      ['slash', mark('̸')],
      ['overline', mark('̅')],
      ['wavy underline', mark('̰')],
      ['dotted underline', mark('̤')],
      ['x\'d out', mark('͓')],
      ['underline + strike', mark('̶̲')]
    ]],
    ['tiny', [
      ['tiny', each(SUPER)],
      ['tinier (subscript)', each(SUB)]
    ]],
    ['bubbles + boxes', [
      ['bubble', each(alpha(0x24B6, 0x24D0, 0, { 0: '⓪', 1: '①', 2: '②', 3: '③', 4: '④', 5: '⑤', 6: '⑥', 7: '⑦', 8: '⑧', 9: '⑨' }))],
      ['black bubble', each(function (ch) { var u = ch.toUpperCase(), i = UP.indexOf(u); if (i >= 0) return String.fromCodePoint(0x1F150 + i); i = DG.indexOf(ch); return i >= 0 ? '⓿❶❷❸❹❺❻❼❽❾'[i] : ch; })],
      ['squares', each(function (ch) { var i = UP.indexOf(ch.toUpperCase()); return i >= 0 ? String.fromCodePoint(0x1F130 + i) : ch; })],
      ['black squares', each(function (ch) { var i = UP.indexOf(ch.toUpperCase()); return i >= 0 ? String.fromCodePoint(0x1F170 + i) + '︎' : ch; })],
      ['parentheses', each(function (ch) { var i = LO.indexOf(ch.toLowerCase()); if (i >= 0) return String.fromCodePoint(0x249C + i); i = DG.indexOf(ch); return i > 0 ? String.fromCodePoint(0x2473 + i) : ch; })]
    ]],
    ['flipped', [
      ['upside down', flip(UPSIDE)],
      ['backwards', flip(MIRROR)]
    ]],
    ['look-alikes', [
      ['bubbly', fake('ᗩᗷᑕᗪEᖴGᕼIᒍKᒪᗰᑎOᑭᑫᖇᔕTᑌᐯᗯ᙭Yᘔ')],
      ['blocky', fake('卂乃匚ᗪ乇千Ꮆ卄丨ﾌҜㄥ爪几ㄖ卩Ɋ尺丂ㄒㄩᐯ山乂ㄚ乙')],
      ['kana', fake('ﾑ乃ᄃりɛｷムんﾉﾌズﾚﾶ刀のｱゐ尺丂ｲひ√wﾒﾘ乙')],
      ['thai', fake('ค๒ς๔єŦﻮђเןкɭ๓ภ๏קợгรՇยשฬאץչ')],
      ['swirly', fake('αႦƈԃҽϝɠԋιʝƙʅɱɳσρϙɾʂƚυʋɯxყȥ')],
      ['greek', fake('ΛBᄃDΣFGΉIJKᄂMПӨPQЯƧƬЦVЩXYZ')],
      ['curly', fake('ǟɮƈɖɛʄɢɦɨʝӄʟʍռօքզʀֆȶʊʋաӼʏʐ')],
      ['money', fake('₳฿₵ĐɆ₣₲ⱧłJ₭Ⱡ₥₦Ø₱QⱤ₴₮ɄV₩ӾɎⱫ')],
      ['runes', fake('ᚨᛒᚲᛞᛖᚠᚷᚺᛁᛃᚲᛚᛗᚾᛟᛈᛩᚱᛋᛏᚢᚡᚹᛪᛃᛉ')]
    ]],
    ['glitch', [
      ['glitch', glitch(2)],
      ['more glitch', glitch(5)],
      ['cursed', glitch(10)]
    ]],
    ['wraps', [
      ['hearts', between('♡')],
      ['sparkles', function (s) { return '✧' + [...s].join('✧') + '✧'; }],
      ['spaced', between(' ')],
      ['bow', wrap('୨ ', ' ୧')],
      ['angel', wrap('ʚ ', ' ɞ')],
      ['cloud', wrap('꒰ ', ' ꒱')],
      ['goth', wrap('♱ ', ' ♱')],
      ['crosses', wrap('✞ ', ' ✞')],
      ['stars', wrap('⋆｡°✩ ', ' ✩°｡⋆')],
      ['magic', wrap('✧･ﾟ: ', ' :･ﾟ✧')],
      ['cartouche', wrap('𓆩 ', ' 𓆪')],
      ['brackets', wrap('【', '】')],
      ['quotes', wrap('『', '』')],
      ['moon', wrap('☾ ', ' ☽')],
      ['sparkle line', wrap('‧₊˚✧ ', ' ✧˚₊‧')]
    ]]
  ];

  function draw() {
    var text = input.value || input.placeholder;
    list.innerHTML = '';
    var frag = document.createDocumentFragment();
    S.forEach(function (group) {
      var h = document.createElement('h4');
      h.textContent = group[0];
      frag.appendChild(h);
      group[1].forEach(function (st) {
        var out = st[1](text);
        var row = document.createElement('div');
        row.className = 'st';
        var b = document.createElement('b');
        b.textContent = st[0];
        var span = document.createElement('span');
        span.textContent = out;
        row.appendChild(b);
        row.appendChild(span);
        row.addEventListener('click', function () { CP.copy(st[1](input.value || input.placeholder), row); });
        frag.appendChild(row);
      });
    });
    list.appendChild(frag);
  }
  input.addEventListener('input', function () {
    try { localStorage.setItem('cp-fontin', input.value); } catch (e) { /* ignore */ }
    draw();
  });
  try { input.value = localStorage.getItem('cp-fontin') || ''; } catch (e) { /* ignore */ }
  draw();

  window.__fonts = S;
})();
