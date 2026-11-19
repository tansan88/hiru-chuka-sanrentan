// AI予想の会話のテスト（同じプロセスで動かす）
// 決まった答え（品の確率・曜日の上位・本命・穴・倍率・これまで・先週）／話題の引き継ぎ／聞き返し／モデルの範囲／話題外／トークン／締切後／AIの言い回し（キーなし）
process.env.TZ = 'Asia/Tokyo';
const path = require('path');
const { ctx, SS } = require('./emu/gas_emu.js')(path.join(__dirname, '../gas/Code.gs'));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.log('FAIL', m, x === undefined ? '' : JSON.stringify(x)); } };
const call = (action, o = {}) => { ctx.__reset(); return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ action, v: 3 }, o)) } }).content); };
const sh = n => SS.getSheetByName(n);
try {
  ctx.初期設定();
  const h = call('register', { nick: 'てんちょう', pass: '0000' }).token;
  sh('参加者').data.forEach(r => { if (r[1] === 'てんちょう') r[4] = true; });
  const g = call('register', { nick: 'たろう', pass: '1111' }).token;
  const hostId = sh('参加者').data.find(r => r[1] === 'てんちょう')[0];
  const names = ['麻婆豆腐', '回鍋肉', '餃子', '炒飯', '天津飯', '酢豚', 'エビチリ', 'その他'];
  const past = ['2026-09-29', '2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27', '2026-11-03'];
  past.forEach((wid, k) => {
    sh('週').data.push([wid, 'テスト', k + 1, '確定', '', new Date(2026, 8, 29 + k * 7, 11), hostId, 'てんちょう', new Date(), new Date()]);
    names.forEach((n, i) => sh('メニュー').data.push([wid, i + 1, n, i + 1, [2, 3, 4.5, 6, 8, 10, 13, 16][i], [2, 3, 4.5, 6, 8, 10, 13, 16][i]]));
    [['火', 1], ['水', 5], ['木', k % 2 ? 1 : 2]].forEach(([d, w]) => sh('結果').data.push([wid, d, w, names[w - 1], '', new Date()]));
  });
  const wk = '2026-11-10';
  call('saveWeek', { token: h, weekId: wk, raceName: 'テスト', deadline: new Date(Date.now() + 86400000).toISOString(), menus: names.map((n, i) => ({ waku: i + 1, name: n })), publish: true });
  const ask = (q, model, effort, c) => call('aiAsk', { token: g, weekId: wk, model: model || 'haiku', effort: effort || 'low', q, ctx: c });

  ok(!ask('水曜は何が来そう？').ok, '予想を買う前は聞けない');
  ok(call('aiBuy', { token: g, weekId: wk, model: 'haiku', effort: 'low' }).ok, 'Hakkaku・低を買う');
  let L = call('aiList', { token: g });
  ok(L.items[0].result.probs && L.items[0].result.probs.水 && L.usage && L.usage.used === 0 && L.askOpen === true, '会話の数字・使用量が返る', L.usage);
  ok(L.items[0].result.buys.every(b => b.dots >= 1 && b.dots <= 5), '買い目にAIの自信が付く');

  let r = ask('水曜は何が来そう？');
  ok(r.ok && r.kind === 'day' && /水曜の上位は ①/.test(r.text), '曜日の上位', r);
  r = ask('天津飯が来る確率は？');
  ok(r.kind === 'prob' && /天津飯の来やすさは 火 [\d.]+%・水 [\d.]+%・木 [\d.]+%/.test(r.text) && r.ctx.item === 5, '品の来る確率（3日分）', r);
  const c1 = r.ctx;
  r = ask('じゃあ水曜は？', null, null, c1);
  ok(r.kind === 'prob' && /^水曜に天津飯が来る確率は [\d.]+%（水曜の中で\d番目・\d番人気・[\d.]+倍）/.test(r.text), '直前の品を引き継ぐ', r);
  r = ask('天津のオッズは？');
  ok(r.kind === 'odds' && /天津飯は \d番人気・[\d.]+倍/.test(r.text), '一部の名前と倍率', r);
  r = ask('本命は？');
  ok(r.kind === 'top' && /いちばん当たりやすい組は .+ → .+ → .+（3連単 [\d.]+倍）/.test(r.text), '本命の組', r);
  r = ask('買い目の1番の確率は？');
  ok(r.kind === 'buy' && /買い目の1番/.test(r.text), '買い目の番号', r);
  r = ask('穴は？');
  ok(r.kind === 'ana' && /Octopus で答えられます/.test(r.text), 'Hakkakuは穴に答えず、答えられるモデルを返す', r);
  r = ask('天津飯ってよく出る？');
  ok(r.kind === 'hist' && /Shumainet で答えられます/.test(r.text), 'Hakkakuはこれまでの記録に答えない', r);
  r = ask('Octopusだとどう？');
  ok(r.kind === 'model' && /Octopusの予想を買うと見られます/.test(r.text), '買っていないモデル', r);
  r = ask('1番は？');
  ok(r.kind === 'ask' && /出馬表の1番（麻婆豆腐）と、買い目の1番のどちら/.test(r.text) && r.choices.length === 2, '枠番か買い目か分からないときは聞き返す', r);
  r = ask('先週は何だった？');
  ok(r.kind === 'last' && /^先週は 麻婆豆腐 → 天津飯 → 麻婆豆腐 でした$/.test(r.text), '先週の結果', r);
  r = ask('明日の天気は？');
  ok(r.kind === 'off' && /昼中華の予想のことなら/.test(r.text) && r.choices.length, '話題外は決まった文と例', r);
  r = ask('明日の天気は？', null, null, c1);
  ok(r.kind === 'off', '直前の品があっても、天気の質問は話題外', r);
  r = ask('金曜は？');
  ok(/対象ではありません/.test(r.text), '火〜木以外の曜日', r);
  r = ask('麻婆豆腐と回鍋肉ならどっちが来やすいかな、理由も教えて');
  ok(r.kind === 'cmp' && /麻婆豆腐（[\d.]+% 対 [\d.]+%）/.test(r.text), '2つの品をくらべる', r);
  r = ask('中華って好き？');
  ok(r.kind === 'free' && r.pend, 'AIに回す質問は、先に数字の答えと受付番号', r);
  const ph = call('aiPhrase', { token: g, id: r.pend });
  ok(ph.ok && ph.text === '', 'キーがなければAIの言い回しは空（数字の答えのまま）', ph);
  ok(!call('aiPhrase', { token: h, id: r.pend }).text, '他人・使い終わった受付番号では何も返らない');

  // Octopus なら穴・ホストの好み・これまで
  call('aiBuy', { token: g, weekId: wk, model: 'opus', effort: 'mid' });
  r = ask('穴は？', 'opus', 'mid');
  ok(r.kind === 'ana' && /当たりやすさの割に倍率が高いのは .曜の/.test(r.text), 'Octopusは穴に答える', r);
  r = ask('水曜によく出るのは？', 'opus', 'mid');
  ok(r.kind === 'hist' && /水曜によく出ているのは 天津飯（6回）/.test(r.text), 'これまでの記録（曜日）', r);
  r = ask('天津飯ってよく出る？', 'opus', 'mid');
  ok(r.kind === 'hist' && /18日のうち、天津飯は6回出ています（水6回）/.test(r.text), 'これまでの記録（品）', r);
  r = ask('ホストの好きなものは？', 'opus', 'mid');
  ok(r.kind === 'host' && /麻婆豆腐/.test(r.text), 'ホストの好み', r);
  // 答えてはいけない質問（ずる・他人の名前・悪口）と、AIの名前
  [['結果を事前に知る方法', /公平/], ['ホストが天津飯を選ぶように仕向けるには', /公平/], ['店長は誰？', /ほかの人/], ['お前使えないな', /その話は/]].forEach(([q, re]) => { r = ask(q, 'opus', 'mid'); ok(r.kind === 'block' && re.test(r.text), '断る：' + q, r); });
  r = ask('あなたは誰？', 'opus', 'mid');
  ok(r.kind === 'chat' && /予想AI/.test(r.text), 'AIの名前を聞かれたら', r);

  // 記録・使用量
  const rows = sh('AI会話').data.filter(x => x[0] === wk);
  ok(rows.length >= 15 && rows[0][5] === '水曜は何が来そう？', '質問と答えがシートに残る', rows.length);
  L = call('aiList', { token: g });
  ok(L.usage.used >= 15 && L.items[0].convo.length >= 14 && L.items[0].convo[0].q === '水曜は何が来そう？', '会話と使用量が一覧に入る', L.usage);
  // トークン切れ
  sh('設定').data.find(x => x[0] === 'AI会話のトークン（1週）')[1] = 5;
  r = ask('本命は？');
  ok(r.kind === 'limit' && /今週の質問はここまで/.test(r.text), 'トークンを使い切ったら止まる', r);
  sh('設定').data.find(x => x[0] === 'AI会話のトークン（1週）')[1] = 100;
  // 締切後
  sh('週').data.forEach(x => { if (x[0] === wk) x[5] = new Date(Date.now() - 1000); });
  r = ask('本命は？');
  ok(r.kind === 'closed', '締切後は聞けない', r);
} catch (e) { console.log('CRASH', e && e.stack || e); fail++; }
console.log(`PASS ${pass} FAIL ${fail}`);
