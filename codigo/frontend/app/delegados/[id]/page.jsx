"use client";

/**
 * Detalhe de um Delegado
 * Mostra: dados pessoais, performance, zonas eleitorais atribuídas.
 * PRESIDENTE/DIRETORIA pode editar e atribuir zonas.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Phone, Mail, MapPin, Users, Map,
  Edit2, Save, X, CheckCircle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { BotaoVoltar } from "@/components/ui/BotaoVoltar";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
function tkn() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ub_token") ?? "";
}
function getUser() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("ub_user") ?? "null"); } catch { return null; }
}

async function apiFetch(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${tkn()}`, "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail ?? "Erro"); }
  return r.status === 204 ? null : r.json();
}

export default function DelegadoDetalhePage() {
  const { id } = useParams();
  const router = useRouter();
  const usuario = getUser();
  const isAdmin = ["PRESIDENTE", "DIRETORIA"].includes(usuario?.perfil);

  const [delegado, setDelegado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  async function carregar() {
    setCarregando(true);
    try {
      const d = await apiFetch(`/delegados/${id}`);
      setDelegado(d);
      setForm({ nome: d.nome, email: d.email ?? "", telefone: d.telefone ?? "", whatsapp: d.whatsapp ?? "" });
    } catch (e) { setErro(e.message); }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregar(); }, [id]);

  async function salvar() {
    setSalvando(true);
    try {
      const d = await apiFetch(`/delegados/${id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setDelegado((prev) => ({ ...prev, ...d }));
      setEditando(false);
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  }

  async function desativar() {
    if (!confirm(`Desativar o delegado ${delegado.nome}?`)) return;
    await apiFetch(`/delegados/${id}`, { method: "DELETE" });
    router.push("/delegados");
  }

  if (carregando) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-uniao-azul border-t-transparent rounded-full animate-spin" />
      </div>
    </AppLayout>
  );

  if (erro || !delegado) return (
    <AppLayout>
      <div className="max-w-lg mx-auto mt-20 card p-10 text-center">
        <p className="text-gray-500">{erro ?? "Delegado não encontrado."}</p>
      </div>
    </AppLayout>
  );

  // Agrupa zonas por município
  const zonasPorMunicipio = delegado.zonas.reduce((acc, z) => {
    const key = z.municipio_id;
    if (!acc[key]) acc[key] = { nome: z.municipio_nome, uf: z.estado_uf, zonas: [] };
    acc[key].zonas.push(z.zona_numero);
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <BotaoVoltar onClick={() => router.push("/delegados")} />
        </div>

        {/* Perfil */}
        <div className="card p-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-uniao-azul flex items-center justify-center flex-shrink-0 text-white text-xl font-bold">
              {delegado.nome[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {editando ? (
                <div className="space-y-3">
                  <input
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    className="input w-full text-lg font-semibold"
                    placeholder="Nome completo"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="input w-full"
                      placeholder="E-mail"
                    />
                    <input
                      value={form.whatsapp}
                      onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                      className="input w-full"
                      placeholder="WhatsApp"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-900">{delegado.nome}</h1>
                    <span className="text-sm bg-uniao-azul/10 text-uniao-azul px-2.5 py-0.5 rounded-full font-medium">
                      {delegado.estado_uf}
                    </span>
                    {!delegado.ativo && (
                      <span className="text-sm bg-red-100 text-red-600 px-2.5 py-0.5 rounded-full font-medium">
                        Inativo
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                    {delegado.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />{delegado.email}
                      </span>
                    )}
                    {delegado.whatsapp && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />{delegado.whatsapp}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {isAdmin && (
              <div className="flex gap-2 flex-shrink-0">
                {editando ? (
                  <>
                    <button
                      onClick={salvar}
                      disabled={salvando}
                      className="btn-primary flex items-center gap-1.5 text-sm py-2"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {salvando ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      onClick={() => setEditando(false)}
                      className="btn-secondary flex items-center gap-1.5 text-sm py-2"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditando(true)}
                      className="btn-secondary flex items-center gap-1.5 text-sm py-2"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    {usuario?.perfil === "PRESIDENTE" && delegado.ativo && (
                      <button
                        onClick={desativar}
                        className="text-sm text-red-500 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Desativar
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* KPIs de performance */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5 text-center">
            <Users className="w-6 h-6 mx-auto text-uniao-azul mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {(delegado.performance?.filiados_cadastrados ?? 0).toLocaleString("pt-BR")}
            </div>
            <div className="text-xs text-gray-500 mt-1">Filiados cadastrados</div>
          </div>
          <div className="card p-5 text-center">
            <MapPin className="w-6 h-6 mx-auto text-uniao-ciano mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {delegado.performance?.municipios_cobertos ?? 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">Municípios cobertos</div>
          </div>
          <div className="card p-5 text-center">
            <Map className="w-6 h-6 mx-auto text-uniao-dourado mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {delegado.performance?.zonas_cobertas ?? 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">Zonas eleitorais</div>
          </div>
        </div>

        {/* Zonas por município */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Território Eleitoral</h3>
            <span className="text-xs text-gray-400">
              {Object.keys(zonasPorMunicipio).length} municípios
            </span>
          </div>

          {Object.keys(zonasPorMunicipio).length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              Nenhuma zona eleitoral atribuída.
              {isAdmin && (
                <p className="mt-1">Use a API para atribuir zonas via{" "}
                  <code className="bg-gray-100 px-1 rounded text-xs">
                    POST /delegados/{id}/zonas
                  </code>
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {Object.values(zonasPorMunicipio).map((m, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.nome}</p>
                      <p className="text-xs text-gray-500">{m.uf}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end max-w-xs">
                    {m.zonas.sort((a, b) => a - b).map((z) => (
                      <span
                        key={z}
                        className="text-xs bg-uniao-azul/8 text-uniao-azul border border-uniao-azul/20 px-2 py-0.5 rounded-full font-medium"
                      >
                        Zona {z}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
