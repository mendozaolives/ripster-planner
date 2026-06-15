// ── Shared state ──
let isBull = true;

// ── Helpers ──
const f = n => parseFloat(n).toFixed(2);
function badge(txt, cls) { return `<span class="badge ${cls}">${txt}</span>`; }
function sig(color, html) { return `<div class="signal"><span class="sdot" style="background:${color}"></span><span>${html}</span></div>`; }

function applyTheme(bull) {
  isBull = bull;
  document.getElementById('slow-swatch').style.background = bull ? '#3fb950' : '#f85149';
  document.getElementById('fast-swatch').style.background = bull ? '#388bfd' : '#d29922';
  document.getElementById('slow-label').style.color = bull ? 'var(--green-txt)' : 'var(--red-txt)';
  document.getElementById('fast-label').style.color = bull ? 'var(--blue-txt)'  : 'var(--amber-txt)';
  document.getElementById('slow-label').textContent  = bull ? 'Green cloud — 34/50 EMA (slow)' : 'Red cloud — 34/50 EMA (slow)';
  document.getElementById('fast-label').textContent  = bull ? 'Blue cloud — 5/12 EMA (fast)'  : 'Yellow cloud — 5/12 EMA (fast)';
  const btn = document.getElementById('calc-btn');
  btn.style.background = bull ? 'var(--green)' : 'var(--red)';
  btn.style.color = bull ? '#0d1117' : '#fff';
  const pbtn = document.getElementById('paste-btn');
  pbtn.className = 'paste-btn' + (bull ? '' : ' bear');
}

function setField(id, val) {
  const el = document.getElementById(id);
  if (!el || val == null) return;
  el.value = parseFloat(val).toFixed(2);
  el.classList.add('filled');
  setTimeout(() => el.classList.remove('filled'), 2000);
}

function populateAndCalc(v) {
  const bull = v.setup !== 'bearish';
  applyTheme(bull);

  setField('slowTop',  v.slow_cloud_top);
  setField('slowBot',  v.slow_cloud_bottom);
  setField('fastTop',  v.fast_cloud_top);
  setField('fastBot',  v.fast_cloud_bottom);
  if (v.spy_price)  setField('spyPrice', v.spy_price);
  if (v.time_et)    setField('spyHour',  v.time_et);

  const lr = document.getElementById('last-read');
  lr.style.display = 'block';
  document.getElementById('last-read-rows').innerHTML = `
    <div class="last-read-row"><span class="lr-label">Setup</span><span class="lr-val ${bull?'cg':'cr'}">${bull?'🟢 Bullish':'🔴 Bearish'}</span></div>
    <div class="last-read-row"><span class="lr-label">${bull?'Green':'Red'} cloud (slow)</span><span class="lr-val">${f(v.slow_cloud_bottom)} – ${f(v.slow_cloud_top)}</span></div>
    <div class="last-read-row"><span class="lr-label">${bull?'Blue':'Yellow'} cloud (fast)</span><span class="lr-val">${f(v.fast_cloud_bottom)} – ${f(v.fast_cloud_top)}</span></div>
    <div class="last-read-row"><span class="lr-label">SPY price</span><span class="lr-val">${v.spy_price ? '$'+f(v.spy_price) : '—'}</span></div>
    <div class="last-read-row"><span class="lr-label">Time ET</span><span class="lr-val">${v.time_et ? Math.floor(v.time_et)+':'+String(Math.round((v.time_et%1)*60)).padStart(2,'0') : '—'}</span></div>
  `;

  calc();
}

function calc() {
  const slowTop = +document.getElementById('slowTop').value;
  const slowBot = +document.getElementById('slowBot').value;
  const fastTop = +document.getElementById('fastTop').value;
  const fastBot = +document.getElementById('fastBot').value;
  const price   = +document.getElementById('spyPrice').value;
  const hour    = +document.getElementById('spyHour').value;
  if (!slowTop || !slowBot || !fastTop || !fastBot || !price) return;

  const timeOk = hour >= 10.5 && hour < 15;
  const gap = isBull ? slowBot - fastTop : fastBot - slowTop;

  let loc;
  if (isBull) {
    if      (price > slowTop)  loc = 'above_both';
    else if (price >= slowBot) loc = 'in_slow';
    else if (price > fastTop)  loc = 'between';
    else if (price >= fastBot) loc = 'in_fast';
    else                       loc = 'below_both';
  } else {
    if      (price < slowBot)  loc = 'below_both';
    else if (price <= slowTop) loc = 'in_slow';
    else if (price < fastBot)  loc = 'between';
    else if (price <= fastTop) loc = 'in_fast';
    else                       loc = 'above_both';
  }

  const validEntry = isBull ? loc === 'above_both' : loc === 'below_both';

  const locLabels = {
    above_both: isBull ? 'Price above both clouds' : 'Price above both clouds (no puts)',
    in_slow:    isBull ? 'Inside green cloud — chop' : 'Inside red cloud — chop',
    between:    'Between clouds — chop zone',
    in_fast:    isBull ? 'Inside blue cloud — chop' : 'Inside yellow cloud — chop',
    below_both: isBull ? 'Price below both clouds (no calls)' : 'Price below both clouds',
  };

  // Banner
  const banner = document.getElementById('dir-banner');
  banner.className = 'dir-banner ' + (validEntry ? (isBull?'bull':'bear') : 'wait');
  banner.style.display = 'flex';
  document.getElementById('dir-icon').textContent  = validEntry ? (isBull?'📈':'📉') : '⏸';
  document.getElementById('dir-title').textContent = validEntry ? (isBull?'BUY CALLS':'BUY PUTS') : 'WAIT — NO TRADE';
  document.getElementById('dir-sub').textContent   = locLabels[loc];
  document.getElementById('dir-badges').innerHTML  =
    badge(isBull?'🟢 Bullish clouds':'🔴 Bearish clouds', isBull?'bg':'br') +
    badge(locLabels[loc], validEntry?(isBull?'bg':'br'):'ba') +
    badge(timeOk?'✓ Prime window':'⚠ Outside prime window', timeOk?'bg':'ba');

  // Signals
  const sc = isBull ? '#3fb950' : '#f85149';
  const fc = isBull ? '#388bfd' : '#d29922';
  document.getElementById('badges').innerHTML =
    badge(locLabels[loc], validEntry?(isBull?'bg':'br'):'ba') +
    badge(timeOk?'✓ Prime window':'⚠ Outside window', timeOk?'bg':'ba');

  document.getElementById('signals').innerHTML =
    sig(sc, `${isBull?'Green':'Red'} cloud (34/50): <strong>$${f(slowBot)} – $${f(slowTop)}</strong> · width ${f(slowTop-slowBot)} pts`) +
    sig(fc, `${isBull?'Blue':'Yellow'} cloud (5/12): <strong>$${f(fastBot)} – $${f(fastTop)}</strong>`) +
    sig(gap>0?sc:'#d29922', `Gap: <strong>${f(gap)} pts</strong> — ${gap>0?'healthy separation':'clouds merged'}`) +
    sig(timeOk?'#3fb950':'#d29922', `${Math.floor(hour)}:${String(Math.round((hour%1)*60)).padStart(2,'0')} ET — ${timeOk?'prime window (10:30am–3pm)':'outside ideal window'}`) +
    sig(validEntry?sc:'#f85149', validEntry
      ? `✓ ${isBull?'Above both clouds':'Below both clouds'} — valid ${isBull?'call':'put'} setup`
      : `✗ ${locLabels[loc]} — wait for close ${isBull?'above $'+f(slowTop):'below $'+f(slowBot)}`);

  // Trade plan metrics
  const atm = Math.round(price);
  let stopPx, stopDist, t1, t2;
  if (isBull) { stopPx=slowBot-0.10; stopDist=price-stopPx; t1=slowTop+(slowTop-slowBot); t2=price+3; }
  else        { stopPx=fastTop+0.10; stopDist=stopPx-price; t1=slowBot-(fastTop-slowTop); t2=price-3; }

  const qClass = validEntry&&timeOk?(isBull?'cg':'cr'):'ca';
  document.getElementById('metrics').innerHTML = `
    <div class="metric"><div class="metric-label">Direction</div><div class="metric-value ${validEntry?(isBull?'cg':'cr'):'ca'}">${validEntry?(isBull?'CALLS':'PUTS'):'WAIT'}</div></div>
    <div class="metric"><div class="metric-label">Hard stop</div><div class="metric-value cr">$${f(stopPx)}</div><div class="metric-sub">${isBull?'Below green':'Above yellow'}</div></div>
    <div class="metric"><div class="metric-label">Stop distance</div><div class="metric-value">${f(stopDist)}<span style="font-size:13px;color:var(--muted)"> pts</span></div><div class="metric-sub">~$${f(stopDist*100)}/contract</div></div>
    <div class="metric"><div class="metric-label">Target 1</div><div class="metric-value cg">$${f(isBull?t1:t2)}</div></div>
    <div class="metric"><div class="metric-label">Quality</div><div class="metric-value ${qClass}">${validEntry&&timeOk?'A+':validEntry?'B':'—'}</div></div>`;

  // Entry ladder
  if (isBull) {
    document.getElementById('ladder').innerHTML = `
      <div class="lrow"><span class="lprice cg">$${f(t2)}</span><span class="llabel">◀ Target 2 (+3 pts)</span></div>
      <div class="lrow"><span class="lprice cg">$${f(t1)}</span><span class="llabel">◀ Target 1</span></div>
      <hr class="ldiv">
      <div class="lrow"><span class="lprice" style="color:var(--green-txt)">$${f(slowTop)}</span><span class="lband" style="background:var(--green-dim);color:var(--green-txt)">Green top — pullback entry zone</span></div>
      <div class="lrow"><span class="lprice" style="color:var(--green-txt)">$${f(slowBot)}</span><span class="lband" style="background:var(--green-dim);color:var(--green-txt)">Green bottom — 34/50 EMA</span></div>
      <div class="lrow"><span class="lprice cm" style="font-size:11px">gap ${f(gap)}pts</span></div>
      <div class="lrow"><span class="lprice" style="color:var(--blue-txt)">$${f(fastTop)}</span><span class="lband" style="background:var(--blue-dim);color:var(--blue-txt)">Blue top — 5/12 EMA</span></div>
      <div class="lrow"><span class="lprice" style="color:var(--blue-txt)">$${f(fastBot)}</span><span class="lband" style="background:var(--blue-dim);color:var(--blue-txt)">Blue bottom — best entry price</span></div>
      <hr class="ldiv">
      <div class="lrow"><span class="lprice cr">$${f(stopPx)}</span><span class="llabel">◀ Hard stop</span></div>`;
  } else {
    document.getElementById('ladder').innerHTML = `
      <div class="lrow"><span class="lprice cm" style="font-size:11px">no puts above yellow</span></div>
      <div class="lrow"><span class="lprice" style="color:var(--amber-txt)">$${f(fastTop)}</span><span class="lband" style="background:var(--amber-dim);color:var(--amber-txt)">Yellow top — bounce = best put entry</span></div>
      <div class="lrow"><span class="lprice" style="color:var(--amber-txt)">$${f(fastBot)}</span><span class="lband" style="background:var(--amber-dim);color:var(--amber-txt)">Yellow bottom — 5/12 EMA</span></div>
      <div class="lrow"><span class="lprice cm" style="font-size:11px">gap ${f(gap)}pts</span></div>
      <div class="lrow"><span class="lprice" style="color:var(--red-txt)">$${f(slowTop)}</span><span class="lband" style="background:var(--red-dim);color:var(--red-txt)">Red top — sweet spot</span></div>
      <div class="lrow"><span class="lprice" style="color:var(--red-txt)">$${f(slowBot)}</span><span class="lband" style="background:var(--red-dim);color:var(--red-txt)">Red bottom — 34/50 EMA</span></div>
      <hr class="ldiv">
      <div class="lrow"><span class="lprice cg">$${f(t2)}</span><span class="llabel">◀ Target 2 (−3 pts)</span></div>
      <div class="lrow"><span class="lprice cg">$${f(t1)}</span><span class="llabel">◀ Target 1</span></div>
      <hr class="ldiv">
      <div class="lrow"><span class="lprice cr">$${f(stopPx)}</span><span class="llabel">◀ Hard stop</span></div>`;
  }

  // Entry table
  if (validEntry) {
    const st = isBull
      ? [`<span style="color:var(--green-txt);font-weight:600">${atm}C</span>`, `<span style="color:var(--green-txt);font-weight:600">${atm+1}C</span>`]
      : [`<span style="color:var(--red-txt);font-weight:600">${atm}P</span>`,   `<span style="color:var(--red-txt);font-weight:600">${atm-1}P</span>`];
    const pullEntry = isBull ? f(fastTop) : f(fastBot+0.10);
    const pullLbl   = isBull ? 'blue top' : 'yellow bottom';
    document.getElementById('etbody').innerHTML = `
      <tr><td>Aggressive <span class="badge bm" style="font-size:10px;padding:2px 7px">ATM</span></td><td class="tm">${st[0]}</td><td class="tm">$${f(price)}</td><td class="tm cr">$${f(stopPx)}</td><td class="tm cg">$${f(isBull?t1:t2)}</td><td class="tm cg">$${f(isBull?t2:t1)}</td></tr>
      <tr><td>Balanced <span class="badge bm" style="font-size:10px;padding:2px 7px">1 OTM</span></td><td class="tm">${st[1]}</td><td class="tm">$${f(price)}</td><td class="tm cr">$${f(stopPx)}</td><td class="tm cg">$${f(isBull?t1+1:t2-1)}</td><td class="tm cg">$${f(isBull?t2+1:t1-1)}</td></tr>
      <tr><td>${isBull?'Pullback':'Bounce'} <span class="badge ${isBull?'bg':'br'}" style="font-size:10px;padding:2px 7px">best price</span></td><td class="tm">${st[0]}</td><td class="tm">$${pullEntry} (${pullLbl})</td><td class="tm cr">$${f(stopPx)}</td><td class="tm cg">$${f(isBull?t1:t2)}</td><td class="tm cg">$${f(isBull?t2:t1)}</td></tr>`;
    document.getElementById('stopRules').innerHTML = isBull
      ? sig('#f85149',`<strong>Hard stop:</strong> 5m candle closes below green cloud bottom ($${f(stopPx)})`) +
        sig('#d29922',`<strong>Trail:</strong> Once $${f(t1)} hit, move stop up to blue cloud top ($${f(fastTop)})`) +
        sig('#3fb950',`<strong>Take profit:</strong> When green cloud starts narrowing or flattening`) +
        sig('#f85149',`<strong>No re-entry</strong> after stop-out inside the cloud`)
      : sig('#f85149',`<strong>Hard stop:</strong> 5m candle closes above yellow cloud top ($${f(stopPx)})`) +
        sig('#d29922',`<strong>Best entry:</strong> Bounce to yellow bottom ($${f(fastBot+0.10)}), red candle close`) +
        sig('#d29922',`<strong>Trail:</strong> Once target 1 hit, move stop to red bottom ($${f(slowBot)})`) +
        sig('#3fb950',`<strong>Take profit:</strong> When red cloud narrows or flattens`);
  } else {
    const waitFor = isBull ? `above $${f(slowTop)}` : `below $${f(slowBot)}`;
    document.getElementById('etbody').innerHTML = `<tr><td colspan="6"><div class="wait-box"><span style="font-size:20px;flex-shrink:0;line-height:1.3">⏸</span><div>${locLabels[loc]} — no ${isBull?'call':'put'} entry per your rules.<br>Wait for a full 5m candle close <strong>${waitFor}</strong>.</div></div></td></tr>`;
    document.getElementById('stopRules').innerHTML = sig('#d29922', `Waiting for 5m candle close ${waitFor}.`);
  }

  document.getElementById('output').classList.remove('hidden');
}
