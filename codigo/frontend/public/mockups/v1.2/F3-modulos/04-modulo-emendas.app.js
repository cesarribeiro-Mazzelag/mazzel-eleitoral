/* ============================================================
   MÓDULO EMENDAS · APP CONTROLLER
   ------------------------------------------------------------
   - Tabs (5 views)
   - View 1: Mapa de Emendas (SP municípios)
   - View 2: Dossiê da Emenda (SBO · 9 seções)
   - View 3: Fluxo Sankey
   - View 4: Painel de Inconsistências
   - View 5: Sistema de Alertas
   ============================================================ */
(function(){
  const D = window.EMENDAS_DATA;

  /* ============ utils ============ */
  const fmtBR = v => 'R$ ' + (v >= 1e6 ? (v/1e6).toFixed(1).replace('.', ',') + 'M' : (v/1e3).toFixed(0) + 'K');
  const fmtFull = v => 'R$ ' + v.toLocaleString('pt-BR');
  const fmtN = v => v.toLocaleString('pt-BR');
  const munById = id => D.MUNICIPIOS.find(m => m.id === id);
  const parlById = id => D.PARLAMENTARES[id];
  const emendaById = id => D.EMENDAS.find(e => e.id === id);

  // cor por status
  function statusColor(status){
    if (status === 'crit') return '#dc2626';
    if (status === 'high') return '#f59e0b';
    if (status === 'low')  return '#bbf7d0';
    return '#16a34a';
  }
  // raio do bubble proporcional ao valor (clamp)
  function radius(total){
    const min = 8, max = 38;
    const t = Math.min(1, total / 95_000_000);
    return min + (max-min) * Math.sqrt(t);
  }

  /* ============ TABS ============ */
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const target = t.dataset.tab;
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.querySelector(`.view[data-view="${target}"]`).classList.add('active');
      // Renders sob demanda
      if (target === 'flux' && !document.querySelector('#sankey-svg').children.length) renderSankey();
    });
  });

  // seg-control do Sankey: alterna 3ª coluna
  document.querySelectorAll('#flux-seg button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#flux-seg button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      renderSankey(b.dataset.mode);
    });
  });

  /* ============================================================
     VIEW 1 · MAPA DE EMENDAS
     ============================================================ */
  function renderMapLeft(){
    const root = document.getElementById('map-left');
    root.innerHTML = `
      <div class="map-section">
        <h3>Período</h3>
        <div class="map-row active"><span class="lbl">Janela</span><b>2024-2026</b></div>
        <div class="map-row"><span class="lbl">Comparar com</span><b>2022-2024</b></div>
      </div>
      <div class="map-section">
        <h3>Camadas ativas</h3>
        <div class="map-row active"><span class="lbl">Heat</span><b>Volume R$</b></div>
        <div class="map-row active"><span class="lbl">Bubbles</span><b>Score risco</b></div>
        <div class="map-row"><span class="lbl">Camada</span><b>Cabos eleitorais</b></div>
        <div class="map-row"><span class="lbl">Camada</span><b>Lideranças UB</b></div>
      </div>
      <div class="map-section">
        <h3>Filtros</h3>
        <div class="map-row"><span class="lbl">Autor</span><b>Todos</b></div>
        <div class="map-row"><span class="lbl">Categoria</span><b>Todas</b></div>
        <div class="map-row"><span class="lbl">Status</span><b>Em execução + Pagas</b></div>
        <div class="map-row"><span class="lbl">RP</span><b>RP-6 + RP-9</b></div>
      </div>
      <div class="map-section">
        <h3>Resumo SP · 12 meses</h3>
        <div class="legend-row"><span class="sw" style="background:var(--mz-bg-elevated); border:1px solid var(--mz-rule);"></span> <b>R$ 547M</b> total recebido</div>
        <div class="legend-row"><span class="sw" style="background:var(--mz-danger);"></span> <b>5 emendas</b> com inconsistência</div>
        <div class="legend-row"><span class="sw" style="background:var(--mz-warn);"></span> <b>3 emendas</b> em atenção</div>
        <div class="legend-row"><span class="sw" style="background:var(--mz-ok);"></span> <b>+R$ 12M</b> vs 2023 (+2.3%)</div>
      </div>
    `;
  }

  function renderMapCanvas(){
    const svg = document.getElementById('sp-map');
    const NS = 'http://www.w3.org/2000/svg';

    // fundo: silhueta do estado SP esquemática
    const bg = document.createElementNS(NS, 'path');
    // Polígono representativo do contorno SP (esquemático)
    bg.setAttribute('d',
      'M 110,260 L 220,180 L 380,160 L 470,170 L 540,200 L 600,220 ' +
      'L 700,240 L 790,290 L 830,360 L 820,460 L 760,540 L 680,610 ' +
      'L 580,640 L 460,640 L 360,610 L 270,560 L 200,500 L 150,420 ' +
      'L 110,340 Z'
    );
    bg.setAttribute('fill', 'rgba(255,255,255,0.025)');
    bg.setAttribute('stroke', 'var(--mz-rule-strong)');
    bg.setAttribute('stroke-width', '1.5');
    svg.appendChild(bg);

    // grid sutil
    const grid = document.createElementNS(NS, 'g');
    grid.setAttribute('opacity', '0.4');
    for (let x = 100; x < 900; x += 80){
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', x); l.setAttribute('x2', x);
      l.setAttribute('y1', 100); l.setAttribute('y2', 660);
      l.setAttribute('stroke', 'var(--mz-hairline)');
      l.setAttribute('stroke-width', '1');
      grid.appendChild(l);
    }
    for (let y = 140; y < 660; y += 80){
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', 100); l.setAttribute('x2', 880);
      l.setAttribute('y1', y); l.setAttribute('y2', y);
      l.setAttribute('stroke', 'var(--mz-hairline)');
      l.setAttribute('stroke-width', '1');
      grid.appendChild(l);
    }
    svg.appendChild(grid);

    // halos para crit (pulse)
    D.MUNICIPIOS.filter(m => m.status === 'crit').forEach(m => {
      const halo = document.createElementNS(NS, 'circle');
      halo.setAttribute('cx', m.x); halo.setAttribute('cy', m.y);
      halo.setAttribute('r', radius(m.total) + 14);
      halo.setAttribute('fill', 'none');
      halo.setAttribute('stroke', '#dc2626');
      halo.setAttribute('stroke-width', '1.5');
      halo.setAttribute('opacity', '0.4');
      halo.style.transformOrigin = `${m.x}px ${m.y}px`;
      halo.style.animation = 'pulse 2s ease-in-out infinite';
      svg.appendChild(halo);
    });

    // bubbles
    D.MUNICIPIOS.forEach(m => {
      const g = document.createElementNS(NS, 'g');
      g.style.cursor = 'pointer';
      g.dataset.mun = m.id;

      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', m.x); c.setAttribute('cy', m.y);
      c.setAttribute('r', radius(m.total));
      c.setAttribute('fill', statusColor(m.status));
      c.setAttribute('fill-opacity', '0.65');
      c.setAttribute('stroke', statusColor(m.status));
      c.setAttribute('stroke-width', '2');

      const lbl = document.createElementNS(NS, 'text');
      lbl.setAttribute('x', m.x);
      lbl.setAttribute('y', m.y + radius(m.total) + 14);
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('font-family', 'Inter, sans-serif');
      lbl.setAttribute('font-size', '11');
      lbl.setAttribute('font-weight', '600');
      lbl.setAttribute('fill', 'var(--mz-fg)');
      lbl.setAttribute('paint-order', 'stroke');
      lbl.setAttribute('stroke', 'var(--mz-bg-page)');
      lbl.setAttribute('stroke-width', '3');
      lbl.textContent = m.nm;

      const valTxt = document.createElementNS(NS, 'text');
      valTxt.setAttribute('x', m.x); valTxt.setAttribute('y', m.y + 4);
      valTxt.setAttribute('text-anchor', 'middle');
      valTxt.setAttribute('font-family', 'JetBrains Mono, monospace');
      valTxt.setAttribute('font-size', m.status === 'crit' ? '11' : '9');
      valTxt.setAttribute('font-weight', '700');
      valTxt.setAttribute('fill', '#fff');
      valTxt.textContent = fmtBR(m.total);

      g.appendChild(c);
      g.appendChild(lbl);
      g.appendChild(valTxt);

      g.addEventListener('mouseenter', (e) => {
        c.setAttribute('fill-opacity', '0.9');
        c.setAttribute('stroke-width', '3');
        renderMapHover(m, e);
      });
      g.addEventListener('mouseleave', () => {
        c.setAttribute('fill-opacity', '0.65');
        c.setAttribute('stroke-width', '2');
      });
      g.addEventListener('click', () => renderMunRight(m));

      svg.appendChild(g);
    });

    // pulse keyframes via injeção
    if (!document.getElementById('pulse-anim')){
      const st = document.createElement('style');
      st.id = 'pulse-anim';
      st.textContent = `@keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.1; transform: scale(1.18); } }`;
      document.head.appendChild(st);
    }
  }

  function renderMapHover(m, e){
    const meta = document.getElementById('hover-meta');
    const flagHtml = m.flag
      ? `<div style="margin-top:8px; padding:6px 8px; background:var(--mz-danger-soft); border:1px solid rgba(248,113,113,0.3); border-radius:6px; color:var(--mz-danger); font-weight:700; font-size:10px;">⚐ ${m.flag}</div>`
      : '';
    meta.innerHTML = `
      <b>${m.nm}</b>
      <div style="font-size:10px; color:var(--mz-fg-faint); margin-bottom:6px; letter-spacing:0.06em; text-transform:uppercase; font-weight:600;">${m.area} · ${fmtN(m.pop)} hab · IDH ${m.idh}</div>
      <div style="display:flex; gap:14px; margin-top:6px;">
        <div><div style="font-size:9px; color:var(--mz-fg-faint); letter-spacing:0.10em; text-transform:uppercase;">Volume</div><div style="font-family:'Bebas Neue', sans-serif; font-size:18px; color:var(--mz-fg-strong);">${fmtBR(m.total)}</div></div>
        <div><div style="font-size:9px; color:var(--mz-fg-faint); letter-spacing:0.10em; text-transform:uppercase;">Score</div><div style="font-family:'Bebas Neue', sans-serif; font-size:18px; color:${statusColor(m.status)};">${m.score}</div></div>
      </div>
      ${flagHtml}
      <div style="margin-top:8px; font-size:10px; color:var(--mz-fg-faint);">Clique para ver detalhes →</div>
    `;
  }

  function renderMunRight(m){
    const root = document.getElementById('map-right');

    // emendas dessa cidade
    const ems = D.EMENDAS.filter(e => e.municipio === m.id);
    const totalAuthors = [...new Set(ems.map(e => e.autor))];
    const top3 = totalAuthors.slice(0, 3).map(aId => {
      const p = parlById(aId);
      const total = ems.filter(e => e.autor === aId).reduce((a, e) => a + e.valor, 0);
      return { p, total, count: ems.filter(e => e.autor === aId).length };
    });
    const lastEm = ems.sort((a, b) => b.score - a.score)[0];
    const flagHtml = m.flag
      ? `<div class="alert-strip"><div class="icn">!</div>${m.flag}</div>`
      : '';

    root.innerHTML = `
      <div class="mun-head">
        <div class="eyebrow">Município · SP</div>
        <h2>${m.nm}</h2>
        <div class="uf">${m.area} · ${fmtN(m.pop)} hab · PIB R$ ${fmtN(m.pib)}M · IDH ${m.idh}</div>
        ${flagHtml}
      </div>
      <div class="mun-stats">
        <div class="mun-stat"><div class="lbl">Total recebido · 24m</div><div class="val">${fmtBR(m.total)}</div><div class="delta ${m.status === 'crit' ? 'up' : 'neutral'}">${m.status === 'crit' ? '↑ +312% vs hist' : '+8% vs hist'}</div></div>
        <div class="mun-stat"><div class="lbl">Score risco médio</div><div class="val" style="color:${statusColor(m.status)}">${m.score}</div><div class="delta ${m.status === 'crit' ? 'up' : 'neutral'}">${m.status === 'crit' ? 'CRÍTICO' : 'Coerente'}</div></div>
        <div class="mun-stat"><div class="lbl">Nº emendas (24m)</div><div class="val">${ems.length}</div><div class="delta neutral">${totalAuthors.length} autores</div></div>
        <div class="mun-stat"><div class="lbl">R$ / hab</div><div class="val">R$ ${(m.total/m.pop).toFixed(0)}</div><div class="delta ${m.status === 'crit' ? 'up' : 'neutral'}">${m.status === 'crit' ? '8.4× benchmark' : 'No benchmark'}</div></div>
      </div>
      <div class="mun-section">
        <h3>Top autores · período</h3>
        ${top3.map(t => `
          <div class="parl-row">
            <div class="av">${t.p.av}</div>
            <div class="nm">${t.p.nm}<span>${t.p.partido}-${t.p.uf} · ${t.p.cargo}</span></div>
            <div class="val">${fmtBR(t.total)}<span>${t.count} emenda${t.count > 1 ? 's' : ''}</span></div>
          </div>
        `).join('')}
        ${top3.length === 0 ? '<div style="color:var(--mz-fg-faint); font-size:11px;">Sem dados de autores</div>' : ''}
      </div>
      ${lastEm ? `
      <div class="mun-section">
        <h3>Última emenda relevante</h3>
        <div class="last-emenda">
          <div class="id">${lastEm.id}</div>
          <div class="ttl">${lastEm.titulo}</div>
          <div class="meta">
            <span><b>${fmtBR(lastEm.valor)}</b></span>
            <span>${lastEm.rp}</span>
            <span>Score <b style="color:${statusColor(lastEm.tier)}">${lastEm.score}</b></span>
          </div>
        </div>
        <button class="btn-drill" onclick="window.openDossie('${lastEm.id}')">Ver dossiê completo →</button>
      </div>
      ` : ''}
      <div class="mun-section">
        <h3>Liderança UB local</h3>
        <div class="parl-row">
          <div class="av" style="background:var(--mz-tenant-primary); color:var(--mz-tenant-accent); border-color:var(--mz-tenant-accent);">CR</div>
          <div class="nm">Carlos Reis<span>Pres. Municipal UB · SBO</span></div>
          <div class="val">62<span>Score nominata</span></div>
        </div>
      </div>
    `;
  }

  /* ============================================================
     VIEW 2 · DOSSIÊ DA EMENDA (SBO · EMD-2025-014729)
     ============================================================ */
  const TOC = [
    { num: '01', id: 'sec-id',     label: 'Identificação' },
    { num: '02', id: 'sec-traj',   label: 'Trajetória do dinheiro' },
    { num: '03', id: 'sec-status', label: 'Status atual' },
    { num: '04', id: 'sec-dest',   label: 'Destinação real' },
    { num: '05', id: 'sec-aud',    label: 'Auditoria' },
    { num: '06', id: 'sec-autor',  label: 'Padrões do autor' },
    { num: '07', id: 'sec-benef',  label: 'Padrões do beneficiário' },
    { num: '08', id: 'sec-orgao',  label: 'Padrões do executor' },
    { num: '09', id: 'sec-docs',   label: 'Documentos vinculados' },
    { num: '10', id: 'sec-alert',  label: 'Alertas vinculados' },
  ];

  function renderDossieToc(){
    const root = document.getElementById('dossie-toc');
    root.innerHTML = `
      <h3>Seções</h3>
      ${TOC.map((t, i) => `
        <div class="toc-item ${i === 0 ? 'active' : ''}" data-target="${t.id}">
          <span class="num">${t.num}</span>
          <span>${t.label}</span>
        </div>
      `).join('')}
    `;
    root.querySelectorAll('.toc-item').forEach(el => {
      el.addEventListener('click', () => {
        root.querySelectorAll('.toc-item').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        const tgt = document.getElementById(el.dataset.target);
        if (tgt) tgt.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function renderDossie(emd){
    const m = munById(emd.municipio);
    const p = parlById(emd.autor);
    const root = document.getElementById('dossie-body');

    const dimNames = {
      volume: 'Desproporção volume',
      autor: 'Padrão do autor',
      finalidade: 'Vagueza finalidade',
      concentracao: 'Concentração',
      execucao: 'Status execução',
    };

    function dimColor(v){
      if (v >= 70) return '#dc2626';
      if (v >= 40) return '#f59e0b';
      return '#16a34a';
    }
    function scoreCircle(score){
      const r = 32;
      const c = 2 * Math.PI * r;
      const off = c - (score/100) * c;
      const col = dimColor(score);
      return `
        <div class="score-circle">
          <svg viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="${r}" fill="none" stroke="var(--mz-bg-elevated)" stroke-width="6"/>
            <circle cx="40" cy="40" r="${r}" fill="none" stroke="${col}" stroke-width="6"
              stroke-dasharray="${c}" stroke-dashoffset="${off}" stroke-linecap="round"/>
          </svg>
          <div class="lbl"><span class="v" style="color:${col}">${score}</span><span class="max">/ 100</span></div>
        </div>
      `;
    }

    root.innerHTML = `
      <!-- HERO -->
      <div class="dh">
        <div class="dh-left">
          <div class="eyebrow">Dossiê da Emenda · ${emd.rp}</div>
          <div class="id-row">
            <span class="id">${emd.id}</span>
            <span class="chip danger">⚐ Inconsistência</span>
            <span class="chip">${emd.categoria}</span>
            <span class="chip">${emd.status === 'em_execucao' ? 'Em execução' : emd.status === 'paga' ? 'Paga' : 'Aprovada'}</span>
          </div>
          <h1>${emd.titulo}</h1>
          <div class="sub">Beneficiária: <b>${m.nm}</b> · ${m.area} · ${fmtN(m.pop)} hab</div>
          <div class="dh-meta">
            <div class="item"><span class="lbl">Autor</span><span class="val"><a>${p.nm}</a> · ${p.partido}-${p.uf}</span></div>
            <div class="item"><span class="lbl">Valor empenhado</span><span class="val">${fmtFull(emd.valor)}</span></div>
            <div class="item"><span class="lbl">Pago até hoje</span><span class="val">${fmtFull(emd.valor_pago)} (${Math.round(emd.valor_pago/emd.valor*100)}%)</span></div>
            <div class="item"><span class="lbl">Órgão executor</span><span class="val">${emd.orgao_executor}</span></div>
          </div>
        </div>

        <div class="score-card">
          <div class="top">
            ${scoreCircle(emd.score)}
            <div class="meta">
              <div class="tag">⚐ Inconsistência detectada</div>
              <h3>Investigar — ação política</h3>
              <p>Algoritmo aponta padrão. Decisão de investigar é humana.</p>
            </div>
          </div>
          <hr class="hr">
          <div class="score-bars">
            ${Object.entries(emd.dimensoes).map(([k, v]) => `
              <div class="score-bar">
                <span class="nm">${dimNames[k]}</span>
                <div class="track"><div class="fill" style="width:${v}%; background:${dimColor(v)};"></div></div>
                <span class="v">${v}</span>
              </div>
            `).join('')}
          </div>
          <div style="font-size:10px; color:var(--mz-fg-faint); padding-top:8px; border-top:1px solid var(--mz-rule); line-height:1.5;">
            <b style="color:var(--mz-fg-muted)">Por que está sinalizada?</b> Volume R$/hab é 8,4× a média de cidades similares + autor sem ligação geográfica + finalidade vaga. Algoritmo logado em auditoria · LGPD.
          </div>
        </div>
      </div>

      <!-- 01 IDENTIFICAÇÃO -->
      <div class="sec" id="sec-id">
        <h2><span class="num">01</span> Identificação <span class="extra">Origem oficial</span></h2>
        <div class="grid-4">
          <div class="cell"><div class="lbl">ID oficial</div><div class="v" style="font-family:'JetBrains Mono', monospace; font-size:14px;">${emd.id}</div><div class="sub">Câmara dos Deputados · ${emd.rp}</div></div>
          <div class="cell"><div class="lbl">Categoria</div><div class="v" style="font-family:'Inter'; font-size:14px;">${emd.categoria}</div><div class="sub">SIOP · cód. 15.452.0073</div></div>
          <div class="cell"><div class="lbl">Beneficiário</div><div class="v" style="font-family:'Inter'; font-size:14px;">${m.nm}</div><div class="sub">${m.area}</div></div>
          <div class="cell"><div class="lbl">Órgão executor</div><div class="v" style="font-family:'Inter'; font-size:14px; line-height:1.2;">${emd.orgao_executor}</div><div class="sub">Município</div></div>
          <div class="cell"><div class="lbl">Apresentado em</div><div class="v" style="font-family:'JetBrains Mono'; font-size:16px;">${emd.data_apresentacao}</div></div>
          <div class="cell"><div class="lbl">Aprovado em</div><div class="v" style="font-family:'JetBrains Mono'; font-size:16px;">${emd.data_aprovacao}</div></div>
          <div class="cell"><div class="lbl">Empenho</div><div class="v" style="font-family:'JetBrains Mono'; font-size:16px;">${emd.data_empenho}</div></div>
          <div class="cell"><div class="lbl">Liquidação</div><div class="v" style="font-family:'JetBrains Mono'; font-size:16px;">${emd.data_liquidacao}</div></div>
        </div>
      </div>

      <!-- 02 TRAJETÓRIA -->
      <div class="sec" id="sec-traj">
        <h2><span class="num">02</span> Trajetória do dinheiro <span class="extra">Empenho · Liquidação · Pagamento</span></h2>
        <div class="timeline">
          <div class="tl-item done">
            <div class="dot"></div>
            <div class="head"><span class="stage">Apresentação</span><span class="when">${emd.data_apresentacao}</span></div>
            <div class="body">Apresentada na LDO/2025 pelo Dep. ${p.nm} (${p.partido}-${p.uf}). Sem objeto específico declarado.</div>
          </div>
          <div class="tl-item done">
            <div class="dot"></div>
            <div class="head"><span class="stage">Aprovação</span><span class="when">${emd.data_aprovacao}</span></div>
            <div class="body">Aprovada na PL Orçamentária · valor cheio R$ 35M. Categoria: Infraestrutura urbana.</div>
            <span class="gap-warn">Gap até empenho: 1 mês 14 dias</span>
          </div>
          <div class="tl-item done">
            <div class="dot"></div>
            <div class="head"><span class="stage">Empenho</span><span class="when">${emd.data_empenho}</span></div>
            <div class="body">Empenhada à Sec. Municipal de Obras · ordenador: João Carlos Mendes (CPF parcial 048.***)</div>
          </div>
          <div class="tl-item warn">
            <div class="dot"></div>
            <div class="head"><span class="stage">Liquidação</span><span class="when">${emd.data_liquidacao}</span></div>
            <div class="body">R$ 18,4M liquidados parcialmente. Sem nota fiscal pública vinculada na CGU.</div>
            <span class="gap-warn">⚠ Sem NF · investigar</span>
          </div>
          <div class="tl-item pending">
            <div class="dot"></div>
            <div class="head"><span class="stage">Pagamento</span><span class="when">Pendente</span></div>
            <div class="body">R$ 16,6M restantes em RAP (restos a pagar) · projeção de pagamento 2026 Q2.</div>
          </div>
        </div>
      </div>

      <!-- 03 STATUS -->
      <div class="sec" id="sec-status">
        <h2><span class="num">03</span> Status atual <span class="extra">Em execução</span></h2>
        <div class="grid-3">
          <div class="cell warn">
            <div class="lbl">Em execução</div>
            <div class="v">${Math.round(emd.valor_pago/emd.valor*100)}%</div>
            <div class="sub">${fmtBR(emd.valor_pago)} de ${fmtBR(emd.valor)} liquidado</div>
          </div>
          <div class="cell">
            <div class="lbl">Restos a pagar</div>
            <div class="v">${fmtBR(emd.valor - emd.valor_pago)}</div>
            <div class="sub">Saldo em RAP · 2026</div>
          </div>
          <div class="cell">
            <div class="lbl">Tempo desde aprovação</div>
            <div class="v">14 meses</div>
            <div class="sub">Acima do esperado para infraestrutura urbana</div>
          </div>
        </div>
      </div>

      <!-- 04 DESTINAÇÃO REAL -->
      <div class="sec" id="sec-dest">
        <h2><span class="num">04</span> Destinação real <span class="extra">Análise NLP da finalidade</span></h2>
        <div class="grid-2">
          <div class="cell">
            <div class="lbl">Texto da finalidade · oficial</div>
            <div style="font-family:'JetBrains Mono', monospace; font-size:11px; color:var(--mz-fg); margin-top:8px; padding:10px; background:var(--mz-bg-elevated); border-radius:6px; line-height:1.5;">
              "${emd.finalidade}"
            </div>
            <div style="margin-top:12px; display:flex; gap:14px; align-items:center;">
              <div>
                <div class="lbl" style="margin-bottom:2px;">Score NLP de objetividade</div>
                <div class="v" style="color:var(--mz-danger); font-size:24px;">${emd.finalidade_score}/100</div>
              </div>
              <div style="flex:1; font-size:11px; color:var(--mz-fg-muted); line-height:1.4;">
                Termos vagos detectados: <b style="color:var(--mz-danger)">"apoio"</b>, <b style="color:var(--mz-danger)">"desenvolvimento"</b>. Sem objeto, métrica ou cronograma.
              </div>
            </div>
          </div>
          <div class="cell">
            <div class="lbl">Comparativo · finalidades similares</div>
            <div style="font-size:11px; color:var(--mz-fg-muted); margin-top:8px; line-height:1.5;">
              <div style="padding:8px 10px; background:var(--mz-bg-elevated); border-radius:6px; margin-bottom:6px;">
                <b style="color:var(--mz-ok); font-family:'JetBrains Mono'; font-size:10px;">EXEMPLO BOM (94/100)</b><br>
                <span style="color:var(--mz-fg);">"Ampliação da ala oncológica do HC-RP — 80 leitos, execução pela USP"</span>
              </div>
              <div style="padding:8px 10px; background:var(--mz-danger-soft); border-radius:6px; border:1px solid rgba(248,113,113,0.2);">
                <b style="color:var(--mz-danger); font-family:'JetBrains Mono'; font-size:10px;">ESTA EMENDA (12/100)</b><br>
                <span style="color:var(--mz-fg);">"Apoio ao desenvolvimento social e estrutural"</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 05 AUDITORIA -->
      <div class="sec" id="sec-aud">
        <h2><span class="num">05</span> Auditoria <span class="extra">Documentação obrigatória</span></h2>
        <div class="cell" style="padding:0;">
          <div class="kv" style="padding:14px 18px;"><span class="k">Prestação de contas existe?</span><span class="v danger">${emd.auditoria.prestacao_contas} ⚐</span></div>
          <div class="kv" style="padding:14px 18px;"><span class="k">Licitação pública vinculada?</span><span class="v danger">${emd.auditoria.licitacao} ⚐</span></div>
          <div class="kv" style="padding:14px 18px;"><span class="k">Contrato público acessível?</span><span class="v danger">${emd.auditoria.contrato_publico} ⚐</span></div>
          <div class="kv" style="padding:14px 18px;"><span class="k">Notas fiscais registradas na CGU?</span><span class="v danger">${emd.auditoria.notas_fiscais} ⚐</span></div>
          <div class="kv" style="padding:14px 18px;"><span class="k">Origem da informação</span><span class="v">SIOP · CGU · Câmara dos Deputados</span></div>
          <div class="kv" style="padding:14px 18px;"><span class="k">Última atualização</span><span class="v">Hoje · 09:14 (cron Mazzel)</span></div>
        </div>
      </div>

      <!-- 06 PADRÕES DO AUTOR -->
      <div class="sec" id="sec-autor">
        <h2><span class="num">06</span> Padrões do autor <span class="extra">${p.nm} · ${p.partido}-${p.uf}</span></h2>
        <div class="grid-4">
          <div class="cell danger"><div class="lbl">Outras emendas pra SBO</div><div class="v">${emd.autor_padrao.total_emendas_municipio}</div><div class="sub">Em 18 meses · padrão</div></div>
          <div class="cell danger"><div class="lbl">% emendas dele para SBO</div><div class="v">${emd.autor_padrao.pct_municipio}%</div><div class="sub">Concentração geográfica</div></div>
          <div class="cell warn"><div class="lbl">Doações TSE locais</div><div class="v" style="font-size:14px; line-height:1.2;">R$ 240K</div><div class="sub">Const. Riberti Ltda · 2022</div></div>
          <div class="cell danger"><div class="lbl">Ligação eleitoral</div><div class="v" style="font-size:14px; line-height:1.2;">Ausente</div><div class="sub">0 votos em SBO em 2022</div></div>
        </div>
        <div style="margin-top:12px; padding:14px; background:var(--mz-warn-soft); border:1px solid rgba(251,191,36,0.25); border-radius:10px; font-size:11.5px; color:var(--mz-fg); line-height:1.5;">
          <b style="color:var(--mz-warn); font-size:10px; letter-spacing:0.14em; text-transform:uppercase; font-weight:700;">Nota algorítmica</b><br>
          ${p.nota || 'Autor sem ligação geográfica natural com a cidade beneficiada.'} Doação registrada no TSE de empresa vinculada (Const. Riberti) coincide com licitações abertas pelo município. Padrão merece investigação.
        </div>
      </div>

      <!-- 07 PADRÕES DO BENEFICIÁRIO -->
      <div class="sec" id="sec-benef">
        <h2><span class="num">07</span> Padrões do beneficiário <span class="extra">${m.nm}</span></h2>
        <div class="grid-4">
          <div class="cell"><div class="lbl">Total recebido · 24m</div><div class="v">${fmtBR(emd.benef_padrao.total_recebido_2024)}</div><div class="sub">+312% vs período anterior</div></div>
          <div class="cell"><div class="lbl">Autores distintos</div><div class="v">${emd.benef_padrao.autores_distintos}</div><div class="sub">Cluster identificado</div></div>
          <div class="cell warn"><div class="lbl">Contas TCE</div><div class="v" style="font-size:14px; line-height:1.2;">2 reg. · 1 ressalva</div><div class="sub">Ressalva: prest. contas 2023</div></div>
          <div class="cell"><div class="lbl">Adversários dominantes</div><div class="v" style="font-size:14px; line-height:1.2;">${emd.benef_padrao.adversarios}</div><div class="sub">Pref. atual</div></div>
        </div>
        <div class="cell" style="margin-top:14px;">
          <div class="lbl">Liderança UB local</div>
          <div class="parl-row" style="margin-top:8px;">
            <div class="av" style="background:var(--mz-tenant-primary); color:var(--mz-tenant-accent); border-color:var(--mz-tenant-accent);">CR</div>
            <div class="nm">Carlos Reis<span>Pres. Municipal UB · SBO · score nominata 62</span></div>
            <div class="val">62/100<span>SGIP</span></div>
          </div>
          <div style="margin-top:10px; font-size:11.5px; color:var(--mz-fg-muted); line-height:1.5;">
            Liderança UB local <b>tem responsabilidade política</b> pelo padrão de emendas no município. Score 62 indica nominata com vulnerabilidades. Considerar Operação Mazzel para diligência.
          </div>
        </div>
      </div>

      <!-- 08 PADRÕES DO EXECUTOR -->
      <div class="sec" id="sec-orgao">
        <h2><span class="num">08</span> Padrões do executor <span class="extra">${emd.orgao_executor}</span></h2>
        <div class="grid-3">
          <div class="cell"><div class="lbl">Histórico CGU/TCU</div><div class="v" style="font-size:14px; line-height:1.2;">${emd.orgao_padrao.historico_cgu}</div><div class="sub">CEIS + CEAF + TCU varridos</div></div>
          <div class="cell"><div class="lbl">Licitações abertas</div><div class="v">${emd.orgao_padrao.licitacoes_abertas}</div><div class="sub">No último trimestre</div></div>
          <div class="cell warn"><div class="lbl">Fornecedor recorrente</div><div class="v" style="font-size:13px; line-height:1.2;">Const. Riberti</div><div class="sub">${emd.orgao_padrao.fornecedor_freq}</div></div>
        </div>
        <div style="margin-top:12px; padding:14px; background:var(--mz-warn-soft); border:1px solid rgba(251,191,36,0.25); border-radius:10px; font-size:11.5px; color:var(--mz-fg); line-height:1.5;">
          <b style="color:var(--mz-warn); font-size:10px; letter-spacing:0.14em; text-transform:uppercase; font-weight:700;">Sinal de fornecedor único</b><br>
          Const. Riberti Ltda aparece em <b>4 das últimas 6 licitações</b> da Sec. de Obras de SBO. A mesma empresa fez doação ao autor da emenda em 2022 (R$ 240K). Padrão alinha-se à literatura de captura.
        </div>
      </div>

      <!-- 09 DOCUMENTOS VINCULADOS -->
      <div class="sec" id="sec-docs">
        <h2><span class="num">09</span> Documentos vinculados <span class="extra">Liga à Módulo Documentos · hash + assinatura</span></h2>
        <div class="cell" style="padding:0;">
          <div style="display:grid; grid-template-columns: 80px 1fr 100px 110px 110px 90px; padding:10px 18px; font-size:9.5px; letter-spacing:0.14em; color:var(--mz-fg-faint); text-transform:uppercase; font-weight:700; border-bottom:1px solid var(--mz-rule);">
            <span>Tipo</span><span>Documento</span><span>Origem</span><span>Data</span><span>Hash</span><span>Ação</span>
          </div>
          <div style="display:grid; grid-template-columns: 80px 1fr 100px 110px 110px 90px; padding:12px 18px; font-size:11.5px; align-items:center; border-bottom:1px solid var(--mz-hairline);">
            <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:var(--mz-tenant-accent); font-weight:700; letter-spacing:0.04em;">PL ORÇ</span>
            <span style="color:var(--mz-fg-strong); font-weight:600;">PL Orçamentária 2025 · Anexo XII</span>
            <span style="color:var(--mz-fg-muted); font-size:10px;">Câmara</span>
            <span style="font-family:'JetBrains Mono', monospace; font-size:10.5px; color:var(--mz-fg-muted);">15/02/2025</span>
            <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:var(--mz-ok);">a3f2..b81d ✓</span>
            <button style="padding:4px 10px; font-size:10px; font-weight:600; background:transparent; border:1px solid var(--mz-rule); color:var(--mz-fg-muted); border-radius:6px; cursor:pointer;">↗ Abrir</button>
          </div>
          <div style="display:grid; grid-template-columns: 80px 1fr 100px 110px 110px 90px; padding:12px 18px; font-size:11.5px; align-items:center; border-bottom:1px solid var(--mz-hairline);">
            <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:var(--mz-tenant-accent); font-weight:700; letter-spacing:0.04em;">EMP</span>
            <span style="color:var(--mz-fg-strong); font-weight:600;">Nota de Empenho 2025NE004871 · SBO</span>
            <span style="color:var(--mz-fg-muted); font-size:10px;">SIAFI</span>
            <span style="font-family:'JetBrains Mono', monospace; font-size:10.5px; color:var(--mz-fg-muted);">02/05/2025</span>
            <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:var(--mz-ok);">7c91..0e2a ✓</span>
            <button style="padding:4px 10px; font-size:10px; font-weight:600; background:transparent; border:1px solid var(--mz-rule); color:var(--mz-fg-muted); border-radius:6px; cursor:pointer;">↗ Abrir</button>
          </div>
          <div style="display:grid; grid-template-columns: 80px 1fr 100px 110px 110px 90px; padding:12px 18px; font-size:11.5px; align-items:center; border-bottom:1px solid var(--mz-hairline);">
            <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:var(--mz-tenant-accent); font-weight:700; letter-spacing:0.04em;">LIQ</span>
            <span style="color:var(--mz-fg-strong); font-weight:600;">Liquidação parcial · R$ 18,4M</span>
            <span style="color:var(--mz-fg-muted); font-size:10px;">SIAFI</span>
            <span style="font-family:'JetBrains Mono', monospace; font-size:10.5px; color:var(--mz-fg-muted);">14/08/2025</span>
            <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:var(--mz-ok);">d4a8..f193 ✓</span>
            <button style="padding:4px 10px; font-size:10px; font-weight:600; background:transparent; border:1px solid var(--mz-rule); color:var(--mz-fg-muted); border-radius:6px; cursor:pointer;">↗ Abrir</button>
          </div>
          <div style="display:grid; grid-template-columns: 80px 1fr 100px 110px 110px 90px; padding:12px 18px; font-size:11.5px; align-items:center; border-bottom:1px solid var(--mz-hairline); background:var(--mz-danger-soft);">
            <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:var(--mz-danger); font-weight:700; letter-spacing:0.04em;">NF ⛐</span>
            <span style="color:var(--mz-fg-strong); font-weight:600;">Notas fiscais vinculadas <span style="color:var(--mz-danger); font-weight:700;">· NÃO LOCALIZADAS</span></span>
            <span style="color:var(--mz-fg-muted); font-size:10px;">CGU</span>
            <span style="font-family:'JetBrains Mono', monospace; font-size:10.5px; color:var(--mz-fg-muted);">—</span>
            <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:var(--mz-danger);">—</span>
            <button style="padding:4px 10px; font-size:10px; font-weight:600; background:transparent; border:1px solid rgba(248,113,113,0.3); color:var(--mz-danger); border-radius:6px; cursor:pointer;">⛐ Solicitar</button>
          </div>
          <div style="display:grid; grid-template-columns: 80px 1fr 100px 110px 110px 90px; padding:12px 18px; font-size:11.5px; align-items:center; border-bottom:1px solid var(--mz-hairline); background:var(--mz-danger-soft);">
            <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:var(--mz-danger); font-weight:700; letter-spacing:0.04em;">LIC ⛐</span>
            <span style="color:var(--mz-fg-strong); font-weight:600;">Edital de licitação vinculado <span style="color:var(--mz-danger); font-weight:700;">· NÃO DISPONIBILIZADO</span></span>
            <span style="color:var(--mz-fg-muted); font-size:10px;">PNCP</span>
            <span style="font-family:'JetBrains Mono', monospace; font-size:10.5px; color:var(--mz-fg-muted);">—</span>
            <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:var(--mz-danger);">—</span>
            <button style="padding:4px 10px; font-size:10px; font-weight:600; background:transparent; border:1px solid rgba(248,113,113,0.3); color:var(--mz-danger); border-radius:6px; cursor:pointer;">⛐ Solicitar</button>
          </div>
          <div style="display:grid; grid-template-columns: 80px 1fr 100px 110px 110px 90px; padding:12px 18px; font-size:11.5px; align-items:center; border-bottom:1px solid var(--mz-hairline);">
            <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:var(--mz-warn); font-weight:700; letter-spacing:0.04em;">CONT</span>
            <span style="color:var(--mz-fg-strong); font-weight:600;">Contrato fornecedor · Const. Riberti Ltda</span>
            <span style="color:var(--mz-fg-muted); font-size:10px;">Pref. SBO</span>
            <span style="font-family:'JetBrains Mono', monospace; font-size:10.5px; color:var(--mz-fg-muted);">12/06/2025</span>
            <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:var(--mz-warn);">be21..a4cc ⚠</span>
            <button style="padding:4px 10px; font-size:10px; font-weight:600; background:transparent; border:1px solid var(--mz-rule); color:var(--mz-fg-muted); border-radius:6px; cursor:pointer;">↗ Abrir</button>
          </div>
          <div style="display:grid; grid-template-columns: 80px 1fr 100px 110px 110px 90px; padding:12px 18px; font-size:11.5px; align-items:center;">
            <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:var(--mz-fg-muted); font-weight:700; letter-spacing:0.04em;">PREST</span>
            <span style="color:var(--mz-fg-strong); font-weight:600;">Prestação de contas final <span style="color:var(--mz-fg-faint); font-weight:500;">· prevista 03/2026</span></span>
            <span style="color:var(--mz-fg-muted); font-size:10px;">TCE-SP</span>
            <span style="font-family:'JetBrains Mono', monospace; font-size:10.5px; color:var(--mz-fg-faint);">Pendente</span>
            <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:var(--mz-fg-faint);">—</span>
            <button style="padding:4px 10px; font-size:10px; font-weight:600; background:transparent; border:1px solid var(--mz-rule); color:var(--mz-fg-faint); border-radius:6px; cursor:pointer;" disabled>⏳ Aguardando</button>
          </div>
        </div>
        <div style="margin-top:12px; padding:14px; background:var(--mz-bg-card); border:1px solid var(--mz-rule); border-radius:10px; font-size:11.5px; color:var(--mz-fg-muted); line-height:1.5; display:flex; align-items:center; gap:14px;">
          <div style="width:32px; height:32px; border-radius:8px; background:var(--mz-tenant-primary-soft); border:1px solid var(--mz-tenant-accent-soft); display:flex; align-items:center; justify-content:center; color:var(--mz-tenant-accent); font-size:14px; flex-shrink:0;">⏺</div>
          <div>
            <b style="color:var(--mz-fg);">Repositorio integrado</b> · Documentos são sincronizados com o <b style="color:var(--mz-fg);">Módulo Documentos</b>. Hash SHA-256 verificado contra fonte oficial. Clíquê “Solicitar” para gerar ofício formal de requisição aos órgãos responsáveis (CGU · PNCP · TCE-SP).
          </div>
        </div>
      </div>

      <!-- 10 ALERTAS VINCULADOS -->
      <div class="sec" id="sec-alert">
        <h2><span class="num">10</span> Alertas vinculados <span class="extra">Auto-gerados pelo algoritmo</span></h2>
        <div class="alert-tile crit">
          <div class="ic">⚐</div>
          <div>
            <div class="nm">Inconsistência geográfica · CRÍTICO</div>
            <div class="desc">Autor (PB) sem ligação eleitoral com município SP. Histórico de 0 votos no estado em 2022.</div>
            <div class="meta">AL-9821 · disparado hoje 09:14</div>
          </div>
        </div>
        <div class="alert-tile crit">
          <div class="ic">⚐</div>
          <div>
            <div class="nm">Padrão coordenado detectado · CRÍTICO</div>
            <div class="desc">Cluster de 3 autores (Amaral + Augusto + Oliveira) → SBO em 12 meses · R$ 78,2M cumulativo.</div>
            <div class="meta">AL-9820 · disparado hoje 07:42</div>
          </div>
        </div>
        <div class="alert-tile high">
          <div class="ic">!</div>
          <div>
            <div class="nm">Pago sem nota fiscal · ALTO</div>
            <div class="desc">R$ 18,4M liquidados sem nota fiscal pública vinculada na CGU. Em descumprimento à LRF Art. 50.</div>
            <div class="meta">AL-9815 · disparado ontem 22:08</div>
          </div>
        </div>
        <div class="alert-tile high">
          <div class="ic">!</div>
          <div>
            <div class="nm">Finalidade vaga · ALTO</div>
            <div class="desc">NLP score 12/100. Termos genéricos sem objeto específico, métrica ou cronograma.</div>
            <div class="meta">AL-9814 · disparado ontem 19:30</div>
          </div>
        </div>
      </div>
    `;

    // scroll-spy do TOC
    const tocItems = document.querySelectorAll('.toc-item');
    const scroller = document.querySelector('.dossie-body-wrap');
    scroller.addEventListener('scroll', () => {
      let active = TOC[0].id;
      TOC.forEach(t => {
        const el = document.getElementById(t.id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.top < 120) active = t.id;
      });
      tocItems.forEach(x => x.classList.toggle('active', x.dataset.target === active));
    });
  }

  window.openDossie = function(id){
    const e = emendaById(id) || D.EMENDAS[0];
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelector('.tab[data-tab="dossie"]').classList.add('active');
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    document.querySelector('.view[data-view="dossie"]').classList.add('active');
    renderDossie(e);
  };

  /* ============================================================
     VIEW 3 · FLUXO SANKEY
     ============================================================ */
  function renderSankey(mode){
    mode = mode || 'cidade';  // 'cidade' | 'orgao'
    const svg = document.getElementById('sankey-svg');
    const NS = 'http://www.w3.org/2000/svg';
    svg.innerHTML = '';

    const W = 1400, H = 720;
    const padX = 60, padY = 40;
    const colW = (W - padX*2) / 4;  // 4 colunas: Partido → Autor → Cidade → Status

    // Construir nodes/links
    const partidos = [...new Set(Object.values(D.PARLAMENTARES).map(p => p.partido))];
    const emendasFlt = D.EMENDAS;

    // colunas
    const middleKey  = mode === 'orgao' ? 'orgao_executor' : 'municipio';
    const middleHead = mode === 'orgao' ? 'Órgão executor' : 'Município destino';
    const cols = {
      partido: partidos.map(p => ({ key: p, label: p, total: 0 })),
      autor: [...new Set(emendasFlt.map(e => e.autor))].map(a => ({ key: a, label: parlById(a).nm, total: 0, partido: parlById(a).partido })),
      cidade: [...new Set(emendasFlt.map(e => e[middleKey]))].map(c => {
        if (mode === 'orgao'){
          // órgão: identificar relevantes (saude/obras/usp/aeroporto)
          let label = c, status = 'ok';
          if (/Obras/i.test(c)) status = 'crit';
          else if (/Saúde/i.test(c)) status = 'high';
          return { key: c, label: label.replace('Secretaria Municipal de ', 'Sec. ').replace('Pref. ', ''), total: 0, status };
        }
        const m = munById(c);
        return { key: c, label: m.nm, total: 0, status: m.status };
      }),
      status: [
        { key: 'ok', label: 'Coerente', total: 0 },
        { key: 'high', label: 'Atenção', total: 0 },
        { key: 'crit', label: 'Inconsistência', total: 0 },
      ],
    };

    emendasFlt.forEach(e => {
      const p = parlById(e.autor);
      cols.partido.find(x => x.key === p.partido).total += e.valor;
      cols.autor.find(x => x.key === e.autor).total += e.valor;
      cols.cidade.find(x => x.key === e[middleKey]).total += e.valor;
      cols.status.find(x => x.key === e.tier).total += e.valor;
    });

    // ordenar
    Object.values(cols).forEach(arr => arr.sort((a, b) => b.total - a.total));

    // posicionar
    const total = emendasFlt.reduce((a, e) => a + e.valor, 0);
    const innerH = H - padY*2;
    const gap = 6;

    function layoutColumn(arr, x){
      let y = padY;
      arr.forEach(n => {
        const h = (n.total / total) * (innerH - gap*(arr.length-1));
        n.x = x; n.y = y; n.h = Math.max(h, 16); n.w = 14;
        y += n.h + gap;
      });
    }
    layoutColumn(cols.partido, padX);
    layoutColumn(cols.autor, padX + colW);
    layoutColumn(cols.cidade, padX + colW*2);
    layoutColumn(cols.status, padX + colW*3);

    // tracks Y dentro de cada nó (offset cumulativo)
    const offsets = new Map();
    function pickOff(arr, key, value){
      const k = arr + '|' + key;
      const cur = offsets.get(k) || 0;
      offsets.set(k, cur + value);
      return cur;
    }

    const colorFor = (tier) => {
      if (tier === 'crit') return '#dc2626';
      if (tier === 'high') return '#f59e0b';
      return 'rgba(255, 204, 0, 0.55)';  // amarelo UB pra normais
    };

    // links
    const linkG = document.createElementNS(NS, 'g');
    linkG.setAttribute('opacity', '0.85');
    emendasFlt.forEach(e => {
      const p = parlById(e.autor);
      const fromPartido = cols.partido.find(x => x.key === p.partido);
      const fromAutor = cols.autor.find(x => x.key === e.autor);
      const fromCid = cols.cidade.find(x => x.key === e[middleKey]);
      const toStatus = cols.status.find(x => x.key === e.tier);

      const h = (e.valor / total) * (innerH);
      const stroke = colorFor(e.tier);

      // 3 segmentos: partido→autor, autor→cidade, cidade→status
      function drawLink(from, to, w){
        const off1 = pickOff('out', from.key, w);
        const off2 = pickOff('in', to.key, w);
        const x1 = from.x + from.w;
        const y1 = from.y + off1 + w/2;
        const x2 = to.x;
        const y2 = to.y + off2 + w/2;
        const cx = (x1 + x2) / 2;
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', `M ${x1},${y1} C ${cx},${y1} ${cx},${y2} ${x2},${y2}`);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', stroke);
        path.setAttribute('stroke-width', w);
        path.setAttribute('stroke-linecap', 'butt');
        path.setAttribute('opacity', '0.55');
        path.style.transition = 'opacity 120ms';
        path.addEventListener('mouseenter', () => path.setAttribute('opacity', '0.95'));
        path.addEventListener('mouseleave', () => path.setAttribute('opacity', '0.55'));
        const tt = document.createElementNS(NS, 'title');
        tt.textContent = `${e.id} · ${e.titulo}\n${parlById(e.autor).nm} → ${mode === 'orgao' ? e.orgao_executor : munById(e.municipio).nm}\n${fmtFull(e.valor)} · score ${e.score}`;
        path.appendChild(tt);
        linkG.appendChild(path);
      }
      drawLink(fromPartido, fromAutor, h);
      drawLink(fromAutor, fromCid, h);
      drawLink(fromCid, toStatus, h);
    });
    svg.appendChild(linkG);

    // nodes
    function drawNodes(arr, color){
      arr.forEach(n => {
        const r = document.createElementNS(NS, 'rect');
        r.setAttribute('x', n.x); r.setAttribute('y', n.y);
        r.setAttribute('width', n.w); r.setAttribute('height', n.h);
        r.setAttribute('fill', color || 'var(--mz-fg-strong)');
        r.setAttribute('rx', '2');
        svg.appendChild(r);

        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', n.x + n.w + 8);
        t.setAttribute('y', n.y + n.h/2 + 4);
        t.setAttribute('font-family', 'Inter, sans-serif');
        t.setAttribute('font-size', '11.5');
        t.setAttribute('font-weight', '600');
        t.setAttribute('fill', 'var(--mz-fg-strong)');
        t.textContent = n.label;
        svg.appendChild(t);

        const v = document.createElementNS(NS, 'text');
        v.setAttribute('x', n.x + n.w + 8);
        v.setAttribute('y', n.y + n.h/2 + 18);
        v.setAttribute('font-family', 'JetBrains Mono, monospace');
        v.setAttribute('font-size', '10');
        v.setAttribute('font-weight', '600');
        v.setAttribute('fill', 'var(--mz-fg-faint)');
        v.textContent = fmtBR(n.total);
        svg.appendChild(v);
      });
    }

    drawNodes(cols.partido, 'var(--mz-tenant-primary)');
    drawNodes(cols.autor, 'var(--mz-fg-strong)');
    drawNodes(cols.cidade, 'var(--mz-fg-muted)');
    cols.status.forEach(n => {
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', n.x); r.setAttribute('y', n.y);
      r.setAttribute('width', n.w); r.setAttribute('height', n.h);
      r.setAttribute('fill', n.key === 'crit' ? '#dc2626' : n.key === 'high' ? '#f59e0b' : '#16a34a');
      r.setAttribute('rx', '2');
      svg.appendChild(r);
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', n.x - 8); t.setAttribute('y', n.y + n.h/2 + 4);
      t.setAttribute('text-anchor', 'end');
      t.setAttribute('font-family', 'Inter, sans-serif');
      t.setAttribute('font-size', '11.5');
      t.setAttribute('font-weight', '700');
      t.setAttribute('fill', n.key === 'crit' ? '#dc2626' : n.key === 'high' ? '#f59e0b' : '#16a34a');
      t.textContent = n.label.toUpperCase();
      svg.appendChild(t);
      const v = document.createElementNS(NS, 'text');
      v.setAttribute('x', n.x - 8); v.setAttribute('y', n.y + n.h/2 + 18);
      v.setAttribute('text-anchor', 'end');
      v.setAttribute('font-family', 'JetBrains Mono, monospace');
      v.setAttribute('font-size', '10');
      v.setAttribute('fill', 'var(--mz-fg-faint)');
      v.textContent = fmtBR(n.total);
      svg.appendChild(v);
    });

    // headers
    const headers = ['Partido', 'Parlamentar autor', middleHead, 'Classificação algorítmica'];
    headers.forEach((h, i) => {
      const x = padX + colW*i;
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', x); t.setAttribute('y', padY - 14);
      t.setAttribute('font-family', 'Inter, sans-serif');
      t.setAttribute('font-size', '10');
      t.setAttribute('font-weight', '700');
      t.setAttribute('letter-spacing', '0.16em');
      t.setAttribute('text-transform', 'uppercase');
      t.setAttribute('fill', 'var(--mz-fg-faint)');
      t.textContent = h.toUpperCase();
      svg.appendChild(t);
    });

    // ===== flux stats =====
    document.getElementById('flux-stats').innerHTML = `
      <div class="stat"><div class="lbl">Volume total · período</div><div class="v">${fmtBR(total)}</div><div class="sub">${emendasFlt.length} emendas · ${cols.autor.length} autores · ${cols.cidade.length} cidades</div></div>
      <div class="stat"><div class="lbl">Concentração top-3 cidades</div><div class="v">${Math.round((cols.cidade.slice(0,3).reduce((a,c)=>a+c.total,0)/total)*100)}%</div><div class="sub">${cols.cidade.slice(0,3).map(c=>c.label).join(' · ')}</div></div>
      <div class="stat" style="color:var(--mz-danger);"><div class="lbl" style="color:var(--mz-danger);">Inconsistências detectadas</div><div class="v" style="color:var(--mz-danger);">${cols.status.find(s=>s.key==='crit').total ? fmtBR(cols.status.find(s=>s.key==='crit').total) : 'R$ 0'}</div><div class="sub">${emendasFlt.filter(e=>e.tier==='crit').length} emendas em vermelho</div></div>
      <div class="stat"><div class="lbl">Autores sem ligação SP</div><div class="v">2</div><div class="sub">Padrão coordenado · ver Inconsistências</div></div>
    `;
  }

  /* ============================================================
     VIEW 4 · INCONSISTÊNCIAS
     ============================================================ */
  function renderInconsistencias(){
    const sum = document.getElementById('inc-summary');
    const list = document.getElementById('inc-list');

    const crit = D.EMENDAS.filter(e => e.tier === 'crit');
    const high = D.EMENDAS.filter(e => e.tier === 'high');
    const ok = D.EMENDAS.filter(e => e.tier === 'ok');
    const totalCrit = crit.reduce((a, e) => a + e.valor, 0);

    sum.innerHTML = `
      <div class="inc-stat crit"><div class="lbl">Score ≥ 70</div><div class="v">${crit.length}</div><div class="sub">${fmtBR(totalCrit)} · ação imediata</div></div>
      <div class="inc-stat high"><div class="lbl">Score 40–70</div><div class="v">${high.length}</div><div class="sub">Atenção · revisar nas próximas 72h</div></div>
      <div class="inc-stat ok"><div class="lbl">Score < 40</div><div class="v">${ok.length}</div><div class="sub">Coerentes · fora do radar</div></div>
      <div class="inc-stat"><div class="lbl">Total monitorado</div><div class="v">${D.EMENDAS.length}</div><div class="sub">SP · 24 meses · todas as RP</div></div>
    `;

    const sorted = [...D.EMENDAS].sort((a, b) => b.score - a.score);
    list.innerHTML = sorted.map(e => {
      const m = munById(e.municipio);
      const p = parlById(e.autor);
      return `
        <div class="inc-card ${e.tier}" onclick="window.openDossie('${e.id}')">
          <div class="score-pill ${e.tier}">
            <div class="v">${e.score}</div>
            <div class="max">/ 100</div>
          </div>
          <div class="body">
            <div class="ttl-row">
              <span class="id">${e.id}</span>
              <span class="ttl">${e.titulo}</span>
            </div>
            <div class="desc">
              <b style="color:var(--mz-fg);">${p.nm}</b> (${p.partido}-${p.uf}) → <b style="color:var(--mz-fg);">${m.nm}</b> · ${e.categoria} · ${e.rp}
            </div>
            ${e.motivos ? `
              <div class="reasons">
                ${e.motivos.map(r => `<span class="r ${r.tipo}">${r.tipo === 'danger' ? '⚐ ' : '! '}${r.label}</span>`).join('')}
              </div>
            ` : ''}
          </div>
          <div class="actions">
            <div class="val">${fmtBR(e.valor)}<span>${e.status === 'em_execucao' ? 'em execução' : e.status === 'paga' ? 'paga' : 'aprovada'}</span></div>
            <div class="row">
              <button onclick="event.stopPropagation();" title="Marcar como justificada">✓ Justificar</button>
              <button class="primary" onclick="event.stopPropagation(); window.openDossie('${e.id}')">Investigar →</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ============================================================
     VIEW 5 · ALERTAS
     ============================================================ */
  function renderAlertas(){
    const feed = document.getElementById('alert-feed');
    const side = document.getElementById('alert-side');

    // group por when_tag
    const groups = {
      'AGORA': D.ALERTAS.filter(a => a.when_tag === 'AGORA'),
      '24h':   D.ALERTAS.filter(a => a.when_tag === '24h'),
      'semana': D.ALERTAS.filter(a => a.when_tag === 'semana'),
    };

    const sevIcon = { crit: '⚐', high: '!', med: 'i', low: '✓' };
    const sevName = { crit: 'CRÍTICO', high: 'ALTO', med: 'MÉDIO', low: 'BAIXO' };

    feed.innerHTML = `
      <h2>Sistema de Alertas<span>Auditoria de emendas em tempo real</span></h2>
      ${Object.entries(groups).map(([tag, list]) => list.length === 0 ? '' : `
        <div class="feed-group">
          <div class="head">
            <span class="when">${tag === 'AGORA' ? '⏺ Agora · em tempo real' : tag === '24h' ? 'Últimas 24 horas' : 'Últimos 7 dias'}</span>
            <span class="ct">${list.length} alerta${list.length > 1 ? 's' : ''}</span>
          </div>
          ${list.map(a => `
            <div class="feed-item ${a.sev}" ${a.emenda ? `onclick="window.openDossie('${a.emenda}')" style="cursor:pointer;"` : ''}>
              <div class="ic">${sevIcon[a.sev]}</div>
              <div class="body">
                <div class="head-row">
                  <span class="sev">${sevName[a.sev]}</span>
                  <span class="ttl">${a.titulo}</span>
                </div>
                <div class="desc">${a.desc}</div>
                <div style="margin-top:4px; font-size:10px; color:var(--mz-fg-faint); font-family:'JetBrains Mono', monospace;">${a.id} · alvo: ${a.target}</div>
              </div>
              <div class="meta">
                <span class="when">${a.when}</span>
                <div class="channels">
                  ${a.channels.map(c => `<span class="ch">${c}</span>`).join('')}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    `;

    side.innerHTML = `
      <h3>Métricas · 7 dias</h3>
      <div class="grid-3" style="grid-template-columns:1fr 1fr; gap:8px; margin-bottom:18px;">
        <div class="cell" style="padding:10px 12px;"><div class="lbl">Críticos</div><div class="v" style="color:var(--mz-danger); font-size:22px;">2</div></div>
        <div class="cell" style="padding:10px 12px;"><div class="lbl">Altos</div><div class="v" style="color:var(--mz-warn); font-size:22px;">2</div></div>
        <div class="cell" style="padding:10px 12px;"><div class="lbl">Médios</div><div class="v" style="color:var(--mz-info); font-size:22px;">2</div></div>
        <div class="cell" style="padding:10px 12px;"><div class="lbl">Tempo médio</div><div class="v" style="font-size:22px;">2.4min</div></div>
      </div>

      <h3>Regras configuradas</h3>
      ${D.REGRAS.map(r => `
        <div class="rule-card ${r.sev}">
          <div class="nm">${r.nm}</div>
          <div class="desc">${r.desc}</div>
          <div class="channels">${r.channels.map(c => `<span class="ch">${c}</span>`).join('')}</div>
          <div class="freq">${r.freq}</div>
        </div>
      `).join('')}

      <h3 style="margin-top:18px;">RBAC</h3>
      <div style="font-size:11px; color:var(--mz-fg-muted); line-height:1.6; padding:12px 14px; background:var(--mz-bg-card); border:1px solid var(--mz-rule); border-radius:10px;">
        Módulo restrito. Recebem alertas:<br>
        <b style="color:var(--mz-fg);">Pres. Estadual · Tesoureiro Estadual · Pres. Municipal correspondente · Tesoureiro local · Parlamentar autor (suas próprias).</b><br>
        <span style="color:var(--mz-fg-faint);">Cabos, coordenadores, filiados não têm acesso.</span>
      </div>
    `;
  }

  /* ============ INIT ============ */
  renderMapLeft();
  renderMapCanvas();
  renderMunRight(munById('sbo'));   // estado inicial: SBO selecionado
  renderDossieToc();
  renderDossie(emendaById('EMD-2025-014729'));
  renderInconsistencias();
  renderAlertas();
  // sankey é renderizado on-demand quando a aba é aberta
})();
