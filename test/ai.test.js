// AI予想（ptで買う予想屋）のテスト（同じプロセスで動かす）
// モデル×エフォートの値段／持ち点から引く／同じ組み合わせは2回払いにならない／買えないとき／中身の形／過去の傾向を読むか
process.env.TZ = 'Asia/Tokyo';
const path = require('path');
const { ctx, SS } = require('./emu/gas_emu.js')(path.join(__dirname, '../gas/Code.gs'));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) pass++; else { fail++; console.log('FAIL', m, x === undefined ? '' : JSON.stringify(x)); } };
const call = (action, o = {}) => { ctx.__reset(); return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ action, v: 3 }, o)) } }).content); };
const sh = n => SS.getSheetByName(n);
try {
  ctx.初期設定();
  const keys = sh('設定').data.map(r => r[0]);
  ok(['AI予想の値段（Hakkaku）', 'AI予想の値段（Shumainet）', 'AI予想の値段（Octopus）', 'AI予想のエフォート倍率（中）', 'AI予想のエフォート倍率（高）', 'AI予想の無料期間（この日まで）'].every(k => keys.includes(k)), '設定シートに値段の項目ができる', keys);
  const setS = (k, v) => { sh('設定').data.find(x => x[0] === k)[1] = v; };
  setS('AI予想の無料期間（この日まで）', ''); // まずは有料で試す
  const h = call('register', { nick: 'てんちょう', pass: '0000' }).token;
  sh('参加者').data.forEach(r => { if (r[1] === 'てんちょう') r[4] = true; });
  const g = call('register', { nick: 'たろう', pass: '1111' }).token;
  const g2 = call('register', { nick: 'はなこ', pass: '2222' }).token;
  const hostId = sh('参加者').data.find(r => r[1] === 'てんちょう')[0];

  // 出馬表がないとき
  let r = call('aiList', { token: g });
  ok(r.ok && !r.canBuy && /出馬表/.test(r.reason) && r.models.length === 3 && r.efforts.length === 3, '出馬表がないときは買えない', r);

  // ---- 過去6週（確定）を直接入れる：水曜はいつも天津飯（5番人気）が出る ----
  const names = ['麻婆豆腐', '回鍋肉', '餃子', '炒飯', '天津飯', '酢豚', 'エビチリ', 'その他'];
  const past = ['2026-09-29', '2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27', '2026-11-03'];
  past.forEach((wid, k) => {
    sh('週').data.push([wid, 'テスト', k + 1, '確定', '', new Date(2026, 8, 29 + k * 7, 11), hostId, 'てんちょう', new Date(), new Date()]);
    names.forEach((n, i) => sh('メニュー').data.push([wid, i + 1, n, i + 1, [2, 3, 4.5, 6, 8, 10, 13, 16][i], [2, 3, 4.5, 6, 8, 10, 13, 16][i]]));
    [['火', 1], ['水', 5], ['木', k % 2 ? 1 : 2]].forEach(([d, w]) => sh('結果').data.push([wid, d, w, names[w - 1], '', new Date()]));
  });
  // ---- 今週を公開 ----
  const wk = '2026-11-10';
  const dl = new Date(Date.now() + 86400000);
  r = call('saveWeek', { token: h, weekId: wk, raceName: 'テスト', deadline: dl.toISOString(), menus: names.map((n, i) => ({ waku: i + 1, name: n })), publish: true });
  ok(r.ok, '今週を公開', r);

  r = call('aiList', { token: g });
  ok(r.ok && r.canBuy && r.weekId === wk && r.items.length === 0, '受付中なら買える', r);
  ok(r.prices.haiku.low === 200 && r.prices.haiku.mid === 400 && r.prices.haiku.high === 600 && r.prices.sonnet.low === 500 && r.prices.opus.high === 3000, '値段＝モデルの値段×エフォートの倍率', r.prices);
  ok(r.models.map(m => m.name).join() === 'Hakkaku,Shumainet,Octopus' && r.efforts.map(e => e.name).join() === '低,中,高', 'モデルとエフォートの名前', r);
  const before = r.balance;
  ok(before === 10000, '最初は10,000pt', before);

  // ---- 担当ホストは使えない ----
  r = call('aiList', { token: h });
  ok(r.ok && !r.canBuy && /担当/.test(r.reason), '担当ホストは買えない（一覧）', r);
  r = call('aiBuy', { token: h, weekId: wk, model: 'haiku', effort: 'low' });
  ok(!r.ok && /担当/.test(r.error), '担当ホストは買えない', r);

  // ---- 不正な値 ----
  ok(!call('aiBuy', { token: g, weekId: wk, model: 'gpt', effort: 'low' }).ok, '無いモデルは断る');
  ok(!call('aiBuy', { token: g, weekId: wk, model: 'opus', effort: 'max' }).ok, '無いエフォートは断る');
  ok(!call('aiBuy', { token: g, weekId: wk, model: 'constructor', effort: 'low' }).ok, '元から備わっている名前も断る');
  ok(!call('aiBuy', { token: 'x', weekId: wk, model: 'haiku', effort: 'low' }).ok, 'ログインしていないと断る');

  // ---- 買う ----
  r = call('aiBuy', { token: g, weekId: wk, model: 'haiku', effort: 'low' });
  ok(r.ok && r.item.pt === 200 && r.balance === before - 200, 'Haiku・低を200ptで買える', r);
  const hl = r.item.result;
  ok(hl.buys.length === 1 && !hl.conf && hl.think.length >= 2 && hl.think.length <= 3, 'エフォート低：買い目1点・自信度なし・考えた過程は短い', hl);
  ok(['火', '水', '木'].every(d => hl.days[d].length === 3 && hl.days[d].map(x => x.mark).join('') === '◎○▲'), '曜日ごとに◎○▲', hl.days);
  ok(hl.days.水[0].waku === 1, 'Haiku は人気順の読みが中心（水曜も1番人気が◎）', hl.days.水);
  r = call('state', { token: g });
  ok(r.me.balance === before - 200, '持ち点から引かれる', r.me.balance);

  // 同じ組み合わせは2回払いにならない
  r = call('aiBuy', { token: g, weekId: wk, model: 'haiku', effort: 'low' });
  ok(r.ok && r.again && r.balance === before - 200 && JSON.stringify(r.item.result) === JSON.stringify(hl), '同じ組み合わせは前の予想を返し、ptは引かない', r);

  r = call('aiBuy', { token: g, weekId: wk, model: 'sonnet', effort: 'mid' });
  ok(r.ok && r.item.pt === 1000 && r.balance === before - 1200, 'Sonnet・中は1,000pt', r);
  const sm = r.item.result;
  ok(sm.buys.length === 3 && sm.think.length >= 4 && sm.think.length <= 5, 'エフォート中：買い目3点・考えた過程は中くらい', sm);
  ok(sm.days.水[0].waku === 5, 'Sonnet は過去の傾向を読む（水曜は天津飯が◎）', sm.days.水);
  ok(sm.think.some(t => /天津飯/.test(t)), '考えた過程に天津飯の出方が出る', sm.think);

  r = call('aiBuy', { token: g, weekId: wk, model: 'opus', effort: 'high' });
  ok(r.ok && r.item.pt === 3000 && r.balance === before - 4200, 'Opus・高は3,000pt', r);
  const oh = r.item.result;
  ok(oh.buys.length === 5 && oh.conf && oh.conf.stars >= 1 && oh.conf.stars <= 3 && oh.conf.pct >= 0 && oh.conf.pct <= 100, 'エフォート高：買い目5点・自信度あり', oh);
  ok(oh.think.some(t => /200通り/.test(t)) && oh.think.some(t => /担当ホスト/.test(t)) && oh.think.some(t => /妙味/.test(t)), 'Opus・高の考えた過程（読み直し・担当ホスト・妙味）', oh.think);
  ok(oh.buys.every(b => b.picks.length === 3 && b.picks.every(w => w >= 1 && w <= 8) && b.mul > 1 && b.p > 0 && b.names.length === 3), '買い目は今週の枠と料理名・倍率・見込み', oh.buys);
  ok(oh.buys.every((b, i) => i === 0 || JSON.stringify(b.picks) !== JSON.stringify(oh.buys[i - 1].picks)), '買い目が重ならない', oh.buys);
  ok(['火', '水', '木'].every(d => oh.days[d].every(x => x.p > 0 && x.p < 100)), '見込みは0〜100%', oh.days);

  // 同じ条件なら、別の人が買っても同じ中身（乱数は週とモデルで決まる）
  r = call('aiBuy', { token: g2, weekId: wk, model: 'opus', effort: 'high' });
  ok(r.ok && JSON.stringify(r.item.result) === JSON.stringify(oh), '同じ週・同じ組み合わせなら同じ中身', r.item && r.item.result);

  // 一覧に買ったものが出る（自分の分だけ）
  r = call('aiList', { token: g });
  ok(r.items.length === 3 && r.items.map(x => x.model + x.effort).join() === 'haikulow,sonnetmid,opushigh' && r.balance === before - 4200, '一覧に自分が買った3つ', r.items.map(x => x.model + x.effort));
  r = call('aiList', { token: g2 });
  ok(r.items.length === 1, 'ほかの人の分は出ない', r.items.length);

  // シートの中身は文字として保存される
  const rows = sh('AI予想').data;
  ok(rows.length === 5 && /^'?\{"v":1/.test(String(rows[1][7])), 'AI予想シートに中身が文字で残る', [rows.length, String(rows[1][7]).slice(0, 20), rows[0]]);

  // 予想に使えるptも減る
  r = call('predict', { token: g, weekId: wk, picks: { 火: 1, 水: 5, 木: 2 }, bet: 6000 });
  ok(!r.ok && /5,800pt/.test(r.error), 'AI予想に使ったぶん、予想に使えるptが減る', r);
  ok(call('predict', { token: g, weekId: wk, picks: { 火: 1, 水: 5, 木: 2 }, bet: 5800 }).ok, '残りのptで予想できる');

  // 持ち点が足りない
  r = call('aiBuy', { token: g, weekId: wk, model: 'opus', effort: 'mid' });
  ok(!r.ok && /足りません/.test(r.error), '持ち点が足りないと買えない', r);

  // 値段は設定シートで変えられる
  sh('設定').data.find(x => x[0] === 'AI予想の値段（Hakkaku）')[1] = 150;
  sh('設定').data.find(x => x[0] === 'AI予想のエフォート倍率（高）')[1] = 4;
  r = call('aiList', { token: g2 });
  ok(r.prices.haiku.low === 200 && r.prices.haiku.high === 600 && r.prices.opus.high === 4000, '設定で値段が変わる（100pt単位に切り上げ）', r.prices);

  // ---- 食事の記録（投稿をつくる） ----
  r = call('postLog', { name: '天津飯' });
  ok(!r.ok && /ログインしてください/.test(r.error) && sh('食事の記録').data.length === 1, 'ログインなしの投稿は記録しない（ログインを求める）', r);
  ok(!call('postMe', {}).ok && call('postMe', { token: h }).nick === 'てんちょう', '投稿画面のログイン確認');
  r = call('postLog', { token: h, name: '天津飯' });
  let mr = sh('食事の記録').data;
  ok(r.ok && mr.length === 2 && mr[1][5] === hostId && mr[1][7] === 'ログインした人' && mr[1][3] === 5 && mr[1][2] === wk, 'ログインした人の記録になり、枠と週も入る', mr[1]);
  r = call('postLog', { token: g, name: '謎の麺' });
  mr = sh('食事の記録').data;
  ok(r.ok && mr[2][6] === 'たろう' && mr[2][3] === '', 'ログインしていればその人。メニューにない品は枠なし', mr[2]);
  ok(!call('postLog', { token: g, name: '  ' }).ok, '空のメニュー名は断る');
  // ホスト以外（ログインなし）の月曜の投稿は使わない
  sh('食事の記録').data.push(['2026-11-09', '月', wk, 3, '餃子', '', '', '不明（ログインなし）', new Date()]);
  // 今週の月曜に麻婆豆腐を食べた → Wontonnet の考えた過程に出る
  sh('食事の記録').data.push(['2026-11-09', '月', wk, 1, '麻婆豆腐', hostId, 'てんちょう', 'ログインした人', new Date()]);
  setS('AI予想の無料期間（この日まで）', '2099-12-31');
  r = call('aiBuy', { token: g, weekId: wk, model: 'sonnet', effort: 'high' });
  ok(r.ok && r.item.result.think.some(t => /月曜は「麻婆豆腐」/.test(t)) && !r.item.result.think.some(t => /餃子」を食べ/.test(t)), '月曜に担当ホストが食べたものだけを読む（ログインなしの投稿は使わない）', r.item && r.item.result.think);
  r = call('aiBuy', { token: g, weekId: wk, model: 'opus', effort: 'mid' });
  ok(r.ok && r.item.result.think.some(t => /担当ホストがこれまでにいちばん多く食べたのは「麻婆豆腐」/.test(t)), 'Octopus は担当ホストがよく食べるものを読む', r.item && r.item.result.think);
  setS('AI予想の無料期間（この日まで）', '');

  // ---- 無料期間 ----
  const today = new Date(); const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  setS('AI予想の無料期間（この日まで）', ymd(today));
  r = call('aiList', { token: g2 });
  ok(r.freeUntil === ymd(today) && r.prices.opus.high === 0 && r.basePrices.opus.high === 4000, '無料期間は今日の終わりまで有効で、値段は0（通常の値段も渡す）', r);
  let b0 = r.balance;
  r = call('aiBuy', { token: g2, weekId: wk, model: 'sonnet', effort: 'low' });
  ok(r.ok && r.item.pt === 0 && r.balance === b0, '無料期間はptが減らない', r);
  setS('AI予想の無料期間（この日まで）', new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
  r = call('aiList', { token: g2 });
  ok(r.freeUntil === '' && r.prices.opus.high === 4000, '期間が過ぎたら有料に戻る（日付の形でも読める）', r);
  setS('AI予想の無料期間（この日まで）', Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3).getTime() - new Date(1899, 11, 30).getTime()) / 86400000));
  ok(call('aiList', { token: g2 }).freeUntil !== '', 'スプレッドシートの通し番号の日付でも読める');
  setS('AI予想の無料期間（この日まで）', 'あとで');
  ok(call('aiList', { token: g2 }).freeUntil === '', '日付でなければ無料にしない');

  // 締切後は買えない
  sh('週').data.forEach(x => { if (x[0] === wk) x[5] = new Date(Date.now() - 1000); });
  r = call('aiList', { token: g2 });
  ok(r.ok && !r.canBuy && /締切/.test(r.reason) && r.items.length === 2, '締切後は買えないが、買ったものは見られる', r);
  ok(!call('aiBuy', { token: g2, weekId: wk, model: 'haiku', effort: 'low' }).ok, '締切後に買おうとしても断る');

  // まだ確定した週がないときは人気順だけで読む
  sh('週').data = sh('週').data.filter(x => x[3] !== '確定');
  sh('週').data.forEach(x => { if (x[0] === wk) x[5] = new Date(Date.now() + 86400000); });
  r = call('aiBuy', { token: g2, weekId: wk, model: 'sonnet', effort: 'high' });
  ok(r.ok && /まだ確定した週がありません/.test(r.item.result.think[0]) && r.item.result.days.火[0].waku === 1 && r.item.result.data.days === 0, 'データがないときは人気順だけ', r.item && r.item.result);
} catch (e) { console.log('CRASH', e && e.stack || e); fail++; }
console.log(`PASS ${pass} FAIL ${fail}`);
