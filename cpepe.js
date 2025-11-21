(() => {
  const canvas = document.getElementById("mindprint");
  let ctx = canvas.getContext("2d");
  const unit = 96;

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  const traitFunctions = [
    drawDiagonalStripes,
    drawNoiseFill,
    drawDotGrid,
    drawRadialBurst,
    drawConcentricCircles,
    drawWaves,
  ];

  function drawShapeAndTrait(clipFn, x, y, w, h) {
    ctx.save();
    clipFn();
    ctx.clip();
    const trait = traitFunctions[Math.floor(Math.random() * traitFunctions.length)];
    trait(x, y, w, h);
    ctx.restore();
  }

  function drawQuarterArc(cx, cy, r, startAngle, endAngle) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();
  }

  function drawBaseOpepen() {
    // LEFT EYE (2x2 area at 2,1): 3 arcs + 1 square
    drawShapeAndTrait(() => ctx.fillRect(unit * 2, unit * 1, unit, unit), unit * 2, unit * 1, unit * 2, unit * 2);
    drawShapeAndTrait(() => drawQuarterArc(unit * 3, unit * 2, unit, -Math.PI / 2, 0), unit * 2, unit * 1, unit * 2, unit * 2);
    drawShapeAndTrait(() => drawQuarterArc(unit * 3, unit * 2, unit, 0, Math.PI / 2), unit * 2, unit * 1, unit * 2, unit * 2);
    drawShapeAndTrait(() => drawQuarterArc(unit * 3, unit * 2, unit, Math.PI / 2, Math.PI), unit * 2, unit * 1, unit * 2, unit * 2);

    // RIGHT EYE (circle) at (4,1)
    drawShapeAndTrait(() => {
      ctx.beginPath();
      ctx.arc(unit * 5, unit * 2, unit, 0, Math.PI * 2);
      ctx.closePath();
    }, unit * 4, unit * 1, unit * 2, unit * 2);

    // MOUTH (2x4 grid at 2,3), bottom-rounded
    drawShapeAndTrait(() => {
      ctx.beginPath();
      ctx.moveTo(unit * 2, unit * 3);
      ctx.lineTo(unit * 6, unit * 3);
      ctx.lineTo(unit * 6, unit * 5 - 24);
      ctx.quadraticCurveTo(unit * 6, unit * 5, unit * 6 - 24, unit * 5);
      ctx.lineTo(unit * 2 + 24, unit * 5);
      ctx.quadraticCurveTo(unit * 2, unit * 5, unit * 2, unit * 5 - 24);
      ctx.lineTo(unit * 2, unit * 3);
      ctx.closePath();
    }, unit * 2, unit * 3, unit * 4, unit * 2);

    // LOWER BAR (1x4 at 2,6), top-rounded
    drawShapeAndTrait(() => {
      ctx.beginPath();
      ctx.moveTo(unit * 2, unit * 7);
      ctx.lineTo(unit * 6, unit * 7);
      ctx.lineTo(unit * 6, unit * 6 + 24);
      ctx.quadraticCurveTo(unit * 6, unit * 6, unit * 6 - 24, unit * 6);
      ctx.lineTo(unit * 2 + 24, unit * 6);
      ctx.quadraticCurveTo(unit * 2, unit * 6, unit * 2, unit * 6 + 24);
      ctx.lineTo(unit * 2, unit * 7);
      ctx.closePath();
    }, unit * 2, unit * 6, unit * 4, unit);
  }

  function drawDiagonalStripes(x, y, w, h, color = "white") {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = -w; i < w + h; i += 10) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + h, y + h);
      ctx.stroke();
    }
  }

  function drawNoiseFill(x, y, w, h) {
    const imageData = ctx.createImageData(w, h);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const val = Math.random() * 255;
      imageData.data[i] = val;
      imageData.data[i + 1] = val;
      imageData.data[i + 2] = val;
      imageData.data[i + 3] = 100;
    }
    ctx.putImageData(imageData, x, y);
  }

  function drawDotGrid(x, y, w, h, spacing = 12) {
    ctx.fillStyle = "white";
    for (let i = x + spacing / 2; i < x + w; i += spacing) {
      for (let j = y + spacing / 2; j < y + h; j += spacing) {
        ctx.beginPath();
        ctx.arc(i, j, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawRadialBurst(x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 100; i++) {
      const angle = (Math.PI * 2 * i) / 100;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * w, cy + Math.sin(angle) * h);
      ctx.stroke();
    }
  }

  function drawConcentricCircles(x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    for (let r = 10; r < Math.min(w, h) / 1.2; r += 10) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawWaves(x, y, w, h) {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.2;
    for (let j = y; j < y + h; j += 8) {
      ctx.beginPath();
      for (let i = x; i < x + w; i++) {
        const wave = Math.sin(i * 0.05 + j * 0.1) * 6;
        ctx.lineTo(i, j + wave);
      }
      ctx.stroke();
    }
  }

  function generateArt() {
    clearCanvas();
    drawBaseOpepen();
  }

  function downloadPNG() {
    const link = document.createElement('a');
    link.download = 'mindprint.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function downloadHighResPNG() {
    const scale = 2500 / 768;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 2500;
    tempCanvas.height = 2500;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.scale(scale, scale);
    // Redraw the artwork at base resolution into the scaled tempCtx
    drawBaseOpepenOnContext(tempCtx);
    const link = document.createElement('a');
    link.download = 'mindprint-highres.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }

  function drawBaseOpepenOnContext(customCtx) {
    const prevCtx = ctx;
    try {
      ctx = customCtx;
      // Clear using base logical size (pre-scale space)
      ctx.clearRect(0, 0, 768, 768);
      drawBaseOpepen();
    } finally {
      ctx = prevCtx;
    }
  }

  function downloadSVG() {
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
        <rect x="192" y="96" width="192" height="192" fill="#FFD700" />
        <rect x="384" y="96" width="192" height="192" fill="none" stroke="white" stroke-width="2" stroke-dasharray="10 5" />
        <rect x="192" y="288" width="384" height="192" fill="gray" fill-opacity="0.2" />
        <rect x="192" y="576" width="384" height="96" fill="none" stroke="white" stroke-width="1" />
      </svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.download = 'mindprint.svg';
    link.href = URL.createObjectURL(blob);
    link.click();
  }

  // Wire up buttons
  document.getElementById('btnRegenerate')?.addEventListener('click', generateArt);
  document.getElementById('btnPng')?.addEventListener('click', downloadPNG);
  document.getElementById('btnHiPng')?.addEventListener('click', downloadHighResPNG);
  document.getElementById('btnSvg')?.addEventListener('click', downloadSVG);

  // Initial render
  generateArt();
})();

