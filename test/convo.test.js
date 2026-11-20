// AI予想の会話のテスト（同じプロセスで動かす）
// 決まった答え（品の確率・曜日の上位・本命・穴・倍率・これまで・先週）／話題の引き継ぎ／聞き返し／モデルの範囲／話題外／トークン／締切後／AIの言い回し（キーなし）
process.env.TZ = 'Asia/Tokyo';
const path = require('path');
const { ctx, SS, G } = require('./emu/gas_emu.js')(path.join(__dirname, '../gas/Code.gs'));
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
  ok(r.kind === 'free' && !r.pend && r.row > 1, 'キーがなければAIに回さず、決まった答えのまま', r);

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

  // ---- AIが答える（キーあり）：会話の流れを渡す・数字と順位を確かめる・直して送り直す・止める ----
  G.PropertiesService.getScriptProperties().setProperty('GROQ_API_KEY', 'test');
  let sent = null, reply = '';
  G.UrlFetchApp.fetch = (url, o) => { sent = JSON.parse(o.payload); return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ choices: [{ message: { content: reply } }], usage: { total_tokens: 900, completion_tokens: 40 } }) }; };
  const AI = (q, rep, extra) => { reply = rep; G.CacheService.getScriptCache().remove('aiMin' + Math.floor(Date.now() / 60000)); // 1分の上限はテストでは外す
    const a = call('aiAsk', Object.assign({ token: g, weekId: wk, model: 'opus', effort: 'mid', q }, extra || {})); const p = a.pend ? call('aiPhrase', { token: g, id: a.pend }) : null; return { a, p }; };
  let x = AI('このホストの好みを教えて', '<think>考え</think>担当ホストがいちばん多く食べているのは麻婆豆腐です。');
  ok(x.a.pend && x.p.text === '担当ホストがいちばん多く食べているのは麻婆豆腐です。', '決まった答えがある質問もAIが答える（考えた部分は消す）', x);
  x = AI('どれくらい好き？', '9回食べていて、いちばん多いです。');
  const msgs = sent.messages;
  ok(msgs[0].role === 'system' && /Octopus/.test(msgs[0].content) && msgs.slice(-3).map(m => m.role).join() === 'user,assistant,user' && msgs[msgs.length - 3].content === 'このホストの好みを教えて' && msgs[msgs.length - 1].content === 'どれくらい好き？', '直前の会話をAIに渡す', msgs.slice(-3));
  ok(!JSON.stringify(sent).includes('たろう') && !JSON.stringify(sent).includes('てんちょう'), 'ニックネームはAIに送らない');
  ok(/穴＝/.test(msgs[0].content) && /このモデルで答えられること/.test(msgs[0].content), '言葉の意味とモデルでできることを渡す');
  x = AI('水曜の本命は？', '水曜に最も来やすいのは回鍋肉です。');
  ok(x.p.text === '', '「最も来やすい」の品が1位でなければ使わない（決まった答えのまま）', x.p);
  x = AI('水曜の本命は？', '水曜に最も来やすいのは天津飯です。');
  ok(/天津飯/.test(x.p.text), '1位どおりならそのまま', x.p);
  x = AI('天気は？', 'OFF');
  ok(x.p.kind === 'off' && /昼中華の予想のことなら/.test(x.p.text), 'OFFなら決まった一文', x.p);
  // 直して送り直す
  const before = call('aiList', { token: g }).convo.length;
  const cutRow = x.a.row;
  x = AI('水曜の穴は？', '水曜は天津飯が来やすいです。', { cut: cutRow });
  let C = call('aiList', { token: g }).convo;
  ok(C.length === before && C[C.length - 1].q === '水曜の穴は？' && !C.some(c => c.q === '天気は？'), '直して送り直すと、その質問から後ろが消える', C.slice(-2));
  // 止める
  reply = 'まだ届かない答え';
  const sa = call('aiAsk', { token: g, weekId: wk, model: 'opus', effort: 'mid', q: '木曜は？' });
  call('aiStop', { token: g, row: sa.row, id: sa.pend });
  const sp = call('aiPhrase', { token: g, id: sa.pend });
  C = call('aiList', { token: g }).convo;
  ok(sp.text === '' && C[C.length - 1].stop && C[C.length - 1].a === '', '止めた質問には答えを書かない', [sp, C[C.length - 1]]);
  x = AI('じゃあ火曜は？', '火曜は麻婆豆腐です。');
  ok(!sent.messages.some(m => m.content === '木曜は？' || m.content === '天気は？'), '消した・止めた質問はAIに渡さない');
  // 買い目を提案するスキル：品名を枠番に直し、答えの文からは印を消す。出馬表にない品なら提案しない
  x = AI('その組み立てで買っておいて', '水曜を厚めにした組です。下のボタンから買えます。\n[[買い目 火:麻婆豆腐 水:天津飯,回鍋肉 木:麻婆豆腐]]');
  ok(x.p.prop && x.p.prop.picks.水.length === 2 && x.p.prop.picks.火.length === 1 && !/\[\[/.test(x.p.text), '買い目の提案を読む（文から印を消す）', x.p);
  let LL = call('aiList', { token: g }).convo.pop();
  ok(LL.prop && LL.prop.picks.水.length === 2 && !/\[\[/.test(LL.a), '提案は開き直しても残る', LL);
  x = AI('次の質問', 'わかりました。');
  ok(sent.messages.some(m => m.role === 'assistant' && /提案した買い目：火 麻婆豆腐/.test(m.content)), '提案した買い目は品名でAIに覚えさせる');
  x = AI('買っておいて', '提案です。\n[[買い目 火:北京ダック 水:天津飯 木:麻婆豆腐]]');
  ok(!x.p.prop && x.p.text === '提案です。', '出馬表にない品の提案は出さない', x.p);
  // 検索のスキル：検索を頼まれたら Gemini の検索で答え、参照を付ける。関係ない検索はかわす
  G.PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', 'test');
  let calls = 0;
  G.UrlFetchApp.fetch = (url, o) => { calls++; const b = o && o.payload ? JSON.parse(o.payload) : {}; if (o && o.payload) sent = b;
    if (/wikipedia/.test(url)) return { getResponseCode: () => 200, getContentText: () => JSON.stringify(/list=search/.test(url) ? { query: { search: [{ title: '投票券 (公営競技)', snippet: 'フォーメーション 馬券 の買い方' }] } } : { query: { pages: { 1: { title: '投票券 (公営競技)', extract: 'フォーメーションは着順ごとに番号を指定して買う方法。' } } } }) };
    if (/groq/.test(url) && /抜き書き/.test(b.messages[0].content)) return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ choices: [{ message: { content: 'フォーメーションは軸を決めて相手を広げる買い方です。' } }], usage: { total_tokens: 900 } }) };
    if (/groq/.test(url)) return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ choices: [{ message: { content: reply } }], usage: { total_tokens: 900 } }) };
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ content: { parts: [{ text: 'フォーメーションは軸を決めて相手を広げる買い方です。' }] }, groundingMetadata: { groundingChunks: [{ web: { uri: 'https://example.com/a', title: 'example.com' } }] } }] }) }; };
  x = AI('フォーメーションの買い方のコツをネット検索して', '[[検索 フォーメーション 買い方 コツ]]');
  ok(/軸を決めて/.test(x.p.text) && x.p.refs && /ja\.wikipedia\.org/.test(x.p.refs[0].u), '検索して参照を付ける（Wikipedia）', x.p);
  LL = call('aiList', { token: g }).convo.pop();
  ok(LL.refs && LL.refs.length === 1 && !/\[\[/.test(LL.a), '参照は開き直しても残る', LL);
  x = AI('明日の東京の天気をネットで検索して', 'OFF');
  ok(x.p.kind === 'off' && /ネットで調べるのは/.test(x.p.text), '関係ない検索はかわす', x.p);
  G.PropertiesService.getScriptProperties().deleteProperty('GEMINI_API_KEY');
  G.UrlFetchApp.fetch = (url, o) => { sent = JSON.parse(o.payload); return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ choices: [{ message: { content: reply } }], usage: { total_tokens: 900, completion_tokens: 40 } }) }; };
  G.PropertiesService.getScriptProperties().deleteProperty('GROQ_API_KEY');
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
