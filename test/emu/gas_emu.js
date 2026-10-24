// Google Apps Script の最小エミュレーター（テスト用）
// スプレッドシートの型変換（数字・日付・TRUE/FALSE・数式）も本物に近く真似る
// 使い方：const { ctx, SS, G } = require('./gas_emu.js')(Code.gsのパス)
const crypto = require('crypto');
const fs = require('fs');
function coerce(v, textFmt) {
  if (typeof v !== 'string') return v;
  if (v.startsWith("'")) return v.slice(1);
  if (textFmt) return v;
  if (v.startsWith('=')) return '#FORMULA(' + v + ')';
  if (/^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(v.trim()) && v.trim() !== '') return Number(v);
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(v)) { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); }
  if (/^\d{1,2}\/\d{1,2}$/.test(v)) { const [m, d] = v.split('/').map(Number); return new Date(new Date().getFullYear(), m - 1, d); }
  if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
  return v;
}
class Sheet {
  constructor(name) { this.name = name; this.data = []; this.textCols = new Set(); }
  getName() { return this.name; }
  ensure(r, c) { while (this.data.length < r) this.data.push([]); }
  cell(r, c) { const row = this.data[r - 1]; return row && row[c - 1] !== undefined ? row[c - 1] : ''; }
  set(r, c, v) { this.ensure(r); this.data[r - 1][c - 1] = coerce(v, this.textCols.has(c)); }
  getLastRow() { for (let i = this.data.length; i >= 1; i--) if ((this.data[i - 1] || []).some(x => x !== '' && x !== undefined)) return i; return 0; }
  getLastColumn() { let m = 0; this.data.forEach(r => r.forEach((x, j) => { if (x !== '' && x !== undefined) m = Math.max(m, j + 1); })); return m; }
  getRange(r, c, nr, nc) {
    if (typeof r === 'string') throw new Error('A1 not supported');
    if (r < 1 || c < 1 || (nr !== undefined && nr < 1) || (nc !== undefined && nc < 1)) throw new Error('範囲の座標が無効です: ' + [r, c, nr, nc]);
    return new Range(this, r, c, nr || 1, nc || 1);
  }
  appendRow(vals) { const r = this.getLastRow() + 1; vals.forEach((v, j) => this.set(r, j + 1, v)); return this; }
  deleteRow(r) { this.data.splice(r - 1, 1); return this; }
  setFrozenRows() { return this; }
}
class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() { const out = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) { const v = this.sh.cell(this.r + i, this.c + j); row.push(v instanceof Date ? new Date(v) : v); } out.push(row); } return out; }
  getValue() { return this.getValues()[0][0]; }
  setValues(v) { if (v.length !== this.nr || v.some(r => r.length !== this.nc)) throw new Error(`データの行数/列数が範囲と一致しません ${v.length}x${v[0] && v[0].length} vs ${this.nr}x${this.nc}`); v.forEach((row, i) => row.forEach((x, j) => this.sh.set(this.r + i, this.c + j, x))); return this; }
  setValue(x) { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sh.set(this.r + i, this.c + j, x); return this; }
  insertCheckboxes() { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) if (this.sh.cell(this.r + i, this.c + j) === '') this.sh.set(this.r + i, this.c + j, false); return this; }
  setNumberFormat(f) { if (f === '@') for (let j = 0; j < this.nc; j++) this.sh.textCols.add(this.c + j); return this; }
  setFontWeight() { return this; } setBackground() { return this; }
}
const SS = { name: '昼中華3連単', getName() { return this.name; }, getId: () => 'ss1', getUrl: () => 'https://docs.google.com/spreadsheets/d/ss1/edit', sheets: [new Sheet('シート1')],
  getSheetByName(n) { return this.sheets.find(s => s.name === n) || null; },
  insertSheet(n) { const s = new Sheet(n); this.sheets.push(s); return s; },
  getSheets() { return this.sheets; }, deleteSheet(s) { this.sheets = this.sheets.filter(x => x !== s); } };
const files = {};
const G = {
  SpreadsheetApp: { getActiveSpreadsheet: () => SS, getUi: null },
  Logger: { log: () => {} },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Session: { getScriptTimeZone: () => 'Asia/Tokyo', getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  MailApp: { sent: [], sendEmail(to, subject, body) { if (G.MailApp.fail) throw new Error('メール送信の許可がありません'); G.MailApp.sent.push({ to, subject, body }); } },
  PropertiesService: (() => { const p = {}; const o = { getProperty: k => (k in p ? p[k] : null), setProperty: (k, v) => { p[k] = String(v); return o; }, setProperties: m => { Object.keys(m).forEach(k => p[k] = String(m[k])); return o; }, deleteProperty: k => { delete p[k]; return o; }, getKeys: () => Object.keys(p), _p: p }; return { getScriptProperties: () => o }; })(),
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ content: s, setMimeType() { return this; } }) },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
    computeDigest: (alg, s) => [...crypto.createHash('sha256').update(s, 'utf8').digest()].map(b => b > 127 ? b - 256 : b),
    base64Decode: s => [...Buffer.from(s, 'base64')],
    newBlob: (bytes, mime, name) => ({ bytes, mime, name }),
    formatDate: (d, tz, f) => { const p = n => String(n).padStart(2, '0'); const x = new Date(d.toLocaleString('en-US', { timeZone: tz })); return f.replace('yyyy', x.getFullYear()).replace('MM', p(x.getMonth() + 1)).replace('dd', p(x.getDate())).replace('HH', p(x.getHours())).replace('mm', p(x.getMinutes())); },
  },
  DriveApp: (() => { const folders = {}; let n = 0, clock = 0;
    const mkFolder = name => { const id = 'bf' + (++n); const fl = { id, name, files: [], getId: () => id, createFile: b => { const fid = 'f' + Object.keys(files).length; files[fid] = b; return { getId: () => fid, setSharing() {} }; }, getFiles() { let i = 0; const a = fl.files; return { hasNext: () => i < a.length, next: () => a[i++] }; } }; folders[id] = fl; return fl; };
    const api = { Access: { ANYONE_WITH_LINK: 1 }, Permission: { VIEW: 1 }, createFolder: name => mkFolder(name), getFolderById: id => { if (!folders[id]) throw new Error('no folder ' + id); return folders[id]; },
      getFileById: id => ({ makeCopy: (name, folder) => { const f = { name, created: new Date(Date.now() + (clock++) * 1000), trashed: false, getName() { return this.name; }, getDateCreated() { return this.created; }, isTrashed() { return this.trashed; }, setTrashed(v) { this.trashed = v; } }; folder.files.push(f); return f; } }),
      _folders: folders };
    return api; })(),
  ScriptApp: (() => { const triggers = []; const b = { timeBased() { return b; }, onWeekDay(d) { b.d = d; return b; }, atHour(h) { b.h = h; return b; }, create() { triggers.push({ fn: b.fn, d: b.d, h: b.h, getHandlerFunction() { return this.fn; } }); } };
    return { WeekDay: { FRIDAY: 'FRIDAY' }, getProjectTriggers: () => triggers.slice(), deleteTrigger: t => triggers.splice(triggers.indexOf(t), 1), newTrigger: fn => { b.fn = fn; return b; }, _t: triggers }; })(),
  console,
};
module.exports = codePath => {
  const code = fs.readFileSync(codePath, 'utf8');
  const ctx = new Function(...Object.keys(G), code + '\n;return { doPost, doGet, lastBackupAt_, 初期設定, API, SHEETS, バックアップを設定する, バックアップを取る, 定期バックアップ, エラー通知のテスト, ログインロックを解除する, reportError_, __reset: () => { SETTINGS_ = null; } };')(...Object.values(G));
  return { ctx, SS, files, coerce, G };
};
