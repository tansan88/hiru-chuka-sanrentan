/* シェア画像（1080×1080）を作る */
(function () {
  const S = 390, OUT = 1080, K = OUT / S;
  const imgs = {};
  function img(name) {
    if (!imgs[name]) imgs[name] = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'assets/' + name + '.png'; });
    return imgs[name];
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function raimon(c, col, op) {
    c.save(); c.globalAlpha = op; c.strokeStyle = col; c.lineWidth = 1.3; c.lineJoin = 'miter';
    const unit = (x, y) => { c.beginPath(); c.moveTo(x + 1, y + 9); c.lineTo(x + 1, y + 1); c.lineTo(x + 9, y + 1); c.lineTo(x + 9, y + 9); c.lineTo(x + 4, y + 9); c.lineTo(x + 4, y + 4); c.lineTo(x + 6, y + 4); c.lineTo(x + 6, y + 6); c.stroke(); };
    for (let x = 10; x < 380; x += 10) { unit(x, 10); unit(x, 370); }
    for (let y = 20; y < 370; y += 10) { unit(10, y); unit(370, y); }
    c.lineWidth = 1; c.strokeRect(23.5, 23.5, 343, 343); c.restore();
  }
  function mark(c, x, y, kind) {
    c.save();
    if (kind === 'hit') { c.fillStyle = '#F7B500'; c.beginPath(); c.arc(x, y, 13, 0, Math.PI * 2); c.fill(); c.fillStyle = '#0F5C2E'; c.font = '900 15px "Noto Sans JP", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✓', x, y + 1); }
    else if (kind === 'miss') { c.strokeStyle = '#8FB59C'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.stroke(); c.fillStyle = '#B9D1C0'; c.font = '900 14px "Noto Sans JP", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('×', x, y + 1); }
    else { c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(x, y, 13, 0, Math.PI * 2); c.fill(); c.fillStyle = '#D6E6DA'; c.font = '900 15px "Noto Sans JP", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('−', x, y + 1); }
    c.restore();
  }
  /*
   * data = { title, rows:[{day,name,odds,kind}], hits, cancelled, bet, net }
   */
  async function draw(data) {
    try { await document.fonts.ready; } catch (e) {}
    const cv = document.createElement('canvas'); cv.width = OUT; cv.height = OUT;
    const c = cv.getContext('2d'); c.scale(K, K);
    const t = data.cancelled ? 'one' : data.hits === 3 ? 'hit' : data.hits > 0 ? 'one' : 'zero';
    const bg = { hit: '#C8102E', one: '#0F5C2E', zero: '#3A443E' }[t];
    c.fillStyle = bg; c.fillRect(0, 0, S, S);
    raimon(c, t === 'zero' ? '#C9D3CC' : '#F7B500', t === 'zero' ? .6 : .7);
    // 動物（墨の線・半透明）
    try {
      const name = { hit: 'dragon', one: 'tiger', zero: 'panda' }[t];
      const im = await img(name);
      c.save(); c.globalAlpha = .4;
      if (name === 'dragon') { const h = 240, w = im.width * h / im.height; c.drawImage(im, S - 26 - w, 26, w, h); }
      else { const w = name === 'tiger' ? 175 : 165, h = im.height * w / im.width; c.drawImage(im, S - (name === 'tiger' ? 28 : 30) - w, name === 'tiger' ? 30 : 30, w, h); }
      c.restore();
    } catch (e) {}
    // ロゴ
    c.fillStyle = '#FFFFFF'; rr(c, 40, 40, 103, 32, 4); c.fill();
    c.fillStyle = '#C8102E'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.save(); c.translate(63, 55); c.scale(1.9, 1); c.font = '900 13px "Noto Sans JP", sans-serif'; c.fillText('昼', 0, 0); c.restore();
    c.font = '900 13px "Noto Sans JP", sans-serif'; c.fillText('中華', 63, 68);
    c.fillStyle = '#0F5C2E'; c.textAlign = 'left'; c.font = '900 19px "Noto Sans JP", sans-serif'; c.fillText('3連単', 82, 63);
    // 見出し
    c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '700 13px "Noto Sans JP", sans-serif'; c.fillText(data.title, 40, 96);
    const head = data.cancelled ? '中止のため返還' : t === 'hit' ? '3連単 的中！' : data.hits > 0 ? data.hits + '日的中' : '全部はずれ…';
    c.fillStyle = t === 'hit' ? '#F7B500' : '#FFFFFF'; c.font = '900 ' + (t === 'hit' ? 32 : 28) + 'px "Noto Sans JP", sans-serif'; c.fillText(head, 40, 130);
    // 3日分
    let y = 146;
    data.rows.forEach(r => {
      const on = r.kind === 'hit';
      c.fillStyle = on ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.15)'; rr(c, 40, y, 310, 36, 6); c.fill();
      const col = on ? '#FFFFFF' : '#B9D1C0';
      c.fillStyle = col; c.font = '900 16px "Noto Sans JP", sans-serif'; c.fillText(r.day, 52, y + 24);
      c.font = '700 16px "Noto Sans JP", sans-serif';
      let nm = r.name; while (c.measureText(nm).width > 170 && nm.length > 1) nm = nm.slice(0, -1); if (nm !== r.name) nm += '…';
      c.fillText(nm, 88, y + 24);
      if (r.odds) { c.font = '700 13px "Noto Sans JP", sans-serif'; c.textAlign = 'right'; c.fillText(r.odds.toFixed(1) + '倍', 314, y + 23); c.textAlign = 'left'; }
      mark(c, 337, y + 18, r.kind);
      y += 41;
    });
    // 収支
    c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '400 12px "Noto Sans JP", sans-serif';
    c.fillText('使った ' + data.bet.toLocaleString() + 'pt ／ 収支', 350, 318);
    const netTxt = data.cancelled ? '±0' : (data.net > 0 ? '+' : data.net < 0 ? '−' : '±') + Math.abs(data.net).toLocaleString();
    c.font = '900 ' + (t === 'hit' ? 30 : 26) + 'px "Noto Sans JP", sans-serif';
    c.save(); c.font = '900 14px "Noto Sans JP", sans-serif'; const ptW = c.measureText('pt').width + 4; c.restore();
    c.fillStyle = t === 'hit' ? '#F7B500' : '#FFFFFF'; c.fillText(netTxt, 350 - ptW, 350);
    c.font = '900 14px "Noto Sans JP", sans-serif'; c.fillText('pt', 350, 350);
    return cv;
  }
  window.ShareImage = {
    canvas: draw,
    blob: data => draw(data).then(cv => new Promise(res => cv.toBlob(res, 'image/png'))),
  };
})();
