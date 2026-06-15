// ── Build bookmarklet URL ──
// Reads Ripster EMA values from the TradingView chart via the internal TradingViewApi.
const bookmarkletCode = `(function(){
  'use strict';

  function toast(msg,color){
    var t=document.createElement('div');
    t.style.cssText='position:fixed;top:20px;right:20px;padding:14px 20px;border-radius:10px;font-family:monospace;font-size:13px;z-index:2147483647;box-shadow:0 4px 24px rgba(0,0,0,.5);line-height:1.7;max-width:420px;white-space:pre-wrap;background:'+(color||'#1D9E75')+';color:#fff';
    t.innerHTML=msg;
    document.body.appendChild(t);
    setTimeout(function(){t.style.transition='opacity .6s';t.style.opacity='0';setTimeout(function(){t.remove();},600);},7000);
  }

  // Plot indices confirmed via console debugging session:
  //   idx  3 = slow cloud bottom (EMA 34 or 50)
  //   idx  5 = fast cloud top    (EMA 5  or 12)
  //   idx 13 = slow cloud top    (EMA 50 or 34)
  //   idx 15 = fast cloud bottom (EMA 12 or 5)

  if(!window.TradingViewApi){
    toast('<strong>☁ TradingViewApi not found</strong>\\nMake sure you are on a TradingView chart page.','#854F0B');
    return;
  }

  var chart;
  try{ chart=window.TradingViewApi.chart(); }
  catch(e){ toast('<strong>☁ Could not access chart</strong>\\n'+e.message,'#854F0B'); return; }

  var studies=chart.getAllStudies();
  var ripster=studies.find(function(s){ return s.name==='Ripster EMA Clouds'; });
  if(!ripster){
    var names=studies.map(function(s){return s.name;}).join(', ');
    toast('<strong>☁ Ripster EMA Clouds not found</strong>\\nIndicators on chart:\\n'+names,'#854F0B');
    return;
  }

  var entity=chart.getStudyById(ripster.id);
  var items=entity._study._data._items;

  var last=null;
  for(var i=items.length-1;i>=0;i--){
    var v=items[i].value;
    if(v&&v[3]!=null&&v[5]!=null&&v[13]!=null&&v[15]!=null){ last=v; break; }
  }
  if(!last){
    toast('<strong>☁ No valid EMA data found</strong>\\nTry scrolling chart to the latest candle.','#854F0B');
    return;
  }

  var slowTop    = Math.max(last[3], last[13]);
  var slowBottom = Math.min(last[3], last[13]);
  var fastTop    = Math.max(last[5], last[15]);
  var fastBottom = Math.min(last[5], last[15]);

  // ── Ticker symbol (three fallbacks) ──
  var ticker = null;
  try { var sym=chart.symbol(); if(sym) ticker=sym.split(':').pop(); } catch(e) {}
  if (!ticker) { var um=location.search.match(/[?&]symbol=(?:[^:]+:)?([A-Z0-9\\.]+)/i); if(um) ticker=um[1].toUpperCase(); }
  if (!ticker) { var tm=document.title.match(/^([A-Z0-9\\.\\-]+)\\s+(?:Chart|chart)/); if(tm) ticker=tm[1]; }

  // ── Current price from OHLC header (works for any ticker) ──
  var currentPrice=null;
  var cm=(document.body.innerText||'').match(/\\bC[\\s:]*([\\d,]+\\.?\\d*)\\b/);
  if(cm) currentPrice=parseFloat(cm[1].replace(/,/g,''));

  // Bullish: fast cloud center is BELOW slow cloud center
  var slowCenter = (slowTop + slowBottom) / 2;
  var fastCenter = (fastTop + fastBottom) / 2;
  var setup = fastCenter < slowCenter ? 'bullish' : 'bearish';

  var now=new Date();
  var etHour=((now.getUTCHours()-4+24)%24)+now.getUTCMinutes()/60;

  var result={
    setup:setup,
    ticker:ticker,
    price:currentPrice,
    time_et:parseFloat(etHour.toFixed(2)),
    slow_cloud_top:parseFloat(slowTop.toFixed(2)),
    slow_cloud_bottom:parseFloat(slowBottom.toFixed(2)),
    fast_cloud_top:parseFloat(fastTop.toFixed(2)),
    fast_cloud_bottom:parseFloat(fastBottom.toFixed(2))
  };

  navigator.clipboard.writeText(JSON.stringify(result)).then(function(){
    var gap=(slowBottom-fastTop).toFixed(2);
    toast(
      '<strong>☁ Ripster clouds copied!</strong>\\n'+
      (ticker?ticker+' · ':'')+
      (setup==='bullish'?'🟢 Bullish':'🔴 Bearish')+
      (currentPrice?'  ·  $'+currentPrice.toFixed(2):'')+
      '\\nSlow (34/50): '+slowTop.toFixed(2)+' / '+slowBottom.toFixed(2)+
      '\\nFast  (5/12): '+fastTop.toFixed(2)+' / '+fastBottom.toFixed(2)+
      '\\nGap: '+gap+' pts'
    );
  }).catch(function(){
    prompt('Clipboard blocked — copy manually:',JSON.stringify(result));
  });
})();`;

document.getElementById('bookmarklet-link').href = 'javascript:' + encodeURIComponent(bookmarkletCode);

// ── Paste from clipboard ──
async function pasteFromClipboard() {
  const sb = document.getElementById('status-bar');
  const st = document.getElementById('status-text');
  sb.style.display = 'flex';

  try {
    const text = await navigator.clipboard.readText();
    let parsed;
    try {
      parsed = JSON.parse(text.trim());
    } catch(e) {
      st.className = 'err';
      st.textContent = '✗ Clipboard doesn\'t contain valid cloud data — run the bookmarklet on TradingView first.';
      return;
    }

    const required = ['slow_cloud_top','slow_cloud_bottom','fast_cloud_top','fast_cloud_bottom'];
    const missing = required.filter(k => parsed[k] == null);
    if (missing.length) {
      st.className = 'err';
      st.textContent = '✗ Missing fields: ' + missing.join(', ') + ' — re-run the bookmarklet.';
      return;
    }

    st.className = 'ok';
    st.textContent = '✓ Values read — auto-calculating...';
    populateAndCalc(parsed);

  } catch(e) {
    st.className = 'err';
    st.textContent = '✗ Could not read clipboard. In Chrome: allow clipboard access when prompted.';
  }
}
