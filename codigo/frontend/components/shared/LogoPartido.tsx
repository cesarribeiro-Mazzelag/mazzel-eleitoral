"use client";

import { useState } from "react";

/**
 * Logo do partido com fallback progressivo.
 * Tenta (em ordem): /logos/partidos/{SIGLA}.png -> logo_url do banco -> quadrado colorido com sigla.
 * Reutilizavel em BarraLateral, MapaEleitoral, Radar, Dossie, etc.
 *
 * Prop `wide`: para partidos com logo horizontal (PP, Republicanos, Cidadania,
 * Podemos, etc) o container vira retangular (1.5x) para que a imagem ocupe área
 * visualmente legível em vez de ficar espremida verticalmente num quadrado.
 */
export function LogoPartido({
  sigla, logoUrl, cor, size = 56, wide = false, className = "",
}: {
  sigla: string;
  logoUrl?: string | null;
  cor: string;
  size?: number;
  wide?: boolean;
  className?: string;
}) {
  const siglaKey = sigla.toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
  const localUrl = `/logos/partidos/${siglaKey}.png`;
  const [src, setSrc]         = useState(localUrl);
  const [tentativa, setTent]  = useState<"local" | "remoto" | "fallback">("local");

  const handleError = () => {
    if (tentativa === "local" && logoUrl) {
      setSrc(logoUrl);
      setTent("remoto");
    } else {
      setTent("fallback");
    }
  };

  const abbr = sigla.length > 5 ? sigla.slice(0, 4) : sigla;
  // Container retangular pra logos horizontais (1.25x mais wide) — mesma altura,
  // um pouco mais de largura. 1.5x deixava desproporcional vs logos quadrados.
  const w = wide ? Math.round(size * 1.25) : size;
  const h = size;

  if (tentativa === "fallback") {
    return (
      <div
        className={`rounded-xl flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ width: w, height: h, backgroundColor: cor }}
      >
        <span className="font-black text-white leading-none text-center select-none"
              style={{ fontSize: size * 0.26 }}>
          {abbr}
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden flex-shrink-0 bg-white ${className}`}
         style={{ width: w, height: h }}>
      <img
        src={src}
        alt={sigla}
        className="w-full h-full object-contain p-1"
        onError={handleError}
      />
    </div>
  );
}
