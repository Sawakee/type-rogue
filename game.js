'use strict';

/* ================= utils ================= */
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const pick = a => a[Math.floor(Math.random() * a.length)];
const $ = id => document.getElementById(id);

/* ================= audio ================= */
let AC = null, master = null, muted = false;

function audioInit() {
  if (AC) return;
  AC = new (window.AudioContext || window.webkitAudioContext)();
  master = AC.createGain();
  master.gain.value = 0.55;
  master.connect(AC.destination);
  startDrone();
}

function tone({ f = 440, f2 = 0, type = 'sine', dur = 0.1, vol = 0.2, delay = 0 }) {
  if (!AC || muted) return;
  const t0 = AC.currentTime + delay;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function noiseHit({ dur = 0.2, vol = 0.3, fc = 2000, q = 1, delay = 0 }) {
  if (!AC || muted) return;
  const t0 = AC.currentTime + delay;
  const len = Math.max(1, (dur * AC.sampleRate) | 0);
  const buf = AC.createBuffer(1, len, AC.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const n = AC.createBufferSource(); n.buffer = buf;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fc; f.Q.value = q;
  const g = AC.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  n.connect(f); f.connect(g); g.connect(master);
  n.start(t0); n.stop(t0 + dur);
}

function startDrone() {
  const g = AC.createGain(); g.gain.value = 0.028;
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
  const lfo = AC.createOscillator(); lfo.frequency.value = 0.07;
  const lg = AC.createGain(); lg.gain.value = 120;
  lfo.connect(lg); lg.connect(f.frequency);
  [55, 55.6, 110.4].forEach(fr => {
    const o = AC.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = fr;
    o.connect(f); o.start();
  });
  f.connect(g); g.connect(master);
  lfo.start();
}

const sfx = {
  type() { tone({ f: rand(1500, 1900), type: 'square', dur: 0.035, vol: 0.05 }); },
  kill(combo, crit) {
    const p = 1 + Math.min(combo, 30) * 0.035;
    noiseHit({ dur: 0.25, vol: 0.45, fc: 700 * p, q: 0.8 });
    tone({ f: 520 * p, f2: 70, type: 'sawtooth', dur: 0.22, vol: 0.22 });
    tone({ f: 1040 * p, f2: 1800 * p, type: 'sine', dur: 0.12, vol: 0.1 });
    if (crit) tone({ f: 880, f2: 1980, type: 'square', dur: 0.2, vol: 0.14, delay: 0.02 });
  },
  miss() { tone({ f: 150, f2: 85, type: 'square', dur: 0.18, vol: 0.18 }); },
  shieldHit() { tone({ f: 740, f2: 540, type: 'triangle', dur: 0.15, vol: 0.18 }); },
  hurt() {
    noiseHit({ dur: 0.4, vol: 0.55, fc: 220, q: 0.7 });
    tone({ f: 110, f2: 38, type: 'sawtooth', dur: 0.4, vol: 0.32 });
  },
  clear() { [523, 659, 784, 1047].forEach((f, i) => tone({ f, type: 'triangle', dur: 0.3, vol: 0.16, delay: i * 0.09 })); },
  relic() { [660, 880, 1320].forEach((f, i) => tone({ f, type: 'sine', dur: 0.28, vol: 0.14, delay: i * 0.07 })); },
  boss() { [0, 0.45, 0.9].forEach(d => tone({ f: 92, f2: 196, type: 'sawtooth', dur: 0.38, vol: 0.24, delay: d })); },
  over() { [392, 330, 262, 196].forEach((f, i) => tone({ f, type: 'triangle', dur: 0.55, vol: 0.18, delay: i * 0.18 })); },
  bomb() {
    noiseHit({ dur: 0.5, vol: 0.55, fc: 320, q: 0.6 });
    tone({ f: 200, f2: 36, type: 'sawtooth', dur: 0.5, vol: 0.3 });
  },
};

/* ================= romaji engine ================= */
/*KANA-START*/
const KANA = {
  'あ': 'a', 'い': 'i', 'う': 'u|wu|whu', 'え': 'e', 'お': 'o',
  'か': 'ka|ca', 'き': 'ki', 'く': 'ku|cu|qu', 'け': 'ke', 'こ': 'ko|co',
  'さ': 'sa', 'し': 'shi|si|ci', 'す': 'su', 'せ': 'se|ce', 'そ': 'so',
  'た': 'ta', 'ち': 'chi|ti', 'つ': 'tsu|tu', 'て': 'te', 'と': 'to',
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu|hu', 'へ': 'he', 'ほ': 'ho',
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
  'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
  'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
  'わ': 'wa', 'を': 'wo',
  'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
  'ざ': 'za', 'じ': 'ji|zi', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
  'だ': 'da', 'ぢ': 'di', 'づ': 'du|zu', 'で': 'de', 'ど': 'do',
  'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
  'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
  'ぁ': 'la|xa', 'ぃ': 'li|xi', 'ぅ': 'lu|xu', 'ぇ': 'le|xe', 'ぉ': 'lo|xo',
  'ゃ': 'lya|xya', 'ゅ': 'lyu|xyu', 'ょ': 'lyo|xyo',
  'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
  'しゃ': 'sha|sya', 'しゅ': 'shu|syu', 'しょ': 'sho|syo',
  'ちゃ': 'cha|tya|cya', 'ちゅ': 'chu|tyu|cyu', 'ちょ': 'cho|tyo|cyo',
  'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
  'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
  'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
  'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
  'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
  'じゃ': 'ja|zya|jya', 'じゅ': 'ju|zyu|jyu', 'じょ': 'jo|zyo|jyo',
  'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
  'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
  'ふぁ': 'fa', 'ふぃ': 'fi', 'ふぇ': 'fe', 'ふぉ': 'fo',
  'うぃ': 'wi|whi', 'うぇ': 'we|whe',
  'ー': '-',
};
const SMALL_KANA = 'ゃゅょぁぃぅぇぉ';

function kanaUnits(kana) {
  const units = [];
  for (let i = 0; i < kana.length; i++) {
    const c = kana[i], n = kana[i + 1];
    if (n && SMALL_KANA.includes(n) && KANA[c + n]) { units.push(c + n); i++; }
    else units.push(c);
  }
  return units;
}

// Returns every acceptable full-romaji spelling, preferred spelling first.
function romanize(kana) {
  const units = kanaUnits(kana);
  let res = [''];
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    let alts;
    if (u === 'っ') {
      const nx = units[i + 1];
      const na = nx ? (KANA[nx] || '').split('|').filter(Boolean) : [];
      alts = [];
      for (const a of na) if (!'aiueon'.includes(a[0])) alts.push(a[0] + a);
      for (const a of na) alts.push('ltu' + a, 'xtu' + a);
      if (na.length) i++;
      if (!alts.length) alts = ['ltu', 'xtu'];
    } else if (u === 'ん') {
      const nx = units[i + 1];
      if (nx == null) alts = ['nn', 'xn'];
      else {
        const na = (KANA[nx] || '').split('|').filter(Boolean);
        alts = [];
        for (const a of na) if (!'aiueoyn'.includes(a[0])) alts.push('n' + a);
        for (const a of na) alts.push('nn' + a, 'xn' + a);
        i++;
        if (!alts.length) alts = ['nn', 'xn'];
      }
    } else {
      alts = (KANA[u] || '?').split('|');
    }
    const next = [];
    outer:
    for (const r of res) {
      for (const a of alts) {
        next.push(r + a);
        if (next.length > 4000) break outer;
      }
    }
    res = next;
  }
  return res;
}
/*KANA-END*/

/* ================= words ================= */
const RAW_WORDS = [
  // [display, hiragana reading]
  ['猫', 'ねこ'], ['犬', 'いぬ'], ['空', 'そら'], ['海', 'うみ'], ['星', 'ほし'],
  ['月', 'つき'], ['雪', 'ゆき'], ['風', 'かぜ'], ['花', 'はな'], ['山', 'やま'],
  ['川', 'かわ'], ['森', 'もり'], ['水', 'みず'], ['鳥', 'とり'], ['雲', 'くも'],
  ['雨', 'あめ'], ['夢', 'ゆめ'], ['声', 'こえ'], ['影', 'かげ'], ['闇', 'やみ'],
  ['牙', 'きば'], ['蛇', 'へび'], ['鍵', 'かぎ'], ['光', 'ひかり'], ['桜', 'さくら'],
  ['緑', 'みどり'], ['氷', 'こおり'], ['炎', 'ほのお'], ['嵐', 'あらし'], ['剣', 'つるぎ'],
  ['翼', 'つばさ'], ['扉', 'とびら'], ['記憶', 'きおく'], ['未来', 'みらい'], ['世界', 'せかい'],
  ['竜', 'りゅう'], ['奇跡', 'きせき'], ['秘密', 'ひみつ'], ['魔物', 'まもの'], ['無敵', 'むてき'],
  ['悪魔', 'あくま'], ['天使', 'てんし'], ['魔王', 'まおう'], ['女神', 'めがみ'], ['試練', 'しれん'],
  ['呪い', 'のろい'], ['銀河', 'ぎんが'], ['知恵', 'ちえ'], ['希望', 'きぼう'], ['勇気', 'ゆうき'],
  ['雷', 'かみなり'], ['太陽', 'たいよう'], ['冒険', 'ぼうけん'], ['戦い', 'たたかい'], ['運命', 'うんめい'],
  ['稲妻', 'いなずま'], ['伝説', 'でんせつ'], ['勇者', 'ゆうしゃ'], ['迷宮', 'めいきゅう'], ['心臓', 'しんぞう'],
  ['流れ星', 'ながれぼし'], ['星空', 'ほしぞら'], ['夜明け', 'よあけ'], ['黄昏', 'たそがれ'], ['思い出', 'おもいで'],
  ['友達', 'ともだち'], ['防御', 'ぼうぎょ'], ['攻撃', 'こうげき'], ['回復', 'かいふく'], ['勝利', 'しょうり'],
  ['逆転', 'ぎゃくてん'], ['最強', 'さいきょう'], ['流星', 'りゅうせい'], ['宇宙', 'うちゅう'], ['暗黒', 'あんこく'],
  ['閃光', 'せんこう'], ['爆発', 'ばくはつ'], ['衝撃', 'しょうげき'], ['残像', 'ざんぞう'], ['疾風', 'しっぷう'],
  ['雷鳴', 'らいめい'], ['会心', 'かいしん'], ['一撃', 'いちげき'], ['必殺', 'ひっさつ'], ['奥義', 'おうぎ'],
  ['結界', 'けっかい'], ['魔力', 'まりょく'], ['精霊', 'せいれい'], ['巨人', 'きょじん'], ['怪物', 'かいぶつ'],
  ['月光', 'げっこう'], ['妖精', 'ようせい'], ['英雄', 'えいゆう'], ['宝石', 'ほうせき'], ['宝箱', 'たからばこ'],
  ['階段', 'かいだん'], ['遺跡', 'いせき'], ['封印', 'ふういん'], ['祝福', 'しゅくふく'], ['覚醒', 'かくせい'],
  ['進化', 'しんか'], ['烈火', 'れっか'], ['吹雪', 'ふぶき'], ['津波', 'つなみ'], ['火山', 'かざん'],
  ['隕石', 'いんせき'], ['彗星', 'すいせい'], ['真実', 'しんじつ'], ['正義', 'せいぎ'], ['絶望', 'ぜつぼう'],
  ['約束', 'やくそく'], ['物語', 'ものがたり'], ['永遠', 'えいえん'], ['瞬間', 'しゅんかん'], ['神話', 'しんわ'],
  ['幻影', 'げんえい'], ['蜃気楼', 'しんきろう'], ['竜巻', 'たつまき'], ['業火', 'ごうか'], ['氷河', 'ひょうが'],
  ['雷撃', 'らいげき'], ['連撃', 'れんげき'], ['旋風', 'せんぷう'], ['天空', 'てんくう'], ['大地', 'だいち'],
  ['深海', 'しんかい'], ['灼熱', 'しゃくねつ'], ['氷結', 'ひょうけつ'], ['暴風', 'ぼうふう'], ['轟音', 'ごうおん'],
  ['飛翔', 'ひしょう'], ['魔法', 'まほう'],
  // katakana flavor
  ['レーザー', 'れーざー'], ['スター', 'すたー'], ['コンボ', 'こんぼ'], ['ゲーム', 'げーむ'],
  ['スピード', 'すぴーど'], ['サンダー', 'さんだー'], ['フィーバー', 'ふぃーばー'], ['エナジー', 'えなじー'],
  ['パワー', 'ぱわー'], ['ミラクル', 'みらくる'], ['バースト', 'ばーすと'], ['コスモ', 'こすも'],
  ['ネビュラ', 'ねびゅら'], ['プラズマ', 'ぷらずま'], ['オーロラ', 'おーろら'], ['メテオ', 'めてお'],
  ['インフェルノ', 'いんふぇるの'], ['ブリザード', 'ぶりざーど'], ['トルネード', 'とるねーど'],
  ['フェニックス', 'ふぇにっくす'], ['ドラゴン', 'どらごん'], ['モンスター', 'もんすたー'],
  ['ダンジョン', 'だんじょん'], ['ラグナロク', 'らぐなろく'], ['ギャラクシー', 'ぎゃらくしー'],
  ['エクスカリバー', 'えくすかりばー'],
  // long / boss words
  ['電光石火', 'でんこうせっか'], ['一騎当千', 'いっきとうせん'], ['百戦錬磨', 'ひゃくせんれんま'],
  ['天下無双', 'てんかむそう'], ['起死回生', 'きしかいせい'], ['絶体絶命', 'ぜったいぜつめい'],
  ['疾風迅雷', 'しっぷうじんらい'], ['完全燃焼', 'かんぜんねんしょう'], ['森羅万象', 'しんらばんしょう'],
  ['一刀両断', 'いっとうりょうだん'], ['大爆発', 'だいばくはつ'], ['流星群', 'りゅうせいぐん'],
  ['超新星', 'ちょうしんせい'], ['一網打尽', 'いちもうだじん'], ['獅子奮迅', 'ししふんじん'],
  ['風林火山', 'ふうりんかざん'],
];

const WORDS = { 1: [], 2: [], 3: [] };
for (const [d, k] of RAW_WORDS) {
  const n = kanaUnits(k).length;
  const tier = n <= 3 ? 1 : n <= 5 ? 2 : 3;
  WORDS[tier].push({ d, k, n });
}

function rollTier(floor) {
  const r = Math.random();
  if (floor <= 2) return r < 0.55 ? 1 : 2;
  if (floor <= 5) return r < 0.4 ? 1 : r < 0.95 ? 2 : 3;
  if (floor <= 9) return r < 0.2 ? 1 : r < 0.82 ? 2 : 3;
  return r < 0.1 ? 1 : r < 0.65 ? 2 : 3;
}

function pickWord(tier, avoidLetters, avoidWords) {
  const pool = WORDS[tier];
  for (let i = 0; i < 14; i++) {
    const w = pick(pool);
    if (avoidWords.has(w.k)) continue;
    const first = romanize(w.k)[0][0];
    if (avoidLetters.has(first) && i < 10) continue;
    return w;
  }
  return pick(pool);
}

/* ================= canvas ================= */
const cv = $('cv');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = W * DPR; cv.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

/* background */
const stars = [];
for (let i = 0; i < 150; i++) {
  stars.push({ x: Math.random(), y: Math.random(), z: rand(0.2, 1), tw: rand(0, TAU) });
}
const blobs = [];
for (let i = 0; i < 5; i++) {
  blobs.push({ x: Math.random(), y: rand(0, 0.7), r: rand(0.25, 0.5), dh: rand(-40, 40), sp: rand(0.5, 1.5), ph: rand(0, TAU) });
}

/* ================= state ================= */
const S = {
  phase: 'title', // title | play | clear | relic | over
  paused: false,
  floor: 1, score: 0, hp: 100, maxhp: 100,
  combo: 0, maxCombo: 0, kills: 0,
  floorKills: 0, floorNeeded: 10, spawned: 0,
  keys: 0, hits: 0, playT: 0,
  best: +(localStorage.getItem('tr_best') || 0),
  mods: { speedMul: 1, scoreMul: 1, crit: 0.05, shieldMax: 0, bomb: false, leech: 0, knock: false, freeze: 0 },
  relics: [], shield: 0, ffwd: false,
  freezeT: 0, timeScale: 1, shake: 0, flash: 0, flashCol: '255,255,255',
  target: null, spawnT: 1.2, minionT: 0, boss: null,
  glowT: 0,
};
let enemies = [], particles = [], rings = [], beams = [], floaters = [];

const coreX = () => W / 2;
const coreY = () => H - 92;
const distCore = e => Math.hypot(e.x - coreX(), e.y - coreY());

/* ================= fx ================= */
function burst(x, y, hue, n, power, white) {
  const cap = 700 - particles.length;
  n = Math.min(n, Math.max(0, cap));
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(40, 380) * power;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(0, 60),
      t: 0, life: rand(0.35, 1.0), size: rand(1.5, 4.5) * power,
      hue: white && Math.random() < 0.35 ? -1 : hue + rand(-22, 22),
      streak: Math.random() < 0.3, drag: rand(1.5, 4), grav: rand(60, 200),
    });
  }
}
function ring(x, y, hue, vr, wdt) {
  rings.push({ x, y, r: 6, vr: vr || 700, t: 0, life: 0.45, hue, w: wdt || 4 });
}
function beam(x2, y2, hue, big) {
  beams.push({ x1: coreX(), y1: coreY() - 26, x2, y2, t: 0, life: big ? 0.16 : 0.09, w: big ? 9 : 2.5, hue });
}
function floater(x, y, text, col, size) {
  floaters.push({ x, y, t: 0, life: 1.0, text, col: col || '#fff', size: size || 20, vy: -64 });
}
function shake(v) { S.shake = Math.max(S.shake, v); }
function flash(v, col) { S.flash = Math.max(S.flash, v); S.flashCol = col || '255,255,255'; }
function hitstop(v) { S.timeScale = Math.min(S.timeScale, v); }

/* ================= enemies ================= */
function activeFirstLetters() {
  const set = new Set();
  for (const e of enemies) set.add(e.cands[0][0]);
  return set;
}
function activeWords() {
  const set = new Set();
  for (const e of enemies) set.add(e.word.k);
  return set;
}

function spawnEnemy(forceTier) {
  const tier = forceTier || rollTier(S.floor);
  const w = pickWord(tier, activeFirstLetters(), activeWords());
  const speed = (58 + S.floor * 6) * rand(0.85, 1.2)
    * (tier === 3 ? 0.66 : tier === 2 ? 0.85 : 1.05) * S.mods.speedMul;
  enemies.push({
    x: rand(80, W - 80), y: -46,
    word: w, cands: romanize(w.k), typed: '',
    r: 15 + tier * 6 + w.n * 1.1, tier, speed,
    wob: rand(0, TAU), hue: [190, 315, 26][tier - 1] + rand(-14, 14),
    kvx: 0, kvy: 0, boss: false, alive: true,
  });
  S.spawned++;
}

function spawnBoss() {
  const count = 4 + Math.floor(S.floor / 5) * 2;
  const queue = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    const tier = i < count / 2 ? 2 : 3;
    const w = pickWord(tier, new Set(), used);
    used.add(w.k);
    queue.push(w);
  }
  const w = queue.shift();
  const boss = {
    x: W / 2, y: -110,
    word: w, cands: romanize(w.k), typed: '',
    r: 64, tier: 3, speed: (13 + S.floor * 0.7) * S.mods.speedMul,
    wob: 0, hue: 350, kvx: 0, kvy: 0,
    boss: true, alive: true, queue, total: count, done: 0,
  };
  enemies.push(boss);
  S.boss = boss;
  $('bossbar-wrap').classList.remove('hidden');
  bossHud();
  sfx.boss();
}

/* ================= scoring / combat ================= */
function comboMult() { return 1 + Math.min(S.combo, 40) * 0.05; }

function killEnemy(e, chained) {
  e.alive = false;
  enemies = enemies.filter(x => x !== e);
  if (S.target === e) S.target = null;

  S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo);
  const crit = Math.random() < S.mods.crit;
  let gain = Math.round((e.word.n * 15 + S.floor * 5) * comboMult() * S.mods.scoreMul * (crit ? 2 : 1) * (chained ? 0.5 : 1));
  S.score += gain;

  // FX
  const power = e.boss ? 1.6 : 0.8 + e.tier * 0.25;
  burst(e.x, e.y, e.hue, e.boss ? 90 : 36 + e.tier * 18, power, true);
  ring(e.x, e.y, e.hue, e.boss ? 900 : 650, e.boss ? 7 : 4);
  if (!chained) beam(e.x, e.y, e.hue, true);
  shake(e.boss ? 16 : 5 + e.tier * 2);
  hitstop(e.boss ? 0.05 : 0.18);
  if (crit) {
    floater(e.x, e.y - e.r - 34, '会心!!', '#ffd54a', 26);
    ring(e.x, e.y, 48, 950, 6);
    flash(0.12, '255,213,74');
  }
  floater(e.x, e.y - e.r - 10, '+' + gain, crit ? '#ffd54a' : '#bff3ff', crit ? 24 : 18);
  if (S.combo > 0 && S.combo % 10 === 0) {
    floater(W / 2, H * 0.3, S.combo + ' COMBO!', '#ff9d4b', 34);
  }
  sfx.kill(S.combo, crit);

  // relic effects
  if (S.mods.leech) { S.hp = Math.min(S.maxhp, S.hp + S.mods.leech); hpHud(); }
  if (S.mods.freeze) S.freezeT = Math.max(S.freezeT, S.mods.freeze);
  if (S.mods.knock) {
    for (const o of enemies) {
      const d = Math.hypot(o.x - e.x, o.y - e.y);
      if (d < 240 && !o.boss) {
        const f = (240 - d) / 240 * 320;
        o.kvx += (o.x - e.x) / (d || 1) * f;
        o.kvy += (o.y - e.y) / (d || 1) * f - 80;
      }
    }
    ring(e.x, e.y, 200, 500, 2);
  }
  if (S.mods.bomb && !chained && S.combo % 10 === 0) {
    const near = enemies.filter(o => !o.boss).sort((a, b) =>
      Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
    if (near) {
      sfx.bomb();
      floater(near.x, near.y - near.r - 30, '爆雷!', '#ff7b4b', 22);
      killEnemy(near, true);
    }
  }

  S.kills++;
  if (!e.boss) {
    S.floorKills++;
  } else {
    bossWordDone(e);
    return; // boss handled separately
  }
  scoreHud(); comboHud(true);
  checkFloorClear();
}

function bossWordDone(boss) {
  boss.done++;
  scoreHud(); comboHud(true);
  if (boss.queue.length) {
    // next word: boss survives, knock it back
    boss.alive = true;
    enemies.push(boss);
    const w = boss.queue.shift();
    boss.word = w; boss.cands = romanize(w.k); boss.typed = '';
    boss.y = Math.max(60, boss.y - 130);
    bossHud();
  } else {
    // boss dead
    S.boss = null;
    $('bossbar-wrap').classList.add('hidden');
    burst(boss.x, boss.y, 350, 160, 2.2, true);
    burst(boss.x, boss.y, 40, 80, 1.6, true);
    ring(boss.x, boss.y, 350, 1100, 10);
    ring(boss.x, boss.y, 40, 800, 6);
    shake(26); flash(0.35, '255,120,140'); hitstop(0.03);
    floater(boss.x, boss.y, 'BOSS DOWN!!', '#ff5d7a', 40);
    S.score += 500 * S.floor * S.mods.scoreMul | 0;
    scoreHud();
    checkFloorClear(true);
  }
}

function miss() {
  S.keys++;
  if (S.shield > 0) {
    S.shield--;
    sfx.shieldHit();
    floater(coreX(), coreY() - 70, '🔰シールド ' + S.shield, '#7be8ff', 18);
    return;
  }
  S.combo = 0;
  comboHud(false);
  shake(7); flash(0.08, '255,80,80');
  sfx.miss();
}

function hurtCore(dmg) {
  S.hp -= dmg;
  S.combo = 0;
  comboHud(false); hpHud();
  shake(20); flash(0.3, '255,40,70');
  sfx.hurt();
  burst(coreX(), coreY(), 0, 40, 1, false);
  if (S.hp <= 0) gameOver();
}

/* ================= input ================= */
function handleKey(k) {
  S.keys++;
  let t = S.target;
  if (t && !enemies.includes(t)) { S.target = null; t = null; }
  if (t) {
    const nc = t.cands.filter(c => c.startsWith(t.typed + k));
    if (nc.length) correctKey(t, k, nc);
    else { S.keys--; miss(); }
  } else {
    const matches = enemies.filter(e => e.cands.some(c => c[0] === k));
    if (matches.length) {
      matches.sort((a, b) => distCore(a) - distCore(b));
      const e = matches[0];
      S.target = e;
      correctKey(e, k, e.cands.filter(c => c[0] === k));
    } else if (enemies.length) { S.keys--; miss(); }
  }
}

function correctKey(e, k, nc) {
  e.typed += k;
  e.cands = nc;
  S.hits++;
  sfx.type();
  beam(e.x + rand(-6, 6), e.y + rand(-6, 6), e.hue, false);
  burst(e.x, e.y, e.hue, 3, 0.4, false);
  if (nc.includes(e.typed)) killEnemy(e, false);
}

window.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  audioInit();
  if (AC && AC.state === 'suspended') AC.resume();
  const k = e.key.toLowerCase();

  if (S.phase === 'title') {
    if (e.key.length === 1 || e.key === 'Enter') {
      e.preventDefault();
      startRun();
    }
    return;
  }
  if (S.phase === 'over') {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startRun(); }
    return;
  }
  if (e.key === 'Escape' && (S.phase === 'play')) {
    togglePause();
    return;
  }
  if (S.phase !== 'play' || S.paused) return;
  if (e.key === ' ') {
    e.preventDefault();
    S.ffwd = true;
    return;
  }
  if (/^[a-z-]$/.test(k)) {
    e.preventDefault();
    if (e.repeat) return;
    handleKey(k);
  }
});

window.addEventListener('keyup', e => {
  if (e.key === ' ') S.ffwd = false;
});

window.addEventListener('blur', () => {
  S.ffwd = false;
  if (S.phase === 'play' && !S.paused) togglePause();
});

function togglePause() {
  S.paused = !S.paused;
  S.ffwd = false;
  $('pause-screen').classList.toggle('hidden', !S.paused);
}

/* ================= relics ================= */
const RELICS = [
  { id: 'heal',   icon: '💚', name: 'リペア・ナノマシン', desc: 'HPを40回復する',
    apply() { S.hp = Math.min(S.maxhp, S.hp + 40); } },
  { id: 'maxhp',  icon: '🛡️', name: '強化コア', desc: '最大HP+25、さらにHP25回復',
    apply() { S.maxhp += 25; S.hp = Math.min(S.maxhp, S.hp + 25); } },
  { id: 'slow',   icon: '⏳', name: '時の砂', desc: 'すべての敵の速度が12%遅くなる',
    apply() { S.mods.speedMul *= 0.88; for (const e of enemies) e.speed *= 0.88; } },
  { id: 'shield', icon: '🔰', name: 'ミス・シールド', desc: '各フロア、最初の2回のミスでコンボが途切れない',
    apply() { S.mods.shieldMax += 2; } },
  { id: 'bomb',   icon: '💣', name: 'コンボ爆雷', desc: 'コンボ10ごとに最寄りの敵を自動爆破',
    apply() { S.mods.bomb = true; } },
  { id: 'crit',   icon: '⚡', name: '会心の心得', desc: '会心率+20%（会心はスコア2倍）',
    apply() { S.mods.crit += 0.2; } },
  { id: 'leech',  icon: '🩸', name: '吸収結晶', desc: '敵を倒すたびHP+2',
    apply() { S.mods.leech += 2; } },
  { id: 'knock',  icon: '🌀', name: '斥力フィールド', desc: '撃破時、周囲の敵を吹き飛ばす',
    apply() { S.mods.knock = true; } },
  { id: 'gold',   icon: '💰', name: 'スコアブースター', desc: '獲得スコア+30%',
    apply() { S.mods.scoreMul *= 1.3; } },
  { id: 'freeze', icon: '❄️', name: '残響フリーズ', desc: '撃破するたび0.4秒間、敵がスローになる（重複で+0.4秒）',
    apply() { S.mods.freeze += 0.4; } },
];

function showRelics() {
  S.phase = 'relic';
  const cards = $('relic-cards');
  cards.innerHTML = '';
  // boolean relics don't stack — hide them once owned
  const owned = new Set(S.relics.map(r => r.id));
  const pool = RELICS.filter(r => !(owned.has(r.id) && (r.id === 'bomb' || r.id === 'knock')));
  for (let i = 0; i < 3 && pool.length; i++) {
    const r = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const div = document.createElement('div');
    div.className = 'relic-card';
    div.innerHTML = `<div class="relic-icon">${r.icon}</div>
      <div class="relic-name">${r.name}</div>
      <div class="relic-desc">${r.desc}</div>`;
    div.onclick = () => selectRelic(r);
    cards.appendChild(div);
  }
  $('relic-screen').classList.remove('hidden');
}

function selectRelic(r) {
  r.apply();
  S.relics.push(r);
  relicsHud(); hpHud();
  sfx.relic();
  $('relic-screen').classList.add('hidden');
  nextFloor();
}

/* ================= floor flow ================= */
function isBossFloor(f) { return f % 5 === 0; }

function setupFloor() {
  S.floorKills = 0;
  S.spawned = 0;
  S.floorNeeded = 8 + S.floor * 2;
  S.spawnT = 0.7;
  S.minionT = 0;
  S.shield = S.mods.shieldMax;
  S.target = null;
  floorHud();
  if (isBossFloor(S.floor)) {
    banner('FLOOR ' + S.floor, '⚠ WARNING — BOSS APPROACHING ⚠', true);
    setTimeout(() => { if (S.phase === 'play') spawnBoss(); }, 1400);
  } else {
    banner('FLOOR ' + S.floor, '敵を ' + S.floorNeeded + ' 体撃破せよ', false);
  }
}

function checkFloorClear(bossDead) {
  if (S.phase !== 'play') return;
  if (isBossFloor(S.floor)) {
    if (!bossDead) return;
    enemies = []; S.target = null;
  } else {
    if (S.floorKills < S.floorNeeded || enemies.length) return;
  }
  S.phase = 'clear';
  sfx.clear();
  banner('FLOOR CLEAR', 'SCORE ' + S.score.toLocaleString(), false);
  setTimeout(showRelics, 1500);
}

function nextFloor() {
  S.floor++;
  S.phase = 'play';
  setupFloor();
}

function startRun() {
  S.phase = 'play';
  S.paused = false;
  S.floor = 1; S.score = 0;
  S.hp = 100; S.maxhp = 100;
  S.combo = 0; S.maxCombo = 0; S.kills = 0;
  S.keys = 0; S.hits = 0; S.playT = 0;
  S.mods = { speedMul: 1, scoreMul: 1, crit: 0.05, shieldMax: 0, bomb: false, leech: 0, knock: false, freeze: 0 };
  S.relics = []; S.shield = 0; S.ffwd = false;
  S.freezeT = 0; S.timeScale = 1; S.shake = 0; S.flash = 0;
  S.target = null; S.boss = null;
  enemies = []; particles = []; rings = []; beams = []; floaters = [];
  $('title-screen').classList.add('hidden');
  $('over-screen').classList.add('hidden');
  $('relic-screen').classList.add('hidden');
  $('bossbar-wrap').classList.add('hidden');
  $('hud').classList.remove('hidden');
  hpHud(); scoreHud(); comboHud(false); relicsHud();
  setupFloor();
}

function gameOver() {
  S.phase = 'over';
  S.boss = null;
  $('bossbar-wrap').classList.add('hidden');
  burst(coreX(), coreY(), 195, 140, 1.8, true);
  ring(coreX(), coreY(), 195, 900, 8);
  shake(28); flash(0.5, '255,60,90');
  sfx.over();
  const newBest = S.score > S.best;
  if (newBest) { S.best = S.score; localStorage.setItem('tr_best', S.best); }
  const acc = S.keys ? Math.round(S.hits / S.keys * 100) : 100;
  const kpm = S.playT > 1 ? Math.round(S.hits / (S.playT / 60)) : 0;
  $('over-stats').innerHTML =
    `<div>SCORE<span class="v${newBest ? ' newbest' : ''}">${S.score.toLocaleString()}${newBest ? ' ★NEW BEST!' : ''}</span></div>
     <div>BEST<span class="v">${S.best.toLocaleString()}</span></div>
     <div>到達フロア<span class="v">${S.floor}</span></div>
     <div>撃破数<span class="v">${S.kills}</span></div>
     <div>最大コンボ<span class="v">${S.maxCombo}</span></div>
     <div>正確率<span class="v">${acc}%</span></div>
     <div>打鍵速度<span class="v">${kpm} KPM</span></div>`;
  setTimeout(() => $('over-screen').classList.remove('hidden'), 900);
}

/* ================= HUD ================= */
function hpHud() {
  const p = clamp(S.hp / S.maxhp, 0, 1);
  const fill = $('hpfill');
  fill.style.width = (p * 100) + '%';
  fill.classList.toggle('low', p < 0.35);
  $('hptext').textContent = Math.max(0, Math.ceil(S.hp)) + ' / ' + S.maxhp;
}
function scoreHud() { $('score').textContent = S.score.toLocaleString(); }
function floorHud() { $('floor').textContent = 'FLOOR ' + S.floor + (isBossFloor(S.floor) ? ' ☠' : ''); }
function relicsHud() {
  $('relics').textContent = S.relics.map(r => r.icon).join('');
}
function comboHud(popped) {
  const el = $('combo');
  el.textContent = S.combo;
  el.classList.toggle('hot', S.combo >= 20);
  $('mult').textContent = '×' + (comboMult() * S.mods.scoreMul).toFixed(1);
  if (popped) {
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }
}
function bossHud() {
  const b = S.boss;
  if (!b) return;
  $('bossfill').style.width = ((1 - b.done / b.total) * 100) + '%';
}
function banner(text, sub, danger) {
  const b = $('banner');
  $('banner-text').textContent = text;
  $('banner-sub').textContent = sub || '';
  b.classList.remove('hidden', 'show');
  b.classList.toggle('danger', !!danger);
  void b.offsetWidth;
  b.classList.add('show');
}

$('mute').addEventListener('click', () => {
  audioInit();
  muted = !muted;
  $('mute').textContent = muted ? '🔇' : '🔊';
});

/* ================= update ================= */
function update(dt) {
  // recover hitstop
  S.timeScale += (1 - S.timeScale) * Math.min(1, dt * 7);
  S.shake *= Math.exp(-dt * 7);
  S.flash *= Math.exp(-dt * 5);
  S.freezeT = Math.max(0, S.freezeT - dt);
  S.glowT += dt;

  const wdt = dt * S.timeScale * (S.ffwd && S.phase === 'play' ? 3 : 1);
  const enemySlow = S.freezeT > 0 ? 0.25 : 1;

  if (S.phase === 'play') {
    S.playT += dt;

    // spawning
    if (!isBossFloor(S.floor)) {
      if (S.spawned < S.floorNeeded && enemies.length < 7) {
        S.spawnT -= wdt;
        if (S.spawnT <= 0) {
          spawnEnemy();
          S.spawnT = Math.max(0.45, 1.45 - S.floor * 0.08) * rand(0.8, 1.25);
        }
      }
    } else if (S.boss) {
      // boss minions
      S.minionT -= wdt;
      if (S.minionT <= 0 && enemies.length < 6) {
        spawnEnemy(Math.random() < 0.6 ? 1 : 2);
        S.minionT = rand(2.2, 3.6);
      }
    }

    // move enemies
    for (const e of [...enemies]) {
      e.wob += wdt * 2.4;
      const dx = coreX() - e.x, dy = coreY() - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = e.speed * enemySlow;
      e.x += (dx / d * sp + Math.cos(e.wob) * 14 * (e.boss ? 0.3 : 1)) * wdt + e.kvx * wdt;
      e.y += (dy / d * sp) * wdt + e.kvy * wdt;
      e.kvx *= Math.exp(-wdt * 5);
      e.kvy *= Math.exp(-wdt * 5);
      e.x = clamp(e.x, 50, W - 50);

      if (d < (e.boss ? 130 : 58)) {
        // reached the core
        enemies = enemies.filter(x => x !== e);
        if (S.target === e) S.target = null;
        if (e.boss) {
          hurtCore(35);
          e.y = -110; e.typed = ''; e.cands = romanize(e.word.k);
          enemies.push(e);
          floater(coreX(), coreY() - 90, '-35', '#ff5d7a', 30);
        } else {
          const dmg = 8 + Math.floor(S.floor * 1.5);
          hurtCore(dmg);
          floater(coreX(), coreY() - 90, '-' + dmg, '#ff5d7a', 24);
          burst(e.x, e.y, 0, 26, 0.8, false);
          // a replacement spawns so the floor quota stays reachable
          S.spawned = Math.max(0, S.spawned - 1);
        }
      }
    }
  }

  // fx
  for (const p of particles) {
    p.t += dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= Math.exp(-dt * p.drag);
    p.vy = p.vy * Math.exp(-dt * p.drag) + p.grav * dt;
  }
  particles = particles.filter(p => p.t < p.life);
  for (const r of rings) { r.t += dt; r.r += r.vr * dt; }
  rings = rings.filter(r => r.t < r.life);
  for (const b of beams) b.t += dt;
  beams = beams.filter(b => b.t < b.life);
  for (const f of floaters) { f.t += dt; f.y += f.vy * dt; }
  floaters = floaters.filter(f => f.t < f.life);
}

/* ================= render ================= */
function drawBackground(t) {
  ctx.fillStyle = '#04050e';
  ctx.fillRect(0, 0, W, H);

  const baseHue = (205 + S.floor * 22) % 360;
  ctx.globalCompositeOperation = 'screen';
  for (const b of blobs) {
    const bx = (b.x + Math.sin(t * 0.05 * b.sp + b.ph) * 0.08) * W;
    const by = (b.y + Math.cos(t * 0.04 * b.sp + b.ph) * 0.06) * H;
    const br = b.r * Math.min(W, H);
    const hue = (baseHue + b.dh + 360) % 360;
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    const boost = 1 + Math.min(S.combo, 40) / 60;
    g.addColorStop(0, `hsla(${hue},85%,55%,${0.10 * boost})`);
    g.addColorStop(1, 'hsla(0,0%,0%,0)');
    ctx.fillStyle = g;
    ctx.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  ctx.globalCompositeOperation = 'source-over';

  // stars
  for (const s of stars) {
    const y = (s.y + t * 0.008 * s.z) % 1;
    const a = 0.25 + 0.5 * s.z + Math.sin(t * 2 + s.tw) * 0.18;
    ctx.fillStyle = `rgba(220,235,255,${clamp(a, 0, 1)})`;
    const sz = s.z * 1.8;
    ctx.fillRect(s.x * W, y * H, sz, sz);
  }
}

function drawCore(t) {
  const x = coreX(), y = coreY();
  const hpP = clamp(S.hp / S.maxhp, 0, 1);
  const hue = lerp(0, 190, hpP); // red -> cyan
  const pulse = 1 + Math.sin(t * 3) * 0.06;

  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, 110 * pulse);
  g.addColorStop(0, `hsla(${hue},90%,65%,.5)`);
  g.addColorStop(0.4, `hsla(${hue},90%,55%,.14)`);
  g.addColorStop(1, 'hsla(0,0%,0%,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 120, y - 120, 240, 240);

  // rotating crystal
  for (let i = 0; i < 2; i++) {
    ctx.save();
    ctx.translate(x, y - 8);
    ctx.rotate(t * (i ? -0.7 : 1.1) + i * 0.7);
    ctx.strokeStyle = `hsla(${hue},95%,${70 - i * 12}%,${0.85 - i * 0.3})`;
    ctx.lineWidth = 2.5 - i;
    const r = 26 + i * 12;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = k / 4 * TAU;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  // bright core
  ctx.fillStyle = `hsla(${hue},100%,85%,.95)`;
  ctx.beginPath();
  ctx.arc(x, y - 8, 7 * pulse, 0, TAU);
  ctx.fill();

  // hp arc
  ctx.strokeStyle = `hsla(${hue},90%,60%,.9)`;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(x, y - 8, 48, -Math.PI / 2, -Math.PI / 2 + TAU * hpP);
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}

function drawEnemy(e, t) {
  const isTarget = S.target === e;
  const flicker = 1 + Math.sin(t * 6 + e.wob) * 0.08;

  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 2.6 * flicker);
  g.addColorStop(0, `hsla(${e.hue},95%,62%,.85)`);
  g.addColorStop(0.35, `hsla(${e.hue},95%,55%,.28)`);
  g.addColorStop(1, 'hsla(0,0%,0%,0)');
  ctx.fillStyle = g;
  ctx.fillRect(e.x - e.r * 3, e.y - e.r * 3, e.r * 6, e.r * 6);

  // body
  ctx.fillStyle = `hsla(${e.hue},90%,70%,.95)`;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r * 0.62, 0, TAU);
  ctx.fill();
  ctx.fillStyle = `hsla(${e.hue},40%,12%,.9)`;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r * 0.42, 0, TAU);
  ctx.fill();
  ctx.fillStyle = `hsla(${e.hue},100%,80%,.9)`;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r * 0.18 * flicker, 0, TAU);
  ctx.fill();

  // boss / tier3 outer ring
  if (e.boss || e.tier === 3) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(t * 0.9);
    ctx.strokeStyle = `hsla(${e.hue},95%,65%,.7)`;
    ctx.lineWidth = e.boss ? 3 : 1.8;
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.95, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  // target lock ring
  if (isTarget) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(-t * 2.2);
    ctx.strokeStyle = 'rgba(255,213,74,.95)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([6, 9]);
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.86 + 6, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';

  // ---- word labels ----
  const ty = e.y - e.r - 26;
  ctx.textAlign = 'center';
  // display word
  ctx.font = `900 ${e.boss ? 30 : 19}px "Noto Sans JP", sans-serif`;
  ctx.shadowColor = `hsla(${e.hue},95%,60%,.9)`;
  ctx.shadowBlur = 12;
  ctx.fillStyle = isTarget ? '#fff' : 'rgba(235,246,255,.92)';
  ctx.fillText(e.word.d, e.x, ty);
  ctx.shadowBlur = 0;

  // romaji: typed part gold, rest white
  const cand = e.cands[0];
  const typed = e.typed;
  const rest = cand.slice(typed.length);
  ctx.font = `700 ${e.boss ? 20 : 15}px Orbitron, monospace`;
  const wTyped = ctx.measureText(typed).width;
  const wRest = ctx.measureText(rest).width;
  const x0 = e.x - (wTyped + wRest) / 2;
  ctx.textAlign = 'left';
  if (typed) {
    ctx.fillStyle = 'rgba(255,213,74,.85)';
    ctx.fillText(typed, x0, ty + (e.boss ? 26 : 20));
  }
  ctx.shadowColor = 'rgba(120,220,255,.8)';
  ctx.shadowBlur = isTarget ? 10 : 4;
  ctx.fillStyle = isTarget ? '#dffaff' : 'rgba(200,225,245,.75)';
  ctx.fillText(rest, x0 + wTyped, ty + (e.boss ? 26 : 20));
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
}

function drawFx() {
  ctx.globalCompositeOperation = 'lighter';
  // beams
  for (const b of beams) {
    const a = 1 - b.t / b.life;
    const grad = ctx.createLinearGradient(b.x1, b.y1, b.x2, b.y2);
    grad.addColorStop(0, `hsla(${b.hue},95%,75%,${0.1 * a})`);
    grad.addColorStop(1, `hsla(${b.hue},95%,70%,${0.9 * a})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = b.w * a + 0.5;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
  }
  // particles
  for (const p of particles) {
    const a = 1 - p.t / p.life;
    ctx.fillStyle = p.hue < 0
      ? `rgba(255,255,255,${a})`
      : `hsla(${p.hue},95%,65%,${a})`;
    if (p.streak) {
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = p.size * 0.6;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, TAU);
      ctx.fill();
    }
  }
  // rings
  for (const r of rings) {
    const a = 1 - r.t / r.life;
    ctx.strokeStyle = `hsla(${r.hue},95%,65%,${a * 0.9})`;
    ctx.lineWidth = r.w * a + 0.5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${a * 0.4})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r * 0.85, 0, TAU);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  // floaters
  ctx.textAlign = 'center';
  for (const f of floaters) {
    const a = 1 - f.t / f.life;
    ctx.font = `900 ${f.size}px Orbitron, "Noto Sans JP", monospace`;
    ctx.shadowColor = f.col;
    ctx.shadowBlur = 14;
    ctx.globalAlpha = a;
    ctx.fillStyle = f.col;
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}

function render(t) {
  ctx.save();
  if (S.shake > 0.3) {
    ctx.translate(rand(-S.shake, S.shake), rand(-S.shake, S.shake));
  }
  drawBackground(t);
  if (S.phase !== 'title') {
    drawCore(t);
    // draw far enemies first
    const sorted = [...enemies].sort((a, b) => a.y - b.y);
    for (const e of sorted) drawEnemy(e, t);
    drawFx();
  } else {
    drawFx();
  }
  ctx.restore();

  if (S.flash > 0.01) {
    ctx.fillStyle = `rgba(${S.flashCol},${clamp(S.flash, 0, 0.6)})`;
    ctx.fillRect(0, 0, W, H);
  }
  // freeze tint
  if (S.freezeT > 0) {
    ctx.fillStyle = `rgba(120,200,255,${S.freezeT * 0.12})`;
    ctx.fillRect(0, 0, W, H);
  }
  // fast-forward indicator
  if (S.ffwd && S.phase === 'play') {
    ctx.textAlign = 'center';
    ctx.font = '700 22px Orbitron, monospace';
    ctx.fillStyle = `rgba(75,232,255,${0.6 + Math.sin(t * 10) * 0.3})`;
    ctx.shadowColor = 'rgba(75,232,255,.8)';
    ctx.shadowBlur = 12;
    ctx.fillText('▶▶ ×3', W / 2, H - 26);
    ctx.shadowBlur = 0;
  }
}

/* ================= main loop ================= */
let last = performance.now();
function loop(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  if (!S.paused) {
    update(dt);
    render(now / 1000);
  }
  requestAnimationFrame(loop);
}

/* ================= init ================= */
$('title-best').textContent = S.best > 0 ? 'BEST SCORE: ' + S.best.toLocaleString() : '';
window.addEventListener('pointerdown', e => {
  audioInit();
  if (AC && AC.state === 'suspended') AC.resume();
  if (e.target.closest('#mute') || e.target.closest('.relic-card')) return;
  if (S.phase === 'title') startRun();
  else if (S.phase === 'over' && !$('over-screen').classList.contains('hidden')) startRun();
});
requestAnimationFrame(loop);
