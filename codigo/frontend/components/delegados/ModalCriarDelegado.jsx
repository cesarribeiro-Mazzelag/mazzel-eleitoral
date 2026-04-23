"use client";

import { useState } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

function tkn() {
  return typeof window !== "undefined" ? (localStorage.getItem("ub_token") ?? "") : "";
}

export function ModalCriarDelegado({ onFechar, onCriado }) {
  const [form, setForm] = useState({
    usuario_id: "",
    nome: "",
    email: "",
    whatsapp: "",
    telefone: "",
    estado_uf: "SP",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErro(null);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.usuario_id || !form.nome || !form.estado_uf) {
      setErro("Preencha ID do usuário, nome e estado.");
      return;
    }
    setSalvando(true);
    try {
      const r = await fetch(`${API}/delegados`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tkn()}`,
        },
        body: JSON.stringify({ ...form, usuario_id: Number(form.usuario_id) }),
      });
      const data = await r.json();
      if (!r.ok) { setErro(data.detail ?? "Erro ao criar."); return; }
      onCriado(data);
    } catch { setErro("Erro de conexão."); }
    finally { setSalvando(false); }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-uniao-azul" />
            <h2 className="font-bold text-gray-900">Novo Delegado</h2>
          </div>
          <button onClick={onFechar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={salvar} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              ID do Usuário *
            </label>
            <input
              type="number"
              value={form.usuario_id}
              onChange={(e) => set("usuario_id", e.target.value)}
              className="input w-full"
              placeholder="ID do usuário com perfil DELEGADO"
            />
            <p className="text-xs text-gray-400 mt-1">
              Crie o usuário em Admin antes de criar o delegado.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Nome Completo *
            </label>
            <input
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              className="input w-full"
              placeholder="Nome do delegado"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Estado *</label>
              <select
                value={form.estado_uf}
                onChange={(e) => set("estado_uf", e.target.value)}
                className="input w-full"
              >
                {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">WhatsApp</label>
              <input
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                className="input w-full"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="input w-full"
              placeholder="delegado@email.com"
            />
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onFechar} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={salvando} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {salvando ? "Criando..." : "Criar Delegado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
