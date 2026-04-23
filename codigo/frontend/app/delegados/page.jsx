"use client";

/**
 * Lista de Delegados
 * PRESIDENTE/DIRETORIA: vê todos, pode criar, filtrar por estado.
 * DELEGADO: vê apenas seus próprios dados.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, Plus, Search, MapPin, Phone, Mail,
  CheckCircle, XCircle, ChevronRight,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ModalCriarDelegado } from "@/components/delegados/ModalCriarDelegado";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

function tkn() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ub_token") ?? "";
}

function getUser() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("ub_user") ?? "null"); } catch { return null; }
}

export default function DelegadosPage() {
  const [delegados, setDelegados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroUF, setFiltroUF] = useState("");
  const [busca, setBusca] = useState("");
  const [criarAberto, setCriarAberto] = useState(false);
  const usuario = getUser();
  const isAdmin = ["PRESIDENTE", "DIRETORIA"].includes(usuario?.perfil);

  async function carregar(uf = filtroUF) {
    setCarregando(true);
    const params = new URLSearchParams({ ativo: "true" });
    if (uf) params.set("estado_uf", uf);
    const r = await fetch(`${API}/delegados?${params}`, {
      headers: { Authorization: `Bearer ${tkn()}` },
    });
    if (r.ok) setDelegados(await r.json());
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, [filtroUF]);

  const exibir = delegados.filter((d) =>
    !busca || d.nome.toUpperCase().includes(busca.toUpperCase())
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Delegados</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {delegados.length} delegado{delegados.length !== 1 ? "s" : ""} ativo{delegados.length !== 1 ? "s" : ""}
              {filtroUF ? ` em ${filtroUF}` : " no Brasil"}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setCriarAberto(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Delegado
            </button>
          )}
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

        {/* KPIs rápidos */}
        {isAdmin && delegados.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{delegados.length}</div>
              <div className="text-xs text-gray-500 mt-1">delegados ativos</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {delegados.reduce((s, d) => s + (d.filiados_cadastrados ?? 0), 0).toLocaleString("pt-BR")}
              </div>
              <div className="text-xs text-gray-500 mt-1">filiados cadastrados</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {delegados.reduce((s, d) => s + (d.municipios_cobertos ?? 0), 0).toLocaleString("pt-BR")}
              </div>
              <div className="text-xs text-gray-500 mt-1">municípios cobertos</div>
            </div>
          </div>
        )}

        {/* Lista */}
        {carregando ? (
          <div className="card p-8 flex justify-center">
            <div className="w-7 h-7 border-2 border-uniao-azul border-t-transparent rounded-full animate-spin" />
          </div>
        ) : exibir.length === 0 ? (
          <div className="card p-10 text-center">
            <Users className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhum delegado encontrado.</p>
          </div>
        ) : (
          <div className="card divide-y divide-gray-50">
            {exibir.map((d) => (
              <Link
                key={d.id}
                href={`/delegados/${d.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-uniao-azul/10 flex items-center justify-center flex-shrink-0 text-uniao-azul font-bold text-base">
                  {d.nome[0]?.toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-uniao-azul truncate">
                      {d.nome}
                    </p>
                    <span className="text-xs bg-uniao-azul/10 text-uniao-azul px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                      {d.estado_uf}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    {d.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />{d.email}
                      </span>
                    )}
                    {d.whatsapp && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />{d.whatsapp}
                      </span>
                    )}
                  </div>
                </div>

                {/* KPIs */}
                <div className="flex items-center gap-6 text-center flex-shrink-0">
                  <div>
                    <div className="text-sm font-bold text-gray-800">
                      {(d.filiados_cadastrados ?? 0).toLocaleString("pt-BR")}
                    </div>
                    <div className="text-[10px] text-gray-400">filiados</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800">
                      {d.municipios_cobertos ?? 0}
                    </div>
                    <div className="text-[10px] text-gray-400">municípios</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800">
                      {d.zonas_cobertas ?? 0}
                    </div>
                    <div className="text-[10px] text-gray-400">zonas</div>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-uniao-azul flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {criarAberto && (
        <ModalCriarDelegado
          onFechar={() => setCriarAberto(false)}
          onCriado={() => { setCriarAberto(false); carregar(); }}
        />
      )}
    </AppLayout>
  );
}
