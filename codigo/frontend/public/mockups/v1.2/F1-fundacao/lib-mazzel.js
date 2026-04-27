/* ============================================================
   MAZZEL ELEITORAL · LIB COMPARTILHADA V2
   ------------------------------------------------------------
   Carregar com <script src="../F1-fundacao/lib-mazzel.js"></script>
   ANTES de qualquer outro script da página.

   Provê:
     • Theme toggle Dark/Light persistido em localStorage
     • Renderer de Mapa Geográfico SVG (Brasil/UF/Município)
     • Helper de tooltip G1-style
     • Render de pequenos sparklines/badges reutilizáveis
   ============================================================ */
(function(){
  // -------- THEME --------
  const KEY = 'mz-theme';
  function applyTheme(t){
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(KEY, t); } catch(e){}
  }
  function currentTheme(){
    try { return localStorage.getItem(KEY) || 'dark'; } catch(e){ return 'dark'; }
  }
  // aplica antes do paint
  applyTheme(currentTheme());

  window.MZ = window.MZ || {};
  window.MZ.theme = {
    get: currentTheme,
    set: applyTheme,
    toggle: function(){ applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'); }
  };

  // -------- THEME TOGGLE BUTTON (auto-mount) --------
  // Qualquer elemento com [data-theme-toggle] vira botão.
  document.addEventListener('click', function(e){
    const el = e.target.closest('[data-theme-toggle]');
    if (!el) return;
    e.preventDefault();
    window.MZ.theme.toggle();
    document.dispatchEvent(new CustomEvent('mz-theme-changed', { detail: { theme: currentTheme() } }));
    refreshToggleEls();
  });
  function refreshToggleEls(){
    const t = currentTheme();
    document.querySelectorAll('[data-theme-toggle]').forEach(el => {
      el.setAttribute('aria-pressed', t === 'light');
      el.setAttribute('title', t === 'dark' ? 'Mudar para Light' : 'Mudar para Dark');
      const ic = el.querySelector('[data-theme-icon]');
      if (ic) ic.textContent = t === 'dark' ? '☾' : '☀';
      const lb = el.querySelector('[data-theme-label]');
      if (lb) lb.textContent = t === 'dark' ? 'Dark' : 'Light';
    });
  }
  document.addEventListener('DOMContentLoaded', refreshToggleEls);

  // -------- MAPA SVG GEOGRÁFICO --------
  // Brasil simplificado: 27 UFs como polígonos toscos mas reconhecíveis.
  // Coordenadas aproximadas em viewBox 0 0 1000 1000 (não é projeção
  // exata, é representação esquemática reconhecível — adequado para
  // protótipo hi-fi).
  const UF_PATHS = {
    // norte
    AM: 'M 80,260 L 250,210 L 360,250 L 380,360 L 290,420 L 150,400 L 100,360 Z',
    RR: 'M 250,80 L 380,90 L 380,200 L 270,210 L 240,150 Z',
    AP: 'M 440,140 L 530,150 L 540,240 L 460,250 Z',
    PA: 'M 380,200 L 540,200 L 590,330 L 540,420 L 380,420 L 380,300 Z',
    AC: 'M 80,420 L 200,400 L 220,490 L 90,500 Z',
    RO: 'M 220,420 L 320,420 L 340,510 L 230,520 Z',
    TO: 'M 460,330 L 560,340 L 570,470 L 480,480 Z',
    // nordeste
    MA: 'M 590,260 L 680,250 L 700,360 L 600,370 Z',
    PI: 'M 600,360 L 700,360 L 720,470 L 620,480 Z',
    CE: 'M 700,250 L 790,240 L 800,330 L 720,340 Z',
    RN: 'M 800,240 L 870,230 L 880,290 L 810,300 Z',
    PB: 'M 800,290 L 880,290 L 890,340 L 810,350 Z',
    PE: 'M 720,340 L 890,330 L 900,400 L 730,410 Z',
    AL: 'M 800,400 L 880,395 L 890,440 L 810,445 Z',
    SE: 'M 770,440 L 850,435 L 860,480 L 780,485 Z',
    BA: 'M 600,450 L 800,440 L 820,610 L 620,620 Z',
    // centro-oeste
    MT: 'M 230,440 L 470,420 L 480,560 L 240,570 Z',
    GO: 'M 470,460 L 580,450 L 590,580 L 480,590 Z',
    DF: 'M 540,500 L 575,500 L 575,525 L 540,525 Z',
    MS: 'M 290,560 L 470,560 L 480,700 L 300,710 Z',
    // sudeste
    MG: 'M 480,560 L 660,560 L 700,690 L 520,710 L 480,640 Z',
    ES: 'M 700,610 L 770,610 L 780,710 L 710,720 Z',
    RJ: 'M 600,690 L 720,690 L 730,750 L 610,760 Z',
    SP: 'M 460,680 L 620,680 L 640,790 L 470,800 Z',
    // sul
    PR: 'M 410,790 L 580,780 L 600,860 L 420,870 Z',
    SC: 'M 430,860 L 580,855 L 590,910 L 440,915 Z',
    RS: 'M 380,890 L 560,895 L 580,990 L 380,990 Z'
  };

  const UF_LABELS = {
    AM: [220,330], RR: [310,150], AP: [490,200], PA: [470,310],
    AC: [150,460], RO: [280,470], TO: [515,400], MA: [640,310],
    PI: [660,420], CE: [750,290], RN: [840,265], PB: [840,320],
    PE: [800,375], AL: [840,420], SE: [810,460], BA: [710,530],
    MT: [350,500], GO: [525,520], DF: [555,512], MS: [380,635],
    MG: [580,635], ES: [735,665], RJ: [660,720], SP: [540,740],
    PR: [495,830], SC: [505,890], RS: [475,945]
  };

  // Centroide aproximado pra desenhar etiquetas e markers
  function ufCentroid(uf){
    return UF_LABELS[uf] || [500,500];
  }

  // Escala de cores G1 — heat de 0 a 1 (gradiente vermelho→amarelo→verde)
  // ou 5-bin discreta usando --mz-score-*
  function colorForScore(v, opts){
    opts = opts || {};
    const palette = opts.palette || 'g1';
    if (v == null || isNaN(v)) return 'var(--mz-bg-elevated)';
    if (palette === '5bin'){
      if (v < 0.2) return 'var(--mz-score-1)';
      if (v < 0.4) return 'var(--mz-score-2)';
      if (v < 0.6) return 'var(--mz-score-3)';
      if (v < 0.8) return 'var(--mz-score-4)';
      return 'var(--mz-score-5)';
    }
    // G1 default — vermelho 0 → amarelo 0.5 → verde 1
    if (opts.invert) v = 1 - v;
    if (v < 0.5){
      const t = v / 0.5;
      const r = 220, g = Math.round(38 + (158-38)*t), b = Math.round(38 + (11-38)*t);
      return `rgb(${r},${g},${b})`;
    }
    const t = (v - 0.5) / 0.5;
    const r = Math.round(245 - (245-34)*t), g = Math.round(158 + (197-158)*t), b = Math.round(11 + (94-11)*t);
    return `rgb(${r},${g},${b})`;
  }

  // Renderiza o mapa do Brasil dentro de um <svg> alvo
  // dataByUf: { SP: 0.8, MG: 0.6, ... } valores 0-1
  // labels: optional { SP: 'R$ 12M' }
  function renderBrasil(svgEl, opts){
    opts = opts || {};
    const data = opts.data || {};
    const labels = opts.labels || {};
    const palette = opts.palette || 'g1';
    const showLabels = opts.showLabels !== false;
    const onHover = opts.onHover || (()=>{});
    const onClick = opts.onClick || (()=>{});

    svgEl.setAttribute('viewBox', '0 0 1000 1020');
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svgEl.innerHTML = '';

    // Camada de polígonos
    const gPoly = document.createElementNS('http://www.w3.org/2000/svg','g');
    Object.entries(UF_PATHS).forEach(([uf, d]) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', d);
      path.setAttribute('data-uf', uf);
      const v = data[uf];
      path.setAttribute('fill', colorForScore(v, { palette, invert: opts.invert }));
      path.setAttribute('stroke', 'var(--mz-bg-page)');
      path.setAttribute('stroke-width', '1.5');
      path.style.cursor = 'pointer';
      path.style.transition = 'filter 100ms';
      path.addEventListener('mouseenter', e => {
        path.style.filter = 'brightness(1.2) saturate(1.2)';
        path.setAttribute('stroke', 'var(--mz-tenant-accent)');
        path.setAttribute('stroke-width', '2.5');
        onHover(uf, e);
      });
      path.addEventListener('mouseleave', () => {
        path.style.filter = '';
        path.setAttribute('stroke', 'var(--mz-bg-page)');
        path.setAttribute('stroke-width', '1.5');
        onHover(null);
      });
      path.addEventListener('click', e => onClick(uf, e));
      gPoly.appendChild(path);
    });
    svgEl.appendChild(gPoly);

    // Etiquetas
    if (showLabels){
      const gText = document.createElementNS('http://www.w3.org/2000/svg','g');
      gText.setAttribute('pointer-events', 'none');
      Object.entries(UF_LABELS).forEach(([uf,[x,y]]) => {
        const t = document.createElementNS('http://www.w3.org/2000/svg','text');
        t.setAttribute('x', x);
        t.setAttribute('y', y);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('font-family', 'JetBrains Mono, monospace');
        t.setAttribute('font-size', opts.compact ? '14' : '13');
        t.setAttribute('font-weight', '700');
        t.setAttribute('fill', 'rgba(255,255,255,0.85)');
        t.setAttribute('stroke', 'rgba(0,0,0,0.4)');
        t.setAttribute('stroke-width', '0.4');
        t.setAttribute('paint-order', 'stroke');
        t.textContent = uf;
        gText.appendChild(t);

        const lb = labels[uf];
        if (lb && !opts.compact){
          const sub = document.createElementNS('http://www.w3.org/2000/svg','text');
          sub.setAttribute('x', x);
          sub.setAttribute('y', y + 14);
          sub.setAttribute('text-anchor', 'middle');
          sub.setAttribute('font-family', 'Inter, sans-serif');
          sub.setAttribute('font-size', '10');
          sub.setAttribute('font-weight', '600');
          sub.setAttribute('fill', '#fff');
          sub.setAttribute('stroke', 'rgba(0,0,0,0.55)');
          sub.setAttribute('stroke-width', '0.4');
          sub.setAttribute('paint-order', 'stroke');
          sub.textContent = lb;
          gText.appendChild(sub);
        }
      });
      svgEl.appendChild(gText);
    }

    return svgEl;
  }

  // -------- TOOLTIP G1-STYLE --------
  let tipEl = null;
  function ensureTip(){
    if (tipEl) return tipEl;
    tipEl = document.createElement('div');
    tipEl.className = 'mz-tip';
    tipEl.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;background:var(--mz-bg-card);border:1px solid var(--mz-rule-strong);border-radius:8px;padding:12px 14px;font:12px Inter,sans-serif;color:var(--mz-fg);box-shadow:var(--mz-shadow-pop);min-width:220px;max-width:340px;display:none;';
    document.body.appendChild(tipEl);
    return tipEl;
  }
  function showTip(html, x, y){
    const t = ensureTip();
    t.innerHTML = html;
    t.style.display = 'block';
    const rect = t.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + rect.width > window.innerWidth - 8) left = x - rect.width - 14;
    if (top + rect.height > window.innerHeight - 8) top = y - rect.height - 14;
    t.style.left = left + 'px';
    t.style.top = top + 'px';
  }
  function hideTip(){ if (tipEl) tipEl.style.display = 'none'; }

  window.MZ.map = { renderBrasil, ufCentroid, colorForScore, UF_PATHS, UF_LABELS };
  window.MZ.tip = { show: showTip, hide: hideTip };
})();
