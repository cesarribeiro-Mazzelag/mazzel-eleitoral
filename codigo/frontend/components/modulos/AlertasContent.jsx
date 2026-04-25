"use client";
/**
 * AlertasContent - conteudo interno do modulo Alertas.
 * Extraido de `app/alertas/page.jsx` pra ser reutilizado tanto na plataforma
 * antiga (envolto em AppLayout) quanto na nova (envolto em Shell).
 */
import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, CheckCheck, RefreshCw, Zap, Filter } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";

const GRAVIDADE_CONFIG = {
  CRITICO:  { label: "Crítico",  classe: "bg-red-100 text-red-700 border-red-200",       dot: "bg-red-500"    },
  ALERTA:   { label: "Alerta",   classe: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500"  },
  ATENCAO:  { label: "Atenção",  classe: "bg-yellow-100 text-yellow-700 border-yellow-200", dot: "bg-yellow-400" },
  OK:       { label: "OK",       classe: "bg-green-100 text-green-700 border-green-200",  dot: "bg-green-500"  },
};

const TIPO_LABEL = {
  REDUTO_PERDIDO:   "Reduto perdido",
  QUEDA_CRITICA:    "Queda crítica",
  NOVO_REDUTO:      "Novo reduto",
  DELEGADO_INATIVO: "Delegado inativo",
};

function BadgeGravidade({ gravidade }) {
  const cfg = GRAVIDADE_CONFIG[gravidade] ?? GRAVIDADE_CONFIG.ATENCAO;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.classe}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function BadgeTipo({ tipo }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
      {TIPO_LABEL[tipo] ?? tipo}
    </span>
  );
}

function CardAlerta({ alerta, onMarcarLido }) {
  const [marcando, setMarcando] = useState(false);

  async function handleMarcar() {
    setMarcando(true);
    await onMarcarLido(alerta.id);
    setMarcando(false);
  }

  return (
    <div className={`
      flex items-start gap-4 p-4 rounded-xl border transition-all
      ${alerta.lido
        ? "bg-white border-gray-100 opacity-60"
        : "bg-white border-gray-200 shadow-sm hover:shadow-md"
      }
    `}>
      <div className={`
        w-1 self-stretch rounded-full flex-shrink-0
        ${alerta.gravidade === "CRITICO"  ? "bg-red-500"    :
          alerta.gravidade === "ALERTA"   ? "bg-amber-500"  :
          alerta.gravidade === "ATENCAO"  ? "bg-yellow-400" : "bg-green-500"}
      `} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <BadgeGravidade gravidade={alerta.gravidade} />
          <BadgeTipo tipo={alerta.tipo} />
          {alerta.lido && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <BellOff className="w-3 h-3" /> lido
            </span>
          )}
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{alerta.descricao}</p>
        <p className="text-xs text-gray-400 mt-1.5">
          {alerta.criado_em
            ? new Date(alerta.criado_em).toLocaleString("pt-BR", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })
            : "—"}
        </p>
      </div>
      {!alerta.lido && (
        <button
          onClick={handleMarcar}
          disabled={marcando}
          title="Marcar como lido"
          className="flex-shrink-0 p-2 text-gray-400 hover:text-uniao-azul hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
        >
          {marcando
            ? <RefreshCw className="w-4 h-4 animate-spin" />
            : <CheckCheck className="w-4 h-4" />
          }
        </button>
      )}
    </div>
  );
}

const GRAVIDADES = ["", "CRITICO", "ALERTA", "ATENCAO", "OK"];
const GRAVIDADE_LABELS = { "": "Todas as gravidades", CRITICO: "Crítico", ALERTA: "Alerta", ATENCAO: "Atenção", OK: "OK" };

export function AlertasContent() {
  const toast = useToast();
  const [usuario, setUsuario] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [marcandoTodos, setMarcandoTodos] = useState(false);

  const [filtroLido, setFiltroLido] = useState("nao_lido");
  const [filtroGravidade, setFiltroGravidade] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  useEffect(() => { setUsuario(api.getUser()); }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = { limit: LIMIT, offset };
      if (filtroLido === "nao_lido") params.lido = false;
      if (filtroLido === "lido") params.lido = true;
      if (filtroGravidade) params.gravidade = filtroGravidade;
      const data = await api.alertas.list(params);
      setAlertas(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCarregando(false);
    }
  }, [filtroLido, filtroGravidade, offset]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { setOffset(0); }, [filtroLido, filtroGravidade]);

  async function marcarLido(id) {
    try {
      await api.alertas.marcar_lido(id);
      setAlertas((prev) => prev.map((a) => a.id === id ? { ...a, lido: true } : a));
    } catch (e) { toast.error(e.message); }
  }

  async function marcarTodosLidos() {
    setMarcandoTodos(true);
    try {
      await api.alertas.marcar_todos_lido();
      toast.success("Todos os alertas marcados como lidos.");
      await carregar();
    } catch (e) { toast.error(e.message); }
    finally { setMarcandoTodos(false); }
  }

  async function gerarAlertas() {
    setGerando(true);
    try {
      const result = await api.alertas.gerar();
      toast.success(result.mensagem ?? "Alertas gerados.");
      await carregar();
    } catch (e) { toast.error(e.message); }
    finally { setGerando(false); }
  }

  const podeGerar = usuario?.perfil === "PRESIDENTE" || usuario?.perfil === "DIRETORIA";
  const naoLidosVisiveis = alertas.filter((a) => !a.lido).length;
  const totalPaginas = Math.ceil(total / LIMIT);
  const paginaAtual = Math.floor(offset / LIMIT) + 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-uniao-azul" />
            Alertas
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total > 0 ? `${total} alerta${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}` : "Nenhum alerta"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {naoLidosVisiveis > 0 && (
            <button
              onClick={marcarTodosLidos}
              disabled={marcandoTodos}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {marcandoTodos ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
              Marcar todos lidos
            </button>
          )}
          {podeGerar && (
            <button
              onClick={gerarAlertas}
              disabled={gerando}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-uniao-azul text-white hover:bg-uniao-azul/90 disabled:opacity-50 transition-colors font-medium"
            >
              {gerando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Gerar alertas
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
          {[
            { valor: "nao_lido", label: "Não lidos" },
            { valor: "todos",    label: "Todos"     },
            { valor: "lido",     label: "Lidos"     },
          ].map(({ valor, label }) => (
            <button
              key={valor}
              onClick={() => setFiltroLido(valor)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${filtroLido === valor ? "bg-uniao-azul text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select
            value={filtroGravidade}
            onChange={(e) => setFiltroGravidade(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-uniao-azul/30 focus:border-uniao-azul appearance-none cursor-pointer"
          >
            {GRAVIDADES.map((g) => (<option key={g} value={g}>{GRAVIDADE_LABELS[g]}</option>))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {Object.entries(GRAVIDADE_CONFIG).map(([key, cfg]) => (
          <span key={key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.classe}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        ))}
      </div>

      {carregando ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (<div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />))}
        </div>
      ) : alertas.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BellOff className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-500">
            {filtroLido === "nao_lido" ? "Nenhum alerta não lido" : "Nenhum alerta encontrado"}
          </p>
          <p className="text-sm mt-1">
            {podeGerar ? "Clique em \"Gerar alertas\" para analisar o farol." : "Volte mais tarde para verificar novos alertas."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((alerta) => (<CardAlerta key={alerta.id} alerta={alerta} onMarcarLido={marcarLido} />))}
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-gray-500">Página {paginaAtual} de {totalPaginas}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              disabled={offset === 0}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setOffset(offset + LIMIT)}
              disabled={paginaAtual >= totalPaginas}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
