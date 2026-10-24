// エラーの記録と通知のテスト（模擬サーバーを使わず、同じプロセスで動かす）
process.env.TZ = 'Asia/Tokyo';
const path = require('path');
const { ctx, SS, G } = require('./emu/gas_emu.js')(path.join(__dirname, '../gas/Code.gs'));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.log('FAIL', m, x === undefined ? '' : JSON.stringify(x)); } };
const call = (action, o = {}) => { ctx.__reset(); return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ action }, o)) } }).content); };
const rows = () => (SS.getSheetByName('エラー') ? SS.getSheetByName('エラー').data.slice(1) : []);
const props = G.PropertiesService.getScriptProperties();
ctx.初期設定();
const tok = call('register', { nick: 'g', pass: '1111' }).token;
// 想定どおりのエラー（入力のまちがい）は記録しない
call('login', { nick: 'g', pass: '0000' });
ok(rows().length === 0, '入力のまちがいは記録しない', rows());
// 想定外のエラーを起こす
const orig = SS.getSheetByName;
const breakWeek = on => { SS.getSheetByName = on ? function (n) { if (n === '週') throw new Error('こわれた'); return orig.call(SS, n); } : orig; };
breakWeek(true);
let r = call('state', { token: tok });
ok(!r.ok && /サーバーでエラー/.test(r.error), '画面には一般的なメッセージ', r);
ok(rows().length === 1 && rows()[0][1] === 'サーバー' && rows()[0][2] === 'state' && rows()[0][3] === 'こわれた', 'エラーシートに記録', rows());
ok(G.MailApp.sent.length === 1 && G.MailApp.sent[0].to === 'owner@example.com' && /こわれた/.test(G.MailApp.sent[0].body), 'オーナーにメール', G.MailApp.sent);
// 1時間以内の2回目はメールしない
call('state', { token: tok });
ok(rows().length === 2 && G.MailApp.sent.length === 1 && props.getProperty('suppressedErrors') === '1', '1時間に1通まで', [rows().length, G.MailApp.sent.length]);
// 1時間たったら、まとめた件数つきでメール
props.setProperty('lastErrorMail', String(Date.now() - 3601000));
call('state', { token: tok });
ok(G.MailApp.sent.length === 2 && /前回のメールのあとに起きたエラー：1件/.test(G.MailApp.sent[1].body), '件数つきでメール', G.MailApp.sent[1] && G.MailApp.sent[1].body);
// 宛先を設定で変えられる
SS.getSheetByName('設定').data.forEach(x => { if (x[0] === 'エラー通知先') x[1] = 'host@example.com'; });
props.setProperty('lastErrorMail', '0');
call('state', { token: tok });
ok(G.MailApp.sent[2] && G.MailApp.sent[2].to === 'host@example.com', '宛先の設定', G.MailApp.sent[2]);
// メールが送れなくても、画面への返事とシートの記録は続く
G.MailApp.fail = true; props.setProperty('lastErrorMail', '0');
const before = rows().length;
r = call('state', { token: tok });
ok(!r.ok && /サーバーでエラー/.test(r.error) && rows().length === before + 1, 'メール失敗でも止まらない', r);
G.MailApp.fail = false; breakWeek(false);
// 画面のエラー
const n0 = rows().length;
r = call('clientError', { msg: 'TypeError: x is undefined', detail: 'app.js:10:5', page: 'https://example/', ua: 'iPhone', where: 'error' });
ok(r.ok && rows().length === n0 + 1 && rows()[n0][1] === '画面' && rows()[n0][3] === 'TypeError: x is undefined' && /iPhone/.test(rows()[n0][4]), '画面のエラーを記録', rows()[n0]);
call('clientError', { msg: 'Script error.' });
call('clientError', { msg: 'ResizeObserver loop limit exceeded' });
call('clientError', { msg: '' });
ok(rows().length === n0 + 1, '意味のないエラーは記録しない', rows().length - n0);
call('clientError', { msg: 'あ'.repeat(1000), detail: 'い'.repeat(5000) });
const last = rows()[rows().length - 1];
ok(last[3].length === 300 && last[4].length <= 3000, '長さの上限', [last[3].length, last[4].length]);
for (let i = 0; i < 40; i++) call('clientError', { msg: 'エラー' + i });
ok(rows().length === n0 + 30, '10分に30件まで', rows().length - n0);
// =で始まる内容も文字のまま
props.setProperty('clientErrorCount', '0');
call('clientError', { msg: '=IMPORTXML("http://x","//a")' });
ok(rows()[rows().length - 1][3] === '=IMPORTXML("http://x","//a")', '数式にならない', rows()[rows().length - 1][3]);
// 通知のテストは1時間以内でも送る
const m0 = G.MailApp.sent.length; props.setProperty('lastErrorMail', String(Date.now()));
ctx.エラー通知のテスト();
ok(G.MailApp.sent.length === m0 + 1 && /テスト/.test(G.MailApp.sent[m0].body), 'テストのメール', G.MailApp.sent.length - m0);
// 定期バックアップの失敗も記録
const gf = G.DriveApp.getFileById; G.DriveApp.getFileById = () => { throw new Error('ドライブがいっぱい'); };
let thrown = false; try { ctx.定期バックアップ(); } catch (e) { thrown = true; }
G.DriveApp.getFileById = gf;
ok(thrown && rows().some(x => x[1] === 'バックアップ' && x[3] === 'ドライブがいっぱい'), 'バックアップの失敗を記録', rows().filter(x => x[1] === 'バックアップ'));
// 通常の操作は影響なし
r = call('state', { token: tok });
ok(r.ok, '通常の操作', r);
console.log('PASS', pass, 'FAIL', fail);
