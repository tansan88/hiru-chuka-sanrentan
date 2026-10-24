// テスト用の模擬サーバー（Apps Script の doPost を手元で動かす）
process.env.TZ = 'Asia/Tokyo';
const http = require('http');
const path = require('path');
const { ctx, SS, files, G } = require('./gas_emu.js')(process.argv[2] || path.join(__dirname, '../../gas/Code.gs'));
const PORT = Number(process.env.EMU_PORT || 8790);
ctx.初期設定();
let offset = 0; const RealDate = Date;
// 時計をずらせるようにする
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + offset); } static now() { return RealDate.now() + offset; } };
http.createServer((req, res) => {
  let body = ''; req.on('data', c => body += c); req.on('end', () => {
    res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') return res.end();
    try {
      if (req.url === '/__dump') return res.end(JSON.stringify(SS.sheets.map(s => ({ name: s.name, data: s.data })), null, 0));
      if (req.url === '/__exec') { const f = new Function('SS', 'ctx', 'files', 'setOffset', 'G', body); const r = f(SS, ctx, files, ms => offset = ms, G); return res.end(JSON.stringify({ r: r === undefined ? null : r })); }
      ctx.__reset(); const out = ctx.doPost({ postData: { contents: body } });
      res.setHeader('Content-Type', 'application/json'); res.end(out.content);
    } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ crash: String(e && e.stack || e) })); }
  });
}).listen(PORT, () => console.log('emu on ' + PORT));
