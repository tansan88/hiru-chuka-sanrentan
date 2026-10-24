// ホストの便利機能のテスト（同じプロセスで動かす）
// いつものメニュー／「その他」の料理名／テスト環境だけの「締切を今にする」／スクショの読み取り
process.env.TZ = 'Asia/Tokyo';
const path = require('path');
const { ctx, SS, G, files } = require('./emu/gas_emu.js')(path.join(__dirname, '../gas/Code.gs'));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.log('FAIL', m, x === undefined ? '' : JSON.stringify(x)); } };
const call = (action, o = {}) => { ctx.__reset(); return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ action, v: 3 }, o)) } }).content); };
ctx.初期設定();
const h = call('register', { nick: 'てんちょう', pass: '0000' }).token;
SS.getSheetByName('参加者').data.forEach(r => { if (r[1] === 'てんちょう') r[4] = true; });
const g = call('register', { nick: 'たろう', pass: '1111' }).token;

// ---- いつものメニュー ----
let r = call('hostState', { token: h });
ok(r.ok && Array.isArray(r.regulars) && r.regulars.join('') === '', '最初は空', r.regulars);
ok(r.test === false, '本番では test: false', r.test);
r = call('saveRegulars', { token: g, names: ['天津飯', '餃子'] });
ok(!r.ok && /ホストだけ/.test(r.error), 'ゲストは変えられない', r);
r = call('saveRegulars', { token: h, names: ['天津飯', '=1+1'] });
ok(r.ok && r.regulars[0] === '天津飯' && r.regulars[1] === '=1+1', '保存できる（数式にならない）', r);
r = call('hostState', { token: h });
ok(r.regulars[0] === '天津飯' && r.regulars[1] === '=1+1', '読み直しても残る', r.regulars);
ok(!call('saveRegulars', { token: h, names: ['その他', ''] }).ok, '「その他」はいつものメニューにできない');
ok(!call('saveRegulars', { token: h, names: ['あ'.repeat(31)] }).ok, '31文字はだめ');
r = call('saveRegulars', { token: h, names: ['天津飯', ''] });
ok(r.ok && r.regulars[1] === '', '片方だけ空にできる', r);

// ---- 週を作る（8番が「その他」） ----
const wk = call('hostState', { token: h }).suggest;
const names = ['豚肉とナスのピリ辛', 'ニラと玉子の炒め', '麻婆豆腐', '麻婆チャーハン', '麻辣鶏ラーメンとミニからげ丼', '天津飯', '餃子', 'その他'];
const dl = new Date(Date.now() + 86400000);
r = call('saveWeek', { token: h, weekId: wk, raceName: 'テスト', deadline: dl.toISOString(), menus: names.map((n, i) => ({ waku: i + 1, name: n })), publish: true });
ok(r.ok, '出馬表を公開', r);
r = call('state', { token: g });
ok(r.current && r.current.menus.find(m => m.waku === 8).odds === 16, '8品なら「その他」は16倍', r.current && r.current.menus.map(m => m.odds));
ok(call('predict', { token: g, weekId: wk, picks: { 火: 8, 水: 1, 木: 3 }, bet: 300 }).ok, '「その他」も予想できる');

// ---- テスト環境だけの「締切を今にする」 ----
r = call('testCloseNow', { token: h, weekId: wk });
ok(!r.ok && /テスト環境だけ/.test(r.error), '本番では使えない', r);
r = call('registerDay', { token: h, weekId: wk, day: '火', waku: 1 });
ok(!r.ok && /締切のあと/.test(r.error), '締切前は登録できない', r);
SS.name = '昼中華3連単（テスト）';
ok(call('hostState', { token: h }).test === true, 'テスト環境なら test: true');
ok(!call('testCloseNow', { token: g, weekId: wk }).ok, 'ゲストは使えない');
ok(!call('testCloseNow', { token: h, weekId: '2020-01-07' }).ok, '無い週はだめ');
r = call('testCloseNow', { token: h, weekId: wk });
ok(r.ok, 'テスト環境では締切を今にできる', r);
r = call('hostState', { token: h });
ok(r.week && r.week.closed === true, '締切を過ぎた扱いになる', r.week && r.week.deadline);
ok(!call('predict', { token: g, weekId: wk, picks: { 火: 1, 水: 1, 木: 1 }, bet: 100 }).ok, '締切後は予想できない');

// ---- 「その他」は料理名を入れる ----
r = call('registerDay', { token: h, weekId: wk, day: '火', waku: 8 });
ok(!r.ok && /料理名/.test(r.error), '「その他」で料理名なしはだめ', r);
r = call('registerDay', { token: h, weekId: wk, day: '火', waku: 8, otherName: 'あ'.repeat(31) });
ok(!r.ok, '31文字はだめ', r);
r = call('registerDay', { token: h, weekId: wk, day: '火', waku: 8, otherName: 'エビチリ', photo: { mime: 'image/jpeg', data: Buffer.from('jpg').toString('base64') } });
ok(r.ok, '「その他」＋料理名＋写真で登録できる', r);
r = call('registerDay', { token: h, weekId: wk, day: '水', waku: 1, otherName: '無視される' });
ok(r.ok, 'ふつうの品は料理名を無視', r);
r = call('hostState', { token: h });
ok(r.week.results.火.name === 'エビチリ' && r.week.results.火.other === true && r.week.results.火.waku === 8 && /thumbnail/.test(r.week.results.火.photo), '火は「エビチリ」（その他）', r.week.results.火);
ok(r.week.results.水.name === '豚肉とナスのピリ辛' && r.week.results.水.other === false, '水はメニュー名のまま', r.week.results.水);
ok(call('registerDay', { token: h, weekId: wk, day: '木', waku: 3 }).ok, '木');
r = call('settle', { token: h, weekId: wk });
ok(r.ok && r.status === '確定', '確定できる', r);
r = call('state', { token: g });
ok(r.lastResult && r.lastResult.marks.join() === 'hit,hit,hit', '「その他」で当たりになる', r.lastResult && r.lastResult.marks);
ok(r.lastResult.results.火.name === 'エビチリ', '結果にも料理名が出る', r.lastResult.results.火);

// ---- スクショの読み取り ----
const AIR = [
  'ポイント最大10%還元', 'ランチ', 'ランチ', '1.豚肉とナスのピリ辛', '¥1,000', '2.ニラと玉子の炒め', '¥1,000',
  '3. 麻婆豆腐', '¥1,000', '４．麻婆チャーハン', '¥1,000', '5.麻辣鶏ラーメンとミニからげ丼 ¥1,000', '一品料理', '6.餃子', '¥500',
].join('\n');
ok(JSON.stringify(ctx.parseMenuText_(AIR)) === JSON.stringify(['豚肉とナスのピリ辛', 'ニラと玉子の炒め', '麻婆豆腐', '麻婆チャーハン', '麻辣鶏ラーメンとミニからげ丼']), 'エアレジの文字から5品を拾う', ctx.parseMenuText_(AIR));
ok(ctx.parseMenuText_('1.麻婆 豆腐\r\n2) 油淋鶏 900円\n2.二つめは無視').join('|') === '麻婆豆腐|油淋鶏|||', 'すき間・値段・重複を整える', ctx.parseMenuText_('1.麻婆 豆腐\r\n2) 油淋鶏 900円\n2.二つめは無視'));
ok(ctx.parseMenuText_('ランチ\n¥1,000').join('') === '', '番号がなければ何も拾わない');
const img = { mime: 'image/jpeg', data: Buffer.from('fake').toString('base64') };
ok(!call('readMenu', { token: g, image: img }).ok, 'ゲストは使えない');
ok(!call('readMenu', { token: h }).ok, '画像なしはだめ');
G.Drive._text = AIR; G.DriveApp.trashed.length = 0;
r = call('readMenu', { token: h, image: img });
ok(r.ok && r.found === 5 && r.names[4] === '麻辣鶏ラーメンとミニからげ丼', '読み取れる', r);
ok(G.Drive._last.opt.ocrLanguage === 'ja' && G.Drive._last.meta.mimeType === 'application/vnd.google-apps.document', '日本語の文字認識で読む', G.Drive._last);
ok(G.DriveApp.trashed.length === 1, '読み取りに使ったファイルはゴミ箱へ', G.DriveApp.trashed);
const errs = () => SS.getSheetByName('エラー').data.length;
const e0 = errs();
G.Drive._fail = 'Drive API has not been used'; G.DriveApp.trashed.length = 0;
r = call('readMenu', { token: h, image: img });
ok(!r.ok && /手で入れて/.test(r.error), '失敗したら手で入れてもらう', r);
ok(errs() === e0 + 1, '失敗はエラーシートに残る');
G.Drive._fail = null; G.Drive._text = '   ';
r = call('readMenu', { token: h, image: img });
ok(!r.ok && G.DriveApp.trashed.length === 1, '文字が空でもファイルは片付ける', [r, G.DriveApp.trashed]);
G.Drive._text = 'ランチ\n¥1,000';
r = call('readMenu', { token: h, image: img });
ok(r.ok && r.found === 0, '番号がない画像は0品', r);
// 本物の Drive は「コード 200 のエラー」で、化けた文字を返してくる
G.Drive._text = AIR; G.Drive._as200 = true;
r = call('readMenu', { token: h, image: img });
ok(r.ok && r.found === 5 && r.names[1] === 'ニラと玉子の炒め', 'コード 200 のエラーから文字を取り出す', r);
G.Drive._as200 = false;
ok(ctx.fixMojibake_('麻婆豆腐') === '麻婆豆腐', '読める文字はそのまま');
ok(ctx.fixMojibake_(Buffer.from('1.麻婆豆腐 ¥1,000', 'utf8').toString('latin1')) === '1.麻婆豆腐 ¥1,000', 'Latin-1 の化けを戻す');
const cp = s => [...Buffer.from(s, 'utf8')].map(b => ({ 0x80: '€', 0x83: 'ƒ', 0x9C: 'œ' }[b] || String.fromCharCode(b))).join('');
ok(ctx.fixMojibake_(cp('ラーメン')) === 'ラーメン', 'Windows-1252 の化けも戻す', ctx.fixMojibake_(cp('ラーメン')));
console.log('PASS ' + pass + ' FAIL ' + fail);
