// 問い合わせのテスト（同じプロセスで動かす）
process.env.TZ = 'Asia/Tokyo';
const path = require('path');
const { ctx, SS, G } = require('./emu/gas_emu.js')(path.join(__dirname, '../gas/Code.gs'));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.log('FAIL', m, x === undefined ? '' : JSON.stringify(x)); } };
const realNow = Date.now; let shift = 0; Date.now = () => realNow() + shift;
const call = (action, o = {}) => { ctx.__reset(); return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ action }, o)) } }).content); };
const rows = () => (SS.getSheetByName('問い合わせ') ? SS.getSheetByName('問い合わせ').data.slice(1) : []);
ctx.初期設定();
const t = call('register', { nick: 'たろう', pass: '1111' }).token;
// ログインしていないと送れない
ok(!call('contact', { kind: '不具合', body: '写真が出ません' }).ok, 'ログインなしは不可');
// 入力のチェック
ok(/種類/.test(call('contact', { token: t, kind: 'なにか', body: '写真が出ません' }).error), '種類が決まったものだけ');
ok(/5文字/.test(call('contact', { token: t, kind: '不具合', body: ' あい ' }).error), '5文字未満は不可');
ok(/1000文字/.test(call('contact', { token: t, kind: '不具合', body: 'あ'.repeat(1001) }).error), '1000文字超は不可');
ok(rows().length === 0 && G.MailApp.sent.length === 0, '不正な入力は記録もメールもしない', rows());
// 正しく送れる
let r = call('contact', { token: t, kind: '質問', body: '=1+1 締切は何時ですか？' });
ok(r.ok, '送信できる', r);
ok(rows().length === 1 && rows()[0][2] === 'たろう' && rows()[0][3] === '質問' && rows()[0][4] === '=1+1 締切は何時ですか？', 'シートに文字のまま記録', rows());
const m = G.MailApp.sent[0];
ok(m && m.to === 'owner@example.com' && /問い合わせ（質問）たろうさん/.test(m.subject) && /締切は何時ですか/.test(m.body), 'オーナーにメール', m);
ok(SS.getSheetByName('ログ').data.some(x => x[3] === '問い合わせ'), 'ログに記録');
// 宛先はエラー通知先の設定に従う
SS.getSheetByName('設定').data.forEach(x => { if (x[0] === 'エラー通知先') x[1] = 'host@example.com'; });
call('contact', { token: t, kind: '要望', body: 'ランキングがほしいです' });
ok(G.MailApp.sent[1] && G.MailApp.sent[1].to === 'host@example.com', '宛先はエラー通知先', G.MailApp.sent[1]);
// 1時間に5件まで
for (let i = 0; i < 3; i++) call('contact', { token: t, kind: 'その他', body: 'テストです' + i });
r = call('contact', { token: t, kind: 'その他', body: '6件目です' });
ok(!r.ok && /1時間に5件/.test(r.error) && rows().length === 5, '1時間に5件まで', r);
shift = 61 * 60000;
ok(call('contact', { token: t, kind: 'その他', body: '1時間後です' }).ok, '1時間たてば送れる');
// メールが送れなくても記録は残り、エラーシートに残る
G.MailApp.fail = true;
r = call('contact', { token: t, kind: '不具合', body: 'メールが送れない場合' });
G.MailApp.fail = false;
const es = SS.getSheetByName('エラー');
ok(r.ok && rows().length === 7 && es && es.data.some(x => /問い合わせのメール/.test(x[3])), 'メール失敗でも記録してエラーに残す', r);
console.log('PASS ' + pass + ' FAIL ' + fail);
