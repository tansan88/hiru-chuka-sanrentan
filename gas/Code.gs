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
  メニュー: ['週ID', '枠', '品名', '人気', 'オッズ', '確定オッズ'],
  結果: ['週ID', '曜日', '枠', '品名', '写真ID', '登録日時'],
  予想: ['週ID', '参加者ID', 'ニックネーム', '火', '水', '木', '使うpt', '日時'],
  獲得pt: ['週ID', '参加者ID', 'ニックネーム', '火', '水', '木', '3連単', '返還', '獲得計', '収支'],
  ログ: ['日時', '参加者ID', 'ニックネーム', '操作', '内容'],
  補充: ['日時', '参加者ID', 'ニックネーム', '方法', 'pt'],
  レビュー: ['日時', '参加者ID', 'ニックネーム', '回', '遊び方', 'テーマ', '内容', '配当', '不具合', '不具合の内容', 'ひとこと'],
  クイズ: ['ID', '問題', 'A', 'B', 'C', 'D', '正解', '解説', '出典1', '出典2', '使う'],
  エラー: ['日時', '種類', '操作', '内容', '詳しい情報'],
  問い合わせ: ['日時', '参加者ID', 'ニックネーム', '種類', '内容', '対応メモ'],
};
// あとから増えたシート（無ければ自動で作る）
const AUTO_SHEETS = ['補充', 'レビュー', 'クイズ', 'エラー', '問い合わせ'];
const CONTACT_KINDS = ['不具合', '質問', '要望', 'その他'];
const DAYS = ['火', '水', '木'];
const DEFAULT_SETTINGS = [
  ['初期持ち点', 10000, '全員が最初に持っているpt'],
  ['オッズ1', 2.0, '1番人気'], ['オッズ2', 3.0, '2番人気'], ['オッズ3', 4.5, '3番人気'], ['オッズ4', 6.0, '4番人気'],
  ['オッズ5', 8.0, '5番人気'], ['オッズ6', 10, '6番人気'], ['オッズ7', 13, '7番人気'], ['オッズ8', 16, '8番人気'],
  ['9番人気以降の増分', 4, '8番人気のオッズに、1つ下がるごとに足す'],
  ['オッズの動きにくさ', 1000, '各品に最初から入っているとみなすpt（1日あたり）。大きいほどオッズが動きにくい'],
  ['クイズの補充pt', 5000, '持ち点が100pt未満のとき、豆知識クイズに答えると補充されるpt'],
  ['レビューの補充pt', 15000, '持ち点が100pt未満のとき、レビューを書くと補充されるpt'],
  ['写真フォルダID', '', '初期設定で自動作成'],
  ['バックアップの保存数', 8, '毎週のバックアップを何回分残すか（それより古いものはゴミ箱へ）'],
  ['バックアップフォルダID', '', '最初のバックアップで自動作成'],
  ['エラー通知先', '', 'エラーを知らせるメールの宛先。空ならこのスクリプトを動かしている人（オーナー）'],
];
const REFILL_LINE = 100; // これ未満になったら補充できる（1回に使える最小のpt）
const REVIEW_OPT = {
  understood: ['すぐ分かった', '少し迷った', '分からなかった'],
  topics: ['面白かった瞬間', '面倒になった・やめたくなった瞬間', 'あったら嬉しい機能'],
  balance: ['低い', 'ちょうどいい', '高い'],
  bug: ['なかった', 'あった'],
};

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
  // 写真フォルダ
  if (!getSetting_('写真フォルダID')) {
    const folder = DriveApp.createFolder('昼中華3連単の写真' + envSuffix_());
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

// 画面の版がこれより古いと「開き直してください」と返す。古い画面と食い違う変更をしたときだけ上げる
// （画面の版は app.js の APP_VERSION。版を送らない古い画面は 0 として扱う）
const MIN_APP_VERSION = 0;
function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents || '{}'); } catch (err) { return json_({ ok: false, error: '送信内容が読めませんでした' }); }
  if (req.action !== 'clientError' && (Number(req.v) || 0) < MIN_APP_VERSION) return json_({ ok: false, reload: true, error: 'アプリが新しくなりました。画面を開き直してください' });
  // 読むだけの操作は順番待ちをしない（書き込みだけ1件ずつ処理する）
  const readOnly = ['state', 'history', 'week', 'hostState', 'clientError'].indexOf(req.action) >= 0;
  const lock = readOnly ? null : LockService.getScriptLock();
  try {
    if (lock) lock.waitLock(20000);
    // API に自分で定義した操作だけを受け付ける（constructor など、元から備わっている名前は通さない）
    const fn = typeof req.action === 'string' && Object.prototype.hasOwnProperty.call(API, req.action) ? API[req.action] : null;
    if (!fn) throw new UserError('不明な操作です');
    const out = fn(req) || {};
    out.ok = true;
    return json_(out);
  } catch (err) {
    if (err instanceof UserError) return json_({ ok: false, error: err.message });
    console.error(err && err.stack || err);
    reportError_('サーバー', String(req.action || ''), err && err.message || String(err), err && err.stack || '');
    return json_({ ok: false, error: 'サーバーでエラーが起きました。少し待ってからやり直してください。' });
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (e2) {} }
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
    const sh = sheet_('参加者');
    const ids = sh.getRange(1, 1, Math.max(1, sh.getLastRow()), 1).getValues();
    let row = 1; ids.forEach((v, i) => { if (v[0] !== '') row = i + 1; });
    row += 1; // ID列で最後に埋まっている行の次（チェックボックスだけの行は無視）
    sh.getRange(row, 1, 1, 8).setValues([[id, txt_(nick), hash_(salt, pass), salt, false, 0, new Date(), token]]);
    sh.getRange(row, 5).insertCheckboxes();
    log_(id, nick, '登録', '');
    return { token };
  },
  login(r) {
    const u = findUserByNick_(String(r.nick || '').trim());
    if (!u) fail_('ニックネームかパスワードがちがいます');
    checkLoginLock_(u);
    if (hash_(u.salt, String(r.pass || '')) !== u.pass) loginFailed_(u);
    clearLoginFail_(u);
    let token = u.token;
    if (!token || tokenExpired_(u)) { token = Utilities.getUuid(); setUserCell_(u, 'ログイン鍵', token); }
    touchToken_(u, true);
    log_(u.id, u.nick, 'ログイン', '');
    return { token };
  },
  changeNick(r) {
    const u = auth_(r);
    const nick = cleanNick_(r.nick);
    const other = findUserByNick_(nick);
    if (other && other.id !== u.id) fail_('そのニックネームはもう使われています');
    setUserCell_(u, 'ニックネーム', txt_(nick));
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
    // ログイン鍵も新しくする（ほかの端末はログアウトされ、この端末だけ新しい鍵でログインしたままになる）
    const token = Utilities.getUuid();
    setUserCell_(u, 'ログイン鍵', token);
    touchToken_(u, true);
    log_(u.id, u.nick, 'パスワード変更', '');
    return { token };
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
    const row = [txt_(w.週ID), u.id, txt_(u.nick), picks[0], picks[1], picks[2], bet, new Date()];
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
  // --- 画面で起きたエラーを受け取る（ログインしていなくても送れるので、量と長さを制限する） ---
  clientError(r) {
    const msg = String(r.msg || '').slice(0, 300);
    if (!msg || /^Script error\.?$/i.test(msg) || /ResizeObserver/i.test(msg)) return {};
    const props = PropertiesService.getScriptProperties();
    const slot = String(Math.floor(Date.now() / 600000)); // 10分ごとの枠
    const used = props.getProperty('clientErrorSlot') === slot ? Number(props.getProperty('clientErrorCount') || 0) : 0;
    if (used >= 30) return {}; // 10分に30件まで（それ以上は捨てる）
    props.setProperties({ clientErrorSlot: slot, clientErrorCount: String(used + 1) });
    const detail = ['画面: ' + String(r.page || '').slice(0, 200), '端末: ' + String(r.ua || '').slice(0, 200), String(r.detail || '').slice(0, 1500)].join('\n');
    reportError_('画面', String(r.where || '').slice(0, 50), msg, detail);
    return {};
  },
  // --- 問い合わせ（メニューから。シートに記録してオーナーにメール） ---
  contact(r) {
    const u = auth_(r);
    const kind = String(r.kind || '');
    if (CONTACT_KINDS.indexOf(kind) < 0) fail_('種類を選んでください');
    const body = String(r.body || '').trim();
    if (body.length < 5) fail_('内容を5文字以上で書いてください');
    if (body.length > 1000) fail_('内容は1000文字までです');
    const hourAgo = Date.now() - 3600000;
    const recent = rowsAuto_('問い合わせ').filter(x => x.参加者ID === u.id && new Date(x.日時).getTime() > hourAgo).length;
    if (recent >= 5) fail_('問い合わせは1時間に5件までです。少し時間をおいてから送ってください');
    sheet_('問い合わせ').appendRow([new Date(), u.id, txt_(u.nick), kind, txt_(body), '']);
    log_(u.id, u.nick, '問い合わせ', kind);
    try { notifyContact_(u, kind, body); } catch (e) { reportError_('サーバー', 'contact', '問い合わせのメールを送れませんでした：' + e.message, e.stack); }
    return {};
  },
  // --- pt補充（持ち点が100pt未満のとき） ---
  quizStart(r) {
    const u = auth_(r);
    const db = load_();
    if (balance_(u, db) >= REFILL_LINE) fail_('持ち点が' + REFILL_LINE + 'pt以上あるので、いまは補充できません');
    const qs = quizRows_().filter(q => q.使う === true || q.使う === 'TRUE');
    if (qs.length < 3) fail_('クイズの問題が足りません。ホストに伝えてください');
    return { pt: refillPt_('quiz'), questions: shuffle_(qs).slice(0, 3).map(q => {
      const keys = ['A', 'B', 'C', 'D'].filter(k => String(q[k]).trim() !== '');
      const order = shuffle_(keys);
      return { id: q.ID, q: String(q.問題), choices: order.map(k => String(q[k])), answer: order.indexOf(String(q.正解).trim().toUpperCase()), note: String(q.解説) };
    }) };
  },
  refill(r) {
    const u = auth_(r);
    const db = load_();
    const before = balance_(u, db);
    if (before >= REFILL_LINE) fail_('持ち点が' + REFILL_LINE + 'pt以上あるので、いまは補充できません');
    const method = r.method === 'review' ? 'review' : r.method === 'quiz' ? 'quiz' : fail_('補充の方法を選んでください');
    let label = 'クイズ';
    if (method === 'quiz') {
      const score = Math.max(0, Math.min(3, Math.floor(Number(r.score) || 0)));
      label = 'クイズ（' + score + '/3）';
    } else {
      const a = r.answers || {};
      const first = !rowsAuto_('レビュー').some(x => x.参加者ID === u.id);
      const pick = (v, list, name) => { v = String(v || ''); if (list.indexOf(v) < 0) fail_(name + 'を選んでください'); return v; };
      const text = (v, max) => String(v || '').trim().slice(0, max);
      const body = text(a.body, 1000);
      if (body.length < 20) fail_('感想は20文字以上で書いてください');
      const bug = pick(a.bug, REVIEW_OPT.bug, '表示や動きでおかしなところがあったか');
      const bugText = text(a.bugText, 1000);
      if (bug === 'あった' && !bugText) fail_('おかしなところの内容を書いてください');
      const understood = first ? pick(a.understood, REVIEW_OPT.understood, '遊び方が分かったか') : '';
      const topic = first ? '' : pick(a.topic, REVIEW_OPT.topics, '書きたいこと');
      const bal = first ? '' : pick(a.balance, REVIEW_OPT.balance, '配当のバランス');
      sheet_('レビュー').appendRow([new Date(), u.id, txt_(u.nick), first ? '初回' : '2回目以降', understood, topic, txt_(body), bal, bug, txt_(bug === 'あった' ? bugText : ''), txt_(text(a.note, 1000))]);
      label = 'レビュー';
    }
    const pt = refillPt_(method);
    setUserCell_(u, '補充pt', (Number(u.add) || 0) + pt);
    sheet_('補充').appendRow([new Date(), u.id, txt_(u.nick), label, pt]);
    log_(u.id, u.nick, '補充', label + ' / ' + pt + 'pt');
    return { pt, balance: before + pt };
  },
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
        menus: livePop_((o => db.menus.filter(m => m.週ID === w.週ID).sort((a, b) => a.人気 - b.人気).map(m => ({ waku: Number(m.枠), name: m.品名, pop: Number(m.人気), basePop: Number(m.人気), odds: o[Number(m.枠)], base: Number(m.オッズ) })))(oddsMap_(db, w))),
        oddsLive: new Date() < new Date(w.締切),
        results: resultsOf_(db, w.週ID),
        predCount: db.preds.filter(p => p.週ID === w.週ID).length,
        closed: new Date() >= new Date(w.締切),
      };
    }
    // 最近7日の補充
    const since = Date.now() - 7 * 864e5;
    out.refills = rowsAuto_('補充').filter(x => new Date(x.日時).getTime() >= since).sort((a, b) => new Date(b.日時) - new Date(a.日時))
      .map(x => ({ at: toIso_(x.日時), nick: String(x.ニックネーム), method: String(x.方法), pt: Number(x.pt) }));
    return out;
  },
  saveWeek(r) {
    const u = authHost_(r);
    const db = load_();
    const weekId = String(r.weekId || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekId)) fail_('開催日（火曜）を選んでください');
    { const [y, mo, d] = weekId.split('-').map(Number); if (new Date(y, mo - 1, d).getDay() !== 2) fail_('開催日は火曜日を選んでください'); }
    const raceName = String(r.raceName || '').trim() || '昼中華ステークス';
    const deadline = new Date(r.deadline);
    if (isNaN(deadline)) fail_('締切の日時を入れてください');
    const menus = (r.menus || []).map(m => String(m.name || '').trim()).filter(Boolean);
    let w = db.weeks.find(x => x.週ID === weekId);
    if (w && w.状態 !== '下書き' && w.状態 !== '受付中') fail_('この週はもう確定しています');
    const published = w && w.状態 === '受付中';
    // 締切を過ぎた週は、締切の日時を動かせない（あとから締切を延ばして予想を受け付け直すのを防ぐ）
    if (published && w.締切 && new Date() >= new Date(w.締切) && deadline.getTime() !== new Date(w.締切).getTime()) {
      fail_('締切を過ぎた週は、締切を変えられません');
    }
    const hasPreds = db.preds.some(p => p.週ID === weekId);
    if (published && hasPreds && JSON.stringify(menuNames_(db, weekId)) !== JSON.stringify((r.menus || []).map(m => [Number(m.waku), String(m.name).trim()]))) {
      fail_('予想が入ったあとはメニューと人気順を変えられません');
    }
    if (menus.length < 2) fail_('メニューを2品以上入れてください');
    const status = r.publish ? '受付中' : (w ? w.状態 : '下書き');
    const round = roundFor_(db, raceName, weekId);
    const row = [txt_(weekId), txt_(raceName), round, status, txt_(String(r.mumble || '').trim()), deadline, w ? w.担当ホストID || u.id : u.id, txt_(w ? w.担当ホスト || u.nick : u.nick),
      status === '受付中' ? (w && w.公開日時 ? w.公開日時 : new Date()) : '', ''];
    if (w) sheet_('週').getRange(w._row, 1, 1, row.length).setValues([row]);
    else sheet_('週').appendRow(row);
    // メニューを書き直す（人気順＝送られてきた順、枠＝足した順）
    if (!(published && hasPreds)) {
      deleteRows_('メニュー', db.menus.filter(m => m.週ID === weekId).map(m => m._row));
      // 枠は1から詰め直す（空欄の行や消したメニューがあっても、1,2,3…と連番になるように。並びは足した順のまま）
      const items = (r.menus || []).filter(m => String(m.name || '').trim());
      const wmap = {}; items.map(m => Number(m.waku)).sort((x, y) => x - y).forEach((k, i) => { wmap[k] = i + 1; });
      const rows = items.map((m, i) => [txt_(weekId), wmap[Number(m.waku)], txt_(String(m.name).trim()), i + 1, oddsFor_(i + 1)]);
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
    const row = [txt_(w.週ID), day, waku, txt_(name), photoId || (prev && waku === Number(prev.枠) ? prev.写真ID : ''), new Date()];
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
    Object.assign(odds, oddsMap_(db, w));// 締切時点の投票で補正した倍率（締切後は予想が変わらないので、ここで確定）
    const rows = db.preds.filter(p => p.週ID === w.週ID).map(p => {
      const bet = Number(p.使うpt);
      const pk = DAYS.map(d => Number(p[d]));
      if (cancelled) return [txt_(w.週ID), p.参加者ID, txt_(String(p.ニックネーム)), 0, 0, 0, 0, bet, bet, 0];
      const daily = DAYS.map((d, i) => pk[i] === res[d] ? Math.floor(bet / 3 * odds[pk[i]]) : 0);
      const allHit = DAYS.every((d, i) => pk[i] === res[d]);
      const triple = allHit ? Math.floor(bet * odds[pk[0]] * odds[pk[1]] * odds[pk[2]]) : 0;
      const total = daily[0] + daily[1] + daily[2] + triple;
      return [txt_(w.週ID), p.参加者ID, txt_(String(p.ニックネーム)), daily[0], daily[1], daily[2], triple, 0, total, total - bet];
    });
    deleteRows_('獲得pt', db.earn.filter(x => x.週ID === w.週ID).map(x => x._row));
    if (rows.length) sheet_('獲得pt').getRange(sheet_('獲得pt').getLastRow() + 1, 1, rows.length, 10).setValues(rows);
    // 確定した倍率をメニューシートに記録しておく
    const msh = sheet_('メニュー');
    if (msh.getRange(1, 6).getValue() === '') msh.getRange(1, 6).setValue('確定オッズ');
    db.menus.filter(m => m.週ID === w.週ID).forEach(m => msh.getRange(m._row, 6).setValue(odds[Number(m.枠)]));
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
    .map(m => ({ waku: Number(m.枠), name: m.品名, pop: Number(m.人気), basePop: Number(m.人気), odds: 0, base: Number(m.オッズ) }));
  const om = oddsMap_(db, w); menus.forEach(m => m.odds = om[m.waku]); livePop_(menus);
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
    closed: new Date() >= new Date(w.締切), isMyHostWeek: w.担当ホストID === u.id, oddsLive: w.状態 === '受付中' && new Date() < new Date(w.締切),
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
  const me = { id: u.id, nick: u.nick, isHost: u.host === true || u.host === 'TRUE', balance: balance_(u, db) };
  me.canRefill = me.balance < REFILL_LINE;
  me.refillPt = { quiz: refillPt_('quiz'), review: refillPt_('review') };
  if (me.canRefill) me.reviewed = rowsAuto_('レビュー').some(x => x.参加者ID === u.id);
  return me;
}
function refillPt_(method) {
  const v = Number(getSetting_(method === 'quiz' ? 'クイズの補充pt' : 'レビューの補充pt'));
  return v > 0 ? Math.floor(v) : (method === 'quiz' ? 5000 : 15000);
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
  // その週がもう確定済みなら、さらに次の火曜にする
  for (let i = 0; i < 52; i++) {
    const id = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const w = db.weeks.find(x => x.週ID === id);
    if (!w || w.状態 === '下書き' || w.状態 === '受付中') return id;
    d.setDate(d.getDate() + 7);
  }
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
// 人気順の倍率を、予想の偏りで補正する（使ったptが多く集まった品は下がり、少ない品は上がる）
// ・1回の予想は、火・水・木それぞれに「使うptの1/3」ずつ入る　・3日分をまとめて数える
// ・各品に最初から「仮の重み」（設定「オッズの動きにくさ」のpt）を入れておき、少ないptでは動きすぎないようにする
//   （固定のptなので、たくさんptを使うほどオッズがよく動く）
// ・補正は基本の0.6倍〜1.6倍まで　・確定した週は記録した倍率を使う
const ODDS_ADJ = { prior: 1000, min: 0.6, max: 1.6, floor: 1.1 };
function oddsMap_(db, w) {
  const menus = db.menus.filter(m => m.週ID === w.週ID);
  const out = {};
  if (w.状態 === '確定' || w.状態 === '返還') {
    // 確定した週は記録した倍率（この機能より前に確定した週は、そのとき使った基本の倍率）
    const has = menus.length && menus.every(m => m.確定オッズ !== '' && m.確定オッズ !== undefined && m.確定オッズ !== null);
    menus.forEach(m => out[Number(m.枠)] = Number(has ? m.確定オッズ : m.オッズ)); return out;
  }
  const wt = {}; menus.forEach(m => wt[Number(m.枠)] = 0);
  db.preds.filter(p => p.週ID === w.週ID).forEach(p => {
    const share = Number(p.使うpt || 0) / 3;
    DAYS.forEach(d => { const k = Number(p[d]); if (k in wt) wt[k] += share; });
  });
  const total = Object.keys(wt).reduce((a, k) => a + wt[k], 0);
  const avg = menus.length ? total / menus.length : 0;
  const ps = Number(getSetting_('オッズの動きにくさ'));
  const prior = ps > 0 ? ps : ODDS_ADJ.prior; // 仮の重み（設定がなければ1000pt）
  menus.forEach(m => {
    const base = Number(m.オッズ), k = Number(m.枠);
    if (!total) { out[k] = base; return; }
    const f = Math.min(ODDS_ADJ.max, Math.max(ODDS_ADJ.min, Math.sqrt((avg + prior) / (wt[k] + prior))));
    const o = Math.max(ODDS_ADJ.floor, base * f);
    out[k] = o < 10 ? Math.round(o * 10) / 10 : Math.round(o);
  });
  return out;
}
// 「○番人気」は、いまの倍率の低い順に付け直す（同じ倍率ならホストが並べた順）
function livePop_(menus) {
  menus.slice().sort((a, b) => a.odds - b.odds || a.basePop - b.basePop).forEach((m, i) => { m.pop = i + 1; });
  return menus;
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
  if (tokenExpired_(u)) fail_('しばらく使っていなかったため、もう一度ログインしてください');
  touchToken_(u, false);
  return u;
}
// ログイン鍵（自動ログイン）の有効期限：最後に使ってから30日。使うたびに延びる
// 最後に使った日時はスクリプトのプロパティ「tokenUsed_参加者ID」に入れる（1時間に1回だけ書き込む）
// ある人の自動ログインをすぐ止めたいときは、参加者シートのその人の「ログイン鍵」のセルを消す
const TOKEN_IDLE_MS = 30 * 24 * 60 * 60 * 1000;
function tokenExpired_(u) {
  const last = Number(PropertiesService.getScriptProperties().getProperty('tokenUsed_' + u.id) || 0);
  return last > 0 && Date.now() - last > TOKEN_IDLE_MS;
}
function touchToken_(u, force) {
  const props = PropertiesService.getScriptProperties();
  const key = 'tokenUsed_' + u.id;
  const last = Number(props.getProperty(key) || 0);
  if (force || !last || Date.now() - last > 3600000) props.setProperty(key, String(Date.now()));
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh && AUTO_SHEETS.indexOf(name) >= 0) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]).setFontWeight('bold').setBackground('#E9F1EB');
    sh.setFrozenRows(1);
  }
  if (!sh) fail_('シート「' + name + '」がありません。初期設定を実行してください');
  return sh;
}
// 自動で作るシートを読む（まだ無いときは作らずに空として扱う）
function rowsAuto_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name) ? rows_(name) : [];
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
// 設定シートは1回の呼び出しにつき1度だけ読む
let SETTINGS_ = null;
function getSetting_(key) {
  if (!SETTINGS_) {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('設定');
    SETTINGS_ = {};
    sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 2).getValues().forEach(x => { if (x[0] !== '') SETTINGS_[x[0]] = x[1]; });
  }
  return SETTINGS_[key] !== undefined ? SETTINGS_[key] : '';
}
function setSetting_(key, val) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('設定');
  const vals = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 1).getValues();
  const i = vals.findIndex(x => x[0] === key);
  if (i >= 0) sh.getRange(i + 2, 2).setValue(val); else sh.appendRow([key, val, '']);
  SETTINGS_ = null;
}
// ===== パスワードの回数ロック =====
// 同じニックネームで続けて5回まちがえると、15分間ログインできなくなります（正しいパスワードでも不可）。
// まちがいの回数は、最後のまちがいから15分たつか、ログインに成功すると0に戻ります。
// すぐ解除したいときは、エディタで関数「ログインロックを解除する」を実行します。
const LOGIN_MAX_FAIL = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
function loginKey_(u) { return 'loginFail_' + u.id; }
function loginState_(u) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(loginKey_(u)) || '{}'); } catch (e) { return {}; }
}
function checkLoginLock_(u) {
  const st = loginState_(u);
  const left = Number(st.until || 0) - Date.now();
  if (left > 0) fail_('パスワードを' + LOGIN_MAX_FAIL + '回まちがえたため、あと' + Math.ceil(left / 60000) + '分ログインできません。時間をおいてからやり直してください');
}
function loginFailed_(u) {
  const props = PropertiesService.getScriptProperties();
  const st = loginState_(u);
  const now = Date.now();
  const n = (now - Number(st.last || 0) < LOGIN_LOCK_MS ? Number(st.n || 0) : 0) + 1;
  if (n >= LOGIN_MAX_FAIL) {
    props.setProperty(loginKey_(u), JSON.stringify({ n: 0, last: 0, until: now + LOGIN_LOCK_MS }));
    log_(u.id, u.nick, 'ログインロック', 'パスワードを' + LOGIN_MAX_FAIL + '回まちがえたため15分ロック');
    fail_('パスワードを' + LOGIN_MAX_FAIL + '回まちがえたため、15分間ログインできません。時間をおいてからやり直してください');
  }
  props.setProperty(loginKey_(u), JSON.stringify({ n, last: now, until: 0 }));
  const rest = LOGIN_MAX_FAIL - n;
  fail_('ニックネームかパスワードがちがいます' + (rest <= 2 ? '（あと' + rest + '回まちがえると、15分間ログインできなくなります）' : ''));
}
function clearLoginFail_(u) {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty(loginKey_(u)) !== null) props.deleteProperty(loginKey_(u));
}
function ログインロックを解除する() {
  const props = PropertiesService.getScriptProperties();
  const keys = props.getKeys().filter(k => k.indexOf('loginFail_') === 0);
  keys.forEach(k => props.deleteProperty(k));
  Logger.log('ログインのロックとまちがいの回数をすべて解除しました（' + keys.length + '人分）');
}

function log_(id, nick, op, detail) { sheet_('ログ').appendRow([new Date(), id, txt_(String(nick)), op, txt_(String(detail))]); }
// 入力された文字は、スプレッドシートに数字・日付・数式として解釈されないよう文字のまま書く
// （先頭の ' はセルには表示されず、読み出した値にも含まれない）
function txt_(v) { return typeof v === 'string' && v !== '' ? "'" + v : v; }
function toIso_(v) { return v instanceof Date ? v.toISOString() : (v ? new Date(v).toISOString() : ''); }

function shuffle_(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// クイズの問題（シートが空なら、最初の問題集を書き込む）
function quizRows_() {
  let qs = rows_('クイズ');
  if (!qs.length) {
    const sh = sheet_('クイズ');
    sh.getRange(2, 1, QUIZ_SEED.length, 11).setValues(QUIZ_SEED.map(q => q.map(txt_).concat([true])));
    sh.getRange(2, 11, QUIZ_SEED.length, 1).insertCheckboxes();
    qs = rows_('クイズ');
  }
  return qs;
}

// ===== エラーの記録と通知 =====
// エラーは「エラー」シートに1件1行で残し、メールでも知らせる（メールは1時間に1通まで。その間のエラーは次のメールに件数を書く）
// メールを送るには、最初に1回だけエディタで関数「エラー通知のテスト」を実行して許可する
function reportError_(kind, action, message, detail) {
  try {
    sheet_('エラー').appendRow([new Date(), kind, txt_(String(action || '')), txt_(String(message || '').slice(0, 1000)), txt_(String(detail || '').slice(0, 3000))]);
  } catch (e) { console.error(e); }
  try { notifyError_(kind, action, message); } catch (e) { console.error(e); }
}
// テスト用のスプレッドシート（名前に「テスト」を含む）から送るメールには印を付ける
// テスト環境で作るフォルダの名前に付ける印（本番のフォルダと見分けるため）
function envSuffix_() { try { return /テスト/.test(SpreadsheetApp.getActiveSpreadsheet().getName()) ? '（テスト）' : ''; } catch (e) { return ''; } }
function mailTag_() { try { return /テスト/.test(SpreadsheetApp.getActiveSpreadsheet().getName()) ? '［テスト環境］' : ''; } catch (e) { return ''; } }
// 問い合わせのメール（宛先はエラー通知と同じ）
function notifyContact_(u, kind, body) {
  const to = String(getSetting_('エラー通知先') || '').trim() || Session.getEffectiveUser().getEmail();
  if (!to) return;
  const text = [
    '昼中華3連単に問い合わせが届きました。',
    '',
    '日時：' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
    'ニックネーム：' + u.nick,
    '種類：' + kind,
    '',
    body,
    '',
    '「問い合わせ」シートにも記録しています。',
    SpreadsheetApp.getActiveSpreadsheet().getUrl(),
  ].join('\n');
  MailApp.sendEmail(to, mailTag_() + '【昼中華3連単】問い合わせ（' + kind + '）' + u.nick + 'さんから', text);
}
function notifyError_(kind, action, message, force) {
  const props = PropertiesService.getScriptProperties();
  const now = Date.now();
  const last = Number(props.getProperty('lastErrorMail') || 0);
  if (!force && now - last < 3600000) {
    props.setProperty('suppressedErrors', String(Number(props.getProperty('suppressedErrors') || 0) + 1));
    return false;
  }
  const to = String(getSetting_('エラー通知先') || '').trim() || Session.getEffectiveUser().getEmail();
  if (!to) return false;
  const skipped = Number(props.getProperty('suppressedErrors') || 0);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const body = [
    '昼中華3連単でエラーが起きました。',
    '',
    '日時：' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
    '場所：' + kind + (action ? '（' + action + '）' : ''),
    '内容：' + String(message || '').slice(0, 500),
    skipped ? '前回のメールのあとに起きたエラー：' + skipped + '件（エラーシートに記録済み）' : '',
    '',
    '詳しくはスプレッドシートの「エラー」シートを見てください。',
    ss.getUrl(),
    '',
    '※このメールは1時間に1通までです。',
  ].filter(x => x !== null).join('\n');
  MailApp.sendEmail(to, mailTag_() + '【昼中華3連単】エラーが起きました', body);
  props.setProperties({ lastErrorMail: String(now), suppressedErrors: '0' });
  return true;
}
// 最初に1回だけエディタから実行して、メール送信を許可する（テストのメールが届きます）
function エラー通知のテスト() {
  const msg = 'これはテストです。このメールが届いていれば、エラー通知は使えます。';
  sheet_('エラー').appendRow([new Date(), 'テスト', '', msg, '関数「エラー通知のテスト」から記録（この行は消してかまいません）']);
  notifyError_('テスト', '', msg, true);
  Logger.log('エラーシートに1行記録し、テストのメールを送りました');
}

// ===== バックアップ =====
// 「バックアップを設定する」を1回だけ手で実行すると、毎週金曜の朝5時ごろに自動でバックアップを取ります。
// すぐ1回取りたいときは「バックアップを取る」を実行します。
// 保存先：オーナーのドライブの「昼中華3連単のバックアップ」フォルダ（共有しないこと）
// 戻すとき：バックアップのファイルを開き、戻したいシートの中身を元のスプレッドシートに貼り戻す（ファイルの乗り換えはしない）
const BACKUP_PREFIX = '昼中華3連単_バックアップ_';
function バックアップを設定する() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '定期バックアップ').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('定期バックアップ').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(5).create();
  const r = backup_();
  Logger.log('毎週金曜の朝にバックアップを取るように設定しました。1回目：' + r.name);
}
function バックアップを取る() {
  const r = backup_();
  Logger.log('バックアップを取りました：' + r.name + '（' + r.kept + '件を保存中、' + r.removed + '件をゴミ箱へ）');
}
function 定期バックアップ() {
  try { backup_(); } catch (e) { reportError_('バックアップ', '定期バックアップ', e && e.message || String(e), e && e.stack || ''); throw e; }
}
function backup_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let folder = null;
  const fid = getSetting_('バックアップフォルダID');
  if (fid) { try { folder = DriveApp.getFolderById(fid); } catch (e) { folder = null; } }
  if (!folder) {
    folder = DriveApp.createFolder('昼中華3連単のバックアップ' + envSuffix_());
    setSetting_('バックアップフォルダID', folder.getId());
  }
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
  const name = BACKUP_PREFIX + stamp;
  DriveApp.getFileById(ss.getId()).makeCopy(name, folder);
  // 古いものをゴミ箱へ（ゴミ箱からは30日間戻せる）
  const keep = Math.max(1, Math.floor(Number(getSetting_('バックアップの保存数')) || 8));
  const list = [];
  const it = folder.getFiles();
  while (it.hasNext()) { const f = it.next(); if (f.getName().indexOf(BACKUP_PREFIX) === 0 && !f.isTrashed()) list.push(f); }
  list.sort((a, b) => b.getDateCreated() - a.getDateCreated());
  const old = list.slice(keep);
  old.forEach(f => f.setTrashed(true));
  try { log_('', 'システム', 'バックアップ', name + '（古いもの' + old.length + '件をゴミ箱へ）'); } catch (e) {}
  return { name, kept: list.length - old.length, removed: old.length };
}

// ===== 豆知識クイズの最初の問題集（クイズシートが空のときだけ使う。以後はシートを直せば反映される） =====
const QUIZ_SEED = [
  [1, "中国の「八大菜系（8つの代表的な料理の系統）」に入っていないのは？", "湖南料理", "安徽料理", "福建料理", "雲南料理", "D", "8つは山東・四川・広東・江蘇・福建・浙江・湖南・安徽です。", "https://www.ourchinastory.com/zh/7336", "https://www.lingoace.com/zh/blog/ba-da-cai-xi/"],
  [2, "高級スープ「佛跳牆（ぶっちょうしょう）」は、どこの料理？", "広東", "福建", "北京", "四川", "B", "「あまりの香りに、お坊さんも塀を跳び越えてくる」という意味の名前の、福建の料理です。", "https://en.wikipedia.org/wiki/Fujian_cuisine", "https://macaro-ni.jp/33569?page=2"],
  [3, "豚の角煮「東坡肉（トンポーロー）」の名前のもとになった人物は？", "李白", "蘇軾（蘇東坡）", "諸葛亮", "杜甫", "B", "宋の時代の詩人・蘇軾（号は東坡）にちなむ料理とされています。", "https://gendai.media/articles/-/82023", "https://www.thenewslens.com/article/171569"],
  [4, "宮保鶏丁（鶏肉とピーナッツの炒め物）の「宮保」とは何？", "宮廷の保存食", "清の時代の役人の肩書き", "唐辛子の品種", "料理人の名前", "B", "好物にしていた清の役人・丁宝楨の肩書き「宮保」から付いた名前とされています。", "https://supertaste.tvbs.com.tw/hot/340600", "https://www.thenewslens.com/article/97690"],
  [5, "古い時代の餃子の現物が見つかった場所は？", "北京の宮殿跡", "西安の兵馬俑", "新疆トルファンのお墓", "上海の港", "C", "トルファンのアスターナ古墳群（唐の時代）から、乾いて固まった餃子が見つかっています。", "https://kzjjh.chinakongzi.org/English/CulturalHighlights/202402/t20240226_571270.htm", "https://archaeologynow.org/blog/a-lucky-food-for-lunar-new-year"],
  [6, "中華調味料「XO醤」が生まれたのは？", "1920年代の上海", "1950年代の台湾", "1980年代の香港", "2000年代の北京", "C", "1980年代の香港で生まれました。「XO」は高級ブランデーの等級から取った名前です。", "https://kotobank.jp/word/XO%E9%86%A4-445209", "https://guide.michelin.com/sg/en/article/dining-in/xo-sauce-recipe"],
  [7, "担担麺の名前の由来は？", "担当の料理人の名前", "天秤棒で担いで売り歩いたこと", "「たんたん」と鳴る鍋の音", "2つの味を重ねること", "B", "天秤棒（担子）で担いで売り歩いたことから、この名前になったとされています。", "https://dic.nicovideo.jp/a/%E6%8B%85%E3%80%85%E9%BA%BA", "https://allabout.co.jp/gm/gc/449080"],
  [8, "本場・四川の担担麺は、もともとどんな麺？", "スープたっぷり", "汁なし", "冷たいつけ麺", "焼きそば", "B", "本場の担担麺は汁なしが基本です。スープ入りは日本で広まった形とされています。", "https://dic.nicovideo.jp/a/%E6%8B%85%E3%80%85%E9%BA%BA", "https://allabout.co.jp/gm/gc/449080"],
  [9, "北京ダックの老舗「全聚徳」が創業したのは何年？", "1864年", "1912年", "1949年", "1978年", "A", "清の同治3年（1864年）に北京で創業しました。", "https://www.visitbeijing.com.cn/article/4CqjgRFyqJh", "https://paper.people.com.cn/rmzk/html/2018-03/28/content_1844435.htm"],
  [10, "麻婆豆腐が生まれた都市は？", "重慶", "成都", "昆明", "長沙", "B", "清の時代の成都で、陳というおかみさんの店で生まれたとされています。", "https://www.daily.co.jp/society/life/2026/09/08/0020795387.shtml", "https://britishchinesefoodculture.org.uk/recipes/vegetarian/186-ma-po-tofu"],
  [11, "本場の麻婆豆腐に、もともと使われていた肉は？", "豚ひき肉", "牛肉", "鶏ひき肉", "羊肉", "B", "伝統的な麻婆豆腐は牛肉を使います。日本では豚ひき肉が一般的です。", "https://www.daily.co.jp/society/life/2026/09/08/0020795387.shtml", "https://britishchinesefoodculture.org.uk/recipes/vegetarian/186-ma-po-tofu"],
  [12, "小籠包の発祥とされる上海近郊の町は？", "南翔", "朱家角", "周荘", "烏鎮", "A", "上海郊外の南翔鎮が発祥とされ、「南翔小籠」の名で知られています。", "https://macaro-ni.jp/37691", "https://www.tour.ne.jp/w_review/SHA/sightseeing/spot/112732/"],
  [13, "皮蛋（ピータン）は、主に何の卵から作られる？", "ニワトリ", "アヒル", "ウズラ", "ガチョウ", "B", "主にアヒルの卵を、石灰や灰などを混ぜた泥で包んで作ります。", "https://kotobank.jp/word/%E3%81%B4%E3%83%BC%E3%81%9F%E3%82%93-3166428", "https://www.theworldofchinese.com/post/eggs-traordinary-recipes/"],
  [14, "皮蛋の別名「松花蛋」の由来は？", "松の木の下で作るから", "白身に松の花のような模様が出るから", "松の実が入っているから", "松花江の名物だから", "B", "白身に、松の花のような模様が出ることから付いた名前です。", "https://kotobank.jp/word/%E3%81%B4%E3%83%BC%E3%81%9F%E3%82%93-3166428", "https://www.theworldofchinese.com/post/eggs-traordinary-recipes/"],
  [15, "高級食材「燕の巣」は、何でできている？", "ツバメが集めた海藻", "アナツバメの唾液", "ツバメのひなの羽", "岩にできる苔", "B", "アナツバメが唾液で固めて作った巣を、きれいにして食べます。", "https://kotobank.jp/word/%E3%82%A2%E3%83%8A%E3%83%84%E3%83%90%E3%83%A1", "https://macaro-ni.jp/83581?page=3"],
  [16, "杭州の名物「西湖醋魚」に、伝統的に使われる魚は？", "鯉", "草魚", "ナマズ", "スズキ", "B", "西湖でとれる草魚を使い、甘酢のあんをかけた料理です。", "https://en.wikipedia.org/wiki/West_Lake_Fish_in_Vinegar_Gravy", "https://www.eastchinatrip.com/ja/hangzhou-traditional-foods-guide/"],
  [17, "杭州の名物「龍井蝦仁」の「龍井」とは何？", "龍の形の井戸の水", "緑茶の茶葉", "地元の漁師の名前", "とろみの付け方", "B", "龍井茶（緑茶）の茶葉と一緒に、川エビをさっと炒めた料理です。", "https://www.eastchinatrip.com/ja/hangzhou-traditional-foods-guide/", "https://www.thehongkongcookery.com/2017/05/dragon-well-green-tea-shrimp-stir-fry.html"],
  [18, "蘇州の名物「松鼠桂魚」の「松鼠」とは、何の動物？", "イタチ", "リス", "ネズミ", "タヌキ", "B", "切れ目を入れて揚げた魚の形が、リス（松鼠）のように見えることから付いた名前です。", "https://theinfatuation.com/san-francisco/features/squirrel-fish-songshu-sf-bay-area", "https://goldthread2.com/food/200-year-old-recipe-chinese-sweet-and-sour-fish/article/3052028"],
  [19, "揚州料理の「獅子頭」とは、どんな料理？", "大きな肉団子", "ライオンの形のまんじゅう", "豚の頭の丸煮", "獅子舞のときのお菓子", "A", "大きな肉団子を、ライオンの頭に見立てた料理です。", "https://health.tvbs.com.tw/life/331382", "https://en.wikipedia.org/wiki/Huaiyang_cuisine"],
  [20, "「揚州炒飯」の揚州があるのは何省？", "浙江省", "江蘇省", "安徽省", "山東省", "B", "揚州は江蘇省の都市で、淮揚料理の中心地のひとつです。", "https://kotobank.jp/word/%E6%8F%9A%E5%B7%9E-653048", "https://en.wikipedia.org/wiki/Huaiyang_cuisine"],
  [21, "「狗不理（ゴウブリ）」は、どの都市の名物の肉まん？", "北京", "天津", "上海", "広州", "B", "清の時代から続く、天津の老舗の包子（肉まん）です。", "https://www.ihchina.cn/project_details/14644.html", "https://www.visitbeijing.com.cn/article/4EY8AWfgmCq"],
  [22, "削った生地を直接お湯に飛ばしてゆでる「刀削麺」は、何省の名物？", "山西省", "陝西省", "四川省", "河南省", "A", "山西省の名物で、生地のかたまりを包丁で削ってゆでます。", "https://serai.jp/gourmet/1209617", "https://www.waseda.jp/inst/weekly/news/2021/05/14/86112/"],
  [23, "「蘭州牛肉麺」の蘭州があるのは何省？", "甘粛省", "寧夏回族自治区", "青海省", "陝西省", "A", "蘭州は甘粛省の省都です。", "https://www.eastchinatrip.com/ja/china-city-guides/gansu-travel-guide/", "https://www.ourchinastory.com/zh/amp/4878"],
  [24, "スープに具を入れて食べる「過橋米線」は、どこの名物？", "雲南", "貴州", "広西", "湖南", "A", "雲南の名物で、熱いスープに米の麺（米線）や具を次々に入れて食べます。", "https://allabout.co.jp/gm/gc/436602/", "https://serai.jp/gourmet/1218698"],
  [25, "魚の頭に刻んだ唐辛子をのせて蒸す「剁椒魚頭」は、どこの料理？", "四川", "湖南", "江西", "広東", "B", "湖南料理の代表的な一品です。", "https://www.thenewslens.com/article/85584", "https://www.hunantoday.cn/news/xhn/201901/18032103.html"],
  [26, "「夫妻肺片」の「夫妻」とは？", "夫婦で食べる縁起物", "この料理を売っていた夫婦", "2種類の肉を合わせること", "結婚式の料理", "B", "成都でこの料理を売っていた夫婦にちなむ名前とされています。", "https://oggi.jp/6691694", "https://thewoksoflife.com/?p=41258"],
  [27, "「魚香肉絲」には、どんな魚が入っている？", "コイ", "フナ", "ウナギ", "魚は入っていない", "D", "「魚香」は四川の味付けの名前で、魚は入っていません。", "https://en.wikipedia.org/wiki/Yuxiang_shredded_pork", "https://www.thenewslens.com/article/119567"],
  [28, "四川料理「螞蟻上樹（アリの木登り）」で、木に見立てているものは？", "春雨", "セロリ", "ネギ", "木耳（キクラゲ）", "A", "春雨を木の枝に、からんだひき肉をアリに見立てた名前です。", "https://www.nikkan-gendai.com/articles/columns/2109", "https://adragonchef.com/ants-climbing-a-tree"],
  [29, "四川料理「口水鶏」の「口水」とは？", "口をすすぐ水", "よだれ", "スープ", "お酒", "B", "思わずよだれが出るほどおいしい、という意味の名前です。", "https://delishkitchen.tv/articles/1540", "https://kinarino.jp/cat4/29321"],
  [30, "八宝菜の「八」は、何を表している？", "ちょうど8種類の具", "たくさんの", "8月の料理", "8人分", "B", "「八」は「たくさん」という意味で、8種類と決まっているわけではありません。", "https://macaro-ni.jp/116461", "https://delishkitchen.tv/articles/2079"],
  [31, "中国の料理用語「油淋」とは、どんな調理法？", "油をかけながら揚げる", "油で煮込む", "油を引かずに焼く", "油に漬けて保存する", "A", "熱い油を何度もかけて、皮をパリッと仕上げる調理法です。", "https://macaro-ni.jp/115328", "https://pedia.3rd-in.co.jp/wiki/油淋鶏"],
  [32, "天津飯について正しいのは？", "天津の名物料理", "日本で生まれたとされる料理", "清の宮廷料理", "台湾の屋台料理", "B", "名前に「天津」と付きますが日本で生まれた料理で、中国には同じ料理はないといわれています。", "https://macaro-ni.jp/82854", "https://www.thenewslens.com/article/246859"],
  [33, "長崎ちゃんぽんを考案したとされる店は？", "四海楼", "江山楼", "会楽園", "萬順", "A", "明治時代、四海楼の陳平順が中国からの留学生のために考えたとされています。", "https://www.nippon.com/ja/guide-to-japan/gu900302/", "https://www.city.nagasaki.lg.jp/nagazine/hakken0310/index.html"],
  [34, "日本でエビチリや麻婆豆腐を広めた料理人は？", "周富徳", "陳建民", "譚彦彬", "王慶中", "B", "四川出身の陳建民が、日本人の口に合うようにアレンジして広めました。", "https://en.wikipedia.org/wiki/Chen_Kenmin", "https://agora-web.jp/?p=8748"],
  [35, "本場・四川の回鍋肉で、キャベツの代わりによく使われる野菜は？", "ピーマン", "葉にんにく（蒜苗）", "白菜", "もやし", "B", "本場では葉にんにくを使うのが一般的で、キャベツは日本で広まった形です。", "https://macaro-ni.jp/49342", "https://swa.city-osaka.ed.jp/e631370/weblog/116148533"],
  [36, "「回鍋肉」の「回鍋」とは、どういう意味？", "鍋を回しながら炒める", "一度ゆでた肉を、もう一度鍋に戻す", "回転テーブルで出す", "何度も鍋を振る", "B", "ゆでた豚肉を鍋に戻して炒めることから、この名前が付きました。", "https://macaro-ni.jp/46379", "https://swa.city-osaka.ed.jp/e631370/weblog/116148533"],
  [37, "しびれる辛さの「花椒（ホアジャオ）」は、何の仲間の植物？", "コショウ科", "ミカン科", "ナス科", "ショウガ科", "B", "花椒は、日本の山椒と同じミカン科の植物の実の皮です。", "https://macaro-ni.jp/44966", "https://panasonic.jp/life/food/110010.html"],
  [38, "星の形の香辛料「八角（スターアニス）」は、何という植物の実？", "トウシキミ", "クローブ", "シナモン", "ウイキョウ", "A", "トウシキミという木の実を乾かしたものです。", "https://delishkitchen.tv/articles/608", "https://www.ne.jp/asahi/hkm/aroma/staranise"],
  [39, "四川の調味料「豆板醤」の主な原料は？", "大豆", "そら豆", "小豆", "緑豆", "B", "伝統的な豆板醤は、そら豆を発酵させて作ります。", "https://macaro-ni.jp/122322", "https://osusume.mynavi.jp/articles/377/"],
  [40, "北京ダックに添える「甜麺醤」の主な原料は？", "大豆", "小麦粉", "米", "ごま", "B", "小麦粉に麹を加えて発酵させた、甘みのある味噌です。", "https://macaro-ni.jp/122322", "https://my-best.com/7628"],
  [41, "「豆豉（トウチ）」は、何を発酵させた調味料？", "黒豆（大豆）", "そら豆", "小麦", "米", "A", "黒豆（大豆）を蒸して発酵させ、乾かしたものです。", "https://delishkitchen.tv/articles/127", "https://chillcrispbyxueci.substack.com/p/deep-dive-douchi-fermented-soybeans"],
  [42, "オイスターソースを生み出したとされるのは？", "李錦記の創業者", "四海楼の創業者", "全聚徳の創業者", "味の素の創業者", "A", "1888年、広東の李錦裳がカキを煮詰めているうちに偶然生まれたとされています。", "https://hk.lkk.com/en/flavours-that-bind/stories/the-power-of-serendipity", "https://www.ourchinastory.com/en/15081"],
  [43, "紹興酒の主な原料は？", "もち米", "小麦", "高粱（コーリャン）", "とうもろこし", "A", "もち米と麦麹などで作る醸造酒で、浙江省紹興市の名産です。", "https://getnavi.jp/gourmet/519581/", "https://www.nta.go.jp/about/organization/tokyo/sake/abc/abc-other.htm"],
  [44, "中国の蒸留酒「茅台酒」の産地は何省？", "四川省", "貴州省", "山西省", "雲南省", "B", "貴州省の茅台鎮で造られる白酒です。", "https://forbesjapan.com/articles/detail/80019", "https://toyokeizai.net/articles/-/740320?display=b"],
  [45, "広東の飲茶で使われる言葉「一盅両件」の意味は？", "お茶1杯と点心2つ", "1人2皿まで", "1日2回の飲茶", "1つの蒸籠に2つ", "A", "お茶を1杯と、点心を2つ。昔ながらの飲茶の楽しみ方を表す言葉です。", "https://www.gz.gov.cn/zlgz/whgz/content/post_8576851.html", "https://m.sfccn.com/2022/9-22/3MMDE1MTNfMTc2MjY3Mg.html"],
  [46, "叉焼（チャーシュー）の「叉」は、何を表している？", "肉の切り方", "フォークのような串", "焼く時間", "タレの名前", "B", "フォークのような串（叉）に刺して焼くことから付いた名前です。", "https://precious.jp/articles/-/49780", "https://delishkitchen.tv/articles/1612"],
  [47, "点心「腸粉」の皮の主な原料は？", "小麦粉", "米", "じゃがいも", "緑豆", "B", "米をひいた生地を薄く蒸して、巻いた点心です。", "https://macaro-ni.jp/143083", "https://en.wikipedia.org/wiki/Rice_noodle_roll"],
  [48, "蝦餃（エビ蒸し餃子）の透き通った皮に使われるのは？", "もち米粉", "小麦でんぷん（浮き粉）", "葛粉", "タピオカ", "B", "小麦からでんぷんだけを取り出した「澄粉（浮き粉）」を使うので、透き通ります。", "https://macaro-ni.jp/42143", "https://www.thehongkongcookery.com/2023/08/crystal-skin-dim-sum-wrapper.html"],
  [49, "元宵節（旧暦1月15日）に食べる、甘い団子は？", "湯円（元宵）", "月餅", "粽子", "年糕", "A", "もち米粉の団子で、家族が丸く集まることを願って食べます。", "https://studycli.org/ja/chinese-holidays/lantern-festival/", "https://www.jbc-ltd.com/column/2026/01/29/lantern-festival/"],
  [50, "端午節のちまきは、誰をしのぶものとされている？", "孔子", "屈原", "項羽", "楊貴妃", "B", "川に身を投げた詩人・屈原をしのぶ風習が由来とされています。", "https://allabout.co.jp/gm/gc/79626/", "https://kotobank.jp/word/%E7%B2%BD-566475"],
  [51, "「臘八粥（ろうはちがゆ）」を食べるのは、旧暦の何月何日？", "1月1日", "5月5日", "8月15日", "12月8日", "D", "旧暦12月8日（臘八）に、穀物や豆、木の実を煮たおかゆを食べます。", "https://en.wikipedia.org/wiki/Laba_Festival", "https://www.taipeitimes.com/News/biz/archives/2024/01/09/2003812239"],
  [52, "清の宮廷料理「満漢全席」の「満」「漢」とは？", "満腹と漢方", "満州族と漢族", "満月と漢の時代", "満開と漢詩", "B", "満州族と漢族の料理を合わせた、豪華な宴席料理です。", "https://www.afpbb.com/articles/-/3404079", "https://delishkitchen.tv/articles/2644"],
  [53, "2つの味のスープを仕切って入れる火鍋「鴛鴦鍋」の「鴛鴦」とは？", "オシドリ", "ツバメ", "ツル", "クジャク", "A", "仲のよい夫婦のたとえのオシドリのように、2つで1組の鍋という意味です。", "https://kotobank.jp/word/%E9%B4%9B%E9%B4%A6-447323", "https://delishkitchen.tv/articles/2399"],
  [54, "甘酢あんの豚肉の揚げ物「鍋包肉」は、どこの料理？", "中国東北", "四川", "広東", "福建", "A", "ハルビンなど中国東北の料理で、日本の酢豚に似ています。", "https://www.eastchinatrip.com/ja/harbin-traditional-foods-guide/", "https://thewoksoflife.com/?p=21958"],
  [55, "東北の家庭料理「地三鮮」の3つの具は？", "じゃがいも・なす・ピーマン", "白菜・豆腐・春雨", "にんじん・大根・ごぼう", "トマト・卵・ネギ", "A", "じゃがいも・なす・ピーマンを揚げてから炒め合わせます。", "https://omnivorescookbook.com/di-san-xian-recipe/", "https://redhousespice.com/di-san-xian/"],
  [56, "新疆の羊肉串（羊の串焼き）に欠かせない香辛料は？", "クミン", "サフラン", "カルダモン", "ナツメグ", "A", "クミンと唐辛子をたっぷり振って焼くのが定番です。", "https://www.cathaypacific.com/cx/zh_HK/inspiration/dining/ultimate-guide-xinjiang-cuisine.html", "https://serai.jp/?p=1218906"],
  [57, "ゴマだれをからめる汁なし麺「熱乾麺」は、どの都市の名物？", "武漢", "成都", "西安", "南京", "A", "湖北省武漢の朝ごはんの定番です。", "https://serai.jp/gourmet/1218913", "https://macaro-ni.jp/70620"],
  [58, "広東料理の酢豚の中国語名は？", "咕咾肉", "東坡肉", "回鍋肉", "叉焼肉", "A", "広東では「咕咾肉（グーロウヨッ）」と呼ばれます。", "https://macaro-ni.jp/76580", "https://guide.michelin.com/tw/zh_TW/article/dining-out/trace-the-roots-sweet-and-sour-pork"],
  [59, "豆腐を考え出したと伝えられる人物は？", "劉安", "孔子", "秦の始皇帝", "蘇軾", "A", "漢の時代の淮南王・劉安が考え出したという言い伝えがあります。", "https://serai.jp/tour/167640", "https://www.ourchinastory.com/zh/5256"],
  [60, "春節に魚料理を食べる理由として、よく言われるのは？", "魚が一番安い季節だから", "「魚」と「余」が同じ発音だから", "川が凍って魚がとりやすいから", "魚が皇帝の好物だったから", "B", "「年年有余（毎年ゆとりがある）」の「余」と、「魚」の発音が同じだからです。", "https://studycli.org/ja/chinese-holidays/chinese-new-year/", "https://folklore.usc.edu/?p=88901"],
  [61, "「食は○○に在り」と言われる、食の都とされる都市は？", "北京", "上海", "広州", "成都", "C", "「食在広州」と言われ、広州は美食の街として知られています。", "https://www.afpbb.com/articles/-/3475780", "https://www.arukikata.co.jp/webmagazine/305365/"],
  [62, "中国語で「粤菜」と呼ばれるのは、どこの料理？", "広東料理", "四川料理", "山東料理", "江蘇料理", "A", "「粤」は広東の別名です。", "https://www.ourchinastory.com/zh/7336", "https://www.lingoace.com/zh/blog/ba-da-cai-xi/"],
  [63, "中国語で「魯菜」と呼ばれるのは、どこの料理？", "湖南料理", "山東料理", "福建料理", "安徽料理", "B", "「魯」は山東の別名です。", "https://www.ourchinastory.com/zh/7336", "https://www.lingoace.com/zh/blog/ba-da-cai-xi/"],
  [64, "中国語で「閩菜」と呼ばれるのは、どこの料理？", "浙江料理", "福建料理", "江西料理", "広西料理", "B", "「閩」は福建の別名です。", "https://www.lingoace.com/zh/blog/ba-da-cai-xi/", "https://en.wikipedia.org/wiki/Fujian_cuisine"],
  [65, "八大菜系のうち、北京の宮廷料理に大きな影響を与えたとされるのは？", "山東料理", "広東料理", "湖南料理", "浙江料理", "A", "山東料理は宮廷料理や北方の料理の土台になったとされています。", "https://www.ourchinastory.com/zh/7336", "https://delishkitchen.tv/articles/2644"],
  [66, "山東料理の名物「葱焼海参」の主な食材は？", "アワビ", "ナマコ", "フカヒレ", "ツバメの巣", "B", "ナマコをネギと一緒に煮込んだ料理です。", "https://www.lingoace.com/zh/blog/ba-da-cai-xi/", "https://www.thenewslens.com/article/149927"],
  [67, "唐辛子が中国に伝わったのは、いつ頃？", "漢の時代", "唐の時代", "明の時代の末ごろ", "清の時代の末ごろ", "C", "唐辛子はアメリカ大陸原産で、16世紀後半、明の時代の末ごろに中国に伝わりました。", "https://studycli.org/ja/chinese-culture/china-loves-chili-peppers/", "https://www.thepaper.cn/newsDetail_forward_11979837"],
  [68, "英語の「wok（中華鍋）」は、何語から来た言葉？", "北京語", "広東語", "上海語", "福建語", "B", "中華鍋を意味する広東語の「鑊（ウォック）」から来ています。", "https://en.wikipedia.org/wiki/Wok", "https://www.wiktionary.com/wiki/wok"],
  [69, "広東語の「鑊氣（ウォックヘイ）」とは？", "鍋を洗う湯気", "強火で炒めたときの香ばしさ", "鍋の重さ", "料理人の気合い", "B", "強い火力の中華鍋で炒めたときに生まれる、香ばしい風味のことです。", "https://en.wikipedia.org/wiki/Wok", "https://barrypopik.com/blog/wok_hei"],
  [70, "英語の「ketchup」の語源とされるのは？", "福建語の魚醤", "広東語のトマト", "マレー語の酢", "北京語の甘いたれ", "A", "福建語で魚醤を意味する言葉が語源とされています。", "https://en.wikipedia.org/wiki/Ketchup", "https://csmonitor.com/The-Culture/In-a-Word/2023/0410/The-origins-of-ketchup-or-catsup-run-through-fish-sauce"],
  [71, "炒め物「チャプスイ」が大流行し、中華料理の代名詞のようになった国は？", "中国", "アメリカ", "イギリス", "オーストラリア", "B", "広東の「雑砕（残りものの炒め物）」がもとで、移民とともにアメリカに渡り、中華料理店の定番として大流行しました。", "https://en.wikipedia.org/wiki/Chop_suey", "https://www.britannica.com/topic/chop-suey"],
  [72, "アメリカで人気の中華料理「左宗棠鶏（General Tso's chicken）」が考え出された場所は？", "台湾", "香港", "シンガポール", "マカオ", "A", "湖南出身の料理人・彭長貴が台湾で考え出し、のちにアメリカで大人気になりました。", "https://www.huffingtonpost.in/2016/12/02/chef-peng-chang-kuei-general-tsos-chicken-inventor-dies-at-98_a_21619669/", "https://avclub.com/r-i-p-peng-chang-keui-the-chinese-chef-who-invented-g-1798254973"],
  [73, "「饅頭（マントウ）」を考え出したと伝わる人物は？", "諸葛亮", "曹操", "劉備", "関羽", "A", "三国時代の諸葛亮が考え出したという言い伝えがあります。", "https://www.thenewslens.com/article/81609", "https://macaro-ni.jp/86796"],
  [74, "中国で「餃子」といえば、ふつうはどの餃子のこと？", "焼き餃子", "水餃子", "揚げ餃子", "蒸し餃子", "B", "中国では水餃子が一般的で、焼き餃子はあまり見かけません。", "https://allabout.co.jp/gm/gc/57407/", "https://kinarino.jp/cat4/32296"],
  [75, "香港のパン「菠蘿包（パイナップルパン）」に入っているパイナップルは？", "果肉", "ジャム", "果汁", "入っていない", "D", "表面の模様がパイナップルに見えるのが名前の由来で、パイナップルは入っていません。", "https://allabout.co.jp/gm/gc/472184", "https://pedia.3rd-in.co.jp/wiki/%E8%8F%A0%E8%98%BF%E5%8C%85"],
  [76, "香港式ミルクティーが「絲襪奶茶」と呼ばれる理由は？", "ストッキングのような布でこすから", "絹の袋に茶葉を入れて売るから", "絹のようになめらかだから", "靴下を編む職人が考えたから", "A", "こすための布が、茶色く染まったストッキングのように見えることから付いた名前です。", "https://en.wikipedia.org/wiki/Hong_Kong%E2%80%93style_milk_tea", "https://www.newsweekjapan.jp/articles/-/3350"],
  [77, "香港の飲み物「鴛鴦茶」は、何と何を混ぜたもの？", "紅茶とコーヒー", "緑茶とジャスミン茶", "豆乳と紅茶", "ウーロン茶とレモン", "A", "ミルクティーとコーヒーを合わせた飲み物です。", "https://en.wikipedia.org/wiki/Hong_Kong%E2%80%93style_milk_tea", "https://pedia.3rd-in.co.jp/wiki/%E9%B4%9B%E9%B4%A6%E8%8C%B6"],
  [78, "マカオのエッグタルトの元になったお菓子は、どこの国のもの？", "スペイン", "ポルトガル", "フランス", "イギリス", "B", "ポルトガルのエッグタルト「パステル・デ・ナタ」が元になっています。", "https://precious.jp/articles/-/11188", "https://allabout.co.jp/gm/gc/374004/"],
  [79, "杏仁豆腐の「杏仁」とは何？", "アーモンド", "アンズの種の中身", "ライチの実", "ココナッツ", "B", "アンズの種の中にある仁（杏仁）を使ったのが元の作り方です。", "https://delishkitchen.tv/articles/754", "https://macaro-ni.jp/34223"],
  [80, "中国料理の用語「勾芡」とは？", "油通し", "とろみ付け", "下味付け", "飾り切り", "B", "水溶き片栗粉などでとろみを付けることです。", "https://en.wikipedia.org/wiki/Chinese_cooking_techniques", "https://health.tvbs.com.tw/life/357702"],
  [81, "中国料理の下ごしらえ「油通し（過油）」とは？", "材料をさっと油にくぐらせること", "材料の油を湯で抜くこと", "鍋に油をなじませること", "油で長く煮込むこと", "A", "炒める前に材料をさっと油にくぐらせる下ごしらえで、野菜は色よく、肉はしっとり仕上がります。", "https://delishkitchen.tv/articles/849", "https://www.shibatashoten.co.jp/content/pdf/00601200.pdf"],
  [82, "中国料理の調理法「爆」とは？", "強火で一気に炒める", "弱火でじっくり煮る", "蒸してから焼く", "油で長く揚げる", "A", "ごく強い火で、短い時間で炒め上げる調理法です。", "https://www.foodnext.net/science/knowledge/paper/5357501591", "https://carryitlikeharry.com/explosively-stir-fried-fish-with-ginger-and/"],
  [83, "中国料理の「白切鶏」とは、どんな料理？", "鶏のから揚げ", "ゆで鶏", "鶏の丸焼き", "鶏の煮込み", "B", "鶏を焼かずにゆでて冷まし、ショウガやネギのたれで食べる、中国南部などで親しまれる料理です。", "https://en.wikipedia.org/wiki/White_cut_chicken", "https://omnivorescookbook.com/?p=42268"],
  [84, "シンガポール名物「海南鶏飯（チキンライス）」の「海南」とは？", "中国の海南島", "マレーシアの州の名前", "シンガポールの地区の名前", "考えた料理人の名前", "A", "海南島出身の華僑が、シンガポールやマレーシアなどに渡って広めた料理です。", "https://allabout.co.jp/gm/gc/224852/2/", "https://rurubu.jp/andmore/article/18892"],
  [85, "「棒棒鶏」の名前の由来とされるのは？", "棒状に切った鶏肉", "木の棒で叩いてやわらかくすること", "棒に刺して売ったこと", "棒のように細いきゅうり", "B", "ゆでた鶏肉を木の棒で叩いて、ほぐしやすくしたことに由来するとされています。", "https://pedia.3rd-in.co.jp/wiki/%E6%A3%92%E6%A3%92%E9%B6%8F", "https://oggi.jp/58671"],
  [86, "中国で、箸を置くときの一般的な向きは？", "体と平行（横向き）", "体に向かって縦向き", "斜め", "お皿の上に渡す", "B", "中国では箸を縦向きに置くのが一般的です。日本の横向きとは違います。", "https://allabout.co.jp/gm/gc/485253/", "https://agora-web.jp/?p=77245"],
  [87, "中国で誕生日に食べる、長寿を願う料理は？", "長寿麺", "月餅", "湯円", "ちまき", "A", "長い麺を長寿に見立てて食べます。", "https://studycli.org/ja/learn-chinese/happy-birthday-in-chinese/", "https://redhousespice.com/longevity-noodles/"],
  [88, "「麻辣」の「麻」は、どんな感覚？", "しびれ", "甘さ", "苦さ", "酸っぱさ", "A", "「麻」は花椒のしびれ、「辣」は唐辛子の辛さです。", "https://tokubai.co.jp/news/articles/1252", "https://news.nissyoku.co.jp/restaurant/hamada20260608045136659"],
  [89, "北京料理の「涮羊肉」とは？", "羊肉のしゃぶしゃぶ", "羊肉の串焼き", "羊肉の餃子", "羊肉の煮込み", "A", "銅の鍋で薄切りの羊肉をくぐらせて食べる、北京の冬の名物です。", "https://www.commonhealth.com.tw/article/80461", "https://www.visitbeijing.com.cn/article/47QmSzNqTH2"],
  [90, "「紹興酒」を産する紹興市があるのは何省？", "江蘇省", "浙江省", "福建省", "安徽省", "B", "紹興市は浙江省にあります。", "https://getnavi.jp/gourmet/519581/", "https://www.nta.go.jp/about/organization/tokyo/sake/abc/abc-other.htm"],
  [91, "中国料理で「拔絲」と呼ばれる調理法は？", "あめをからめて糸を引かせる", "細く糸のように切る", "糸で縛って煮る", "麺を手で延ばす", "A", "熱したあめをからめ、持ち上げると糸を引くように仕上げる料理です（例：拔絲地瓜）。", "https://www.foodnext.net/life/culture/paper/5852708048", "https://www.shibatashoten.co.jp/content/pdf/00601200.pdf"],
  [92, "八大菜系の「徽菜」とは、どこの料理？", "安徽料理", "湖北料理", "江西料理", "河南料理", "A", "「徽」は安徽の別名です。", "https://www.ourchinastory.com/zh/7336", "https://www.lingoace.com/zh/blog/ba-da-cai-xi/"],
  [93, "江蘇料理を代表する「淮揚料理」の中心地のひとつは？", "揚州", "杭州", "福州", "長沙", "A", "揚州や淮安などを中心とした料理で、国の公式の宴席にも出されてきました。", "https://en.wikipedia.org/wiki/Huaiyang_cuisine", "https://www.ourchinastory.com/zh/3252"],
  [94, "月餅を食べる行事は？", "春節", "端午節", "中秋節", "清明節", "C", "中秋節（旧暦8月15日）に、月を見ながら食べます。", "https://honichi.com/news/2019/08/14/chinesegeppei", "https://delishkitchen.tv/articles/2679"],
  [95, "中国の「八大菜系」のうち、「湘菜」とはどこの料理？", "湖南料理", "湖北料理", "四川料理", "江西料理", "A", "「湘」は湖南の別名です。", "https://www.ourchinastory.com/zh/7336", "https://www.lingoace.com/zh/blog/ba-da-cai-xi/"],
  [96, "「火鍋」で有名な、四川と並ぶ激辛の街は？", "重慶", "昆明", "貴陽", "西安", "A", "重慶は火鍋で有名な街で、牛脂を使ったこってり辛い「重慶火鍋」が名物です。", "https://allabout.co.jp/gm/gc/458779/", "https://www.thenewslens.com/article/82839"],
  [97, "干し貝柱は、中国語で何と呼ばれる？", "干貝", "干鮑", "魚翅", "海参", "A", "干し貝柱は「干貝」。干鮑は干しアワビ、魚翅はフカヒレ、海参はナマコです。", "https://www.shibatashoten.co.jp/content/pdf/00610100.pdf", "https://toyokeizai.net/articles/-/11316?display=b"],
  [98, "高級食材「魚翅」とは？", "干しアワビ", "フカヒレ", "魚の浮き袋", "ナマコ", "B", "「魚翅」はフカヒレのことです。", "https://toyokeizai.net/articles/-/11316?display=b", "https://www.chinesepod.com/dictionary/鱼翅"],
  [99, "魚の浮き袋を干した高級食材は？", "花膠", "燕窩", "干貝", "海参", "A", "魚の浮き袋を干したものは「花膠」と呼ばれ、とろみのある食感です。", "https://guide.michelin.com/hk/zh_HK/article/features/ingredients_fish_maw", "https://www.shibatashoten.co.jp/content/pdf/00610100.pdf"],
  [100, "「乾焼蝦仁」を日本人向けにアレンジして生まれたとされる料理は？", "エビチリ", "エビマヨ", "エビ天", "エビシュウマイ", "A", "陳建民が四川の乾焼蝦仁をケチャップを使ってアレンジしたのが、エビチリの始まりとされています。", "https://agora-web.jp/?p=8748", "https://www.justonecookbook.com/?p=34365"]
];
