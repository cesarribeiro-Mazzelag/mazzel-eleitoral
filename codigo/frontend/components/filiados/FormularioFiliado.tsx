"use client";

/**
 * Formulário de cadastro de filiados.
 * Preenchido pelo delegado responsável pela região.
 * Substitui o processo arcaico de papel + digitação manual.
 *
 * Validações:
 * - CPF: matemática local + SERPRO (se disponível)
 * - Título de Eleitor: matemática local + TSE
 * - Trava contra inversão CPF x Título
 * - Duplicidade: alerta se CPF ou Título já cadastrado
 * - CEP: preenchimento automático via ViaCEP
 */

import { useState } from "react";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
function tkn() {
  return typeof window !== "undefined" ? (localStorage.getItem("ub_token") ?? "") : "";
}
function authHeader() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${tkn()}` };
}

interface Validacao {
  status: "idle" | "validando" | "valido" | "invalido" | "aviso";
  mensagem?: string;
}

interface CampoValidado {
  valor: string;
  validacao: Validacao;
}

export function FormularioFiliado({
  onSucesso,
}: {
  onSucesso?: () => void;
}) {
  const [cpf, setCpf] = useState<CampoValidado>({ valor: "", validacao: { status: "idle" } });
  const [titulo, setTitulo] = useState<CampoValidado>({ valor: "", validacao: { status: "idle" } });
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState({
    logradouro: "",
    bairro: "",
    cidade: "",
    estado_uf: "",
  });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // ─── Máscaras ──────────────────────────────────────────────────────────────

  function mascaraCpf(valor: string): string {
    const d = valor.replace(/\D/g, "").slice(0, 11);
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function mascaraTitulo(valor: string): string {
    return valor.replace(/\D/g, "").slice(0, 13);
  }

  function mascaraCep(valor: string): string {
    return valor.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
  }

  // ─── Validações ───────────────────────────────────────────────────────────

  async function validarCpf(valor: string) {
    const digitos = valor.replace(/\D/g, "");
    if (digitos.length < 11) return;

    setCpf((prev) => ({ ...prev, validacao: { status: "validando" } }));

    const resp = await fetch(`${API}/validar/cpf`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({ cpf: digitos }),
    });

    const resultado = await resp.json();

    setCpf((prev) => ({
      ...prev,
      validacao: {
        status: resultado.valido
          ? resultado.aviso
            ? "aviso"
            : "valido"
          : "invalido",
        mensagem: resultado.mensagem,
      },
    }));
  }

  async function validarTitulo(valor: string) {
    const digitos = valor.replace(/\D/g, "");
    if (digitos.length < 12) return;

    setTitulo((prev) => ({ ...prev, validacao: { status: "validando" } }));

    const resp = await fetch(`${API}/validar/titulo`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({ titulo: digitos }),
    });

    const resultado = await resp.json();

    setTitulo((prev) => ({
      ...prev,
      validacao: {
        status: resultado.valido ? "valido" : "invalido",
        mensagem: resultado.mensagem,
      },
    }));
  }

  async function buscarCep(valor: string) {
    const digitos = valor.replace(/\D/g, "");
    if (digitos.length !== 8) return;

    const resp = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
    if (!resp.ok) return;
    const dados = await resp.json();
    if (dados.erro) return;

    setEndereco({
      logradouro: dados.logradouro ?? "",
      bairro: dados.bairro ?? "",
      cidade: dados.localidade ?? "",
      estado_uf: dados.uf ?? "",
    });
  }

  // ─── Ícone de status ──────────────────────────────────────────────────────

  function IconeStatus({ validacao }: { validacao: Validacao }) {
    if (validacao.status === "validando")
      return <Loader2 className="w-4 h-4 animate-spin text-brand-500" />;
    if (validacao.status === "valido")
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (validacao.status === "invalido" || validacao.status === "aviso")
      return <AlertCircle className="w-4 h-4 text-amber-500" />;
    return null;
  }

  // ─── Envio ────────────────────────────────────────────────────────────────

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cpf.validacao.status === "invalido" || titulo.validacao.status === "invalido") return;

    setEnviando(true);
    setErro(null);

    const form = e.currentTarget;
    const dados = new FormData(form);

    const resp = await fetch(`${API}/filiados`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({
        nome_completo: dados.get("nome_completo"),
        cpf: cpf.valor.replace(/\D/g, ""),
        titulo_eleitor: titulo.valor.replace(/\D/g, ""),
        data_nascimento: dados.get("data_nascimento"),
        telefone: dados.get("telefone"),
        whatsapp: dados.get("whatsapp"),
        email: dados.get("email"),
        cep: cep.replace(/\D/g, ""),
        ...endereco,
        numero: dados.get("numero"),
        complemento: dados.get("complemento"),
      }),
    });

    if (resp.ok) {
      onSucesso?.();
    } else {
      const err = await resp.json();
      setErro(err.detail ?? "Erro ao cadastrar filiado. Tente novamente.");
    }
    setEnviando(false);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <form onSubmit={enviar} className="space-y-6">
      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome Completo <span className="text-red-500">*</span>
        </label>
        <input
          name="nome_completo"
          required
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          placeholder="Nome completo conforme documento"
        />
      </div>

      {/* CPF + Título lado a lado */}
      <div className="grid grid-cols-2 gap-4">
        {/* CPF */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CPF <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              value={cpf.valor}
              onChange={(e) => {
                const v = mascaraCpf(e.target.value);
                setCpf({ valor: v, validacao: { status: "idle" } });
              }}
              onBlur={() => validarCpf(cpf.valor)}
              required
              inputMode="numeric"
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500 pr-10 ${
                cpf.validacao.status === "invalido"
                  ? "border-red-400 bg-red-50"
                  : cpf.validacao.status === "valido"
                  ? "border-green-400"
                  : cpf.validacao.status === "aviso"
                  ? "border-amber-400 bg-amber-50"
                  : "border-gray-300"
              }`}
              placeholder="000.000.000-00"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <IconeStatus validacao={cpf.validacao} />
            </div>
          </div>
          {cpf.validacao.mensagem && (
            <p
              className={`text-xs mt-1 ${
                cpf.validacao.status === "invalido"
                  ? "text-red-600"
                  : "text-amber-600"
              }`}
            >
              {cpf.validacao.mensagem}
            </p>
          )}
        </div>

        {/* Título de Eleitor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título de Eleitor <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              value={titulo.valor}
              onChange={(e) => {
                const v = mascaraTitulo(e.target.value);
                setTitulo({ valor: v, validacao: { status: "idle" } });
              }}
              onBlur={() => validarTitulo(titulo.valor)}
              required
              inputMode="numeric"
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500 pr-10 ${
                titulo.validacao.status === "invalido"
                  ? "border-red-400 bg-red-50"
                  : titulo.validacao.status === "valido"
                  ? "border-green-400"
                  : "border-gray-300"
              }`}
              placeholder="000 0000 0000 00"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <IconeStatus validacao={titulo.validacao} />
            </div>
          </div>
          {titulo.validacao.mensagem && (
            <p
              className={`text-xs mt-1 ${
                titulo.validacao.status === "invalido"
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {titulo.validacao.mensagem}
            </p>
          )}
        </div>
      </div>

      {/* CEP com preenchimento automático */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
        <input
          value={cep}
          onChange={(e) => {
            const v = mascaraCep(e.target.value);
            setCep(v);
          }}
          onBlur={() => buscarCep(cep)}
          inputMode="numeric"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="00000-000"
        />
      </div>

      {/* Endereço preenchido automaticamente */}
      {endereco.logradouro && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
            <input
              value={endereco.logradouro}
              onChange={(e) => setEndereco((prev) => ({ ...prev, logradouro: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
            <input
              name="numero"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Ex: 42"
            />
          </div>
        </div>
      )}

      {/* Contato */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
          <input
            name="whatsapp"
            inputMode="tel"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="(11) 99999-9999"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input
            name="email"
            type="email"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="email@exemplo.com"
          />
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{erro}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={
          enviando ||
          cpf.validacao.status === "invalido" ||
          titulo.validacao.status === "invalido"
        }
        className="w-full bg-brand-500 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
        {enviando ? "Cadastrando..." : "Cadastrar Filiado"}
      </button>
    </form>
  );
}
