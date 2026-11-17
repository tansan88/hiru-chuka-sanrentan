// 出馬表公開の通知（PWAのプッシュ通知）のテスト（同じプロセスで動かす）
// 送り主の証明（VAPID の ES256 署名）が正しいかは、Node の crypto で検証する
process.env.TZ = 'Asia/Tokyo';
const path = require('path');
const crypto = require('crypto');
const { ctx, SS, G } = require('./emu/gas_emu.js')(path.join(__dirname, '../gas/Code.gs'));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.log('FAIL', m, x === undefined ? '' : JSON.stringify(x)); } };
const call = (action, o = {}) => { ctx.__reset(); return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ action, v: 3 }, o)) } }).content); };
const b64u = s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
ctx.初期設定();
const h = call('register', { nick: 'てんちょう', pass: '0000' }).token;
SS.getSheetByName('参加者').data.forEach(r => { if (r[1] === 'てんちょう') r[4] = true; });
const g = call('register', { nick: 'たろう', pass: '1111' }).token;

// ---- 鍵と署名 ----
ok(!call('pushKey', {}).ok, 'ログインなしは鍵を出さない');
let r = call('pushKey', { token: g });
const pub = r.key;
ok(r.ok && /^[A-Za-z0-9_-]{87}$/.test(pub) && b64u(pub).length === 65 && b64u(pub)[0] === 4, '公開鍵は65バイトの生の形（base64url・= なし）', r);
ok(call('pushKey', { token: g }).key === pub, '鍵は一度作ったら同じ');
const raw = b64u(pub);
const key = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: raw.slice(1, 33).toString('base64url'), y: raw.slice(33).toString('base64url') }, format: 'jwk' });
const jwt = ctx.vapidJwt_('https://web.push.apple.com', ctx.vapidKeys_());
const [hd, pl, sg] = jwt.split('.');
ok(!/=/.test(jwt), 'JWT に = が入らない', jwt);
ok(JSON.parse(b64u(hd)).alg === 'ES256', 'ヘッダーは ES256');
const pj = JSON.parse(b64u(pl));
ok(pj.aud === 'https://web.push.apple.com' && pj.exp - Date.now() / 1000 > 3600 * 11 && pj.exp - Date.now() / 1000 <= 3600 * 12 && /^https:\/\//.test(pj.sub), '中身（aud・期限12時間・sub）', pj);
ok(b64u(sg).length === 64, '署名は64バイト（r と s を32バイトずつ）');
ok(crypto.verify('sha256', Buffer.from(hd + '.' + pl), { key, dsaEncoding: 'ieee-p1363' }, b64u(sg)), '署名が公開鍵で検証できる');
// いろいろな文で署名しても検証できる（r・s の先頭が0になる場合も含めて）
let allOk = true;
for (let i = 0; i < 40; i++) { const m = 'msg' + i + 'x'.repeat(i); const s = Buffer.from(ctx.es256Sign_([...Buffer.from(m)], ctx.vapidKeys_().d)); if (!crypto.verify('sha256', Buffer.from(m), { key, dsaEncoding: 'ieee-p1363' }, s)) allOk = false; }
ok(allOk, '40通りの文で署名を検証できる');

// ---- 送り先の登録 ----
const ep = 'https://web.push.apple.com/QGuQyavXutnMH8Ty1';
const sub = { endpoint: ep, keys: { p256dh: 'B' + 'a'.repeat(86), auth: 'abcdEFGH1234_-xy' } };
ok(!call('pushSubscribe', { sub }).ok, 'ログインなしは登録できない');
ok(/送り先/.test(call('pushSubscribe', { token: g, sub: { endpoint: 'https://evil.example.com/x', keys: sub.keys } }).error), '知らない送り先は断る');
ok(!call('pushSubscribe', { token: g, sub: { endpoint: ep, keys: { p256dh: 'x', auth: 'y' } } }).ok, '鍵の形が違うと断る');
r = call('pushSubscribe', { token: g, sub });
const rows = () => (SS.getSheetByName('通知') ? SS.getSheetByName('通知').data.slice(1).filter(x => x[0] !== '' && x[0] !== undefined) : []);
ok(r.ok && rows().length === 1 && rows()[0][2] === 'たろう' && rows()[0][3] === ep, '登録できる', rows());
ok(call('pushSubscribe', { token: g, sub }).ok && rows().length === 1, '同じ送り先は1行のまま');
ok(call('pushSubscribe', { token: h, sub: { endpoint: 'https://web.push.apple.com/HOST1', keys: sub.keys } }).ok && rows().length === 2, '別の人も登録できる');

// ---- 試しに送る ----
G.UrlFetchApp.calls.length = 0;
r = call('pushTest', { token: g, endpoint: ep });
const req = G.UrlFetchApp.calls[0] && G.UrlFetchApp.calls[0][0];
ok(r.ok && r.sent === 1 && G.UrlFetchApp.calls[0].length === 1 && req.url === ep, '自分の端末にだけ送る', r);
ok(req && req.method === 'post' && req.payload === '' && req.headers.TTL && /^vapid t=[^,]+, k=/.test(req.headers.Authorization) && req.headers.Authorization.endsWith('k=' + pub), '送る形（本文なし・vapid t=…, k=…）', req && req.headers);
call('pushTest', { token: g, endpoint: ep }); call('pushTest', { token: g, endpoint: ep });
ok(/10分に3回/.test(call('pushTest', { token: g, endpoint: ep }).error), '試しに送るのは10分に3回まで');

// ---- 出馬表を公開したら送る（週1回まで） ----
const wk = call('hostState', { token: h }).suggest;
const dl = new Date(Date.now() + 3 * 864e5);
const menus = ['麻婆豆腐', '天津飯', '餃子'].map((name, i) => ({ waku: i + 1, name }));
const save = publish => call('saveWeek', { token: h, weekId: wk, raceName: '昼中華ステークス', deadline: dl.toISOString(), menus, publish });
G.UrlFetchApp.calls.length = 0;
ok(save(false).ok && G.UrlFetchApp.calls.length === 0, '下書き保存では送らない');
r = save(true);
ok(r.ok && G.UrlFetchApp.calls.length === 1 && G.UrlFetchApp.calls[0].length === 2, '公開したら登録した全員に送る', G.UrlFetchApp.calls.length);
ok(save(true).ok && G.UrlFetchApp.calls.length === 1, '公開し直しても二重に送らない');
ok(SS.getSheetByName('ログ').data.some(x => x[3] === '通知' && /2件送信/.test(x[4])), 'ログに記録');

// ---- 届かなくなった送り先は消す・失敗はエラーに残す ----
G.UrlFetchApp._code = q => (q.url === ep ? 410 : 500);
ok(!call('pushTest', { token: h }).ok, '送れなかったら知らせる');
ok(rows().length === 2, '500 の送り先は消さない');
SS.getSheetByName('エラー').data.some(x => /通知を送れなかった/.test(x[3])) ? pass++ : (fail++, console.log('FAIL 失敗はエラーシートに残す'));
Object.keys(G.PropertiesService.getScriptProperties()._p).filter(k => /^pushTest_/.test(k)).forEach(k => G.PropertiesService.getScriptProperties().deleteProperty(k));
r = call('pushTest', { token: g, endpoint: ep });
ok(!r.ok && rows().length === 1 && rows()[0][3] !== ep, '410 の送り先は消す', rows());
G.UrlFetchApp._code = 201;
// 送り先が壊れていても公開は止まらない
G.UrlFetchApp.fetchAll = () => { throw new Error('ネットワークの不調'); };
const wk2 = '2099-01-06';
r = call('saveWeek', { token: h, weekId: wk2, raceName: '昼中華ステークス', deadline: '2099-01-06T11:00:00+09:00', menus, publish: true });
ok(r.ok, '送信でエラーが起きても公開はできる', r);

// ---- やめる ----
ok(call('pushUnsubscribe', { token: h, sub: { endpoint: 'https://web.push.apple.com/HOST1' } }).ok && rows().length === 0, 'やめると送り先を消す');
console.log(`PASS ${pass} FAIL ${fail}`);
