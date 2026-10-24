// ログイン鍵の有効期限とレビューの記録のテスト（同じプロセスで動かす）
process.env.TZ = 'Asia/Tokyo';
const path = require('path');
const { ctx, SS, G } = require('./emu/gas_emu.js')(path.join(__dirname, '../gas/Code.gs'));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.log('FAIL', m, x === undefined ? '' : JSON.stringify(x)); } };
const realNow = Date.now; let shift = 0; Date.now = () => realNow() + shift;
const DAY = 86400000;
const call = (action, o = {}) => { ctx.__reset(); return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ action }, o)) } }).content); };
const props = G.PropertiesService.getScriptProperties();
ctx.初期設定();
const t0 = call('register', { nick: 'a', pass: '1111' }).token;
ok(call('state', { token: t0 }).ok, '登録直後は使える');
// 29日あいても使える → 使ったので期限が延びる
shift = 29 * DAY; ok(call('state', { token: t0 }).ok, '29日後も使える');
shift = 58 * DAY; ok(call('state', { token: t0 }).ok, '使うたびに延びる（最初から58日後）');
// 31日あくと期限切れ
shift = 89 * DAY + 1000; let r = call('state', { token: t0 });
ok(!r.ok && /もう一度ログインしてください$/.test(r.error), '31日あくと期限切れ', r);
ok(!call('history', { token: t0 }).ok, '期限切れの鍵はほかの操作でも不可');
// ログインし直すと新しい鍵
const t1 = call('login', { nick: 'a', pass: '1111' }).token;
ok(t1 && t1 !== t0 && call('state', { token: t1 }).ok, 'ログインし直すと新しい鍵で使える');
ok(!call('state', { token: t0 }).ok, '古い鍵はもう使えない');
// 期限内のログインは同じ鍵（ほかの端末をログアウトさせない）
const t2 = call('login', { nick: 'a', pass: '1111' }).token;
ok(t2 === t1, '期限内のログインは同じ鍵');
// パスワード変更で鍵が変わる
r = call('changePass', { token: t1, oldPass: '1111', newPass: '2222' });
ok(r.ok && r.token && r.token !== t1, 'パスワード変更で新しい鍵が返る', r);
ok(!call('state', { token: t1 }).ok, 'ほかの端末の古い鍵は使えなくなる');
ok(call('state', { token: r.token }).ok, '変更した端末は新しい鍵でそのまま使える');
// 書き込みは1時間に1回まで
const k = Object.keys(props._p).find(x => x.indexOf('tokenUsed_') === 0); const v1 = props.getProperty(k);
shift += 10 * 60000; call('state', { token: r.token }); ok(props.getProperty(k) === v1, '1時間以内は書き込まない');
shift += 61 * 60000; call('state', { token: r.token }); ok(props.getProperty(k) !== v1, '1時間たつと書き込む');
// 鍵のセルを消すと自動ログインが止まる
SS.getSheetByName('参加者').data.forEach(x => { if (x[1] === 'a') x[7] = ''; });
ok(!call('state', { token: r.token }).ok, '鍵のセルを消すと使えない');
// これまでの記録がない人（この更新より前に登録した人）はそのまま使える
const tb = call('register', { nick: 'b', pass: '3333' }).token;
Object.keys(props._p).filter(x => x === 'tokenUsed_' + SS.getSheetByName('参加者').data.find(y => y[1] === 'b')[0]).forEach(x => delete props._p[x]);
shift += 400 * DAY; ok(call('state', { token: tb }).ok, '記録がない人は使える（そこから30日）');
// レビューに端末を記録しない
ok(ctx.SHEETS.レビュー.indexOf('端末') < 0, 'レビューのシートに端末の列がない');
console.log('PASS ' + pass + ' FAIL ' + fail);
