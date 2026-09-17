
/* =========================================================
   lib/charts.js — dibujo de gráficas en canvas
   Solo recibe datos y dibuja. Sin lógica de negocio.
   ========================================================= */

/* ---------- Preparar canvas (retina + limpieza) ---------- */
function setupCanvas(canvas){
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  canvas.width  = w * dpr;
  canvas.height = h * dpr;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  return { ctx, w, h };
}

/* ---------- Color con transparencia ---------- */
/* "#22c55e" + 0.55 → "#22c55e8c" */
function withAlpha(hex, alpha){
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16).padStart(2, '0');
  return hex + a;
}

/* =========================================================
   GRÁFICA DE BARRAS
   Uso: drawBars(canvas, ['Ene','Feb'], [10,20], '#3b82f6')
   ========================================================= */
function drawBars(canvas, labels, values, color){
  if(!canvas) return;

  const { ctx, w, h } = setupCanvas(canvas);

  const padL = 30;
  const padR = 8;
  const padT = 10;
  const padB = 26;

  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const maxValue = Math.max(...values, 1) * 1.15;

  /* --- Grid + etiquetas Y --- */
  ctx.font = '10px -apple-system, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for(let i = 0; i <= 3; i++){
    const y = padT + chartH - (chartH * i / 3);

    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();

    ctx.fillStyle = '#8b96a8';
    ctx.fillText(fmtShort(maxValue * i / 3), padL - 6, y);
  }

  /* --- Dimensiones de las barras --- */
  const n = values.length;
  const gap = n > 1 ? Math.min(12, chartW / (n * 2.5)) : 0;
  const barW = Math.max(6, (chartW - gap * (n - 1)) / n);

  /* --- Dibujar barras con degradado --- */
  values.forEach((v, i) => {
    const barH = Math.max(2, (v / maxValue) * chartH);
    const x = padL + i * (barW + gap);
    const y = padT + chartH - barH;

    const grad = ctx.createLinearGradient(0, y, 0, y + barH);
    grad.addColorStop(0, color);
    grad.addColorStop(1, withAlpha(color, 0.33));

    ctx.fillStyle = grad;
    drawRoundedBar(ctx, x, y, barW, barH, Math.min(5, barW / 2));
  });

  /* --- Etiquetas X (máximo 7 visibles) --- */
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#8b96a8';
  ctx.font = '9px -apple-system, Roboto, sans-serif';

  const step = Math.ceil(n / 7);

  labels.forEach((label, i) => {
    if(i % step !== 0 && i !== n - 1) return;

    const x = padL + i * (barW + gap) + barW / 2;
    ctx.fillText(label, x, padT + chartH + 7);
  });
}

/* ---------- Barra con esquinas redondeadas arriba ---------- */
function drawRoundedBar(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
}

/* =========================================================
   GRÁFICA DE PUNTO DE EQUILIBRIO
   Uso: drawBreakEven(canvas, ['Ene','Feb'], [100,250], 300)
   - acumulado: ingreso acumulado por periodo
   - inversion: línea punteada roja a esa altura
   ========================================================= */
function drawBreakEven(canvas, labels, acumulado, inversion){
  if(!canvas) return;

  const { ctx, w, h } = setupCanvas(canvas);

  const padL = 32;
  const padR = 10;
  const padT = 12;
  const padB = 26;

  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const maxValue = Math.max(...acumulado, inversion, 1) * 1.15;
  const n = acumulado.length;

  /* Coordenadas */
  const X = i => padL + (n === 1 ? chartW / 2 : (chartW * i / (n - 1)));
  const Y = v => padT + chartH - (v / maxValue) * chartH;

  /* --- Grid + etiquetas Y --- */
  ctx.font = '10px -apple-system, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for(let i = 0; i <= 3; i++){
    const y = padT + chartH - (chartH * i / 3);

    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();

    ctx.fillStyle = '#8b96a8';
    ctx.fillText(fmtShort(maxValue * i / 3), padL - 6, y);
  }

  /* --- Línea punteada de inversión --- */
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padL, Y(inversion));
  ctx.lineTo(w - padR, Y(inversion));
  ctx.stroke();
  ctx.setLineDash([]);

  /* --- Área verde bajo la curva --- */
  ctx.beginPath();
  ctx.moveTo(X(0), padT + chartH);
  acumulado.forEach((v, i) => ctx.lineTo(X(i), Y(v)));
  ctx.lineTo(X(n - 1), padT + chartH);
  ctx.closePath();

  const areaGrad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
  areaGrad.addColorStop(0, 'rgba(34,197,94,.30)');
  areaGrad.addColorStop(1, 'rgba(34,197,94,0)');
  ctx.fillStyle = areaGrad;
  ctx.fill();

  /* --- Línea verde --- */
  ctx.beginPath();
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  acumulado.forEach((v, i) => {
    if(i === 0) ctx.moveTo(X(i), Y(v));
    else        ctx.lineTo(X(i), Y(v));
  });
  ctx.stroke();

  /* --- Detectar punto de equilibrio --- */
  const cruceIndex = acumulado.findIndex(v => v >= inversion);

  if(cruceIndex >= 0){
    drawBreakEvenMarker(ctx, X(cruceIndex), Y(acumulado[cruceIndex]), w);
  }

  /* --- Puntos pequeños en cada valor --- */
  acumulado.forEach((v, i) => {
    ctx.beginPath();
    ctx.arc(X(i), Y(v), 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
  });

  /* --- Etiquetas X (máximo 6 visibles) --- */
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#8b96a8';
  ctx.font = '9px -apple-system, Roboto, sans-serif';

  const step = Math.ceil(n / 6);

  labels.forEach((label, i) => {
    if(i % step !== 0 && i !== n - 1) return;
    ctx.fillText(label, X(i), padT + chartH + 7);
  });
}

/* ---------- Marcador ⚡ del punto de equilibrio ---------- */
function drawBreakEvenMarker(ctx, x, y, chartWidth){
  /* Círculo con borde */
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#22c55e';
  ctx.fill();

  ctx.strokeStyle = '#0f1115';
  ctx.lineWidth = 2;
  ctx.stroke();

  /* Texto (alineado según posición) */
  const nearRight = x > chartWidth / 2;

  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 10px -apple-system, Roboto, sans-serif';
  ctx.textAlign = nearRight ? 'right' : 'left';
  ctx.textBaseline = 'bottom';

  const offsetX = nearRight ? -8 : 8;
  ctx.fillText('⚡ Punto de equilibrio', x + offsetX, y - 8);
}
