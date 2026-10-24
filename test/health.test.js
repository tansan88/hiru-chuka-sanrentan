// 外からの見張り用の ?check=health のテスト（同じプロセスで動かす）
process.env.TZ = 'Asia/Tokyo';
const path = require('path');
const { ctx, SS, G } = require('./emu/gas_emu.js')(path.join(__dirname, '../gas/Code.gs'));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.log('FAIL', m, x === undefined ? '' : JSON.stringify(x)); } };
const health = () => { ctx.__reset(); return JSON.parse(ctx.doGet({ parameter: { check: 'health' } }).content); };
ctx.初期設定();
// ふつうの doGet は今までどおり
ctx.__reset(); let r = JSON.parse(ctx.doGet({ parameter: {} }).content);
ok(r.ok && r.app === '昼中華3連単' && r.lastBackupAt === undefined, 'ふつうの doGet は今までどおり', r);
ctx.__reset(); r = JSON.parse(ctx.doGet().content); ok(r.ok, '引数なしでも動く', r);
// まだバックアップも予約も無い
r = health();
ok(r.ok && r.lastBackupAt === null && r.backupTrigger === false && r.test === false, '何も無いとき', r);
// 設定すると予約と最新の日時が出る
ctx.バックアップを設定する();
r = health();
ok(r.backupTrigger === true && r.lastBackupAt && Math.abs(new Date(r.lastBackupAt) - Date.now()) < 60000, '予約と日時が出る', r);
const first = r.lastBackupAt;
ctx.バックアップを取る();
r = health();
ok(new Date(r.lastBackupAt) > new Date(first), '新しいバックアップの日時になる', [first, r.lastBackupAt]);
// ゴミ箱に入ったものは数えない
const fl = Object.values(G.DriveApp._folders)[1] || Object.values(G.DriveApp._folders).find(f => f.files.length);
fl.files.forEach(f => f.setTrashed(true));
ok(health().lastBackupAt === null, 'ゴミ箱のものは数えない');
// 予約が消えたら false
G.ScriptApp._t.splice(0);
ok(health().backupTrigger === false, '予約が消えたら false');
// テスト環境の印
SS.name = '昼中華3連単（テスト）';
ok(health().test === true, 'テスト環境なら test: true');
// 個人の情報は出さない
const s = JSON.stringify(health());
ok(!/token|pass|ソルト|nick/i.test(s), '個人の情報は含まない', s);
console.log('PASS ' + pass + ' FAIL ' + fail);
