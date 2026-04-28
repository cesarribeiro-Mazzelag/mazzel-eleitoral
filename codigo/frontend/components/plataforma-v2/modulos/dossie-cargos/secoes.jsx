"use client";

/* Dossie 8 Cargos · render functions por seção
 * 1:1 com Designer V1.2 (.app.js linhas 711-891)
 *
 * Cada função recebe role e retorna JSX da seção.
 * Quando role.placeholder.includes(secao_id), CONTENT pode retornar
 * placeholder específico (fin/emendas/votos têm fallback explícito).
 */

import { MAP_CTX, MAP_SHAPES, heatColor } from "./dados";

/* ============ Cenário Político ============ */
export function renderCenario() {
  return (
    <div style={iaBoxStyle}>
      <div style={iaIconStyle}>⚡</div>
      <div style={iaMsgStyle}>
        <b style={{ color: "var(--mz-tenant-accent)" }}>Cenário 7d:</b> assinatura do contrato
        de Educação SP elevou exposição em <b style={{ color: "var(--mz-tenant-accent)" }}>+18%</b>.
        Aprovação cruzou 70% nas faixas C/D. Risco emergente: PSD anunciou pré-candidato em
        Campinas (impacto baixo no curto, monitoramento ativo).
        <span style={iaSrcStyle}>IA · processou 1.247 fontes · DOU + clipping + redes</span>
      </div>
    </div>
  );
}

/* ============ Mapa Eleitoral · placeholder geográfico do MapaEleitoral.tsx ============
 * Substitui o grid quadriculado abstrato (bug) por SVG poligonal com gradiente
 * Globo G1 (azul→âmbar→vermelho). Preview - quando integrar com /mapa real,
 * pluga MapaEleitoral.tsx em modo preview aqui.
 */
export function renderMapa(role) {
  const ctx = MAP_CTX[role.id] || MAP_CTX._default;
  const shape = MAP_SHAPES[ctx.shape] || MAP_SHAPES.br;

  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, rgba(0,42,123,0.06), rgba(0,42,123,0.02)), var(--mz-bg-card-2)",
        borderRadius: 8,
        padding: 14,
        display: "grid",
        gridTemplateColumns: "1.5fr 1fr",
        gap: 14,
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          borderRadius: 4,
          overflow: "hidden",
          background: "radial-gradient(120% 120% at 50% 110%, rgba(0,42,123,0.18), transparent 60%), #07070a",
          border: "1px solid var(--mz-rule)",
          minHeight: 200,
        }}
      >
        <span style={mapTagStyle("top-left")}>🗺 MapaEleitoral.tsx · preview</span>
        <span style={mapTagStyle("bottom-right")}>{ctx.ctx}</span>
        <div style={{ position: "absolute", bottom: 6, left: 8, display: "flex", gap: 2, alignItems: "center" }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "var(--mz-fg-faint)", margin: "0 4px" }}>
            menos
          </span>
          {["#1e3a8a", "#1d4ed8", "#2563eb", "#f59e0b", "#fb923c", "#dc2626"].map((c) => (
            <span key={c} style={{ width: 10, height: 5, display: "block", background: c }} />
          ))}
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "var(--mz-fg-faint)", margin: "0 4px" }}>
            mais
          </span>
        </div>
        <svg
          viewBox="0 0 280 200"
          preserveAspectRatio="xMidYMid meet"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <g stroke="rgba(255,255,255,0.04)" strokeWidth="0.4">
            <line x1="0"   y1="50"  x2="280" y2="50" />
            <line x1="0"   y1="100" x2="280" y2="100" />
            <line x1="0"   y1="150" x2="280" y2="150" />
            <line x1="60"  y1="0"   x2="60"  y2="200" />
            <line x1="140" y1="0"   x2="140" y2="200" />
            <line x1="220" y1="0"   x2="220" y2="200" />
          </g>
          {shape.map((p, i) => (
            <path
              key={i}
              d={p.d}
              fill={heatColor(p.hot)}
              fillOpacity={0.45 + p.hot * 0.45}
              stroke="#0a0a0b"
              strokeWidth="0.8"
            />
          ))}
          {shape
            .filter((p) => p.hot >= 0.55)
            .map((p, i) => {
              const nums = p.d.match(/-?\d+(?:\.\d+)?/g).map(Number);
              const xs = [], ys = [];
              for (let j = 0; j < nums.length; j += 2) {
                xs.push(nums[j]);
                ys.push(nums[j + 1]);
              }
              const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
              const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
              return (
                <text
                  key={`l-${i}`}
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  fontFamily="Inter, sans-serif"
                  fontSize="7"
                  fontWeight="700"
                  fill="rgba(255,255,255,0.85)"
                  letterSpacing="0.04em"
                >
                  {p.label.toUpperCase()}
                </text>
              );
            })}
        </svg>
      </div>
      <div style={{ fontSize: 10, color: "var(--mz-fg-muted)", lineHeight: 1.6 }}>
        <b style={{ color: "var(--mz-fg-strong)", display: "block", marginBottom: 4, fontSize: 11 }}>
          {ctx.title}
        </b>
        {ctx.sub}
        <br />
        Cargo: {ctx.cargo} · ciclo: 2022
        <br />
        <span style={{ color: "var(--mz-fg-faint)" }}>
          Componente real (3.196 linhas) substitui aqui em produção
        </span>
      </div>
    </div>
  );
}

/* ============ Trajetória ============ */
export function renderTrajeto(role) {
  const linhas =
    role.id === "nao"
      ? [
          { y: "2024 — hoje", what: "Pres. Estadual UB · São Paulo", desc: "Cargo partidário · comanda 645 Pres Municipais SP · não-eletivo" },
          { y: "2017 — 2024", what: "Vereador 7× · São Paulo Capital", desc: "Recorde: vereador mais votado da capital em 2020 (76.367 votos)" },
          { y: "2013",        what: "Migra do PT do B para o DEM",      desc: "Decisão estratégica · ganhou peso na bancada", dim: true },
          { y: "2000",        what: "Primeiro mandato · Vereador SP (PT do B)", desc: "Eleito com 18.450 votos", dim: true },
        ]
      : [
          { y: "2022 — hoje", what: "Mandato atual",          desc: role.role },
          { y: "2018",        what: "Mandato anterior",       desc: "Reeleito (1º suplente em 2022 antes de assumir)", dim: true },
          { y: "2014",        what: "Ingresso na vida pública", desc: "Primeiro cargo eletivo", dim: true },
        ];

  return (
    <div style={{ position: "relative", paddingLeft: 20 }}>
      <div
        style={{
          content: '""',
          position: "absolute",
          left: 5,
          top: 8,
          bottom: 8,
          width: 2,
          background: "var(--mz-rule)",
        }}
      />
      {linhas.map((l, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            paddingBottom: i === linhas.length - 1 ? 0 : 14,
            paddingLeft: 12,
          }}
        >
          <span
            style={{
              position: "absolute",
              left: -15,
              top: 4,
              width: 12,
              height: 12,
              background: l.dim ? "var(--mz-fg-faint)" : "var(--mz-tenant-accent)",
              borderRadius: "50%",
              boxShadow: "0 0 0 3px var(--mz-bg-card)",
            }}
          />
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--mz-tenant-accent)", fontWeight: 700 }}>
            {l.y}
          </div>
          <div style={{ color: "var(--mz-fg-strong)", fontWeight: 600, fontSize: 13, marginTop: 2 }}>{l.what}</div>
          <div style={{ color: "var(--mz-fg-muted)", fontSize: 11, lineHeight: 1.55, marginTop: 2 }}>{l.desc}</div>
        </div>
      ))}
    </div>
  );
}

/* ============ Atividade Legislativa ============ */
export function renderLeg(role) {
  if (role.id === "ver") {
    const props = [
      { area: "Saúde",       qty: 14, ex: "UBS, posto de vacinação, agentes" },
      { area: "Educação",    qty: 9,  ex: "CEI, transporte escolar" },
      { area: "Segurança",   qty: 7,  ex: "Câmeras, guarda municipal" },
      { area: "Mobilidade",  qty: 5,  ex: "Asfalto, sinalização, ciclofaixa" },
      { area: "Tributário",  qty: 3,  ex: "IPTU, ISS pequenos comerciantes" },
      { area: "Outros",      qty: 11, ex: "Homenagens, datas comemorativas" },
    ];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {props.map((p, i) => (
          <div
            key={i}
            style={{
              background: "var(--mz-bg-card-2)",
              borderRadius: 6,
              padding: 14,
              borderLeft: "3px solid var(--mz-tenant-accent)",
            }}
          >
            <div
              style={{
                fontSize: 9.5,
                letterSpacing: "0.14em",
                color: "var(--mz-fg-faint)",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              {p.area}
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 26, fontWeight: 800, color: "var(--mz-fg-strong)", margin: "4px 0 2px", lineHeight: 1 }}>
              {p.qty}
            </div>
            <div style={{ fontSize: 11, color: "var(--mz-fg-muted)", lineHeight: 1.45 }}>{p.ex}</div>
          </div>
        ))}
      </div>
    );
  }

  const linhas = [
    { id: "PL 2024/847", titulo: "Reforma Tributária — destaque",          sub: "Ementa: Suprime parágrafo 2º do Art. 195", vote: "sim",  voteLabel: "SIM",   when: "12/04" },
    { id: "PEC 14/24",   titulo: "Limite de gastos públicos",              sub: "Aprovada em 2 turnos · Senado",            vote: "sim",  voteLabel: "SIM",   when: "08/04" },
    { id: "PL 1.847",    titulo: "Marco Civil de IA",                      sub: "Câmara · 2ª discussão",                    vote: "sim",  voteLabel: "SIM",   when: "02/04" },
    { id: "MPV 1.214",   titulo: "Crédito Consignado privado",             sub: "Conversão em lei",                         vote: "nao",  voteLabel: "NÃO",   when: "28/03" },
    { id: "PRC 14/24",   titulo: "Comissão de Inquérito · Crise Yanomami", sub: "Instalação",                               vote: "abst", voteLabel: "ABST",  when: "22/03" },
    { id: "PL 4.330",    titulo: "Terceirização — emenda",                 sub: "Plenário",                                 vote: "sim",  voteLabel: "SIM",   when: "15/03" },
  ];
  return <LegisList linhas={linhas} />;
}

/* ============ Comissões ============ */
export function renderComiss(role) {
  const linhas = [
    { id: "CCJ", titulo: "Comissão Constituição & Justiça", sub: `Membro titular · ${role.id === "sen" ? "Senado" : "Câmara"}`, vote: "sim",  voteLabel: "Titular",   when: "2024" },
    { id: "CFT", titulo: "Finanças & Tributação",            sub: "Membro suplente",                                              vote: "abst", voteLabel: "Suplente",  when: "2024" },
    { id: "CRA", titulo: "Agricultura & Reforma Agrária",    sub: "Vice-presidente",                                              vote: "sim",  voteLabel: "Vice-Pres", when: "2023" },
    { id: "CDH", titulo: "Direitos Humanos",                  sub: "Membro titular",                                              vote: "sim",  voteLabel: "Titular",   when: "2023" },
  ];
  return <LegisList linhas={linhas} />;
}

/* ============ Pesquisas / Votações ============ */
export function renderVotos(role) {
  if (role.placeholder.includes("votos")) {
    return (
      <PlaceholderBody titulo="Pesquisas oficiais não disponíveis">
        para municípios de pequeno porte. Considerar pesquisas privadas + intent de voto via redes.
      </PlaceholderBody>
    );
  }
  const subs = [
    { lbl: "Aprovação",   v: "62%", delta: "+3pp 30d", up: true,  bar: 62 },
    { lbl: "Rejeição",    v: "21%", delta: "+1pp 30d", up: false, bar: 21, barColor: "var(--mz-danger)" },
    { lbl: "Conhece-mt",  v: "78%", delta: "+0.4pp",   up: true,  bar: 78 },
    { lbl: "Intenção",    v: "41%", delta: "+2pp",     up: true,  bar: 41 },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {subs.map((s, i) => (
        <SubmedCell key={i} {...s} />
      ))}
    </div>
  );
}

/* ============ Atos Executivos ============ */
export function renderAtos() {
  const atos = [
    { num: "DEC 68.241", titulo: "Programa Cidade Inteligente · 2026-2028",   sub: "Investimento: R$ 1,2 bi · 32 cidades", when: "22/04" },
    { num: "DEC 68.193", titulo: "Reforma do ICMS estadual",                  sub: "Vigência: 01/06/2026",                 when: "14/04" },
    { num: "PORT 414",   titulo: "Comissão Estadual de Educação Digital",     sub: "Sec. Educação · 12 membros",           when: "08/04" },
    { num: "DEC 68.107", titulo: "Plano Estadual de Mobilidade",              sub: "Investimento: R$ 480M · 5 anos",       when: "28/03" },
    { num: "VETO 03",    titulo: "Veto parcial · PL 14/2026 (segurança)",     sub: "Razões: vícios formais",               when: "22/03" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {atos.map((a, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr auto",
            gap: 12,
            padding: 10,
            background: "var(--mz-bg-card-2)",
            borderRadius: 6,
            alignItems: "center",
          }}
        >
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--mz-tenant-accent)", fontWeight: 700 }}>
            {a.num}
          </div>
          <div>
            <b style={{ color: "var(--mz-fg-strong)", display: "block", fontWeight: 600, fontSize: 12 }}>{a.titulo}</b>
            <span style={{ color: "var(--mz-fg-faint)", fontSize: 11 }}>{a.sub}</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--mz-fg-faint)" }}>{a.when}</div>
        </div>
      ))}
    </div>
  );
}

/* ============ Alianças ============ */
export function renderAliancas() {
  const items = [
    { sev: "baixa", nome: "Eduardo Suplicy (PT)",   sub: "Aliança formal · CMSP · pauta de habitação",            when: "2024" },
    { sev: "baixa", nome: "Ricardo Nunes (MDB)",    sub: "Apoio mútuo na Câmara Municipal",                       when: "2023" },
    { sev: "media", nome: "Tarcísio (Republicanos)", sub: "Aliança informal · não confirmada · risco baixo",       when: "monitorado" },
    { sev: "baixa", nome: "Bancada UB Capital",      sub: "Voto-bloco em 87% das votações relevantes",             when: "consolidado" },
  ];
  return <AlertList items={items} />;
}

/* ============ Mídia & Clipping ============ */
export function renderMidia() {
  return (
    <div style={iaBoxStyle}>
      <div style={iaIconStyle}>📡</div>
      <div style={iaMsgStyle}>
        Mencionado em <b style={{ color: "var(--mz-tenant-accent)" }}>1.247 reportagens</b> nos
        últimos 30 dias · sentimento médio <b style={{ color: "var(--mz-tenant-accent)" }}>+0.62</b>{" "}
        (positivo). Picos: assinatura do contrato Educação SP (847 menções em 24h) · entrevista
        TV Globo (412 menções).
        <span style={iaSrcStyle}>Clipping automatizado · 2.341 veículos monitorados</span>
      </div>
    </div>
  );
}

/* ============ Alertas Jurídicos ============ */
export function renderJur() {
  return <AlertList items={[{ sev: "baixa", nome: "Sem alertas jurídicos vigentes", sub: "Última verificação: 25/04/2026 · TSE · STF · TRE", when: "hoje" }]} />;
}

/* ============ Financeiro ============ */
export function renderFin(role) {
  if (role.placeholder.includes("fin")) {
    return (
      <PlaceholderBody titulo="Prestação de contas TSE em curadoria">
        Última eleição: 2024 · Aguardando publicação consolidada
      </PlaceholderBody>
    );
  }
  const cards = [
    { lbl: "Receita 2024",  v: "R$ 4,8M",        sub: "122 doadores PJ · 487 PF" },
    { lbl: "Despesa 2024",  v: "R$ 4,7M",        sub: "62% mídia · 18% pessoal · 20% outros" },
    { lbl: "Saldo TSE",     v: "R$ 142k",        sub: "prestação aprovada · sem ressalvas" },
    { lbl: "Compliance",    v: "OK",  vColor: "var(--mz-ok)", vSize: 18, sub: "Receita · Despesa · Doadores · Origem" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {cards.map((c, i) => (
        <div key={i} style={{ background: "var(--mz-bg-card-2)", borderRadius: 6, padding: 14 }}>
          <div style={{ fontSize: 9.5, color: "var(--mz-fg-faint)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
            {c.lbl}
          </div>
          <div
            style={{
              fontSize: c.vSize ?? 22,
              fontWeight: 800,
              color: c.vColor ?? "var(--mz-fg-strong)",
              marginTop: 4,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {c.v}
          </div>
          <div style={{ fontSize: 11, color: "var(--mz-fg-muted)", marginTop: 6 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ============ Emendas ============ */
export function renderEmendas(role) {
  if (role.placeholder.includes("emendas")) {
    return (
      <PlaceholderBody titulo="Dados de emendas em curadoria">
        Cargo Executivo Estadual · emendas governamentais não-individuais
      </PlaceholderBody>
    );
  }
  const subs = [
    { lbl: "Total 2025", v: "R$ 84M", delta: "individuais + bancada" },
    { lbl: "Empenhadas", v: "62%",    delta: "+18pp YoY", up: true, bar: 62 },
    { lbl: "Pagas",      v: "38%",    delta: "+11pp",    up: true, bar: 38 },
    { lbl: "Para SP",    v: "71%",    delta: "prioridade base", bar: 71 },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {subs.map((s, i) => (
        <SubmedCell key={i} {...s} />
      ))}
    </div>
  );
}

/* ============ Atuação Partidária ============ */
export function renderPartido() {
  const items = [
    { sev: "baixa", nome: "Comando direto · 645 Pres. Municipais SP", sub: "Score médio dos comandados: 71/100", when: "cargo" },
    { sev: "baixa", nome: "Convenção UB SP · 2025",                   sub: "Discurso de abertura · trending tópico nacional", when: "11/03" },
    { sev: "baixa", nome: "Aliança formalizada com PSDB SP",          sub: "Trabalho conjunto em 23 municípios", when: "02/2025" },
  ];
  return <AlertList items={items} />;
}

/* ============ Base Territorial ============ */
export function renderBase() {
  const subs = [
    { lbl: "Bairros core",     v: "14",  delta: ">50% votos local" },
    { lbl: "Quadras ativas",   v: "847", delta: "+47 (sem)", up: true },
    { lbl: "Cabos vinculados", v: "34",  delta: "+5 (mês)",  up: true },
    { lbl: "Lideranças",       v: "128", delta: "cadastradas" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {subs.map((s, i) => (
        <SubmedCell key={i} {...s} />
      ))}
    </div>
  );
}

/* ============ IA Estratégica ============ */
export function renderIA() {
  return (
    <div style={iaBoxStyle}>
      <div style={iaIconStyle}>⚡</div>
      <div style={iaMsgStyle}>
        <b style={{ color: "var(--mz-tenant-accent)" }}>Recomendação:</b> intensificar presença
        em Vila Mariana e Itaim (zonas onde o competidor PSD cresceu +12pp em 30d).{" "}
        <b style={{ color: "var(--mz-tenant-accent)" }}>Janela de oportunidade:</b> próximas 4
        semanas - debate da PEC 14 puxa atenção pra agenda fiscal.
        <span style={iaSrcStyle}>IA · cruzou: clipping + radar + base + comportamento competidor</span>
      </div>
    </div>
  );
}

/* ============ DESPACHANTE ============ */
export function renderSection(secaoId, role) {
  if (role.id === "fall") {
    return (
      <PlaceholderBody titulo="Dado em curadoria">
        Aguardando enriquecimento via TSE/DOU/clipping
      </PlaceholderBody>
    );
  }

  const isPlaceholder = role.placeholder.includes(secaoId);

  // Seções com placeholder específico tratado dentro da função
  if (secaoId === "fin")     return renderFin(role);
  if (secaoId === "emendas") return renderEmendas(role);
  if (secaoId === "votos")   return renderVotos(role);

  if (isPlaceholder) {
    return (
      <PlaceholderBody titulo="Dado em curadoria">
        Esta seção será preenchida assim que a fonte oficial publicar
      </PlaceholderBody>
    );
  }

  switch (secaoId) {
    case "cenario":  return renderCenario();
    case "mapa":     return renderMapa(role);
    case "trajeto":  return renderTrajeto(role);
    case "leg":      return renderLeg(role);
    case "comiss":   return renderComiss(role);
    case "atos":     return renderAtos();
    case "aliancas": return renderAliancas();
    case "midia":    return renderMidia();
    case "jur":      return renderJur();
    case "partido":  return renderPartido();
    case "base":     return renderBase();
    case "ia":       return renderIA();
    default:
      return <PlaceholderBody titulo="Conteúdo desta seção pendente">{null}</PlaceholderBody>;
  }
}

/* ============ HELPERS COMPARTILHADOS ============ */

const iaBoxStyle = {
  background: "linear-gradient(135deg, rgba(0,42,123,0.20), transparent), var(--mz-bg-card-2)",
  border: "1px solid var(--mz-tenant-primary-soft)",
  borderRadius: 8,
  padding: 16,
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: 14,
};
const iaIconStyle = {
  width: 32,
  height: 32,
  background: "linear-gradient(135deg, var(--mz-tenant-primary), var(--mz-tenant-accent))",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
  flexShrink: 0,
};
const iaMsgStyle = {
  fontSize: 12,
  color: "var(--mz-fg)",
  lineHeight: 1.6,
};
const iaSrcStyle = {
  display: "block",
  fontSize: 10,
  color: "var(--mz-fg-faint)",
  marginTop: 6,
  letterSpacing: "0.04em",
};

function mapTagStyle(pos) {
  const base = {
    position: "absolute",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 9,
    background: "rgba(9,9,11,0.85)",
    padding: "3px 6px",
    borderRadius: 3,
    border: "1px solid var(--mz-rule)",
    color: "var(--mz-fg-faint)",
    zIndex: 2,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };
  if (pos === "top-left")     return { ...base, top: 6, left: 8 };
  if (pos === "bottom-right") return { ...base, bottom: 6, right: 8 };
  return base;
}

function PlaceholderBody({ titulo, children }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "32px 18px",
        color: "var(--mz-fg-faint)",
        fontSize: 12,
        background: "repeating-linear-gradient(45deg, transparent 0 8px, var(--mz-bg-card-2) 8px 9px)",
        borderRadius: 6,
      }}
    >
      <b style={{ display: "block", fontSize: 13, color: "var(--mz-fg-muted)", marginBottom: 4 }}>
        {titulo}
      </b>
      {children}
    </div>
  );
}

function LegisList({ linhas }) {
  return (
    <div>
      {linhas.map((l, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "60px 1fr auto auto",
            gap: 12,
            padding: "8px 0",
            borderBottom: i === linhas.length - 1 ? 0 : "1px solid var(--mz-rule)",
            alignItems: "center",
            fontSize: 12,
          }}
        >
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 600, color: "var(--mz-tenant-accent)" }}>
            {l.id}
          </span>
          <div>
            <b style={{ color: "var(--mz-fg-strong)", display: "block", fontWeight: 600 }}>{l.titulo}</b>
            <span style={{ color: "var(--mz-fg-faint)", fontSize: 11 }}>{l.sub}</span>
          </div>
          <span
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 999,
              fontWeight: 700,
              letterSpacing: "0.04em",
              background:
                l.vote === "sim"  ? "var(--mz-ok-soft)" :
                l.vote === "nao"  ? "var(--mz-danger-soft)" :
                                    "var(--mz-bg-elevated)",
              color:
                l.vote === "sim"  ? "var(--mz-ok)" :
                l.vote === "nao"  ? "var(--mz-danger)" :
                                    "var(--mz-fg-muted)",
            }}
          >
            {l.voteLabel}
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--mz-fg-faint)" }}>
            {l.when}
          </span>
        </div>
      ))}
    </div>
  );
}

function AlertList({ items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((it, i) => {
        const stripColor =
          it.sev === "alta"  ? "var(--mz-danger)" :
          it.sev === "media" ? "var(--mz-warn)" :
                               "var(--mz-info)";
        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "4px 1fr auto",
              gap: 12,
              padding: "10px 14px",
              background: "var(--mz-bg-card-2)",
              borderRadius: 6,
              alignItems: "start",
            }}
          >
            <div
              style={{
                width: 4,
                minHeight: 28,
                borderRadius: 2,
                background: stripColor,
              }}
            />
            <div>
              <b style={{ display: "block", color: "var(--mz-fg-strong)", fontSize: 12 }}>{it.nome}</b>
              <span style={{ color: "var(--mz-fg-muted)", fontSize: 11 }}>{it.sub}</span>
            </div>
            <span style={{ fontSize: 10, color: "var(--mz-fg-faint)", fontFamily: "JetBrains Mono, monospace" }}>
              {it.when}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SubmedCell({ lbl, v, delta, up, bar, barColor }) {
  return (
    <div style={{ background: "var(--mz-bg-card-2)", borderRadius: 6, padding: 12 }}>
      <div style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700 }}>
        {lbl}
      </div>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 800, color: "var(--mz-fg-strong)", letterSpacing: "-0.03em", marginTop: 2, lineHeight: 1 }}>
        {v}
      </div>
      {delta && (
        <div
          style={{
            fontSize: 10,
            marginTop: 4,
            fontVariantNumeric: "tabular-nums",
            color: up === true ? "var(--mz-ok)" : up === false ? "var(--mz-danger)" : "var(--mz-fg-faint)",
          }}
        >
          {delta}
        </div>
      )}
      {bar != null && (
        <div style={{ height: 4, background: "var(--mz-bg-elevated)", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
          <span
            style={{
              display: "block",
              height: "100%",
              width: `${bar}%`,
              background: barColor || "linear-gradient(90deg, var(--mz-tenant-primary), var(--mz-tenant-accent))",
            }}
          />
        </div>
      )}
    </div>
  );
}
