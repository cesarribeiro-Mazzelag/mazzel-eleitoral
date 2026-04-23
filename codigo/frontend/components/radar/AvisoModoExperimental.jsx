"use client";

/**
 * Aviso discreto "Dados em validação" — só aparece quando o backend
 * reporta `modo_dados = "EXPERIMENTAL"`.
 *
 * Faz UMA chamada por sessão (useState + useEffect, sem SWR pra não trazer
 * dependência nova). O endpoint /sistema/info é público e leve.
 */
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

export function AvisoModoExperimental() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let cancelado = false;
    fetch(`${API}/sistema/info`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelado) setInfo(j); })
      .catch(() => { if (!cancelado) setInfo(null); });
    return () => { cancelado = true; };
  }, []);

  if (!info || info.modo_dados !== "EXPERIMENTAL") return null;

  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <div className="leading-snug">
        <strong className="font-semibold">Dados em validação.</strong>{" "}
        {info.modo_dados_descricao || "Indicadores podem estar incompletos."}
      </div>
    </div>
  );
}
