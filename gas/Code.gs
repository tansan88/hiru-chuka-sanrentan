/**
 * 昼中華3連単 サーバー（Google Apps Script）
 *
 * 使い方は README.md を見てください。
 * 1. スプレッドシートの「拡張機能 → Apps Script」にこのファイルを貼る
 * 2. 関数「初期設定」を1回実行する（シートと写真フォルダができます）
 * 3. 「デプロイ → 新しいデプロイ → ウェブアプリ」で公開する
 */

// ===== シートの定義 =====
const SHEETS = {
  設定: ['項目', '値', 'メモ'],
  参加者: ['ID', 'ニックネーム', 'パスワード', 'ソルト', 'ホスト', '補充pt', '登録日時', 'ログイン鍵'],
  週: ['週ID', 'レース名', '回', '状態', '店長のつぶやき', '締切', '担当ホストID', '担当ホスト', '公開日時', '確定日時'],
  メニュー: ['週ID', '枠', '品名', '人気', 'オッズ'],
  結果: ['週ID', '曜日', '枠', '品名', '写真ID', '登録日時'],
  予想: ['週ID', '参加者ID', 'ニックネーム', '火', '水', '木', '使うpt', '日時'],
  獲得pt: ['週ID', '参加者ID', 'ニックネーム', '火', '水', '木', '3連単', '返還', '獲得計', '収支'],
  ログ: ['日時', '参加者ID', 'ニックネーム', '操作', '内容'],
};
const DAYS = ['火', '水', '木'];
const DEFAULT_SETTINGS = [
  ['初期持ち点', 10000, '全員が最初に持っているpt'],
  ['オッズ1', 2.0, '1番人気'], ['オッズ2', 3.0, '2番人気'], ['オッズ3', 4.5, '3番人気'], ['オッズ4', 6.0, '4番人気'],
  ['オッズ5', 8.0, '5番人気'], ['オッズ6', 10, '6番人気'], ['オッズ7', 13, '7番人気'], ['オッズ8', 16, '8番人気'],
  ['9番人気以降の増分', 4, '8番人気のオッズに、1つ下がるごとに足す'],
  ['写真フォルダID', '', '初期設定で自動作成'],
];

// ===== 初期設定（最初に1回だけ手で実行） =====
function 初期設定() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]).setFontWeight('bold').setBackground('#E9F1EB');
      sh.setFrozenRows(1);
    }
  });
  const set = ss.getSheetByName('設定');
  if (set.getLastRow() === 1) set.getRange(2, 1, DEFAULT_SETTINGS.length, 3).setValues(DEFAULT_SETTINGS);
  // ホスト列をチェックボックスに
  ss.getSheetByName('参加者').getRange('E2:E').insertCheckboxes();
  // 写真フォルダ
  if (!getSetting_('写真フォルダID')) {
    const folder = DriveApp.createFolder('昼中華3連単の写真');
    setSetting_('写真フォルダID', folder.getId());
  }
  const def = ss.getSheetByName('シート1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);
  SpreadsheetApp.getUi && Logger.log('初期設定が終わりました');
}

// ===== Web API =====
function doGet() {
  return json_({ ok: true, app: '昼中華3連単' });
}

function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents || '{}'); } catch (err) { return json_({ ok: false, error: '送信内容が読めませんでした' }); }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const fn = API[req.action];
    if (!fn) throw new UserError('不明な操作です');
    const out = fn(req) || {};
    out.ok = true;
    return json_(out);
  } catch (err) {
    if (err instanceof UserError) return json_({ ok: false, error: err.message });
    console.error(err && err.stack || err);
    return json_({ ok: false, error: 'サーバーでエラーが起きました。少し待ってからやり直してください。' });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

class UserError extends Error {}
function fail_(msg) { throw new UserError(msg); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

const API = {
  // --- アカウント ---
  register(r) {
    const nick = cleanNick_(r.nick);
    const pass = cleanPass_(r.pass);
    if (findUserByNick_(nick)) fail_('そのニックネームはもう使われています');
    const salt = Utilities.getUuid();
    const token = Utilities.getUuid();
    const id = 'u' + Utilities.getUuid().slice(0, 8);
    sheet_('参加者').appendRow([id, nick, hash_(salt, pass), salt, false, 0, new Date(), token]);
    sheet_('参加者').getRange(sheet_('参加者').getLastRow(), 5).insertCheckboxes();
    log_(id, nick, '登録', '');
    return { token };
  },
  login(r) {
    const u = findUserByNick_(String(r.nick || '').trim());
    if (!u || hash_(u.salt, String(r.pass || '')) !== u.pass) fail_('ニックネームかパスワードがちがいます');
    let token = u.token;
    if (!token) { token = Utilities.getUuid(); setUserCell_(u, 'ログイン鍵', token); }
    log_(u.id, u.nick, 'ログイン', '');
    return { token };
  },
  changeNick(r) {
    const u = auth_(r);
    const nick = cleanNick_(r.nick);
    const other = findUserByNick_(nick);
    if (other && other.id !== u.id) fail_('そのニックネームはもう使われています');
    setUserCell_(u, 'ニックネーム', nick);
    log_(u.id, nick, 'ニックネーム変更', u.nick + ' → ' + nick);
    return {};
  },
  changePass(r) {
    const u = auth_(r);
    if (hash_(u.salt, String(r.oldPass || '')) !== u.pass) fail_('今のパスワードがちがいます');
    const pass = cleanPass_(r.newPass);
    const salt = Utilities.getUuid();
    setUserCell_(u, 'ソルト', salt);
    setUserCell_(u, 'パスワード', hash_(salt, pass));
    log_(u.id, u.nick, 'パスワード変更', '');
    return {};
  },

  // --- ゲスト ---
  state(r) {
    const u = auth_(r);
    const db = load_();
    const me = meInfo_(u, db);
    const open = currentWeek_(db);
    const out = { me, odds: oddsTable_(), now: new Date().toISOString() };
    if (open) out.current = weekView_(open, u, db, false);
    else out.next = nextRaceInfo_(db);
    const settled = db.weeks.filter(w => w.状態 === '確定' || w.状態 === '返還').sort(byWeekDesc_);
    if (settled[0]) out.lastResult = weekView_(settled[0], u, db, true);
    out.hasPrevResult = settled.length > 0;
    return out;
  },
  predict(r) {
    const u = auth_(r);
    const db = load_();
    const w = db.weeks.find(x => x.週ID === r.weekId);
    if (!w || w.状態 !== '受付中') fail_('いまは予想を受け付けていません');
    if (new Date() >= new Date(w.締切)) fail_('締切を過ぎました');
    if (w.担当ホストID === u.id) fail_('担当の週は予想できません');
    const menus = db.menus.filter(m => m.週ID === w.週ID);
    const picks = DAYS.map(d => Number(r.picks && r.picks[d]));
    picks.forEach(p => { if (!menus.some(m => Number(m.枠) === p)) fail_('火・水・木を1つずつ選んでください'); });
    const bet = Number(r.bet);
    if (!(bet >= 100) || bet % 100 !== 0) fail_('使うptは100pt単位で入れてください');
    const prev = db.preds.find(p => p.週ID === w.週ID && p.参加者ID === u.id);
    const balance = balance_(u, db) + (prev ? Number(prev.使うpt) : 0);
    if (bet > balance) fail_('持ち点が足りません（使えるのは ' + balance.toLocaleString() + 'pt まで）');
    const row = [w.週ID, u.id, u.nick, picks[0], picks[1], picks[2], bet, new Date()];
    if (prev) sheet_('予想').getRange(prev._row, 1, 1, row.length).setValues([row]);
    else sheet_('予想').appendRow(row);
    log_(u.id, u.nick, prev ? '予想変更' : '予想', picks.join('-') + ' / ' + bet + 'pt');
    return {};
  },
  history(r) {
    const u = auth_(r);
    const db = load_();
    const list = db.weeks.filter(w => (w.状態 === '確定' || w.状態 === '返還')).sort(byWeekDesc_).map(w => {
      const v = weekView_(w, u, db, true);
      return { weekId: w.週ID, title: v.title, dates: v.dates, status: w.状態, marks: v.marks, net: v.settle ? v.settle.net : null, played: !!v.myPred };
    });
    return { list };
  },
  week(r) {
    const u = auth_(r);
    const db = load_();
    const w = db.weeks.find(x => x.週ID === r.weekId);
    if (!w || !(w.状態 === '確定' || w.状態 === '返還')) fail_('その週の結果は見られません');
    return { week: weekView_(w, u, db, true) };
  },

  // --- ホスト ---
  hostState(r) {
    const u = authHost_(r);
    const db = load_();
    const w = db.weeks.filter(x => x.状態 === '下書き' || x.状態 === '受付中').sort(byWeekDesc_)[0];
    const out = { odds: oddsTable_(), suggest: suggestNextWeek_(db), raceNames: raceNames_(db), rounds: {} };
    const names = out.raceNames.length ? out.raceNames : ['昼中華ステークス'];
    names.forEach(n => out.rounds[n] = roundFor_(db, n, w ? w.週ID : out.suggest));
    if (w) {
      out.week = {
        weekId: w.週ID, raceName: w.レース名, round: w.回 || roundFor_(db, w.レース名, w.週ID), status: w.状態, mumble: w.店長のつぶやき,
        deadline: toIso_(w.締切), host: w.担当ホスト, mine: w.担当ホストID === u.id,
        menus: db.menus.filter(m => m.週ID === w.週ID).sort((a, b) => a.人気 - b.人気).map(m => ({ waku: Number(m.枠), name: m.品名, pop: Number(m.人気), odds: Number(m.オッズ) })),
        results: resultsOf_(db, w.週ID),
        predCount: db.preds.filter(p => p.週ID === w.週ID).length,
        closed: new Date() >= new Date(w.締切),
      };
    }
    return out;
  },
  saveWeek(r) {
    const u = authHost_(r);
    const db = load_();
    const weekId = String(r.weekId || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekId)) fail_('開催日（火曜）を選んでください');
    const raceName = String(r.raceName || '').trim() || '昼中華ステークス';
    const deadline = new Date(r.deadline);
    if (isNaN(deadline)) fail_('締切の日時を入れてください');
    const menus = (r.menus || []).map(m => String(m.name || '').trim()).filter(Boolean);
    let w = db.weeks.find(x => x.週ID === weekId);
    if (w && w.状態 !== '下書き' && w.状態 !== '受付中') fail_('この週はもう確定しています');
    const published = w && w.状態 === '受付中';
    const hasPreds = db.preds.some(p => p.週ID === weekId);
    if (published && hasPreds && JSON.stringify(menuNames_(db, weekId)) !== JSON.stringify((r.menus || []).map(m => [Number(m.waku), String(m.name).trim()]))) {
      fail_('予想が入ったあとはメニューと人気順を変えられません');
    }
    if (menus.length < 2) fail_('メニューを2品以上入れてください');
    const status = r.publish ? '受付中' : (w ? w.状態 : '下書き');
    const round = roundFor_(db, raceName, weekId);
    const row = [weekId, raceName, round, status, String(r.mumble || '').trim(), deadline, w ? w.担当ホストID || u.id : u.id, w ? w.担当ホスト || u.nick : u.nick,
      status === '受付中' ? (w && w.公開日時 ? w.公開日時 : new Date()) : '', ''];
    if (w) sheet_('週').getRange(w._row, 1, 1, row.length).setValues([row]);
    else sheet_('週').appendRow(row);
    // メニューを書き直す（人気順＝送られてきた順、枠＝足した順）
    if (!(published && hasPreds)) {
      deleteRows_('メニュー', db.menus.filter(m => m.週ID === weekId).map(m => m._row));
      const rows = (r.menus || []).filter(m => String(m.name || '').trim()).map((m, i) => [weekId, Number(m.waku), String(m.name).trim(), i + 1, oddsFor_(i + 1)]);
      if (rows.length) sheet_('メニュー').getRange(sheet_('メニュー').getLastRow() + 1, 1, rows.length, 5).setValues(rows);
    }
    log_(u.id, u.nick, r.publish ? '出馬表公開' : '下書き保存', raceName + ' ' + weekId);
    return {};
  },
  registerDay(r) {
    const u = authHost_(r);
    const db = load_();
    const w = db.weeks.find(x => x.週ID === r.weekId);
    if (!w || w.状態 !== '受付中') fail_('この週は登録できません');
    if (new Date() < new Date(w.締切)) fail_('締切のあとに登録できます');
    const day = r.day;
    if (DAYS.indexOf(day) < 0) fail_('曜日が正しくありません');
    let waku = Number(r.waku), name = '中止';
    if (waku !== 0) {
      const m = db.menus.find(x => x.週ID === w.週ID && Number(x.枠) === waku);
      if (!m) fail_('メニューを選んでください');
      name = m.品名;
    }
    let photoId = '';
    if (r.photo && r.photo.data) {
      const blob = Utilities.newBlob(Utilities.base64Decode(r.photo.data), r.photo.mime || 'image/jpeg', w.週ID + '_' + day + '.jpg');
      const folder = DriveApp.getFolderById(getSetting_('写真フォルダID'));
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      photoId = file.getId();
    }
    const prev = db.results.find(x => x.週ID === w.週ID && x.曜日 === day);
    const row = [w.週ID, day, waku, name, photoId || (prev && waku === Number(prev.枠) ? prev.写真ID : ''), new Date()];
    if (prev) sheet_('結果').getRange(prev._row, 1, 1, row.length).setValues([row]);
    else sheet_('結果').appendRow(row);
    log_(u.id, u.nick, '食べたもの登録', day + ' ' + name);
    return {};
  },
  settle(r) {
    const u = authHost_(r);
    const db = load_();
    const w = db.weeks.find(x => x.週ID === r.weekId);
    if (!w || w.状態 !== '受付中') fail_('この週は確定できません');
    const res = {};
    db.results.filter(x => x.週ID === w.週ID).forEach(x => res[x.曜日] = Number(x.枠));
    if (DAYS.some(d => res[d] === undefined)) fail_('火・水・木の3日分を登録してから確定してください');
    const cancelled = DAYS.some(d => res[d] === 0);
    const odds = {};
    db.menus.filter(m => m.週ID === w.週ID).forEach(m => odds[Number(m.枠)] = Number(m.オッズ));
    const rows = db.preds.filter(p => p.週ID === w.週ID).map(p => {
      const bet = Number(p.使うpt);
      const pk = DAYS.map(d => Number(p[d]));
      if (cancelled) return [w.週ID, p.参加者ID, p.ニックネーム, 0, 0, 0, 0, bet, bet, 0];
      const daily = DAYS.map((d, i) => pk[i] === res[d] ? Math.floor(bet / 3 * odds[pk[i]]) : 0);
      const allHit = DAYS.every((d, i) => pk[i] === res[d]);
      const triple = allHit ? Math.floor(bet * odds[pk[0]] * odds[pk[1]] * odds[pk[2]]) : 0;
      const total = daily[0] + daily[1] + daily[2] + triple;
      return [w.週ID, p.参加者ID, p.ニックネーム, daily[0], daily[1], daily[2], triple, 0, total, total - bet];
    });
    deleteRows_('獲得pt', db.earn.filter(x => x.週ID === w.週ID).map(x => x._row));
    if (rows.length) sheet_('獲得pt').getRange(sheet_('獲得pt').getLastRow() + 1, 1, rows.length, 10).setValues(rows);
    const st = cancelled ? '返還' : '確定';
    sheet_('週').getRange(w._row, 4).setValue(st);
    sheet_('週').getRange(w._row, 10).setValue(new Date());
    log_(u.id, u.nick, '結果確定', w.週ID + ' ' + st);
    return { status: st };
  },
};

// ===== 画面に返す形 =====
function weekView_(w, u, db, withSettle) {
  const menus = db.menus.filter(m => m.週ID === w.週ID).sort((a, b) => Number(a.枠) - Number(b.枠))
    .map(m => ({ waku: Number(m.枠), name: m.品名, pop: Number(m.人気), odds: Number(m.オッズ) }));
  const p = db.preds.find(x => x.週ID === w.週ID && x.参加者ID === u.id);
  const results = resultsOf_(db, w.週ID);
  const myPred = p ? { picks: { 火: Number(p.火), 水: Number(p.水), 木: Number(p.木) }, bet: Number(p.使うpt), at: toIso_(p.日時) } : null;
  const marks = DAYS.map(d => {
    const rr = results[d];
    if (!rr) return 'wait';
    if (rr.waku === 0) return 'cancel';
    if (!myPred) return 'none';
    return myPred.picks[d] === rr.waku ? 'hit' : 'miss';
  });
  const v = {
    weekId: w.週ID, title: '第' + (w.回 || roundFor_(db, w.レース名, w.週ID)) + '回 ' + w.レース名, raceName: w.レース名,
    dates: datesLabel_(w.週ID), status: w.状態, mumble: w.店長のつぶやき || '', deadline: toIso_(w.締切),
    closed: new Date() >= new Date(w.締切), isMyHostWeek: w.担当ホストID === u.id,
    menus, results, myPred, marks,
  };
  if (withSettle) {
    const e = db.earn.find(x => x.週ID === w.週ID && x.参加者ID === u.id);
    if (e) v.settle = { daily: { 火: Number(e.火), 水: Number(e.水), 木: Number(e.木) }, triple: Number(e['3連単']), refund: Number(e.返還), total: Number(e.獲得計), net: Number(e.収支) };
  }
  return v;
}
function resultsOf_(db, weekId) {
  const out = {};
  db.results.filter(x => x.週ID === weekId).forEach(x => {
    out[x.曜日] = { waku: Number(x.枠), name: x.品名, photo: x.写真ID ? 'https://drive.google.com/thumbnail?id=' + x.写真ID + '&sz=w1000' : '' };
  });
  return out;
}
function meInfo_(u, db) {
  return { id: u.id, nick: u.nick, isHost: u.host === true || u.host === 'TRUE', balance: balance_(u, db) };
}
function balance_(u, db) {
  const init = Number(getSetting_('初期持ち点')) || 10000;
  const add = Number(u.add) || 0;
  const spent = db.preds.filter(p => p.参加者ID === u.id).reduce((s, p) => s + Number(p.使うpt || 0), 0);
  const got = db.earn.filter(e => e.参加者ID === u.id).reduce((s, e) => s + Number(e.獲得計 || 0), 0);
  return init + add - spent + got;
}
function currentWeek_(db) {
  return db.weeks.filter(w => w.状態 === '受付中').sort(byWeekDesc_)[0] || null;
}
function nextRaceInfo_(db) {
  const s = suggestNextWeek_(db);
  const last = db.weeks.filter(w => w.状態 !== '下書き').sort(byWeekDesc_)[0];
  const name = last ? last.レース名 : '昼中華ステークス';
  return { title: '第' + roundFor_(db, name, s) + '回 ' + name, dates: datesLabel_(s) };
}
function suggestNextWeek_(db) {
  const d = new Date();
  const dow = d.getDay(); // 0日〜6土
  let add = (2 - dow + 7) % 7; // 次の火曜（今日が火曜の午前なら今日）
  if (dow === 2 && d.getHours() >= 12) add = 7;
  d.setDate(d.getDate() + add);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function roundFor_(db, name, weekId) {
  return db.weeks.filter(w => w.レース名 === name && w.状態 !== '下書き' && w.週ID < weekId).length + 1;
}
function raceNames_(db) {
  const s = {}; db.weeks.forEach(w => s[w.レース名] = true); return Object.keys(s);
}
function menuNames_(db, weekId) {
  return db.menus.filter(m => m.週ID === weekId).sort((a, b) => a.人気 - b.人気).map(m => [Number(m.枠), String(m.品名)]);
}
function datesLabel_(weekId) {
  const [y, m, d] = weekId.split('-').map(Number);
  const t = new Date(y, m - 1, d), th = new Date(y, m - 1, d + 2);
  return (t.getMonth() + 1) + '/' + t.getDate() + '（火）〜' + (th.getMonth() !== t.getMonth() ? (th.getMonth() + 1) + '/' : '') + th.getDate() + '（木）';
}
function oddsTable_() {
  const t = [];
  for (let i = 1; i <= 12; i++) t.push(oddsFor_(i));
  return t;
}
function oddsFor_(pop) {
  if (pop <= 8) return Number(getSetting_('オッズ' + pop));
  return Number(getSetting_('オッズ8')) + (pop - 8) * Number(getSetting_('9番人気以降の増分') || 4);
}
function byWeekDesc_(a, b) { return a.週ID < b.週ID ? 1 : a.週ID > b.週ID ? -1 : 0; }

// ===== 認証 =====
function auth_(r) {
  const token = String(r.token || '');
  if (!token) fail_('ログインしてください');
  const u = readUsers_().find(x => x.token === token);
  if (!u) fail_('ログインしてください');
  return u;
}
function authHost_(r) {
  const u = auth_(r);
  if (!(u.host === true || u.host === 'TRUE')) fail_('ホストだけができる操作です');
  return u;
}
function cleanNick_(s) {
  s = String(s || '').trim();
  if (!s) fail_('ニックネームを入れてください');
  if (s.length > 16) fail_('ニックネームは16文字までです');
  return s;
}
function cleanPass_(s) {
  s = String(s || '');
  if (!/^\d{4}$/.test(s)) fail_('パスワードは数字4桁です');
  return s;
}
function hash_(salt, pass) {
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + pass, Utilities.Charset.UTF_8);
  return b.map(x => ('0' + (x & 255).toString(16)).slice(-2)).join('');
}

// ===== シート読み書き =====
function sheet_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) fail_('シート「' + name + '」がありません。初期設定を実行してください');
  return sh;
}
function rows_(name) {
  const sh = sheet_(name);
  const n = sh.getLastRow();
  if (n < 2) return [];
  const head = SHEETS[name];
  return sh.getRange(2, 1, n - 1, head.length).getValues().map((v, i) => {
    const o = { _row: i + 2 };
    head.forEach((h, j) => o[h] = v[j] instanceof Date && h === '週ID' ? Utilities.formatDate(v[j], Session.getScriptTimeZone(), 'yyyy-MM-dd') : v[j]);
    return o;
  }).filter(o => o[head[0]] !== '');
}
function load_() {
  return { weeks: rows_('週'), menus: rows_('メニュー'), results: rows_('結果'), preds: rows_('予想'), earn: rows_('獲得pt') };
}
function readUsers_() {
  return rows_('参加者').map(o => ({ _row: o._row, id: o.ID, nick: String(o.ニックネーム), pass: o.パスワード, salt: o.ソルト, host: o.ホスト, add: o.補充pt, token: o.ログイン鍵 }));
}
function findUserByNick_(nick) { return readUsers_().find(u => u.nick === nick); }
function setUserCell_(u, col, val) { sheet_('参加者').getRange(u._row, SHEETS.参加者.indexOf(col) + 1).setValue(val); }
function deleteRows_(name, rows) { rows.sort((a, b) => b - a).forEach(r => sheet_(name).deleteRow(r)); }
function getSetting_(key) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('設定');
  const v = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 2).getValues().find(x => x[0] === key);
  return v ? v[1] : '';
}
function setSetting_(key, val) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('設定');
  const vals = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 1).getValues();
  const i = vals.findIndex(x => x[0] === key);
  if (i >= 0) sh.getRange(i + 2, 2).setValue(val); else sh.appendRow([key, val, '']);
}
function log_(id, nick, op, detail) { sheet_('ログ').appendRow([new Date(), id, nick, op, detail]); }
function toIso_(v) { return v instanceof Date ? v.toISOString() : (v ? new Date(v).toISOString() : ''); }
