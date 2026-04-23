"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle, XCircle, Clock, Phone, Mail,
  MapPin, Calendar, Edit2, Save, X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { BotaoVoltar } from "@/components/ui/BotaoVoltar";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
function tkn() {
  return typeof window !== "undefined" ? (localStorage.getItem("ub_token") ?? "") : "";
}

function BadgeValidacao({ status, label }) {
  const cfg = {
    VALIDO:   { icon: CheckCircle, cls: "text-green-600 bg-green-50", label: "Válido" },
    INVALIDO: { icon: XCircle,     cls: "text-red-500 bg-red-50",     label: "Inválido" },
    PENDENTE: { icon: Clock,       cls: "text-gray-400 bg-gray-50",   label: "Pendente" },
  }[status] ?? { icon: Clock, cls: "text-gray-400 bg-gray-50", label: status };

  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}: {cfg.label}
    </span>
  );
}

function Campo({ label, valor }) {
  if (!valor) return null;
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{valor}</p>
    </div>
  );
}

export default function FiliadoDetalhePage() {
  const { id } = useParams();
  const router = useRouter();
  const [filiado, setFiliado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch(`${API}/filiados/${id}`, { headers: { Authorization: `Bearer ${tkn()}` } })
      .then((r) => r.json())
      .then((d) => { setFiliado(d); setForm({ whatsapp: d.whatsapp ?? "", email: d.email ?? "", telefone: d.telefone ?? "" }); })
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, [id]);

  async function salvar() {
    setSalvando(true);
    const r = await fetch(`${API}/filiados/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tkn()}` },
      body: JSON.stringify(form),
    });
    if (r.ok) { const d = await r.json(); setFiliado((f) => ({ ...f, ...d })); setEditando(false); }
    setSalvando(false);
  }

  if (carregando) return (
    <AppLayout>
      <div className="flex justify-center pt-20">
        <div className="w-8 h-8 border-2 border-uniao-azul border-t-transparent rounded-full animate-spin" />
      </div>
    </AppLayout>
  );

  if (!filiado) return (
    <AppLayout>
      <div className="max-w-lg mx-auto mt-20 card p-10 text-center text-gray-500">
        Filiado não encontrado.
      </div>
    </AppLayout>
  );

  const endereco = [filiado.logradouro, filiado.numero, filiado.bairro, filiado.cidade, filiado.estado_uf]
    .filter(Boolean).join(", ");

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <BotaoVoltar onClick={() => router.push("/filiados")} />

        {/* Header */}
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-uniao-azul/10 flex items-center justify-center text-uniao-azul text-xl font-bold flex-shrink-0">
              {filiado.nome_completo[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{filiado.nome_completo}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                CPF: ***.***.***-{filiado.cpf_ultimos4 ?? "??"}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <BadgeValidacao status={filiado.status_cpf} label="CPF" />
                <BadgeValidacao status={filiado.status_titulo} label="Título" />
              </div>
            </div>
            {!editando ? (
              <button onClick={() => setEditando(true)} className="btn-secondary flex items-center gap-1.5 text-sm flex-shrink-0">
                <Edit2 className="w-3.5 h-3.5" />Editar
              </button>
            ) : (
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={salvar} disabled={salvando} className="btn-primary flex items-center gap-1.5 text-sm">
                  <Save className="w-3.5 h-3.5" />{salvando ? "..." : "Salvar"}
                </button>
                <button onClick={() => setEditando(false)} className="btn-secondary flex items-center gap-1.5 text-sm">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Contato */}
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-gray-700 text-sm">Contato</h3>
            {editando ? (
              <div className="space-y-3">
                <input value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  className="input w-full" placeholder="WhatsApp" />
                <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="input w-full" placeholder="E-mail" />
                <input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  className="input w-full" placeholder="Telefone" />
              </div>
            ) : (
              <div className="space-y-3">
                {filiado.whatsapp && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400" />{filiado.whatsapp}
                  </div>
                )}
                {filiado.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400" />{filiado.email}
                  </div>
                )}
                {filiado.data_nascimento && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(filiado.data_nascimento + "T00:00:00").toLocaleDateString("pt-BR")}
                  </div>
                )}
                {!filiado.whatsapp && !filiado.email && !filiado.data_nascimento && (
                  <p className="text-sm text-gray-400">Nenhum contato cadastrado.</p>
                )}
              </div>
            )}
          </div>

          {/* Endereço */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-gray-700 text-sm">Endereço</h3>
            {endereco ? (
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{endereco}</span>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Endereço não informado.</p>
            )}
            {filiado.cep && <p className="text-xs text-gray-400">CEP: {filiado.cep}</p>}
          </div>
        </div>

        {/* Dados TSE */}
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm">Dados Eleitorais</h3>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Título de Eleitor" valor={filiado.titulo_eleitor} />
            <Campo label="Município" valor={filiado.municipio_id ? `ID ${filiado.municipio_id}` : null} />
          </div>
          <p className="text-xs text-gray-400">
            Cadastrado em: {filiado.criado_em ? new Date(filiado.criado_em).toLocaleDateString("pt-BR") : "—"}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
