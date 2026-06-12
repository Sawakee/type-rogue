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

/* ---- 語彙パーツ：組み合わせで数十万通りの単語・文章をレベル別に生成 ---- */
/*WORDS-START*/
const ADJS = [
  ['赤い', 'あかい'], ['青い', 'あおい'], ['白い', 'しろい'], ['黒い', 'くろい'],
  ['光る', 'ひかる'], ['燃える', 'もえる'], ['凍る', 'こおる'], ['輝く', 'かがやく'],
  ['小さな', 'ちいさな'], ['大きな', 'おおきな'], ['強い', 'つよい'], ['弱い', 'よわい'],
  ['速い', 'はやい'], ['遅い', 'おそい'], ['熱い', 'あつい'], ['冷たい', 'つめたい'],
  ['甘い', 'あまい'], ['古い', 'ふるい'], ['新しい', 'あたらしい'], ['美しい', 'うつくしい'],
  ['恐ろしい', 'おそろしい'], ['静かな', 'しずかな'], ['荒ぶる', 'あらぶる'], ['眠れる', 'ねむれる'],
  ['彷徨う', 'さまよう'], ['古の', 'いにしえの'], ['永遠の', 'えいえんの'], ['神秘の', 'しんぴの'],
  ['金色の', 'きんいろの'], ['銀色の', 'ぎんいろの'], ['闇の', 'やみの'], ['炎の', 'ほのおの'],
  ['氷の', 'こおりの'], ['雷の', 'いかずちの'], ['幻の', 'まぼろしの'], ['伝説の', 'でんせつの'],
];
const VERBS = [
  ['倒せ', 'たおせ'], ['守れ', 'まもれ'], ['探せ', 'さがせ'], ['撃て', 'うて'],
  ['斬れ', 'きれ'], ['走れ', 'はしれ'], ['跳べ', 'とべ'], ['掴め', 'つかめ'],
  ['放て', 'はなて'], ['消せ', 'けせ'], ['壊せ', 'こわせ'], ['集めろ', 'あつめろ'],
  ['解き放て', 'ときはなて'], ['撃ち落とせ', 'うちおとせ'], ['吹っ飛ばせ', 'ぶっとばせ'],
  ['呼び覚ませ', 'よびさませ'], ['貫け', 'つらぬけ'], ['駆け抜けろ', 'かけぬけろ'],
  ['封じ込めろ', 'ふうじこめろ'], ['召喚せよ', 'しょうかんせよ'], ['破壊せよ', 'はかいせよ'],
  ['解放せよ', 'かいほうせよ'], ['制圧せよ', 'せいあつせよ'], ['乗り越えろ', 'のりこえろ'],
];
// レベルごとの目標かな数（ユニット数）
const LEVEL_RANGE = [[2, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 9], [10, 11], [12, 13], [14, 16], [17, 28]];

function joinW(parts) {
  let d = '', k = '';
  for (const p of parts) { d += p[0]; k += p[1]; }
  return { d, k, n: kanaUnits(k).length };
}

function makeCandidate(level) {
  const r = Math.random();
  const N = () => pick(RAW_WORDS), A = () => pick(ADJS), V = () => pick(VERBS);
  const WO = ['を', 'を'], NO = ['の', 'の'], TO = ['と', 'と'];
  if (level <= 2) return joinW([N()]);
  if (level <= 3) return r < 0.7 ? joinW([N()]) : joinW([A(), N()]);
  if (level <= 5) {
    if (r < 0.45) return joinW([A(), N()]);
    if (r < 0.8) return joinW([N(), NO, N()]);
    return joinW([N()]);
  }
  if (level <= 7) {
    if (r < 0.45) return joinW([N(), WO, V()]);
    if (r < 0.75) return joinW([A(), N(), WO, V()]);
    return joinW([A(), N(), NO, N()]);
  }
  if (level <= 9) {
    if (r < 0.4) return joinW([A(), N(), WO, V()]);
    if (r < 0.7) return joinW([N(), TO, N(), WO, V()]);
    return joinW([A(), N(), NO, N(), WO, V()]);
  }
  return r < 0.5
    ? joinW([A(), N(), NO, N(), WO, V()])
    : joinW([A(), N(), TO, A(), N(), WO, V()]);
}

function genWord(level) {
  level = clamp(level, 1, 10);
  const [lo, hi] = LEVEL_RANGE[level - 1];
  let w = makeCandidate(level);
  for (let i = 0; i < 40 && (w.n < lo || w.n > hi); i++) w = makeCandidate(level);
  return w;
}
/*WORDS-END*/

// 現在の実効フロアから出題レベル(1-10)を決める
function wordLevel() {
  const base = clamp(Math.ceil(eff() * 0.5), 1, 10) + ((S.stage && S.stage.mods.level) || 0);
  const jitter = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
  return clamp(base + jitter, 1, 10);
}

function pickWord(level, avoidLetters, avoidWords) {
  let w = genWord(level);
  for (let i = 0; i < 12; i++) {
    if (!avoidWords.has(w.k)) {
      const first = romanize(w.k)[0][0];
      if (!avoidLetters.has(first) || i >= 8) return w;
    }
    w = genWord(level);
  }
  return w;
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
  phase: 'title', // title | world | play | clear | relic | over | won
  paused: false,
  stage: null, missBoostT: 0,
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

/* ================= world map ================= */
const MAPNODES = [
  { id: 's1', x: 0.14, y: 0.66, icon: '🌿', name: 'はじまりの草原', hue: 130, len: 5, offset: 0,
    desc: 'そよ風わたる草原。短い単語で腕ならし。', mods: {} },
  { id: 's2', x: 0.30, y: 0.50, icon: '🌲', name: '翠の森', hue: 160, len: 5, offset: 2,
    desc: '深き森。すこし長い言葉が絡みつく。', mods: { level: 1 } },
  { id: 's3', x: 0.27, y: 0.26, icon: '🌋', name: '紅蓮火山', hue: 20, len: 5, offset: 4,
    desc: '敵の速度+15%。手を止めるな。', mods: { speed: 1.15 } },
  { id: 's4', x: 0.50, y: 0.60, icon: '❄️', name: '氷晶洞窟', hue: 200, len: 5, offset: 4,
    desc: '敵がゆっくり、しかし群れで押し寄せる。', mods: { spawn: 0.72, speed: 0.92 } },
  { id: 's5', x: 0.53, y: 0.30, icon: '⛈️', name: '雷雲の塔', hue: 265, len: 6, offset: 7,
    desc: '敵が2体同時に出現することがある。', mods: { burst: true } },
  { id: 's6', x: 0.72, y: 0.44, icon: '🏰', name: '終焉の魔王城', hue: 330, len: 7, offset: 10,
    desc: '長文・高速・物量。最終決戦。', mods: { speed: 1.1, level: 1, bossWords: 2 } },
  { id: 's7', x: 0.85, y: 0.18, icon: '🌌', name: '虚空回廊（ENDLESS）', hue: 230, len: Infinity, offset: 5,
    desc: '果てなき回廊。5フロアごとにボス。どこまで行ける？', mods: {} },
];
const MAPEDGES = [['s1', 's2'], ['s2', 's3'], ['s2', 's4'], ['s3', 's5'], ['s4', 's5'], ['s5', 's6'], ['s6', 's7']];
const nodeById = {};
for (const n of MAPNODES) nodeById[n.id] = n;
function neighborsOf(id) {
  const r = [];
  for (const [a, b] of MAPEDGES) { if (a === id) r.push(b); if (b === id) r.push(a); }
  return r;
}

let progress;
try { progress = JSON.parse(localStorage.getItem('tr_progress')); } catch (err) { progress = null; }
if (!progress || !Array.isArray(progress.cleared)) progress = { cleared: [], best: {}, node: 's1' };
function saveProgress() { localStorage.setItem('tr_progress', JSON.stringify(progress)); }
function isUnlocked(id) {
  if (id === 's1') return true;
  return MAPEDGES.some(([a, b]) =>
    (a === id && progress.cleared.includes(b)) || (b === id && progress.cleared.includes(a)));
}

const avatar = { node: 's1', moving: null, trailT: 0 };
if (nodeById[progress.node] && isUnlocked(progress.node)) avatar.node = progress.node;

// 実効フロア = ステージ難易度オフセット + 現在フロア
const eff = () => S.floor + (S.stage ? S.stage.offset : 0);

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

function spawnEnemy(forceLevel) {
  const level = forceLevel || wordLevel();
  const w = pickWord(level, activeFirstLetters(), activeWords());
  const tier = level <= 3 ? 1 : level <= 6 ? 2 : 3;
  const speed = (58 + eff() * 6) * rand(0.85, 1.2)
    * (tier === 3 ? 0.6 : tier === 2 ? 0.82 : 1.05)
    * S.mods.speedMul * (S.stage.mods.speed || 1);
  enemies.push({
    x: rand(80, W - 80), y: -46,
    word: w, cands: romanize(w.k), typed: '',
    r: 15 + tier * 6 + Math.min(w.n, 10) * 1.2, tier, speed,
    wob: rand(0, TAU), hue: [190, 315, 26][tier - 1] + rand(-14, 14),
    kvx: 0, kvy: 0, boss: false, alive: true,
  });
  S.spawned++;
}

function spawnBoss() {
  const count = 4 + Math.floor(eff() / 5) * 2 + (S.stage.mods.bossWords || 0);
  const queue = [];
  const used = new Set();
  const baseLv = clamp(Math.ceil(eff() * 0.5) + 2, 3, 10);
  for (let i = 0; i < count; i++) {
    const w = pickWord(clamp(baseLv + (i % 2), 1, 10), new Set(), used);
    used.add(w.k);
    queue.push(w);
  }
  const w = queue.shift();
  const boss = {
    x: W / 2, y: -110,
    word: w, cands: romanize(w.k), typed: '',
    r: 64, tier: 3, speed: (13 + eff() * 0.7) * S.mods.speedMul * (S.stage.mods.speed || 1),
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
  // スペース早送り中はリスクの分スコア1.5倍
  let gain = Math.round((e.word.n * 15 + eff() * 5) * comboMult() * S.mods.scoreMul
    * (crit ? 2 : 1) * (chained ? 0.5 : 1) * (S.ffwd ? 1.5 : 1));
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
    S.score += 500 * eff() * S.mods.scoreMul | 0;
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
  // ミスペナルティ：1.2秒間、敵全体が加速する
  S.missBoostT = 1.2;
  floater(coreX(), coreY() - 116, '⚠ 敵加速!', '#ff7b6b', 16);
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
      goWorld();
    }
    return;
  }
  if (S.phase === 'world') {
    const dirs = {
      arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0],
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
    };
    if (dirs[k]) { e.preventDefault(); tryMove(dirs[k][0], dirs[k][1]); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enterStage(); }
    return;
  }
  if (S.phase === 'relic') {
    if (!relicChoices.length) return;
    if (k === 'arrowleft' || k === 'a') {
      relicSel = (relicSel + relicChoices.length - 1) % relicChoices.length;
      paintRelicSel(); sfx.type();
    } else if (k === 'arrowright' || k === 'd') {
      relicSel = (relicSel + 1) % relicChoices.length;
      paintRelicSel(); sfx.type();
    } else if (e.key === 'Enter' || e.key === ' ') {
      selectRelic(relicChoices[relicSel]);
    }
    e.preventDefault();
    return;
  }
  if (S.phase === 'over' || S.phase === 'won') {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goWorld(); }
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

let relicChoices = [], relicSel = 0;

function showRelics() {
  S.phase = 'relic';
  const cards = $('relic-cards');
  cards.innerHTML = '';
  // boolean relics don't stack — hide them once owned
  const ownedCount = {};
  for (const r of S.relics) ownedCount[r.id] = (ownedCount[r.id] || 0) + 1;
  const pool = RELICS.filter(r => !(ownedCount[r.id] && (r.id === 'bomb' || r.id === 'knock')));
  relicChoices = []; relicSel = 0;
  for (let i = 0; i < 3 && pool.length; i++) {
    const r = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    relicChoices.push(r);
    const div = document.createElement('div');
    div.className = 'relic-card';
    div.innerHTML = `<div class="relic-icon">${r.icon}</div>
      <div class="relic-name">${r.name}</div>
      <div class="relic-desc">${r.desc}</div>
      ${ownedCount[r.id] ? `<div class="relic-owned">所持 ×${ownedCount[r.id]}</div>` : ''}`;
    div.onclick = () => selectRelic(r);
    div.onmouseenter = () => { relicSel = relicChoices.indexOf(r); paintRelicSel(); };
    cards.appendChild(div);
  }
  paintRelicSel();
  $('relic-screen').classList.remove('hidden');
}

function paintRelicSel() {
  [...$('relic-cards').children].forEach((c, i) => c.classList.toggle('sel', i === relicSel));
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
function isBossFloor(f) {
  if (S.stage && S.stage.len !== Infinity) return f === S.stage.len;
  return f % 5 === 0;
}
const floorLabel = () =>
  'FLOOR ' + S.floor + (S.stage && S.stage.len !== Infinity ? ' / ' + S.stage.len : '');

function setupFloor() {
  S.floorKills = 0;
  S.spawned = 0;
  S.floorNeeded = Math.min(24, Math.round(8 + eff() * 1.6));
  S.spawnT = 0.7;
  S.minionT = 0;
  S.shield = S.mods.shieldMax;
  S.target = null;
  S.missBoostT = 0;
  floorHud();
  if (isBossFloor(S.floor)) {
    banner(floorLabel(), '⚠ WARNING — BOSS APPROACHING ⚠', true);
    setTimeout(() => { if (S.phase === 'play') spawnBoss(); }, 1400);
  } else {
    banner(floorLabel(), '敵を ' + S.floorNeeded + ' 体撃破せよ', false);
  }
}

function checkFloorClear(bossDead) {
  if (S.phase !== 'play') return;
  if (isBossFloor(S.floor)) {
    if (!bossDead) return;
    enemies = []; S.target = null;
    if (S.stage.len !== Infinity) { stageClear(); return; }
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

function startRun(stage) {
  S.stage = stage;
  S.phase = 'play';
  S.paused = false;
  S.missBoostT = 0;
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
  $('map-info').classList.add('hidden');
  $('hud').classList.remove('hidden');
  hpHud(); scoreHud(); comboHud(false); relicsHud();
  setupFloor();
}

function runStatsHtml(newBest) {
  const acc = S.keys ? Math.round(S.hits / S.keys * 100) : 100;
  const kpm = S.playT > 1 ? Math.round(S.hits / (S.playT / 60)) : 0;
  return `<div>ステージ<span class="v">${S.stage.icon} ${S.stage.name}</span></div>
     <div>SCORE<span class="v${newBest ? ' newbest' : ''}">${S.score.toLocaleString()}${newBest ? ' ★NEW BEST!' : ''}</span></div>
     <div>BEST<span class="v">${S.best.toLocaleString()}</span></div>
     <div>到達フロア<span class="v">${S.floor}${S.stage.len !== Infinity ? ' / ' + S.stage.len : ''}</span></div>
     <div>撃破数<span class="v">${S.kills}</span></div>
     <div>最大コンボ<span class="v">${S.maxCombo}</span></div>
     <div>正確率<span class="v">${acc}%</span></div>
     <div>打鍵速度<span class="v">${kpm} KPM</span></div>`;
}

function gameOver() {
  S.phase = 'over';
  S.boss = null;
  $('bossbar-wrap').classList.add('hidden');
  burst(coreX(), coreY(), 195, 140, 1.8, true);
  ring(coreX(), coreY(), 195, 900, 8);
  shake(28); flash(0.5, '255,60,90');
  sfx.over();
  progress.best[S.stage.id] = Math.max(progress.best[S.stage.id] || 0, S.score);
  saveProgress();
  const newBest = S.score > S.best;
  if (newBest) { S.best = S.score; localStorage.setItem('tr_best', S.best); }
  $('over-title').textContent = 'GAME OVER';
  $('over-title').classList.remove('win');
  $('over-stats').innerHTML = runStatsHtml(newBest);
  setTimeout(() => $('over-screen').classList.remove('hidden'), 900);
}

function stageClear() {
  S.phase = 'won';
  S.boss = null;
  $('bossbar-wrap').classList.add('hidden');
  const st = S.stage;
  if (!progress.cleared.includes(st.id)) progress.cleared.push(st.id);
  progress.best[st.id] = Math.max(progress.best[st.id] || 0, S.score);
  saveProgress();
  const newBest = S.score > S.best;
  if (newBest) { S.best = S.score; localStorage.setItem('tr_best', S.best); }
  sfx.clear();
  banner('STAGE CLEAR!!', st.name + ' 制覇！', false);
  flash(0.25, '255,213,74');
  $('over-title').textContent = 'STAGE CLEAR!!';
  $('over-title').classList.add('win');
  $('over-stats').innerHTML = runStatsHtml(newBest);
  setTimeout(() => $('over-screen').classList.remove('hidden'), 1700);
}

/* ================= world map flow ================= */
function goWorld() {
  S.phase = 'world';
  S.paused = false; S.boss = null; S.target = null; S.stage = null; S.ffwd = false;
  enemies = []; beams = []; floaters = [];
  S.shake = 0; S.timeScale = 1; S.missBoostT = 0; S.freezeT = 0;
  ['title-screen', 'over-screen', 'relic-screen', 'pause-screen'].forEach(id => $(id).classList.add('hidden'));
  $('bossbar-wrap').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('map-info').classList.remove('hidden');
  updateMapInfo();
}

function updateMapInfo() {
  const n = nodeById[avatar.node];
  const cleared = progress.cleared.includes(n.id);
  $('mi-icon').textContent = n.icon;
  $('mi-name').innerHTML = n.name + (cleared ? ' <span class="star">★ CLEAR</span>' : '');
  $('mi-desc').textContent = n.desc + (n.len !== Infinity ? `（全${n.len}フロア）` : '');
  $('mi-best').textContent = progress.best[n.id] ? 'BEST: ' + progress.best[n.id].toLocaleString() : '';
  $('mi-action').innerHTML = '⏎ ENTER : 出撃<br>←↑↓→ : 移動';
}

function tryMove(dx, dy) {
  if (avatar.moving) return;
  const cur = nodeById[avatar.node];
  let best = null, bestDot = 0.45;
  for (const id of neighborsOf(cur.id)) {
    const n = nodeById[id];
    const vx = n.x - cur.x, vy = n.y - cur.y;
    const len = Math.hypot(vx, vy) || 1;
    const dot = (vx * dx + vy * dy) / len;
    if (dot > bestDot) { best = n; bestDot = dot; }
  }
  if (!best) return;
  if (!isUnlocked(best.id)) {
    floater(best.x * W, best.y * H - 50, '🔒 となりをクリアして解放', '#9fb3c8', 16);
    sfx.miss();
    return;
  }
  avatar.moving = { from: cur, to: best, t: 0, dur: 0.4 };
  sfx.type();
}

function enterStage() {
  if (avatar.moving) return;
  sfx.relic();
  startRun(nodeById[avatar.node]);
}

function avatarPos(t) {
  let x, y;
  if (avatar.moving) {
    const m = avatar.moving;
    const k = clamp(m.t, 0, 1);
    const s = k * k * (3 - 2 * k);
    x = lerp(m.from.x, m.to.x, s) * W;
    y = lerp(m.from.y, m.to.y, s) * H;
  } else {
    const n = nodeById[avatar.node];
    x = n.x * W; y = n.y * H;
  }
  return { x, y: y - 36 + Math.sin(t * 3) * 4 };
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
function floorHud() {
  $('floor').textContent = (S.stage ? S.stage.icon + ' ' : '') + floorLabel() + (isBossFloor(S.floor) ? ' ☠' : '');
}
function relicsHud() {
  const counts = {};
  for (const r of S.relics) counts[r.id] = (counts[r.id] || 0) + 1;
  $('relics').innerHTML = Object.entries(counts).map(([id, n]) => {
    const r = RELICS.find(x => x.id === id);
    return r.icon + (n > 1 ? `<sub>×${n}</sub>` : '');
  }).join(' ');
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
  S.missBoostT = Math.max(0, S.missBoostT - dt);
  S.glowT += dt;

  const wdt = dt * S.timeScale * (S.ffwd && S.phase === 'play' ? 3 : 1);
  // フリーズで減速、ミス直後は加速ペナルティ
  const enemySlow = (S.freezeT > 0 ? 0.25 : 1) * (S.missBoostT > 0 ? 1.6 : 1);

  if (S.phase === 'world') {
    if (avatar.moving) {
      const m = avatar.moving;
      m.t += dt / m.dur;
      if (m.t >= 1) {
        avatar.node = m.to.id;
        avatar.moving = null;
        progress.node = avatar.node;
        saveProgress();
        updateMapInfo();
        ring(m.to.x * W, m.to.y * H, nodeById[avatar.node].hue, 380, 2);
      }
    }
    avatar.trailT -= dt;
    if (avatar.trailT <= 0 && particles.length < 600) {
      const p = avatarPos(performance.now() / 1000);
      particles.push({
        x: p.x + rand(-4, 4), y: p.y + 6, vx: rand(-15, 15), vy: rand(15, 45),
        t: 0, life: 0.6, size: rand(1.5, 3), hue: 190, streak: false, drag: 2, grav: 0,
      });
      avatar.trailT = 0.05;
    }
  }

  if (S.phase === 'play') {
    S.playT += dt;

    // spawning
    if (!isBossFloor(S.floor)) {
      if (S.spawned < S.floorNeeded && enemies.length < 7) {
        S.spawnT -= wdt;
        if (S.spawnT <= 0) {
          spawnEnemy();
          if (S.stage.mods.burst && Math.random() < 0.4 && enemies.length < 7) spawnEnemy();
          S.spawnT = Math.max(0.45, 1.45 - eff() * 0.08) * (S.stage.mods.spawn || 1) * rand(0.8, 1.25);
        }
      }
    } else if (S.boss) {
      // boss minions
      S.minionT -= wdt;
      if (S.minionT <= 0 && enemies.length < 6) {
        spawnEnemy(Math.random() < 0.6 ? 2 : 4);
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
          const dmg = 8 + Math.floor(eff() * 1.5);
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
function drawBackground(t, hueIn) {
  ctx.fillStyle = '#04050e';
  ctx.fillRect(0, 0, W, H);

  const baseHue = hueIn != null ? hueIn : (205 + S.floor * 22) % 360;
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
  const ty = e.y - e.r - 32;
  // 文字幅を測り、長文でも画面からはみ出さないよう中心をクランプ
  const dispFont = `900 ${e.boss ? 34 : 24}px "Noto Sans JP", sans-serif`;
  const romaFont = `700 ${e.boss ? 23 : 18}px Orbitron, monospace`;
  const cand = e.cands[0];
  const typed = e.typed;
  const rest = cand.slice(typed.length);
  ctx.font = dispFont;
  const dw = ctx.measureText(e.word.d).width;
  ctx.font = romaFont;
  const wTyped = ctx.measureText(typed).width;
  const wRest = ctx.measureText(rest).width;
  const labelW = Math.max(dw, wTyped + wRest);
  const lx = clamp(e.x, labelW / 2 + 10, W - labelW / 2 - 10);

  // display word
  ctx.textAlign = 'center';
  ctx.font = dispFont;
  ctx.shadowColor = `hsla(${e.hue},95%,60%,.9)`;
  ctx.shadowBlur = 12;
  ctx.fillStyle = isTarget ? '#fff' : 'rgba(235,246,255,.92)';
  ctx.fillText(e.word.d, lx, ty);
  ctx.shadowBlur = 0;

  // romaji: typed part gold, rest white
  const ry = ty + (e.boss ? 30 : 25);
  const x0 = lx - (wTyped + wRest) / 2;
  ctx.font = romaFont;
  ctx.textAlign = 'left';
  if (typed) {
    ctx.fillStyle = 'rgba(255,213,74,.85)';
    ctx.fillText(typed, x0, ry);
  }
  ctx.shadowColor = 'rgba(120,220,255,.8)';
  ctx.shadowBlur = isTarget ? 10 : 4;
  ctx.fillStyle = isTarget ? '#dffaff' : 'rgba(200,225,245,.75)';
  ctx.fillText(rest, x0 + wTyped, ry);
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

function drawWorld(t) {
  drawBackground(t, nodeById[avatar.node].hue);

  // heading
  ctx.textAlign = 'center';
  ctx.font = '900 30px Orbitron, monospace';
  ctx.shadowColor = 'rgba(75,232,255,.8)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#eaf8ff';
  ctx.fillText('WORLD MAP', W / 2, 64);
  ctx.shadowBlur = 0;
  ctx.font = '700 14px "Noto Sans JP", sans-serif';
  ctx.fillStyle = 'rgba(232,246,255,.6)';
  ctx.fillText('ステージをクリアして道をひらけ', W / 2, 90);

  // edges
  for (const [a, b] of MAPEDGES) {
    const na = nodeById[a], nb = nodeById[b];
    const open = isUnlocked(a) && isUnlocked(b);
    ctx.strokeStyle = open ? 'rgba(120,220,255,.55)' : 'rgba(120,150,180,.15)';
    ctx.lineWidth = open ? 2.5 : 1.5;
    ctx.setLineDash([3, 11]);
    ctx.lineDashOffset = open ? -t * 30 : 0;
    ctx.beginPath();
    ctx.moveTo(na.x * W, na.y * H);
    ctx.lineTo(nb.x * W, nb.y * H);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // nodes
  for (const n of MAPNODES) {
    const x = n.x * W, y = n.y * H;
    const unlocked = isUnlocked(n.id);
    const cleared = progress.cleared.includes(n.id);
    const here = avatar.node === n.id && !avatar.moving;
    const pulse = here ? 1 + Math.sin(t * 4) * 0.08 : 1;

    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, 64 * pulse);
    g.addColorStop(0, `hsla(${n.hue},85%,60%,${unlocked ? 0.4 : 0.07})`);
    g.addColorStop(1, 'hsla(0,0%,0%,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 70, y - 70, 140, 140);
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = unlocked ? 'rgba(10,18,38,.92)' : 'rgba(12,16,26,.85)';
    ctx.strokeStyle = unlocked ? `hsla(${n.hue},85%,65%,.95)` : 'rgba(130,150,175,.35)';
    ctx.lineWidth = here ? 3.5 : 2;
    ctx.beginPath();
    ctx.arc(x, y, 30 * pulse, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.font = '26px "Noto Sans JP", sans-serif';
    ctx.globalAlpha = unlocked ? 1 : 0.35;
    ctx.fillText(n.icon, x, y + 9);
    ctx.globalAlpha = 1;
    if (!unlocked) { ctx.font = '14px sans-serif'; ctx.fillText('🔒', x + 22, y - 18); }
    if (cleared) {
      ctx.font = '900 16px Orbitron, monospace';
      ctx.fillStyle = '#ffd54a';
      ctx.shadowColor = 'rgba(255,213,74,.9)';
      ctx.shadowBlur = 8;
      ctx.fillText('★', x - 26, y - 18);
      ctx.shadowBlur = 0;
    }
    ctx.font = '700 14px "Noto Sans JP", sans-serif';
    ctx.fillStyle = unlocked ? 'rgba(235,246,255,.92)' : 'rgba(160,175,195,.5)';
    ctx.fillText(n.name, x, y + 56);
  }

  // avatar (comet)
  const p = avatarPos(t);
  ctx.globalCompositeOperation = 'lighter';
  const ag = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 26);
  ag.addColorStop(0, 'rgba(160,240,255,.9)');
  ag.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ag;
  ctx.fillRect(p.x - 28, p.y - 28, 56, 56);
  ctx.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(t * 1.4);
  ctx.fillStyle = '#dffaff';
  ctx.strokeStyle = 'rgba(75,232,255,.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -9); ctx.lineTo(7, 0); ctx.lineTo(0, 9); ctx.lineTo(-7, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function render(t) {
  ctx.save();
  if (S.shake > 0.3) {
    ctx.translate(rand(-S.shake, S.shake), rand(-S.shake, S.shake));
  }
  if (S.phase === 'world') {
    drawWorld(t);
    drawFx();
  } else {
    drawBackground(t, S.stage ? (S.stage.hue + (S.floor - 1) * 14) % 360 : undefined);
    if (S.phase !== 'title') {
      drawCore(t);
      // draw far enemies first
      const sorted = [...enemies].sort((a, b) => a.y - b.y);
      for (const e of sorted) drawEnemy(e, t);
    }
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
  if (S.phase === 'title') goWorld();
  else if ((S.phase === 'over' || S.phase === 'won') && !$('over-screen').classList.contains('hidden')) goWorld();
  else if (S.phase === 'world') {
    for (const n of MAPNODES) {
      if (Math.hypot(n.x * W - e.clientX, n.y * H - e.clientY) < 42) {
        if (n.id === avatar.node && !avatar.moving) enterStage();
        else if (!avatar.moving && neighborsOf(avatar.node).includes(n.id) && isUnlocked(n.id)) {
          avatar.moving = { from: nodeById[avatar.node], to: n, t: 0, dur: 0.4 };
          sfx.type();
        }
        break;
      }
    }
  }
});
requestAnimationFrame(loop);
