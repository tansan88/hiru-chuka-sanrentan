/* 昼中華3連単 画面 */
(function () {
  'use strict';
  const DAYS = ['火', '水', '木'];
  const chefImg = (k, cls) => `<img class="chefimg${cls ? ' ' + cls : ''}" src="assets/chef_${k}.png" alt="">`;
  const CHEF = chefImg('smile');
  const BOWL = c => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11h18a9 9 0 0 1-18 0z" fill="${c}"/><rect x="8" y="19.5" width="8" height="2" rx="1" fill="${c}"/>${c === '#C8102E' ? '<path d="M9 8c0-1.5 1.5-1.5 1.5-3M13.5 8c0-1.5 1.5-1.5 1.5-3" stroke="#C8102E" stroke-width="1.6" fill="none" stroke-linecap="round"/>' : ''}</svg>`;
  const WAKU = [null, ['#FFFFFF', '#222222', '#222222'], ['#222222', '#FFFFFF'], ['#D7261E', '#FFFFFF'], ['#1F5BC4', '#FFFFFF'], ['#F3D11E', '#222222'], ['#2E8B3E', '#FFFFFF'], ['#F08A1C', '#222222'], ['#F4A3C0', '#222222']];
  const LOGO = '<span class="logo"><span class="hc"><b><i>昼</i></b><span>中華</span></span>3連単</span>';
  const MENU_ICON = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" stroke="#FFF" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const SHARE_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';

  const $app = document.getElementById('app');
  const $layer = document.getElementById('layer');
  if (/[?&]env=test(&|$)/.test(location.search) || /\/test\//.test(location.pathname)) document.body.insertAdjacentHTML('beforeend', '<div class="envtag" aria-hidden="true">テスト環境</div>');
  // 画面の版。サーバーの MIN_APP_VERSION より小さいと「開き直してください」になる
  const APP_VERSION = 2;
  // /test/ で開いたとき、または ?env=test を付けたときはテスト環境につなぐ
  const ENV_TEST = /\/test\//.test(location.pathname) || /[?&]env=test(&|$)/.test(location.search);
  const API_URL = window.CONFIG ? (ENV_TEST ? CONFIG.API_URL_TEST : CONFIG.API_URL) || '' : '';
  const NO_API = !API_URL;
  // ?post を付けて開くと「Slackへの投稿をつくる」だけの画面（ログイン不要・アプリには何も記録しない）
  const POST_MODE = /[?&]post(=|&|$)/.test(location.search);
  const HIRU_STAMP = ':hirucyuuka:';
  const OTHER_NAME = 'その他';
  // はずれの「×」は文字だと円の真ん中に来ないので、線で描く
  const MISS_X = '<svg class="xm" viewBox="0 0 10 10" aria-hidden="true"><path d="M2.6 2.6l4.8 4.8M7.4 2.6l-4.8 4.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const CAM_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="3.6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

  // ---------- 保存（使えないブラウザでも動くように） ----------
  const store = {
    key: k => (ENV_TEST ? 'test_' : '') + k,
    get(k) { try { return localStorage.getItem(store.key(k)); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(store.key(k)) : localStorage.setItem(store.key(k), v); } catch (e) {} },
  };

  const S = { post: { ph: null, name: '' }, dayOther: {}, token: store.get('hc_token'), data: null, tab: store.get('hc_tab') || 'yoso', screen: null, editing: false, picks: {}, bet: '', host: null, hp: null, redo: {}, photo: {}, sending: {}, view: null, hist: null, authMode: 'login' };

  // ---------- 画面で起きたエラーをサーバーに知らせる（1回の表示で3件まで・同じ内容は1回だけ） ----------
  const errSeen = {}; let errSent = 0;
  function reportClientError(msg, detail, where) {
    try {
      if (!API_URL) return;
      msg = String(msg || '').slice(0, 300);
      if (!msg || errSeen[msg] || errSent >= 3 || /^Script error\.?$/i.test(msg) || /ResizeObserver/i.test(msg)) return;
      errSeen[msg] = 1; errSent++;
      fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, keepalive: true,
        body: JSON.stringify({ action: 'clientError', msg, detail: String(detail || '').slice(0, 1500), where: where || '', page: location.href.slice(0, 200), ua: (navigator.userAgent || '').slice(0, 200) }) }).catch(() => {});
    } catch (e) {}
  }
  window.addEventListener('error', e => { reportClientError(e.message, (e.filename || '') + ':' + (e.lineno || '') + ':' + (e.colno || '') + '\n' + (e.error && e.error.stack || ''), 'error'); });
  window.addEventListener('unhandledrejection', e => {
    const r = e.reason;
    if (r && r.fromApi) return; // 通信やサーバーのエラーは、画面にお知らせ済み・サーバーに記録済み
    reportClientError(r && r.message || String(r), r && r.stack || '', 'promise');
  });

  // ---------- 小物 ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n || 0).toLocaleString('ja-JP');
  const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n));
  const oddsTxt = o => Number(o).toFixed(1);
  function waku(n) {
    const w = WAKU[((n - 1) % 8) + 1] || WAKU[1];
    return `<span class="waku" style="background:${w[0]};color:${w[1]};${w[2] ? 'border:1px solid ' + w[2] : ''}">${n}</span>`;
  }
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }
  function deadlineLabel(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    return '締切 ' + '日月火水木金土'[d.getDay()] + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function calcReturn(menus, picks, bet) {
    const od = DAYS.map(d => { const m = menus.find(x => x.waku === picks[d]); return m ? m.odds : 0; });
    if (od.some(x => !x) || !(bet > 0)) return { mul: 0, all: 0, daily: [0, 0, 0] };
    const daily = od.map(o => Math.floor(bet / 3 * o));
    const triple = Math.floor(bet * od[0] * od[1] * od[2]);
    return { mul: od[0] * od[1] * od[2], all: daily[0] + daily[1] + daily[2] + triple, daily };
  }

  // ---------- 通信 ----------
  let loadingTimer = null, stopWok = null, loadingCount = 0;
  function showLoading() {
    loadingCount++;
    if (loadingTimer || document.querySelector('.loading')) return;
    loadingTimer = setTimeout(() => {
      loadingTimer = null;
      const el = document.createElement('div'); el.className = 'loading';
      el.innerHTML = '<canvas width="320" height="220" aria-hidden="true"></canvas><p>出馬表を炒めています<span class="dots"></span></p>';
      document.body.appendChild(el);
      if (window.startWok) stopWok = window.startWok(el.querySelector('canvas'));
    }, 350);
  }
  function hideLoading() {
    loadingCount = Math.max(0, loadingCount - 1);
    if (loadingCount) return;
    clearTimeout(loadingTimer); loadingTimer = null;
    if (stopWok) { stopWok(); stopWok = null; }
    document.querySelectorAll('.loading').forEach(e => e.remove());
  }
  // 通信が切れたとき、自動でもう1回だけ送ってよい操作（2回届いても結果が同じになるもの）
  // iPhone は、カメラや Slack から戻った直後の1回目の通信が失敗しやすい
  const RETRY_OK = ['state', 'history', 'week', 'hostState', 'predict', 'saveWeek', 'registerDay', 'saveRegulars', 'testCloseNow', 'readMenu', 'quizStart'];
  const isNetErr = e => !e || !e.message || /Failed to fetch|NetworkError|Load failed|network connection was lost|JSON|Unexpected/i.test(e.message);
  async function api(action, body, opt) {
    opt = opt || {};
    const req = Object.assign({ action, token: S.token, v: APP_VERSION }, body || {});
    if (opt.loading !== false) showLoading();
    try {
      let res;
      if (NO_API) throw new Error('config.js に Apps Script のURLを設定してください');
      const send = async () => { const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(req), redirect: 'follow' }); return r.json(); };
      try { res = await send(); }
      catch (e1) {
        if (!(isNetErr(e1) && RETRY_OK.indexOf(action) >= 0)) throw e1;
        await new Promise(r => setTimeout(r, 1200));
        res = await send();
      }
      if (!res.ok) {
        if (res.reload) { showReload(); const e = new Error(res.error || ''); e.silent = true; throw e; }
        if (/ログインしてください$/.test(res.error || '')) { logout(true); }
        const se = new Error(res.error || 'うまくいきませんでした'); se.server = true; throw se;
      }
      return res;
    } catch (e) {
      const net = !(e && e.silent) && isNetErr(e) && !(e && e.server);
      const msg = !net && e && e.message ? e.message : '通信できませんでした。電波のよいところでやり直してください';
      if (e && typeof e === 'object') { e.fromApi = true; e.network = net; }
      if (!(e && e.silent) && !opt.quiet) toast(msg); throw e;
    } finally { if (opt.loading !== false) hideLoading(); }
  }
  // いくつかの通信をひと続きで行うあいだ、読み込み中の画面（中華鍋）を途切れさせない
  async function busy(fn) { showLoading(); try { return await fn(); } finally { hideLoading(); } }
  async function refresh(opt) {
    S.data = await api('state', {}, opt);
    render();
  }
  function logout(silent) {
    S.token = null; store.set('hc_token', null); S.data = null; S.screen = null; S.authMode = 'login'; S.host = null; S.hp = null; closeLayer();
    if (!silent) toast('ログアウトしました');
    render();
  }

  // ---------- 描画の入口 ----------
  function render() {
    if (POST_MODE) return renderPost();
    if (!S.token) return renderAuth();
    if (!S.data) { $app.innerHTML = ''; return; }
    if (S.screen) return renderSub();
    const D = S.data;
    const isHost = D.me.isHost;
    if (S.tab === 'host' && !isHost) S.tab = 'yoso';
    $app.innerHTML = header() +
      `<nav class="tabs" role="tablist"><button data-tab="yoso" class="${S.tab === 'yoso' ? 'on' : ''}">予想</button><button data-tab="kekka" class="${S.tab === 'kekka' ? 'on' : ''}">結果</button>${isHost ? `<button data-tab="host" class="${S.tab === 'host' ? 'on' : ''}">ホスト</button>` : ''}</nav>` +
      `<main id="main" style="display:flex;flex-direction:column;flex:1"></main>`;
    const main = document.getElementById('main');
    if (S.tab === 'yoso') main.innerHTML = yosoTab();
    else if (S.tab === 'kekka') main.innerHTML = kekkaTab();
    else main.innerHTML = hostTab();
    bindCommon();
    if (S.tab === 'yoso') bindYoso();
    if (S.tab === 'kekka') bindResult(D.lastResult);
    if (S.tab === 'host') bindHost();
  }
  function header() {
    const b = S.data.me.balance;
    return `<header class="bar">${LOGO}<div class="right"><span class="pts ${b <= 0 ? 'zero' : ''}">持ち点<br><b>${fmt(b)}</b> pt</span><button class="ibtn" data-act="menu" aria-label="メニュー">${MENU_ICON}</button></div></header>`;
  }
  function bindCommon() {
    $app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
    const m = $app.querySelector('[data-act="menu"]'); if (m) m.onclick = openMenu;
    $app.querySelectorAll('[data-act="refill"]').forEach(b => b.onclick = openRefill);
  }
  function switchTab(t) {
    S.tab = t; store.set('hc_tab', t); S.editing = false;
    if (t === 'host') return loadHost();
    render(); window.scrollTo(0, 0);
    if (t === 'kekka') maybeGong(S.data.lastResult);
  }

  // ---------- ログイン・登録 ----------
  function pinBox(id) {
    return `<div class="pin" data-pin="${id}"><span></span><span></span><span></span><span></span><input id="${id}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="${id === 'p-reg' ? 'new-password' : 'current-password'}" aria-label="パスワード（数字4桁）"></div>`;
  }
  function bindPin(root) {
    root.querySelectorAll('.pin').forEach(p => {
      const inp = p.querySelector('input'), sp = p.querySelectorAll('span');
      const draw = () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 4); sp.forEach((s, i) => { s.textContent = i < inp.value.length ? '●' : ''; s.classList.toggle('cur', document.activeElement === inp && i === Math.min(inp.value.length, 3)); }); };
      inp.addEventListener('input', draw); inp.addEventListener('focus', draw); inp.addEventListener('blur', draw); draw();
    });
  }
  function renderAuth() {
    const reg = S.authMode === 'register';
    $app.innerHTML = `<header class="bar">${LOGO}</header>` + (NO_API ? '<div class="demo">config.js に Apps Script のURLが設定されていません</div>' : '') +
      `<div class="hello">${CHEF}<h1>${reg ? 'はじめての方' : 'いらっしゃいませ！'}</h1></div>
      <form class="form" id="authf" autocomplete="on">
        <label class="field"><span>ニックネーム</span><input id="nick" name="username" autocomplete="username" maxlength="16" required></label>
        <div class="field"><span>パスワード（数字4桁）</span>${pinBox(reg ? 'p-reg' : 'p-log')}</div>
        <div class="err" id="aerr"></div>
        <button class="btn gold block" type="submit">${reg ? '登録して入店する' : '入店する'}</button>
      </form>
      <button class="lnk" id="swap" style="margin:16px auto 0">${reg ? '‹ ログインに戻る' : 'はじめての方はこちら ›'}</button>`;
    bindPin($app);
    document.getElementById('swap').onclick = () => { S.authMode = reg ? 'login' : 'register'; renderAuth(); };
    document.getElementById('authf').onsubmit = async ev => {
      ev.preventDefault();
      const nick = document.getElementById('nick').value.trim(), pass = $app.querySelector('.pin input').value;
      const er = document.getElementById('aerr'); er.textContent = '';
      if (!nick) return er.textContent = 'ニックネームを入れてください';
      if (!/^\d{4}$/.test(pass)) return er.textContent = 'パスワードは数字4桁です';
      try {
        const r = await api(reg ? 'register' : 'login', { nick, pass });
        S.token = r.token; store.set('hc_token', r.token); S.tab = 'yoso';
        if (r.state) { S.data = r.state; render(); } else await refresh(); // ログインの返事に画面の中身も入っている
      } catch (e) { er.textContent = e.message; }
    };
  }

  // ---------- 予想タブ ----------
  function raceHead(v, pill) {
    return `<div class="race"><div class="row"><h1>${esc(v.title)}</h1>${pill || ''}</div><span class="when">${esc(v.dates)}${v.closed ? '・受付は締め切りました' : '・<em>' + deadlineLabel(v.deadline) + '</em>'}</span></div>`;
  }
  function mumble(v) {
    if (!v.mumble) return '';
    return `<div class="mumble">${CHEF}<div><small>店長のつぶやき</small><span>${esc(v.mumble)}</span></div></div>`;
  }
  function yosoTab() {
    const D = S.data, cur = D.current;
    if (!cur) {
      return `<div class="center">${chefImg('pan','chef')}<div class="bubble"><p style="font-size:16px;font-weight:900">ただいま仕込み中です</p><p>今週の出馬表は月曜に公開します。もうしばらくお待ちください。</p></div>${D.hasPrevResult ? '<button class="btn ghost" data-go="kekka">先週の結果を見る</button>' : ''}${D.me.canRefill ? '<button class="btn gold" data-act="refill">ptを補充する</button>' : ''}</div>`;
    }
    if (cur.isMyHostWeek) return hostWeekView(cur);
    if (cur.closed) return closedView(cur);
    if (cur.myPred && !S.editing) return votedView(cur);
    if (D.me.canRefill && !cur.myPred) return zeroView(cur);
    return predictView(cur);
  }
  function oddsCell(m) {
    const cls = m.pop === 1 ? 'p1' : m.pop === 2 ? 'p2' : '';
    return `<span class="od ${cls}"><small>${m.pop}番人気</small><b>${oddsTxt(m.odds)}</b></span>`;
  }
  function nameCell(m, bold) { return `<span class="nm ${m.name.length > 9 ? 'long' : ''}" style="${bold ? '' : 'font-weight:500'}">${esc(m.name)}</span>`; }
  function oddsNote(v) { return v.oddsLive ? '<div class="onote">オッズと人気はみんなの予想（使ったpt）で動きます。締切の時点で確定します</div>' : ''; }
  function tableHead(cols) { return `<div class="tr th"><span>枠</span><span>メニュー</span><span>オッズ</span>${cols.map(c => `<span>${c}</span>`).join('')}</div>`; }

  function predictView(v) {
    if (!S.editingInit || S.editingInit !== v.weekId + (S.editing ? 'e' : '')) {
      S.editingInit = v.weekId + (S.editing ? 'e' : '');
      S.picks = v.myPred ? Object.assign({}, v.myPred.picks) : {};
      S.bet = v.myPred ? String(v.myPred.bet) : String(Math.min(1000, Math.floor(S.data.me.balance / 100) * 100) || '');
      try {
        const d = JSON.parse(sessionStorage.getItem(store.key('hc_draft')) || 'null');
        sessionStorage.removeItem(store.key('hc_draft'));
        if (d && d.weekId === v.weekId) { S.picks = d.picks || {}; S.bet = String(d.bet || ''); }
      } catch (e) {}
    }
    const rows = v.menus.map(m => `<div class="tr">${waku(m.waku)}${nameCell(m, true)}${oddsCell(m)}${DAYS.map(d => `<button class="dot ${S.picks[d] === m.waku ? 'on' : ''}" data-day="${d}" data-waku="${m.waku}" aria-pressed="${S.picks[d] === m.waku}" aria-label="${d} ${esc(m.name)}"></button>`).join('')}</div>`).join('');
    return raceHead(v, '<span class="pill open">受付中</span>') + mumble(v) + oddsNote(v) +
      `<div class="tbl">${tableHead(DAYS)}${rows}</div>
      <div class="dock" id="dock">
        <div class="l1"><span class="picks" id="dpicks"></span><span class="mul" id="dmul"></span></div>
        <div class="bet"><label for="bet">使うpt</label><div class="box"><input id="bet" inputmode="numeric" pattern="[0-9]*" size="6" value="${esc(S.bet)}" placeholder="100pt単位" aria-describedby="derr"><span>pt</span></div></div>
        <div class="err" id="derr" style="color:#FFC9C9"></div>
        <div class="l3"><span class="ret" id="dret"></span><button class="btn gold" id="decide">この予想で決定</button></div>
        ${S.editing ? '<button class="lnk" id="cancelEdit" style="color:#FFF;align-self:center">変更をやめる</button>' : ''}
      </div>`;
  }
  function updateDock() {
    const v = S.data.current; if (!v) return;
    const names = DAYS.map(d => { const m = v.menus.find(x => x.waku === S.picks[d]); return m ? m.name : '—'; });
    const done = DAYS.every(d => S.picks[d]);
    const bet = Number(String(S.bet).replace(/[^\d]/g, ''));
    const max = S.data.me.balance + (v.myPred ? v.myPred.bet : 0);
    let er = '';
    if (S.bet !== '' && (!(bet >= 100) || bet % 100)) er = '100pt単位で入れてください';
    else if (bet > max) er = '使えるのは ' + fmt(max) + 'pt までです';
    const r = calcReturn(v.menus, S.picks, bet);
    const q = id => document.getElementById(id);
    if (!q('dpicks')) return;
    q('dpicks').textContent = done ? names.join(' → ') : '火・水・木を1つずつ選んでください';
    q('dmul').textContent = done ? r.mul.toFixed(1) + '倍' : '';
    q('dret').innerHTML = done && !er && bet ? `3日とも当たれば（いまの倍率で）<br><b>${fmt(r.all)}</b> pt` : '';
    q('derr').textContent = er;
    q('decide').disabled = !(done && bet && !er);
  }
  function votedView(v) {
    const names = DAYS.map(d => (v.menus.find(x => x.waku === v.myPred.picks[d]) || {}).name || '—');
    const r = calcReturn(v.menus, v.myPred.picks, v.myPred.bet);
    const at = new Date(v.myPred.at);
    const rows = v.menus.map(m => `<div class="tr">${waku(m.waku)}${nameCell(m, DAYS.some(d => v.myPred.picks[d] === m.waku))}${oddsCell(m)}${DAYS.map(d => v.myPred.picks[d] === m.waku ? '<span class="mk hit" aria-label="予想"></span>' : '<span></span>').join('')}</div>`).join('');
    return raceHead(v, '<span class="pill open">受付中</span>') +
      `<div class="banner"><span class="ck">✓</span><div><b>へい、まいど！予想を受け付けました</b><small>${at.getMonth() + 1}/${at.getDate()}（${'日月火水木金土'[at.getDay()]}）${at.getHours()}:${String(at.getMinutes()).padStart(2, '0')}</small></div></div>` +
      `<div style="margin-top:10px">${oddsNote(v)}</div><div class="tbl">${tableHead(DAYS)}${rows}</div>
      <div class="pad" style="margin-top:auto"><div class="card"><div class="hd"><span>あなたの予想</span><span>${r.mul.toFixed(1)}倍</span></div><div class="bd">
        <b style="font-size:15px">${names.map(esc).join(' → ')}</b>
        <div class="kv"><span>使うpt</span><b>${fmt(v.myPred.bet)} pt</b></div>
        <div class="kv"><span>3日とも当たれば（いまの倍率で）</span><b style="color:var(--turf)">${fmt(r.all)} pt</b></div>
        <button class="btn ghost" id="edit">予想を変更する</button></div></div></div>`;
  }
  function closedView(v) {
    const res = v.results, p = v.myPred;
    const cancelled = DAYS.filter(d => res[d] && res[d].waku === 0);
    const heads = DAYS.map(d => res[d] && res[d].waku === 0 ? `<span class="colcancel">${d} 中止</span>` : d);
    const rows = v.menus.map(m => {
      const cells = DAYS.map(d => {
        const r = res[d], mine = p && p.picks[d] === m.waku;
        if (r && r.waku === 0) return mine ? '<span class="mk cancel" aria-label="中止">−</span>' : '<span></span>';
        if (mine) { if (!r) return '<span class="mk wait" aria-label="予想（発表待ち）"></span>'; return r.waku === m.waku ? '<span class="mk hit" aria-label="当たり">✓</span>' : '<span class="mk miss" aria-label="はずれ">' + MISS_X + '</span>'; }
        if (r && r.waku === m.waku) return `<span class="bowl" role="img" aria-label="${d}曜に食べたもの">${BOWL('#C8102E')}</span>`;
        return '<span></span>';
      }).join('');
      return `<div class="tr">${waku(m.waku)}${nameCell(m, p && DAYS.some(d => p.picks[d] === m.waku))}${oddsCell(m)}${cells}</div>`;
    }).join('');
    let dock = '';
    if (p) {
      const names = DAYS.map(d => (v.menus.find(x => x.waku === p.picks[d]) || {}).name || '—');
      const r = calcReturn(v.menus, p.picks, p.bet);
      let got = 0;
      const chips = DAYS.map((d, i) => {
        const x = res[d];
        if (!x) return `<span class="wait">${d} 発表待ち</span>`;
        if (x.waku === 0) return `<span class="cancel">${d} 中止</span>`;
        if (x.waku === p.picks[d]) { got += r.daily[i]; return `<span class="hit">${d} ✓ +${fmt(r.daily[i])}</span>`; }
        return `<span class="miss">${d} ×</span>`;
      }).join('');
      const anyMiss = DAYS.some(d => res[d] && res[d].waku !== 0 && res[d].waku !== p.picks[d]);
      const allHit = DAYS.every(d => res[d] && res[d].waku === p.picks[d]);
      const tag = cancelled.length ? '3連単 不成立' : allHit ? '3連単 的中！' : anyMiss ? '3連単 不的中' : '3連単 発表待ち';
      if (allHit) got += Math.floor(p.bet * r.mul);
      dock = `<div class="dock"><div class="l1"><span class="picks">${names.map(esc).join(' → ')}</span><span class="mul">使った ${fmt(p.bet)}pt</span></div>
        <div class="chips">${chips}</div>
        <div class="l1">${cancelled.length ? '<span style="font-size:13px;font-weight:700">中止の日があるため <b style="color:var(--gold)">全額返還</b></span>' : `<span style="font-size:13px">いまの獲得 <b style="font-size:18px;color:var(--gold)">${fmt(got)}</b> pt</span>`}<span class="tag">${tag}</span></div></div>`;
    } else {
      dock = '<div class="dock"><span style="font-size:13px">今週は予想していません。食べたものは毎日ここに出ます。</span></div>';
    }
    return raceHead(v, '<span class="pill run">開催中</span>') +
      `<div class="legend"><span><span class="mk wait"></span>予想</span><span><span class="mk hit">✓</span>当たり</span><span><span class="mk miss">${MISS_X}</span>はずれ</span><span><span class="bowl" style="width:20px;height:20px">${BOWL('#C8102E')}</span>食べたもの</span>${cancelled.length ? '<span><span class="mk cancel">−</span>中止</span>' : ''}</div>` +
      `<div class="tbl"><div class="tr th"><span>枠</span><span>メニュー</span><span>オッズ</span>${heads.map(h => `<span>${h}</span>`).join('')}</div>${rows}</div>` + dock;
  }
  function hostWeekView(v) {
    const rows = v.menus.slice().sort((a, b) => a.waku - b.waku).map(m => `<div class="tr tr4">${waku(m.waku)}${nameCell(m, m.pop <= 2)}<span style="text-align:right;${m.pop === 1 ? 'color:var(--red);font-weight:700' : m.pop === 2 ? 'color:#1F5BC4;font-weight:700' : ''}">${m.pop}番人気</span><span style="text-align:right">${oddsTxt(m.odds)}</span></div>`).join('');
    return raceHead(v, v.closed ? '<span class="pill run">開催中</span>' : '<span class="pill open">受付中</span>') +
      `<div class="notice cream">${chefImg('sorry')}<div><b>今週はあなたが担当です</b><span>今週は予想できません。</span></div></div>
      <div style="margin:14px 14px 6px;font-size:12px;font-weight:700;color:var(--sub)">今週の出馬表</div>
      <div class="tbl"><div class="tr tr4 th"><span>枠</span><span>メニュー</span><span style="text-align:right">人気</span><span style="text-align:right">オッズ</span></div>${rows}</div>
      <div class="pad" style="margin-top:auto"><button class="btn green block" data-go="host">ホストタブで食べたものを登録する</button></div>`;
  }
  function zeroView(v) {
    const rows = v.menus.map(m => `<div class="tr">${waku(m.waku)}${nameCell(m, false)}${oddsCell(m)}${DAYS.map(() => '<button class="dot" disabled aria-hidden="true"></button>').join('')}</div>`).join('');
    return raceHead(v, '<span class="pill open">受付中</span>') +
      `<div class="notice pink">${chefImg('sorry')}<div><b style="color:var(--red)">${S.data.me.balance <= 0 ? '持ち点がなくなりました' : '持ち点が100ptを切りました'}</b><span>${refillBlocked() ? '今週の補充はここまでです。月曜になると、また満額で補充できます。' : 'クイズかレビューで、すぐに補充できます。'}</span></div></div>
      <div class="tbl" style="margin-top:12px;opacity:.5">${tableHead(DAYS)}${rows}</div>
      ${refillBlocked() ? '' : '<div class="dock"><span class="rf-hint">補充すると、今週の予想にそのまま参加できます</span><button class="btn gold block" data-act="refill">ptを補充する</button></div>'}`;
  }
  function bindYoso() {
    $app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => switchTab(b.dataset.go));
    $app.querySelectorAll('.dot[data-day]').forEach(b => b.onclick = () => {
      const d = b.dataset.day, w = Number(b.dataset.waku);
      S.picks[d] = S.picks[d] === w ? undefined : w;
      $app.querySelectorAll(`.dot[data-day="${d}"]`).forEach(x => { const on = Number(x.dataset.waku) === S.picks[d]; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      updateDock();
    });
    const bet = document.getElementById('bet');
    if (bet) { bet.oninput = () => { S.bet = bet.value.replace(/[^\d]/g, ''); if (bet.value !== S.bet) bet.value = S.bet; updateDock(); }; updateDock(); }
    const dec = document.getElementById('decide');
    if (dec) dec.onclick = async () => {
      const v = S.data.current;
      dec.disabled = true;
      try {
        await api('predict', { weekId: v.weekId, picks: S.picks, bet: Number(S.bet) });
        S.editing = false; S.editingInit = null;
        maido();
        await refresh({ loading: false });
      } catch (e) { dec.disabled = false; }
    };
    const ed = document.getElementById('edit'); if (ed) ed.onclick = () => { S.editing = true; S.editingInit = null; render(); };
    const ce = document.getElementById('cancelEdit'); if (ce) ce.onclick = () => { S.editing = false; S.editingInit = null; render(); };
  }
  function maido() {
    const el = document.createElement('div'); el.className = 'maido'; el.textContent = 'へい、まいど！';
    document.body.appendChild(el); setTimeout(() => el.remove(), 1700);
  }

  // ---------- 結果タブ ----------
  function kekkaTab() {
    const v = S.data.lastResult;
    if (!v) return `<div class="center">${chefImg('surprise','chef')}<div class="bubble"><p style="font-size:16px;font-weight:900">まだ結果はありません</p><p>木曜に結果が確定すると、ここに出ます。</p></div></div>`;
    return resultView(v);
  }
  function resultView(v) {
    const p = v.myPred, st = v.settle, res = v.results;
    const cancelled = v.status === '返還';
    const triple = st && st.triple > 0;
    const seal = cancelled ? '<span class="seal gray">返還</span>' : '<span class="seal">確定</span>';
    const head = `<div class="race"><div class="row"><div style="display:flex;flex-direction:column"><span style="font-weight:900;font-size:17px">${esc(v.title)}</span><span class="when">${esc(v.dates)}</span></div>${seal}</div></div>`;
    const marks = v.marks.map(k => `<span class="${k === 'hit' ? 'hit' : k === 'cancel' ? 'cancel' : k === 'miss' ? 'miss' : 'none'}">${k === 'hit' ? '✓' : k === 'cancel' ? '−' : k === 'miss' ? MISS_X : ''}</span>`).join('');
    let sum;
    if (!p) sum = `<div class="sum"><div class="l"><small>今週の収支</small><span class="big" style="font-size:20px">予想していません</span></div><div class="ms">${marks}</div></div>`;
    else if (cancelled) sum = `<div class="sum"><div class="l"><small>中止の日があるため、今週は全額返還</small><span class="big">±0<span> pt</span></span><small>使った ${fmt(p.bet)}pt ／ <b style="color:var(--gold)">全額返還</b></small></div><div class="ms">${marks}</div></div>`;
    else sum = `<div class="sum ${triple ? 'hit' : ''}">${triple ? '<svg width="120" height="120" viewBox="0 0 100 100" aria-hidden="true" style="position:absolute;right:-18px;top:-14px;opacity:.22"><circle cx="50" cy="50" r="40" fill="none" stroke="#F7B500" stroke-width="6"/><circle cx="50" cy="50" r="26" fill="none" stroke="#F7B500" stroke-width="3"/><circle cx="50" cy="50" r="9" fill="#F7B500"/></svg>' : ''}<div class="l">${triple ? '<em>3連単 的中！</em>' : ''}<small>今週の収支</small><span class="big">${signed(st ? st.net : 0)}<span> pt</span></span><small>使った ${fmt(p.bet)}pt ／ 獲得 <b style="color:var(--gold)">${fmt(st ? st.total : 0)}</b>pt</small></div><div class="ms">${marks}</div></div>`;
    let brk = '';
    if (p) {
      const rows = DAYS.map((d, i) => {
        const m = v.menus.find(x => x.waku === p.picks[d]) || { name: '—', odds: 0 };
        const k = v.marks[i];
        if (k === 'cancel') return `<div class="r"><b>${d}</b><span class="m cancel">−</span><span style="color:var(--sub)">中止</span><span class="v">—</span></div>`;
        const val = cancelled ? '<span class="v">—</span>' : k === 'hit' ? `<span class="v plus">+${fmt(st ? st.daily[d] : 0)}</span>` : '<span class="v">0</span>';
        return `<div class="r"><b>${d}</b><span class="m ${k === 'hit' ? 'hit' : 'miss'}">${k === 'hit' ? '✓' : MISS_X}</span><span style="${k === 'hit' ? '' : 'color:var(--sub)'}">${esc(m.name === OTHER_NAME && res[d] && res[d].other ? m.name + '（' + res[d].name + '）' : m.name)} <small>${oddsTxt(m.odds)}倍</small></span>${val}</div>`;
      }).join('');
      const tv = cancelled ? '<span class="v">不成立</span>' : triple ? `<span class="v big">+${fmt(st.triple)}</span>` : '<span class="v">0</span>';
      brk = `<div class="brk"><span class="h">内訳</span>${rows}<div class="r t ${triple ? 'win' : ''}"><span>${triple ? '<b>3連単</b>' : '3連単'}</span>${tv}</div></div>`;
    }
    const photos = '<div class="photos">' + DAYS.map(d => {
      const r = res[d];
      if (!r) return `<div><div class="im">${BOWL('#C9D3CC').replace('<svg', '<svg width="30" height="30"')}</div><span class="cap"><b>${d}</b> —</span></div>`;
      if (r.waku === 0) return `<div><div class="im cx">中止</div><span class="cap"><b>${d}</b> <span style="color:var(--sub)">メニュー外</span></span></div>`;
      const im = r.photo ? `<img src="${esc(r.photo)}" alt="${d}曜の${esc(r.name)}" loading="lazy" referrerpolicy="no-referrer">` : BOWL('#C9D3CC').replace('<svg', '<svg width="30" height="30"');
      const cap = `<span class="cap"><b>${d}</b> ${esc(r.name)}</span>`;
      return r.photo ? `<button class="ph" data-zoom="${d}" aria-label="${d}曜の${esc(r.name)}の写真を拡大"><div class="im">${im}</div>${cap}</button>` : `<div><div class="im">${im}</div>${cap}</div>`;
    }).join('') + '</div>';
    const share = p ? `<div class="pad"><button class="btn gold block" id="share" style="display:flex;align-items:center;justify-content:center;gap:8px">${SHARE_ICON}結果をシェア</button></div>` : '';
    return head + sum + brk + photos + share;
  }
  function bindResult(v) {
    $app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => switchTab(b.dataset.go));
    const sb = document.getElementById('share');
    if (sb && v) sb.onclick = () => openShare(v);
    if (v) bindZoom(v.results);
  }
  // 写真の拡大：結果（火・水・木）のうち写真がある日を並べる。タップで閉じる・左右にスワイプで切り替え
  function zoomList(res) {
    return DAYS.filter(d => res[d] && res[d].photo).map(d => ({ day: d, src: res[d].photo.replace(/sz=w\d+/, 'sz=w2000'), cap: `<b>${d}曜</b> ${esc(res[d].name)}` }));
  }
  function bindZoom(res) {
    const list = zoomList(res || {});
    $app.querySelectorAll('[data-zoom]').forEach(b => b.onclick = () => openZoom(list, Math.max(0, list.findIndex(x => x.day === b.dataset.zoom))));
  }
  function openZoom(list, i) {
    if (!list.length) return;
    let k = i || 0;
    openLayer(`<div class="zm" role="dialog" aria-label="写真の拡大"><img alt="" referrerpolicy="no-referrer"><div class="zc"></div><span class="zh"></span></div>`);
    const z = $layer.querySelector('.zm');
    const draw = () => { const it = list[k]; z.querySelector('img').src = it.src; z.querySelector('.zc').innerHTML = it.cap; z.querySelector('.zh').textContent = (list.length > 1 ? (k + 1) + ' / ' + list.length + '　左右にスワイプで切り替え・' : '') + 'タップで閉じる'; };
    draw();
    let x0 = null, swipedAt = 0;
    z.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    z.addEventListener('touchend', e => {
      if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40 && list.length > 1) { swipedAt = Date.now(); k = (k + (dx < 0 ? 1 : -1) + list.length) % list.length; draw(); }
    });
    z.onclick = () => { if (Date.now() - swipedAt < 400) return; closeLayer(); }; // スワイプの直後のタップだけは閉じない
  }

  // ---------- 写真を撮る・選ぶ（入力欄は画面の描き直しで消えないよう、ページに1つずつ置いておく） ----------
  const picker = (() => {
    let cb = null, cam = null, alb = null, opt = {};
    const mk = capture => {
      const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.hidden = true;
      if (capture) i.setAttribute('capture', 'environment');
      i.onchange = async () => { const f = i.files && i.files[0]; i.value = ''; if (!f || !cb) return; const c = cb; try { c(await shrink(f, opt.max, opt.q)); } catch (e) { toast('写真を読み込めませんでした'); } };
      document.body.appendChild(i); return i;
    };
    return { open(useCamera, fn, o) { cb = fn; opt = o || {}; if (!cam) { cam = mk(true); alb = mk(false); } (useCamera ? cam : alb).click(); } };
  })();
  const photoSrc = ph => 'data:' + ph.mime + ';base64,' + ph.data;
  function photoFile(ph, name) {
    const bin = atob(ph.data), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new File([u8], name || 'hiruchuka.jpg', { type: ph.mime || 'image/jpeg' });
  }
  // Slackへ送る：共有の画面（iPhone の共有シート）で写真と「メニュー名 :hirucyuuka:」を渡す
  // 送り先のチャンネルは Slack の画面で選ぶ。文字が入らない場合に備えて、文字はコピーもしておく
  async function sharePost(ph, name) {
    const text = name + ' ' + HIRU_STAMP;
    try { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {}); } catch (e) {}
    const file = photoFile(ph, 'hiruchuka.jpg');
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(file), a = document.createElement('a'); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('写真を保存し、文字をコピーしました。Slackに貼り付けてください');
  }
  function slackStat(day, kind, msg) {
    const el = document.getElementById('pstat');
    if (el && el.dataset.day === day) { el.className = 'pstat ' + kind; el.textContent = msg; }
  }
  function openSlackSheet(ph, name, day) {
    openLayer(`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-label="Slackに送る"><div class="grab"><span></span></div>
      <div class="sh"><h2>Slackに送る</h2><button class="xbtn" data-close aria-label="閉じる">✕</button></div>
      <div class="post-sheet"><img src="${photoSrc(ph)}" alt="撮った写真"><div class="ptxt">${esc(name)} <span>${HIRU_STAMP}</span></div>${day ? `<span class="pstat run" id="pstat" data-day="${day}">${day}曜を発表しています…（先に送ってもだいじょうぶです）</span>` : ''}
      <button class="btn slack block" id="psend">Slackに送る</button>
      <span class="pnote"><b>①</b> 共有の画面で Slack を選び、送り先のチャンネルを選ぶ<br><b>②</b> メッセージ欄を長押しして「ペースト」（上の文字はコピー済み）<br><b>③</b> 送信</span>
      <button class="lnk" data-close style="color:var(--sub)">閉じる</button></div></div>`);
    document.getElementById('psend').onclick = () => sharePost(ph, name);
  }

  // ---------- 投稿をつくる（?post。三連単とは関係なく、写真＋メニュー名を Slack へ） ----------
  function postUrl() { return location.pathname + '?post' + (/[?&]env=test(&|$)/.test(location.search) ? '&env=test' : ''); }
  function appUrl() { return location.pathname + (/[?&]env=test(&|$)/.test(location.search) ? '?env=test' : ''); }
  function renderPost() {
    document.title = '昼中華の投稿';
    const P = S.post, ready = P.ph && P.name.trim();
    $app.innerHTML = `<header class="bar">${LOGO}<b class="post-t">投稿をつくる</b></header>
      <div class="pad post">
        ${P.ph ? `<div class="post-img"><img src="${photoSrc(P.ph)}" alt="撮った写真"></div><div class="post-re"><button class="lnk" id="pcam">撮り直す</button><button class="lnk" id="palb">アルバムから選ぶ</button></div>`
          : `<button class="post-shoot" id="pcam">${CAM_ICON}<b>写真を撮る</b><span>カメラが開きます</span></button><button class="lnk" id="palb" style="align-self:center">アルバムから選ぶ</button>`}
        <label class="field"><span>メニュー名</span><input id="pname" maxlength="40" value="${esc(P.name)}" placeholder="例：麻婆豆腐" enterkeyhint="done"></label>
        <div class="post-prev"><small>Slackに貼り付ける文字</small><span id="pprev">${esc(P.name.trim() || 'メニュー名')} ${HIRU_STAMP}</span></div>
        <button class="btn slack block" id="psend" ${ready ? '' : 'disabled'}>Slackに送る</button>
        <span class="pnote"><b>①</b> 共有の画面で Slack を選び、送り先のチャンネルを選ぶ<br><b>②</b> メッセージ欄を長押しして「ペースト」（文字はコピー済み）<br><b>③</b> 送信<br>この画面で作った投稿は、アプリには記録されません。</span>
        <div class="post-foot"><span>ホーム画面に追加すると、すぐ開けます（共有ボタン →「ホーム画面に追加」）</span><a class="lnk" href="${esc(appUrl())}">昼中華3連単を開く ›</a></div>
      </div>`;
    const take = cam => picker.open(cam, ph => { P.ph = ph; render(); });
    document.getElementById('pcam').onclick = () => take(true);
    document.getElementById('palb').onclick = () => take(false);
    const nm = document.getElementById('pname');
    nm.oninput = () => { P.name = nm.value; document.getElementById('pprev').textContent = (P.name.trim() || 'メニュー名') + ' ' + HIRU_STAMP; document.getElementById('psend').disabled = !(P.ph && P.name.trim()); };
    document.getElementById('psend').onclick = () => { if (P.ph && P.name.trim()) sharePost(P.ph, P.name.trim()); };
  }
  function maybeGong(v) {
    if (!v || !v.settle || !(v.settle.triple > 0)) return;
    const key = 'hc_gong_' + v.weekId;
    if (store.get(key)) return;
    store.set(key, '1');
    const el = document.createElement('div'); el.className = 'gongfx'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '3連単 的中');
    el.innerHTML = `<svg viewBox="0 0 130 130" aria-hidden="true"><g class="disc"><circle cx="60" cy="8" r="3" fill="#7A4E1E"/><path d="M60 10L40 30M60 10L80 30" stroke="#FFF" stroke-width="2.5" stroke-linecap="round"/><circle cx="60" cy="72" r="46" fill="#A8741E"/><circle cx="60" cy="72" r="40" fill="#E3B04B"/><circle cx="60" cy="72" r="40" fill="none" stroke="#C9922F" stroke-width="2"/><circle cx="60" cy="72" r="13" fill="#CF9A35" stroke="#A8741E" stroke-width="1.5"/><path d="M30 60a34 34 0 0 1 22-24" stroke="#FFF1BF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".75"/></g><g class="mallet"><path d="M122 122L96 92" stroke="#7A4E1E" stroke-width="4.5" stroke-linecap="round"/><circle cx="92" cy="87" r="9" fill="#FFF"/></g></svg><span class="st">的中</span><b style="font-size:20px">+${fmt(v.settle.net)} pt</b><p>画面をタップして閉じる</p>`;
    document.body.appendChild(el);
    setTimeout(() => { gongSound(); $app.classList.add('shake'); setTimeout(() => $app.classList.remove('shake'), 800); }, 170);
    el.onclick = () => el.remove();
  }
  let actx = null;
  function gongSound() {
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const ctx = actx; if (ctx.state === 'suspended') ctx.resume(); const t = ctx.currentTime;
    const master = ctx.createGain(); master.gain.setValueAtTime(0.0001, t); master.gain.exponentialRampToValueAtTime(0.6, t + 0.015); master.gain.exponentialRampToValueAtTime(0.0001, t + 4.5); master.connect(ctx.destination);
    [[98, 1], [147, .55], [205, .45], [272, .32], [361, .22], [497, .14], [690, .08]].forEach(([f, a], i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f * 1.04, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.6);
      const g = ctx.createGain(); g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 4.4 - i * 0.35);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 4.6);
    });
  }

  // ---------- シェア ----------
  function shareData(v) {
    const p = v.myPred;
    const rows = DAYS.map((d, i) => { const m = v.menus.find(x => x.waku === p.picks[d]) || { name: '—', odds: 0 }; const k = v.marks[i]; return { day: d, name: m.name, odds: m.odds, kind: k === 'hit' ? 'hit' : k === 'cancel' ? 'cancel' : 'miss' }; });
    return { title: v.title, rows, hits: v.marks.filter(k => k === 'hit').length, cancelled: v.status === '返還', bet: p.bet, net: v.settle ? v.settle.net : 0 };
  }
  // 結果のシェア：画像を作って、共有の画面から Slack へ（送り先のチャンネルは Slack の画面で選ぶ）
  function openShare(v) {
    const blobP = window.ShareImage.blob(shareData(v));
    openLayer(`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-label="結果をシェア"><div class="grab"><span></span></div>
      <div class="share"><img id="shimg" alt="シェア画像のプレビュー">
      <button class="btn slack block" id="slack" disabled>Slackに送る</button>
      <div class="links"><button class="lnk" data-close style="color:var(--sub)">閉じる</button></div></div></div>`);
    blobP.then(blob => {
      const url = URL.createObjectURL(blob);
      const file = new File([blob], 'hiruchuka-' + v.weekId + '.png', { type: 'image/png' });
      const im = document.getElementById('shimg'); if (im) im.src = url;
      const download = () => { const a = document.createElement('a'); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); };
      const share = async () => {
        if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
        download(); toast('画像を保存しました。Slackに貼り付けて投稿してね');
      };
      const sl = document.getElementById('slack'); if (sl) { sl.disabled = false; sl.onclick = share; }
    }).catch(() => toast('画像を作れませんでした'));
  }

  // ---------- メニュー・ルール ----------
  function openLayer(html) {
    $layer.innerHTML = html;
    $layer.querySelectorAll('[data-close]').forEach(b => b.onclick = closeLayer);
    document.addEventListener('keydown', escClose);
  }
  // 画面が古いとき：選んでいた予想を残して、開き直してもらう（閉じるボタンは出さない）
  function showReload() {
    try { const v = S.data && S.data.current; if (v) sessionStorage.setItem(store.key('hc_draft'), JSON.stringify({ weekId: v.weekId, picks: S.picks, bet: S.bet })); } catch (e) {}
    openLayer(`<div class="scrim"></div><div class="rl" role="alertdialog" aria-labelledby="rlt" aria-describedby="rld">
      ${chefImg('surprise', 'rl-chef')}
      <b id="rlt">アプリが新しくなりました</b>
      <span id="rld">画面を開き直すと、新しい版で使えます。</span>
      <small>いまの操作はまだ送られていません。<br>開き直したあと、もう一度お願いします。</small>
      <button class="btn gold block" id="rlgo">開き直す</button></div>`);
    document.getElementById('rlgo').onclick = () => location.reload();
  }
  function closeLayer() { $layer.innerHTML = ''; document.removeEventListener('keydown', escClose); }
  function escClose(e) { if (e.key === 'Escape') closeLayer(); }
  function openMenu() {
    const D = S.data;
    openLayer(`<div class="scrim" data-close></div><aside class="drawer" role="dialog" aria-label="メニュー">
      <div class="bar" style="position:static"><b style="font-size:15px">メニュー</b><button class="ibtn" data-close aria-label="閉じる" style="font-size:16px">✕</button></div>
      <div class="who">${esc(D.me.nick)}</div>
      <div class="bal"><span>持ち点</span><b>${fmt(D.me.balance)} <span style="font-size:13px">pt</span></b></div>
      <nav class="mlist">${D.me.canRefill ? '<button data-m="refill" class="mrf">ptを補充する</button>' : ''}<span class="sec">記録</span><button data-m="history">過去の結果</button><button data-m="rule">ルール</button><button data-m="contact">問い合わせ</button><button data-m="post">Slackへの投稿をつくる</button>
      <span class="sec" style="border-top:1px solid var(--line)">アカウント</span><button data-m="nick">ニックネームを変える</button><button data-m="pass">パスワードを変える</button></nav>
      <div style="margin-top:auto;padding:16px"><button class="btn block" data-m="logout" style="border:1.5px solid var(--red);background:#FFF;color:var(--red);font-weight:700">ログアウト</button></div></aside>`);
    $layer.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      const m = b.dataset.m; closeLayer();
      if (m === 'rule') return openRule();
      if (m === 'logout') return logout();
      if (m === 'history') return openHistory();
      if (m === 'refill') return openRefill();
      if (m === 'post') { location.href = postUrl(); return; }
      S.screen = m; render();
    });
  }
  function openRule() {
    const o = S.data.odds || [2, 3, 4.5, 6, 8, 10, 13, 16];
    openLayer(`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-label="遊び方"><div class="grab"><span></span></div>
      <div class="sh"><h2>遊び方</h2><button class="xbtn" data-close aria-label="閉じる">✕</button></div>
      <div class="rule"><p style="margin:0;font-size:14px;font-weight:700">火・水・木に食べるお昼を、1日ずつ当てるゲームです。</p>
      <div class="steps">
        <div><span class="d" style="background:var(--turf)">月</span><div><b>出馬表の公開</b><br><span class="s">今週のメニューと人気（オッズ）を公開します。</span></div></div>
        <div><span class="d" style="background:var(--red)">火 昼前</span><div><b>締め切り</b><br><span class="s">火・水・木の列で1つずつ丸をタップ。締切までは何度でも変えられます。同じ品を2日以上選んでもOK。</span></div></div>
        <div><span class="d" style="background:var(--gold);color:var(--ink)">火〜木</span><div><b>毎日発表</b><br><span class="s">その日に食べたものが出馬表に出ます。</span></div></div>
        <div><span class="d" style="background:var(--ink)">木</span><div><b>結果が確定</b><br><span class="s">獲得ptが「結果」タブに出ます。</span></div></div>
      </div>
      <div class="ptbox"><b style="font-size:14px">ptのしくみ</b>
        <div style="color:var(--sub);font-size:12px">最初の持ち点は全員 <b style="color:var(--ink)">10,000pt</b>。予想と一緒に使うptを決めます（100pt単位、持ち点まで）。決定した時点で持ち点から引かれ、結果が確定すると獲得ptが加わります。</div>
        <div><b>日替わりpt</b>　当たった日ごとに<br><b style="color:var(--turf)">使うpt × 1/3 × その品のオッズ</b><small style="color:var(--sub)">（端数は切り捨て）</small></div>
        <div><b>3連単</b>　3日とも当たれば、さらに<br><b style="color:var(--red)">使うpt × 3品のオッズのかけ算</b></div>
        <div style="border-top:1px dashed var(--line2);padding-top:8px;color:var(--sub);font-size:12px">例：1,000pt使って、1・2・3番人気（2.0・3.0・4.5倍）を<br>3日とも当てると 666＋1,000＋1,500＋27,000 ＝ <b style="color:var(--ink);font-size:14px">30,166pt</b><br>火曜だけ当たったら <b style="color:var(--ink)">666pt</b>（収支 −334pt）</div>
        <div style="color:var(--sub);font-size:12px">倍率は、ホストが並べた順の<b style="color:var(--ink)">基本の倍率</b>（下の表）を、<b style="color:var(--ink)">みんなが使ったpt</b>で補正したものです。ptが多く集まった品は下がり、少ない品は上がります（基本の0.6〜1.6倍の範囲）。「○番人気」は今の倍率の低い順で、<b style="color:var(--ink)">締切の時点の倍率</b>で確定します。</div>
        <div class="oddsg">${o.slice(0, 8).map((x, i) => `<span>${i + 1}番目 <b>${Number.isInteger(x) && x >= 10 ? x : oddsTxt(x)}</b></span>`).join('')}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--sub)">
        <div><b style="color:var(--ink)">中止の日</b>　メニュー外を食べた日や休みの日がある週は、使ったptを全額返します。当たり・はずれは記録だけ残ります。</div>
        <div><b style="color:var(--ink)">持ち点が100ptを切ったら</b>　「ptを補充する」から、豆知識クイズ（満額＋${fmt(fullPt('quiz'))}pt）かレビュー（満額＋${fmt(fullPt('review'))}pt）で補充できます。${esc(refillRuleTxt())}</div>
      </div></div></div>`);
  }

  // ---------- サブ画面 ----------
  function subBar(title) { return `<header class="bar" style="justify-content:flex-start"><button class="ibtn" id="back" aria-label="戻る" style="font-size:22px;padding-bottom:3px">‹</button><b class="sub-title">${title}</b></header>`; }
  async function openHistory() {
    try { const r = await api('history'); S.hist = r.list; S.screen = 'history'; render(); window.scrollTo(0, 0); } catch (e) {}
  }
  function renderSub() {
    const sc = S.screen;
    if (sc === 'history') {
      const rows = (S.hist || []).map(h => `<button class="hrow" data-w="${esc(h.weekId)}"><div style="min-width:0"><b>${esc(h.title)}</b><small>${esc(h.dates)}</small></div><div class="mm">${h.marks.map(k => `<span class="${k === 'hit' ? 'hit' : k === 'cancel' ? 'cancel' : k === 'miss' ? 'miss' : 'none'}">${k === 'hit' ? '✓' : k === 'cancel' ? '−' : k === 'miss' ? MISS_X : ''}</span>`).join('')}</div><span class="nv" style="color:${h.net > 0 ? 'var(--turf)' : 'var(--sub)'}">${h.played ? (h.status === '返還' ? '±0' : signed(h.net || 0)) : '—'}</span><span style="color:var(--mute)">›</span></button>`).join('');
      $app.innerHTML = subBar('過去の結果') + `<div style="background:#FFF"><div class="hrow th"><span>レース</span><span>火水木</span><span style="text-align:right">収支</span><span></span></div>${rows || '<p style="padding:16px;color:var(--sub);margin:0">まだ結果はありません</p>'}</div>`;
      document.getElementById('back').onclick = () => { S.screen = null; render(); };
      $app.querySelectorAll('[data-w]').forEach(b => b.onclick = async () => { try { const r = await api('week', { weekId: b.dataset.w }); S.view = r.week; S.screen = 'week'; render(); window.scrollTo(0, 0); } catch (e) {} });
      return;
    }
    if (sc === 'week') {
      $app.innerHTML = subBar('過去の結果') + resultView(S.view);
      document.getElementById('back').onclick = () => { S.screen = 'history'; render(); };
      bindResult(S.view); return;
    }
    if (sc === 'nick') {
      $app.innerHTML = subBar('ニックネームを変える') + `<form class="form" id="f"><div class="field"><span>今のニックネーム</span><span class="ro">${esc(S.data.me.nick)}</span></div><label class="field"><span>新しいニックネーム</span><input id="nn" maxlength="16" required></label><div class="err" id="er"></div><button class="btn green block">変更する</button></form>`;
      document.getElementById('back').onclick = () => { S.screen = null; render(); };
      document.getElementById('f').onsubmit = async e => { e.preventDefault(); const nick = document.getElementById('nn').value.trim(); try { await api('changeNick', { nick }); toast('ニックネームを変えました'); S.screen = null; await refresh(); } catch (er) { document.getElementById('er').textContent = er.message; } };
      return;
    }
    if (sc === 'pass') {
      $app.innerHTML = subBar('パスワードを変える') + `<form class="form" id="f"><div class="field"><span>今のパスワード</span>${pinBox('p-old')}</div><div class="field"><span>新しいパスワード（数字4桁）</span>${pinBox('p-new')}</div><div class="err" id="er"></div><button class="btn green block">変更する</button></form>`;
      bindPin($app);
      document.getElementById('back').onclick = () => { S.screen = null; render(); };
      document.getElementById('f').onsubmit = async e => { e.preventDefault(); const o = document.getElementById('p-old').value, n = document.getElementById('p-new').value; if (!/^\d{4}$/.test(n)) return document.getElementById('er').textContent = '新しいパスワードは数字4桁です'; try { const r = await api('changePass', { oldPass: o, newPass: n }); if (r.token) { S.token = r.token; store.set('hc_token', r.token); } toast('パスワードを変えました'); S.screen = null; render(); } catch (er) { document.getElementById('er').textContent = er.message; } };
      return;
    }
    if (sc === 'contact') {
      const f = S.cf || (S.cf = { kind: '', body: '' });
      const req = '<em class="req">必須</em>';
      $app.innerHTML = subBar('問い合わせ') + `<div class="rv"><div class="rv-h"><b>オーナーに問い合わせる</b><span>不具合や分からないことを送ってください。読むのはオーナーだけです。みんなに関係する内容は、店長のつぶやき欄でお知らせすることがあります。</span></div>
        <div class="rv-b"><span class="rv-t">1. 種類${req}</span><div class="chips">${['不具合', '質問', '要望', 'その他'].map(v => `<label class="chip"><input type="radio" name="kind" value="${esc(v)}" ${f.kind === v ? 'checked' : ''}><span>${esc(v)}</span></label>`).join('')}</div></div>
        <div class="rv-b"><label for="cfbody" class="rv-t">2. 内容${req}</label><textarea id="cfbody" rows="6" maxlength="1000" placeholder="例：結果タブの写真が出ない／締切の時間を知りたい">${esc(f.body)}</textarea><span class="cnt" id="cnt"></span></div></div>
        <div class="dock"><div class="err" id="cferr" style="color:#FFC9C9"></div><button class="btn gold block" id="cfsend">送信する</button></div>`;
      document.getElementById('back').onclick = () => { S.screen = null; render(); };
      const upd = () => {
        const k = $app.querySelector('input[name=kind]:checked'); f.kind = k ? k.value : '';
        f.body = document.getElementById('cfbody').value;
        const len = f.body.trim().length, c = document.getElementById('cnt');
        c.textContent = len + '文字（5〜1000文字）'; c.className = 'cnt' + (len >= 5 ? ' ok' : '');
        document.getElementById('cfsend').disabled = !(f.kind && len >= 5);
      };
      $app.querySelectorAll('.rv input, .rv textarea').forEach(x => { x.oninput = upd; x.onchange = upd; });
      upd();
      document.getElementById('cfsend').onclick = async () => {
        try { await api('contact', { kind: f.kind, body: f.body }); S.cf = null; toast('送信しました。ありがとうございます'); S.screen = null; render(); window.scrollTo(0, 0); }
        catch (e) { document.getElementById('cferr').textContent = e.message; }
      };
      return;
    }
    if (sc === 'refill' || sc === 'quiz' || sc === 'quizdone' || sc === 'review' || sc === 'reviewdone') return renderRefill(sc);
    S.screen = null; render();
  }

  // ---------- pt補充 ----------
  // 割合を「半分」「2割」のような言い方にする
  function rateTxt(r) { r = Number(r); if (r === 0.5) return '半分'; const t = Math.round(r * 10); return Math.abs(r * 10 - t) < 1e-9 ? t + '割' : Math.round(r * 100) + '%'; }
  function refillRuleTxt() {
    const R = S.data.me.refillRule || { rate2: 0.5, rate3: 0.2, needFrom: 2 };
    return `その週の1回目は満額、2回目は${rateTxt(R.rate2)}、3回目からは${rateTxt(R.rate3)}を受け取れます（月曜に満額へ戻ります）。` + (R.needFrom > 0 ? `${R.needFrom}回目からは、その週の3連単に予想した人だけが補充できます。` : '');
  }
  function fullPt(k) { const R = S.data.me.refillFull || S.data.me.refillPt || {}; return R[k] || (k === 'quiz' ? 5000 : 15000); }
  function refillBlocked() { const f = S.data && S.data.me && S.data.me.refill; return !!(f && f.blocked); }
  function openRefill() {
    if (!S.data.me.canRefill) { toast('持ち点が100pt以上あるので、いまは補充できません'); return; }
    S.rf = { form: {} }; S.screen = 'refill'; render(); window.scrollTo(0, 0);
  }
  function backHome() { S.screen = null; S.rf = null; refresh().catch(() => render()); window.scrollTo(0, 0); }
  function ptsBar(title, bal) { return `<header class="bar"><b class="sub-title">${title}</b><span class="pts">持ち点<br><b>${fmt(bal)}</b> pt</span></header>`; }
  function doneCard(kind) {
    const dn = S.rf.done;
    return `<div class="rf-done ${kind}">${chefImg('smile')}<span class="l">補充しました</span><b class="p">＋${fmt(dn.pt)}pt</b><span class="c">持ち点　${fmt(dn.before)}pt → <b>${fmt(dn.balance)}pt</b></span></div>`;
  }
  function renderRefill(sc) {
    const R = S.data.me.refillPt || { quiz: 5000, review: 15000 };
    const rf = S.rf || (S.rf = { form: {} });
    if (sc === 'refill') {
      const F = S.data.me.refill || { n: 1, rate: 1 };
      if (F.blocked) {
        $app.innerHTML = subBar('ptを補充する') + `<div class="rf rf-stop"><div class="notice cream">${chefImg('sorry')}<div><b>今週の補充はここまでです</b><span>2回目からの補充は、その週の3連単に予想した人だけが受け取れます。月曜になると、また満額で補充できます。</span></div></div></div>`;
        document.getElementById('back').onclick = () => { S.screen = null; S.rf = null; render(); };
        return;
      }
      const nth = F.n > 1 ? `<p class="rf-nth">今週${F.n}回目の補充なので、受け取れるのは満額の<b>${esc(rateTxt(F.rate))}</b>です。月曜に満額へ戻ります。</p>` : '';
      $app.innerHTML = subBar('ptを補充する') + `<div class="rf">
        <h2 class="rf-h">どちらで補充しますか？</h2>${nth}
        <button class="rfc" data-rf="quiz"><span class="t"><b>豆知識クイズ</b><span class="badge g">＋${fmt(R.quiz)}pt</span></span><span class="d">中華料理の激ムズ豆知識に3問答えます。</span><span class="tags"><span>全問はずれでも補充されます</span></span></button>
        <button class="rfc" data-rf="review"><span class="t"><b>レビュー</b><span class="badge y">＋${fmt(R.review)}pt</span></span><span class="d">アプリやゲームの感想を書きます。いただいた声で、アプリを良くしていきます。</span><span class="tags"><span>読むのはホストだけです</span></span></button>
        <p class="rf-rule">${esc(refillRuleTxt())}</p>
      </div><div class="rf-chef">${chefImg('smile')}</div>`;
      document.getElementById('back').onclick = () => { S.screen = null; S.rf = null; render(); };
      $app.querySelector('[data-rf="quiz"]').onclick = startQuiz;
      $app.querySelector('[data-rf="review"]').onclick = () => { S.rf.form = {}; S.screen = 'review'; render(); window.scrollTo(0, 0); };
      return;
    }
    if (sc === 'quiz') {
      const i = rf.i, Q = rf.qs[i], a = rf.ans[i], done = a !== undefined, ok = a === Q.answer, last = i === rf.qs.length - 1;
      const L = 'ABCD';
      const ch = Q.choices.map((c, k) => done
        ? `<div class="qz-c ${k === Q.answer ? 'ok' : k === a ? 'ng' : 'dim'}"><i>${L[k]}</i><span>${esc(c)}</span>${k === Q.answer ? '<em>正解</em>' : k === a ? '<em>あなたの答え</em>' : ''}</div>`
        : `<button class="qz-c" data-c="${k}"><i>${L[k]}</i><span>${esc(c)}</span></button>`).join('');
      $app.innerHTML = `<header class="bar" style="justify-content:flex-start"><button class="ibtn" id="back" aria-label="やめる" style="font-size:16px">✕</button><b class="sub-title">豆知識クイズ</b><span class="qz-lv">激ムズ</span></header>
        <div class="qz"><div class="qz-pg"><b>${i + 1}問目 / ${rf.qs.length}問</b><span class="bars">${rf.qs.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</span></div>
        <div class="qz-q"><small>Q${i + 1}</small><p>${esc(Q.q)}</p></div>
        <div class="qz-cs">${ch}</div>
        ${done ? `<div class="notice cream qz-n">${chefImg(ok ? 'smile' : 'surprise')}<div><b>${ok ? '正解！' : 'ざんねん、はずれ！'}</b><span>${esc(Q.note)}</span></div></div>` : ''}</div>
        ${done ? `<div class="pad" style="margin-top:auto"><button class="btn green block" id="qnext">${last ? '結果を見る' : '次の問題へ'}</button></div>` : ''}`;
      document.getElementById('back').onclick = () => { S.screen = 'refill'; render(); };
      $app.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { rf.ans[i] = Number(b.dataset.c); render(); });
      const nx = document.getElementById('qnext');
      if (nx) nx.onclick = async () => {
        if (!last) { rf.i++; render(); window.scrollTo(0, 0); return; }
        const score = rf.qs.filter((q, k) => rf.ans[k] === q.answer).length;
        try { const before = S.data.me.balance; const r = await api('refill', { method: 'quiz', score }); rf.done = { pt: r.pt, balance: r.balance, before, score }; S.screen = 'quizdone'; render(); window.scrollTo(0, 0); } catch (e) {}
      };
      return;
    }
    if (sc === 'quizdone') {
      const dn = rf.done;
      $app.innerHTML = ptsBar('豆知識クイズ', dn.balance) + `<div class="qz-res"><span class="l">結果</span><b>${rf.qs.length}問中 ${dn.score}問正解</b>
        <span class="marks">${rf.qs.map((q, k) => `<i class="${rf.ans[k] === q.answer ? 'ok' : 'ng'}">Q${k + 1}</i>`).join('')}</span></div>${doneCard('g')}
        <div class="pad" style="margin-top:auto"><button class="btn gold block" id="home">予想にもどる</button></div>`;
      document.getElementById('home').onclick = backHome;
      return;
    }
    if (sc === 'review') {
      const first = !S.data.me.reviewed, f = rf.form;
      const chips = (name, list) => `<div class="chips">${list.map(v => `<label class="chip"><input type="radio" name="${name}" value="${esc(v)}" ${f[name] === v ? 'checked' : ''}><span>${esc(v)}</span></label>`).join('')}</div>`;
      const box = (title, inner) => `<div class="rv-b"><span class="rv-t">${title}</span>${inner}</div>`;
      const req = '<em class="req">必須</em>', opt = '<em class="opt">任意</em>';
      const n = 1;
      const q1 = first
        ? box('1. 遊び方は分かりましたか？', chips('understood', ['すぐ分かった', '少し迷った', '分からなかった'])) +
          box(`<label for="rvbody">2. 使ってみた感想や、迷ったところを教えてください${req}</label>`, `<textarea id="rvbody" rows="4">${esc(f.body || '')}</textarea><span class="cnt" id="cnt"></span>`)
        : box('1. 書きたいことを選んでください', `<div class="chips col">${['面白かった瞬間', '面倒になった・やめたくなった瞬間', 'あったら嬉しい機能'].map(v => `<label class="chip"><input type="radio" name="topic" value="${esc(v)}" ${f.topic === v ? 'checked' : ''}><span>${esc(v)}</span></label>`).join('')}</div>
            <label for="rvbody" class="rv-sub" id="rvlab">${esc(f.topic || '選んだこと')}を教えてください${req}</label><textarea id="rvbody" rows="4">${esc(f.body || '')}</textarea><span class="cnt" id="cnt"></span>`) +
          box('2. 配当のバランスはどう感じますか？', chips('balance', ['低い', 'ちょうどいい', '高い']));
      const k = first ? 3 : 3;
      const bug = box(`${k}. 表示や動きで、おかしなところはありましたか？`, chips('bug', ['なかった', 'あった']) +
        `<div id="bugbox" ${f.bug === 'あった' ? '' : 'hidden'}><label for="rvbug" class="rv-sub">どんなことが起きましたか？${req}</label><textarea id="rvbug" rows="3" placeholder="例：文字を大きくしたら崩れた／ボタンが反応しない／写真が出ない">${esc(f.bugText || '')}</textarea></div>`);
      const note = box(`<label for="rvnote">${k + 1}. ホストへのひとこと${opt}</label>`, `<textarea id="rvnote" rows="3">${esc(f.note || '')}</textarea>`);
      $app.innerHTML = subBar('レビュー') + `<div class="rv"><div class="rv-h"><b>${first ? 'はじめてのレビュー' : '遊んでみてどうでしたか？'}</b><span>${first ? '使ってみた最初の印象を教えてください。読むのはホストだけです。' : '今回書きたいことを1つ選んでください。読むのはホストだけです。'}</span></div>${q1}${bug}${note}</div>
        <div class="dock"><div class="err" id="rverr" style="color:#FFC9C9"></div><button class="btn gold block" id="rvsend">送信して${fmt(R.review)}ptを受け取る</button></div>`;
      document.getElementById('back').onclick = () => { S.screen = 'refill'; render(); };
      const upd = () => {
        $app.querySelectorAll('input[type=radio]:checked').forEach(x => f[x.name] = x.value);
        f.body = document.getElementById('rvbody').value; f.bugText = document.getElementById('rvbug').value; f.note = document.getElementById('rvnote').value;
        const len = f.body.trim().length, c = document.getElementById('cnt');
        c.textContent = len + '文字（20文字以上）'; c.className = 'cnt' + (len >= 20 ? ' ok' : '');
        document.getElementById('bugbox').hidden = f.bug !== 'あった';
        const lab = document.getElementById('rvlab'); if (lab) lab.innerHTML = esc(f.topic || '選んだこと') + 'を教えてください' + req;
        const ready = len >= 20 && f.bug && (f.bug !== 'あった' || f.bugText.trim()) && (first ? f.understood : f.topic && f.balance);
        document.getElementById('rvsend').disabled = !ready;
      };
      $app.querySelectorAll('.rv input, .rv textarea').forEach(x => { x.oninput = upd; x.onchange = upd; });
      upd();
      document.getElementById('rvsend').onclick = async () => {
        const answers = first ? { understood: f.understood, body: f.body, bug: f.bug, bugText: f.bugText, note: f.note } : { topic: f.topic, body: f.body, balance: f.balance, bug: f.bug, bugText: f.bugText, note: f.note };
        try { const before = S.data.me.balance; const r = await api('refill', { method: 'review', answers }); rf.done = { pt: r.pt, balance: r.balance, before }; S.screen = 'reviewdone'; render(); window.scrollTo(0, 0); }
        catch (e) { document.getElementById('rverr').textContent = e.message; }
      };
      return;
    }
    if (sc === 'reviewdone') {
      $app.innerHTML = ptsBar('レビュー', rf.done.balance) + `<div class="rv-thx"><b>ありがとうございます！</b><span>いただいた声は、アプリやゲームを<br>良くするために使わせてもらいます。</span></div>${doneCard('y')}
        <div class="pad" style="margin-top:auto"><button class="btn gold block" id="home">予想にもどる</button></div>`;
      document.getElementById('home').onclick = backHome;
    }
  }
  async function startQuiz() {
    try { const r = await api('quizStart'); S.rf = { qs: r.questions, pt: r.pt, i: 0, ans: [], form: {} }; S.screen = 'quiz'; render(); window.scrollTo(0, 0); } catch (e) {}
  }

  // ---------- ホストタブ ----------
  // withState：画面の中身（持ち点など）も同時に読み直す（順番に読むより速い）
  async function loadHost(withState, opt) {
    const bg = opt && opt.quiet; // 後ろで読み直す（中華鍋の画面を出さない・失敗しても今の画面のまま）
    try {
      const [h, st] = await Promise.all([api('hostState', {}, bg ? { loading: false } : undefined), withState ? api('state', {}, { loading: false }) : null]);
      S.host = h; if (st) S.data = st; S.hp = null; S.redo = {}; S.photo = {};
    } catch (e) { if (!bg) S.host = null; }
    if (bg) { if (S.tab === 'host' && !S.screen) { const y = window.scrollY; render(); window.scrollTo(0, y); } return; }
    render(); window.scrollTo(0, 0);
  }
  function hostTab() {
    const H = S.host;
    if (!H) return '<div class="center"><button class="btn ghost" id="hreload">読み込み直す</button></div>';
    const w = H.week;
    const html = (w && w.status === '受付中' && w.closed) ? dayView(w) : prepView(H);
    const rl = (H.refills || []);
    if (!rl.length) return html;
    const card = `<div class="pad"><div class="rfl"><b>最近7日の補充</b>${rl.map(x => { const d = new Date(x.at); return `<div><span>${d.getMonth() + 1}/${d.getDate()}</span><span class="n">${esc(x.nick)}</span><span>${esc(x.method)}</span><b>＋${fmt(x.pt)}</b></div>`; }).join('')}</div></div>`;
    const i = html.lastIndexOf('<div class="foot"');
    return i >= 0 ? html.slice(0, i) + card + html.slice(i) : html + card;
  }
  function steps(n) {
    const s = ['出馬表', '受付', '食べたもの'];
    return '<div class="steps3">' + s.map((t, i) => `<span class="s ${i + 1 === n ? 'on' : ''}"><i>${i + 1}</i>${t}</span>`).join('<span class="ln"></span>') + '</div>';
  }
  function localDT(iso) { const d = new Date(iso); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function prepView(H) {
    const w = H.week;
    if (!S.hp) {
      S.hp = w ? { weekId: w.weekId, raceName: w.raceName, mumble: w.mumble || '', deadline: localDT(w.deadline), menus: w.menus.map(m => ({ waku: m.waku, name: m.name })) }
        : { weekId: H.suggest, raceName: (H.raceNames && H.raceNames[H.raceNames.length - 1]) || '昼中華ステークス', mumble: '', deadline: H.suggest + 'T11:30', menus: newMenus(H) };
    }
    const hp = S.hp, published = w && w.status === '受付中';
    const locked = published && w.predCount > 0;
    const round = (H.rounds && H.rounds[hp.raceName]) || (w && w.raceName === hp.raceName ? w.round : 1);
    const odds = i => H.odds[i] || (16 + (i - 7) * 4);
    const tag = m => m.name.trim() === OTHER_NAME ? '<em class="tg o">料理名は結果で</em>' : m.fixed ? '<em class="tg">いつも</em>' : '';
    const rows = hp.menus.map((m, i) => `<div class="mrow"><span class="pop" style="${i === 0 ? 'color:var(--red)' : i === 1 ? 'color:#1F5BC4' : ''}">${i + 1}</span><span class="mi"><input value="${esc(m.name)}" data-mi="${i}" placeholder="${m.fixed ? 'いつものメニュー' : 'メニュー名'}" aria-label="${i + 1}番人気のメニュー" ${locked ? 'disabled' : ''}>${tag(m)}</span><span class="od">${oddsTxt(odds(i))}</span><button data-up="${i}" aria-label="人気を上げる" ${i === 0 || locked ? 'disabled' : ''}>▲</button><button data-dn="${i}" aria-label="人気を下げる" ${i === hp.menus.length - 1 || locked ? 'disabled' : ''}>▼</button><button data-del="${i}" aria-label="消す" ${locked ? 'disabled' : ''}>✕</button></div>`).join('');
    return steps(published ? 2 : 1) +
      `<div class="pad">
        <label class="field"><span style="font-size:12px;color:var(--sub)">開催日（火曜）</span><input type="date" id="hweek" value="${esc(hp.weekId)}" ${w ? 'disabled' : ''}></label>
        <div class="field"><span style="font-size:12px;color:var(--sub)">レース名</span><div style="display:flex;gap:8px;align-items:center"><input id="hname" list="hnames" value="${esc(hp.raceName)}" style="flex:1"><b style="flex:none;font-size:15px">第${round}回</b></div><datalist id="hnames">${(H.raceNames || []).map(n => `<option value="${esc(n)}">`).join('')}</datalist></div>
        <label class="field"><span style="font-size:12px;color:var(--sub)">店長のつぶやき（任意）</span><input id="hmum" value="${esc(hp.mumble)}" maxlength="40"></label>
        <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:12px;font-weight:700;color:var(--sub)"><span>メニュー（人気の順に並べる）</span>${locked ? '<span style="color:var(--red)">予想が入ったので変更できません</span>' : ''}</div>
        ${locked ? '' : `<button class="btn gray ocr" id="hocr">${CAM_ICON}<span><b>エアレジのスクショから読み込む</b><small>「1.」〜「5.」のメニュー名を1〜5番に入れます</small></span></button>`}
        <div class="mlist2"><div class="mrow th"><span style="text-align:center">人気</span><span>メニュー</span><span style="text-align:right">オッズ</span><span></span><span></span><span></span></div>${rows}${locked ? '' : '<button class="addm" id="hadd">＋ メニューを追加</button>'}</div>
        <label class="field"><span style="font-size:12px;color:var(--sub)">締切</span><input type="datetime-local" id="hdl" value="${esc(hp.deadline)}"></label>
        <div class="err" id="herr"></div>
        ${published && H.test ? `<div class="testbox"><b>テスト環境だけ</b><span>締切を待たずに、食べたものの登録と結果を試せます。</span><button class="btn ghost" id="htclose">締切を今にする</button></div>` : ''}
        <details class="regs" ${S.regsOpen ? 'open' : ''}><summary>いつものメニュー（新しい週の6・7番に自動で入る）</summary>
          <div class="regs-b">${[0, 1].map(i => `<label class="field"><span>${i + 6}番</span><input id="hreg${i}" maxlength="30" value="${esc((H.regulars || [])[i] || '')}" placeholder="例：${i ? '餃子定食' : '天津飯'}"></label>`).join('')}
          <button class="btn ghost" id="hregsave">いつものメニューを保存</button></div></details>
      </div>
      <div class="foot">${published ? '<span></span>' : '<button class="btn ghost" id="hdraft">下書き保存</button>'}<button class="btn red" id="hpub">${published ? '変更を保存する' : '出馬表を公開する'}</button></div>`;
  }
  function newMenus(H) {
    const reg = H.regulars || [];
    return [1, 2, 3, 4, 5].map(i => ({ waku: i, name: '' })).concat([0, 1].map(i => ({ waku: 6 + i, name: reg[i] || '', fixed: true })), [{ waku: 8, name: OTHER_NAME }]);
  }
  function dayView(w) {
    const res = w.results;
    const next = DAYS.find(d => !res[d] || S.redo[d]);
    const cards = DAYS.map(d => {
      const r = res[d];
      if (r && !S.redo[d]) {
        return `<div class="dayc"><div class="t"><span>${d}曜</span><span class="done">${r.waku === 0 ? '中止' : r.waku + ' ' + esc(r.name) + (r.other ? '（' + OTHER_NAME + '）' : '')} ✓ 発表済み</span></div>${r.photo ? `<button class="thumb ph" data-zoom="${d}" aria-label="${d}曜の写真を拡大"><img src="${esc(r.photo)}" alt="" referrerpolicy="no-referrer"></button>` : ''}${r.locked ? '<span class="dlock">発表日を過ぎたので、変更できません</span>' : `<button class="btn gray" data-redo="${d}">やり直す</button>`}</div>`;
      }
      if (d !== next) return `<div class="dayc" style="color:var(--mute)"><div class="t"><span>${d}曜</span><span style="font-size:12px;font-weight:500">${DAYS[DAYS.indexOf(d) - 1]}曜のあとに登録</span></div></div>`;
      const sel = (S.daySel || {})[d] || (r && S.redo[d] ? r.waku : 0);
      const selM = w.menus.find(m => m.waku === sel);
      const isOther = selM && selM.name === OTHER_NAME;
      if (isOther && S.dayOther[d] === undefined && r && r.other) S.dayOther[d] = r.name;
      const picks = w.menus.slice().sort((a, b) => a.waku - b.waku).map(m => `<button class="pk ${sel === m.waku ? 'on' : ''}" data-pick="${m.waku}" aria-pressed="${sel === m.waku}">${waku(m.waku)}<span>${esc(m.name)}</span></button>`).join('');
      const ph = S.photo[d];
      return `<div class="dayc cur"><div class="t"><span>${d}曜に食べたもの</span></div>
        <span class="dhint">${sel ? '写真を確かめて、発表してください' : '食べたものをタップすると、カメラが開きます'}</span>
        <div class="pks">${picks}</div>
        ${isOther ? `<label class="field oth"><span>実際に食べた料理名</span><input id="dother" maxlength="30" value="${esc(S.dayOther[d] || '')}" placeholder="例：エビチリ"></label>` : ''}
        ${sel ? (ph ? `<div class="shot"><button class="ph" data-zoomnew aria-label="撮った写真を拡大"><img src="${photoSrc(ph)}" alt="撮った写真"></button><div><b>撮った写真</b><button class="lnk" id="dcam">撮り直す</button><button class="lnk" id="dalb">アルバムから選ぶ</button></div></div>`
          : `<div class="shot none"><button class="btn gray" id="dcam">${CAM_ICON}写真を撮る</button><button class="lnk" id="dalb">アルバムから選ぶ</button></div>`) : ''}
        <button class="btn green" id="dpub" ${sel && !S.sending[d] ? '' : 'disabled'}>${S.sending[d] ? '発表しています…' : d + '曜の食べたものを発表する'}</button>
        <button class="btn gray" id="dcancel">${d}曜は中止にする（メニュー外・休み）</button></div>`;
    }).join('');
    const all = DAYS.every(d => res[d]);
    return steps(3) + `<div class="race"><div class="row"><h1 style="font-size:17px">第${w.round}回 ${esc(w.raceName)}</h1><span class="pill run">開催中</span></div></div><div class="pad">${cards}</div>
      <div class="foot" style="grid-template-columns:1fr"><button class="btn red" id="settle" ${all ? '' : 'disabled'}>${all ? '結果を確定する' : '3日分そろったら確定'}</button></div>`;
  }
  function bindHost() {
    const H = S.host;
    const rl = document.getElementById('hreload'); if (rl) rl.onclick = loadHost;
    if (!H) return;
    const w = H.week;
    if (w && w.status === '受付中' && w.closed) return bindDay(w);
    const hp = S.hp;
    const sync = () => {
      const g = id => document.getElementById(id);
      if (g('hweek')) hp.weekId = g('hweek').value;
      hp.raceName = g('hname').value; hp.mumble = g('hmum').value; hp.deadline = g('hdl').value;
      $app.querySelectorAll('[data-mi]').forEach(inp => hp.menus[Number(inp.dataset.mi)].name = inp.value);
    };
    const rer = () => { sync(); render(); };
    $app.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { sync(); const i = Number(b.dataset.up); [hp.menus[i - 1], hp.menus[i]] = [hp.menus[i], hp.menus[i - 1]]; render(); });
    $app.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => { sync(); const i = Number(b.dataset.dn); [hp.menus[i + 1], hp.menus[i]] = [hp.menus[i], hp.menus[i + 1]]; render(); });
    $app.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { sync(); hp.menus.splice(Number(b.dataset.del), 1); render(); });
    const add = document.getElementById('hadd'); if (add) add.onclick = () => { sync(); hp.menus.push({ waku: Math.max(0, ...hp.menus.map(m => m.waku)) + 1, name: '' }); render(); };
    const hw = document.getElementById('hweek');
    if (hw) hw.onchange = () => { const old = hp.weekId; sync(); if (hp.deadline.startsWith(old)) hp.deadline = hp.weekId + hp.deadline.slice(10); render(); };
    document.getElementById('hname').onchange = rer;
    const save = async publish => {
      sync();
      const er = document.getElementById('herr'); er.textContent = '';
      const d = new Date(hp.weekId + 'T00:00'); if (d.getDay() !== 2) return er.textContent = '開催日は火曜日を選んでください';
      const menus = hp.menus.filter(m => m.name.trim());
      if (menus.length < 2) return er.textContent = 'メニューを2品以上入れてください';
      if (publish && !(w && w.status === '受付中') && !confirm('出馬表を公開します。みんなが予想できるようになります。')) return;
      try { await busy(async () => {
        await api('saveWeek', { weekId: hp.weekId, raceName: hp.raceName, mumble: hp.mumble, deadline: new Date(hp.deadline).toISOString(), menus: menus.map(m => ({ waku: m.waku, name: m.name.trim() })), publish: publish || (w && w.status === '受付中') });
        toast(publish ? (w && w.status === '受付中' ? '保存しました' : '出馬表を公開しました') : '下書きを保存しました');
        S.hp = null; // 保存した内容（枠の詰め直しなど）をサーバーから読み直す
        await loadHost(true);
      }); } catch (e) { er.textContent = e.message; }
    };
    const ocr = document.getElementById('hocr');
    if (ocr) ocr.onclick = () => picker.open(false, async img => {
      try {
        const r = await api('readMenu', { image: img });
        sync();
        (r.names || []).forEach((nm, i) => {
          if (!nm) return;
          const row = hp.menus.find(m => m.waku === i + 1);
          if (row) { row.name = nm; row.fixed = false; } else hp.menus.splice(i, 0, { waku: i + 1, name: nm });
        });
        render();
        const miss = (r.names || []).map((nm, i) => nm ? '' : i + 1).filter(Boolean);
        toast(r.found ? r.found + '品を読み込みました' + (miss.length ? '（' + miss.join('・') + '番は手で入れてください）' : '。まちがいがないか確かめてください') : '「1.」〜「5.」のメニューが見つかりませんでした。手で入れてください');
      } catch (e) {}
    }, { max: 2400, q: 0.9 });
    const rs = document.getElementById('hregsave');
    if (rs) rs.onclick = async () => {
      sync();
      const names = [0, 1].map(i => document.getElementById('hreg' + i).value.trim());
      try {
        const old = H.regulars || [];
        const r = await api('saveRegulars', { names });
        H.regulars = r.regulars; S.regsOpen = true;
        if (!w) hp.menus.forEach(m => { if (m.fixed) { const k = m.waku - 6; if (k >= 0 && k < 2 && (!m.name.trim() || m.name.trim() === old[k])) m.name = r.regulars[k] || ''; } });
        toast('いつものメニューを保存しました'); render();
      } catch (e) {}
    };
    const rg = $app.querySelector('details.regs'); if (rg) rg.ontoggle = () => { S.regsOpen = rg.open; };
    const tc = document.getElementById('htclose');
    if (tc) tc.onclick = async () => {
      if (!confirm('締切を今にします（テスト環境だけ）。このあとは予想できなくなり、食べたものの登録に進みます。')) return;
      try { await busy(async () => { await api('testCloseNow', { weekId: w.weekId }); await loadHost(true); }); toast('締切を今にしました'); } catch (e) {}
    };
    const dr = document.getElementById('hdraft'); if (dr) dr.onclick = () => save(false);
    document.getElementById('hpub').onclick = () => save(true);
  }
  function bindDay(w) {
    $app.querySelectorAll('[data-redo]').forEach(b => b.onclick = () => { S.redo[b.dataset.redo] = true; render(); });
    const next = DAYS.find(d => !w.results[d] || S.redo[d]);
    S.daySel = S.daySel || {};
    bindZoom(w.results);
    const shoot = cam => picker.open(cam, ph => { S.photo[next] = ph; render(); const s = $app.querySelector('.dayc.cur .shot'); if (s) s.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
    $app.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
      keepOther();
      S.daySel[next] = Number(b.dataset.pick); render();
      if (!S.photo[next]) shoot(true); // 写真がまだなら、そのままカメラを開く
    });
    const keepOther = () => { const o = document.getElementById('dother'); if (o) S.dayOther[next] = o.value; };
    const oth = document.getElementById('dother'); if (oth) oth.oninput = keepOther;
    const cam = document.getElementById('dcam'); if (cam) cam.onclick = () => { keepOther(); shoot(true); };
    const alb = document.getElementById('dalb'); if (alb) alb.onclick = () => { keepOther(); shoot(false); };
    const zn = $app.querySelector('[data-zoomnew]'); if (zn) zn.onclick = () => openZoom([{ src: photoSrc(S.photo[next]), cap: `<b>${next}曜</b> 撮った写真` }], 0);
    const send = async wk => {
      const ph = wk === 0 ? null : S.photo[next] || null;
      const m = w.menus.find(x => x.waku === wk);
      const other = m && m.name === OTHER_NAME ? String(S.dayOther[next] || '').trim() : '';
      if (m && m.name === OTHER_NAME && !other) { toast('実際に食べた料理名を入れてください'); const o = document.getElementById('dother'); if (o) o.focus(); return; }
      const day = next;
      // 返事が届かなかっただけで、サーバーには登録できていることがある。読み直して確かめる
      const register = async () => {
        try { await api('registerDay', { weekId: w.weekId, day, waku: wk, photo: ph, otherName: other }, { loading: false, quiet: true }); }
        catch (e) {
          if (!e.network) { toast(e.message); throw e; }
          const h = await api('hostState', {}, { loading: false });
          const got = h.week && h.week.results && h.week.results[day];
          if (!(got && got.waku === wk && (!ph || got.photo))) { toast('通信できませんでした。電波のよいところでやり直してください'); throw e; }
        }
        delete S.redo[day]; delete S.photo[day]; delete S.daySel[day]; delete S.dayOther[day];
      };
      if (ph) {
        // 写真があるときは、登録の返事を待たずに Slack の画面を出す（登録は後ろで進める）
        if (S.sending[day]) return;
        S.sending[day] = true; render();
        openSlackSheet(ph, other || m.name, day);
        try {
          await register();
          slackStat(day, 'ok', day + '曜を発表しました');
          toast(day + '曜を発表しました');
        } catch (e) {
          slackStat(day, 'ng', '発表できませんでした。閉じて、もう一度「発表する」を押してください');
        } finally {
          delete S.sending[day];
          loadHost(true, { quiet: true });
        }
        return;
      }
      try {
        await busy(register);
        toast(day + '曜を' + (wk === 0 ? '中止にしました' : '発表しました'));
        loadHost(true, { quiet: true });
      } catch (e) {}
    };
    const pub = document.getElementById('dpub');
    if (pub) pub.onclick = () => { keepOther(); const v = S.daySel[next] || (S.redo[next] && w.results[next] ? w.results[next].waku : 0); if (!v) return toast('メニューを選んでください'); send(v); };
    const cx = document.getElementById('dcancel');
    if (cx) cx.onclick = () => { if (confirm(next + '曜を中止にします。中止の日がある週は、全員の使ったptを全額返します。')) send(0); };
    const st = document.getElementById('settle');
    if (st) st.onclick = async () => {
      if (!confirm('結果を確定します。確定するとptが計算され、元に戻せません。')) return;
      try { const r = await busy(async () => { const x = await api('settle', { weekId: w.weekId }); await loadHost(true); return x; }); toast(r.status === '返還' ? '確定しました（全額返還）' : '結果を確定しました'); } catch (e) {}
    };
  }
  function shrink(file, maxSize, quality) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file); const im = new Image();
      im.onload = () => {
        const max = maxSize || 1280, k = Math.min(1, max / Math.max(im.width, im.height));
        const cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
        const d = cv.toDataURL('image/jpeg', quality || 0.82); res({ mime: 'image/jpeg', data: d.split(',')[1] });
      };
      im.onerror = rej; im.src = url;
    });
  }

  // ---------- 起動 ----------
  render();
  if (S.token && !POST_MODE) {
    if (S.tab === 'host') loadHost(true).then(() => { if (!S.data) refresh().catch(() => {}); });
    else refresh().then(() => { if (S.tab === 'kekka') maybeGong(S.data.lastResult); }).catch(() => {});
  }
})();
