"""
Geração de PDF do Dossiê Político usando WeasyPrint.

Consome o objeto Pydantic `DossiePolitico` (single source of truth) e
renderiza A4 mantendo a paleta visual União Brasil. Não faz queries —
todos os dados vêm do schema. Não recalcula nada.

Blocos com `disponivel: false` viram banner "Dados não disponíveis ainda".
"""
import os
import base64
import html as _html_mod
from datetime import date

from weasyprint import HTML, CSS

from app.schemas.dossie import DossiePolitico, NivelClassificacao


def _e(s) -> str:
    """Escape HTML de strings (trata None como vazio)."""
    if s is None:
        return ""
    return _html_mod.escape(str(s), quote=True)

# ── Base URL do backend para resolução de fotos ───────────────────────────────
_FOTOS_DIR = "/app/dados_brutos"   # mapeamento web /fotos/* → disco /app/dados_brutos/fotos/*


def _foto_base64(foto_url: str | None) -> str | None:
    """Lê a foto do disco e retorna data URI base64, ou None se não existir."""
    if not foto_url:
        return None
    # foto_url = "/fotos/2024/SP/FXX...jpg"
    disco = _FOTOS_DIR + foto_url
    if not os.path.exists(disco):
        return None
    try:
        ext = disco.rsplit(".", 1)[-1].lower()
        mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
        with open(disco, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        return f"data:{mime};base64,{b64}"
    except Exception:
        return None


def _fmt(n) -> str:
    if n is None:
        return "—"
    try:
        return f"{int(n):,}".replace(",", ".")
    except Exception:
        return str(n)


def _fmtBRL(n) -> str:
    if not n:
        return None
    return f"R$ {float(n):,.0f}".replace(",", ".")


def _fmtData(iso: str | None) -> str:
    if not iso:
        return "—"
    try:
        d = date.fromisoformat(str(iso)[:10])
        return d.strftime("%d/%m/%Y")
    except Exception:
        return str(iso)


_SITUACAO_MAP = {
    "#NULO":    "Não eleito",
    "#6":       "Não eleito",
    "NÃO ELEITO": "Não eleito",
    "ELEITO":   "Eleito",
    "ELEITO POR QP": "Eleito (QP)",
    "ELEITO POR MÉDIA": "Eleito (média)",
    "SUPLENTE": "Suplente",
    "2º TURNO": "2º turno",
}

def _situacao(raw: str | None, eleito: bool | None = None) -> str:
    if not raw:
        return "Eleito" if eleito else "Não eleito"
    upper = raw.upper().strip()
    for k, v in _SITUACAO_MAP.items():
        if upper.startswith(k):
            return v
    if upper.startswith("#"):
        return "Não eleito"
    return raw.title()


def _calcIdade(iso: str | None) -> str:
    if not iso:
        return ""
    try:
        nasc = date.fromisoformat(str(iso)[:10])
        hoje = date.today()
        anos = hoje.year - nasc.year - ((hoje.month, hoje.day) < (nasc.month, nasc.day))
        return f"{anos} anos"
    except Exception:
        return ""


# ── CSS global do PDF ─────────────────────────────────────────────────────────
_CSS = CSS(string="""
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;500;600&display=swap');

@page {
    size: A4;
    margin: 12mm 14mm 18mm 14mm;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: 'Barlow', Arial, sans-serif;
    font-size: 10pt;
    color: #111827;
    line-height: 1.45;
}

/* ─── HERO (estilo digital clean) — table layout pra WeasyPrint ───── */
.hero {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 12px;
    page-break-inside: avoid;
    display: table;
    width: 100%;
    border-collapse: separate;
}
.hero-col {
    display: table-cell;
    vertical-align: top;
}
.hero-col-foto { width: 120px; padding-right: 14px; }
.hero-col-info { vertical-align: top; }
/* Foto com badge overall sobreposto */
.hero-foto-wrap {
    position: relative;
    width: 110px;
    height: 140px;
    flex-shrink: 0;
    border-radius: 12px;
    overflow: hidden;
    background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
}
.hero-foto {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
    display: block;
}
.hero-foto-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36pt;
    font-weight: 900;
    color: #9ca3af;
}
.hero-overall-badge {
    position: absolute;
    bottom: 6px;
    right: 6px;
    width: 38px;
    height: 38px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 900;
    font-size: 13pt;
    box-shadow: 0 2px 6px rgba(0,0,0,0.25);
}
.hero-overall-ok { background: #16a34a; }
.hero-overall-mid { background: #f59e0b; }
.hero-overall-bad { background: #dc2626; }

/* Info central do hero */
.hero-info { flex: 1; min-width: 0; }
.hero-nome-linha {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}
.hero-nome {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 20pt;
    color: #111827;
    line-height: 1;
    letter-spacing: -0.3px;
}
.hero-pill-partido {
    background: #4338ca;
    color: white;
    font-size: 8pt;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 6px;
    letter-spacing: 0.3px;
}
.hero-pill-ideologia {
    background: #dbeafe;
    color: #1e40af;
    font-size: 7.5pt;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 100px;
}
.hero-nome-comp {
    font-size: 8.5pt;
    color: #6b7280;
    margin-top: 2px;
    letter-spacing: 0.2px;
}
.hero-cargo {
    font-size: 9pt;
    font-weight: 700;
    color: #374151;
    margin-top: 5px;
    letter-spacing: 0.3px;
}
.hero-dados-pessoais {
    margin-top: 5px;
    line-height: 1.6;
}
.hero-dado {
    display: inline-block;
    font-size: 8pt;
    color: #6b7280;
    margin-right: 14px;
}
.hero-dado-icon {
    width: 10px;
    height: 10px;
    opacity: 0.6;
}

/* KPIs do hero (linha horizontal com labels cinza, valores grandes) */
.hero-kpis {
    margin-top: 12px;
    white-space: nowrap;
}
.hero-kpi {
    display: inline-block;
    vertical-align: top;
    margin-right: 24px;
    margin-bottom: 4px;
}
.hero-kpi-label {
    font-size: 7pt;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1;
    margin-bottom: 2px;
}
.hero-kpi-valor {
    font-size: 17pt;
    font-weight: 900;
    color: #111827;
    line-height: 1;
    font-variant-numeric: tabular-nums;
}
.hero-kpi-valor-green { color: #16a34a; }

/* MiniScore pills (ELE 67, FIN 48, etc) */
.hero-scores {
    margin-top: 10px;
    line-height: 1.6;
}
.hero-scores > * {
    vertical-align: middle;
    margin-right: 5px;
}
.mini-score {
    display: inline-block;
    width: 42px;
    height: 34px;
    border-radius: 6px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    text-align: center;
    padding-top: 4px;
    line-height: 1;
    vertical-align: middle;
}
.mini-score-valor {
    font-size: 10pt;
    font-weight: 900;
}
.mini-score-label {
    font-size: 6pt;
    font-weight: 700;
    color: #9ca3af;
    margin-top: 2px;
    letter-spacing: 0.3px;
}
.mini-score-ok { background: #fefce8; border-color: #fef08a; }
.mini-score-ok .mini-score-valor { color: #854d0e; }
.mini-score-bom { background: #dcfce7; border-color: #bbf7d0; }
.mini-score-bom .mini-score-valor { color: #15803d; }
.mini-score-ruim { background: #fee2e2; border-color: #fecaca; }
.mini-score-ruim .mini-score-valor { color: #b91c1c; }
.mini-score-empty {
    background: #f3f4f6;
    border-color: #e5e7eb;
}
.mini-score-empty .mini-score-valor { color: #9ca3af; font-weight: 700; font-size: 11pt; }
.mini-score-empty .mini-score-label { color: #d1d5db; }

.hero-divider {
    display: inline-block;
    width: 1px;
    height: 20px;
    background: #e5e7eb;
    vertical-align: middle;
    margin: 0 6px;
}
.hero-pill-nivel {
    font-size: 7pt;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 5px;
    letter-spacing: 0.2px;
    text-transform: none;
}
.hero-pill-alertas {
    font-size: 7pt;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 5px;
    background: #fef3c7;
    color: #92400e;
    display: inline-flex;
    align-items: center;
    gap: 3px;
}

/* Logo do partido à direita (float pra deixar texto envolver) */
.hero-logo-partido {
    float: right;
    margin-left: 12px;
    margin-bottom: 6px;
    text-align: center;
}
.hero-logo-partido img {
    width: 95px;
    height: auto;
    max-height: 95px;
}

/* ─── SEÇÕES com barra colorida (igual ao modal) ─────────────────── */
.section { margin-bottom: 14px; page-break-inside: avoid; }

.section-header {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 8px;
}
.section-bar {
    width: 3px;
    height: 16px;
    border-radius: 2px;
    flex-shrink: 0;
}
.section-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 10.5pt;
    color: #5b21b6;
    text-transform: uppercase;
    letter-spacing: 0.6px;
}

/* ─── MAPA ELEITORAL (max-height para caber com titulo numa pagina) ─── */
.mapa-img {
    width: 100%;
    max-height: 380px;
    height: auto;
    object-fit: contain;
    display: block;
    border-radius: 4px;
}

/* ─── GRID 2 colunas (Comportamento + Redes Sociais, etc) ─────────── */
.grid-2 {
    display: flex;
    gap: 10px;
    page-break-inside: avoid;
}
.grid-2 > * { flex: 1; min-width: 0; }

/* ─── Comparativos ─────────────────────────────────────────────── */
.comp-bar {
    height: 10px;
    border-radius: 5px;
    background: #f3e8ff;
    overflow: hidden;
    position: relative;
}
.comp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #7c3aed, #5b21b6);
    border-radius: 5px;
}
.comp-bar-mediana {
    height: 100%;
    background: #9ca3af;
    border-radius: 5px;
}

/* ─── GRID DE MÉTRICAS ──────────────────────────────────────────── */
.metrics-grid { display: flex; gap: 8px; }
.metric-card {
    flex: 1;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 10px 8px;
    text-align: center;
    background: #f8fafc;
}
.metric-icon {
    font-size: 14pt;
    margin-bottom: 3px;
}
.metric-valor {
    font-size: 17pt;
    font-weight: 800;
    line-height: 1;
}
.metric-label {
    font-size: 7.5pt;
    color: #6b7280;
    margin-top: 3px;
    line-height: 1.25;
}
.metric-sub {
    font-size: 7pt;
    color: #9ca3af;
    margin-top: 2px;
}

/* ─── CARDS ELEIÇÕES ────────────────────────────────────────────── */
.cards-row { display: flex; gap: 8px; }
.card-eleicao {
    flex: 1;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 10px;
    text-align: center;
    background: #fafafa;
}
.card-eleicao.eleito { background: #f0fdf4; border-color: #86efac; }
.card-valor { font-size: 17pt; font-weight: 800; color: #111827; line-height: 1.1; }
.card-ano   { font-size: 7.5pt; color: #6b7280; margin-top: 2px; }
.card-cargo { font-size: 8.5pt; font-weight: 600; color: #374151; margin-top: 3px; }

/* ─── RANKING PREMIUM ───────────────────────────────────────────── */
.ranking-wrap {
    background: #f5f3ff;
    border: 1px solid #ddd6fe;
    border-radius: 10px;
    padding: 12px;
}
.ranking-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
}
.ranking-badge {
    background: #4C1D95;
    color: white;
    font-size: 20pt;
    font-weight: 900;
    width: 64px;
    height: 64px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-family: 'Barlow Condensed', sans-serif;
    flex-direction: column;
    line-height: 1;
}
.ranking-badge .badge-sub {
    font-size: 7pt;
    color: rgba(255,255,255,0.6);
    font-weight: 400;
    font-family: 'Barlow', sans-serif;
    margin-top: 1px;
}
.ranking-info { flex: 1; }
.ranking-titulo { font-size: 8.5pt; color: #6b7280; margin-bottom: 2px; }
.ranking-desc { font-size: 12pt; font-weight: 700; color: #4C1D95; }
.ranking-percentil { font-size: 9pt; color: #7C3AED; margin-top: 2px; }

.bar-compare-row { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
.bar-compare-label { width: 110px; font-size: 8pt; color: #6b7280; }
.bar-compare-wrap { flex: 1; background: #e5e7eb; border-radius: 4px; height: 9px; overflow: hidden; }
.bar-compare-fill { border-radius: 4px; height: 9px; }
.bar-compare-val { width: 65px; text-align: right; font-size: 8pt; font-weight: 600; color: #4C1D95; }

.ranking-alerta {
    background: #fff7ed;
    border: 1px solid #fed7aa;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 8.5pt;
    color: #9a3412;
    margin-top: 8px;
}
.ranking-ok {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 8.5pt;
    color: #166534;
    margin-top: 8px;
}

/* ─── MAPA ELEITORAL ────────────────────────────────────────────── */
.mapa-wrap {
    border: 1px solid #dbeafe;
    border-radius: 10px;
    overflow: hidden;
    background: #eff6ff;
    text-align: center;
    padding: 8px;
}
.mapa-wrap img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
    border-radius: 6px;
}
.mapa-legenda {
    font-size: 7.5pt;
    color: #6b7280;
    margin-top: 6px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}
.mapa-leg-item { display: inline-flex; align-items: center; gap: 3px; }
.mapa-leg-swatch { width: 10px; height: 8px; border-radius: 2px; display: inline-block; }

/* ─── BARRAS DE VOTOS ───────────────────────────────────────────── */
.votos-row { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
.votos-label { width: 130px; font-size: 8pt; color: #475569; white-space: nowrap; overflow: hidden; }
.votos-bar-wrap { flex: 1; background: #e5e7eb; border-radius: 4px; height: 8px; overflow: hidden; }
.votos-bar { background: #0D9488; border-radius: 4px; height: 8px; }
.votos-num { width: 65px; text-align: right; font-size: 8pt; color: #0f766e; font-weight: 600; }

/* ─── ANÁLISE ───────────────────────────────────────────────────── */
.analise-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #6366F1;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 9pt;
    color: #334155;
    line-height: 1.6;
}
.analise-titulo {
    font-size: 8.5pt;
    font-weight: 700;
    color: #4338CA;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
}

/* ─── TABELAS ───────────────────────────────────────────────────── */
table { width: 100%; border-collapse: collapse; font-size: 9pt; }
th {
    background: #f1f5f9;
    font-weight: 600;
    color: #475569;
    text-align: left;
    padding: 5px 8px;
    border-bottom: 2px solid #e2e8f0;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}
td {
    padding: 6px 8px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
    vertical-align: middle;
}
tr:last-child td { border-bottom: none; }
.tr-eleito td { background: #f0fdf4; }
tr:hover td { background: #fafafa; }

/* ─── BADGES ────────────────────────────────────────────────────── */
.badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 100px;
    font-size: 7.5pt;
    font-weight: 600;
}
.badge-eleito   { background: #dcfce7; color: #166534; }
.badge-nao      { background: #f3f4f6; color: #6b7280; }
.badge-partido  { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.badge-alert    { background: #fef3c7; color: #92400e; }

/* ─── LINHA DE TRAJETÓRIA ───────────────────────────────────────── */
.traj-row {
    display: flex;
    gap: 10px;
    margin-bottom: 8px;
    page-break-inside: avoid;
}
.traj-dot-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 16px;
    flex-shrink: 0;
    padding-top: 3px;
}
.traj-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
}
.traj-line {
    width: 2px;
    flex: 1;
    background: #e5e7eb;
    margin-top: 3px;
    min-height: 10px;
}
.traj-card {
    flex: 1;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 8px 10px;
    background: #fafafa;
}
.traj-card.eleito { background: #f0fdf4; border-color: #bbf7d0; }
.traj-ano { font-size: 10pt; font-weight: 700; color: #111827; }
.traj-cargo { font-size: 8.5pt; color: #475569; margin-top: 1px; }
.traj-votos { font-size: 10pt; font-weight: 700; color: #1E3A8A; text-align: right; }
.traj-var { font-size: 7.5pt; text-align: right; }
.traj-fin { font-size: 7.5pt; color: #6b7280; margin-top: 3px; padding-top: 3px; border-top: 1px solid #f1f5f9; }

/* ─── FINANÇA ───────────────────────────────────────────────────── */
.fin-card {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 10px 12px;
    margin-bottom: 8px;
    page-break-inside: avoid;
}
.fin-card.eleito { background: #f0fdf4; border-color: #bbf7d0; }
.fin-bar-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.fin-bar-label { width: 55px; font-size: 7.5pt; color: #6b7280; }
.fin-bar-wrap { flex: 1; background: #e5e7eb; border-radius: 3px; height: 8px; overflow: hidden; }
.fin-custo { font-size: 7.5pt; color: #9ca3af; margin-top: 4px; }

/* ─── CONCORRENTES ──────────────────────────────────────────────── */
.conc-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 8px;
    margin-bottom: 3px;
    border: 1px solid #f1f5f9;
}
.conc-row.destaque {
    background: #eff6ff;
    border-color: #bfdbfe;
}
.conc-pos { width: 20px; font-size: 8pt; font-weight: 700; color: #9ca3af; text-align: center; flex-shrink: 0; }
.conc-row.destaque .conc-pos { color: #1E3A8A; }
.conc-nome { flex: 1; font-size: 8.5pt; font-weight: 500; color: #111827; }
.conc-row.destaque .conc-nome { font-weight: 700; color: #1E3A8A; }
.conc-partido { font-size: 7.5pt; color: #6b7280; margin-right: 4px; }
.conc-bar-wrap { width: 60px; background: #e5e7eb; border-radius: 3px; height: 6px; overflow: hidden; flex-shrink: 0; }
.conc-bar { border-radius: 3px; height: 6px; }
.conc-votos { width: 55px; text-align: right; font-size: 8pt; font-weight: 600; color: #374151; flex-shrink: 0; }

/* ─── PERFIL PESSOAL ────────────────────────────────────────────── */
.perfil-grid { display: table; width: 100%; }
.perfil-col { display: table-cell; width: 50%; vertical-align: top; padding-right: 12px; }
.perfil-col:last-child { padding-right: 0; padding-left: 12px; }
.perfil-item {
    display: table;
    width: 100%;
    padding: 5px 0;
    border-bottom: 1px solid #f1f5f9;
    font-size: 9pt;
}
.perfil-label { display: table-cell; width: 55%; color: #6b7280; }
.perfil-valor { display: table-cell; color: #111827; font-weight: 500; text-align: right; }

/* ─── FOOTER ────────────────────────────────────────────────────── */
.footer {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    font-size: 7pt;
    color: #9ca3af;
    text-align: center;
    padding: 5px;
    border-top: 1px solid #e5e7eb;
    background: white;
}
""")


# ── Gerador principal ─────────────────────────────────────────────────────────

# ── Gerador principal — consome DossiePolitico Pydantic ──────────────────────


def _badge_nivel_html(nivel: NivelClassificacao | None, label: str) -> str:
    """Pill colorido para ALTO/MEDIO/BAIXO ou cinza para None."""
    base_style = (
        "font-size:7.5pt;font-weight:700;padding:2px 9px;border-radius:100px;"
        "text-transform:uppercase;letter-spacing:0.3px;"
        "white-space:nowrap;display:inline-block;"
    )
    if nivel is None:
        return (
            f'<span style="background:#f3f4f6;color:#9ca3af;{base_style}">'
            f'{label}: —</span>'
        )
    cores = {
        "ALTO":  ("#fee2e2", "#b91c1c"),
        "MEDIO": ("#fef3c7", "#a16207"),
        "BAIXO": ("#dcfce7", "#166534"),
    }
    bg, fg = cores[nivel]
    return (
        f'<span style="background:{bg};color:{fg};{base_style}">'
        f'{label}: {nivel}</span>'
    )


def _score_card_html(label: str, valor, disponivel: bool) -> str:
    """Card pequeno de score individual (5-pt grid)."""
    if not disponivel or valor is None:
        return f"""
        <div class="metric-card" style="background:#f3f4f6">
            <div class="metric-valor" style="color:#d1d5db">—</div>
            <div class="metric-label">{label}</div>
            <div class="metric-sub" style="color:#9ca3af">sem dados</div>
        </div>"""
    if valor >= 70:
        cor = "#15803d"
    elif valor >= 40:
        cor = "#a16207"
    else:
        cor = "#b91c1c"
    return f"""
    <div class="metric-card">
        <div class="metric-valor" style="color:{cor};font-size:18pt">{int(round(valor))}</div>
        <div class="metric-label">{label}</div>
        <div class="metric-sub">de 100</div>
    </div>"""


def _sem_dados_box(mensagem: str) -> str:
    return f"""
    <div style="background:#f9fafb;border:1px dashed #d1d5db;border-radius:8px;
                padding:10px 12px;display:flex;align-items:flex-start;gap:6px">
        <span style="color:#9ca3af;font-size:9pt">ⓘ</span>
        <span style="color:#6b7280;font-size:8pt;line-height:1.4">{mensagem}</span>
    </div>"""


def _sh(cor: str, titulo: str) -> str:
    """Cabeçalho de seção com barra colorida (igual ao layout antigo)."""
    return f"""<div class="section-header">
        <div class="section-bar" style="background:{cor}"></div>
        <span class="section-title">{titulo}</span>
    </div>"""


def _classificar_forca(score) -> str | None:
    """
    Forte / Médio / Fraco derivado do score. Retorna None quando:
      - score.geral eh None, OU
      - menos de 3 dimensoes tem valor calculado — rotulo "Fraco" seria
        injusto pra quem apenas tem poucos dados (nao "fraco", "insuficiente").
    """
    if score is None or score.geral is None:
        return None
    n_disp = sum(1 for v in (
        score.eleitoral, score.juridico, score.financeiro,
        score.politico, score.digital,
    ) if v is not None)
    if n_disp < 3:
        return None
    if score.geral >= 70:
        return "FORTE"
    if score.geral >= 40:
        return "MÉDIO"
    return "FRACO"


def _logo_partido_base64(sigla: str | None) -> str | None:
    """Le o PNG do logo do partido e retorna como data URL base64.

    Logos vivem em app/static/logos_partidos/ (copia dos de frontend/public
    para o backend poder embeddar no PDF sem depender do filesystem do front).
    """
    if not sigla:
        return None
    import unicodedata
    sigla_key = "".join(
        c for c in unicodedata.normalize("NFD", sigla.upper())
        if unicodedata.category(c) != "Mn"
    ).replace(" ", "")
    # app/services/pdf.py -> app/static/logos_partidos/{SIGLA}.png
    base_path = os.path.join(
        os.path.dirname(__file__), "..", "static", "logos_partidos"
    )
    candidato = os.path.normpath(os.path.join(base_path, f"{sigla_key}.png"))
    try:
        if not os.path.exists(candidato):
            return None
        with open(candidato, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        return f"data:image/png;base64,{b64}"
    except Exception:
        return None


def _hero_overall_css(overall: int | None) -> str:
    """Classe CSS para o badge overall na foto (cor por faixa)."""
    if overall is None: return "hero-overall-bad"
    if overall >= 70: return "hero-overall-ok"
    if overall >= 40: return "hero-overall-mid"
    return "hero-overall-bad"


def _mini_score_css(valor: float | None, disponivel: bool) -> str:
    """Classe de cor do MiniScore (igual ao frontend)."""
    if not disponivel or valor is None:
        return "mini-score-empty"
    if valor >= 70: return "mini-score-bom"
    if valor >= 40: return "mini-score-ok"
    return "mini-score-ruim"


def _hero_pill_nivel_html(nivel: NivelClassificacao | None, label: str) -> str:
    """Pill pequeno para Risco/Potencial no hero (estilo digital)."""
    if nivel is None:
        return ""
    cores = {
        "ALTO":  ("#fee2e2", "#b91c1c"),
        "MEDIO": ("#fef3c7", "#a16207"),
        "BAIXO": ("#dcfce7", "#166534"),
    }
    bg, fg = cores.get(nivel, ("#f3f4f6", "#4b5563"))
    return (
        f'<span class="hero-pill-nivel" style="background:{bg};color:{fg}">'
        f'{label}: {nivel}</span>'
    )


def _badge_forca_html(forca: str | None) -> str:
    """Pill colorido para classificação Forte/Médio/Fraco."""
    base_style = (
        "font-size:8pt;font-weight:900;padding:3px 11px;border-radius:100px;"
        "text-transform:uppercase;letter-spacing:0.5px;"
        "white-space:nowrap;display:inline-block;"
    )
    if forca is None:
        return (
            f'<span style="background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.6);'
            f'{base_style}">Sem classificação</span>'
        )
    cores = {
        "FORTE": ("#86efac", "#14532d"),
        "MÉDIO": ("#fde68a", "#78350f"),
        "FRACO": ("#fca5a5", "#7f1d1d"),
    }
    bg, fg = cores[forca]
    return (
        f'<span style="background:{bg};color:{fg};{base_style}">'
        f'Candidato {forca}</span>'
    )


def gerar_pdf_dossie(
    dossie: DossiePolitico,
    *,
    mapa_png: str | None = None,
    mapa_meta: dict | None = None,
) -> bytes:
    """
    Gera PDF do dossiê político a partir do schema Pydantic `DossiePolitico`.

    Estrutura (briefing — prioridade de leitura para analista, ≤60s):
        1. Decisão (capa = score + forte/médio/fraco + risco + resumo + 3 alertas)
        2. Força eleitoral
        3. Mapa eleitoral (regiões fortes/fracas + interpretação curta)
        4. Trajetória resumida (top 5)
        5. Jurídico
        6. Financeiro
        7. Comportamento político (perfil + comportamento)
        8. Redes sociais (opcional)
        9. Legislativo (opcional)
        10. Alertas adicionais (só se > 3)

    Blocos com `disponivel: false` mostram banner "Dados não disponíveis ainda".
    Não recalcula nada — todos os números vêm do schema.
    """
    ident   = dossie.identificacao
    perfil  = dossie.perfil_politico
    traj    = dossie.trajetoria
    desemp  = dossie.desempenho_eleitoral
    fin     = dossie.financeiro
    legis   = dossie.legislativo
    redes   = dossie.redes_sociais
    juri    = dossie.juridico
    intel   = dossie.inteligencia

    nome_exib = ident.nome_urna or ident.nome
    nome_comp = ident.nome
    hoje      = date.today().strftime("%d/%m/%Y")
    score     = intel.score
    overall   = dossie.overall_ultimo_ciclo

    # ── Foto + badge overall ───────────────────────────────────────────────
    foto_data = _foto_base64(ident.foto_url)
    if foto_data:
        foto_inner = f'<img class="hero-foto" src="{foto_data}" alt="{_e(nome_exib)}" />'
    else:
        inicial = (nome_exib[0] if nome_exib else "?").upper()
        foto_inner = f'<div class="hero-foto-fallback">{inicial}</div>'

    overall_badge = ""
    if overall is not None:
        overall_badge = (
            f'<div class="hero-overall-badge {_hero_overall_css(overall)}">'
            f'{int(overall)}</div>'
        )
    foto_html = f'<div class="hero-foto-wrap">{foto_inner}{overall_badge}</div>'

    # ── Cargo do ciclo ativo ───────────────────────────────────────────────
    cargos_disp = traj.cargos_disputados or []
    ano_ciclo_ativo = dossie.ano_ciclo_ativo
    ult_cand = None
    if ano_ciclo_ativo is not None:
        ult_cand = next((c for c in cargos_disp if c.ano == ano_ciclo_ativo), None)
    if ult_cand is None and cargos_disp:
        ult_cand = cargos_disp[0]
    cargo_linha = ""
    if ult_cand:
        partes = [ult_cand.cargo, ult_cand.estado_uf or ""]
        municipio = getattr(ult_cand, "municipio", None)
        if municipio:
            partes.append(municipio)
        partes.append(str(ult_cand.ano))
        cargo_linha = " - ".join(p for p in partes if p)

    # ── Pills partido + ideologia ──────────────────────────────────────────
    partido_pill = ""
    if perfil.partido_atual:
        partido_pill = f'<span class="hero-pill-partido">{_e(perfil.partido_atual)}</span>'
    ideologia_pill = ""
    if perfil.ideologia_aproximada:
        ideologia_pill = f'<span class="hero-pill-ideologia">{_e(perfil.ideologia_aproximada)}</span>'

    # ── Dados pessoais em linha (idade, genero, escolaridade, ocupacao, UF) ──
    dados_pessoais = []
    if ident.idade:
        dados_pessoais.append(("👤", f"{ident.idade} anos"))
    if ident.genero:
        dados_pessoais.append(("⚧", ident.genero.lower()))
    if ident.grau_instrucao:
        dados_pessoais.append(("🎓", ident.grau_instrucao.lower()))
    if ident.ocupacao:
        dados_pessoais.append(("💼", ident.ocupacao.lower()))
    uf_destino = (ult_cand.estado_uf if ult_cand else None) or ident.estado_nascimento
    if uf_destino:
        dados_pessoais.append(("📍", uf_destino))

    dados_html = ""
    if dados_pessoais:
        itens = "".join(
            f'<span class="hero-dado"><span style="font-size:9pt">{ico}</span> {_e(valor)}</span>'
            for ico, valor in dados_pessoais
        )
        dados_html = f'<div class="hero-dados-pessoais">{itens}</div>'

    # ── KPIs (votos ciclo, votos carreira, eleicoes, vitorias, taxa) ──────
    total_eleicoes = len(cargos_disp)
    total_vitorias = sum(1 for c in cargos_disp if c.resultado == "ELEITO")
    taxa_vitoria = (100 * total_vitorias / total_eleicoes) if total_eleicoes > 0 else 0
    # Votos carreira: quando ciclo teve 2T, conta so o 2T (1T+2T do mesmo ciclo
    # seriam eleicoes distintas)
    votos_carreira = 0
    for c in cargos_disp:
        if c.disputou_segundo_turno and c.votos_2t:
            votos_carreira += c.votos_2t
        else:
            votos_carreira += (c.votos or 0)

    votos_ciclo = 0
    if ult_cand:
        votos_ciclo = (
            ult_cand.votos_2t if (ult_cand.disputou_segundo_turno and ult_cand.votos_2t)
            else ult_cand.votos or 0
        )

    kpis_html = f"""
    <div class="hero-kpis">
        <div class="hero-kpi">
            <div class="hero-kpi-label">Votos {ano_ciclo_ativo or ''}</div>
            <div class="hero-kpi-valor">{_fmt(votos_ciclo)}</div>
        </div>
        <div class="hero-kpi">
            <div class="hero-kpi-label">Votos carreira</div>
            <div class="hero-kpi-valor">{_fmt(votos_carreira)}</div>
        </div>
        <div class="hero-kpi">
            <div class="hero-kpi-label">Eleições</div>
            <div class="hero-kpi-valor">{total_eleicoes}</div>
        </div>
        <div class="hero-kpi">
            <div class="hero-kpi-label">Vitórias</div>
            <div class="hero-kpi-valor hero-kpi-valor-green">{total_vitorias}</div>
        </div>
        <div class="hero-kpi">
            <div class="hero-kpi-label">Taxa</div>
            <div class="hero-kpi-valor">{int(round(taxa_vitoria))}%</div>
        </div>
    </div>"""

    # ── MiniScores (ELE, FIN, POL, JUR, DIG) + Risco + Potencial + Alertas ──
    def _mini_score(label, valor, disp):
        css = _mini_score_css(valor, disp)
        valor_str = f"{int(round(valor))}" if (disp and valor is not None) else "-"
        return (
            f'<div class="mini-score {css}">'
            f'<div class="mini-score-valor">{valor_str}</div>'
            f'<div class="mini-score-label">{label}</div>'
            f'</div>'
        )

    mini_scores_html = "".join([
        _mini_score("ELE", score.eleitoral, score.eleitoral_disponivel),
        _mini_score("FIN", score.financeiro, score.financeiro_disponivel),
        _mini_score("POL", score.politico, score.politico_disponivel),
        _mini_score("JUR", score.juridico, score.juridico_disponivel),
        _mini_score("DIG", score.digital, score.digital_disponivel),
    ])

    n_alertas = len(intel.alertas)
    alertas_pill = ""
    if n_alertas > 0:
        alertas_pill = (
            f'<span class="hero-pill-alertas">⚠ {n_alertas} alerta'
            f'{"s" if n_alertas > 1 else ""}</span>'
        )

    scores_linha_html = f"""
    <div class="hero-scores">
        {mini_scores_html}
        <span class="hero-divider"></span>
        {_hero_pill_nivel_html(intel.classificacao.risco, "Risco")}
        {_hero_pill_nivel_html(intel.classificacao.potencial, "Potencial")}
        {alertas_pill}
    </div>"""

    # ── Logo do partido à direita ─────────────────────────────────────────
    logo_html = ""
    logo_data = _logo_partido_base64(perfil.partido_atual)
    if logo_data:
        logo_html = f'<div class="hero-logo-partido"><img src="{logo_data}" /></div>'

    capa_html = f"""
    <div class="hero">
        <div class="hero-col hero-col-foto">{foto_html}</div>
        <div class="hero-col hero-col-info">
            {logo_html}
            <div class="hero-nome-linha">
                <span class="hero-nome">{_e(nome_exib)}</span>
                {partido_pill}
                {ideologia_pill}
            </div>
            {f'<div class="hero-nome-comp">{_e(nome_comp)}</div>' if nome_comp != nome_exib else ''}
            {f'<div class="hero-cargo">{_e(cargo_linha)}</div>' if cargo_linha else ''}
            {dados_html}
            {kpis_html}
            {scores_linha_html}
        </div>
    </div>"""

    # ── Síntese + Alertas críticos (substituem o antigo bloco DECISÃO roxo) ──
    sintese_html = ""
    if dossie.resumo_executivo:
        primeiro_paragrafo = dossie.resumo_executivo.split("\n\n")[0]
        sintese_html = f"""
        <div class="section">
            {_sh("#7c3aed", "Síntese do candidato")}
            <div style="background:#faf5ff;border-left:3px solid #7c3aed;border-radius:6px;padding:9px 12px">
                <p style="font-size:9pt;line-height:1.5;color:#374151;margin:0">
                    {_e(primeiro_paragrafo)}
                </p>
            </div>
        </div>"""

    alertas_topo_html = ""
    top3 = intel.alertas[:3]
    if top3:
        items = "".join(
            f'<li style="font-size:8.5pt;color:#92400e;margin-bottom:3px;line-height:1.4;list-style:none">'
            f'<span style="color:#f59e0b;margin-right:4px;font-weight:900">•</span>{_e(a)}</li>'
            for a in top3
        )
        rodape_extras = (
            f'<p style="font-size:7.5pt;color:#a16207;margin:6px 0 0 0;font-style:italic">'
            f'+{len(intel.alertas) - 3} alerta(s) adicional(is) — ver no fim do documento</p>'
            if len(intel.alertas) > 3 else ''
        )
        alertas_topo_html = f"""
        <div class="section">
            {_sh("#f59e0b", "⚠ Alertas críticos")}
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:9px 12px">
                <ul style="margin:0;padding:0;list-style:none">{items}</ul>
                {rodape_extras}
            </div>
        </div>"""

    # ── 2. Resumo executivo COMPLETO (parágrafos extras além do que está na capa) ──
    # A síntese (1º parágrafo) já aparece na capa. Aqui mostramos o restante
    # apenas se o resumo tiver mais de 1 parágrafo.
    resumo_html = ""
    if dossie.resumo_executivo and "\n\n" in dossie.resumo_executivo:
        paragrafos_extras = dossie.resumo_executivo.split("\n\n")[1:]
        if paragrafos_extras:
            paragrafos_html = "".join(
                f'<p style="margin-bottom:6px;font-size:9pt;line-height:1.5;color:#374151">{p}</p>'
                for p in paragrafos_extras
            )
            resumo_html = f"""
            <div class="section">
                {_sh("#6366F1", "Análise Estendida")}
                <div class="analise-box">
                    <div class="analise-titulo">Detalhamento da síntese</div>
                    {paragrafos_html}
                </div>
            </div>"""

    # ── 3. Comportamento Político (combina perfil + comportamento) ──────────
    comp = intel.comportamento
    if perfil.disponivel:
        historico_html = ""
        if len(perfil.historico_partidos) > 1:
            chips = " → ".join(
                f'<span style="background:#f3f4f6;color:#374151;font-size:7.5pt;'
                f'font-weight:700;padding:1px 6px;border-radius:100px">{p}</span>'
                for p in perfil.historico_partidos
            )
            historico_html = f"""
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:6px">
                <span style="font-size:8pt;color:#6b7280">Histórico de partidos</span>
                <div style="display:flex;flex-wrap:wrap;gap:3px;justify-content:flex-end;max-width:65%">
                    {chips}
                </div>
            </div>"""
        coerencia_html = ""
        if comp.coerencia_ideologica is not None:
            coerencia_html = f"""
            <div style="display:flex;justify-content:space-between;margin-top:6px">
                <span style="font-size:8pt;color:#6b7280">Coerência ideológica</span>
                <span style="font-size:9pt;font-weight:700;color:#111827">{comp.coerencia_ideologica:.0f}%</span>
            </div>"""
        if perfil.alinhamento_partido is not None:
            alinhamento_html = f"""
            <div style="display:flex;justify-content:space-between;margin-top:6px">
                <span style="font-size:8pt;color:#6b7280">Alinhamento partidário</span>
                <span style="font-size:9pt;font-weight:700;color:#111827">{perfil.alinhamento_partido:.0f}%</span>
            </div>"""
        else:
            alinhamento_html = """
            <div style="display:flex;justify-content:space-between;margin-top:6px">
                <span style="font-size:8pt;color:#6b7280">Alinhamento partidário</span>
                <span style="font-size:7.5pt;color:#9ca3af">não disponível ainda</span>
            </div>"""
        alinhamento_gov_html = ""
        if comp.alinhamento_governo is not None:
            alinhamento_gov_html = f"""
            <div style="display:flex;justify-content:space-between;margin-top:6px">
                <span style="font-size:8pt;color:#6b7280">Alinhamento ao governo</span>
                <span style="font-size:9pt;font-weight:700;color:#111827">{comp.alinhamento_governo:.0f}%</span>
            </div>"""
        ideologia_label = perfil.ideologia_aproximada or "não classificada"
        comportamento_html = f"""
        <div class="section">
            {_sh("#A855F7", "Comportamento Político")}
            <div style="border:1px solid #f3e8ff;background:#faf5ff;border-radius:8px;padding:10px 12px">
                <div style="display:flex;justify-content:space-between">
                    <span style="font-size:8pt;color:#6b7280">Partido atual</span>
                    <span style="font-size:9pt;font-weight:700;color:#111827">{perfil.partido_atual or '—'}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:6px">
                    <span style="font-size:8pt;color:#6b7280">Posição ideológica estimada</span>
                    <span style="font-size:8pt;font-weight:600;color:#7c3aed">{ideologia_label}</span>
                </div>
                {historico_html}
                {coerencia_html}
                {alinhamento_html}
                {alinhamento_gov_html}
                <div style="font-size:7pt;color:#9ca3af;margin-top:8px;font-style:italic">
                    A posição ideológica é uma estimativa institucional do partido — não representa a posição individual do candidato.
                </div>
            </div>
        </div>"""
    else:
        comportamento_html = f'<div class="section">{_sh("#A855F7","Comportamento Político")}{_sem_dados_box("Sem dados de perfil partidário.")}</div>'

    # ── 3b. Comparativos (ranking vs pares da MESMA disputa) ──────────────
    comp = dossie.comparativos
    if comp.disponivel and comp.votos_candidato and comp.votos_mediana_pares:
        posicao = comp.posicao_ranking or 0
        total = comp.total_candidatos or 0
        pct = comp.percentil or 0
        # Top X% (invertido: percentil 90 = top 10%)
        top_pct = max(1, int(round(100 - pct)))
        if pct >= 90:
            badge_bg, badge_fg, badge_label = "#dcfce7", "#166534", f"Top {top_pct}%"
        elif pct >= 70:
            badge_bg, badge_fg, badge_label = "#fef3c7", "#a16207", f"Top {top_pct}%"
        elif pct >= 30:
            badge_bg, badge_fg, badge_label = "#dbeafe", "#1e40af", f"Top {top_pct}%"
        else:
            badge_bg, badge_fg, badge_label = "#fee2e2", "#991b1b", f"Top {top_pct}%"

        # Barra proporcional (candidato vs mediana) — ambos escalados em relação ao maior
        maior = max(comp.votos_candidato, comp.votos_mediana_pares)
        pct_cand = int(round(100 * comp.votos_candidato / maior)) if maior else 0
        pct_med = int(round(100 * comp.votos_mediana_pares / maior)) if maior else 0
        # Razao multiplicativa pra leitura curta (sem "mediana" - termo estatistico)
        if comp.votos_mediana_pares and comp.votos_mediana_pares > 0:
            razao = comp.votos_candidato / comp.votos_mediana_pares
            if razao >= 1.2:
                leitura = f"Teve {razao:.1f}x mais votos que o concorrente tipico do cargo."
            elif razao >= 0.8:
                leitura = "Votacao alinhada com a do concorrente tipico do cargo."
            else:
                leitura = f"Votacao abaixo do concorrente tipico do cargo ({int((1-razao)*100)}% menos)."
        else:
            leitura = ""

        # Recorte geografico explicito no titulo (municipal inclui cidade)
        cargo_disp = comp.cargo or ""
        if getattr(comp, "escopo", None) == "municipal" and comp.municipio and comp.estado_uf:
            geo_disp = f" — {comp.municipio}/{comp.estado_uf}"
        elif getattr(comp, "escopo", None) == "nacional":
            geo_disp = " — Brasil"
        elif comp.estado_uf:
            geo_disp = f" — {comp.estado_uf}"
        else:
            geo_disp = ""
        ano_disp = f" — {comp.ano}" if comp.ano else ""
        titulo_comp = f"Comparativos — {cargo_disp}{geo_disp}{ano_disp}".strip(" —")

        # Universo de comparacao em linguagem clara
        cargo_lower = (comp.cargo or "").lower()
        if getattr(comp, "escopo", None) == "municipal" and comp.municipio:
            universo_txt = f"Comparado aos candidatos a {cargo_lower} no mesmo municipio, no mesmo ciclo."
        elif getattr(comp, "escopo", None) == "nacional":
            universo_txt = f"Comparado aos candidatos a {cargo_lower} no Brasil, no mesmo ciclo."
        elif comp.estado_uf:
            universo_txt = f"Comparado aos candidatos a {cargo_lower} em {comp.estado_uf}, no mesmo ciclo."
        else:
            universo_txt = ""

        comparativos_html = f"""
        <div class="section">
            {_sh("#7c3aed", titulo_comp)}
            {f'<p style="font-size:8pt;color:#6b7280;font-style:italic;margin-bottom:8px">{universo_txt}</p>' if universo_txt else ''}
            <div style="display:flex;align-items:flex-end;gap:14px;margin-bottom:10px">
                <div>
                    <div style="font-size:22pt;font-weight:900;color:#166534;line-height:1">
                        {posicao}º
                    </div>
                    <div style="font-size:8pt;color:#6b7280;margin-top:2px">
                        de <strong>{_fmt(total)}</strong> candidatos no cargo
                    </div>
                </div>
                <div>
                    <span style="background:{badge_bg};color:{badge_fg};font-size:8pt;
                          font-weight:700;padding:3px 10px;border-radius:100px;
                          display:inline-block">{badge_label}</span>
                </div>
            </div>
            <div style="margin-bottom:6px">
                <div style="display:flex;justify-content:space-between;font-size:8pt;margin-bottom:2px">
                    <span style="font-weight:700;color:#111827">Candidato</span>
                    <span style="font-weight:700;color:#111827;font-family:'Barlow',monospace">
                        {_fmt(comp.votos_candidato)}
                    </span>
                </div>
                <div class="comp-bar">
                    <div class="comp-bar-fill" style="width:{pct_cand}%"></div>
                </div>
            </div>
            <div>
                <div style="display:flex;justify-content:space-between;font-size:8pt;margin-bottom:2px">
                    <span style="color:#6b7280">Concorrente tipico</span>
                    <span style="color:#6b7280;font-family:'Barlow',monospace">
                        {_fmt(comp.votos_mediana_pares)}
                    </span>
                </div>
                <div class="comp-bar">
                    <div class="comp-bar-mediana" style="width:{pct_med}%"></div>
                </div>
            </div>
            {f'<p style="font-size:8pt;color:#475569;margin-top:8px;font-style:italic">{leitura}</p>' if leitura else ''}
        </div>"""
    else:
        comparativos_html = ""

    # ── 4. Trajetória RESUMIDA (top 5 candidaturas mais recentes) ─────────
    if traj.disponivel and traj.cargos_disputados:
        TOP_N = 5
        exibidas = traj.cargos_disputados[:TOP_N]
        omitidas = len(traj.cargos_disputados) - len(exibidas)
        cards = ""
        for c in exibidas:
            if c.resultado == "ELEITO":
                bg, badge_bg, badge_fg, badge_label = "#f0fdf4", "#dcfce7", "#166534", "Eleito"
            elif c.resultado == "SUPLENTE":
                bg, badge_bg, badge_fg, badge_label = "#fffbeb", "#fef3c7", "#a16207", "Suplente"
            else:
                bg, badge_bg, badge_fg, badge_label = "white", "#f3f4f6", "#6b7280", "Não eleito"
            local = " · ".join([s for s in [c.municipio, c.estado_uf] if s])
            cards += f"""
            <div style="display:flex;align-items:center;gap:8px;background:{bg};
                        border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;margin-bottom:5px">
                <div style="font-size:11pt;font-weight:700;color:#111827;width:40px;text-align:center">{c.ano}</div>
                <div style="flex:1">
                    <div style="font-size:9pt;font-weight:600;color:#374151">
                        {c.cargo}
                        <span style="background:{badge_bg};color:{badge_fg};font-size:6.5pt;
                                     font-weight:700;padding:1px 6px;border-radius:100px;margin-left:4px">{badge_label}</span>
                        {f'<span style="font-size:7pt;color:#9ca3af;margin-left:4px">{c.partido}</span>' if c.partido else ''}
                    </div>
                    <div style="font-size:7.5pt;color:#9ca3af;margin-top:1px">{local}</div>
                </div>
                <div style="text-align:right">
                    <div style="font-size:10pt;font-weight:700;color:#111827">{_fmt(c.votos)}</div>
                    <div style="font-size:6.5pt;color:#9ca3af">votos</div>
                </div>
            </div>"""
        rodape_omitidas = (
            f'<p style="font-size:7pt;color:#9ca3af;text-align:center;margin-top:5px;font-style:italic">'
            f'+{omitidas} candidatura(s) anterior(es) não exibidas</p>'
            if omitidas > 0 else ''
        )
        trajetoria_html = f"""
        <div class="section">
            {_sh("#1E3A8A", "Trajetória Resumida")}
            {cards}
            {rodape_omitidas}
        </div>"""
    else:
        trajetoria_html = (
            f'<div class="section">{_sh("#1E3A8A","Trajetória Resumida")}'
            f'{_sem_dados_box("Nenhuma candidatura registrada nos dados do TSE.")}</div>'
        )

    # ── 5. Força Eleitoral (sem regiões — vão para o bloco Mapa abaixo) ────
    if desemp.disponivel:
        # Tendência: variação % entre as 2 últimas eleições com votos
        tendencia_html = '<p class="metric-valor" style="color:#d1d5db;font-size:14pt">—</p>'
        if len(desemp.evolucao_votos) >= 2:
            ord_evol = sorted(desemp.evolucao_votos, key=lambda e: -e.ano)
            atual_v, anterior_v = ord_evol[0].votos, ord_evol[1].votos
            if anterior_v > 0:
                pct = ((atual_v - anterior_v) / anterior_v) * 100
                if pct > 5:
                    tendencia_html = f'<p class="metric-valor" style="color:#15803d;font-size:14pt">+{pct:.0f}%</p>'
                elif pct < -5:
                    tendencia_html = f'<p class="metric-valor" style="color:#b91c1c;font-size:14pt">{pct:.0f}%</p>'
                else:
                    tendencia_html = '<p class="metric-valor" style="color:#374151;font-size:14pt">≈ 0%</p>'

        forca_eleitoral_html = f"""
        <div class="section">
            {_sh("#0D9488", "Força Eleitoral")}
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-valor" style="color:#0f766e;font-size:14pt">{_fmt(desemp.total_votos)}</div>
                    <div class="metric-label">votos da carreira</div>
                </div>
                <div class="metric-card">
                    <div class="metric-valor" style="color:#374151;font-size:14pt">{len(desemp.evolucao_votos)}</div>
                    <div class="metric-label">eleições com votos</div>
                </div>
                <div class="metric-card">
                    {tendencia_html}
                    <div class="metric-label">tendência últimos 2 ciclos</div>
                </div>
            </div>
        </div>"""
    else:
        forca_eleitoral_html = (
            f'<div class="section">{_sh("#0D9488","Força Eleitoral")}'
            f'{_sem_dados_box("Sem dados de força eleitoral.")}</div>'
        )

    # ── 5b. Mapa Eleitoral (regiões + interpretação curta) ─────────────────
    if desemp.disponivel and (desemp.regioes_fortes or desemp.regioes_fracas):
        chips_fortes = "".join(
            f'<span style="background:#f0fdf4;color:#166534;border:2px solid #86efac;'
            f'font-size:8pt;font-weight:600;padding:3px 9px;border-radius:100px;margin:2px;'
            f'display:inline-block">{r}</span>'
            for r in desemp.regioes_fortes
        )
        chips_fracas = "".join(
            f'<span style="background:#fff7ed;color:#9a3412;border:1px solid #fdba74;'
            f'font-size:7.5pt;font-weight:600;padding:2px 7px;border-radius:100px;margin:2px;'
            f'display:inline-block">{r}</span>'
            for r in desemp.regioes_fracas
        )
        # Interpretação curta automática
        if len(desemp.regioes_fortes) >= 3 and not desemp.regioes_fracas:
            interpretacao = "Base eleitoral concentrada em poucas regiões — força hiper-localizada."
        elif len(desemp.regioes_fortes) >= 3 and len(desemp.regioes_fracas) >= 3:
            interpretacao = "Distribuição ampla com regiões de força e regiões a desenvolver — base diversificada."
        elif 0 < len(desemp.regioes_fortes) < 3:
            interpretacao = "Base eleitoral pequena — espaço para ampliação geográfica."
        else:
            interpretacao = "Sem padrão geográfico claro nos dados disponíveis."

        bloco_fortes_html = (
            f'<div style="margin-top:8px"><div style="font-size:7pt;color:#15803d;'
            f'text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin-bottom:4px">'
            f'● Regiões fortes — onde concentra votos</div>{chips_fortes}</div>'
            if desemp.regioes_fortes else ""
        )
        bloco_fracas_html = (
            f'<div style="margin-top:8px"><div style="font-size:7pt;color:#9a3412;'
            f'text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin-bottom:4px">'
            f'● Regiões de menor presença</div>{chips_fracas}</div>'
            if desemp.regioes_fracas else ""
        )
        # Imagem real do choropleth (vinda do helper renderizar_geojson_png)
        mapa_img_html = ""
        if mapa_png:
            cargo_label = (mapa_meta or {}).get("cargo", "").title() if mapa_meta else ""
            ano_label = (mapa_meta or {}).get("ano") if mapa_meta else None
            local_label = (
                (mapa_meta or {}).get("municipio_nome")
                or (mapa_meta or {}).get("uf")
                or "Brasil"
            ) if mapa_meta else ""
            titulo_mapa = (
                f'<p style="font-size:7pt;color:#94a3b8;text-align:center;margin-top:4px">'
                f'{local_label} — {cargo_label} {ano_label}</p>'
                if local_label else ''
            )
            mapa_img_html = f"""
            <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:8px;margin-bottom:8px">
                <img class="mapa-img" src="{mapa_png}" />
                {titulo_mapa}
            </div>"""

        mapa_html = f"""
        <div class="section">
            {_sh("#2563EB", "Mapa Eleitoral")}
            <p style="font-size:8.5pt;color:#475569;font-style:italic;margin-bottom:6px">{interpretacao}</p>
            {mapa_img_html}
            {bloco_fortes_html}
            {bloco_fracas_html}
        </div>"""
    else:
        mapa_html = (
            f'<div class="section">{_sh("#2563EB","Mapa Eleitoral")}'
            f'{_sem_dados_box("Sem dados de votos por região para esse candidato.")}</div>'
        )

    # ── 6. Financeiro (KPIs + badge saldo + origem + concentracao + top doadores) ──
    if fin.disponivel:
        arrec = fin.total_arrecadado or 0
        gasto = fin.total_gasto or 0
        cpv = fin.cpv_benchmark.valor_candidato if fin.cpv_benchmark else None

        # KPIs principais (arrecadado / gasto / custo-voto)
        kpis_html = f"""
        <div class="metrics-grid">
            <div class="metric-card" style="background:#f0fdf4;border-color:#bbf7d0">
                <div class="metric-valor" style="color:#15803d;font-size:13pt">{_fmtBRL(fin.total_arrecadado) or '—'}</div>
                <div class="metric-label">arrecadado</div>
            </div>
            <div class="metric-card" style="background:#fef2f2;border-color:#fecaca">
                <div class="metric-valor" style="color:#b91c1c;font-size:13pt">{_fmtBRL(fin.total_gasto) or '—'}</div>
                <div class="metric-label">gasto</div>
            </div>
            <div class="metric-card" style="background:#f5f3ff;border-color:#ddd6fe">
                <div class="metric-valor" style="color:#5b21b6;font-size:13pt">{_fmtBRL(cpv) if cpv else '—'}</div>
                <div class="metric-label">custo/voto</div>
            </div>
        </div>"""

        # Badge saldo / déficit / equilibrado (igual frontend BadgeSaldoPrestacao)
        badge_saldo_html = ""
        if (fin.total_arrecadado or 0) > 0 or (fin.total_gasto or 0) > 0:
            diff = gasto - arrec
            pct_desvio = abs(diff) / arrec if arrec > 0 else 0
            if arrec > 0 and pct_desvio <= 0.02:
                bg, fg = "#f9fafb", "#374151"
                titulo = "Prestação equilibrada"
                detalhe = "Gastos e receitas declarados ao TSE em linha (±2%)."
            elif diff > 0:
                bg, fg = "#fffbeb", "#78350f"
                titulo = f"Déficit de {_fmtBRL(diff)}"
                detalhe = "Gastou mais do que arrecadou. Candidato declarou recursos próprios ou dívida de campanha ao TSE."
            else:
                bg, fg = "#ecfdf5", "#065f46"
                titulo = f"Saldo positivo de {_fmtBRL(abs(diff))}"
                detalhe = "Arrecadou mais do que gastou na campanha."
            badge_saldo_html = f"""
            <div style="background:{bg};color:{fg};border:1px solid {fg}33;
                 border-radius:8px;padding:7px 10px;margin-top:8px">
                <div style="font-size:9pt;font-weight:700">{titulo}</div>
                <div style="font-size:8pt;opacity:0.85;margin-top:2px">{detalhe}</div>
            </div>"""

        # Leitura curta do CPV
        cpv_leitura_html = ""
        if fin.cpv_benchmark and fin.cpv_benchmark.leitura_curta:
            base_info = ""
            if fin.cpv_benchmark.mediana_pares is not None and fin.cpv_benchmark.n_pares:
                base_info = (
                    f' <span style="color:#9ca3af">(mediana: {_fmtBRL(fin.cpv_benchmark.mediana_pares)}, '
                    f'base: {_fmt(fin.cpv_benchmark.n_pares)} candidatos)</span>'
                )
            cpv_leitura_html = f"""
            <div style="background:#f9fafb;border-radius:6px;padding:6px 10px;margin-top:8px;font-size:8pt;color:#4b5563">
                {_e(fin.cpv_benchmark.leitura_curta)}{base_info}
            </div>"""

        # Origem dos recursos — barra segmentada
        origem_html = ""
        if fin.origem_recursos:
            origem = fin.origem_recursos
            segs = []
            if origem.fundo_eleitoral_pct:
                pct_val = int(round(origem.fundo_eleitoral_pct * 100))
                if pct_val > 0:
                    segs.append(("Fundo Eleitoral", pct_val, "#7c3aed"))
            if origem.fundo_partidario_pct:
                pct_val = int(round(origem.fundo_partidario_pct * 100))
                if pct_val > 0:
                    segs.append(("Fundo Partidário", pct_val, "#a78bfa"))
            if origem.doacao_privada_pct:
                pct_val = int(round(origem.doacao_privada_pct * 100))
                if pct_val > 0:
                    segs.append(("Doação privada", pct_val, "#10b981"))
            if origem.recursos_proprios_pct:
                pct_val = int(round(origem.recursos_proprios_pct * 100))
                if pct_val > 0:
                    segs.append(("Próprios", pct_val, "#f59e0b"))
            if origem.outros_pct:
                pct_val = int(round(origem.outros_pct * 100))
                if pct_val > 0:
                    segs.append(("Outros", pct_val, "#6b7280"))
            if segs:
                barra_segs = "".join(
                    f'<div style="background:{cor};height:100%;width:{pct}%;display:inline-block"></div>'
                    for (_, pct, cor) in segs
                )
                legenda = "&nbsp;&nbsp;".join(
                    f'<span style="font-size:7.5pt;color:#4b5563">'
                    f'<span style="display:inline-block;width:8px;height:8px;background:{cor};border-radius:2px;vertical-align:middle;margin-right:3px"></span>'
                    f'{_e(label)} {pct}%</span>'
                    for (label, pct, cor) in segs
                )
                origem_html = f"""
                <div style="margin-top:10px">
                    <div style="font-size:8pt;font-weight:700;color:#4b5563;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.3px">Origem dos recursos</div>
                    <div style="background:#e5e7eb;border-radius:5px;height:10px;overflow:hidden;line-height:0;white-space:nowrap;font-size:0">
                        {barra_segs}
                    </div>
                    <div style="margin-top:4px">{legenda}</div>
                </div>"""

        # Concentracao de doadores (top 1, top 5, top 10, n)
        concentracao_html = ""
        if fin.concentracao:
            conc = fin.concentracao
            def pct_fmt(x):
                return f"{int(round(x*100))}%" if x is not None else "—"
            concentracao_html = f"""
            <div style="margin-top:10px">
                <div style="font-size:8pt;font-weight:700;color:#4b5563;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.3px">Concentração de doadores</div>
                <div class="metrics-grid">
                    <div class="metric-card" style="padding:6px"><div class="metric-valor" style="font-size:12pt">{pct_fmt(conc.top1_pct)}</div><div class="metric-label">Top 1</div></div>
                    <div class="metric-card" style="padding:6px"><div class="metric-valor" style="font-size:12pt">{pct_fmt(conc.top5_pct)}</div><div class="metric-label">Top 5</div></div>
                    <div class="metric-card" style="padding:6px"><div class="metric-valor" style="font-size:12pt">{pct_fmt(conc.top10_pct)}</div><div class="metric-label">Top 10</div></div>
                    <div class="metric-card" style="padding:6px"><div class="metric-valor" style="font-size:12pt">{_fmt(conc.n_doadores)}</div><div class="metric-label">Doadores</div></div>
                </div>
            </div>"""

        # Top 5 doadores (lista compacta)
        doadores_html = ""
        if fin.principais_doadores:
            itens = "".join(
                f"""<div style="display:flex;justify-content:space-between;padding:4px 6px;border-bottom:1px solid #f3f4f6">
                    <span style="font-size:8.5pt;color:#374151">
                        <span style="color:#9ca3af;margin-right:6px;font-weight:700">{i+1}</span>{_e(d.nome)}
                    </span>
                    <span style="font-size:8.5pt;font-weight:700;color:#111827;font-family:'Barlow',monospace">{_fmtBRL(d.valor)}</span>
                </div>"""
                for i, d in enumerate(fin.principais_doadores[:5])
            )
            doadores_html = f"""
            <div style="margin-top:10px">
                <div style="font-size:8pt;font-weight:700;color:#4b5563;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.3px">Principais doadores</div>
                <div style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
                    {itens}
                </div>
            </div>"""

        # Caso doadores nao disponiveis, mostra mensagem sem isso
        aviso_sem_detalhe = ""
        if not fin.doadores_disponiveis and not fin.principais_doadores:
            aviso_sem_detalhe = _sem_dados_box(
                "Detalhamento por doador e origem dos recursos ainda não disponíveis."
            )

        financeiro_html = f"""
        <div class="section">
            {_sh("#10B981", "Financeiro")}
            {kpis_html}
            {badge_saldo_html}
            {cpv_leitura_html}
            {origem_html}
            {concentracao_html}
            {doadores_html}
            {aviso_sem_detalhe}
        </div>"""
    else:
        financeiro_html = (
            f'<div class="section">{_sh("#10B981","Financeiro")}'
            f'{_sem_dados_box("Nenhum registro financeiro de campanha disponível.")}</div>'
        )

    # ── 7. Legislativo ────────────────────────────────────────────────────
    if legis.disponivel:
        legislativo_html = f"""
        <div class="section">
            {_sh("#2563EB", "Atividade Legislativa")}
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-valor" style="font-size:14pt">{_fmt(legis.projetos_apresentados)}</div>
                    <div class="metric-label">projetos apresentados</div>
                </div>
                <div class="metric-card">
                    <div class="metric-valor" style="font-size:14pt">{_fmt(legis.projetos_aprovados)}</div>
                    <div class="metric-label">projetos aprovados</div>
                </div>
            </div>
        </div>"""
    else:
        legislativo_html = (
            f'<div class="section">{_sh("#2563EB","Atividade Legislativa")}'
            f'{_sem_dados_box("Integração com Câmara e Senado ainda não disponível.")}</div>'
        )

    # ── 8. Jurídico ───────────────────────────────────────────────────────
    if juri.disponivel:
        ficha_label = "—" if juri.ficha_limpa is None else ("Sim" if juri.ficha_limpa else "Não")
        risco_juri = _badge_nivel_html(juri.risco_juridico, "Risco")

        # Lista de sanções administrativas (limitada a 5 para não estourar pagina)
        sancoes_html = ""
        if juri.sancoes:
            total = len(juri.sancoes)
            ativas = juri.sancoes_ativas
            header_txt = f"Sanções administrativas ({total}"
            if ativas > 0:
                header_txt += f" - {ativas} ativa{'s' if ativas > 1 else ''}"
            header_txt += ")"

            itens = []
            for s in juri.sancoes[:5]:
                bg = "#fef2f2" if s.ativa else "#f9fafb"
                bd = "#fecaca" if s.ativa else "#e5e7eb"
                badge_ativa = (
                    '<span style="font-size:7pt;font-weight:700;color:#b91c1c;'
                    'background:#fee2e2;padding:1px 4px;border-radius:3px;'
                    'margin-left:4px">ATIVA</span>' if s.ativa else ""
                )
                orgao_line = (
                    f'<div style="font-size:8pt;color:#4b5563;margin-top:2px">'
                    f'{_e(s.orgao_sancionador)}</div>' if s.orgao_sancionador else ""
                )
                data_ini = s.data_inicio or "?"
                data_fim = s.data_fim or "indeterminado"
                itens.append(f"""
                <div style="background:{bg};border:1px solid {bd};border-radius:6px;
                     padding:6px 8px;margin-top:4px">
                    <div>
                        <span style="font-size:7pt;font-weight:900;color:#fff;
                              background:#dc2626;padding:1px 5px;border-radius:3px">
                            {_e(s.fonte)}
                        </span>
                        <span style="font-size:9pt;font-weight:700;margin-left:4px">
                            {_e(s.tipo_sancao or "Sanção")}
                        </span>
                        {badge_ativa}
                    </div>
                    {orgao_line}
                    <div style="font-size:7pt;color:#6b7280;margin-top:2px">
                        {data_ini} → {data_fim}
                    </div>
                </div>""")

            extra = ""
            if total > 5:
                extra = (
                    f'<div style="font-size:7pt;color:#6b7280;font-style:italic;'
                    f'margin-top:4px">+ {total - 5} outras sanções</div>'
                )

            sancoes_html = f"""
            <div style="margin-top:10px">
                <div style="font-size:8pt;font-weight:700;color:#b91c1c;
                     text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">
                    ⚠ {header_txt}
                </div>
                {"".join(itens)}
                {extra}
            </div>"""

        juridico_html = f"""
        <div class="section">
            {_sh("#374151", "Jurídico")}
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px">
                <div style="display:flex;justify-content:space-between">
                    <span style="font-size:8pt;color:#6b7280">Ficha limpa</span>
                    <span style="font-size:9pt;font-weight:700">{ficha_label}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:6px">
                    <span style="font-size:8pt;color:#6b7280">Total de processos</span>
                    <span style="font-size:9pt;font-weight:700">{_fmt(juri.processos_total)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:6px;align-items:center">
                    <span style="font-size:8pt;color:#6b7280">Risco jurídico</span>
                    {risco_juri}
                </div>
                {sancoes_html}
            </div>
        </div>"""
    else:
        juridico_html = (
            f'<div class="section">{_sh("#374151","Jurídico")}'
            f'{_sem_dados_box("Sem registro de ficha limpa ou sanções administrativas para este candidato.")}</div>'
        )

    # ── 9. Redes sociais ──────────────────────────────────────────────────
    if redes.disponivel:
        linhas = []
        if redes.instagram:
            linhas.append(f"Instagram: @{redes.instagram}")
        if redes.twitter:
            linhas.append(f"Twitter: @{redes.twitter}")
        if redes.tiktok:
            linhas.append(f"TikTok: @{redes.tiktok}")
        if redes.seguidores_total is not None:
            linhas.append(f"Seguidores totais: {_fmt(redes.seguidores_total)}")
        conteudo = "<br>".join(linhas) or "—"
        redes_html = f"""
        <div class="section">
            {_sh("#EC4899", "Redes Sociais")}
            <div style="font-size:9pt;color:#374151;border:1px solid #f3e8ff;
                        border-radius:8px;padding:10px 12px">{conteudo}</div>
        </div>"""
    else:
        redes_html = (
            f'<div class="section">{_sh("#EC4899","Redes Sociais")}'
            f'{_sem_dados_box("Coleta de redes sociais ainda não disponível.")}</div>'
        )

    # ── 10. Alertas adicionais (só se houver mais de 3 — top 3 já estão na capa) ──
    # O bloco "inteligência" antigo foi dividido:
    #   - Top 3 alertas + classificação → CAPA (bloco Decisão)
    #   - Comportamento (coerência, alinhamento) → bloco "Comportamento Político"
    #   - Alertas EXTRAS (>3) → este bloco aqui no fim
    alertas_extras = intel.alertas[3:]
    if alertas_extras:
        items_html = "".join(
            f'<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;'
            f'padding:6px 9px;margin-bottom:4px;display:flex;align-items:flex-start;gap:6px">'
            f'<span style="color:#a16207;font-size:9pt;font-weight:700">⚠</span>'
            f'<span style="color:#92400e;font-size:8pt;line-height:1.4">{a}</span>'
            f'</div>'
            for a in alertas_extras
        )
        inteligencia_html = f"""
        <div class="section">
            {_sh("#F59E0B", f"Alertas adicionais ({len(alertas_extras)})")}
            {items_html}
        </div>"""
    else:
        inteligencia_html = ""

    # ── Assembla HTML final na nova hierarquia ────────────────────────────
    # Ordem (briefing - prioridade de leitura para analista, ≤60s):
    #   1. CAPA (decisão: score + forte/médio/fraco + risco + síntese + 3 alertas)
    #   2. Força eleitoral
    #   3. Mapa eleitoral
    #   4. Trajetória resumida
    #   5. Jurídico
    #   6. Financeiro
    #   7. Comportamento político (perfil + comportamento)
    #   8. Redes sociais (opcional)
    #   9. Legislativo (opcional, fora da hierarquia principal)
    #  10. Análise estendida (parágrafos extras do resumo, se houver)
    #  11. Alertas adicionais (só renderiza se >3)
    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Dossiê — {nome_exib}</title></head>
<body>

{capa_html}
{sintese_html}
{alertas_topo_html}
{trajetoria_html}
{comparativos_html}
{forca_eleitoral_html}
{mapa_html}
{juridico_html}
{financeiro_html}
{comportamento_html}
{redes_html}
{legislativo_html}
{resumo_html}
{inteligencia_html}

<div class="footer">
    Plataforma de Inteligência Eleitoral — União Brasil &nbsp;·&nbsp; Gerado em {hoje} &nbsp;·&nbsp; Documento interno, uso restrito.
</div>

</body>
</html>"""

    return HTML(string=html).write_pdf(stylesheets=[_CSS])
