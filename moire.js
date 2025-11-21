(function(){
  const art = document.getElementById('art');
  const disp = document.getElementById('disp');
  const noise = document.getElementById('noise');
  const lines2 = document.getElementById('lines2');
  const overlay = document.getElementById('overlayField');
  const paper1 = document.getElementById('paper1');
  const ink1 = document.getElementById('ink1');
  const paper2 = document.getElementById('paper2');
  const ink2 = document.getElementById('ink2');
  const colorOverlay = document.getElementById('colorOverlay');
  const playBtn = document.getElementById('play');
  const pauseBtn = document.getElementById('pause');
  const exportSvg = document.getElementById('exportSvg');
  const randomSeed = document.getElementById('randomSeed');

  const period = document.getElementById('period'); const periodVal = document.getElementById('periodVal');
  const thickness = document.getElementById('thickness'); const thickVal = document.getElementById('thickVal');
  const angle = document.getElementById('angle'); const angVal = document.getElementById('angVal');
  const overlayRange = document.getElementById('overlay'); const ovVal = document.getElementById('ovVal');
  const scale = document.getElementById('scale'); const scaleVal = document.getElementById('scaleVal');
  const fx = document.getElementById('fx'); const fxVal = document.getElementById('fxVal');
  const fy = document.getElementById('fy'); const fyVal = document.getElementById('fyVal');
  const colorOp = document.getElementById('colorOp'); const colVal = document.getElementById('colVal');
  const animAmt = document.getElementById('animAmt'); const animAmtVal = document.getElementById('animAmtVal');
  const animSpd = document.getElementById('animSpd'); const animSpdVal = document.getElementById('animSpdVal');

  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  let raf = null;
  let t = 0;
  function frame(){
    // Animate around user-set baselines to create visible motion without violating CSP
    const baseScale = parseFloat(scale.value);
    const baseFx = parseFloat(fx.value);
    const baseFy = parseFloat(fy.value);
    const baseAng = parseFloat(angle.value);
    const amp = Math.max(0, Math.min(1, (parseInt(animAmt?.value || '0', 10) || 0) / 100));
    const speed = Math.max(0, parseFloat(animSpd?.value || '1'));
    t += 0.02 * (0.2 + speed);
    const dScale = 10 * Math.sin(t);            // +/- 10 units warp
    const dAng   = 2.0 * Math.sin(t * 0.8);     // +/- 2 degrees
    const dFx    = 0.004 * Math.abs(Math.sin(t*0.6));
    const dFy    = 0.004 * Math.abs(Math.cos(t*0.55));

    const scaleNow = Math.max(0, baseScale + amp * dScale);
    const angNow   = baseAng + amp * dAng;
    const fxNow    = Math.max(0.0005, baseFx + amp * dFx);
    const fyNow    = Math.max(0.0005, baseFy + amp * dFy);

    disp.setAttribute('scale', scaleNow.toFixed(2));
    lines2.setAttribute('patternTransform', 'rotate('+angNow.toFixed(3)+')');
    noise.setAttribute('baseFrequency', fxNow.toFixed(4)+' '+fyNow.toFixed(4));
    if(parseFloat(colorOverlay.getAttribute('opacity')||'0') > 0){
      const g = art.querySelector('#hue');
      if(g){ g.setAttribute('gradientTransform', 'rotate('+((t*20)%360).toFixed(2)+')'); }
    }
    raf = requestAnimationFrame(frame);
  }
  function start(){ if(!raf){ raf = requestAnimationFrame(frame); } }
  function stop(){ if(raf){ cancelAnimationFrame(raf); raf = null; } }
  if(playBtn) playBtn.addEventListener('click', start);
  if(pauseBtn) pauseBtn.addEventListener('click', stop);

  function serializeSvg(svg){
    const clone = svg.cloneNode(true);
    if(!clone.getAttribute('xmlns')) clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
  }
  if(exportSvg){
    exportSvg.addEventListener('click', ()=>{
      const data = serializeSvg(art);
      const blob = new Blob([data], {type:'image/svg+xml'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'moire-flow.svg'; a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 1500);
    });
  }

  function applyStripes(){
    const p = parseFloat(period.value);
    const th = clamp(parseFloat(thickness.value), 0.5, p-0.5);
    periodVal.textContent = String(p);
    thickVal.textContent = String(th);
    ['lines','lines2'].forEach(id=>{
      const pat = art.querySelector('#'+id);
      if(pat){ pat.setAttribute('width', p); pat.setAttribute('height', p); }
    });
    [ink1, ink2].forEach(ink=>{ if(ink) ink.setAttribute('height', th); });
    [paper1, paper2].forEach(paper=>{ if(paper){ paper.setAttribute('width', p); paper.setAttribute('height', p); }});
  }
  function applyOverlay(){
    const o = parseInt(overlayRange.value,10)/100;
    ovVal.textContent = String(Math.round(o*100));
    overlay.setAttribute('opacity', o.toFixed(3));
    const ang = parseFloat(angle.value);
    angVal.textContent = String(ang);
    lines2.setAttribute('patternTransform', 'rotate('+ang+')');
  }
  function applyWarp(){
    const sc = parseFloat(scale.value);
    scaleVal.textContent = String(sc);
    disp.setAttribute('scale', sc.toFixed(2));
    const x = parseFloat(fx.value), y = parseFloat(fy.value);
    fxVal.textContent = x.toFixed(3); fyVal.textContent = y.toFixed(3);
    noise.setAttribute('baseFrequency', x.toFixed(3)+' '+y.toFixed(3));
  }
  function applyColor(){
    const o = parseInt(colorOp.value,10)/100;
    colVal.textContent = String(Math.round(o*100));
    colorOverlay.setAttribute('opacity', o.toFixed(3));
  }
  function applyAnim(){
    if (animAmt && animAmtVal) {
      const a = Math.max(0, Math.min(100, parseInt(animAmt.value,10) || 0));
      animAmtVal.textContent = String(a);
    }
    if (animSpd && animSpdVal) {
      const s = Math.max(0, parseFloat(animSpd.value) || 0);
      animSpdVal.textContent = s.toFixed(2);
    }
  }
  if(randomSeed){
    randomSeed.addEventListener('click', ()=>{
      const seed = Math.floor(Math.random()*10000);
      noise.setAttribute('seed', String(seed));
    });
  }
  period.addEventListener('input', applyStripes);
  thickness.addEventListener('input', applyStripes);
  angle.addEventListener('input', applyOverlay);
  overlayRange.addEventListener('input', applyOverlay);
  scale.addEventListener('input', applyWarp);
  fx.addEventListener('input', applyWarp);
  fy.addEventListener('input', applyWarp);
  colorOp.addEventListener('input', applyColor);
  if (animAmt) animAmt.addEventListener('input', applyAnim);
  if (animSpd) animSpd.addEventListener('input', applyAnim);

  applyStripes(); applyOverlay(); applyWarp(); applyColor(); applyAnim();

  if(!window.matchMedia || !matchMedia('(prefers-reduced-motion: reduce)').matches){
    start();
  }
})();


