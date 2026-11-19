// 複数券（フォーメーション）のテスト（同じプロセスで動かす）
// 1日に複数の品・点数×1点pt・まとめて買う・取り消し・受付番号・配当（日替わりは1点ごと、3連単は1点）・倍率の重み・みんなの予想は人数
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
  const g2 = call('register', { nick: 'はなこ', pass: '2222' }).token;
  const names = ['麻婆豆腐', '回鍋肉', '餃子', '炒飯', '天津飯'];
  const wk = '2026-11-10';
  let r = call('saveWeek', { token: h, weekId: wk, raceName: 'テスト', deadline: new Date(Date.now() + 86400000).toISOString(), menus: names.map((n, i) => ({ waku: i + 1, name: n })), publish: true });
  ok(r.ok, '公開', r);
  const buy = (t, sets, from) => call('predict', { token: t, weekId: wk, sets, from });

  // 入力のまちがい
  ok(!buy(g, [{ picks: { 火: [], 水: [1], 木: [1] }, bet: 100 }]).ok, '空の日は不可');
  ok(!buy(g, [{ picks: { 火: [1, 9], 水: [1], 木: [1] }, bet: 100 }]).ok, '存在しない枠は不可');
  ok(!buy(g, [{ picks: { 火: [1], 水: [1], 木: [1] }, bet: 150 }]).ok, '1点ptは100単位');
  ok(!buy(g, [{ picks: { 火: [1, 2], 水: [1, 2], 木: [1, 2, 3] }, bet: 1000 }]).ok, '12点×1000は持ち点10000を超えるので不可');
  ok(!buy(g, [{ picks: { 火: [1], 水: [1], 木: [1] }, bet: 100 }], 'AI ずる').ok, '由来はAIのモデル名だけ');

  // 2組をまとめて買う：①火1・2 水5 木1・3（4点×200）②火1 水1 木1（1点×500）
  r = buy(g, [{ picks: { 火: [2, 1, 1], 水: [5], 木: [1, 3] }, bet: 200 }, { picks: { 火: [1], 水: [1], 木: [1] }, bet: 500 }], 'AI Octopus');
  ok(r.ok && r.total === 1300 && r.sets.length === 2, 'まとめて買える（合計1300）', r);
  const no1 = r.no;
  let s = call('state', { token: g });
  ok(s.me.balance === 8700, '持ち点から合計が引かれる', s.me.balance);
  const mp = s.current.myPreds;
  ok(mp.length === 2 && mp[0].points === 4 && mp[0].cost === 800 && mp[0].bet === 200 && JSON.stringify(mp[0].picks.火) === '[1,2]' && mp[0].from === 'AI Octopus', '組の中身（重複は1つに・並べ替え）', mp);
  ok(s.current.receipts.length === 1 && s.current.receipts[0].no === no1 && s.current.receipts[0].points === 5 && s.current.receipts[0].cost === 1300, '受付のまとめ', s.current.receipts);
  const row = sh('予想').data.find(x => x[1] && x[8] === 1 && x[0] !== '週ID');
  ok(row && String(row[3]).replace("'", '') === '1・2' && row[4] === 5 && row[9] === 200 && row[11] === no1, 'シートには「1・2」の形で入る', row);
  ok(sh('予想').data[0].slice(8).join('|') === '組|1点pt|由来|受付', '後から足した列の見出し', sh('予想').data[0]);

  // 別の人
  r = buy(g2, [{ picks: { 火: [1], 水: [5], 木: [3] }, bet: 1000 }]);
  ok(r.ok && r.no === no1 + 1, '受付番号は増える', r);
  // 取り消し
  r = buy(g, [{ picks: { 火: [4], 水: [4], 木: [4] }, bet: 100 }]);
  const no3 = r.no;
  ok(call('cancelPred', { token: g, weekId: wk, set: 3 }).ok, '3組目を取り消す');
  s = call('state', { token: g });
  ok(s.current.myPreds.length === 2 && s.me.balance === 8700, '取り消すとptが戻る', { n: s.current.myPreds.length, b: s.me.balance });
  r = buy(g, [{ picks: { 火: [4], 水: [4], 木: [4] }, bet: 100 }]);
  ok(r.no === no3 + 1, '取り消しても受付番号は戻らない', r);
  call('cancelPred', { token: g, weekId: wk, set: r.sets[0] });
  ok(s.current.predCount === 2, '予想済みは人数で数える', s.current.predCount);

  // 倍率の重み：1組の使ったptを3日に1/3ずつ、その日の品で等分
  const om = {}; s.current.menus.forEach(m => om[m.waku] = m.odds);
  ok(om[1] < 2 && om[5] < 8, '買われた品の倍率が下がる', om);

  // 締切 → みんなの予想は人数
  sh('週').data.forEach(x => { if (x[0] === wk) x[5] = new Date(Date.now() - 1000); });
  ok(!buy(g, [{ picks: { 火: [1], 水: [1], 木: [1] }, bet: 100 }]).ok, '締切後は買えない');
  ok(!call('cancelPred', { token: g, weekId: wk, set: 1 }).ok, '締切後は取り消せない');
  s = call('state', { token: g });
  ok(s.current.crowd.火[1] === 2 && s.current.crowd.火[2] === 1 && s.current.crowd.水[5] === 2, 'みんなの予想は人数（組の数ではない）', s.current.crowd);
  const before = {}; s.current.menus.forEach(m => before[m.waku] = m.odds);

  // 結果 火1 水5 木3 → たろう①：火は1を含む（木の2点分）・水5（4点分）・木3（火の2点分）、3連単1点 ／ ②：火だけ
  [['火', 1], ['水', 5], ['木', 3]].forEach(([d, w]) => ok(call('registerDay', { token: h, weekId: wk, day: d, waku: w }).ok, d + 'の登録'));
  ok(call('settle', { token: h, weekId: wk }).ok, '確定');
  const o = before, f = Math.floor;
  const exp1 = f(200 / 3 * o[1]) * 2 + f(200 / 3 * o[5]) * 4 + f(200 / 3 * o[3]) * 2 + f(200 * o[1] * o[5] * o[3]);
  const exp2 = f(500 / 3 * o[1]);
  const st = call('state', { token: g });
  ok(st.lastResult.settle.total === exp1 + exp2, '配当（日替わりは1点ごと・3連単は1点）', { got: st.lastResult.settle, exp: exp1 + exp2, o });
  ok(st.lastResult.settle.net === exp1 + exp2 - 1300, '収支は合計から使ったptを引く', st.lastResult.settle);
  ok(sh('獲得pt').data.filter(x => x[0] === wk).length === 2, '獲得ptは1人1週1行');
  const sets = st.lastResult.myPreds;
  ok(sets[0].triple === true && sets[0].got === exp1 && sets[1].triple === false && sets[1].got === exp2, '組ごとの配当と3連単の的中', sets);
  ok(st.me.balance === 8700 + exp1 + exp2, '持ち点に配当が入る', st.me.balance);
  const his = call('history', { token: g });
  ok(his.ok && his.list[0].played === true, '過去の結果に出る', his);

  // 古い形（1つずつ）の行も読める
  const wk2 = '2026-11-17';
  call('saveWeek', { token: h, weekId: wk2, raceName: 'テスト', deadline: new Date(Date.now() + 86400000).toISOString(), menus: names.map((n, i) => ({ waku: i + 1, name: n })), publish: true });
  sh('予想').data.push([wk2, sh('参加者').data.find(x => x[1] === 'はなこ')[0], 'はなこ', 2, 3, 4, 600, new Date()]);
  s = call('state', { token: g2 });
  ok(s.current.myPreds.length === 1 && s.current.myPreds[0].points === 1 && s.current.myPreds[0].bet === 600 && s.current.myPreds[0].set === 1, '古い形の行は1点・1組目として読む', s.current.myPreds);
  r = call('predict', { token: g2, weekId: wk2, picks: { 火: 1, 水: 1, 木: 1 }, bet: 100 });
  ok(r.ok && r.sets[0] === 2, '古い画面の送り方でも買える（足される）', r);
} catch (e) { console.log('CRASH', e && e.stack || e); fail++; }
console.log(`PASS ${pass} FAIL ${fail}`);
