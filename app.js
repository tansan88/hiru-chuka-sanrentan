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
  const APP_VERSION = 3;
  // /test/ で開いたとき、または ?env=test を付けたときはテスト環境につなぐ
  const ENV_TEST = /\/test\//.test(location.pathname) || /[?&]env=test(&|$)/.test(location.search);
  const API_URL = window.CONFIG ? (ENV_TEST ? CONFIG.API_URL_TEST : CONFIG.API_URL) || '' : '';
  const NO_API = !API_URL;
  // ?post を付けて開くと「Slackへの投稿をつくる」だけの画面（ログインが要る。送ったメニューは食事の記録に残す）
  const POST_MODE = /[?&]post(=|&|$)/.test(location.search);
  // ホーム画面に追加したときの名前とアイコン（PWA）。テスト環境（/test/）は名前とアイコンに「テスト」が付く
  // アイコンは参加者が選べる（メニューの「アプリのアイコン」）。iPhone は追加した瞬間の apple-touch-icon を使うので、選べるのは追加する前だけ
  const PWA_TEST = /\/test\//.test(location.pathname);
  const ICONS = [['default', '既定'], ['light', 'ライト'], ['dark', 'ダーク'], ['longshadow', '長い影'], ['aqua', 'アクア'], ['glass', 'ガラス'], ['neon', 'ネオン'], ['neonblue', 'ネオン青'], ['terminal', 'ターミナル'], ['led', '電光掲示板'], ['yoichi', '夜市'], ['gold', '金の雷紋'], ['seika', '青花'], ['chochin', '提灯'], ['hisui', '翡翠']];
  const IS_STANDALONE = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  const iconSrc = (id, size) => 'assets/pwa/icons/' + id + (PWA_TEST ? '-test' : '') + '-' + size + '.png';
  (function () {
    const head = document.head;
    const link = (rel, href, id) => { const l = document.createElement('link'); l.rel = rel; l.href = href; if (id) l.id = id; head.appendChild(l); };
    link('manifest', 'assets/pwa/manifest' + (POST_MODE ? '-post' : '') + (PWA_TEST ? '-test' : '') + '.webmanifest');
    link('apple-touch-icon', iconSrc(POST_MODE ? 'post' : 'default', 180), 'touchicon');
  })();
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
  // 通知を受け取る仕組み（service worker）。テスト環境は /test/sw.js が /test/ だけを受け持つ（本番のものより範囲が狭いので優先される）
  const PUSH_OK = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const SWP = ('serviceWorker' in navigator && !POST_MODE) ? navigator.serviceWorker.register('sw.js').catch(() => null) : Promise.resolve(null);
  function iconId() { const v = store.get('pwa_icon'); return ICONS.some(x => x[0] === v) ? v : 'default'; }
  // 「投稿をつくる」（?post）は、3連単と見分けられるよう、いつも投稿専用のアイコン（丼にカメラ）
  function applyIcon() { const l = document.getElementById('touchicon'); if (l) l.href = iconSrc(POST_MODE ? 'post' : iconId(), 180); }
  applyIcon();


  const S = { post: { ph: null, name: '' }, dayOther: {}, token: store.get('hc_token'), data: null, tab: store.get('hc_tab') || 'yoso', screen: null, editing: false, sel: { 火: [], 水: [], 木: [] }, bet: '', host: null, hp: null, redo: {}, photo: {}, sending: {}, view: null, hist: null, authMode: 'login' };
  // 通知を押して開いたとき（?tab=yoso）は、今週の出馬表（予想タブ）を出す。URL からは消しておく
  if (/[?&]tab=yoso(&|$)/.test(location.search)) {
    S.tab = 'yoso'; store.set('hc_tab', 'yoso');
    try { history.replaceState(null, '', location.pathname + location.search.replace(/([?&])tab=yoso(&|$)/, (m, a, b) => (b ? a : '')).replace(/[?&]$/, '')); } catch (e) {}
  }
  // アプリを開いたまま通知を押したときは、service worker から知らせが来る
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => {
    if (!e.data || e.data.type !== 'openYoso' || POST_MODE) return;
    closeLayer(); S.screen = null; S.tab = 'yoso'; store.set('hc_tab', 'yoso');
    if (S.data) refresh(); else render();
  });

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
  // 買う（predict）は2回届くと2組になるので、自動では送り直さない
  const RETRY_OK = ['state', 'history', 'week', 'hostState', 'saveWeek', 'registerDay', 'saveRegulars', 'testCloseNow', 'readMenu', 'quizStart', 'postMenus'];
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
        if (res.reload) { showReload(action); const e = new Error(res.error || ''); e.silent = true; throw e; }
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
    maybeNotice();
  }
  function logout(silent) {
    S.token = null; store.set('hc_token', null); S.data = null; S.screen = null; S.authMode = 'login'; S.host = null; S.hp = null; closeLayer();
    if (!silent) toast('ログアウトしました');
    render();
  }

  // ---------- 描画の入口 ----------
  function render() {
    if (POST_MODE) return S.token ? renderPost() : renderAuth(); // 投稿も誰が食べたかを記録するので、ログインが切れたら入り直してもらう
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
    stickTop();
  }
  // 上の電光を、見出しとタブのすぐ下に止める（iPhone の上の余白で高さが変わるので測る）
  function stickTop() {
    requestAnimationFrame(() => { const b = $app.querySelector('.bar'), t = $app.querySelector('.tabs'); document.documentElement.style.setProperty('--stick', ((b ? b.offsetHeight : 52) + (t ? t.offsetHeight : 0)) + 'px'); });
  }
  function header() {
    const b = S.data.me.balance;
    return `<header class="bar">${LOGO}<div class="right"><span class="pts ${b <= 0 ? 'zero' : ''}">持ち点<br><b>${fmt(b)}</b> pt</span><button class="ibtn" data-act="menu" aria-label="メニュー">${MENU_ICON}</button></div></header>`;
  }
  function bindCommon() {
    $app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
    const m = $app.querySelector('[data-act="menu"]'); if (m) m.onclick = openMenu;
    $app.querySelectorAll('[data-act="refill"]').forEach(b => b.onclick = openRefill);
    $app.querySelectorAll('[data-act="ai"]').forEach(b => b.onclick = openAI);
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
        if (POST_MODE) { render(); flushPostLog(); return; }
        if (r.state) { S.data = r.state; render(); maybeNotice(); } else await refresh(); // ログインの返事に画面の中身も入っている（お知らせもここで出す）
      } catch (e) { er.textContent = e.message; }
    };
  }

  // ---------- 予想タブ（複数券：フォーメーション） ----------
  // 見出しの右の「受付中」「開催中」の札は出さない（状態は上の電光で分かる）
  function raceHead(v) {
    return `<div class="race"><div class="row"><h1>${esc(v.title)}</h1></div><span class="when">${esc(v.dates)}${v.closed ? '・受付は締め切りました' : '・<em>' + deadlineLabel(v.deadline) + '</em>'}</span></div>`;
  }
  // 1組の点数・配当（日替わりは1点ごと、3連単は3日とも含むときの1点）
  const ptsOf = p => DAYS.reduce((a, d) => a * (p[d] || []).length, 1);
  function oddsOf(v, w) { const m = v.menus.find(x => x.waku === w); return m ? m.odds : 0; }
  function setPay(v, s, res) {
    const n = d => s.picks[d].length;
    let day = 0, all = true;
    DAYS.forEach(d => {
      const hit = res[d] && s.picks[d].indexOf(res[d]) >= 0;
      if (!hit) { all = false; return; }
      day += Math.floor(s.bet / 3 * oddsOf(v, res[d])) * DAYS.filter(x => x !== d).reduce((a, x) => a * n(x), 1);
    });
    const tri = all ? Math.floor(s.bet * oddsOf(v, res.火) * oddsOf(v, res.水) * oddsOf(v, res.木)) : 0;
    return { day, tri, all: day + tri };
  }
  // まだ決まっていない日をすべて試して、いちばん多く戻る場合（当たれば最大）
  function maxPay(v, sets, known) {
    const ws = v.menus.map(m => m.waku);
    let best = 0;
    const cand = d => known[d] ? [known[d]] : ws;
    cand('火').forEach(a => cand('水').forEach(b => cand('木').forEach(c => {
      const r = { 火: a, 水: b, 木: c }, val = sets.reduce((s, x) => s + setPay(v, x, r).all, 0);
      if (val > best) best = val;
    })));
    return best;
  }
  // 3連単がまだ生きている点数
  function alivePts(sets, res) {
    return sets.reduce((a, s) => DAYS.some(d => res[d] && s.picks[d].indexOf(res[d]) < 0) ? a : a + DAYS.reduce((m, d) => m * (res[d] ? 1 : s.picks[d].length), 1), 0);
  }
  function knownRes(v) { const r = {}; DAYS.forEach(d => { if (v.results[d] && v.results[d].waku) r[d] = v.results[d].waku; }); return r; }
  function totalsOf(sets) { return { sets: sets.length, p: sets.reduce((a, s) => a + s.points, 0), c: sets.reduce((a, s) => a + s.cost, 0) }; }
  function remainLabel(iso) {
    const ms = new Date(iso) - Date.now(); if (!(ms > 0)) return 'まもなく';
    const h = Math.floor(ms / 3600e3), d = Math.floor(h / 24);
    return d ? `あと${d}日と${h % 24}時間` : h ? `あと${h}時間` : `あと${Math.max(1, Math.round(ms / 60e3))}分`;
  }
  // 組のカード（あなたの買い目）
  function setCard(v, s, opt) {
    opt = opt || {};
    const res = opt.res || {};
    const name = w => (v.menus.find(x => x.waku === w) || {}).name || '';
    const rows = DAYS.map(d => `<div class="fc-rw"><em>${d}</em><span class="fc-its">${s.picks[d].map(w => `<span class="fc-it ${res[d] ? (res[d] === w ? 'h' : 'm') : ''}">${waku(w)}${esc(name(w))}</span>`).join('')}</span></div>`).join('');
    const right = opt.del ? `<button class="fc-del" data-del="${s.set}">取り消す</button>` : (opt.badge || '<span></span>');
    const tag = s.from ? `<span class="fc-tag">${esc(s.from)}</span>` : '';
    const sum = opt.ret !== undefined ? `<span>使った ${fmt(s.cost)}pt → <b class="${opt.ret > 0 ? 'plus' : ''}">${opt.ret > 0 ? '+' + fmt(opt.ret) : '0'}pt</b></span>` : `<b>${fmt(s.cost)}pt</b>`;
    return `<div class="fc-set${opt.glow ? ' just' : ''}"><div class="fc-rows">${rows}</div>${right}<div class="fc-sum"><span>${s.points}点 × ${fmt(s.bet)}pt${tag}</span>${sum}</div></div>`;
  }
  // 上の電光（予想タブ・AI予想の画面）。買う前は4つの話題を札ごと流し、買ったあとは受付を流し続ける
  function buyLed(v) {
    const rc = v.receipts || [];
    const isNew = S.newAt && Date.now() - S.newAt < 2500;
    if (!rc.length) {
      const items = [];
      if (v.mumble) items.push(['店長のつぶやき', v.mumble]);
      const lr = S.data.lastResult;
      if (lr) {
        const r = lr.results || {};
        if (lr.status === '返還') items.push(['先週の結果', '中止の日があったため返還']);
        else if (DAYS.every(d => r[d])) {
          const mul = DAYS.reduce((a, d) => a * (lr.menus.find(m => m.waku === r[d].waku) || { odds: 0 }).odds, 1);
          items.push(['先週の結果', DAYS.map(d => r[d].name).join(' → ') + '　3連単 ' + oddsTxt(mul) + '倍']);
        }
      }
      items.push(['予想済み', `いま ${v.predCount || 0}人が予想しています`]);
      items.push(['締切まで', `${remainLabel(v.deadline)}（${deadlineLabel(v.deadline).replace('締切 ', '')}）`]);
      const seq = items.map(([l, t]) => `<b class="tg">${esc(l)}</b>${esc(t)}　　　　`).join('');
      const n = items.reduce((a, [l, t]) => a + l.length + t.length + 4, 0);
      return `<div class="ledC idle" role="status" aria-label="${esc(items.map(x => x.join(' ')).join('　'))}"><span class="mq"><span style="animation-duration:${(n * .3).toFixed(1)}s">${seq}${seq}</span></span></div>`;
    }
    const txt = rc.slice().sort((a, b) => b.no - a.no).map(r => `No.${String(r.no).padStart(4, '0')}　${r.sets}組・${r.points}点　${fmt(r.cost)}pt`).join('　／　') + '　／　締切まで ' + remainLabel(v.deadline);
    const m = txt + '　　　　';
    return `<div class="ledC" role="status" aria-label="${esc(txt)}"><span class="l${isNew ? ' grn' : ''}">${isNew ? '受付' : '受付済'}</span><span class="mq"><span style="animation-duration:${Math.max(8, m.length * .32).toFixed(1)}s">${m}${m}</span></span></div>`;
  }
  function afterBuyLed() {
    // 札は緑の「受付」で数回点滅したあと「受付済」に戻る
    clearTimeout(afterBuyLed.t);
    afterBuyLed.t = setTimeout(() => document.querySelectorAll('.ledC .l.grn').forEach(l => { l.classList.remove('grn'); l.textContent = '受付済'; }), 2400);
  }
  function yosoTab() {
    const D = S.data, cur = D.current;
    if (!cur) {
      return `<div class="center">${chefImg('pan','chef')}<div class="bubble"><p style="font-size:16px;font-weight:900">ただいま仕込み中です</p><p>今週の出馬表は月曜に公開します。もうしばらくお待ちください。</p></div>${D.hasPrevResult ? '<button class="btn ghost" data-go="kekka">先週の結果を見る</button>' : ''}${D.me.canRefill ? '<button class="btn gold" data-act="refill">ptを補充する</button>' : ''}</div>`;
    }
    if (cur.isMyHostWeek) return hostWeekView(cur);
    if (cur.closed) return closedView(cur);
    if (D.me.canRefill && !(cur.myPreds || []).length) return zeroView(cur);
    return predictView(cur);
  }
  function oddsCell(m) {
    const cls = m.pop === 1 ? 'p1' : m.pop === 2 ? 'p2' : '';
    return `<span class="od ${cls}"><small>${m.pop}番人気</small><b>${oddsTxt(m.odds)}</b></span>`;
  }
  function nameCell(m, bold) { return `<span class="nm ${m.name.length > 9 ? 'long' : ''}" style="${bold ? '' : 'font-weight:500'}">${esc(m.name)}</span>`; }
  function oddsNote(v) { return v.oddsLive ? '<div class="onote">オッズと人気はみんなの予想（使ったpt）で動きます。締切の時点で確定します</div>' : ''; }
  function tableHead(cols) { return `<div class="tr th"><span>枠</span><span>メニュー</span><span>オッズ</span>${cols.map(c => `<span>${c}</span>`).join('')}</div>`; }
  function emptySel() { return { 火: [], 水: [], 木: [] }; }

  function predictView(v) {
    if (S.selWeek !== v.weekId) {
      S.selWeek = v.weekId; S.sel = emptySel();
      S.bet = String(Math.min(100, Math.floor(S.data.me.balance / 100) * 100) || '');
      try {
        const d = JSON.parse(sessionStorage.getItem(store.key('hc_draft')) || 'null');
        sessionStorage.removeItem(store.key('hc_draft'));
        if (d && d.weekId === v.weekId && d.sel) { S.sel = d.sel; S.bet = String(d.bet || ''); }
      } catch (e) {}
    }
    const sets = v.myPreds || [], t = totalsOf(sets);
    const rows = v.menus.map(m => `<div class="tr">${waku(m.waku)}${nameCell(m, true)}${oddsCell(m)}${DAYS.map(d => { const on = S.sel[d].indexOf(m.waku) >= 0; return `<button class="dot ${on ? 'on' : ''}" data-day="${d}" data-waku="${m.waku}" aria-pressed="${on}" aria-label="${d} ${esc(m.name)}"></button>`; }).join('')}</div>`).join('');
    const glow = S.glowSets || [];
    const list = sets.length
      ? sets.map(s => setCard(v, s, { del: true, glow: glow.indexOf(s.set) >= 0 })).join('') + `<div class="tot"><div><small>合計</small><b>${t.sets}組・${t.p}点</b></div><div><small>使ったpt</small><b>${fmt(t.c)}pt</b></div><div><small>当たれば最大</small><b class="mx">${fmt(maxPay(v, sets, {}))}pt</b></div></div>`
      : '<div class="note" style="margin:0">まだ買っていません</div>';
    return raceHead(v) + buyLed(v) + aiEntry(v) + oddsNote(v) +
      `<div class="tbl">${tableHead(DAYS)}${rows}</div>
      <div class="list"><div class="list-h"><span>あなたの買い目</span></div>${list}</div>
      <div class="dock" id="dock">
        <div class="l1"><span class="fm" id="dfm"></span><span class="mo" id="dmo"></span></div>
        <div class="bet"><label for="bet">1点あたり</label><div class="box"><input id="bet" inputmode="numeric" pattern="[0-9]*" size="6" value="${esc(S.bet)}" placeholder="100pt単位" aria-describedby="derr"><span>pt</span></div></div>
        <div class="err" id="derr" style="color:#FFC9C9"></div>
        <div class="l3"><span class="ret" id="dret"></span><button class="btn gold" id="buy">買う</button></div>
      </div>`;
  }
  function updateDock() {
    const v = S.data.current; if (!v) return;
    const q = id => document.getElementById(id);
    if (!q('dfm')) return;
    const done = DAYS.every(d => S.sel[d].length);
    const n = done ? ptsOf(S.sel) : 0;
    const bet = Number(String(S.bet).replace(/[^\d]/g, ''));
    const max = S.data.me.balance;
    let er = '';
    if (S.bet !== '' && (!(bet >= 100) || bet % 100)) er = '100pt単位で入れてください';
    else if (n && n * bet > max) er = '使えるのは ' + fmt(max) + 'pt までです';
    q('dfm').innerHTML = `火${S.sel.火.length}<span class="x">×</span>水${S.sel.水.length}<span class="x">×</span>木${S.sel.木.length}<span class="x">＝</span><b>${n}点</b>`;
    // 選んだ組み合わせの3連単の倍率（1点なら1つ、複数なら低い〜高い）と、当たれば最大
    let lo = Infinity, hi = 0;
    if (done) S.sel.火.forEach(a => S.sel.水.forEach(b => S.sel.木.forEach(c => { const m = oddsOf(v, a) * oddsOf(v, b) * oddsOf(v, c); lo = Math.min(lo, m); hi = Math.max(hi, m); })));
    q('dmo').innerHTML = done ? `<small>3連単</small><b>${oddsTxt(lo)}${hi > lo ? '〜' + oddsTxt(hi) : ''}</b><small>倍</small>` : '';
    const mx = done && bet && !er ? maxPay(v, [{ picks: S.sel, bet, points: n }], {}) : 0;
    q('dret').innerHTML = done && bet && !er ? `${n}点 × ${fmt(bet)}pt ＝ <b>${fmt(n * bet)}</b> pt<br><span class="mx">当たれば最大 <b>${fmt(mx)}</b> pt</span>` : done ? '' : '火・水・木を1つ以上選んでください';
    q('derr').textContent = er;
    q('buy').textContent = done ? n + '点を買う' : '買う';
    q('buy').disabled = !(done && bet && !er);
  }
  // 締切後〜結果：上の電光＝言葉、下の電光＝数字（3マス｜点数｜金額）。品名は表にあるので下には出さない
  function closedStage(v) {
    const sets = v.myPreds || [], res = knownRes(v);
    const cancelled = DAYS.some(d => v.results[d] && v.results[d].waku === 0);
    const known = Object.keys(res).length;
    const alive = alivePts(sets, res);
    const next = DAYS.find(d => !v.results[d]);
    let st;
    if (cancelled) st = 'cancel';
    else if (!sets.length) st = 'none';
    else if (!known) st = 'closed';
    else if (known === 3) { const pay = sets.reduce((a, s) => a + setPay(v, s, res).all, 0); st = alive ? 'win' : pay ? 'lose' : 'zero'; }
    else if (alive && known === 2) st = 'reach';
    else st = 'day';
    return { st, sets, res, known, alive, next, t: totalsOf(sets) };
  }
  function closedTop(v, i) {
    const nm = w => (v.menus.find(x => x.waku === w) || {}).name || '';
    const need = i.next ? i.sets.filter(s => DAYS.every(d => !i.res[d] || s.picks[d].indexOf(i.res[d]) >= 0)).reduce((a, s) => a.concat(s.picks[i.next]), []).filter((w, k, a) => a.indexOf(w) === k).map(nm).join('・') : '';
    const last = DAYS.slice().reverse().find(d => i.res[d]);
    const T = {
      none: ['開催中', '今週は予想していません　食べたものは毎日ここに出ます'],
      cancel: ['中止', 'メニュー外の日があるため、今週は全額返還します'],
      closed: ['締切', '受付を締め切りました　火曜の発表を待っています'],
      day: [last ? last + '曜' : '発表', `${last ? last + '曜は ' + nm(i.res[last]) + '！　' : ''}${i.alive ? '3連単はまだ生きています　' : '3連単はここまで　日替わりは続きます　'}${i.next ? '次は' + i.next + '曜の発表' : ''}`],
      reach: ['リーチ', `${i.next}曜 ${need} で 3連単 的中`],
      win: ['的中', '3連単 的中！　確定をお待ちください'],
      lose: ['終了', '3連単はここまで　当たった日の配当は獲得に入っています'],
      zero: ['終了', '今週は当たりなし'],
    }[i.st];
    const cls = i.st === 'reach' || i.st === 'win' ? 'red' : i.st === 'lose' || i.st === 'zero' || i.st === 'cancel' ? 'dim' : '';
    const m = T[1] + '　　　　';
    return `<div class="ledC" role="status" aria-label="${esc(T.join(' '))}"><span class="l ${cls}">${T[0]}</span><span class="mq"><span>${m}${m}</span></span></div>`;
  }
  function closedBottom(v, i) {
    if (i.st === 'none' || i.st === 'cancel') return '';
    const cells = DAYS.map(d => {
      const r = i.res[d];
      if (r) { const hit = i.sets.some(s => s.picks[d].indexOf(r) >= 0); return `<div class="c ${hit ? 'hit' : 'miss'}"><small>${d}</small><b>${hit ? '✓' : '×'}</b></div>`; }
      const reach = i.st === 'reach' && d === i.next;
      return `<div class="c ${reach ? 'reach' : ''}"><small>${d}</small><b>${reach ? '？' : '・'}</b></div>`;
    }).join('');
    const fin = i.st === 'win' || i.st === 'lose' || i.st === 'zero';
    const now = i.sets.reduce((a, s) => a + setPay(v, s, i.res).day, 0);
    const got = i.sets.reduce((a, s) => a + setPay(v, s, i.res).all, 0);
    const amt = fin ? (i.st === 'zero' ? -i.t.c : got) : maxPay(v, i.sets, i.res);
    const mid = i.st === 'closed' ? `<b>${i.t.p}点</b><small>${i.t.sets}組・${fmt(i.t.c)}pt</small>`
      : fin ? '<div class="fxbox"></div>'
      : `<span class="al"><small>生き残り</small><b>${i.alive}点</b></span>${now ? `<small>獲得済み +${fmt(now)}</small>` : ''}`;
    const sign = x => (x < 0 ? '−' : '+') + fmt(Math.abs(x));
    return `<div class="ledE${fin ? ' fin ' + i.st : ''}" role="status" aria-label="${fin ? (i.st === 'zero' ? '収支 ' : '獲得 ') + sign(amt) + 'pt' : '当たれば最大 ' + fmt(amt) + 'pt'}"><div class="cells">${cells}</div><div class="mid">${mid}</div><div class="amt"><small>${i.st === 'zero' ? '収支' : fin ? '獲得' : '当たれば最大'}</small><b data-v="${amt}" class="${i.st === 'zero' ? 'neg' : ''}">${sign(amt)}</b></div></div>`;
  }
  function closedView(v) {
    const i = closedStage(v), res = v.results;
    const cancelled = DAYS.filter(d => res[d] && res[d].waku === 0);
    const heads = DAYS.map(d => res[d] && res[d].waku === 0 ? `<span class="colcancel">${d} 中止</span>` : d);
    const mine = (d, w) => i.sets.some(s => s.picks[d].indexOf(w) >= 0);
    const rows = v.menus.map(m => {
      const cells = DAYS.map(d => {
        const r = res[d], my = mine(d, m.waku);
        if (r && r.waku === 0) return my ? '<span class="mk cancel" aria-label="中止">−</span>' : '<span></span>';
        if (my) { if (!r) return `<span class="mk wait${i.st === 'reach' && i.next === d ? ' hot' : ''}" aria-label="予想（発表待ち）"></span>`; return r.waku === m.waku ? '<span class="mk hit" aria-label="当たり">✓</span>' : '<span class="mk miss" aria-label="はずれ">' + MISS_X + '</span>'; }
        if (r && r.waku === m.waku) return `<span class="bowl" role="img" aria-label="${d}曜に食べたもの">${BOWL('#C8102E')}</span>`;
        return '<span></span>';
      }).join('');
      return `<div class="tr">${waku(m.waku)}${nameCell(m, DAYS.some(d => mine(d, m.waku)))}${oddsCell(m)}${cells}</div>`;
    }).join('');
    const list = i.sets.length ? `<div class="list"><div class="list-h"><span>あなたの買い目</span></div>${i.sets.map(s => setCard(v, s, { res: i.res })).join('')}</div>` : '';
    const board = closedBottom(v, i);
    return raceHead(v) + closedTop(v, i) +
      `<div class="legend"><span><span class="mk wait"></span>予想</span><span><span class="mk hit">✓</span>当たり</span><span><span class="mk miss">${MISS_X}</span>はずれ</span><span><span class="bowl" style="width:20px;height:20px">${BOWL('#C8102E')}</span>食べたもの</span>${cancelled.length ? '<span><span class="mk cancel">−</span>中止</span>' : ''}</div>` +
      `<div class="tbl"><div class="tr th"><span>枠</span><span>メニュー</span><span>オッズ</span>${heads.map(h => `<span>${h}</span>`).join('')}</div>${rows}</div>` + list + crowdView(v) + aiEntry(v) +
      (board ? `<div class="dock">${board}</div>` : '');
  }
  // 的中：ドットの花火 → 「的中」の点滅と同時に獲得金額がスロットのように回る
  // 外れ：「終了」が暗くなりながら、獲得金額が回って止まる／0pt：使ったptのマイナスまで回る
  // 同じ週・同じ結果では1回だけ（2回目からは止まった形で出す）
  function playFin(v) {
    const b = document.querySelector('.ledE.fin'); if (!b) return;
    const st = b.classList.contains('win') ? 'win' : b.classList.contains('zero') ? 'zero' : 'lose';
    const box = b.querySelector('.fxbox'), amt = b.querySelector('.amt b'), to = Number(amt.dataset.v) || 0;
    const sign = x => (x < 0 ? '−' : '+') + fmt(Math.abs(x));
    const key = 'fin_' + v.weekId + '_' + st;
    const still = () => { box.innerHTML = `<div class="fx-flash ${st === 'win' ? 'win still' : 'lose still'}">${st === 'win' ? '的中' : '終了'}</div>`; amt.textContent = sign(to); };
    if (store.get(key) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return still();
    store.set(key, '1');
    clearTimeout(playFin.t1); cancelAnimationFrame(playFin.raf);
    const roll = (dur, end, done) => { let t0 = null; const f = ts => { if (!document.body.contains(amt)) return; if (!t0) t0 = ts; const k = Math.min(1, (ts - t0) / dur);
      const x = k < 1 ? Math.round(end * (1 - Math.pow(1 - k, 3)) + (Math.random() - .5) * Math.abs(end) * .1 * (1 - k)) : end; amt.textContent = sign(x); if (k < 1) requestAnimationFrame(f); else if (done) done(); }; requestAnimationFrame(f); };
    amt.textContent = '+0';
    if (st === 'win') {
      box.innerHTML = '<canvas class="fx-cv" width="150" height="56"></canvas>';
      fireworks(box.querySelector('canvas'));
      playFin.t1 = setTimeout(() => { cancelAnimationFrame(playFin.raf); box.innerHTML = '<div class="fx-flash win">的中</div>'; b.classList.add('flashbg'); roll(1800, to, () => { amt.classList.add('pop'); b.classList.remove('flashbg'); }); }, 1800);
    } else { box.innerHTML = '<div class="fx-flash lose">終了</div>'; roll(1600, to); }
  }
  // ドットの花火（電光の粒）
  function fireworks(cv) {
    if (!cv) return;
    const g = cv.getContext('2d'), P = 3; let ps = [], t = 0;
    const burst = () => { const x = 20 + Math.random() * 110, y = 12 + Math.random() * 24, col = ['#FFD60A', '#FF9A1F', '#46F07F', '#FF4D3F'][Math.floor(Math.random() * 4)]; for (let k = 0; k < 26; k++) { const a = Math.random() * Math.PI * 2, s = .6 + Math.random() * 1.6; ps.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 30 + Math.random() * 20, c: col }); } };
    const step = () => { if (!document.body.contains(cv)) return; g.fillStyle = 'rgba(17,17,17,.35)'; g.fillRect(0, 0, 150, 56); if (t++ % 22 === 0) burst();
      ps = ps.filter(p => p.l-- > 0); ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .04; g.fillStyle = p.c; g.fillRect(Math.round(p.x / P) * P, Math.round(p.y / P) * P, P - 1, P - 1); });
      playFin.raf = requestAnimationFrame(step); };
    step();
  }
  // みんなの予想：曜日ごとに、枠の色の帯で人数だけ
  function crowdView(v) {
    const c = v.crowd; if (!c) return '';
    const rows = DAYS.map(d => {
      const list = Object.keys(c[d] || {}).map(k => [Number(k), c[d][k]]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1] || a[0] - b[0]);
      if (!list.length) return '';
      const top = list[0], m = v.menus.find(x => x.waku === top[0]);
      const seg = list.map(([k, n]) => { const w = WAKU[((k - 1) % 8) + 1] || WAKU[1]; return `<span style="flex:${n};background:${w[0]};color:${w[1]};${w[2] ? 'box-shadow:inset 0 0 0 1px ' + w[2] : ''}">${n}</span>`; }).join('');
      return `<div class="cw-row"><span class="cw-d">${d}</span><div><div class="cw-bar" aria-hidden="true">${seg}</div><div class="cw-cap">${waku(top[0])}<b>${esc(m ? m.name : '')}</b> が${top[1]}人</div></div></div>`;
    }).join('');
    return rows ? `<section class="crowd"><b class="cw-h">みんなの予想</b>${rows}</section>` : '';
  }
  function hostWeekView(v) {
    const rows = v.menus.slice().sort((a, b) => a.waku - b.waku).map(m => `<div class="tr tr4">${waku(m.waku)}${nameCell(m, m.pop <= 2)}<span style="text-align:right;${m.pop === 1 ? 'color:var(--red);font-weight:700' : m.pop === 2 ? 'color:#1F5BC4;font-weight:700' : ''}">${m.pop}番人気</span><span style="text-align:right">${oddsTxt(m.odds)}</span></div>`).join('');
    return raceHead(v) +
      `<div class="notice cream">${chefImg('sorry')}<div><b>今週はあなたが担当です</b><span>今週は予想できません。</span></div></div>
      <div style="margin:14px 14px 6px;font-size:12px;font-weight:700;color:var(--sub)">今週の出馬表</div>
      <div class="tbl"><div class="tr tr4 th"><span>枠</span><span>メニュー</span><span style="text-align:right">人気</span><span style="text-align:right">オッズ</span></div>${rows}</div>
      <div class="pad" style="margin-top:auto"><button class="btn green block" data-go="host">ホストタブで食べたものを登録する</button></div>`;
  }
  function zeroView(v) {
    const rows = v.menus.map(m => `<div class="tr">${waku(m.waku)}${nameCell(m, false)}${oddsCell(m)}${DAYS.map(() => '<button class="dot" disabled aria-hidden="true"></button>').join('')}</div>`).join('');
    return raceHead(v) +
      `<div class="notice pink">${chefImg('sorry')}<div><b style="color:var(--red)">${S.data.me.balance <= 0 ? '持ち点がなくなりました' : '持ち点が100ptを切りました'}</b><span>${refillBlocked() ? '今週の補充はここまでです。月曜になると、また満額で補充できます。' : 'クイズかレビューで、すぐに補充できます。'}</span></div></div>
      <div class="tbl" style="margin-top:12px;opacity:.5">${tableHead(DAYS)}${rows}</div>
      ${refillBlocked() ? '' : '<div class="dock"><span class="rf-hint">補充すると、今週の予想にそのまま参加できます</span><button class="btn gold block" data-act="refill">ptを補充する</button></div>'}`;
  }
  // 買う（AI予想の画面からも使う）。買ったら上の電光に受付が流れ、増えた買い目が光る
  async function buySets(sets, from) {
    const v = S.data.current; if (!v) return false;
    try {
      const r = await api('predict', { weekId: v.weekId, sets, from: from || '' });
      S.newAt = Date.now(); S.glowSets = r.sets || [];
      await refresh({ loading: false });
      afterBuyLed();
      setTimeout(() => { S.glowSets = []; }, 1500);
      return true;
    } catch (e) { return false; }
  }
  function bindYoso() {
    $app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => switchTab(b.dataset.go));
    $app.querySelectorAll('.dot[data-day]').forEach(b => b.onclick = () => {
      const d = b.dataset.day, w = Number(b.dataset.waku), a = S.sel[d], k = a.indexOf(w);
      if (k < 0) a.push(w); else a.splice(k, 1);
      a.sort((x, y) => x - y);
      const on = k < 0; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
      updateDock();
    });
    const bet = document.getElementById('bet');
    if (bet) { bet.oninput = () => { S.bet = bet.value.replace(/[^\d]/g, ''); if (bet.value !== S.bet) bet.value = S.bet; updateDock(); }; updateDock(); }
    const by = document.getElementById('buy');
    if (by) by.onclick = async () => {
      by.disabled = true;
      const ok = await buySets([{ picks: { 火: S.sel.火.slice(), 水: S.sel.水.slice(), 木: S.sel.木.slice() }, bet: Number(S.bet) }]);
      if (ok) { S.sel = emptySel(); render(); } else by.disabled = false;
    };
    $app.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      const v = S.data.current; b.disabled = true;
      try { await api('cancelPred', { weekId: v.weekId, set: Number(b.dataset.del) }); toast('取り消しました（ptは戻りました）'); await refresh({ loading: false }); } catch (e) { b.disabled = false; }
    });
    const v = S.data.current;
    if (v && v.closed) playFin(v);
  }

  // ---------- 結果タブ ----------
  function kekkaTab() {
    const v = S.data.lastResult;
    if (!v) return `<div class="center">${chefImg('surprise','chef')}<div class="bubble"><p style="font-size:16px;font-weight:900">まだ結果はありません</p><p>木曜に結果が確定すると、ここに出ます。</p></div></div>`;
    return resultView(v);
  }
  function resultView(v) {
    const sets = v.myPreds || [], st = v.settle, res = v.results;
    const cancelled = v.status === '返還';
    const triple = st && st.triple > 0;
    const t = totalsOf(sets);
    const seal = cancelled ? '<span class="seal gray">返還</span>' : '<span class="seal">確定</span>';
    const head = `<div class="race"><div class="row"><div style="display:flex;flex-direction:column"><span style="font-weight:900;font-size:17px">${esc(v.title)}</span><span class="when">${esc(v.dates)}</span></div>${seal}</div></div>`;
    const marks = v.marks.map(k => `<span class="${k === 'hit' ? 'hit' : k === 'cancel' ? 'cancel' : k === 'miss' ? 'miss' : 'none'}">${k === 'hit' ? '✓' : k === 'cancel' ? '−' : k === 'miss' ? MISS_X : ''}</span>`).join('');
    let sum;
    if (!sets.length) sum = `<div class="sum"><div class="l"><small>今週の収支</small><span class="big" style="font-size:20px">予想していません</span></div><div class="ms">${marks}</div></div>`;
    else if (cancelled) sum = `<div class="sum"><div class="l"><small>中止の日があるため、今週は全額返還</small><span class="big">±0<span> pt</span></span><small>使った ${fmt(t.c)}pt ／ <b style="color:var(--gold)">全額返還</b></small></div><div class="ms">${marks}</div></div>`;
    else sum = `<div class="sum ${triple ? 'hit' : ''}">${triple ? '<svg width="120" height="120" viewBox="0 0 100 100" aria-hidden="true" style="position:absolute;right:-18px;top:-14px;opacity:.22"><circle cx="50" cy="50" r="40" fill="none" stroke="#F7B500" stroke-width="6"/><circle cx="50" cy="50" r="26" fill="none" stroke="#F7B500" stroke-width="3"/><circle cx="50" cy="50" r="9" fill="#F7B500"/></svg>' : ''}<div class="l">${triple ? '<em>3連単 的中！</em>' : ''}<small>今週の収支</small><span class="big">${signed(st ? st.net : 0)}<span> pt</span></span><small>使った ${fmt(t.c)}pt ／ 獲得 <b style="color:var(--gold)">${fmt(st ? st.total : 0)}</b>pt</small></div><div class="ms">${marks}</div></div>`;
    // 買った目：3連単的中／日替わりだけ当たり／外れ に分ける（外れはたたんでおく）
    let brk = '';
    if (sets.length && !cancelled) {
      const kr = knownRes(v);
      const got = s => s.got !== undefined ? s.got : setPay(v, s, kr).all;
      const kind = s => (s.triple !== undefined ? s.triple : DAYS.every(d => s.picks[d].indexOf(kr[d]) >= 0)) ? 'win' : got(s) > 0 ? 'day' : 'out';
      const g = { win: [], day: [], out: [] }; sets.forEach(s => g[kind(s)].push(s));
      const sec = (k, title) => {
        if (!g[k].length) return '';
        if (k === 'out') return `<details class="wk-sec"><summary class="h out"><span>${title}（${g[k].length}組）</span><span>▼ ひらく</span></summary>${g[k].map(s => setCard(v, s, { res: kr, ret: 0 })).join('')}</details>`;
        return `<div class="wk-sec"><div class="h ${k}"><span>${title}（${g[k].length}組）</span><span>+${fmt(g[k].reduce((a, s) => a + got(s), 0))}pt</span></div>${g[k].map(s => setCard(v, s, { res: kr, ret: got(s), badge: k === 'win' ? '<span class="fc-st win">3連単的中</span>' : '<span class="fc-st day">日替わり</span>' })).join('')}</div>`;
      };
      brk = `<div class="wk"><div class="wk-kv"><div>買った<b>${t.sets}組・${t.p}点</b></div><div>使った<b>${fmt(t.c)}pt</b></div><div>戻った<b>${fmt(st ? st.total : 0)}pt</b></div></div>${sec('win', '3連単 的中')}${sec('day', '日替わりだけ当たり')}${sec('out', '外れ')}</div>`;
    } else if (sets.length) {
      brk = `<div class="list"><div class="list-h"><span>あなたの買い目</span></div>${sets.map(s => setCard(v, s, {})).join('')}</div>`;
    }
    const photos = '<div class="photos">' + DAYS.map(d => {
      const r = res[d];
      if (!r) return `<div><div class="im">${BOWL('#C9D3CC').replace('<svg', '<svg width="30" height="30"')}</div><span class="cap"><b>${d}</b> —</span></div>`;
      if (r.waku === 0) return `<div><div class="im cx">中止</div><span class="cap"><b>${d}</b> <span style="color:var(--sub)">メニュー外</span></span></div>`;
      const im = r.photo ? `<img src="${esc(r.photo)}" alt="${d}曜の${esc(r.name)}" loading="lazy" referrerpolicy="no-referrer">` : BOWL('#C9D3CC').replace('<svg', '<svg width="30" height="30"');
      const cap = `<span class="cap"><b>${d}</b> ${esc(r.name)}</span>`;
      return r.photo ? `<button class="ph" data-zoom="${d}" aria-label="${d}曜の${esc(r.name)}の写真を拡大"><div class="im">${im}</div>${cap}</button>` : `<div><div class="im">${im}</div>${cap}</div>`;
    }).join('') + '</div>';
    const share = sets.length ? `<div class="pad"><button class="btn gold block" id="share" style="display:flex;align-items:center;justify-content:center;gap:8px">${SHARE_ICON}結果をシェア</button></div>` : '';
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
  // 送ったメニューを「食事の記録」に残す。ログインが切れていたら、入り直したあとに送る
  function flushPostLog() {
    const P = S.post, name = P.pending;
    if (!name || !S.token) return;
    P.pending = ''; P.logged = name;
    api('postLog', { name }, { loading: false, quiet: true }).catch(e => { P.logged = ''; if (!S.token) P.pending = name; });
  }
  function renderPost() {
    document.title = '昼中華の投稿';
    const P = S.post, ready = P.ph && P.name.trim();
    $app.innerHTML = `<header class="bar">${LOGO}<b class="post-t">投稿をつくる</b></header>
      <div class="pad post">
        ${P.ph ? `<div class="post-img"><img src="${photoSrc(P.ph)}" alt="撮った写真"></div><div class="post-re"><button class="lnk" id="pcam">撮り直す</button><button class="lnk" id="palb">アルバムから選ぶ</button></div>`
          : `<button class="post-shoot" id="pcam">${CAM_ICON}<b>写真を撮る</b><span>カメラが開きます</span></button><button class="lnk" id="palb" style="align-self:center">アルバムから選ぶ</button>`}
        ${(P.menus || []).length ? `<label class="field"><span>今週のメニューから選ぶ</span><select id="pmenu"><option value="">選んでください</option>${P.menus.map((m, i) => `<option value="${i}" ${P.name.trim() === m.name ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label>` : ''}
        <label class="field"><span>メニュー名</span><input id="pname" maxlength="40" value="${esc(P.name)}" placeholder="例：麻婆豆腐" enterkeyhint="done"></label>
        <button class="btn slack block" id="psend" ${ready ? '' : 'disabled'}>Slackに送る</button>
        <span class="pnote"><b>①</b> 共有の画面で Slack を選び、送り先のチャンネルを選ぶ<br><b>②</b> メッセージ欄を長押しして「ペースト」（文字はコピー済み）<br><b>③</b> 送信</span>
        <div class="post-foot"><a class="lnk" href="${esc(appUrl())}">昼中華3連単を開く ›</a></div>
      </div>`;
    const take = cam => picker.open(cam, ph => { P.ph = ph; render(); });
    document.getElementById('pcam').onclick = () => take(true);
    document.getElementById('palb').onclick = () => take(false);
    const nm = document.getElementById('pname');
    nm.oninput = () => { P.name = nm.value; document.getElementById('psend').disabled = !(P.ph && P.name.trim()); const sel = document.getElementById('pmenu'); if (sel) { const i = (P.menus || []).findIndex(m => m.name === P.name.trim()); sel.value = i >= 0 ? String(i) : ''; } };
    document.getElementById('psend').onclick = () => { if (P.ph && P.name.trim()) { sharePost(P.ph, P.name.trim()); if (P.logged !== P.name.trim()) { P.pending = P.name.trim(); flushPostLog(); } } };
    const pm = document.getElementById('pmenu');
    if (pm) pm.onchange = () => { if (pm.value === '') return; P.name = P.menus[Number(pm.value)].name; nm.value = P.name; nm.oninput(); };
    // その週のメニューを後ろで読み込む（ログインなしで読める。読めなければ手入力だけ）
    if (P.menus === undefined) { P.menus = null; api('postMenus', {}, { loading: false, quiet: true }).then(r => { P.menus = r.menus || []; if (P.menus.length) render(); }).catch(() => { P.menus = []; }); }
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
  // シェア画像の中身。いつもは「まとめの形」（3日の結果に当たり・はずれ、使ったptと収支）
  // 3連単が当たった週は「ベストの1組」「買い目の一覧（上位だけ）」も選べる
  function shareData(v, mode) {
    const sets = v.myPreds || [], kr = knownRes(v), t = totalsOf(sets);
    const rows = DAYS.map((d, i) => { const r = v.results[d] || { waku: 0, name: '—' }; const k = v.marks[i]; return { day: d, name: r.waku === 0 ? '中止' : r.name, odds: oddsOf(v, r.waku), kind: k === 'hit' ? 'hit' : k === 'cancel' ? 'cancel' : 'miss' }; });
    const base = { title: v.title, rows, hits: v.marks.filter(k => k === 'hit').length, cancelled: v.status === '返還', bet: t.c, net: v.settle ? v.settle.net : 0, mode: 'summary' };
    const pay = s => s.got !== undefined ? s.got : setPay(v, s, kr).all;
    const wins = sets.filter(s => s.triple || DAYS.every(d => s.picks[d].indexOf(kr[d]) >= 0));
    if (mode === 'best' && wins.length) { const b = wins.slice().sort((x, y) => pay(y) - pay(x))[0]; return Object.assign(base, { mode: 'best', bet: b.bet, pay: pay(b), points: b.points }); }
    if (mode === 'list') {
      const nm = w => (v.menus.find(x => x.waku === w) || {}).name || '';
      const list = sets.slice().sort((x, y) => pay(y) - pay(x)).slice(0, 5).map(s => ({ text: DAYS.map(d => s.picks[d].map(nm).join('・')).join(' → '), points: s.points, bet: s.bet, pay: pay(s), win: wins.indexOf(s) >= 0 }));
      return Object.assign(base, { mode: 'list', list, more: Math.max(0, sets.length - 5) });
    }
    return base;
  }
  // 結果のシェア：画像を作って、共有の画面から Slack へ（送り先のチャンネルは Slack の画面で選ぶ）
  function openShare(v, mode) {
    mode = mode || 'summary';
    const blobP = window.ShareImage.blob(shareData(v, mode));
    const triple = v.settle && v.settle.triple > 0;
    const seg = triple ? `<div class="ai-seg sh-seg" role="radiogroup">${[['summary', 'まとめ'], ['best', 'ベスト'], ['list', '一覧']].map(([k, n]) => `<button role="radio" aria-checked="${k === mode}" class="${k === mode ? 'on' : ''}" data-mode="${k}">${n}</button>`).join('')}</div>` : '';
    openLayer(`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-label="結果をシェア"><div class="grab"><span></span></div>
      <div class="share">${seg}<img id="shimg" alt="シェア画像のプレビュー">
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
    $layer.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => openShare(v, b.dataset.mode));
  }

  // ---------- メニュー・ルール ----------
  function openLayer(html) {
    $layer.innerHTML = html;
    $layer.querySelectorAll('[data-close]').forEach(b => b.onclick = closeLayer);
    document.addEventListener('keydown', escClose);
  }
  // 画面が古いとき：選んでいた予想を残して、自動で開き直す
  // 開いたときの読み込みなど、利用者の操作でないときは黙って開き直す。操作の途中なら、開き直したあとに一言出す
  // 30秒以内に2回目になったら（古いファイルが残っているなど）、開き直しが続かないよう案内を出して止める
  const RELOAD_QUIET = ['state', 'hostState', 'history', 'week', 'postMenus', 'notices', 'pushKey'];
  function saveDraft() { try { const v = S.data && S.data.current; if (v) sessionStorage.setItem(store.key('hc_draft'), JSON.stringify({ weekId: v.weekId, sel: S.sel, bet: S.bet })); } catch (e) {} }
  function showReload(action) {
    saveDraft();
    let last = 0;
    try { last = Number(sessionStorage.getItem('hc_reload_at') || 0); } catch (e) {}
    if (Date.now() - last > 30000) {
      try { sessionStorage.setItem('hc_reload_at', String(Date.now())); if (RELOAD_QUIET.indexOf(action) < 0) sessionStorage.setItem('hc_reload_msg', '1'); } catch (e) {}
      location.reload(); return;
    }
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
  // メニューの並び：見出しの下に、押せる選択肢を白いかたまりでまとめる（頭に小さな絵）
  const MENU = [
    ['レース', [['history', '📜', '過去の結果'], ['rule', '📖', 'ルール']]],
    ['お知らせ・連絡', [['notice', '📢', 'お知らせ'], ['contact', '✉️', '問い合わせ']]],
    ['つくる', [['post', '📷', 'Slackへの投稿をつくる']]],
    ['アプリの設定', [['notify', '🔔', '通知'], ['icon', '🍜', 'アプリのアイコン']]],
    ['アカウント', [['nick', '👤', 'ニックネームを変える'], ['pass', '🔑', 'パスワードを変える']]],
  ];
  const mb = (m, ic, t, cls) => `<button data-m="${m}"${cls ? ` class="${cls}"` : ''}><i aria-hidden="true">${ic}</i><span>${t}</span></button>`;
  function openMenu() {
    const D = S.data;
    openLayer(`<div class="scrim" data-close></div><aside class="drawer" role="dialog" aria-label="メニュー">
      <div class="bar" style="position:static"><b style="font-size:15px">メニュー</b><button class="ibtn" data-close aria-label="閉じる" style="font-size:16px">✕</button></div>
      <div class="who">${esc(D.me.nick)}</div>
      <div class="bal"><span>持ち点</span><b>${fmt(D.me.balance)} <span style="font-size:13px">pt</span></b></div>
      <nav class="mlist">${D.me.canRefill ? `<div class="grp">${mb('refill', '💰', 'ptを補充する', 'mrf')}</div>` : ''}${MENU.map(([sec, items]) => `<span class="sec">${sec}</span><div class="grp">${items.map(([m, ic, t]) => mb(m, ic, t)).join('')}</div>`).join('')}</nav>
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
        <div><span class="d" style="background:var(--red)">火 昼前</span><div><b>締め切り</b><br><span class="s">火・水・木の列で、それぞれ1つ以上の丸をタップして買います。何組でも買えて、締切までは取り消せます。同じ品を2日以上選んでもOK。</span></div></div>
        <div><span class="d" style="background:var(--gold);color:var(--ink)">火〜木</span><div><b>毎日発表</b><br><span class="s">その日に食べたものが出馬表に出ます。</span></div></div>
        <div><span class="d" style="background:var(--ink)">木</span><div><b>結果が確定</b><br><span class="s">獲得ptが「結果」タブに出ます。</span></div></div>
      </div>
      <div class="ptbox"><b style="font-size:14px">ptのしくみ</b>
        <div style="color:var(--sub);font-size:12px">最初の持ち点は全員 <b style="color:var(--ink)">10,000pt</b>。1日に複数の品を選ぶと、その組み合わせの数が<b style="color:var(--ink)">点数</b>になります（例：火2品×水1品×木2品＝4点）。使うのは <b style="color:var(--ink)">1点あたりのpt（100pt単位）× 点数</b>で、買った時点で持ち点から引かれ、結果が確定すると獲得ptが加わります。</div>
        <div><b>日替わりpt</b>　当たった日ごとに、1点につき<br><b style="color:var(--turf)">1点あたりのpt × 1/3 × その品のオッズ</b><small style="color:var(--sub)">（端数は切り捨て。その品を含む点の数だけもらえます）</small></div>
        <div><b>3連単</b>　3日とも当たった1点に、さらに<br><b style="color:var(--red)">1点あたりのpt × 3品のオッズのかけ算</b></div>
        <div style="border-top:1px dashed var(--line2);padding-top:8px;color:var(--sub);font-size:12px">例：1点1,000ptで、1・2・3番人気（2.0・3.0・4.5倍）を<br>3日とも当てると 666＋1,000＋1,500＋27,000 ＝ <b style="color:var(--ink);font-size:14px">30,166pt</b><br>火曜だけ当たったら <b style="color:var(--ink)">666pt</b>（収支 −334pt）</div>
        <div style="color:var(--sub);font-size:12px">倍率は、ホストが並べた順の<b style="color:var(--ink)">基本の倍率</b>（下の表）を、<b style="color:var(--ink)">みんなが使ったpt</b>で補正したものです。ptが多く集まった品は下がり、少ない品は上がります（基本の0.6〜1.6倍の範囲）。「○番人気」は今の倍率の低い順で、<b style="color:var(--ink)">締切の時点の倍率</b>で確定します。</div>
        <div class="oddsg">${o.slice(0, 8).map((x, i) => `<span>${i + 1}番目 <b>${Number.isInteger(x) && x >= 10 ? x : oddsTxt(x)}</b></span>`).join('')}</div>
      </div>
      <div class="ptbox"><b style="font-size:14px">AI予想</b>
        <div style="color:var(--sub);font-size:12px">公開した出馬表・いまの倍率・これまでの結果・食事の記録から、今週の3連単を統計で読みます。外れても恨みっこなし。</div>
        <div><b>モデル</b>　何を読むか<div class="ai-rl"><span><b>Hakkaku</b>人気順の当たりやすさだけ</span><span><b>Shumainet</b>＋料理ごとの出やすさ・曜日の傾向・同じ料理の続きやすさ・月曜に食べたもの</span><span><b>Octopus</b>＋担当ホストの週の傾向・よく食べるもの・穴（当たりやすさの割に倍率が高い品）</span></div></div>
        <div><b>エフォート</b>　どこまで読むか<div class="ai-rl"><span><b>低</b>直近4週を読む。買い目1点</span><span><b>中</b>これまでの週を全部読む。買い目3点</span><span><b>高</b>全部の週を200通りに入れ替えて読み直し、その平均で予想（ぶれにくい）。自信度つき。買い目5点</span></div></div>
        <div style="color:var(--sub);font-size:12px">値段はモデル×エフォートで決まり、選ぶ画面に出ます（期間限定で無料の間は0pt）。同じモデル×エフォートは1週に1回で、もう一度送ると前の予想が出ます（ptはかかりません）。担当ホストと締切後は買えません（買った予想は見られます）。買った予想は自分にしか見えません。</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--sub)">
        <div><b style="color:var(--ink)">中止の日</b>　メニュー外を食べた日や休みの日がある週は、使ったptを全額返します。当たり・はずれは記録だけ残ります。</div>
        <div><b style="color:var(--ink)">持ち点が100ptを切ったら</b>　「ptを補充する」から、豆知識クイズ（満額＋${fmt(fullPt('quiz'))}pt）かレビュー（満額＋${fmt(fullPt('review'))}pt）で補充できます。${esc(refillRuleTxt())}</div>
      </div></div></div>`);
  }

  // ---------- お知らせ ----------
  const noticeBody = t => esc(t).replace(/\n/g, '<br>');
  const noticeDate = d => { const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${Number(m[1])}/${Number(m[2])}/${Number(m[3])}` : esc(d); };
  // ログインしたとき、まだ読んでいない最新のお知らせを1件だけ出す（出した時点で既読にする）
  function maybeNotice() {
    const n = S.data && S.data.notice;
    if (!n || POST_MODE || S.screen || $layer.innerHTML || S.noticeShown === n.key) return;
    S.noticeShown = n.key;
    // ゲームのお知らせ窓のように、画面の真ん中に出す。本文が長いときは窓の中だけスクロールする
    const kc = { 'アップデート': 'up', '重要': 'imp', 'お知らせ': 'info' }[n.kind] || 'etc';
    openLayer(`<div class="scrim"></div><div class="nwin" role="dialog" aria-labelledby="nwt"><div class="in">
      <div class="ttl">お知らせ</div>
      <div class="meta">${n.kind ? `<span class="ntag ${kc}">${esc(n.kind)}</span>` : ''}<small>${noticeDate(n.date)}</small></div>
      <h3 id="nwt">${esc(n.title)}</h3>
      ${n.body ? `<div class="nbody">${noticeBody(n.body)}</div>` : ''}
      ${n.more > 0 ? `<button class="nmore" id="nmore">ほかに新しいお知らせが${n.more}件あります</button>` : ''}
      <div class="foot"><button class="nclose" data-close>閉じる</button></div></div></div>`);
    // ほかにも読んでいないお知らせがあれば、押すとお知らせの一覧を開く
    const mo = document.getElementById('nmore');
    if (mo) mo.onclick = () => { closeLayer(); S.screen = 'notice'; render(); };
    api('noticeRead', { key: n.key }, { loading: false, quiet: true }).then(() => { if (S.data) S.data.notice = null; }).catch(() => {});
  }
  async function renderNotices() {
    const show = html => { if (S.screen !== 'notice') return; $app.innerHTML = subBar('お知らせ') + html; document.getElementById('back').onclick = () => { S.screen = null; render(); }; };
    show('<p style="padding:16px;color:var(--sub);margin:0">読み込み中…</p>');
    let list = [];
    try { list = (await api('notices', {}, { loading: false })).list || []; } catch (e) { return; }
    // 一覧は「日付と見出し」の1行だけ。押すと本文が開き、もう一度押すと閉じる（最初はすべて閉じておく）
    show(list.length ? `<div class="ntlist">${list.map(n => `<details class="ntd"><summary><small>${noticeDate(n.date)}</small><b>${esc(n.title)}</b></summary>${n.body ? `<p>${noticeBody(n.body)}</p>` : ''}</details>`).join('')}</div>` : '<p style="padding:16px;color:var(--sub);margin:0">お知らせはまだありません</p>');
  }

  // ---------- 通知（PWA） ----------
  function noteBox(lead, rows) { return `<div class="icnote"><span class="lead">${lead}</span>${(rows || []).map(([h, t]) => `<span><b>${h}</b>${t}</span>`).join('')}</div>`; }
  function b64uToU8(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s); return Uint8Array.from(b, c => c.charCodeAt(0)); }
  async function pushSub() { const reg = await SWP; return reg && reg.pushManager ? reg.pushManager.getSubscription() : null; }
  async function renderNotify() {
    const head = subBar('通知');
    const show = html => { if (S.screen !== 'notify') return; $app.innerHTML = head + html; document.getElementById('back').onclick = () => { S.screen = null; render(); }; };
    if (!PUSH_OK) return show(noteBox('通知は、ホーム画面に追加したアプリで受け取れます。', [['受け取るまで', 'ホーム画面に追加 → そのアイコンから開く → ここで「通知をオンにする」'], ['アイコン', '追加する前に、メニューの「アプリのアイコン」で選べます']]));
    if (Notification.permission === 'denied') return show(noteBox('通知が「許可しない」になっています。', [['オンにするには', 'iPhoneの「設定」→「通知」→「' + (/\/test\//.test(location.pathname) ? '昼中華テスト' : '昼中華3連単') + '」で許可する']]));
    let sub = null;
    try { sub = await pushSub(); } catch (e) {}
    const btns = inner => `<div style="padding:16px;display:flex;flex-direction:column;gap:10px">${inner}</div>`;
    const outline = 'style="border:1.5px solid var(--turf);background:#FFF;color:var(--turf);font-weight:700"';
    if (sub) {
      show(noteBox('通知はオンです。', [['届くとき', '出馬表が公開されたとき']]) + btns(`<button class="btn green block" id="ptest">試しに送る</button><button class="btn block" id="poff" ${outline}>通知をやめる</button>`));
      // サーバー側の送り先も最新にしておく（消えていたら登録し直す）
      api('pushSubscribe', { sub: sub.toJSON() }, { loading: false, quiet: true }).catch(() => {});
      document.getElementById('ptest').onclick = async () => { try { await api('pushTest', { endpoint: sub.endpoint }); toast('送りました。少し待つと届きます'); } catch (e) {} };
      document.getElementById('poff').onclick = async () => {
        try { await api('pushUnsubscribe', { sub: { endpoint: sub.endpoint } }); } catch (e) { return; }
        try { await sub.unsubscribe(); } catch (e) {}
        toast('通知をやめました'); renderNotify();
      };
      return;
    }
    show(noteBox('出馬表が公開されたら、この端末に通知が届きます。') + btns('<button class="btn green block" id="pon">通知をオンにする</button>'));
    document.getElementById('pon').onclick = async () => {
      // 許可を求めるのは、ボタンを押したその場でないといけない（iPhone の決まり）
      let perm;
      try { perm = await Notification.requestPermission(); } catch (e) { perm = 'default'; }
      if (perm !== 'granted') return renderNotify();
      try {
        const k = await api('pushKey');
        const reg = await SWP;
        if (!reg) throw new Error('通知の準備ができませんでした。アプリを開き直してください');
        const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToU8(k.key) });
        await api('pushSubscribe', { sub: s.toJSON() });
        toast('通知をオンにしました'); renderNotify();
      } catch (e) { if (!e.fromApi) toast(e.message || '通知をオンにできませんでした'); }
    };
  }

  // ---------- AI予想（ptで買う予想屋） ----------
  // モデル＝何を見て読むか、エフォート＝どこまで深く読むか。中身は統計（サーバーで計算）
  const AI_WAIT = { low: 1400, mid: 2800, high: 4800 }; // 考え中を見せる最短の時間
  const AI_STEPS = ['出馬表を読んでいます', '過去の結果を数えています', '曜日ごとの出方を見ています', '倍率と見比べています', '買い目を絞っています'];
  // AIのマーク：4枚の菱形（碧・山吹・紅・青）。止まっているときは手裏剣の形
  // 考え中（.on）だけ動く：手裏剣で2周 → 4枚が飛び出し、輪の上を回りながら1枚ずつ自転 → 集まって手裏剣に（6秒でくり返す）
  const AI_COL = ['#00A86B', '#FFC400', '#FF4D3F', '#3D7BFF'];
  const aiPlace = (r, ang, rot, sc) => { const a = ang * Math.PI / 180; return `translate(${(50 + r * Math.sin(a)).toFixed(2)} ${(50 - r * Math.cos(a)).toFixed(2)}) rotate(${rot.toFixed(1)}) scale(${sc.toFixed(3)})`; };
  function aiMark(on, size) {
    if (on) aiSpin();
    const z = size || 26;
    return `<svg class="ai-mark${on ? ' on' : ''}" width="${z}" height="${z}" viewBox="0 0 100 100" aria-hidden="true">${AI_COL.map((c, i) => `<path d="M0 -24L11 0L0 24L-11 0Z" transform="${aiPlace(24, i * 90, i * 90, 1)}" fill="${c}"/>`).join('')}</svg>`;
  }
  const aiEase = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const aiSeg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
  function aiPose(t, i) {
    const a = i * 90;
    if (t < 1.6) { const g = aiEase(aiSeg(t, 0, 1.6)) * 720; return aiPlace(24, a + g, a + g, 1); }
    const k = t < 2.2 ? aiEase(aiSeg(t, 1.6, 2.2)) : t < 4.4 ? 1 : 1 - aiEase(aiSeg(t, 4.4, 5.1));
    const c = aiEase(aiSeg(t, 2.2, 4.4));
    return aiPlace(24 + 10 * k, a + c * 360, a + c * 1080 * k, 1 - .4 * k);
  }
  let aiRaf = 0, aiT0 = 0;
  function aiSpin() {
    if (aiRaf || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    aiT0 = aiT0 || performance.now();
    const step = now => {
      const marks = document.querySelectorAll('.ai-mark.on');
      if (!marks.length) { aiRaf = 0; aiT0 = 0; return; }
      const t = ((now - aiT0) / 1000) % 6;
      marks.forEach(m => m.querySelectorAll('path').forEach((p, i) => p.setAttribute('transform', aiPose(t, i))));
      aiRaf = requestAnimationFrame(step);
    };
    aiRaf = requestAnimationFrame(step);
  }
  const AI_NAMES = 'Hakkaku・Shumainet・Octopus';
  function aiEntry(v) {
    // 4色の枠のカード（マークと同じ4色）。下にモデル名だけ並べる
    return `<div class="ai-entry-w"><button class="ai-entry" data-act="ai">${aiMark(false, 38)}<span class="t"><b>AI予想</b><small>${AI_NAMES}</small></span><span class="go" aria-hidden="true">›</span></button></div>`;
  }
  async function openAI() {
    const v = S.data.current;
    try {
      const r = await api('aiList', { weekId: v ? v.weekId : '' });
      const keep = S.ai || {};
      S.ai = { info: r, model: keep.model || store.get('ai_model') || 'sonnet', effort: keep.effort || store.get('ai_effort') || 'mid', fresh: null, pend: null };
      if (!r.models.some(m => m.id === S.ai.model)) S.ai.model = r.models[0].id;
      if (!r.efforts.some(e => e.id === S.ai.effort)) S.ai.effort = r.efforts[0].id;
      S.screen = 'ai'; render(); window.scrollTo(0, 0);
    } catch (e) {}
  }
  function aiName(id) { const m = S.ai.info.models.find(x => x.id === id); return m ? m.name : id; }
  function aiEff(id) { const e = S.ai.info.efforts.find(x => x.id === id); return e ? e.name : id; }
  // AIの買い目：選ぶ（✓）・目ごとの金額・3連単の倍率・AIの自信（5段階）・3日の人気と倍率。全部見てから買うので、まとめ欄は下
  function aiKey(it) { return it.model + '-' + it.effort; }
  function aiBuys(it) {
    const A = S.ai, v = S.data.current, res = it.result, key = aiKey(it);
    const can = A.info.canBuy && v && !v.closed;
    const st = A.buy[key] = A.buy[key] || { sel: res.buys.map(() => false), amt: res.buys.map(() => ''), bet: '100' };
    const amt = i => Number(st.amt[i] || st.bet) || 0;
    const sel = res.buys.map((_, i) => i).filter(i => st.sel[i]);
    const tot = sel.reduce((a, i) => a + amt(i), 0);
    const ok = can && sel.length && sel.every(i => amt(i) >= 100 && amt(i) % 100 === 0) && tot <= S.data.me.balance;
    const menu = w => (v && v.menus.find(m => m.waku === w)) || {};
    const mul = k => k.reduce((a, w) => a * (menu(w).odds || 0), 1);
    const from = 'AI ' + aiName(it.model);
    const bought = k => (v && v.myPreds || []).filter(s => s.from === from && DAYS.every((d, j) => s.picks[d].length === 1 && s.picks[d][0] === k[j])).map(s => s.bet);
    const dots = n => n ? `<span class="c"><i>AIの自信</i><span class="cf">${'●'.repeat(n)}<s>${'●'.repeat(5 - n)}</s></span></span>` : '<span></span>';
    const glow = A.glow && A.glow.key === key ? A.glow.rows : [];
    const rows = res.buys.map((b, i) => {
      const k = b.picks, got = bought(k);
      const days = k.map((w, j) => { const m = menu(w); return `<span class="d">${DAYS[j]}</span><span class="w">${waku(w)}</span><span class="n">${esc(b.names[j])}</span><span class="p">${m.pop ? m.pop + '人気' : ''}</span><span class="o">${m.odds ? oddsTxt(m.odds) : ''}</span>`; }).join('');
      const ck = can ? `<button class="ck ${st.sel[i] ? 'on' : ''}" data-ck="${i}" aria-pressed="${!!st.sel[i]}" aria-label="${i + 1}番の買い目を選ぶ"></button>` : '<span></span>';
      // 当たったら：日替わり3日分（1点÷3×各日の倍率）＋3連単（1点×3品の倍率のかけ算）
      const back = a => k.reduce((x, w) => x + Math.floor(a / 3 * (menu(w).odds || 0)), 0) + Math.floor(a * mul(k));
      const am = can && st.sel[i] ? `<div class="am"><span class="bk">当たれば <b>${fmt(back(amt(i)))}</b>pt</span><span>この目に張る</span><span class="ai-amt"><input data-amt="${i}" inputmode="numeric" value="${esc(st.amt[i] || st.bet)}" aria-label="${i + 1}番に張るpt"><small>pt</small></span></div>` : '';
      return `<div class="lyA${glow.indexOf(i) >= 0 ? ' just' : ''}"><div class="hd">${ck}<span class="m"><i>3連単</i><b>${oddsTxt(mul(k) || b.mul)}</b>倍</span>${dots(b.dots)}</div><div class="gd">${days}</div>${got.length ? `<span class="ai-got">買った ${got.map(x => fmt(x) + 'pt').join('・')}</span>` : ''}${am}</div>`;
    }).join('');
    const box = can ? `<div class="bxCtl"><button class="ai-all" data-all="1">${st.sel.every(Boolean) ? '選ぶのをやめる' : '全部選ぶ'}</button><span class="bt"><small>1点あたりまとめて</small><span class="bx"><input data-bet="1" inputmode="numeric" value="${esc(st.bet)}">pt</span></span></div>
      ${sel.length ? `<div class="bxMx">当たれば最大 <b>${fmt(v ? maxPay(v, sel.map(i => { const k = res.buys[i].picks; return { picks: { 火: [k[0]], 水: [k[1]], 木: [k[2]] }, bet: amt(i), points: 1 }; }), {}) : 0)}</b>pt</div>` : ''}
      <div class="bxZ"><div><small>選んだ目</small><b>${sel.length}点</b></div><div><small>合計</small><b>${fmt(tot)}<span>pt</span></b></div><button class="btn gold" data-buy="1" ${ok ? '' : 'disabled'}>${sel.length ? sel.length + '点を買う' : '目を選ぶ'}</button></div>` : '';
    return `<div class="aihX"><span class="h">買い目（3連単）</span></div><div class="ai-bys" data-key="${key}">${rows}${box}</div>`;
  }
  function aiItem(it, opt) {
    opt = opt || {};
    const res = it.result;
    const lines = res.think.map((t, i) => `<li${opt.reveal ? ` style="animation-delay:${i * 0.35}s"` : ''}>${esc(t)}</li>`).join('');
    return `<article class="ai-item${opt.reveal ? ' reveal' : ''}" id="ai-${it.model}-${it.effort}">
      <div class="ai-meta">${aiMark(false)}<b>${esc(aiName(it.model))}</b><span>エフォート ${esc(aiEff(it.effort))}</span>${it.pt ? `<span class="pt">${fmt(it.pt)}pt</span>` : ''}</div>
      <details class="ai-think"${opt.open ? ' open' : ''}><summary>考えた過程</summary><ol>${lines}</ol></details>
      <div class="ai-ans"${opt.reveal ? ` style="animation-delay:${res.think.length * 0.35 + 0.2}s"` : ''}>${aiBuys(it)}</div>
      ${aiThread(it)}
    </article>`;
  }
  // 会話：自分の質問は右、AIの答えは左。最後の答えに選べる質問があればボタンで出す
  function aiThread(it) {
    const c = it.convo || []; if (!c.length) return '';
    return `<div class="ai-chat">${c.map((x, i) => `<div class="ai-q">${esc(x.q)}</div><div class="ai-a${x.typing ? ' typing' : ''}">${x.typing ? '<span class="dots"><i></i><i></i><i></i></span>' : esc(x.a)}${i === c.length - 1 && x.choices && x.choices.length && S.ai.info.askOpen ? `<div class="ai-chips">${x.choices.map(t => `<button data-askq="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}</div>`).join('')}</div>`;
  }
  // 質問を送る：先に数字だけの答えを出し、AIの言い回しが届いたら差し替える（15秒待って来なければそのまま）
  async function aiAskSend(q) {
    const A = S.ai, I = A.info, v = S.data.current;
    const it = I.items.find(x => x.model === A.model && x.effort === A.effort);
    q = String(q || '').trim(); if (!it || !q || A.asking) return;
    A.asking = true;
    const key = aiKey(it); A.ctx = A.ctx || {};
    it.convo = it.convo || [];
    const row = { q, a: '', typing: true }; it.convo.push(row);
    A.draft = ''; renderAI(true); aiScrollEnd();
    try {
      const r = await api('aiAsk', { weekId: I.weekId || (v && v.weekId), model: it.model, effort: it.effort, q, ctx: A.ctx[key] || null }, { loading: false });
      row.a = r.text; row.typing = false; row.choices = r.choices; if (r.ctx) A.ctx[key] = r.ctx; if (r.usage) I.usage = r.usage;
      if (r.kind === 'closed') I.askOpen = false;
      renderAI(true); aiScrollEnd();
      if (r.pend) {
        row.typing = true; renderAI(true);
        const p = await Promise.race([api('aiPhrase', { id: r.pend }, { loading: false, quiet: true }).catch(() => null), new Promise(res => setTimeout(() => res(null), 15000))]);
        row.typing = false;
        if (p && p.text) { row.a = p.text; row.choices = p.choices; if (p.usage) I.usage = p.usage; }
        renderAI(true); aiScrollEnd();
      }
    } catch (e) { it.convo.pop(); A.draft = q; renderAI(true); }
    finally { A.asking = false; }
  }
  function aiScrollEnd() { const el = document.querySelector('.ai-chat:last-of-type, .ai-list'); if (el) window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }
  // 買い目の操作（選ぶ・金額・全部選ぶ・買う）。入力中は描き直してもカーソルを保つ
  function bindAIBuys() {
    const A = S.ai;
    $app.querySelectorAll('.ai-bys').forEach(box => {
      const key = box.dataset.key, st = A.buy[key], it = A.info.items.find(x => aiKey(x) === key);
      if (!st || !it) return;
      const redraw = keep => { renderAI(true); if (keep) { const el = $app.querySelector(`.ai-bys[data-key="${key}"] ${keep.sel}`); if (el) { el.focus(); try { el.setSelectionRange(keep.p, keep.p); } catch (e) {} } } };
      box.querySelectorAll('[data-ck]').forEach(b => b.onclick = () => { st.sel[+b.dataset.ck] = !st.sel[+b.dataset.ck]; redraw(); });
      const all = box.querySelector('[data-all]'); if (all) all.onclick = () => { const on = !st.sel.every(Boolean); st.sel = st.sel.map(() => on); redraw(); };
      const bi = box.querySelector('[data-bet]'); if (bi) bi.oninput = () => { st.bet = bi.value.replace(/\D/g, ''); st.amt = st.amt.map(() => ''); redraw({ sel: '[data-bet]', p: bi.selectionStart }); };
      box.querySelectorAll('[data-amt]').forEach(el => el.oninput = () => { st.amt[+el.dataset.amt] = el.value.replace(/\D/g, ''); redraw({ sel: `[data-amt="${el.dataset.amt}"]`, p: el.selectionStart }); });
      const by = box.querySelector('[data-buy]'); if (by) by.onclick = async () => {
        by.disabled = true;
        const idx = st.sel.map((x, i) => x ? i : -1).filter(i => i >= 0);
        const sets = idx.map(i => { const k = it.result.buys[i].picks; return { picks: { 火: [k[0]], 水: [k[1]], 木: [k[2]] }, bet: Number(st.amt[i] || st.bet) }; });
        const ok = await buySets(sets, 'AI ' + aiName(it.model));
        if (ok) { st.sel = st.sel.map(() => false); st.amt = st.amt.map(() => ''); A.glow = { key, rows: idx }; renderAI(true); setTimeout(() => { A.glow = null; }, 1500); } else by.disabled = false;
      };
    });
  }
  function aiPending(p) {
    return `<article class="ai-item"><div class="ai-meta">${aiMark(true)}<b>${esc(aiName(p.model))}</b><span>エフォート ${esc(aiEff(p.effort))}</span></div>
      <div class="ai-wait"><span id="aiStep">考え中…</span></div></article>`;
  }
  function renderAI(keepScroll) {
    const A = S.ai, I = A.info;
    A.buy = A.buy || {};
    const cur = S.data.current;
    const price = I.prices[A.model] && I.prices[A.model][A.effort];
    const bought = I.items.find(x => x.model === A.model && x.effort === A.effort);
    const items = I.items.map(it => aiItem(it, it === A.fresh ? { open: true, reveal: true } : {})).join('');
    const sendLbl = bought ? '見る' : price ? `${fmt(price)}pt` : '無料';
    const freeTxt = I.freeUntil ? (() => { const [, mo, d] = I.freeUntil.split('-').map(Number); return `${mo}/${d}まで`; })() : '';
    const canSend = I.canBuy && !A.pend && (bought || price <= S.data.me.balance);
    $app.innerHTML = `<header class="bar"><div style="display:flex;align-items:center;gap:10px"><button class="ibtn" id="back" aria-label="戻る" style="font-size:22px;padding-bottom:3px">‹</button><b class="sub-title">AI予想</b></div><span class="pts">持ち点<br><b>${fmt(S.data.me.balance)}</b> pt</span></header>
      ${cur && !cur.closed && !cur.isMyHostWeek ? buyLed(cur) : ''}
      ${freeTxt && I.canBuy ? `<div class="ai-free"><b>期間限定で無料</b><span>${freeTxt}</span></div>` : ''}
      <div class="ai-list">${items}${A.pend ? aiPending(A.pend) : ''}</div>
      <div class="ai-dock">${bought && I.askOpen ? aiAskBox(bought) : I.canBuy ? `<div class="ai-comp">
        <div class="ai-prompt">今週の3連単を予想して</div>
        <div class="ai-row"><button class="ai-pill" id="aiPick" aria-haspopup="dialog">${esc(aiName(A.model))}<span>エフォート ${esc(aiEff(A.effort))}</span><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg></button>
        <button class="ai-send" id="aiSend" ${canSend ? '' : 'disabled'} aria-label="${bought ? '買った予想を見る' : esc(sendLbl) + 'で予想してもらう'}"><span>${esc(sendLbl)}</span><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
        ${!bought && price > S.data.me.balance ? '<div class="ai-err">持ち点が足りません。モデルかエフォートを下げてください</div>' : ''}</div>` : `<div class="ai-closed">${esc(I.reason || 'いまはAI予想を買えません')}</div>`}</div>`;
    const qi = document.getElementById('aiQ');
    if (qi) {
      qi.oninput = () => { A.draft = qi.value; const b = document.getElementById('aiAsk'); if (b) b.disabled = !qi.value.trim() || A.asking; };
      qi.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing && !e.shiftKey) { e.preventDefault(); aiAskSend(qi.value); } };
      document.getElementById('aiAsk').onclick = () => aiAskSend(qi.value);
    }
    $app.querySelectorAll('[data-askq]').forEach(b => b.onclick = () => aiAskSend(b.dataset.askq));
    document.getElementById('back').onclick = () => { S.screen = null; S.ai.fresh = null; render(); window.scrollTo(0, 0); };
    const pk = document.getElementById('aiPick'); if (pk) pk.onclick = openAIPicker;
    const sd = document.getElementById('aiSend'); if (sd) sd.onclick = () => bought ? aiScrollTo(bought) : aiSend();
    bindAIBuys();
    stickTop();
    if (A.fresh && !keepScroll) { const el = document.getElementById(`ai-${A.fresh.model}-${A.fresh.effort}`); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); A.fresh = null; }
  }
  // 予想を出したモデル×エフォートなら、入力欄で自由に質問できる。上に今週の使用量
  function aiAskBox(it) {
    const A = S.ai, I = A.info, u = I.usage || { pct: 0 }, full = u.pct >= 100;
    const ex = (it.convo || []).length ? '' : `<div class="ai-chips">${['水曜は何が来そう？', '本命の組は？', '天津飯が来る確率は？'].map(t => `<button data-askq="${esc(t)}">${esc(t)}</button>`).join('')}</div>`;
    return `<div class="ai-comp">${ex}
      <div class="ai-use" title="今週の使用量"><span>今週の使用量</span><i><b style="width:${u.pct}%"></b></i><span>${u.pct}%</span></div>
      <div class="ai-askrow"><textarea id="aiQ" rows="1" maxlength="120" placeholder="${full ? '今週の質問はここまでです' : '質問する（例：水曜は何が来そう？）'}" ${full ? 'disabled' : ''} aria-label="AIに質問する">${esc(A.draft || '')}</textarea>
      <button class="ai-send" id="aiAsk" ${A.draft && !full ? '' : 'disabled'} aria-label="送る"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
      <div class="ai-row"><button class="ai-pill" id="aiPick" aria-haspopup="dialog">${esc(aiName(A.model))}<span>エフォート ${esc(aiEff(A.effort))}</span><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg></button></div></div>`;
  }
  function aiScrollTo(it) { const el = document.getElementById(`ai-${it.model}-${it.effort}`); if (el) { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); el.querySelector('details').open = true; } }
  // モデルとエフォートを選ぶ（Claude のモデル選びのような形）
  function openAIPicker() {
    const A = S.ai, I = A.info;
    let m = A.model, e = A.effort;
    const draw = () => {
      const box = $layer.querySelector('.ai-pk'); if (!box) return;
      box.innerHTML = `<div class="ai-sec">モデル</div>${I.models.map(x => `<button class="ai-opt${x.id === m ? ' on' : ''}" data-m="${x.id}"><span class="t"><b>${esc(x.name)}</b><small>${esc(x.desc)}</small></span><span class="p">${I.prices[x.id][e] ? fmt(I.prices[x.id][e]) + 'pt' : `<b class="fr">無料</b><s>${fmt(I.basePrices[x.id][e])}pt</s>`}</span><i class="ck" aria-hidden="true"></i></button>`).join('')}
        <div class="ai-sec">エフォート</div><div class="ai-seg" role="radiogroup">${I.efforts.map(x => `<button role="radio" aria-checked="${x.id === e}" class="${x.id === e ? 'on' : ''}" data-e="${x.id}">${esc(x.name)}</button>`).join('')}</div>
        <div style="padding:6px 16px 0"><button class="btn gold block" id="aiOk">${esc(aiName(m))}・エフォート ${esc(aiEff(e))}（${I.prices[m][e] ? fmt(I.prices[m][e]) + 'pt' : '無料'}）</button></div>`;
      box.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { m = b.dataset.m; draw(); });
      box.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { e = b.dataset.e; draw(); });
      document.getElementById('aiOk').onclick = () => { A.model = m; A.effort = e; store.set('ai_model', m); store.set('ai_effort', e); closeLayer(); renderAI(); };
    };
    openLayer(`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-label="モデルとエフォート"><div class="grab"><span></span></div>
      <div class="sh"><h2>モデルとエフォート</h2><button class="xbtn" data-close aria-label="閉じる">✕</button></div><div class="ai-pk"></div></div>`);
    draw();
  }
  async function aiSend() {
    const A = S.ai, v = S.data.current;
    if (!v || A.pend) return;
    const model = A.model, effort = A.effort, t0 = Date.now();
    A.pend = { model, effort };
    renderAI();
    const lst = document.querySelector('.ai-list'); if (lst && lst.lastElementChild) lst.lastElementChild.scrollIntoView({ block: 'end', behavior: 'smooth' });
    let k = 0;
    const tick = setInterval(() => { const s = document.getElementById('aiStep'); if (s) s.textContent = AI_STEPS[k++ % AI_STEPS.length] + '…'; }, Math.max(500, AI_WAIT[effort] / AI_STEPS.length));
    try {
      const r = await api('aiBuy', { weekId: v.weekId, model, effort }, { loading: false });
      const rest = AI_WAIT[effort] - (Date.now() - t0); if (rest > 0) await new Promise(res => setTimeout(res, rest));
      A.info.balance = r.balance; S.data.me.balance = r.balance;
      if (!A.info.items.some(x => x.model === r.item.model && x.effort === r.item.effort)) A.info.items.push(r.item);
      A.fresh = r.item;
    } catch (e) {} finally { clearInterval(tick); A.pend = null; }
    if (S.screen === 'ai') renderAI();
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
    if (sc === 'ai' && S.ai) { renderAI(); return; }
    if (sc === 'notify') { renderNotify(); return; }
    if (sc === 'notice') { renderNotices(); return; }
    if (sc === 'icon') {
      const cur = iconId();
      const note = IS_STANDALONE
        ? '<span class="lead">ホーム画面から開いているので、ここでは変えられません。</span><span><b>変えるとき</b>ホーム画面のアイコンを消す → Safariで開いて選ぶ → 追加し直す</span>'
        : '<span class="lead">選んだアイコンで、ホーム画面に追加されます。</span><span><b>追加のしかた</b>Safariの共有ボタン →「ホーム画面に追加」</span><span><b>変えるとき</b>ホーム画面のアイコンを消す → 選び直す → 追加し直す</span>';
      $app.innerHTML = subBar('アプリのアイコン') + `<div class="icnote">${note}</div><div class="iclist">${ICONS.map(([id, name]) => `<button class="icrow${!IS_STANDALONE && id === cur ? ' on' : ''}" data-i="${id}" ${IS_STANDALONE ? 'disabled' : ''}><img src="${iconSrc(id, 180)}" alt="" width="52" height="52" loading="lazy"><span>${name}</span><i class="ck" aria-hidden="true"></i></button>`).join('')}</div>`;
      document.getElementById('back').onclick = () => { S.screen = null; render(); };
      $app.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
        store.set('pwa_icon', b.dataset.i); applyIcon();
        $app.querySelectorAll('.icrow').forEach(x => x.classList.toggle('on', x === b));
      });
      return;
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
  try { if (sessionStorage.getItem('hc_reload_msg')) { sessionStorage.removeItem('hc_reload_msg'); setTimeout(() => toast('アプリが新しくなりました。直前の操作をもう一度お願いします'), 600); } } catch (e) {}
  // 画面のファイルが新しくなっていたら、自動で開き直す
  // 公開のたびに build.json（見えない版の札）が置かれ、index.html の <meta name="build"> と見比べる。
  // 開いたとき・アプリに戻ってきたときに確かめる（1分に1回まで）。入力や窓を開いている途中なら、次に戻ってきたときに回す。
  // 開き直すときは URL に ?b=新しい札 を付けて、iPhone が古いページを使い回さないようにする（開いたあと URL からは消す）
  const BUILD = (document.querySelector('meta[name="build"]') || {}).content || '';
  try { const u = new URL(location.href); if (u.searchParams.has('b')) { u.searchParams.delete('b'); history.replaceState(null, '', u.pathname + u.search + u.hash); } } catch (e) {}
  let buildAt = 0;
  async function checkBuild() {
    if (!BUILD || Date.now() - buildAt < 60000) return;
    buildAt = Date.now();
    let b = '';
    try { const r = await fetch('build.json?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) b = (await r.json()).b || ''; } catch (e) { return; }
    if (!b || b === BUILD) return;
    // 同じ札へ30秒以内に開き直したのにまだ古い（古いファイルが残っている）なら、くり返さない
    try { const t = JSON.parse(sessionStorage.getItem('hc_build_reload') || 'null'); if (t && t.b === b && Date.now() - t.at < 30000) return; } catch (e) {}
    const busy = S.editing || $layer.innerHTML || (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName));
    if (busy) { buildAt = 0; return; }
    saveDraft();
    try { sessionStorage.setItem('hc_build_reload', JSON.stringify({ b, at: Date.now() })); } catch (e) {}
    const u = new URL(location.href); u.searchParams.set('b', b);
    location.replace(u.pathname + u.search + u.hash);
  }
  setTimeout(checkBuild, 1500);
  // しばらく閉じていたアプリに戻ってきたら、読み直す（画面が古ければここで自動で開き直る）
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    checkBuild();
    if (hiddenAt && Date.now() - hiddenAt > 5 * 60000 && S.token && S.data && !POST_MODE && !S.editing && !S.screen && !$layer.innerHTML) refresh({ loading: false, quiet: true }).catch(() => {});
    hiddenAt = 0;
  });
  if (S.token && POST_MODE) api('postMe', {}, { loading: false, quiet: true }).catch(() => {}); // ログインが切れていればログイン画面へ
  if (S.token && !POST_MODE) {
    if (S.tab === 'host') loadHost(true).then(() => { if (!S.data) refresh().catch(() => {}); });
    else refresh().then(() => { if (S.tab === 'kekka') maybeGong(S.data.lastResult); }).catch(() => {});
  }
})();
