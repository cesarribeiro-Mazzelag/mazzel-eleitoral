"use client";
import { useState, useEffect } from "react";
import { Shield, Users, ClipboardList, ToggleLeft, ToggleRight, RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { BadgePerfil } from "@/components/ui/BadgePerfil";

const TABS = [
  { id: "usuarios",  label: "Usuários",  icone: Users },
  { id: "auditoria", label: "Auditoria", icone: ClipboardList },
];

function AbaUsuarios() {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [togglendoId, setTogglendoId] = useState(null);

  useEffect(() => {
    api.usuarios.list().then(setUsuarios).catch((e) => toast.error(e.message)).finally(() => setCarregando(false));
  }, []);

  async function toggle(id) {
    setTogglendoId(id);
    try {
      await api.usuarios.toggle_ativo(id);
      setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, ativo: !u.ativo } : u));
    } catch (e) { toast.error(e.message); } finally { setTogglendoId(null); }
  }

  const filtrados = usuarios.filter((u) => busca === "" || u.nome.toLowerCase().includes(busca.toLowerCase()) || u.email.toLowerCase().includes(busca.toLowerCase()));

  if (carregando) return <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 border-uniao-azul border-t-transparent animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou e-mail..." className="input pl-9" />
        </div>
        <span className="text-sm text-gray-500">{filtrados.length} usuário{filtrados.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuário</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Perfil</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ativo</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3"><p className="font-medium text-gray-900">{u.nome}</p><p className="text-xs text-gray-400">{u.email}</p></td>
                <td className="px-4 py-3"><BadgePerfil perfil={u.perfil} /></td>
                <td className="px-4 py-3 text-gray-500">{u.estado_uf ?? "Nacional"}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggle(u.id)} disabled={togglendoId === u.id} className="disabled:opacity-50">
                    {togglendoId === u.id ? <RefreshCw className="w-5 h-5 text-gray-400 animate-spin mx-auto" />
                      : u.ativo ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && <p className="text-center text-sm text-gray-400 py-10">Nenhum usuário encontrado.</p>}
      </div>
    </div>
  );
}

function AbaAuditoria() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.auditoria.list({ limit: 50 })
      .then((data) => setLogs(Array.isArray(data) ? data : (data.items ?? [])))
      .catch((e) => toast.error(e.message))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 border-uniao-azul border-t-transparent animate-spin" /></div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data/Hora</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuário</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ação</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tabela</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={log.id ?? i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">{log.criado_em ? new Date(log.criado_em).toLocaleString("pt-BR") : "—"}</td>
              <td className="px-4 py-3 text-gray-700">{log.usuario_id ?? "—"}</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-600">{log.acao}</span></td>
              <td className="px-4 py-3 text-xs text-gray-500">{log.tabela ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {logs.length === 0 && <p className="text-center text-sm text-gray-400 py-10">Nenhum log de auditoria disponível.</p>}
    </div>
  );
}

export function AdminContent() {
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);
  const [tab, setTab] = useState("usuarios");

  useEffect(() => {
    const u = api.getUser();
    if (u && u.perfil !== "PRESIDENTE") router.replace("/dashboard");
    else setUsuario(u);
  }, []);

  if (!usuario) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-uniao-azul" />Administração
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestão de usuários e auditoria da plataforma.</p>
      </div>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(({ id, label, icone: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>
      {tab === "usuarios"  && <AbaUsuarios />}
      {tab === "auditoria" && <AbaAuditoria />}
    </div>
  );
}
