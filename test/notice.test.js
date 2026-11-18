// お知らせ掲示板のテスト（同じプロセスで動かす）
process.env.TZ = 'Asia/Tokyo';
const path = require('path');
const { ctx, SS } = require('./emu/gas_emu.js')(path.join(__dirname, '../gas/Code.gs'));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.log('FAIL', m, x === undefined ? '' : JSON.stringify(x)); } };
const call = (action, o = {}) => { ctx.__reset(); return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ action, v: 3 }, o)) } }).content); };
const ymd = d => { const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const day = n => ymd(new Date(Date.now() + n * 864e5));
ctx.初期設定();
const a = call('register', { nick: 'たろう', pass: '1111' }).token;
const b = call('register', { nick: 'はなこ', pass: '2222' }).token;

// お知らせが無いとき
let r = call('state', { token: a });
ok(r.ok && !r.notice, 'お知らせが無ければ出さない', r.notice);
r = call('notices', { token: a });
ok(r.ok && r.list.length === 0, '一覧は空');
ok(!call('notices', {}).ok, 'ログインなしは見られない');

// シートに行を足すと出る（日付が新しいものが最新。先の日付は出さない）
const sh = () => SS.getSheetByName('お知らせ') || (call('noticeRead', { token: a, key: 'x' }), ctx.__reset(), SS.getSheetByName('お知らせ'));
let ns = SS.getSheetByName('お知らせ');
if (!ns) { ns = SS.insertSheet('お知らせ'); ns.appendRow(['日付', '見出し', '本文']); }
ns.appendRow([day(-3), 'ホーム画面に追加できるようになりました', '共有ボタンから\n追加できます']);
ns.appendRow([day(-1), '通知が使えるようになりました', 'メニューの「通知」から']);
ns.appendRow([day(2), 'まだ出さないお知らせ', '先の日付']);
ns.appendRow([day(-2), '', '見出しが無い行は出さない']);
r = call('notices', { token: a });
ok(r.list.length === 2 && r.list[0].title === '通知が使えるようになりました' && r.list[1].title === 'ホーム画面に追加できるようになりました', '新しい順・先の日付と見出しなしは出さない', r.list);
ok(r.list[0].date === day(-1) && /^[0-9a-f]{12}$/.test(r.list[0].key) && r.list[0].body === 'メニューの「通知」から', '日付・鍵・本文', r.list[0]);
const key = r.list[0].key;

// ログインしたら最新の1件だけ。読んだら出ない。人ごと
r = call('state', { token: a });
ok(r.notice && r.notice.key === key, 'まだ読んでいない最新の1件を出す', r.notice);
ok(call('noticeRead', { token: a, key }).ok, '既読にできる');
ok(!call('state', { token: a }).notice, '読んだら出さない');
ok(call('state', { token: b }).notice && call('state', { token: b }).notice.key === key, 'ほかの人には出る');
ok(SS.getSheetByName('お知らせ既読').data.filter(x => x[0] !== '参加者ID' && x[0] !== '').length === 1, '既読は1人1行');
call('noticeRead', { token: a, key });
ok(SS.getSheetByName('お知らせ既読').data.filter(x => x[0] !== '参加者ID' && x[0] !== '').length === 1, '同じ人はふえない');
ok(call('noticeRead', { token: a, key: 'unknown' }).ok && !call('state', { token: a }).notice, '知らない鍵は無視する');

// 行の並びを変えても既読はずれない／新しいお知らせを足したらまた出る
const rows = ns.data.slice(1); ns.data = [ns.data[0]].concat(rows.reverse());
ok(!call('state', { token: a }).notice, '並べ替えても既読のまま');
ns.appendRow([day(0), 'お知らせ掲示板ができました', '', 'アップデート']);
r = call('state', { token: a });
ok(r.notice && r.notice.title === 'お知らせ掲示板ができました' && r.notice.kind === 'アップデート', '新しいものを足すとまた出る（種類つき）', r.notice);
ok(call('notices', { token: b }).list.find(n => n.title === '通知が使えるようになりました').kind === '', '種類が空なら空', null);
console.log(`PASS ${pass} FAIL ${fail}`);
