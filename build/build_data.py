"""Builds the symbol catalogue data from the official Unicode Character Database.
Run:  python build/build_data.py <folder with UnicodeData.txt, Blocks.txt, emoji-test.txt>
Writes data/blocks.json, data/names.txt, data/collections.json, data/fonts.json"""
import json, os, re, sys, urllib.request, concurrent.futures as cf

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
os.makedirs(OUT, exist_ok=True)

# ---------- characters ----------
chars = {}      # cp -> (name, category)
ranges = []     # (start, end, label, category) for big algorithmic ranges (CJK, hangul, tangut...)
first = None
for line in open(os.path.join(SRC, 'UnicodeData.txt'), encoding='utf8'):
    f = line.rstrip('\n').split(';')
    cp, name, cat = int(f[0], 16), f[1], f[2]
    if name.endswith(', First>'):
        first = (cp, name[1:-8], cat)
        continue
    if name.endswith(', Last>'):
        ranges.append((first[0], cp, first[1], first[2]))
        continue
    if name == '<control>':
        name = f[10] or 'CONTROL'
    chars[cp] = (name, cat)


# emoji are left out on purpose (she wants symbols, not emoji): anything that shows as a color emoji by default
EMOJI = set()
for line in open(os.path.join(SRC, 'emoji-data.txt'), encoding='utf8'):
    line = line.split('#')[0].strip()
    if 'Emoji_Presentation' in line or 'Extended_Pictographic' in line and False:
        r = line.split(';')[0].strip()
        a, b = (r.split('..') + [r])[:2]
        EMOJI.update(range(int(a, 16), int(b, 16) + 1))
EMOJI.update(range(0x1F1E6, 0x1F200))  # regional indicator letters (they turn into flags)

INVISIBLE = {0x200B, 0x200C, 0x200D, 0x2060, 0xFEFF, 0x034F, 0x061C, 0x180E, 0x00AD, 0x2061, 0x2062, 0x2063, 0x2064}
# symbols = symbol + punctuation + number-ish + decorative combining marks + spaces; no letters, digits or emoji
KEEP_CATS = ('Sm', 'Sc', 'Sk', 'So', 'Pc', 'Pd', 'Ps', 'Pe', 'Pi', 'Pf', 'Po', 'No', 'Nl', 'Mn', 'Me', 'Zs')


def keep(cp, cat):
    if cp in EMOJI:
        return False
    if cp in INVISIBLE:
        return True
    if cat not in KEEP_CATS:
        return False
    if cp < 0x80 and (chr(cp).isalnum() or cp == 0x20):
        return False
    return True


blocks = []
for line in open(os.path.join(SRC, 'Blocks.txt'), encoding='utf8'):
    line = line.split('#')[0].strip()
    if not line:
        continue
    rng, name = line.split(';')
    a, b = [int(x, 16) for x in rng.split('..')]
    blocks.append([a, b, name.strip()])


def in_ranges(cp):
    for a, b, label, cat in ranges:
        if a <= cp <= b:
            return label, cat
    return None


out_blocks = []
names_lines = []
total = 0
for a, b, bname in blocks:
    if 'Surrogates' in bname or 'Private Use' in bname:
        continue
    cps = []
    for cp in range(a, b + 1):
        if cp in chars:
            name, cat = chars[cp]
            if keep(cp, cat):
                cps.append(cp)
                names_lines.append('%X;%s' % (cp, name))
        else:
            r = in_ranges(cp)
            if r and keep(cp, r[1]):
                cps.append(cp)  # name is "<range label>-XXXX", made on the fly in the page
    if not cps:
        continue
    # run-length: [start, count, start, count...]
    runs = []
    for cp in cps:
        if runs and runs[-2] + runs[-1] == cp:
            runs[-1] += 1
        else:
            runs += [cp, 1]
    total += len(cps)
    out_blocks.append({'n': bname, 'a': a, 'b': b, 'r': runs})

range_labels = [[a, b, label] for a, b, label, cat in ranges]


def runs_of(cps):
    out = []
    for cp in sorted(cps):
        if out and out[-2] + out[-1] == cp:
            out[-1] += 1
        else:
            out += [cp, 1]
    return out


# marks attach to the character before them (shown on a dotted circle); blanks get a label instead of a glyph
marks = [cp for cp, (n, c) in chars.items() if c in ('Mn', 'Me') and keep(cp, c)]
blanks = [cp for cp, (n, c) in chars.items() if (c in ('Zs', 'Cf') or cp in INVISIBLE) and keep(cp, c)] + [0x2800, 0x3164, 0xFFA0, 0x115F, 0x1160]
json.dump({'blocks': out_blocks, 'ranges': range_labels, 'marks': runs_of(marks), 'blanks': runs_of(set(blanks)), 'version': open(os.path.join(SRC, 'ReadMe.txt')).read().split('version ')[1].split(' ')[0]},
          open(os.path.join(OUT, 'blocks.json'), 'w', encoding='utf8'), separators=(',', ':'))
open(os.path.join(OUT, 'names.txt'), 'w', encoding='utf8').write('\n'.join(names_lines))
print('characters:', total, 'blocks:', len(out_blocks))

# ---------- collections (the popular stuff, found by name) ----------
named = [(cp, n, c) for cp, (n, c) in chars.items() if keep(cp, c)]


def find(pat, exclude=None, cats=None):
    rx = re.compile(pat)
    ex = re.compile(exclude) if exclude else None
    out = []
    for cp, n, c in named:
        if cats and c not in cats:
            continue
        if rx.search(n) and not (ex and ex.search(n)):
            out.append(cp)
    return sorted(set(out))


SYM = ('So', 'Sm', 'Sc', 'Sk', 'Po', 'Pd', 'Ps', 'Pe', 'Pi', 'Pf', 'No', 'Nl')
C = [
    ('hearts', find(r'\bHEART', cats=SYM)),
    ('stars + sparkles', find(r'\bSTAR\b|\bSTARS\b|SPARKLE|ASTERISK|ASTERISM|\bSTAR ', r'START|STARE', SYM)),
    ('flowers', find(r'FLOWER|FLORAL|FLORETTE|ROSETTE|BLOSSOM|TULIP|\bROSE\b|HIBISCUS|SUNFLOWER|LOTUS|BOUQUET|\bLEAF\b|HERB|SEEDLING|CHERRY', cats=SYM)),
    ('moons + night', find(r'MOON|CRESCENT|NIGHT|COMET|SATURN|PLANET|\bSUN\b', cats=SYM)),
    ('skulls + spooky', find(r'SKULL|BONES|COFFIN|GHOST|BAT\b|SPIDER|WEB\b|DAGGER|BLOOD|DEVIL|DEMON|POISON|TOMBSTONE|URN|CANDLE|SCYTHE|PENTAGRAM|VAMPIRE|ZOMBIE|JACK-O', cats=SYM)),
    ('crosses', find(r'CROSS\b|CROSSES|CROSS ', r'CROSSING|CROSSED ARROW', SYM)),
    ('music', find(r'MUSIC|NOTE\b|NOTES\b|CLEF|SHARP|\bFLAT\b|NATURAL SIGN|QUAVER|CROTCHET|MINIM|STAFF', r'NOTEBOOK', SYM)),
    ('arrows', find(r'ARROW', cats=SYM)),
    ('bullets + dots', find(r'BULLET|\bDOT\b|DOTS\b|CIRCLE\b|CIRCLES\b', r'CIRCLED|DOTTED|ARROW', SYM)),
    ('squares + shapes', find(r'SQUARE|TRIANGLE|DIAMOND|LOZENGE|PENTAGON|HEXAGON|OCTAGON|RECTANGLE|PARALLELOGRAM|ELLIPSE|OVAL', r'SQUARED|ROOT|BRACKET', SYM)),
    ('lines + dividers', find(r'HORIZONTAL|LINE\b|DASH|WAVE|WAVY|TILDE|SWUNG|VERTICAL BAR|BAR\b|UNDERSCORE|OVERLINE', r'ARROW|BOX DRAWINGS|FRACTION', SYM)),
    ('brackets + quotes', sorted(set(find(r'BRACKET|PARENTHESIS|QUOTATION|GUILLEMET|CORNER', cats=('Ps', 'Pe', 'Pi', 'Pf', 'Po', 'Sm', 'So'))))),
    ('box drawing', [cp for cp in range(0x2500, 0x2580) if cp in chars]),
    ('blocks + shades', [cp for cp in range(0x2580, 0x25A0) if cp in chars] + [cp for cp in range(0x1FB00, 0x1FBFA) if cp in chars]),
    ('braille', [cp for cp in range(0x2800, 0x2900) if cp in chars]),
    ('hands', find(r'HAND|FINGER|FIST|THUMBS|PALM|INDEX', cats=SYM)),
    ('weather', find(r'SNOW|RAIN|CLOUD|UMBRELLA|LIGHTNING|THUNDER|TORNADO|FOG|RAINBOW|SNOWFLAKE|SUN WITH|WIND', cats=SYM)),
    ('zodiac + astrology', find(r'ZODIAC|ARIES|TAURUS|GEMINI|CANCER|LEO\b|VIRGO|LIBRA|SCORPIUS|SAGITTARIUS|CAPRICORN|AQUARIUS|PISCES|CONJUNCTION|OPPOSITION|ASCENDING NODE|MERCURY|VENUS|MARS\b|JUPITER|URANUS|NEPTUNE|PLUTO|EARTH SYMBOL', cats=SYM)),
    ('chess + cards + dice', find(r'CHESS|PLAYING CARD|BLACK (SPADE|HEART|DIAMOND|CLUB) SUIT|WHITE (SPADE|HEART|DIAMOND|CLUB) SUIT|DIE FACE|DOMINO|MAHJONG', cats=SYM)),
    ('checks + x', find(r'CHECK MARK|CHECKMARK|BALLOT|MULTIPLICATION X|SALTIRE|HEAVY MULTIPLICATION|\bX\b', r'LATIN|GREEK', SYM)),
    ('currency', find(r'.', cats=('Sc',))),
    ('math', find(r'.', cats=('Sm',))),
    ('circled + boxed letters', find(r'CIRCLED|PARENTHESIZED|SQUARED LATIN|NEGATIVE SQUARED|NEGATIVE CIRCLED|FULL STOP', cats=('So', 'No', 'Sm'))),
    ('fractions + numbers', find(r'FRACTION|VULGAR|ROMAN NUMERAL|SUPERSCRIPT|SUBSCRIPT|DIGIT', r'LATIN|GREEK|MODIFIER LETTER', ('No', 'Nl', 'So', 'Sm'))),
    ('japanese-y', [cp for cp in list(range(0x3000, 0x3040)) + list(range(0xFF60, 0xFFA0)) if cp in chars and keep(cp, chars[cp][1])]),
    ('invisible + blank', sorted(set([0x200B, 0x200C, 0x200D, 0x2060, 0xFEFF, 0x2800, 0x3164, 0xFFA0, 0x115F, 0x1160, 0x180E, 0x00AD, 0x034F, 0x061C] +
                                     [cp for cp in range(0x2000, 0x200B)] + [0x202F, 0x205F, 0x3000, 0x00A0]))),
]
json.dump([{'n': n, 'c': cps} for n, cps in C], open(os.path.join(OUT, 'collections.json'), 'w', encoding='utf8'), separators=(',', ':'))
for n, cps in C:
    print(' %-24s %d' % (n, len(cps)))

# ---------- which google noto font can draw each block ----------
def candidates(name):
    base = re.sub(r'\s*(Supplement|Extended(-[A-Z])?|Additional|Extension [A-Z]+)$', '', name).strip()
    base = re.sub(r'\s*(Supplement|Extended(-[A-Z])?)$', '', base).strip()
    return ['Noto Sans ' + base, 'Noto Serif ' + base, 'Noto ' + base]


def exists(fam):
    url = 'https://fonts.googleapis.com/css2?family=' + fam.replace(' ', '+')
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=15) as r:
            return r.status == 200
    except Exception:
        return False


all_blocks = [{'n': n, 'a': a, 'b': b} for a, b, n in blocks]
cands = sorted({c for bl in all_blocks for c in candidates(bl['n'])})
with cf.ThreadPoolExecutor(24) as ex:
    ok = dict(zip(cands, ex.map(exists, cands)))
# every block (not only symbol ones: the cute picks borrow letters from other alphabets) -> [start, end, font, name]
fonts = []
for bl in all_blocks:
    for c in candidates(bl['n']):
        if ok.get(c):
            fonts.append([bl['a'], bl['b'], c, bl['n']])
            break
json.dump(fonts, open(os.path.join(OUT, 'fonts.json'), 'w', encoding='utf8'), separators=(',', ':'))
print('blocks with a noto font:', len(fonts))
