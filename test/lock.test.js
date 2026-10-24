// パスワードの回数ロックのテスト（模擬サーバーを使わず、同じプロセスで動かす）
process.env.TZ = 'Asia/Tokyo';
const path = require('path');
const { ctx, SS, G } = require('./emu/gas_emu.js')(path.join(__dirname, '../gas/Code.gs'));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.log('FAIL', m, x === undefined ? '' : JSON.stringify(x)); } };
const realNow = Date.now; let shift = 0; Date.now = () => realNow() + shift;
const call = (action, o = {}) => { ctx.__reset(); return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ action }, o)) } }).content); };
const login = (nick, pass) => call('login', { nick, pass });
ctx.初期設定();
call('register', { nick: 'a', pass: '1111' });
call('register', { nick: 'b', pass: '2222' });
// 1〜2回目：ふつうのメッセージ
let r = login('a', '0000'); ok(!r.ok && r.error === 'ニックネームかパスワードがちがいます', '1回目', r);
r = login('a', '0000'); ok(!r.ok && r.error === 'ニックネームかパスワードがちがいます', '2回目', r);
// 3〜4回目：残りの回数を知らせる
r = login('a', '0000'); ok(/あと2回/.test(r.error), '3回目は残り2回', r);
r = login('a', '0000'); ok(/あと1回/.test(r.error), '4回目は残り1回', r);
// 5回目でロック
r = login('a', '0000'); ok(!r.ok && /15分間ログインできません/.test(r.error), '5回目でロック', r);
// ロック中は正しいパスワードでも入れない
r = login('a', '1111'); ok(!r.ok && /あと15分/.test(r.error), 'ロック中は正しくても不可', r);
// ほかの人には影響しない
ok(login('b', '2222').ok, 'ほかの人はログインできる');
// ログに記録
ok(SS.getSheetByName('ログ').data.some(x => x[3] === 'ログインロック'), 'ログに記録');
// 10分後：あと5分
shift = 10 * 60000; r = login('a', '1111'); ok(!r.ok && /あと5分/.test(r.error), '10分後はあと5分', r);
// 15分後：入れる
shift = 15 * 60000 + 1000; r = login('a', '1111'); ok(r.ok && r.token, '15分後はログインできる', r);
// 成功で回数が0に戻る
login('a', '0000'); login('a', '0000'); login('a', '0000'); ok(login('a', '1111').ok, '3回まちがえても成功すれば入れる');
r = login('a', '0000'); ok(r.error === 'ニックネームかパスワードがちがいます', '成功で回数が0に戻る', r);
// 最後のまちがいから15分たつと回数が0に戻る
login('a', '0000'); login('a', '0000'); login('a', '0000'); // 計4回
shift += 16 * 60000;
r = login('a', '0000'); ok(r.error === 'ニックネームかパスワードがちがいます', '15分あくと回数が0に戻る', r);
// 解除の関数
for (let i = 0; i < 5; i++) login('b', '0000');
ok(!login('b', '2222').ok, 'bがロック');
ctx.ログインロックを解除する();
ok(login('b', '2222').ok, '解除の関数でログインできる');
ok(!Object.keys(G.PropertiesService.getScriptProperties()._p).some(k => /^loginFail_/.test(k)), '記録がすべて消える');
// 存在しないニックネームは記録を作らない
for (let i = 0; i < 6; i++) login('いない人', '0000');
r = login('いない人', '0000'); ok(r.error === 'ニックネームかパスワードがちがいます', '存在しないニックネームは同じメッセージ', r);
ok(!Object.keys(G.PropertiesService.getScriptProperties()._p).some(k => /^loginFail_/.test(k)), '存在しないニックネームは記録しない');
// 想定外のエラーとして扱わない（エラーシート・メールなし）
const es = SS.getSheetByName('エラー'); ok((!es || es.data.length <= 1) && G.MailApp.sent.length === 0, 'エラー通知は出ない', [es && es.data, G.MailApp.sent]);
console.log('PASS ' + pass + ' FAIL ' + fail);
