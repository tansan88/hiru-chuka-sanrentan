// 画面の版のずれと、テスト環境のメールの印のテスト（同じプロセスで動かす）
process.env.TZ = 'Asia/Tokyo';
const path = require('path'), fs = require('fs'), os = require('os');
const emu = require('./emu/gas_emu.js');
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.log('FAIL', m, x === undefined ? '' : JSON.stringify(x)); } };
const mk = code => { const f = path.join(os.tmpdir(), 'code_' + process.pid + '_' + Math.random().toString(36).slice(2) + '.gs'); fs.writeFileSync(f, code); return emu(f); };
const src = fs.readFileSync(path.join(__dirname, '../gas/Code.gs'), 'utf8');
ok(/const MIN_APP_VERSION = 0;/.test(src), 'いまは版を求めない（古い画面もそのまま使える）');
const callOf = ctx => (action, o = {}) => { ctx.__reset(); return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ action }, o)) } }).content); };
// いまの設定：版を送らない古い画面でも使える
{
  const { ctx } = emu(path.join(__dirname, '../gas/Code.gs')); const call = callOf(ctx); ctx.初期設定();
  const t = call('register', { nick: 'a', pass: '1111' }).token;
  ok(call('state', { token: t }).ok, '版なしでも使える');
}
// 版を上げたとき
{
  const { ctx } = mk(src.replace('const MIN_APP_VERSION = 0;', 'const MIN_APP_VERSION = 3;')); const call = callOf(ctx); ctx.初期設定();
  let r = call('register', { nick: 'b', pass: '1111' });
  ok(!r.ok && r.reload === true && /開き直して/.test(r.error), '版なしは開き直し', r);
  r = call('register', { nick: 'b', pass: '1111', v: 2 });
  ok(!r.ok && r.reload === true, '古い版は開き直し', r);
  r = call('register', { nick: 'b', pass: '1111', v: 3 });
  ok(r.ok && r.token, '新しい版は使える', r);
  r = call('predict', { token: r.token, v: 2, weekId: 'x', picks: {}, bet: 100 });
  ok(r.reload === true, '書き込む操作も先に止まる（何も保存しない）', r);
  ok(call('clientError', { msg: 'テスト' }).ok, '画面のエラー報告は版に関係なく受け付ける');
}
// テスト用スプレッドシートからのメールには印
{
  const { ctx, SS, G } = emu(path.join(__dirname, '../gas/Code.gs')); const call = callOf(ctx); ctx.初期設定();
  const t = call('register', { nick: 'c', pass: '1111' }).token;
  const m0 = G.MailApp.sent.length;
  call('contact', { token: t, kind: '質問', body: '本番からの問い合わせ' });
  ok(G.MailApp.sent[m0] && G.MailApp.sent[m0].subject.indexOf('【昼中華3連単】') === 0, '本番は印なし', G.MailApp.sent[m0]);
  SS.name = '昼中華3連単（テスト）';
  call('contact', { token: t, kind: '質問', body: 'テストからの問い合わせ' });
  ok(G.MailApp.sent[m0 + 1] && G.MailApp.sent[m0 + 1].subject.indexOf('［テスト環境］【昼中華3連単】') === 0, 'テストは印あり', G.MailApp.sent[m0 + 1]);
}
console.log('PASS ' + pass + ' FAIL ' + fail);
