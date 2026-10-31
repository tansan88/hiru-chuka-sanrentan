// 補充の歯止め：その週の何回目かで額が下がる／2回目からは、その週の3連単に予想した人だけ／月曜に満額へ戻る
process.env.TZ = 'Asia/Tokyo';
const path = require('path');
const RealDate = Date;
let NOW = new RealDate(2026, 10, 2, 9, 0).getTime(); // 2026-11-02（月）9:00
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } };
const { ctx, SS } = require('./emu/gas_emu.js')(path.join(__dirname, '../gas/Code.gs'));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.log('FAIL', m, x === undefined ? '' : JSON.stringify(x)); } };
const call = (action, o = {}) => { ctx.__reset(); return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ action, v: 3 }, o)) } }).content); };
const users = () => SS.getSheetByName('参加者').data;
const setAdd = (nick, v) => users().forEach(r => { if (r[1] === nick) r[5] = v; });
const addOf = nick => users().find(r => r[1] === nick)[5];
const setting = (k, v) => { const d = SS.getSheetByName('設定').data; const row = d.find(r => r[0] === k); if (row) row[1] = v; else d.push([k, v, '']); };
try {
  ctx.初期設定();
  const keys = SS.getSheetByName('設定').data.map(r => r[0]);
  ok(['補充の割合（2回目）', '補充の割合（3回目以降）', '補充に予想が要るのは何回目から'].every(k => keys.includes(k)), '設定シートに3つの項目ができる', keys);
  const h = call('register', { nick: 'てんちょう', pass: '0000' }).token;
  users().forEach(r => { if (r[1] === 'てんちょう') r[4] = true; });
  const g = call('register', { nick: 'たろう', pass: '1111' }).token;
  const g2 = call('register', { nick: 'はなこ', pass: '2222' }).token;
  // 2026-11-03 の週を公開（締切は火曜11時）
  const names = ['麻婆豆腐', '天津飯', '餃子', '炒飯'];
  let r = call('saveWeek', { token: h, weekId: '2026-11-03', raceName: 'テスト', deadline: new RealDate(2026, 10, 3, 11, 0).toISOString(), menus: names.map((n, i) => ({ waku: i + 1, name: n })), publish: true });
  ok(r.ok, '出馬表を公開', r);

  // ---- 1回目：条件なし・満額 ----
  setAdd('たろう', -10000);
  r = call('state', { token: g });
  ok(r.me.canRefill && r.me.refill.n === 1 && r.me.refill.blocked === false && r.me.refillPt.quiz === 5000 && r.me.refillPt.review === 15000, '1回目は満額', r.me);
  ok(r.me.refillFull.quiz === 5000 && r.me.refillRule.rate2 === 0.5 && r.me.refillRule.rate3 === 0.2 && r.me.refillRule.needFrom === 2, '満額と決まりを画面に渡す', r.me);
  r = call('quizStart', { token: g }); ok(r.ok && r.pt === 5000 && r.n === 1, 'クイズは5,000pt', r);
  r = call('refill', { token: g, method: 'quiz', score: 2 }); ok(r.ok && r.pt === 5000 && r.n === 1, '1回目を受け取る', r);

  // ---- 予想せずに使い切った人：2回目はできない ----
  setAdd('たろう', addOf('たろう') - 5000);
  r = call('state', { token: g });
  ok(r.me.balance === 0 && r.me.refill.n === 2 && r.me.refill.blocked === true && r.me.refill.held === true && r.me.refill.predicted === false, '予想していないので2回目は止める', r.me.refill);
  r = call('quizStart', { token: g }); ok(!r.ok && /予想した人だけ/.test(r.error), 'クイズも始められない', r);
  r = call('refill', { token: g, method: 'quiz', score: 3 }); ok(!r.ok && /月曜/.test(r.error), '補充を送っても断る', r);
  r = call('refill', { token: g, method: 'review', answers: { understood: 'すぐ分かった', body: 'あいうえおかきくけこさしすせそたちつてと', bug: 'なかった' } });
  ok(!r.ok && /予想した人だけ/.test(r.error), 'レビューでも断る', r);
  ok(SS.getSheetByName('レビュー').data.length === 1, '断ったレビューは記録しない', SS.getSheetByName('レビュー').data.length);

  // ---- 予想した人：2回目は半分、3回目からは2割（クイズとレビューを合わせて数える） ----
  setAdd('はなこ', -10000);
  r = call('refill', { token: g2, method: 'quiz', score: 1 }); ok(r.ok && r.pt === 5000, 'はなこ1回目', r);
  r = call('predict', { token: g2, weekId: '2026-11-03', picks: { 火: 1, 水: 2, 木: 3 }, bet: 5000 }); ok(r.ok, 'はなこが予想する', r);
  r = call('state', { token: g2 });
  ok(r.me.balance === 0 && r.me.refill.n === 2 && r.me.refill.blocked === false && r.me.refillPt.quiz === 2500 && r.me.refillPt.review === 7500, '予想したので2回目は半分で受け取れる', r.me);
  r = call('refill', { token: g2, method: 'review', answers: { understood: 'すぐ分かった', body: 'あいうえおかきくけこさしすせそたちつてと', bug: 'なかった' } });
  ok(r.ok && r.pt === 7500 && r.n === 2, 'レビューも2回目として半分', r);
  setAdd('はなこ', addOf('はなこ') - 7500);
  r = call('state', { token: g2 }); ok(r.me.refill.n === 3 && r.me.refillPt.quiz === 1000, '3回目は2割', r.me);
  r = call('refill', { token: g2, method: 'quiz', score: 0 }); ok(r.ok && r.pt === 1000, '3回目を受け取る', r);
  const log = SS.getSheetByName('補充').data.slice(1).filter(x => x[2] === 'はなこ').map(x => x[3]);
  ok(log[0] === 'クイズ（1/3）' && log[1] === 'レビュー・今週2回目' && log[2] === 'クイズ（0/3）・今週3回目', '補充シートに何回目かを残す', log);
  r = call('hostState', { token: h }); ok(r.refills.some(x => x.method === 'レビュー・今週2回目' && x.pt === 7500), 'ホストの補充一覧にも出る', r.refills);

  // ---- 設定で割合を変えられる ----
  setting('補充の割合（3回目以降）', 0.3);
  setAdd('はなこ', addOf('はなこ') - 1000);
  r = call('state', { token: g2 }); ok(r.me.refill.n === 4 && r.me.refillPt.quiz === 1500 && r.me.refillPt.review === 4500, '3回目以降の割合を変えられる', r.me.refillPt);
  setting('補充の割合（3回目以降）', 'abc');
  r = call('state', { token: g2 }); ok(r.me.refillPt.quiz === 1000, 'おかしな値なら決まった値（2割）', r.me.refillPt);
  setting('補充の割合（3回目以降）', 0.2);
  setting('補充に予想が要るのは何回目から', 0);
  r = call('state', { token: g }); ok(r.me.refill.blocked === false, '0にすると予想の条件なし', r.me.refill);
  setting('補充に予想が要るのは何回目から', 3);
  r = call('state', { token: g }); ok(r.me.refill.n === 2 && r.me.refill.blocked === false, '3にすると2回目までは条件なし', r.me.refill);
  setting('補充に予想が要るのは何回目から', 2);

  // ---- 月曜に満額へ戻る ----
  NOW = new RealDate(2026, 10, 8, 23, 59).getTime(); // 日曜の夜はまだ同じ週
  r = call('state', { token: g }); ok(r.me.refill.n === 2 && r.me.refill.blocked === true, '日曜の夜はまだ同じ週', r.me.refill);
  NOW = new RealDate(2026, 10, 9, 0, 0).getTime(); // 月曜0時
  r = call('state', { token: g }); ok(r.me.refill.n === 1 && r.me.refill.blocked === false && r.me.refillPt.quiz === 5000, '月曜0時に満額へ戻る', r.me.refill);
  r = call('refill', { token: g, method: 'quiz', score: 3 }); ok(r.ok && r.pt === 5000, '新しい週の1回目', r);

  // ---- 出馬表を出していない週は、予想の条件なし（額は下がる） ----
  setAdd('たろう', addOf('たろう') - 5000);
  r = call('state', { token: g }); ok(r.me.refill.n === 2 && r.me.refill.held === false && r.me.refill.blocked === false && r.me.refillPt.quiz === 2500, '開催がない週は条件なしで半分', r.me.refill);
  // 下書きだけの週も「開催なし」
  r = call('saveWeek', { token: h, weekId: '2026-11-10', raceName: 'テスト', deadline: new RealDate(2026, 10, 10, 11, 0).toISOString(), menus: names.map((n, i) => ({ waku: i + 1, name: n })), publish: false });
  ok(r.ok, '下書きを保存', r);
  r = call('state', { token: g }); ok(r.me.refill.held === false && r.me.refill.blocked === false, '下書きは開催に数えない', r.me.refill);
  r = call('saveWeek', { token: h, weekId: '2026-11-10', raceName: 'テスト', deadline: new RealDate(2026, 10, 10, 11, 0).toISOString(), menus: names.map((n, i) => ({ waku: i + 1, name: n })), publish: true });
  r = call('state', { token: g }); ok(r.me.refill.held === true && r.me.refill.blocked === true, '公開したら予想が条件になる', r.me.refill);

  // ---- 設定シートに項目がなくても動き、補充のときに書き足す ----
  const sd = SS.getSheetByName('設定');
  sd.data = sd.data.filter(x => !String(x[0]).startsWith('補充の割合') && x[0] !== '補充に予想が要るのは何回目から');
  r = call('state', { token: g2 }); ok(r.ok && r.me.refillRule.rate2 === 0.5 && r.me.refillRule.needFrom === 2, '項目がなくても決まった値で動く', r.me.refillRule);
  setAdd('はなこ', addOf('はなこ') - 100000);
  r = call('refill', { token: g2, method: 'quiz', score: 3 }); ok(r.ok, '補充する', r);
  ok(['補充の割合（2回目）', '補充の割合（3回目以降）', '補充に予想が要るのは何回目から'].every(k => sd.data.some(x => x[0] === k)), '補充のときに設定シートへ書き足す', sd.data.map(x => x[0]));
} catch (e) { console.log('CRASH', e && e.stack || e); }
console.log('PASS ' + pass + ' FAIL ' + fail);
