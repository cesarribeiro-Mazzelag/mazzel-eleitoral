"use client";
import { FileText, Download, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";

const RELATORIOS = [
  { id: "dossie_politico", titulo: "Dossiê do Político", descricao: "Histórico completo de votação, candidaturas e desempenho por eleição.", perfis: ["PRESIDENTE", "DIRETORIA", "FUNCIONARIO"], disponivel: true, href: "/politicos" },
  { id: "farol_nacional",  titulo: "Farol Nacional",     descricao: "Mapa de força eleitoral de todos os municípios do Brasil.", perfis: ["PRESIDENTE", "DIRETORIA"], disponivel: true, href: "/mapa" },
  { id: "resumo_delegados", titulo: "Resumo por Delegado", descricao: "Desempenho, cobertura de zonas e atividade de filiação dos delegados.", perfis: ["PRESIDENTE", "DIRETORIA"], disponivel: false },
  { id: "evolucao_filiados", titulo: "Evolução de Filiados", descricao: "Crescimento da base de filiados por estado, município e período.", perfis: ["PRESIDENTE", "DIRETORIA", "DELEGADO"], disponivel: false },
  { id: "alertas_resumo", titulo: "Relatório de Alertas", descricao: "Consolidado de alertas críticos e ações tomadas.", perfis: ["PRESIDENTE", "DIRETORIA"], disponivel: false },
  { id: "comparativo_eleicoes", titulo: "Comparativo de Eleições", descricao: "Evolução de votos e eleitos entre 2016, 2020 e 2024.", perfis: ["PRESIDENTE", "DIRETORIA"], disponivel: false },
];

function CardRelatorio({ relatorio, perfilUsuario }) {
  const temAcesso = relatorio.perfis.includes(perfilUsuario);
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all ${temAcesso && relatorio.disponivel ? "bg-white border-gray-200 hover:shadow-md cursor-pointer" : "bg-gray-50 border-gray-100"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-uniao-azul/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-uniao-azul" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-sm ${!temAcesso ? "text-gray-400" : "text-gray-900"}`}>{relatorio.titulo}</h3>
          <p className={`text-xs mt-0.5 leading-relaxed ${!temAcesso ? "text-gray-300" : "text-gray-500"}`}>{relatorio.descricao}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {relatorio.perfis.map((p) => (<span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{p}</span>))}
        </div>
        {!temAcesso ? <Lock className="w-4 h-4 text-gray-300" />
          : relatorio.disponivel ? <a href={relatorio.href} className="flex items-center gap-1.5 text-xs font-medium text-uniao-azul hover:underline"><Download className="w-3.5 h-3.5" />Acessar</a>
          : <span className="text-xs text-gray-400 italic">Em breve</span>}
      </div>
    </div>
  );
}

export function RelatoriosContent() {
  const [usuario, setUsuario] = useState(null);
  useEffect(() => { setUsuario(api.getUser()); }, []);
  const perfil = usuario?.perfil ?? "FUNCIONARIO";
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-uniao-azul" />Relatórios
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Relatórios e exportações disponíveis para o seu perfil.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {RELATORIOS.map((r) => (<CardRelatorio key={r.id} relatorio={r} perfilUsuario={perfil} />))}
      </div>
      <p className="text-xs text-gray-400 text-center pt-4">Novos relatórios serão adicionados nas próximas versões da plataforma.</p>
    </div>
  );
}
