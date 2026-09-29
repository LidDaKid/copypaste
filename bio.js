/* copypaste — bio maker: fill in a few things, get decorated bios for insta/tiktok/roblox/discord. click one to copy. */

(function () {
  var root = document.getElementById('biomain');
  if (!root) return;
  var ZODIAC = [['', 'zodiac'], ['aries', '♈︎'], ['taurus', '♉︎'], ['gemini', '♊︎'], ['cancer', '♋︎'], ['leo', '♌︎'], ['virgo', '♍︎'],
    ['libra', '♎︎'], ['scorpio', '♏︎'], ['sagittarius', '♐︎'], ['capricorn', '♑︎'], ['aquarius', '♒︎'], ['pisces', '♓︎']];
  var FIELDS = [['name', 'name'], ['pronouns', 'pronouns'], ['age', 'age'], ['likes', 'likes'], ['music', 'music'], ['extra', 'one more line']];
  var v = {};
  try { v = JSON.parse(localStorage.getItem('cp-bio') || '{}'); } catch (e) { v = {}; }

  var form = document.createElement('div');
  form.className = 'bio-form';
  FIELDS.forEach(function (f) {
    var i = document.createElement('input');
    i.type = 'text';
    i.placeholder = f[1];
    i.value = v[f[0]] || '';
    i.addEventListener('input', function () { v[f[0]] = i.value; changed(); });
    form.appendChild(i);
  });
  var z = document.createElement('select');
  ZODIAC.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[0] ? o[0] + ' ' + o[1] : o[1]; z.appendChild(op); });
  z.value = v.zodiac || '';
  z.addEventListener('change', function () { v.zodiac = z.value; changed(); });
  form.insertBefore(z, form.children[3]);
  var out = document.createElement('div');
  out.className = 'bio-out';
  root.appendChild(form);
  root.appendChild(out);

  function F(name) {
    var fn = null;
    (window.__fonts || []).forEach(function (g) { g[1].forEach(function (st) { if (st[0] === name) fn = st[1]; }); });
    return fn || function (s) { return s; };
  }

  // each bio is a list of lines; a line with an empty field in it is left out
  var T = [
    ['soft', function (d) { return ['˚₊‧꒰ა ' + F('cursive')(d.name) + ' ໒꒱ ‧₊˚', d.pronouns && '⋆ ' + d.pronouns + ' ⋆ ' + d.zs + ' ' + d.zodiac + (d.age ? ' ⋆ ' + d.age : ''), d.likes && '♡ ' + d.likes, d.music && '♪ ' + d.music, d.extra && '⊹ ' + d.extra]; }],
    ['goth', function (d) { return ['♱ ' + F('bold gothic')(d.name) + ' ♱', '✞ ' + [d.pronouns, d.zs && d.zs + ' ' + d.zodiac, d.age].filter(Boolean).join(' ┆ '), d.likes && '⸸ ' + d.likes, d.music && '⛧ ' + d.music, d.extra && '† ' + d.extra]; }],
    ['stars', function (d) { return ['✧ ' + F('small caps')(d.name) + ' ✧', '☾ ' + [d.pronouns, d.zodiac && d.zodiac + ' ' + d.zs, d.age].filter(Boolean).join(' ☆ '), d.likes && '✦ likes: ' + d.likes, d.music && '✦ music: ' + d.music, d.extra && '✦ ' + d.extra]; }],
    ['lined', function (d) { return ['─── ⋆⋅☆⋅⋆ ───', F('bold')(d.name) + (d.pronouns ? ' (' + d.pronouns + ')' : ''), [d.zs && d.zs + ' ' + d.zodiac, d.age].filter(Boolean).join(' • '), d.likes && '♡ ' + d.likes, d.music && '♫ ' + d.music, d.extra, '─── ⋆⋅☆⋅⋆ ───']; }],
    ['kawaii', function (d) { return ['₍ᐢ. .ᐢ₎ ' + d.name, [d.pronouns && '꒰ ' + d.pronouns + ' ꒱', d.zodiac && '꒰ ' + d.zodiac + ' ' + d.zs + ' ꒱'].filter(Boolean).join(' '), d.likes && '♡ ' + d.likes + ' ♡', d.music && '♪ ' + d.music + ' ♪', d.extra && '˚₊‧ ' + d.extra + ' ‧₊˚']; }],
    ['scene', function (d) { return ['xX ' + F('sans bold')(d.name) + ' Xx', '★ ' + [d.pronouns, d.age, d.zodiac].filter(Boolean).join(' ★ ') + ' ★', d.likes && '♡ ' + d.likes, d.music && '♫ ' + d.music, d.extra && '✗ ' + d.extra]; }],
    ['tiny', function (d) { var t = F('tiny'); return ['⋆ ' + t(d.name) + ' ⋆', [d.pronouns && t(d.pronouns), d.zs].filter(Boolean).join(' ˖ '), d.likes && '♡ ' + t(d.likes), d.music && '♪ ' + t(d.music), d.extra && '˖ ' + t(d.extra)]; }],
    ['angel', function (d) { return ['ʚ ' + F('cursive')(d.name) + ' ɞ', 'ଓ ' + [d.pronouns, d.zs && d.zs + ' ' + d.zodiac].filter(Boolean).join(' ଓ '), d.likes && '☁︎ ' + d.likes, d.music && '♪ ' + d.music, d.extra && '✧ ' + d.extra]; }]
  ];

  function data() {
    var d = {};
    FIELDS.forEach(function (f) { d[f[0]] = (v[f[0]] || '').trim(); });
    if (!d.name) d.name = 'name';
    var zz = ZODIAC.filter(function (o) { return o[0] === v.zodiac && o[0]; })[0];
    d.zodiac = zz ? zz[0] : '';
    d.zs = zz ? zz[1] : '';
    return d;
  }

  function draw() {
    var d = data();
    out.innerHTML = '';
    T.forEach(function (t) {
      var text = t[1](d).filter(function (l) { return l && l.replace(/[\s✞☾★⋆ଓ]/g, '').length; }).join('\n');
      var card = document.createElement('div');
      card.className = 'bio-card';
      var b = document.createElement('b');
      b.textContent = t[0];
      var pre = document.createElement('div');
      pre.className = 'bio-text';
      pre.textContent = text;
      card.appendChild(b);
      card.appendChild(pre);
      card.addEventListener('click', function () { CP.copy(pre.textContent, card); });
      out.appendChild(card);
    });
  }
  function changed() {
    try { localStorage.setItem('cp-bio', JSON.stringify(v)); } catch (e) { /* ignore */ }
    draw();
  }
  draw();
})();
