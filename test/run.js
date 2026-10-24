// テストをまとめて実行する：node test/run.js
// 模擬サーバーが必要なテストは、テストごとに新しい模擬サーバーを立てて動かす
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const PORT = String(process.env.EMU_PORT || 8790);
const env = Object.assign({}, process.env, { TZ: 'Asia/Tokyo', EMU_PORT: PORT });
const withServer = ['api.test.js', 'refill.test.js', 'audit.test.js'];
const inProcess = ['backup.test.js', 'error.test.js', 'lock.test.js', 'token.test.js'];
function judge(name, out) {
  const m = out.match(/PASS (\d+) FAIL (\d+)/), a = out.match(/NG (\d+) \/ (\d+)/);
  if (/CRASH/.test(out)) return { ok: false, line: 'CRASH' };
  if (m) return { ok: m[2] === '0' && Number(m[1]) > 0, line: `${m[1]}件 成功 / ${m[2]}件 失敗` };
  if (a) return { ok: a[1] === '0' && Number(a[2]) > 0, line: `${Number(a[2]) - Number(a[1])}件 成功 / ${a[1]}件 失敗` };
  return { ok: false, line: '結果を読み取れませんでした' };
}
async function startServer() {
  const p = spawn(process.execPath, [path.join(__dirname, 'emu/server.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('模擬サーバーが起動しません')), 10000); p.stdout.on('data', d => { if (/emu on/.test(d)) { clearTimeout(t); res(); } }); p.on('exit', c => rej(new Error('模擬サーバーが終了しました ' + c))); });
  return p;
}
(async () => {
  let allOk = true;
  for (const name of withServer.concat(inProcess)) {
    let srv = null;
    if (withServer.includes(name)) srv = await startServer();
    const r = spawnSync(process.execPath, [path.join(__dirname, name)], { env, encoding: 'utf8', timeout: 120000 });
    if (srv) srv.kill();
    const out = (r.stdout || '') + (r.stderr || '');
    const j = judge(name, out);
    console.log((j.ok ? '✓ ' : '✗ ') + name.padEnd(18) + j.line);
    if (!j.ok) { allOk = false; console.log(out.split('\n').filter(l => /FAIL|NG|CRASH|Error/.test(l)).slice(0, 30).join('\n')); }
  }
  console.log(allOk ? 'すべてのテストに通りました' : 'テストに失敗したものがあります');
  process.exit(allOk ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
