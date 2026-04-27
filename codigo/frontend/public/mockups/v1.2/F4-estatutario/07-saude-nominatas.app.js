/* ============================================================
   SAÚDE DAS NOMINATAS · APP
   ------------------------------------------------------------
   Wires up 5 tabs and renders all views from NOMINATA_DATA
   ============================================================ */
(function(){
  const D = window.NOMINATA_DATA;

  /* ============ HELPERS ============ */
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const fmt = (n) => (typeof n === 'number') ? n.toLocaleString('pt-BR') : n;

  // calcula score ponderado a partir de scores + SUBMEDIDAS pesos
  function calcScore(scores) {
    const total = D.SUBMEDIDAS.reduce((acc, sm) => acc + sm.peso, 0);
    const sum = D.SUBMEDIDAS.reduce((acc, sm) => acc + (scores[sm.key] || 0) * sm.peso, 0);
    return Math.round(sum / total);
  }

  function tierFromScore(s) {
    if (s >= 75) return 'ok';
    if (s >= 55) return 'high';
    return 'crit';
  }

  function tierColor(t) {
    return t === 'ok' ? '#22c55e' : (t === 'high' ? '#f59e0b' : '#f87171');
  }

  // labels curtos para o radar (texto longo cortaria)
  const SUBMED_SHORT = {
    paridade: 'PARIDADE',
    faixa: 'FAIXA ETÁRIA',
    vinculacao: 'VINCULAÇÃO',
    experiencia: 'EXPERIÊNCIA',
    documental: 'CONFORMIDADE',
    ativacao: 'ATIVAÇÃO',
    hist: 'HISTÓRICO',
  };

  /* ============ TABS ROUTING ============ */
  $$('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      $$('.tab').forEach(b => b.classList.toggle('active', b === btn));
      $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === target));
    });
  });

  /* ============================================================
     VIEW 1 · HEXÁGONO SCORE
     ============================================================ */
  let activeHex = 'tatui'; // start em Tatuí — o caso mais didático

  function renderHexSide() {
    const root = $('#hex-side');
    root.innerHTML = `
      <h3>Comissões · 3 destacadas</h3>
      ${D.COMISSOES.map(c => {
        const s = calcScore(c.scores);
        const tier = c.tier;
        const tierLbl = tier === 'ok' ? 'SAUDÁVEL' : tier === 'high' ? 'ATENÇÃO' : 'CRÍTICA';
        return `
          <div class="hex-pick ${activeHex === c.id ? 'active' : ''}" data-id="${c.id}">
            <div class="nm">
              ${c.nm} · ${c.uf}
              <span class="badge ${tier}">${tierLbl}</span>
            </div>
            <div class="meta">${fmt(c.pop)} hab · ${fmt(c.filiados)} filiados · ${c.candidatos} cand.</div>
            <div class="score-mini ${tier}">${s} <small style="font-size: 11px; color: var(--mz-fg-faint); font-family: 'Inter'; font-weight: 600;">/100</small></div>
          </div>
        `;
      }).join('')}
      <h3>Atalhos</h3>
      <div class="hex-pick" style="cursor: default; opacity: 0.7;">
        <div class="nm" style="font-size: 11.5px;">Ranking estadual completo</div>
        <div class="meta">645 munis · 18 amostradas no heatmap</div>
      </div>
      <div class="hex-pick" style="cursor: default; opacity: 0.7;">
        <div class="nm" style="font-size: 11.5px;">Histórico do score</div>
        <div class="meta">Variação semanal por comissão</div>
      </div>
    `;
    $$('#hex-side .hex-pick[data-id]').forEach(el => {
      el.addEventListener('click', () => {
        activeHex = el.dataset.id;
        renderHexSide();
        renderHexCanvas();
        renderHexFlags();
      });
    });
  }

  function renderHexCanvas() {
    const c = D.COMISSOES.find(c => c.id === activeHex);
    const score = calcScore(c.scores);
    const tier = c.tier;
    const tierLbl = tier === 'ok' ? 'SAUDÁVEL' : tier === 'high' ? 'ATENÇÃO' : 'CRÍTICA';

    // build heptagon (7 sub-medidas)
    const cx = 270, cy = 280, R = 165;
    const angles = D.SUBMEDIDAS.map((_, i) => -Math.PI/2 + (2 * Math.PI * i) / D.SUBMEDIDAS.length);

    // grid concêntrica (4 níveis: 25/50/75/100)
    const gridLevels = [25, 50, 75, 100];
    const gridPaths = gridLevels.map(lvl => {
      const r = R * (lvl / 100);
      const pts = angles.map(a => `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="var(--mz-rule)" stroke-width="${lvl === 100 ? 1.4 : 0.8}" stroke-dasharray="${lvl === 100 ? 'none' : '2 3'}"/>`;
    }).join('');

    // eixos
    const axes = angles.map((a, i) => {
      const x2 = cx + Math.cos(a) * R, y2 = cy + Math.sin(a) * R;
      return `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--mz-rule)" stroke-width="0.6" stroke-dasharray="2 3"/>`;
    }).join('');

    // dados
    const dataPts = D.SUBMEDIDAS.map((sm, i) => {
      const v = c.scores[sm.key];
      const r = R * (v / 100);
      return [cx + Math.cos(angles[i]) * r, cy + Math.sin(angles[i]) * r];
    });
    const polyPts = dataPts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const color = tierColor(tier);

    // labels (raio externo)
    const labels = D.SUBMEDIDAS.map((sm, i) => {
      const r = R + 22;
      const x = cx + Math.cos(angles[i]) * r;
      const y = cy + Math.sin(angles[i]) * r;
      const v = c.scores[sm.key];
      const vColor = tierColor(tierFromScore(v));
      let anchor = 'middle';
      if (Math.cos(angles[i]) > 0.2) anchor = 'start';
      else if (Math.cos(angles[i]) < -0.2) anchor = 'end';
      // shrink label horizontally if it would overflow
      const dx = anchor === 'start' ? 6 : (anchor === 'end' ? -6 : 0);
      return `
        <text x="${(x + dx).toFixed(1)}" y="${(y - 3).toFixed(1)}" text-anchor="${anchor}" font-family="Inter" font-size="10.5" font-weight="700" fill="var(--mz-fg-strong)" letter-spacing="0.06em">${SUBMED_SHORT[sm.key]}</text>
        <text x="${(x + dx).toFixed(1)}" y="${(y + 13).toFixed(1)}" text-anchor="${anchor}" font-family="Bebas Neue" font-size="22" fill="${vColor}" letter-spacing="0.04em">${v}</text>
      `;
    }).join('');

    // pontos nos vértices
    const dots = dataPts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.6" fill="${color}" stroke="var(--mz-bg-page)" stroke-width="1.5"/>`).join('');

    // grid level labels
    const gridLabels = gridLevels.map(lvl => {
      const r = R * (lvl / 100);
      return `<text x="${cx + 4}" y="${cy - r + 3}" font-family="JetBrains Mono" font-size="8" fill="var(--mz-fg-faint)" letter-spacing="0.04em">${lvl}</text>`;
    }).join('');

    $('#hex-canvas').innerHTML = `
      <div class="hex-head">
        <h1><span>Score · Saúde da Comissão Municipal</span>${c.nm}, ${c.uf}</h1>
        <div class="score-big ${tier}">${score}<small>/100 · ${tierLbl}</small></div>
      </div>
      <svg class="hex-svg" viewBox="0 0 540 560" preserveAspectRatio="xMidYMid meet">
        ${gridPaths}
        ${axes}
        ${gridLabels}
        <polygon points="${polyPts}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="2.6" stroke-linejoin="round"/>
        ${dots}
        ${labels}
        <circle cx="${cx}" cy="${cy}" r="38" fill="var(--mz-bg-card)" stroke="${color}" stroke-width="1.2"/>
        <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-family="Bebas Neue" font-size="32" fill="${color}" letter-spacing="0.02em">${score}</text>
      </svg>
      <div class="hex-legend">
        ${D.SUBMEDIDAS.map(sm => {
          const v = c.scores[sm.key];
          const t = tierFromScore(v);
          return `
            <div class="item">
              <div class="top"><div class="nm">${sm.nm}</div><div class="v ${t}">${v}</div></div>
              <div class="desc">${sm.desc}</div>
              <div class="bar"><span style="width: ${v}%; background: ${tierColor(t)};"></span></div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderHexFlags() {
    const c = D.COMISSOES.find(c => c.id === activeHex);
    const score = calcScore(c.scores);
    const root = $('#hex-flags');
    root.innerHTML = `
      <h3>Identificação</h3>
      <div style="background: var(--mz-bg-card); border: 1px solid var(--mz-rule); border-radius: 10px; padding: 14px; margin-bottom: 18px;">
        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--mz-tenant-primary); color: var(--mz-tenant-accent); display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue'; font-size: 14px;">${c.pres.av}</div>
          <div>
            <div style="font-size: 12.5px; font-weight: 700; color: var(--mz-fg-strong);">${c.pres.nm}</div>
            <div style="font-size: 10.5px; color: var(--mz-fg-faint);">${c.pres.cargo}</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 10px; border-top: 1px solid var(--mz-hairline); font-size: 11px;">
          <div><div style="font-size: 9px; letter-spacing: 0.10em; color: var(--mz-fg-faint); text-transform: uppercase; font-weight: 700;">Pop.</div><div style="font-family: 'JetBrains Mono'; color: var(--mz-fg-strong); font-weight: 700; margin-top: 2px;">${fmt(c.pop)}</div></div>
          <div><div style="font-size: 9px; letter-spacing: 0.10em; color: var(--mz-fg-faint); text-transform: uppercase; font-weight: 700;">Filiados</div><div style="font-family: 'JetBrains Mono'; color: var(--mz-fg-strong); font-weight: 700; margin-top: 2px;">${fmt(c.filiados)}</div></div>
          <div><div style="font-size: 9px; letter-spacing: 0.10em; color: var(--mz-fg-faint); text-transform: uppercase; font-weight: 700;">Candidatos</div><div style="font-family: 'JetBrains Mono'; color: var(--mz-fg-strong); font-weight: 700; margin-top: 2px;">${c.candidatos}</div></div>
          <div><div style="font-size: 9px; letter-spacing: 0.10em; color: var(--mz-fg-faint); text-transform: uppercase; font-weight: 700;">Mandato</div><div style="font-family: 'JetBrains Mono'; color: var(--mz-fg-strong); font-weight: 700; margin-top: 2px; font-size: 10.5px;">${c.mandato}</div></div>
        </div>
      </div>

      <h3>Sinalizações ${c.flags.length ? `· ${c.flags.length}` : ''}</h3>
      ${c.flags.length ? c.flags.map(f => `
        <div class="flag-card ${f.tipo}">
          <div class="ic">${f.tipo === 'danger' ? '✕ Crítico' : f.tipo === 'warn' ? '! Atenção' : 'i Informativo'}</div>
          <div style="margin-top: 4px;">${f.label}</div>
        </div>
      `).join('') : `
        <div style="font-size: 11.5px; color: var(--mz-ok); padding: 12px 14px; background: rgba(34,197,94,0.10); border: 1px solid rgba(34,197,94,0.25); border-radius: 10px;">
          ✓ Nenhuma sinalização ativa<br><span style="color: var(--mz-fg-muted); font-weight: 500;">Comissão dentro dos parâmetros estatutários.</span>
        </div>
      `}

      <h3>Última atualização</h3>
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--mz-fg-muted); padding: 10px 14px; background: var(--mz-bg-card); border: 1px solid var(--mz-rule); border-radius: 8px;">
        ${c.ult_atualizacao}
      </div>
    `;
  }

  /* ============================================================
     VIEW 2 · HEATMAP SP
     ============================================================ */
  function renderMap() {
    // sidebar esq
    $('#map-side').innerHTML = `
      <h3>Camada ativa</h3>
      <div style="background: var(--mz-bg-card); border: 1px solid var(--mz-tenant-accent); border-radius: 8px; padding: 10px 12px; font-size: 12px; color: var(--mz-fg-strong); font-weight: 600;">
        Saúde das Nominatas
        <div style="font-size: 10.5px; color: var(--mz-fg-faint); margin-top: 3px; font-weight: 500;">Score por comissão municipal</div>
      </div>
      <h3>Legenda · score</h3>
      <div class="legend-row"><div class="sw" style="background: #22c55e;"></div><b style="font-weight: 600;">Saudável</b><span style="margin-left: auto; font-family: 'JetBrains Mono'; color: var(--mz-fg-faint);">≥ 75</span></div>
      <div class="legend-row"><div class="sw" style="background: #f59e0b;"></div><b style="font-weight: 600;">Atenção</b><span style="margin-left: auto; font-family: 'JetBrains Mono'; color: var(--mz-fg-faint);">55-74</span></div>
      <div class="legend-row"><div class="sw" style="background: #f87171;"></div><b style="font-weight: 600;">Crítica</b><span style="margin-left: auto; font-family: 'JetBrains Mono'; color: var(--mz-fg-faint);">&lt; 55</span></div>
      <h3>Outras camadas</h3>
      <div class="legend-row" style="opacity: 0.6;"><div class="sw" style="background: var(--mz-rule-strong);"></div>Densidade filiados</div>
      <div class="legend-row" style="opacity: 0.6;"><div class="sw" style="background: var(--mz-rule-strong);"></div>Histórico eleitoral</div>
      <div class="legend-row" style="opacity: 0.6;"><div class="sw" style="background: var(--mz-rule-strong);"></div>Emendas executadas</div>
      <h3>Filtros</h3>
      <div style="font-size: 11.5px; color: var(--mz-fg-muted); line-height: 1.6;">
        <label style="display: flex; gap: 6px; align-items: center; margin: 4px 0;"><input type="checkbox" checked> Saudáveis (≥75)</label>
        <label style="display: flex; gap: 6px; align-items: center; margin: 4px 0;"><input type="checkbox" checked> Atenção (55-74)</label>
        <label style="display: flex; gap: 6px; align-items: center; margin: 4px 0;"><input type="checkbox" checked> Críticas (&lt;55)</label>
      </div>
    `;

    // sidebar dir
    const all = [...D.COMISSOES.map(c => ({...c, score: calcScore(c.scores)})), ...D.COMISSOES_SECUNDARIAS];
    const tot = all.length;
    const ok = all.filter(c => c.tier === 'ok').length;
    const high = all.filter(c => c.tier === 'high').length;
    const crit = all.filter(c => c.tier === 'crit').length;
    $('#map-side2').innerHTML = `
      <h3>Resumo · ${tot} amostradas</h3>
      <div class="summary-row"><b>Saudáveis</b><span style="color: #22c55e;">${ok}</span></div>
      <div class="summary-row"><b>Em atenção</b><span style="color: #f59e0b;">${high}</span></div>
      <div class="summary-row"><b>Críticas</b><span style="color: #f87171;">${crit}</span></div>
      <div class="summary-row"><b>Score médio SP</b><span>${Math.round(all.reduce((a,c)=>a+c.score,0)/tot)}</span></div>
      <h3>Comissão selecionada</h3>
      <div id="map-mun-detail">
        <div style="font-size: 11.5px; color: var(--mz-fg-muted); padding: 10px 12px; background: var(--mz-bg-card); border: 1px solid var(--mz-rule); border-radius: 8px;">
          Clique em um município no mapa para detalhar.
        </div>
      </div>
      <h3>Atalhos</h3>
      <button style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid var(--mz-rule); background: var(--mz-bg-card); color: var(--mz-fg); font-size: 11.5px; font-weight: 600; cursor: pointer; margin-bottom: 6px;">→ Ver ranking estadual</button>
      <button style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid var(--mz-rule); background: var(--mz-bg-card); color: var(--mz-fg); font-size: 11.5px; font-weight: 600; cursor: pointer; margin-bottom: 6px;">→ Exportar shapefile</button>
      <button style="width: 100%; padding: 9px; border-radius: 8px; border: 1px solid var(--mz-rule); background: var(--mz-bg-card); color: var(--mz-fg); font-size: 11.5px; font-weight: 600; cursor: pointer;">→ Histórico do score</button>
    `;

    // SVG do mapa SP simplificado
    // contorno SP estilizado (silhueta-aproximação)
    const spOutline = "M 90 380 L 130 320 L 200 290 L 280 285 L 360 295 L 430 305 L 510 320 L 580 340 L 640 365 L 660 410 L 650 465 L 620 500 L 590 535 L 555 565 L 510 595 L 450 615 L 380 615 L 320 605 L 270 590 L 220 565 L 175 530 L 140 490 L 110 445 L 90 410 Z";
    const points = [...D.COMISSOES.map(c => {
      // posicionar as 3 principais com coords aproximadas
      const coords = { bauru: {x: 360, y: 410}, marilia: {x: 290, y: 425}, tatui: {x: 432, y: 488} };
      return { ...c, x: coords[c.id].x, y: coords[c.id].y, score: calcScore(c.scores), highlight: true };
    }), ...D.COMISSOES_SECUNDARIAS];

    $('#sp-map').innerHTML = `
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="var(--mz-tenant-primary)" stop-opacity="0.10"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--mz-rule)" stroke-width="0.5" stroke-opacity="0.3"/>
        </pattern>
      </defs>
      <rect width="700" height="720" fill="url(#bgGlow)"/>
      <path d="${spOutline}" fill="var(--mz-bg-card)" stroke="var(--mz-rule-strong)" stroke-width="1.5"/>
      <path d="${spOutline}" fill="url(#hatch)" stroke="none"/>
      <text x="92" y="370" font-family="JetBrains Mono" font-size="9" fill="var(--mz-fg-faint)" letter-spacing="0.10em">SP · 645 MUN.</text>
      ${points.map(p => {
        const r = p.highlight ? 14 : 6 + Math.log10(Math.max(50_000, p.pop)) - 4;
        const col = p.tier === 'ok' ? '#22c55e' : p.tier === 'high' ? '#f59e0b' : '#f87171';
        return `
          <g class="map-mun" data-id="${p.id}" style="cursor: pointer;">
            ${p.highlight ? `<circle cx="${p.x}" cy="${p.y}" r="${r + 8}" fill="${col}" fill-opacity="0.10"><animate attributeName="r" from="${r + 4}" to="${r + 14}" dur="2.4s" repeatCount="indefinite"/><animate attributeName="fill-opacity" from="0.2" to="0" dur="2.4s" repeatCount="indefinite"/></circle>` : ''}
            <circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${col}" fill-opacity="${p.highlight ? 0.85 : 0.65}" stroke="var(--mz-bg-page)" stroke-width="1.5"/>
            ${p.highlight ? `<text x="${p.x}" y="${p.y + 3.5}" text-anchor="middle" font-family="Bebas Neue" font-size="12" fill="#fff" letter-spacing="0.04em">${p.score}</text>` : ''}
          </g>
        `;
      }).join('')}
      ${D.COMISSOES.map(c => {
        const coords = { bauru: {x: 360, y: 410}, marilia: {x: 290, y: 425}, tatui: {x: 432, y: 488} };
        const x = coords[c.id].x, y = coords[c.id].y;
        const lblY = c.id === 'tatui' ? y + 32 : y - 22;
        return `<text x="${x}" y="${lblY}" text-anchor="middle" font-family="Inter" font-size="11" font-weight="700" fill="var(--mz-fg-strong)" letter-spacing="0.04em">${c.nm.toUpperCase()}</text>`;
      }).join('')}
    `;

    // wire clicks
    $$('#sp-map .map-mun').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const c = D.COMISSOES.find(c => c.id === id) || D.COMISSOES_SECUNDARIAS.find(c => c.id === id);
        if (!c) return;
        const score = c.scores ? calcScore(c.scores) : c.score;
        const isMain = !!c.scores;
        const col = c.tier === 'ok' ? '#22c55e' : c.tier === 'high' ? '#f59e0b' : '#f87171';
        $('#map-mun-detail').innerHTML = `
          <div class="map-mun-card">
            <div class="nm">${c.nm} · SP</div>
            <div class="meta">${fmt(c.pop)} habitantes${isMain ? ` · ${c.area}` : ''}</div>
            <div style="display: flex; align-items: center; gap: 12px; margin: 12px 0; padding: 10px 0; border-top: 1px solid var(--mz-hairline); border-bottom: 1px solid var(--mz-hairline);">
              <div style="font-family: 'Bebas Neue'; font-size: 38px; line-height: 1; color: ${col};">${score}</div>
              <div>
                <div style="font-size: 9px; letter-spacing: 0.14em; color: var(--mz-fg-faint); text-transform: uppercase; font-weight: 700;">Score Saúde</div>
                <div style="font-size: 11px; color: var(--mz-fg); font-weight: 600;">${c.tier === 'ok' ? 'Saudável' : c.tier === 'high' ? 'Em atenção' : 'Crítica'}</div>
              </div>
            </div>
            ${isMain ? `
              <div class="row"><b>Filiados</b><span>${fmt(c.filiados)}</span></div>
              <div class="row"><b>Candidatos</b><span>${c.candidatos}</span></div>
              <div class="row"><b>Sinalizações</b><span style="color: ${c.flags.length ? col : '#22c55e'};">${c.flags.length || 0}</span></div>
              <button style="width: 100%; margin-top: 10px; padding: 8px; border-radius: 6px; border: 1px solid var(--mz-tenant-accent); background: var(--mz-tenant-accent-soft); color: var(--mz-tenant-accent); font-size: 11.5px; font-weight: 700; cursor: pointer;">Abrir dossiê completo →</button>
            ` : `
              <div class="row"><b>Disponibilidade</b><span style="color: var(--mz-fg-faint);">amostra</span></div>
              <div style="font-size: 10.5px; color: var(--mz-fg-faint); margin-top: 8px; line-height: 1.5;">Comissões secundárias têm dados resumidos. Para dossiê completo, ative o coletor.</div>
            `}
          </div>
        `;
      });
    });
  }

  /* ============================================================
     VIEW 3 · RANKING
     ============================================================ */
  function renderRank() {
    const all = [
      ...D.COMISSOES.map(c => ({...c, score: calcScore(c.scores)})),
      ...D.COMISSOES_SECUNDARIAS.map(c => ({...c, candidatos: '–', filiados: null}))
    ].sort((a, b) => b.score - a.score);

    $('#rank-wrap').innerHTML = `
      <div class="rank-head">
        <h1><span>Ranking estadual · saúde da nominata</span>3 comissões em destaque + amostragem</h1>
        <p>O score Saúde de Comissão consolida sete sub-medidas estatutárias e legais (paridade, vinculação territorial, conformidade documental, etc) numa nota única de 0–100. Comparativo entre comissões municipais escolhidas como exemplares para validação do método.</p>
      </div>

      <div class="rank-cards">
        ${D.COMISSOES.map(c => {
          const s = calcScore(c.scores);
          const tier = c.tier;
          const tierLbl = tier === 'ok' ? 'SAUDÁVEL' : tier === 'high' ? 'ATENÇÃO' : 'CRÍTICA';
          const flagsList = c.flags.length ? c.flags.slice(0, 4).map(f => `
            <div class="ln ${f.tipo}"><span class="ic">${f.tipo === 'danger' ? '✕' : f.tipo === 'warn' ? '!' : 'i'}</span><span>${f.label}</span></div>
          `).join('') + (c.flags.length > 4 ? `<div class="ln" style="color: var(--mz-fg-faint); font-style: italic;"><span></span><span>+ ${c.flags.length - 4} sinalização(ões) adicional(is)</span></div>` : '') : `<div class="empty">✓ Nenhuma sinalização — dentro dos parâmetros</div>`;

          return `
            <div class="rank-card ${tier}">
              <div class="head">
                <div class="av">${c.pres.av}</div>
                <div class="info"><b>${c.nm}, ${c.uf}</b><span>${c.pres.nm}</span></div>
              </div>
              <div class="score-row">
                <div class="lbl">Score Saúde · ${tierLbl}</div>
                <div class="v ${tier}">${s}<small> /100</small></div>
              </div>
              <div class="stats">
                <div class="s"><div class="lbl">População</div><div class="v">${fmt(c.pop)}</div></div>
                <div class="s"><div class="lbl">Filiados</div><div class="v">${fmt(c.filiados)}</div></div>
                <div class="s"><div class="lbl">Candidatos</div><div class="v">${c.candidatos}</div></div>
                <div class="s"><div class="lbl">Mandato</div><div class="v" style="font-size: 11.5px;">${c.mandato}</div></div>
                <div class="s"><div class="lbl">Paridade gênero</div><div class="v">${c.scores.paridade}</div></div>
                <div class="s"><div class="lbl">Conformidade doc.</div><div class="v">${c.scores.documental}</div></div>
              </div>
              <div class="flag-list">
                <div class="ttl">Sinalizações ${c.flags.length ? `· ${c.flags.length}` : ''}</div>
                ${flagsList}
              </div>
              <div class="cta"><button onclick="document.querySelector('[data-tab=&quot;dossie&quot;]').click()">Abrir dossiê detalhado →</button></div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="rank-table">
        <h2>Amostra estadual · 18 comissões <span>de 645 municípios SP · ordenadas por score decrescente</span></h2>
        ${all.map((c, i) => {
          const col = c.tier === 'ok' ? '#22c55e' : c.tier === 'high' ? '#f59e0b' : '#f87171';
          const isMain = !!c.scores;
          return `
            <div class="row" data-id="${c.id}">
              <div class="pos">#${String(i+1).padStart(2,'0')}</div>
              <div class="nm">${c.nm}${isMain ? ' <small style="color: var(--mz-tenant-accent); font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">★ destaque</small>' : ''}<small>${fmt(c.pop)} hab</small></div>
              <div class="pop">${isMain ? fmt(c.filiados) + ' fil.' : '—'}</div>
              <div class="bar-wrap"><span style="width: ${c.score}%; background: ${col};"></span></div>
              <div class="score-pill ${c.tier}">${c.score}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /* ============================================================
     VIEW 4 · DOSSIÊ COMISSÃO (focado em Tatuí — caso crítico)
     ============================================================ */
  function renderDossie() {
    const c = D.COMISSOES.find(c => c.id === 'tatui');
    const score = calcScore(c.scores);

    $('#dos-toc').innerHTML = `
      <h3>Dossiê · navegação</h3>
      <div class="toc-item active"><span class="num">01</span><span>Identificação</span></div>
      <div class="toc-item"><span class="num">02</span><span>Sub-medidas do score</span></div>
      <div class="toc-item"><span class="num">03</span><span>Sinalizações ativas</span></div>
      <div class="toc-item"><span class="num">04</span><span>Pulso de filiação</span></div>
      <div class="toc-item"><span class="num">05</span><span>Cronologia da comissão</span></div>
      <div class="toc-item"><span class="num">06</span><span>Conformidade jurídica</span></div>
      <div class="toc-item"><span class="num">07</span><span>Recomendações Mazzel</span></div>
      <h3 style="margin-top: 26px;">Outras comissões</h3>
      <div class="toc-item"><span class="num">→</span><span>Bauru (saudável)</span></div>
      <div class="toc-item"><span class="num">→</span><span>Marília (atenção)</span></div>
    `;

    // sub-medidas em grid
    const submed = D.SUBMEDIDAS.map(sm => {
      const v = c.scores[sm.key];
      const t = tierFromScore(v);
      const tierLbl = t === 'ok' ? 'OK' : t === 'high' ? 'ATENÇÃO' : 'CRÍTICO';
      return `
        <div class="cell ${t === 'crit' ? 'danger' : t === 'high' ? 'warn' : ''}">
          <div class="lbl">${sm.nm} · peso ${sm.peso}</div>
          <div class="v" style="color: ${tierColor(t)};">${v}<span style="font-size: 12px; color: var(--mz-fg-faint); font-family: 'Inter'; font-weight: 600;">/100</span></div>
          <div class="sub">${sm.desc}</div>
          <div style="margin-top: 8px; height: 4px; background: var(--mz-bg-elevated); border-radius: 2px; overflow: hidden;"><span style="display: block; height: 100%; width: ${v}%; background: ${tierColor(t)};"></span></div>
        </div>
      `;
    }).join('');

    // pulso filiação — micro spark
    const pulseData = [3, 5, 4, 7, 6, 5, 8, 4, 6, 5, 7, 4, 412, 8, 6, 5, 7, 6, 4, 5];
    const max = Math.max(...pulseData);
    const sparkW = 600, sparkH = 100;
    const bars = pulseData.map((v, i) => {
      const h = (v / max) * sparkH;
      const x = i * (sparkW / pulseData.length);
      const w = (sparkW / pulseData.length) - 2;
      const isPulse = v > 50;
      return `<rect x="${x}" y="${sparkH - h}" width="${w}" height="${h}" fill="${isPulse ? '#dc2626' : 'var(--mz-rule-strong)'}" rx="1"/>`;
    }).join('');

    $('#dos-body').innerHTML = `
      <div class="dos-hero">
        <div>
          <div class="id-row">
            <div class="id">DOS-NOMINATA-TATUI-2026</div>
            <div class="chip danger">DILIGÊNCIA ABERTA</div>
          </div>
          <h1>${c.nm}, ${c.uf}</h1>
          <div class="sub">Comissão Municipal União Brasil · presidida por <b>${c.pres.nm}</b> · mandato <b>${c.mandato}</b></div>
          <div class="meta">
            <div class="item"><div class="lbl">População</div><div class="val">${fmt(c.pop)} hab</div></div>
            <div class="item"><div class="lbl">Região</div><div class="val">${c.area}</div></div>
            <div class="item"><div class="lbl">Filiados</div><div class="val">${fmt(c.filiados)}</div></div>
            <div class="item"><div class="lbl">Candidatos nominados</div><div class="val">${c.candidatos}</div></div>
          </div>
        </div>
        <div class="score-card">
          <div class="lbl">Score Saúde Comissão</div>
          <div class="v crit">${score}<span style="font-size: 16px; color: var(--mz-fg-faint); font-family: 'Inter'; font-weight: 600;"> /100</span></div>
          <div class="ttl" style="color: var(--mz-danger);">CRÍTICA · 6 sinalizações</div>
          <div class="desc">Comissão fora dos parâmetros estatutários e legais em pelo menos quatro das sete sub-medidas. Recomenda-se intervenção imediata.</div>
          <hr>
          <div style="font-size: 10.5px; color: var(--mz-fg-faint); line-height: 1.5;">${c.ult_atualizacao}</div>
        </div>
      </div>

      <section class="sec">
        <h2><span class="num">02</span>Sub-medidas do score <span class="extra">média ponderada · 7 critérios</span></h2>
        <div class="grid-3">${submed}</div>
      </section>

      <section class="sec">
        <h2><span class="num">03</span>Sinalizações ativas <span class="extra">${c.flags.length} flags abertas</span></h2>
        ${c.flags.map(f => `
          <div class="alert-tile ${f.tipo === 'danger' ? 'crit' : 'high'}">
            <div class="ic">${f.tipo === 'danger' ? '✕' : '!'}</div>
            <div>
              <div class="nm">${f.label.split(' · ')[0]}</div>
              <div class="desc">${f.label}</div>
              <div class="meta">FONTE: cron Mazzel · LÓGICA: validador estatutário/legal · CONFIANÇA: alta</div>
            </div>
          </div>
        `).join('')}
      </section>

      <section class="sec">
        <h2><span class="num">04</span>Pulso de filiação · 20 dias <span class="extra">eixo: filiações/dia · pico de 412 em 18/03</span></h2>
        <div style="background: var(--mz-bg-card); border: 1px solid var(--mz-rule); border-radius: 10px; padding: 18px;">
          <svg viewBox="0 0 ${sparkW} ${sparkH + 24}" width="100%" preserveAspectRatio="none" style="display: block;">
            <line x1="0" y1="${sparkH}" x2="${sparkW}" y2="${sparkH}" stroke="var(--mz-rule)" stroke-width="0.5"/>
            ${bars}
            <text x="${(12 * sparkW / 20) - 4}" y="${sparkH - (412/max)*sparkH - 4}" text-anchor="middle" font-family="Bebas Neue" font-size="13" fill="#dc2626" letter-spacing="0.02em">412 ▲</text>
            <text x="0" y="${sparkH + 18}" font-family="JetBrains Mono" font-size="9" fill="var(--mz-fg-faint)">06/MAR</text>
            <text x="${sparkW - 60}" y="${sparkH + 18}" font-family="JetBrains Mono" font-size="9" fill="var(--mz-fg-faint)">25/MAR</text>
          </svg>
          <div style="margin-top: 14px; padding: 12px 14px; background: var(--mz-danger-soft); border-radius: 8px; border: 1px solid rgba(248,113,113,0.25); font-size: 11.5px; color: var(--mz-fg); line-height: 1.55;">
            <b style="color: var(--mz-danger);">Padrão atípico detectado · ALN-3829.</b> 412 filiações em 1 dia (18/03/2025) · 21× a média móvel histórica. Pode indicar mobilização legítima OU lista pré-fabricada para garantir maioria em convenção. Investigar manualmente: cruzar nomes com base estadual e verificar abonadores.
          </div>
        </div>
      </section>

      <section class="sec">
        <h2><span class="num">05</span>Cronologia da comissão</h2>
        <div class="timeline">
          <div class="tl-item">
            <div class="dot"></div>
            <div class="head"><div class="stage">Comissão constituída</div><div class="when">12/JUN/2024</div></div>
            <div class="body">Eleita em convenção com 142 filiados presentes. Quórum regular. Ata protocolada na Justiça Eleitoral.</div>
          </div>
          <div class="tl-item warn">
            <div class="dot"></div>
            <div class="head"><div class="stage">Prestação de contas TSE 2024</div><div class="when">VENCEU 31/DEZ/2024</div></div>
            <div class="body">Prestação não protocolada · em mora há 4 meses. Risco de indeferimento da nominata 2026 conforme Resolução TSE 23.553/2017.</div>
          </div>
          <div class="tl-item danger">
            <div class="dot"></div>
            <div class="head"><div class="stage">Pulso de filiação anômalo</div><div class="when">18/MAR/2025</div></div>
            <div class="body">412 novos filiados em 1 dia · pico isolado · 21× a média móvel. Cruzamento com base estadual em andamento.</div>
          </div>
          <div class="tl-item warn">
            <div class="dot"></div>
            <div class="head"><div class="stage">Nominata pré-2026 publicada</div><div class="when">02/ABR/2026</div></div>
            <div class="body">22 candidatos. Cota de gênero 18% (abaixo dos 30% legais). 9 sem domicílio eleitoral local. 4 com Ficha Limpa pendente.</div>
          </div>
          <div class="tl-item">
            <div class="dot"></div>
            <div class="head"><div class="stage">Próximo evento estatutário</div><div class="when">JUN/2026</div></div>
            <div class="body">Convenção municipal · janela de 5/jun a 5/ago para registro de candidaturas (TSE).</div>
          </div>
        </div>
      </section>

      <section class="sec">
        <h2><span class="num">06</span>Conformidade jurídica</h2>
        <div class="grid-2">
          <div class="cell danger">
            <div class="lbl">Lei 9.504/97 · cota de gênero</div>
            <div class="v" style="color: var(--mz-danger); font-size: 22px;">FORA · 18% &lt; 30%</div>
            <div class="sub">Risco de impugnação da chapa por TSE/MP Eleitoral. Mitigação: substituir 3 candidatos por candidaturas femininas até registro.</div>
          </div>
          <div class="cell danger">
            <div class="lbl">LC 135/2010 · Ficha Limpa</div>
            <div class="v" style="color: var(--mz-danger); font-size: 22px;">4 PENDÊNCIAS</div>
            <div class="sub">Cruzamento CNJ × TJ-SP × TRE pendente. Validação manual obrigatória antes do registro.</div>
          </div>
          <div class="cell danger">
            <div class="lbl">Res. TSE 23.553/17 · prestação de contas</div>
            <div class="v" style="color: var(--mz-danger); font-size: 22px;">EM MORA · 4 MESES</div>
            <div class="sub">Sem protocolo TSE 2024. Recomenda-se regularização imediata via PSPN/Sistema TSE.</div>
          </div>
          <div class="cell warn">
            <div class="lbl">Estatuto art. 38 · vinculação local</div>
            <div class="v" style="color: var(--mz-warn); font-size: 22px;">9 / 22 SEM DOMICÍLIO</div>
            <div class="sub">9 candidatos com domicílio eleitoral fora de Tatuí. 6 com origem geográfica em Sorocaba (cluster suspeito).</div>
          </div>
        </div>
      </section>

      <section class="sec" style="border-bottom: 0;">
        <h2><span class="num">07</span>Recomendações Mazzel <span class="extra">priorizadas</span></h2>
        <div style="background: var(--mz-bg-card); border-left: 4px solid var(--mz-tenant-accent); border-radius: 0 10px 10px 0; padding: 16px 20px;">
          <ol style="margin: 0; padding-left: 18px; font-size: 12.5px; color: var(--mz-fg); line-height: 1.7;">
            <li><b>Regularizar prestação de contas TSE 2024</b> — protocolar via PSPN nos próximos 7 dias para evitar indeferimento da nominata.</li>
            <li><b>Auditar pulso de filiação 18/03</b> — cruzar 412 nomes com base estadual e verificar abonadores. Convocar presidência para esclarecimento.</li>
            <li><b>Substituir candidaturas para conformidade de gênero</b> — adicionar 3 candidatas mulheres para atingir 30% mínimo legal.</li>
            <li><b>Validar Ficha Limpa</b> — finalizar cruzamento dos 4 candidatos pendentes antes de 5/jun (janela de registro).</li>
            <li><b>Reanalisar cluster Sorocaba</b> — entrevistar os 6 candidatos para verificar vínculo real com Tatuí.</li>
            <li><b>Notificar Comissão Estadual UB-SP</b> — submeter dossiê para deliberação em reunião executiva.</li>
          </ol>
        </div>
      </section>
    `;
  }

  /* ============================================================
     VIEW 5 · ALERTAS ANTI-FRAUDE
     ============================================================ */
  function renderAlertas() {
    // group por tag temporal
    const groups = [
      { tag: 'AGORA', title: 'Em curso · últimas 6h' },
      { tag: '24h', title: 'Últimas 24 horas' },
      { tag: 'semana', title: 'Esta semana' },
    ];

    $('#ale-feed').innerHTML = `
      <h2><span>Sistema de alertas · Saúde da Nominata</span>Padrões atípicos detectados pelo cron Mazzel</h2>
      <div class="neutro-note">
        <b>Nota de linguagem.</b> Os alertas usam linguagem neutra e descritiva — "padrão atípico", "concentração de origem", "filiação em pulso" — para sinalizar desvios estatísticos ou estatutários sem prejulgar intenção. A interpretação cabe à Comissão Estadual e, quando aplicável, ao Conselho de Ética. <b>Mazzel sinaliza, não acusa.</b>
      </div>

      ${groups.map(g => {
        const items = D.ALERTAS.filter(a => a.when_tag === g.tag);
        if (!items.length) return '';
        return `
          <div class="ale-group">
            <div class="head">
              <div class="when">${g.title}</div>
              <div class="ct">${items.length} alerta${items.length > 1 ? 's' : ''}</div>
            </div>
            ${items.map(a => `
              <div class="ale-item ${a.sev}" data-id="${a.id}">
                <div class="ic">${a.sev === 'crit' ? '✕' : a.sev === 'high' ? '!' : 'i'}</div>
                <div>
                  <div class="head-row">
                    <span class="sev">${a.sev === 'crit' ? 'CRÍTICO' : a.sev === 'high' ? 'ALTO' : 'MÉDIO'}</span>
                    <span class="ttl">${a.titulo}</span>
                  </div>
                  <div class="desc">${a.desc}</div>
                  <div class="logica">LÓGICA: ${a.logica} · TARGET: ${a.target} · ID ${a.id}</div>
                </div>
                <div class="meta">
                  <div class="when">${a.when}</div>
                  <div class="channels">${a.channels.map(ch => `<span class="ch">${ch}</span>`).join('')}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }).join('')}
    `;

    $('#ale-side').innerHTML = `
      <h3>Resumo · 30 dias</h3>
      <div class="summary-row" style="display: flex; justify-content: space-between; padding: 7px 0; font-size: 11.5px; border-bottom: 1px solid var(--mz-rule);"><b style="color: var(--mz-fg-strong); font-weight: 600;">Críticos</b><span style="font-family: 'JetBrains Mono'; color: #f87171; font-weight: 700;">3</span></div>
      <div class="summary-row" style="display: flex; justify-content: space-between; padding: 7px 0; font-size: 11.5px; border-bottom: 1px solid var(--mz-rule);"><b style="color: var(--mz-fg-strong); font-weight: 600;">Altos</b><span style="font-family: 'JetBrains Mono'; color: #f59e0b; font-weight: 700;">5</span></div>
      <div class="summary-row" style="display: flex; justify-content: space-between; padding: 7px 0; font-size: 11.5px; border-bottom: 1px solid var(--mz-rule);"><b style="color: var(--mz-fg-strong); font-weight: 600;">Médios</b><span style="font-family: 'JetBrains Mono'; color: #60a5fa; font-weight: 700;">12</span></div>
      <div class="summary-row" style="display: flex; justify-content: space-between; padding: 7px 0; font-size: 11.5px;"><b style="color: var(--mz-fg-strong); font-weight: 600;">Resolvidos</b><span style="font-family: 'JetBrains Mono'; color: var(--mz-ok); font-weight: 700;">9 / 20</span></div>

      <h3>Regras configuradas · ${D.REGRAS.length}</h3>
      ${D.REGRAS.map(r => `
        <div class="rule-card ${r.sev}">
          <div class="nm">${r.nm}</div>
          <div class="desc">${r.desc}</div>
          <div class="channels">${r.channels.map(ch => `<span class="ch">${ch}</span>`).join('')}</div>
          <div class="freq">FREQ · ${r.freq}</div>
        </div>
      `).join('')}

      <h3>Política de comunicação</h3>
      <div style="font-size: 11px; color: var(--mz-fg-muted); line-height: 1.6; padding: 10px 12px; background: var(--mz-bg-card); border: 1px solid var(--mz-rule); border-radius: 8px;">
        Alertas críticos vão para <b style="color: var(--mz-fg);">presidência estadual + jurídico</b> via push e email.<br>
        Alertas altos vão para <b style="color: var(--mz-fg);">comissão municipal + jurídico</b> via email.<br>
        Alertas médios ficam na timeline do dossiê.
      </div>
    `;
  }

  /* ============ INIT ============ */
  renderHexSide();
  renderHexCanvas();
  renderHexFlags();
  renderMap();
  renderRank();
  renderDossie();
  renderAlertas();
})();
