// ── Shared state ──
let isBull = true;
let currentTicker = '';

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

  // Support both new 'price' key and old 'spy_price' key
  const price = v.price ?? v.spy_price ?? null;

  if (v.ticker) {
    currentTicker = v.ticker;
    document.getElementById('price-label').textContent = v.ticker + ' price';
    document.getElementById('header-ticker').textContent = v.ticker + ' 0DTE';
  }

  setField('slowTop',  v.slow_cloud_top);
  setField('slowBot',  v.slow_cloud_bottom);
  setField('fastTop',  v.fast_cloud_top);
  setField('fastBot',  v.fast_cloud_bottom);
  if (price)     setField('spyPrice', price);
  if (v.time_et) setField('spyHour',  v.time_et);

  const tickerLabel = currentTicker || 'Price';
  const lr = document.getElementById('last-read');
  lr.style.display = 'block';
  document.getElementById('last-read-rows').innerHTML = `
    <div class="last-read-row"><span class="lr-label">Setup</span><span class="lr-val ${bull?'cg':'cr'}">${bull?'🟢 Bullish':'🔴 Bearish'}</span></div>
    <div class="last-read-row"><span class="lr-label">${bull?'Green':'Red'} cloud (slow)</span><span class="lr-val">${f(v.slow_cloud_bottom)} – ${f(v.slow_cloud_top)}</span></div>
    <div class="last-read-row"><span class="lr-label">${bull?'Blue':'Yellow'} cloud (fast)</span><span class="lr-val">${f(v.fast_cloud_bottom)} – ${f(v.fast_cloud_top)}</span></div>
    <div class="last-read-row"><span class="lr-label">${tickerLabel} price</span><span class="lr-val">${price ? '$'+f(price) : '—'}</span></div>
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
  const gapPct = (gap / price) * 100;
  const gapTier = gap <= 0 ? 'merged' : gapPct < 0.03 ? 'weak' : gapPct < 0.08 ? 'moderate' : 'strong';
  const gapTierInfo = {
    merged:   { label: 'Clouds merged — no separation',    color: '#f85149', short: 'Merged' },
    weak:     { label: 'Weak separation — low conviction', color: '#d29922', short: 'Weak trend' },
    moderate: { label: 'Moderate separation',              color: '#388bfd', short: 'Moderate trend' },
    strong:   { label: 'Strong separation — trending',     color: '#3fb950', short: 'Strong trend' },
  }[gapTier];

  // How far price has already run beyond the cloud it broke — distinguishes a
  // fresh break from a confirmed, healthy continuation from a stretched move
  // that's at higher risk of reverting back toward the cloud before any target.
  const extensionPts = isBull ? price - slowTop : slowBot - price;
  const extensionPct = (extensionPts / price) * 100;
  const extensionTier = extensionPct <= 0.05 ? 'fresh' : extensionPct <= 0.25 ? 'extended' : 'stretched';
  const extensionTierInfo = {
    fresh:     { label: 'Fresh break — early entry, momentum unconfirmed',        color: '#388bfd', short: 'Fresh break' },
    extended:  { label: 'Confirmed extension — healthy trend continuation',       color: '#3fb950', short: 'Confirmed move' },
    stretched: { label: 'Stretched from cloud — chase risk, consider a pullback', color: '#d29922', short: 'Stretched ⚠' },
  }[extensionTier];

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
    badge(gapTierInfo.short, gapTier==='strong'?'bg':gapTier==='merged'?'br':'ba') +
    (validEntry ? badge(extensionTierInfo.short, extensionTier==='stretched'?'ba':extensionTier==='extended'?'bg':'bm') : '') +
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
    sig(gapTierInfo.color, `Gap: <strong>${f(gap)} pts</strong> (${gapPct.toFixed(3)}% of price) — ${gapTierInfo.label}`) +
    (validEntry ? sig(extensionTierInfo.color, `Extension: <strong>${f(extensionPts)} pts</strong> (${extensionPct.toFixed(3)}% of price) beyond ${isBull?'green':'red'} cloud — ${extensionTierInfo.label}`) : '') +
    sig(timeOk?'#3fb950':'#d29922', `${Math.floor(hour)}:${String(Math.round((hour%1)*60)).padStart(2,'0')} ET — ${timeOk?'prime window (10:30am–3pm)':'outside ideal window'}`) +
    sig(validEntry?sc:'#f85149', validEntry
      ? `✓ ${isBull?'Above both clouds':'Below both clouds'} — valid ${isBull?'call':'put'} setup`
      : `✗ ${locLabels[loc]} — wait for close ${isBull?'above $'+f(slowTop):'below $'+f(slowBot)}`);

  // Trade plan metrics
  const atm = Math.round(price);
  let stopPx, stopDist, t1, t2;
  if (isBull) { stopPx=slowBot-0.10; stopDist=price-stopPx; t1=slowTop+(slowTop-slowBot); t2=price+3; }
  else        { stopPx=fastTop+0.10; stopDist=stopPx-price; t1=slowBot-(fastTop-slowTop); t2=price-3; }

  // Quality blends cloud separation (trend strength) with how far price has
  // already run beyond the cloud (confirmation vs. chase risk) — this mirrors
  // how Ripster cloud traders actually read a setup: a wide gap with confirmed
  // follow-through beats a wide gap nobody has acted on yet, and a stretched
  // price — even on a strong gap — carries more chase risk than a fresh break.
  const qualityMatrix = {
    merged:   { fresh: 'D', extended: 'D', stretched: 'D' },
    weak:     { fresh: 'C', extended: 'C', stretched: 'D' },
    moderate: { fresh: 'B', extended: 'A', stretched: 'C' },
    strong:   { fresh: 'A', extended: 'A', stretched: 'B' },
  };
  let quality, qClass;
  if (!validEntry) {
    quality = '—'; qClass = 'cm';
  } else {
    let base = qualityMatrix[gapTier][extensionTier];
    if (timeOk && (base === 'A' || base === 'B')) base += '+';
    quality = base;
    qClass = base[0] === 'A' ? (isBull?'cg':'cr') : base[0] === 'D' ? 'cr' : 'ca';
  }

  document.getElementById('metrics').innerHTML = `
    <div class="metric"><div class="metric-label">Direction</div><div class="metric-value ${validEntry?(isBull?'cg':'cr'):'ca'}">${validEntry?(isBull?'CALLS':'PUTS'):'WAIT'}</div></div>
    <div class="metric"><div class="metric-label">Hard stop</div><div class="metric-value cr">$${f(stopPx)}</div><div class="metric-sub">${isBull?'Below green':'Above yellow'}</div></div>
    <div class="metric"><div class="metric-label">Stop distance</div><div class="metric-value">${f(stopDist)}<span style="font-size:13px;color:var(--muted)"> pts</span></div><div class="metric-sub">~$${f(stopDist*100)}/contract</div></div>
    <div class="metric"><div class="metric-label">Target 1</div><div class="metric-value cg">$${f(isBull?t1:t2)}</div></div>
    <div class="metric"><div class="metric-label">Quality</div><div class="metric-value ${qClass}">${quality}</div><div class="metric-sub">${validEntry ? gapTierInfo.short+' · '+extensionTierInfo.short : gapTierInfo.short}</div></div>`;

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
    const dirSuffix    = isBull ? 'C' : 'P';
    const strikeColor  = isBull ? 'var(--green-txt)' : 'var(--red-txt)';
    const strikeSpan   = n => `<span style="color:${strikeColor};font-weight:600">${n}${dirSuffix}</span>`;
    const oneOtmStrike = isBull ? atm + 1 : atm - 1;
    const pullEntry    = isBull ? f(fastTop) : f(fastBot+0.10);
    const pullLbl      = isBull ? 'blue top' : 'yellow bottom';
    const stretched    = extensionTier === 'stretched';

    // Further-OTM strikes require both: (1) enough cloud separation that the
    // move structurally has room to run, and (2) price not already stretched
    // beyond the cloud — chasing OTM strikes into an extended move adds risk
    // without the confirmation a pullback-and-continuation would give.
    const aggressiveBadge = stretched
      ? `<span class="badge ba" style="font-size:10px;padding:2px 7px">ATM · chasing</span>`
      : `<span class="badge bm" style="font-size:10px;padding:2px 7px">ATM</span>`;
    const pullbackBadge = stretched
      ? `<span class="badge ${isBull?'bg':'br'}" style="font-size:10px;padding:2px 7px">preferred — pullback</span>`
      : `<span class="badge ${isBull?'bg':'br'}" style="font-size:10px;padding:2px 7px">best price</span>`;

    const rows = [
      { label: `Aggressive ${aggressiveBadge}`,                                                          strike: atm,          entry: f(price) },
      { label: `Balanced <span class="badge bm" style="font-size:10px;padding:2px 7px">1 OTM</span>`,    strike: oneOtmStrike, entry: f(price) },
    ];
    const usedStrikes = new Set([atm, oneOtmStrike]);

    if (!stretched && (gapTier === 'moderate' || gapTier === 'strong')) {
      const cloudStrike = Math.round(t1);
      if (!usedStrikes.has(cloudStrike)) {
        usedStrikes.add(cloudStrike);
        rows.push({ label: `Swing <span class="badge bm" style="font-size:10px;padding:2px 7px">cloud target</span>`, strike: cloudStrike, entry: f(price) });
      }
    }
    if (!stretched && gapTier === 'strong') {
      const runnerStrike = Math.round(t2);
      if (!usedStrikes.has(runnerStrike)) {
        usedStrikes.add(runnerStrike);
        rows.push({ label: `Runner <span class="badge bm" style="font-size:10px;padding:2px 7px">extended</span>`, strike: runnerStrike, entry: f(price) });
      }
    }
    rows.sort((a, b) => isBull ? a.strike - b.strike : b.strike - a.strike);
    rows.push({ label: `${isBull?'Pullback':'Bounce'} ${pullbackBadge}`, strike: atm, entry: `${pullEntry} (${pullLbl})` });

    let tableNote = '';
    if (stretched) {
      tableNote = `Price is already stretched beyond the cloud — skip further OTM strikes and consider waiting for a pullback to the ${isBull?'blue':'yellow'} cloud edge instead of chasing.`;
    } else if (gapTier === 'weak' || gapTier === 'merged') {
      tableNote = 'Gap too thin for further OTM strikes — stick to ATM/1 OTM until cloud separation widens.';
    }

    document.getElementById('etbody').innerHTML = rows.map(r => `
      <tr><td>${r.label}</td><td class="tm">${strikeSpan(r.strike)}</td><td class="tm">$${r.entry}</td><td class="tm cr">$${f(stopPx)}</td><td class="tm cg">$${f(isBull?t1:t2)}</td><td class="tm cg">$${f(isBull?t2:t1)}</td></tr>`).join('') +
      (tableNote ? `<tr><td colspan="6"><div class="wait-box" style="background:var(--bg3);border-color:var(--border2);color:var(--muted)"><span style="font-size:16px;flex-shrink:0">ℹ</span><div>${tableNote}</div></div></td></tr>` : '');
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
