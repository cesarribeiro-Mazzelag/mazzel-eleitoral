"use client";

/**
 * Lista de Filiados
 * DELEGADO: vê apenas os que cadastrou.
 * DIRETORIA/PRESIDENTE: vê todos, pode filtrar por estado.
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users, Plus, Search, Download, CheckCircle,
  Clock, XCircle, ChevronRight,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

function tkn() {
  return typeof window !== "undefined" ? (localStorage.getItem("ub_token") ?? "") : "";
}
function getUser() {
  try { return JSON.parse(localStorage.getItem("ub_user") ?? "null"); } catch { return null; }
}

function BadgeStatus({ status }) {
  if (status === "VALIDO") return (
    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
      <CheckCircle className="w-3 h-3" />Válido
    </span>
  );
  if (status === "INVALIDO") return (
    <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
      <XCircle className="w-3 h-3" />Inválido
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-gray-400">
      <Clock className="w-3 h-3" />Pendente
    </span>
  );
}

export function FiliadosContent() {
  const [dados, setDados] = useState({ filiados: [], total: 0 });
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroUF, setFiltroUF] = useState("");
  const [pagina, setPagina] = useState(1);
  const textoBuscado = useDebounce(busca, 350);
  const usuario = getUser();
  const isAdmin = ["PRESIDENTE", "DIRETORIA"].includes(usuario?.perfil);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const params = new URLSearchParams({ pagina, limite: 50 });
    if (filtroUF) params.set("estado_uf", filtroUF);
    if (textoBuscado) params.set("busca", textoBuscado);
    const r = await fetch(`${API}/filiados?${params}`, {
      headers: { Authorization: `Bearer ${tkn()}` },
    });
    if (r.ok) setDados(await r.json());
    setCarregando(false);
  }, [filtroUF, textoBuscado, pagina]);

  useEffect(() => { setPagina(1); }, [filtroUF, textoBuscado]);
  useEffect(() => { carregar(); }, [carregar]);

  function exportar() {
    const params = new URLSearchParams();
    if (filtroUF) params.set("estado_uf", filtroUF);
    window.open(`${API}/filiados/exportar?${params}&token=${tkn()}`, "_blank");
  }

  const totalPaginas = Math.ceil(dados.total / 50);

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Filiados</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {dados.total.toLocaleString("pt-BR")} filiado{dados.total !== 1 ? "s" : ""} cadastrado{dados.total !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportar}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
            <Link href="/filiados/novo" className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Novo Filiado
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome..."
              className="input pl-9 w-full"
            />
          </div>
          {isAdmin && (
            <select
              value={filtroUF}
              onChange={(e) => setFiltroUF(e.target.value)}
              className="input w-36"
            >
              <option value="">Todos os estados</option>
              {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          )}
        </div>

        {/* Lista */}
        {carregando ? (
          <div className="card p-8 flex justify-center">
            <div className="w-7 h-7 border-2 border-uniao-azul border-t-transparent rounded-full animate-spin" />
          </div>
        ) : dados.filiados.length === 0 ? (
          <div className="card p-10 text-center">
            <Users className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-4">Nenhum filiado encontrado.</p>
            <Link href="/filiados/novo" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />Cadastrar primeiro filiado
            </Link>
          </div>
        ) : (
          <>
            <div className="card divide-y divide-gray-50">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <div className="col-span-4">Nome</div>
                <div className="col-span-2">CPF (final)</div>
                <div className="col-span-2">Cidade / UF</div>
                <div className="col-span-2">CPF</div>
                <div className="col-span-1">Título</div>
                <div className="col-span-1"></div>
              </div>

              {dados.filiados.map((f) => (
                <Link
                  key={f.id}
                  href={`/filiados/${f.id}`}
                  className="grid grid-cols-12 gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group items-center"
                >
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-uniao-azul/10 flex items-center justify-center text-uniao-azul text-sm font-bold flex-shrink-0">
                      {f.nome_completo[0]?.toUpperCase()}
                    </div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-uniao-azul truncate">
                      {f.nome_completo}
                    </p>
                  </div>
                  <div className="col-span-2 text-sm text-gray-500">
                    ***.***.***-{f.cpf_ultimos4 ?? "??"}
                  </div>
                  <div className="col-span-2 text-sm text-gray-600 truncate">
                    {f.cidade || "-"}{f.estado_uf ? ` · ${f.estado_uf}` : ""}
                  </div>
                  <div className="col-span-2">
                    <BadgeStatus status={f.status_cpf} />
                  </div>
                  <div className="col-span-1">
                    <BadgeStatus status={f.status_titulo} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-uniao-azul" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-500">
                  Página {pagina} de {totalPaginas}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={pagina === 1}
                    className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={pagina === totalPaginas}
                    className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
