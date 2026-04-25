"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, FileText, MapPin, Award, Vote } from "lucide-react";
import { GraficoEvolucaoVotos } from "@/components/dossie/GraficoEvolucaoVotos";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
function tkn() { if (typeof window === "undefined") return ""; return localStorage.getItem("ub_token") ?? ""; }
function fmt(n) { if (n == null) return "-"; return Number(n).toLocaleString("pt-BR"); }

const FAROL_BADGE = {
  VERDE:    { bg: "bg-green-100",  text: "text-green-700",  label: "Força"    },
  AMARELO:  { bg: "bg-yellow-100", text: "text-yellow-700", label: "Frágil"   },
  VERMELHO: { bg: "bg-red-100",    text: "text-red-700",    label: "Fraqueza" },
};

export function MeuPainelContent() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    fetch(`${API}/meu-painel/resumo`, { headers: { Authorization: `Bearer ${tkn()}` } })
      .then((r) => { if (!r.ok) throw new Error("Sem vínculo configurado."); return r.json(); })
      .then(setDados)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-uniao-azul border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (erro) return (
    <div className="max-w-lg mx-auto mt-20 text-center card p-10">
      <Award className="w-12 h-12 mx-auto text-gray-300 mb-4" />
      <h2 className="text-lg font-semibold text-gray-700 mb-2">Perfil não vinculado</h2>
      <p className="text-sm text-gray-500">{erro}</p>
    </div>
  );

  const { candidato, candidaturas, farol_ultima_eleicao } = dados;
  const nomeExib = candidato.nome_urna || candidato.nome_completo;
  const ultima = candidaturas[0];
  const farolBadge = farol_ultima_eleicao?.status ? FAROL_BADGE[farol_ultima_eleicao.status] : null;
  const eleicoes = candidaturas.filter((c) => c.votos > 0).map((c) => ({ ano: c.ano, cargo: c.cargo, votos: c.votos, eleito: c.eleito })).reverse();
  const totalEleito = candidaturas.filter((c) => c.eleito).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card p-6 flex items-center gap-5">
        {candidato.foto_url ? (
          <img src={candidato.foto_url} alt={nomeExib} className="w-20 h-20 rounded-full object-cover border-4 border-uniao-azul/20 flex-shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-uniao-azul flex items-center justify-center flex-shrink-0 text-white text-2xl font-bold">{nomeExib[0]?.toUpperCase()}</div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{nomeExib}</h1>
          {candidato.nome_urna && <p className="text-sm text-gray-500 truncate">{candidato.nome_completo}</p>}
          <div className="flex flex-wrap gap-2 mt-2">
            {ultima && <span className="text-xs bg-uniao-azul/10 text-uniao-azul px-2 py-1 rounded-full font-medium">{ultima.cargo} · {ultima.estado_uf}</span>}
            {candidato.ocupacao && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{candidato.ocupacao}</span>}
            {candidato.grau_instrucao && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{candidato.grau_instrucao}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <Link href="/meu-dossie" className="flex items-center gap-2 bg-uniao-azul text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-uniao-azul/90 transition-colors"><FileText className="w-4 h-4" />Meu Dossiê</Link>
          <Link href="/meus-votos" className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"><MapPin className="w-4 h-4" />Meus Votos</Link>
        </div>
      </div>

      {ultima && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center"><div className="text-2xl font-bold text-gray-900">{fmt(ultima.votos)}</div><div className="text-xs text-gray-500 mt-1">votos em {ultima.ano}</div></div>
          <div className="card p-4 text-center"><div className="text-2xl font-bold text-gray-900">{candidaturas.length}</div><div className="text-xs text-gray-500 mt-1">candidaturas</div></div>
          <div className="card p-4 text-center"><div className="text-2xl font-bold text-gray-900">{totalEleito}</div><div className="text-xs text-gray-500 mt-1">vezes eleito</div></div>
          <div className="card p-4 flex flex-col items-center justify-center">
            {farolBadge ? (<><span className={`text-sm font-bold px-3 py-1 rounded-full ${farolBadge.bg} ${farolBadge.text}`}>{farolBadge.label}</span><div className="text-xs text-gray-500 mt-1">farol do município</div></>)
              : (<><span className="text-sm text-gray-400">—</span><div className="text-xs text-gray-400 mt-1">farol indisponível</div></>)}
          </div>
        </div>
      )}

      {farol_ultima_eleicao?.variacao_pct != null && (
        <div className="card p-5 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${farol_ultima_eleicao.variacao_pct >= 0 ? "bg-green-100" : "bg-red-100"}`}>
            {farol_ultima_eleicao.variacao_pct >= 0 ? <TrendingUp className="w-6 h-6 text-green-600" /> : <TrendingDown className="w-6 h-6 text-red-600" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Variação vs. eleição anterior</p>
            <p className={`text-xl font-bold ${farol_ultima_eleicao.variacao_pct >= 0 ? "text-green-600" : "text-red-600"}`}>
              {farol_ultima_eleicao.variacao_pct > 0 ? "+" : ""}{farol_ultima_eleicao.variacao_pct.toFixed(1)}%
            </p>
          </div>
          <div className="ml-auto text-right text-sm text-gray-500">
            <div>Eleição atual: <span className="font-semibold text-gray-800">{fmt(farol_ultima_eleicao.votos_atual)}</span></div>
            <div>Eleição anterior: <span className="font-semibold text-gray-800">{fmt(farol_ultima_eleicao.votos_anterior)}</span></div>
          </div>
        </div>
      )}

      {eleicoes.length > 1 && <div className="card p-5"><GraficoEvolucaoVotos dados={eleicoes} /></div>}

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Histórico Eleitoral</h3></div>
        <div className="divide-y divide-gray-50">
          {candidaturas.map((c, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-gray-400 w-10">{c.ano}</span>
                <div><p className="text-sm font-medium text-gray-800">{c.cargo}</p><p className="text-xs text-gray-500">{c.estado_uf}</p></div>
              </div>
              <div className="flex items-center gap-4">
                {c.votos > 0 && <span className="text-sm text-gray-600 flex items-center gap-1"><Vote className="w-3.5 h-3.5 text-gray-400" />{fmt(c.votos)}</span>}
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.eleito ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{c.eleito ? "Eleito" : c.situacao || "Não eleito"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
