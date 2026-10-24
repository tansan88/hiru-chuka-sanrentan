// まとめ読み（Sheets API）のテスト：まとめて読んでも、1枚ずつ読んでも、返ってくる中身が同じになること
process.env.TZ = 'Asia/Tokyo';
const path = require('path');
const { ctx, SS, G } = require('./emu/gas_emu.js')(path.join(__dirname, '../gas/Code.gs'));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.log('FAIL', m, x === undefined ? '' : JSON.stringify(x).slice(0, 600)); } };
const call = (action, o = {}) => { ctx.__reset(); return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ action, v: 3 }, o)) } }).content); };
const clean = r => JSON.stringify(r, (k, v) => (k === 'ms' || k === 'now' || k === 'prof') ? undefined : v);
const both = (action, o) => { G.Sheets._off = false; const c0 = G.Sheets.calls; const a = call(action, o); const used = G.Sheets.calls > c0; G.Sheets._off = true; const b = call(action, o); G.Sheets._off = false; return { a, b, used }; };
ctx.初期設定();
const h = call('register', { nick: 'てんちょう', pass: '0000' }).token;
SS.getSheetByName('参加者').data.forEach(r => { if (r[1] === 'てんちょう') r[4] = true; });
const g = call('register', { nick: '0123', pass: '1111' }).token;
const g2 = call('register', { nick: 'TRUE', pass: '2222' }).token;
let x = both('state', { token: g });
ok(x.used && x.a.ok && clean(x.a) === clean(x.b), '週がないときの state', [x.a, x.b]);
const wk = call('hostState', { token: h }).suggest;
const dl = new Date(Date.now() + 86400000); dl.setSeconds(0, 0);
call('saveWeek', { token: h, weekId: wk, raceName: '秋', mumble: '=SUM(1)', deadline: dl.toISOString(), menus: ['麻婆', '0123', 'その他'].map((n, i) => ({ waku: i + 1, name: n })), publish: true });
call('predict', { token: g, weekId: wk, picks: { 火: 1, 水: 2, 木: 3 }, bet: 500 });
call('predict', { token: g2, weekId: wk, picks: { 火: 2, 水: 2, 木: 1 }, bet: 300 });
x = both('state', { token: g });
ok(x.a.ok && clean(x.a) === clean(x.b), '受付中の state（数字の名前・数式の文字・締切の日時も同じ）', [x.a.current, x.b.current]);
ok(x.a.current.deadline === dl.toISOString(), '締切の日時が正しく戻る', [x.a.current.deadline, dl.toISOString()]);
ok(x.a.me.nick === '0123', '数字だけのニックネームは文字のまま', x.a.me.nick);
x = both('hostState', { token: h });
ok(x.a.ok && clean(x.a) === clean(x.b), 'hostState も同じ', [x.a.week, x.b.week]);
call('testCloseNow', { token: h, weekId: wk });
SS.name = '昼中華3連単（テスト）';
call('testCloseNow', { token: h, weekId: wk });
['火', '水', '木'].forEach((d, i) => call('registerDay', { token: h, weekId: wk, day: d, waku: [1, 2, 3][i], otherName: 'エビチリ' }));
call('settle', { token: h, weekId: wk });
SS.name = '昼中華3連単';
x = both('state', { token: g });
ok(x.a.ok && clean(x.a) === clean(x.b) && x.a.lastResult.marks.join() === 'hit,hit,hit', '確定後の state', [x.a.lastResult, x.b.lastResult]);
x = both('history', { token: g2 });
ok(x.a.ok && clean(x.a) === clean(x.b), 'history も同じ', [x.a, x.b]);
x = both('login', { nick: 'TRUE', pass: '2222' });
ok(x.a.ok && x.a.state && x.a.state.me.nick === 'TRUE' && clean(x.a.state) === clean(x.b.state), 'ログインの返事に state が入る（名前が TRUE でも文字のまま）', [x.a.state && x.a.state.me, x.b.state && x.b.state.me]);
// 登録した直後の state には、登録した本人がいる（まとめ読みは書き込んだシートを捨てる）
const r = call('register', { nick: 'じろう', pass: '3333' });
ok(r.ok && r.state && r.state.me.nick === 'じろう', '登録の返事の state は本人のもの', r.state && r.state.me);
// 設定を書き換えた直後に読み直しても新しい値
const s = call('saveRegulars', { token: h, names: ['天津飯', '餃子'] });
ok(s.ok && s.regulars.join() === '天津飯,餃子', '設定の書き換えのあとは新しい値', s);
// Sheets API が使えなくても動く
G.Sheets._off = true; ok(call('state', { token: g }).ok, 'Sheets API が無くても動く'); G.Sheets._off = false;
// まとめ読みは1回の問い合わせ
const c0 = G.Sheets.calls; call('state', { token: g }); ok(G.Sheets.calls - c0 === 1, 'state はまとめ読み1回', G.Sheets.calls - c0);
console.log('PASS ' + pass + ' FAIL ' + fail);
