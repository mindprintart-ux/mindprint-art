(() => {
  // 2D Simplex Noise (small, CSP-friendly)
  // Adapted from Stefan Gustavson's Simplex noise (public domain), compacted.
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  const grad3 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  const p = new Uint8Array(256);
  for (let i=0;i<256;i++) p[i]=i;
  // seedable shuffle (fixed for now; can expose a seed slider)
  let seed = 1337; function rnd(){ seed ^= seed<<13; seed^=seed>>>17; seed^=seed<<5; return (seed>>>0)/4294967296; }
  for (let i=255;i>0;i--){ const j=(rnd()* (i+1))|0; const t=p[i]; p[i]=p[j]; p[j]=t; }
  const perm = new Uint8Array(512), permMod12 = new Uint8Array(512);
  // grad3 has 8 entries; index modulo must match its length to avoid undefined
  for (let i=0;i<512;i++){ perm[i]=p[i&255]; permMod12[i]=perm[i]%8; }
  function snoise2(xin, yin){
    const s=(xin+yin)*F2; const i=Math.floor(xin+s), j=Math.floor(yin+s);
    const t=(i+j)*G2; const X0=i-t, Y0=j-t; const x0=xin-X0, y0=yin-Y0;
    let i1, j1; if (x0>y0){i1=1; j1=0;} else {i1=0; j1=1;}
    const x1=x0 - i1 + G2, y1=y0 - j1 + G2, x2=x0 - 1 + 2*G2, y2=y0 - 1 + 2*G2;
    const ii=i&255, jj=j&255;
    const gi0=permMod12[ii+perm[jj]], gi1=permMod12[ii+i1+perm[jj+j1]], gi2=permMod12[ii+1+perm[jj+1]];
    let t0=0.5 - x0*x0 - y0*y0, n0=0; if(t0>0){ t0*=t0; const g=grad3[gi0]; n0=t0*t0*(g[0]*x0+g[1]*y0); }
    let t1=0.5 - x1*x1 - y1*y1, n1=0; if(t1>0){ t1*=t1; const g=grad3[gi1]; n1=t1*t1*(g[0]*x1+y1*g[1]); }
    let t2=0.5 - x2*x2 - y2*y2, n2=0; if(t2>0){ t2*=t2; const g=grad3[gi2]; n2=t2*t2*(g[0]*x2+y2*g[1]); }
    return 70*(n0+n1+n2);
  }
  function fbm2(x,y,oct=4){ let f=0,am=0.5, sum=0, freq=1, amp=1; for(let i=0;i<oct;i++){ sum+=amp*Math.abs(snoise2(x*freq,y*freq)); freq*=2; amp*=0.5; } return sum; }

  const c = document.getElementById('flow');
  const ctx = c.getContext('2d', { alpha:false });
  const W = c.width, H = c.height;

  // Controls
  const pCountEl = document.getElementById('pCount'), pCountVal = document.getElementById('pCountVal');
  const scaleEl = document.getElementById('scale'), scaleVal = document.getElementById('scaleVal');
  const strengthEl = document.getElementById('strength'), strengthVal = document.getElementById('strengthVal');
  const fadeEl = document.getElementById('fade'), fadeVal = document.getElementById('fadeVal');
  const speedEl = document.getElementById('speed'), speedVal = document.getElementById('speedVal');
  const hueEl = document.getElementById('hue'), hueVal = document.getElementById('hueVal');
  const playBtn = document.getElementById('play'), pauseBtn = document.getElementById('pause');
  const resetBtn = document.getElementById('reset'), saveBtn = document.getElementById('save');
  const rec10Btn = document.getElementById('rec10'), rec15Btn = document.getElementById('rec15');
  const camToggleBtn = document.getElementById('camToggle'), camVideo = document.getElementById('camVideo');
  const micToggleBtn = document.getElementById('micToggle');
  const modeSel = document.getElementById('renderMode');
  const flowSel = document.getElementById('flowType');
  let renderMode = (modeSel && modeSel.value) || 'particles';
  let flowType = (flowSel && flowSel.value) || 'fbm';

  function syncLabels(){
    pCountVal.textContent = String(pCountEl.value);
    scaleVal.textContent = Number(scaleEl.value).toFixed(4);
    strengthVal.textContent = Number(strengthEl.value).toFixed(2);
    fadeVal.textContent = Number(fadeEl.value).toFixed(3);
    speedVal.textContent = Number(speedEl.value).toFixed(2);
    hueVal.textContent = String(hueEl.value);
  }
  syncLabels();
  ['pCount','scale','strength','fade','speed','hue'].forEach(id=>{
    const el = document.getElementById(id);
    const lab = document.getElementById(id + (id==='speed'?'Val':'Val'));
    el.addEventListener('input', ()=> {
      if(lab){
        const v = id==='scale' ? Number(el.value).toFixed(4)
                 : id==='strength' ? Number(el.value).toFixed(2)
                 : id==='fade' ? Number(el.value).toFixed(3)
                 : id==='speed' ? Number(el.value).toFixed(2)
                 : el.value;
        lab.textContent = String(v);
      }
    });
  });
  if (modeSel){
    modeSel.addEventListener('change', ()=>{
      renderMode = modeSel.value;
      clearToBlack();
    });
  }
  if (flowSel){
    flowSel.addEventListener('change', ()=>{
      flowType = flowSel.value;
      clearToBlack();
    });
  }

  // Particle system with flow field driven by FBM noise
  const MAX_PARTS = 5000;
  let particles = [];
  function initParticles(n){
    particles = [];
    for(let i=0;i<n;i++){
      particles.push({
        x: Math.random()*W,
        y: Math.random()*H,
        vx: 0, vy: 0,
        hue: (Number(hueEl.value) + Math.random()*60 - 30 + 360) % 360,
        life: Math.random()*300 + 100
      });
    }
  }
  initParticles(parseInt(pCountEl.value,10));

  // Draw background once
  function clearToBlack(){
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(0,0,W,H);
  }
  clearToBlack();

  let raf = null, t = 0;
  let frameCount = 0;
  function fieldAngle(nx, ny, tNow){
    if (flowType === 'curl'){
      // finite-difference of fbm scalar field; curl of grad is 0, but we use perpendicular to gradient for a divergence-free-like field
      const e = 0.0015;
      const fxy = fbm2(nx, ny, 4);
      const fx1 = fbm2(nx+e, ny, 4), fx0 = fbm2(nx-e, ny, 4);
      const fy1 = fbm2(nx, ny+e, 4), fy0 = fbm2(nx, ny-e, 4);
      const dx = (fx1 - fx0) / (2*e);
      const dy = (fy1 - fy0) / (2*e);
      // perpendicular to gradient gives "curl-like" direction; atan2 of (dx, -dy)
      return Math.atan2(dx, -dy);
    } else if (flowType === 'warp'){
      const wf = 0.8, wa = 0.9;
      const wx = snoise2(nx*wf + tNow*0.15, ny*wf - tNow*0.12) * wa;
      const wy = snoise2(nx*wf - tNow*0.11, ny*wf + tNow*0.13) * wa;
      return Math.PI*2*fbm2(nx + wx, ny + wy, 4);
    }
    // default FBM flow
    return Math.PI*2*fbm2(nx, ny, 4);
  }
  // offscreen for heightmap
  const hcan = document.createElement('canvas'); hcan.width = 225; hcan.height = 225;
  const hctx = hcan.getContext('2d', { willReadFrequently: true });
  function step(){
    // camera motion analysis at ~30Hz
    if (camOn && camVideo && camVideo.readyState >= 2 && (frameCount++ % 2 === 0)){
      analyzeMotion();
    }
    // ease domain offsets toward camera targets for smoother control
    if (typeof targetOffX === 'number' && typeof offX === 'number'){
      offX += (targetOffX - offX) * 0.1;
    }
    if (typeof targetOffY === 'number' && typeof offY === 'number'){
      offY += (targetOffY - offY) * 0.1;
    }
    // audio bands
    const audio = readAudioBands ? readAudioBands() : { low:0, mid:0, high:0, rms:0 };
    const baseStrength = parseFloat(strengthEl.value);
    const strengthFactor = 1 + 0.6*motionMag + 0.8*(audio.low||0);
    const k = Math.max(0.05, Math.min(4, baseStrength * strengthFactor));
    const baseSpeed = parseFloat(speedEl.value);
    const speedFactor = 1 + 1.2*(audio.mid||0);
    t += 0.005 * (0.2 + baseSpeed * speedFactor);
    // fade trails (for particle-like modes)
    const fade = Math.max(0, Math.min(0.5, parseFloat(fadeEl.value)));
    if (fade > 0 && (renderMode === 'particles' || renderMode === 'ribbons')) {
      ctx.fillStyle = `rgba(0,0,0,${fade})`;
      ctx.fillRect(0,0,W,H);
    }
    const sc = parseFloat(scaleEl.value);
    if (renderMode === 'arrows'){
      // solid refresh
      ctx.fillStyle = 'black'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      const stepG = 30;
      for (let y=15; y<H; y+=stepG){
        for (let x=15; x<W; x+=stepG){
          const nx = x*sc + 1000.0 + offX, ny = y*sc + 1000.0 + offY;
          const a = fieldAngle(nx + t*0.2, ny - t*0.2, t);
          // animate dot slightly along direction
          const amp = 6 * (0.6 + 0.4*Math.sin(t*2 + (x+y)*0.01));
          const x2 = x + Math.cos(a)*amp, y2 = y + Math.sin(a)*amp;
          ctx.beginPath(); ctx.arc(x2, y2, 2.2, 0, Math.PI*2); ctx.fill();
        }
      }
    } else if (renderMode === 'heightmap'){
      // draw low-res noise then upscale
      const w = hcan.width, h = hcan.height;
      const img = hctx.createImageData(w, h);
      const hueBase = Number(hueEl.value);
      for (let j=0;j<h;j++){
        for (let i=0;i<w;i++){
          const nx = ((i+0.5)/w)*W*sc + offX + 1000.0;
          const ny = ((j+0.5)/h)*H*sc + offY + 1000.0;
          const v = fbm2(nx + t*0.15, ny - t*0.15, 5); // 0..1-ish
          const c = Math.max(0, Math.min(1, v));
          // simple palette: hue bands
          const hdeg = (hueBase + c*120) % 360;
          // convert HSL to RGB quickly (approx)
          const l = 0.5*c + 0.2, s = 0.6;
          function h2rgb(p,q,t){ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3 - t)*6; return p; }
          const hh = hdeg/360, q = l < .5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
          const r = Math.round(h2rgb(p,q,hh+1/3)*255);
          const g = Math.round(h2rgb(p,q,hh)*255);
          const b = Math.round(h2rgb(p,q,hh-1/3)*255);
          const idx = (j*w + i)*4;
          img.data[idx]=r; img.data[idx+1]=g; img.data[idx+2]=b; img.data[idx+3]=255;
        }
      }
      hctx.putImageData(img, 0, 0);
      const prev = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(hcan, 0, 0, W, H);
      ctx.imageSmoothingEnabled = prev;
    } else {
      // particles or ribbons
      ctx.globalCompositeOperation = 'lighter';
      const substeps = (renderMode === 'ribbons') ? 3 : 1;
      for (let i=0;i<particles.length;i++){
        const p = particles[i];
        for (let s=0;s<substeps;s++){
          const nx = p.x*sc + 1000.0 + offX;
          const ny = p.y*sc + 1000.0 + offY;
          const a = fieldAngle(nx + t*0.2, ny - t*0.2, t);
          const ax = Math.cos(a)*k, ay = Math.sin(a)*k;
          p.vx = (p.vx + ax)*0.95;
          p.vy = (p.vy + ay)*0.95;
          const x0 = p.x, y0 = p.y;
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0) p.x += W; else if (p.x >= W) p.x -= W;
          if (p.y < 0) p.y += H; else if (p.y >= H) p.y -= H;
          const hueShift = ((audio && audio.high) ? (audio.high*90) : 0) | 0;
          const hueNow = (p.hue + hueShift) % 360;
          ctx.strokeStyle = `hsla(${hueNow},70%,60%,0.25)`;
          if (renderMode === 'ribbons') ctx.lineWidth = 1.6; else ctx.lineWidth = 1.0;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(p.x, p.y); ctx.stroke();
        }
        if (--p.life <= 0){
          p.x = Math.random()*W; p.y = Math.random()*H;
          p.vx = p.vy = 0;
          p.hue = (Number(hueEl.value) + Math.random()*60 - 30 + 360) % 360;
          p.life = Math.random()*300 + 100;
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    raf = requestAnimationFrame(step);
  }

  function start(){ if(!raf){ raf = requestAnimationFrame(step); } }
  function stop(){ if(raf){ cancelAnimationFrame(raf); raf = null; } }

  // Camera motion control (on-device, no libs)
  let camOn = false, camStream = null;
  const vcan = document.createElement('canvas');
  vcan.width = 160; vcan.height = 120;
  const vctx = vcan.getContext('2d', { willReadFrequently: true });
  let prevFrame = null;
  let motionCx = vcan.width/2, motionCy = vcan.height/2;
  let motionMag = 0;
  let offX = 1000.0, offY = 1000.0; // domain offsets applied to noise sampling
  const baseOffX = 1000.0, baseOffY = 1000.0;
  let targetOffX = baseOffX, targetOffY = baseOffY;
  const domainRange = 180;
  async function enableCamera(){
    if (camOn) return;
    try{
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      camVideo.srcObject = camStream;
      await camVideo.play();
      camOn = true;
      if (camToggleBtn) camToggleBtn.textContent = '📷 Camera Control: ON';
    }catch(e){
      console.warn('Camera error', e);
      camOn = false;
      if (camToggleBtn) camToggleBtn.textContent = '📷 Use Camera Control';
    }
  }
  function disableCamera(){
    if (!camOn) return;
    try{
      camStream?.getTracks()?.forEach(t=>t.stop());
    }catch(_){}
    camVideo.srcObject = null;
    camOn = false;
    prevFrame = null;
    if (camToggleBtn) camToggleBtn.textContent = '📷 Use Camera Control';
  }
  if (camToggleBtn){
    camToggleBtn.addEventListener('click', ()=>{
      if (camOn) disableCamera(); else enableCamera();
    });
  }
  function analyzeMotion(){
    // draw current frame small, mirrored for intuitive left/right
    vctx.save();
    vctx.scale(-1, 1);
    vctx.drawImage(camVideo, -vcan.width, 0, vcan.width, vcan.height);
    vctx.restore();
    const img = vctx.getImageData(0,0,vcan.width,vcan.height);
    const data = img.data;
    if (!prevFrame){ prevFrame = new Uint8ClampedArray(data); motionMag = 0; return; }
    let cx = 0, cy = 0, wsum = 0;
    for (let y=0;y<vcan.height;y+=2){
      for (let x=0;x<vcan.width;x+=2){
        const i = (y*vcan.width + x)*4;
        const r = data[i], g = data[i+1], b = data[i+2];
        const pr = prevFrame[i], pg = prevFrame[i+1], pb = prevFrame[i+2];
        const l = 0.2126*r + 0.7152*g + 0.0722*b;
        const pl = 0.2126*pr + 0.7152*pg + 0.0722*pb;
        const d = Math.abs(l - pl);
        if (d > 18){ // motion threshold
          const w = Math.min(1, d/64);
          cx += x*w; cy += y*w; wsum += w;
        }
      }
    }
    if (wsum > 0){
      const ncx = cx/wsum, ncy = cy/wsum;
      motionCx = ncx; motionCy = ncy;
      const dxn = (ncx - vcan.width/2) / (vcan.width/2);
      const dyn = (ncy - vcan.height/2) / (vcan.height/2);
      motionMag = Math.max(0, Math.min(1, Math.hypot(dxn, dyn)));
      targetOffX = baseOffX + dxn * domainRange;
      targetOffY = baseOffY + dyn * domainRange;
    }else{
      // decay motion magnitude
      motionMag *= 0.92;
    }
    prevFrame.set(data);
  }

  document.getElementById('play').addEventListener('click', start);
  document.getElementById('pause').addEventListener('click', stop);
  document.getElementById('reset').addEventListener('click', ()=>{
    stop(); clearToBlack(); initParticles(parseInt(pCountEl.value,10)); start();
  });
  document.getElementById('save').addEventListener('click', ()=>{
    const link = document.createElement('a'); link.download='perlin-flow.png';
    link.href = c.toDataURL('image/png'); link.click();
  });
  function record(seconds){
    // Use MediaRecorder on canvas stream; WebM (Chrome/Edge). Safari support may vary.
    const fps = 60;
    const stream = c.captureStream(fps);
    let options = { mimeType: 'video/webm;codecs=vp9' };
    let recorder;
    try { recorder = new MediaRecorder(stream, options); }
    catch(e){ try { options = { mimeType:'video/webm;codecs=vp8' }; recorder = new MediaRecorder(stream, options); }
      catch(_){ options = { mimeType:'video/webm' }; recorder = new MediaRecorder(stream, options); } }
    const chunks=[];
    recorder.ondataavailable = e => { if (e.data && e.data.size>0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: options.mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `perlin-flow-${seconds}s.webm`;
      a.click();
      setTimeout(()=>URL.revoke_gap && URL.revoke_gap(url), 2000);
    };
    // ensure animation is running during record
    start();
    recorder.start();
    setTimeout(()=>{ recorder.stop(); }, Math.max(0, seconds*1000));
  }
  if (rec10Btn) rec10Btn.addEventListener('click', ()=> record(10));
  if (rec15Btn) rec15Btn.addEventListener('click', ()=> record(15));
  pCountEl.addEventListener('change', ()=>{
    const n = Math.max(100, Math.min(MAX_PARTS, parseInt(pCountEl.value,10)||800));
    pCountEl.value = String(n); pCountVal.textContent = String(n);
    initParticles(n);
  });

  // Mic audio control
  let micOn = false, audioCtx = null, analyser = null, freqData = null, micSrc = null;
  async function enableMic(){
    if (micOn) return;
    try{
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;
      freqData = new Uint8Array(analyser.frequencyBinCount);
      micSrc = audioCtx.createMediaStreamSource(stream);
      micSrc.connect(analyser);
      micOn = true;
      if (micToggleBtn) micToggleBtn.textContent = '🎤 Mic Control: ON';
    }catch(e){
      console.warn('Mic error', e);
      micOn = false;
      if (micToggleBtn) micToggleBtn.textContent = '🎤 Use Mic Control';
    }
  }
  function disableMic(){
    if (!micOn) return;
    try{ micSrc?.mediaStream?.getTracks()?.forEach(t=>t.stop()); }catch(_){}
    try{ micSrc?.disconnect(); }catch(_){}
    try{ analyser?.disconnect(); }catch(_){}
    try{ audioCtx && audioCtx.state !== 'closed' && audioCtx.close(); }catch(_){}
    micOn = false; audioCtx = null; analyser = null; freqData = null; micSrc = null;
    if (micToggleBtn) micToggleBtn.textContent = '🎤 Use Mic Control';
  }
  if (micToggleBtn){
    micToggleBtn.addEventListener('click', ()=>{
      if (micOn) disableMic(); else enableMic();
    });
  }

  function readAudioBands(){
    if (!micOn || !analyser || !freqData) return { low:0, mid:0, high:0, rms:0 };
    analyser.getByteFrequencyData(freqData);
    const sr = audioCtx.sampleRate;
    const n = freqData.length;
    function bandAvg(f0, f1){
      const i0 = Math.max(0, Math.floor(f0 / (sr/2) * n));
      const i1 = Math.min(n-1, Math.ceil(f1 / (sr/2) * n));
      let sum=0, cnt=0;
      for(let i=i0;i<=i1;i++){ sum += freqData[i]; cnt++; }
      return cnt ? (sum/cnt)/255 : 0;
    }
    const low = bandAvg(20, 250);
    const mid = bandAvg(250, 2000);
    const high = bandAvg(2000, 8000);
    let sum=0; for (let i=0;i<n;i++) sum += freqData[i];
    const rms = (sum/n)/255;
    return { low, mid, high, rms };
  }

  // camera/mic integration handled inside step()

  if(!window.matchMedia || !matchMedia('(prefers-reduced-motion: reduce)').matches){
    start();
  }
})();


