"use client";

/**
 * Carta Politica V8 - aprovada em 19/04/2026.
 *
 * Design FIFA Ultimate Team adaptado (vindo do browser, referencia em
 * /Users/cesarribeiro/Downloads/CardCandidato.tsx):
 *   - Foto area 5/7 do card com gradiente 3-stop cor do partido
 *   - OVR glass translucido com tint do tier no topo-esquerdo
 *   - Bandeira oficial do estado no topo-direito (substituiu insignia V7)
 *   - Fade layer da foto pra cor do partido
 *   - Info area transparente: stripe + CARGO + NOME + stats box + chip partido + votos
 *   - Chip branco com logo do partido (LogoPartido compartilhado)
 *   - Moldura interna dupla (outer tier + inner glass)
 *
 * Download do card vive APENAS no dossie (/radar/politicos/[id]) via ref exposto.
 *
 * Zona protegida - nao alterar sem consultar Cesar.
 */
import { forwardRef } from "react";

const PARTY_COLORS = {
  PT:             { a: "#C8102E", b: "#8B0A1A", accent: "#FFDD00" },
  PSDB:           { a: "#005BAC", b: "#F5C500", accent: "#005BAC" },
  MDB:            { a: "#0A9E5A", b: "#F5C500", accent: "#0A9E5A" },
  PSD:            { a: "#F39200", b: "#005BAC", accent: "#F39200" },
  PL:             { a: "#002776", b: "#F5C500", accent: "#F5C500" },
  REPUBLICANOS:   { a: "#00874C", b: "#0055A4", accent: "#F5C518" },
  PSC:            { a: "#00874C", b: "#005BAC", accent: "#F5C518" },
  PSL:            { a: "#005BAC", b: "#00984C", accent: "#F5C518" },
  PTN:            { a: "#334155", b: "#64748B", accent: "#94A3B8" },
  PDT:            { a: "#E30613", b: "#005BAC", accent: "#F5C518" },
  NOVO:           { a: "#F39200", b: "#1A1A1A", accent: "#F39200" },
  DEM:            { a: "#005BAC", b: "#00984C", accent: "#F5C518" },
  PATRIOTA:       { a: "#00984C", b: "#F5C518", accent: "#005BAC" },
  PP:             { a: "#005BAC", b: "#00984C", accent: "#F5C518" },
  PSOL:           { a: "#E30613", b: "#F5C518", accent: "#F5C518" },
  PSB:            { a: "#FFDD00", b: "#005BAC", accent: "#005BAC" },
  "UNIÃO":        { a: "#005BAC", b: "#F5C518", accent: "#E30613" },
  UNIAO:          { a: "#005BAC", b: "#F5C518", accent: "#E30613" },
  AVANTE:         { a: "#005BAC", b: "#00984C", accent: "#F5C518" },
  SOLIDARIEDADE:  { a: "#E30613", b: "#F5C518", accent: "#005BAC" },
  CIDADANIA:      { a: "#E30613", b: "#FFFFFF", accent: "#005BAC" },
};

const DEFAULT_COLORS = { a: "#334155", b: "#64748B", accent: "#94A3B8" };

const NOME_GUERRA = {
  "CARLOS MASSA RATINHO JUNIOR":     "RATINHO JUNIOR",
  "CARLOS ROBERTO MASSA JUNIOR":     "RATINHO JUNIOR",
  "ASTRONAUTA MARCOS PONTES":        "ASTRONAUTA MARCOS PONTES",
  "PROFESSOR ORIOVISTO GUIMARAES":   "PROFESSOR ORIOVISTO",
  "LUIZ INACIO LULA DA SILVA":       "LULA",
  "JAIR MESSIAS BOLSONARO":          "BOLSONARO",
};

// Bandeiras servidas localmente em /public/bandeiras/UF.svg
// (baixadas de Wikimedia Commons em 19/04/2026, ver download_bandeiras.sh)
const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO","BR"];
const FLAGS = Object.fromEntries(UFS.map(uf => [uf, `/bandeiras/${uf}.svg`]));

function absFoto(fotoUrl) {
  if (!fotoUrl) return "";
  if (/^https?:\/\//i.test(fotoUrl)) return fotoUrl;
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  if (fotoUrl.startsWith("/")) return `${base}${fotoUrl}`;
  return `${base}/${fotoUrl}`;
}

function absLogo(sigla) {
  const clean = (sigla || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
  return `/logos/partidos/${clean}.png`;
}

function fmtNum(n) {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("pt-BR").format(n);
}

function getColors(sigla) {
  const key = (sigla || "").trim().toUpperCase();
  return PARTY_COLORS[key] || DEFAULT_COLORS;
}

function getTier(overall) {
  if (overall >= 90) return "dourado";
  if (overall >= 80) return "ouro";
  if (overall >= 70) return "prata";
  return "bronze";
}

function tierStyle(tier) {
  const map = {
    dourado: {
      bg:     "linear-gradient(135deg, rgba(35,32,22,0.85) 0%, rgba(22,20,14,0.92) 100%)",
      border: "rgba(245,197,24,0.55)",
      accent: "#F5C518",
      glow:   "rgba(245,197,24,0.6)",
      sub:    "rgba(245,197,24,0.95)",
    },
    ouro: {
      bg:     "linear-gradient(135deg, rgba(35,32,22,0.85) 0%, rgba(22,20,14,0.92) 100%)",
      border: "rgba(245,197,24,0.48)",
      accent: "#F5C518",
      glow:   "rgba(245,197,24,0.55)",
      sub:    "rgba(245,197,24,0.92)",
    },
    prata: {
      bg:     "linear-gradient(135deg, rgba(30,35,45,0.85) 0%, rgba(18,22,30,0.92) 100%)",
      border: "rgba(203,213,225,0.48)",
      accent: "#CBD5E1",
      glow:   "rgba(203,213,225,0.55)",
      sub:    "rgba(203,213,225,0.95)",
    },
    bronze: {
      bg:     "linear-gradient(135deg, rgba(40,28,22,0.85) 0%, rgba(28,18,14,0.92) 100%)",
      border: "rgba(205,127,50,0.55)",
      accent: "#CD7F32",
      glow:   "rgba(205,127,50,0.6)",
      sub:    "rgba(205,127,50,0.95)",
    },
  };
  return map[tier];
}

function renderNome(p) {
  const base = (p.nome_urna || p.nome || p.nome_completo || "").trim().toUpperCase();
  return NOME_GUERRA[base] || base;
}

function adaptiveFontSize(nome) {
  const len = nome.length;
  const palavras = nome.split(/\s+/).filter(Boolean);
  if (palavras.length <= 2) {
    if (len <= 8)  return 22;
    if (len <= 10) return 20;
    if (len <= 12) return 18.5;
    if (len <= 14) return 17;
    if (len <= 16) return 15.5;
    return 14;
  }
  return 14;
}

// Stats vem do backend como atributos_6 (VOT/FID/EFI/INT/ART/TER).
// O card aceita tambem politico.stats { vot, fid, efi, int, art, ter } por compatibilidade.
function getStats(p) {
  const fonte = p.atributos_6 || p.stats || {};
  return {
    VOT: fonte.VOT ?? fonte.vot,
    FID: fonte.FID ?? fonte.fid,
    EFI: fonte.EFI ?? fonte.efi,
    INT: fonte.INT ?? fonte.int,
    ART: fonte.ART ?? fonte.art,
    TER: fonte.TER ?? fonte.ter,
  };
}

export const CardPolitico = forwardRef(function CardPolitico(
  { politico, onAbrirDossie, width = 204, height = 360 },
  ref,
) {
  const p = politico;
  const colors = getColors(p.partido_sigla);
  const overall = p.overall ?? 0;
  const tier = getTier(overall);
  const ts = tierStyle(tier);
  const nome = renderNome(p);
  const cargoText = (p.cargo || "").toUpperCase();
  const nomeFontSize = adaptiveFontSize(nome);
  const flagUrl = FLAGS[(p.estado_uf || "").toUpperCase()] || "";
  const fotoUrl = absFoto(p.foto_url);
  const stats = getStats(p);
  const votos = p.votos_total ?? p.votos;
  const ano = p.ano ?? p.ano_eleicao;

  const palavras = nome.split(/\s+/).filter(Boolean);
  const nomeLinhas = palavras.length >= 3
    ? [palavras.slice(0, Math.ceil(palavras.length / 2)).join(" "), palavras.slice(Math.ceil(palavras.length / 2)).join(" ")]
    : [nome];

  const handleClick = () => onAbrirDossie?.(p.candidato_id ?? p.id);

  return (
    <div
      ref={ref}
      onClick={handleClick}
      style={{
        position: "relative",
        width,
        height,
        borderRadius: 14,
        overflow: "hidden",
        cursor: "pointer",
        background: `linear-gradient(${colors.a} 0%, ${colors.a} 65%, ${colors.b} 100%)`,
        boxShadow: "0 4px 14px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Moldura interna 1 (outer ring) */}
      <div style={{
        position: "absolute", top: 4, left: 4, right: 4, bottom: 4,
        borderRadius: 12,
        border: `1px solid ${colors.a}`,
        pointerEvents: "none", zIndex: 3,
      }} />
      {/* Moldura interna 2 (inner ring) */}
      <div style={{
        position: "absolute", top: 6, left: 6, right: 6, bottom: 6,
        borderRadius: 10,
        border: "2px solid rgba(255,255,255,0.12)",
        pointerEvents: "none", zIndex: 3,
      }} />

      {/* Foto do candidato (5/7 do card) - img com lazy/async pra baixar latencia */}
      {fotoUrl && (
        <img
          src={fotoUrl}
          alt={p.nome}
          loading="lazy"
          decoding="async"
          style={{
            position: "absolute", top: 0, left: 0,
            width: "100%", height: Math.round(height * 0.714),
            objectFit: "cover", objectPosition: "center top",
            display: "block",
          }}
        />
      )}

      {/* Fade layer: transparente -> cor A */}
      <div style={{
        position: "absolute", top: Math.round(height * 0.5), left: 0, right: 0, height: Math.round(height * 0.278),
        background: `linear-gradient(transparent 0%, ${colors.a} 90%)`,
        zIndex: 2,
      }} />

      {/* OVR box - glass translucido com tint do tier */}
      <div style={{
        position: "absolute", top: 14, left: 14,
        width: 50, height: 52,
        background: ts.bg,
        backdropFilter: "blur(12px) saturate(1.2)",
        WebkitBackdropFilter: "blur(12px) saturate(1.2)",
        border: `1px solid ${ts.border}`,
        borderRadius: 10,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 0 1px rgba(255,255,255,0.05) inset, 0 4px 14px rgba(0,0,0,0.4), 0 0 0 1px ${ts.border}`,
        zIndex: 10, overflow: "hidden",
      }}>
        <div style={{
          fontSize: 22, fontWeight: 900, color: "#FFFFFF",
          lineHeight: 1, letterSpacing: "-0.5px",
          textShadow: "0 1px 2px rgba(0,0,0,0.7)", marginTop: 1,
        }}>
          {overall}
        </div>
        <div style={{
          fontSize: 8.5, fontWeight: 800, color: ts.sub,
          letterSpacing: "1.3px", marginTop: 3,
          textShadow: "0 1px 2px rgba(0,0,0,0.6)",
        }}>
          OVR
        </div>
        <div style={{
          position: "absolute", bottom: 0, left: "50%",
          transform: "translateX(-50%)",
          width: "62%", height: 2.5,
          background: ts.accent,
          borderRadius: "2px 2px 0 0",
          boxShadow: `0 0 8px ${ts.glow}, 0 0 4px ${ts.glow}`,
        }} />
      </div>

      {/* Bandeira do estado - topo-direito */}
      {flagUrl && (
        <div style={{
          position: "absolute", top: 14, right: 14,
          width: 36, height: 26, borderRadius: 5,
          overflow: "hidden", background: "#FFFFFF",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.25) inset",
          zIndex: 10,
        }}>
          <img
            src={flagUrl}
            alt={p.estado_uf}
            loading="lazy"
            decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      )}

      {/* Info section - transparente, herdando gradiente do card */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "0 14px 12px",
        display: "flex", flexDirection: "column",
        zIndex: 4,
      }}>
        {/* Stripe cromatico */}
        <div style={{
          width: 28, height: 2,
          background: colors.accent || colors.b,
          marginBottom: 6, borderRadius: 1,
        }} />

        {/* CARGO */}
        <div style={{
          fontSize: 10, fontWeight: 700, color: "#FFFFFF",
          letterSpacing: "2.5px", marginBottom: 4,
          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
        }}>
          {cargoText}
        </div>

        {/* NOME */}
        <div style={{
          fontSize: nomeFontSize,
          fontWeight: 900,
          lineHeight: 1.02,
          color: "#FFFFFF",
          textShadow: "0 1px 3px rgba(0,0,0,0.55), 0 1px 1px rgba(0,0,0,0.4)",
          WebkitTextStroke: "0 transparent",
          fontFamily: "Inter, sans-serif",
          letterSpacing: "-0.3px",
          marginBottom: 6,
          whiteSpace: palavras.length <= 2 ? "nowrap" : "normal",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {nomeLinhas.map((linha, i) => (
            <div key={i}>{linha}</div>
          ))}
        </div>

        {/* Stats box - overlay escuro */}
        <div style={{
          background: "rgba(0,0,0,0.25)",
          borderRadius: 8,
          padding: "6px 8px",
          display: "flex", justifyContent: "space-between",
          marginBottom: 8,
        }}>
          {["VOT", "FID", "EFI", "INT", "ART", "TER"].map((k) => (
            <div key={k} style={{
              display: "flex", flexDirection: "column", alignItems: "center", flex: 1,
            }}>
              <div style={{
                fontSize: 8, fontWeight: 700, color: "#FFFFFF",
                letterSpacing: "0.5px", opacity: 0.85, lineHeight: 1,
              }}>
                {k}
              </div>
              <div style={{
                fontSize: 13, fontWeight: 900, color: "#FFFFFF",
                lineHeight: 1.2, marginTop: 2,
                textShadow: "0 1px 2px rgba(0,0,0,0.4)",
              }}>
                {stats[k] ?? "—"}
              </div>
            </div>
          ))}
        </div>

        {/* Rodape: chip partido + votos */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {/* Chip branco com logo do partido - logo proporcional (~73% da altura do chip) */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "#FFFFFF", borderRadius: 14,
            padding: "4px 10px", height: 30,
            minWidth: 58, maxWidth: 78,
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          }}>
            {p.partido_sigla && (
              <img
                src={absLogo(p.partido_sigla)}
                alt={p.partido_sigla}
                loading="lazy"
                decoding="async"
                style={{
                  height: 22,
                  width: "auto",
                  maxWidth: 60,
                  objectFit: "contain",
                  display: "block",
                }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
          </div>

          {/* Votos */}
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontSize: 8, fontWeight: 700, color: "#FFFFFF",
              letterSpacing: "0.8px", opacity: 0.85, lineHeight: 1,
            }}>
              VOTOS {ano ?? ""}
            </div>
            <div style={{
              fontSize: 14, fontWeight: 900, color: "#FFFFFF",
              lineHeight: 1.1, marginTop: 2,
              textShadow: "0 1px 2px rgba(0,0,0,0.45)",
            }}>
              {fmtNum(votos)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default CardPolitico;
