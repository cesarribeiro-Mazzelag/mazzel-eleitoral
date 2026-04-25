"use client";
/**
 * Página de Login — Mazzel Tech · Inteligência Eleitoral
 */
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { LogoMazzel } from "@/components/ui/LogoUniao";

function safeNext(raw) {
  if (!raw || typeof raw !== "string") return "/mazzel-preview";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/mazzel-preview";
  if (raw.startsWith("/login")) return "/mazzel-preview";
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostraSenha, setMostraSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // 2FA
  const [precisa2fa, setPrecisa2fa] = useState(false);
  const [codigo2fa, setCodigo2fa] = useState("");
  const [token2fa, setToken2fa] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setCarregando(true);
    try {
      const resp = await api.auth.login(email, senha);
      if (resp.requer_2fa) {
        setToken2fa(resp.token_temp);
        setPrecisa2fa(true);
      } else {
        api.setSession(resp.access_token, resp.usuario);
        router.replace(next);
      }
    } catch (err) {
      toast(err.message ?? "E-mail ou senha incorretos.", "error");
    } finally {
      setCarregando(false);
    }
  }

  async function handle2fa(e) {
    e.preventDefault();
    setCarregando(true);
    try {
      const resp = await api.auth.verificar2fa(codigo2fa, token2fa);
      api.setSession(resp.access_token, resp.usuario);
      router.replace(next);
    } catch (err) {
      toast(err.message ?? "Código inválido.", "error");
      setCodigo2fa("");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Painel esquerdo — roxo Mazzel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12"
           style={{ background: "linear-gradient(145deg, #1E0A3C 0%, #3B0764 60%, #5B21B6 100%)" }}>

        <LogoMazzel size="md" variant="white" />

        <div className="space-y-5">
          <h1 className="text-white font-display font-black text-4xl uppercase leading-tight">
            Inteligência<br />Eleitoral<br />Nacional
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-xs">
            Dados de todas as eleições brasileiras em um único painel.
            Do topo até o grão mais fino — município, zona, seção.
          </p>
          <div className="flex gap-4 pt-2">
            {["492K candidatos", "70K eleitos", "27 UFs"].map((s) => (
              <div key={s} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/80"
                   style={{ background: "rgba(255,255,255,0.1)" }}>
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Decorativo */}
        <div className="opacity-5">
          <svg viewBox="0 0 200 200" className="w-40 h-40 fill-white">
            <path d="M100 10 L120 80 L190 80 L135 125 L155 195 L100 155 L45 195 L65 125 L10 80 L80 80 Z" />
          </svg>
        </div>
      </div>

      {/* ── Painel direito — formulário ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="lg:hidden mb-8">
            <LogoMazzel size="md" variant="roxo" />
          </div>

          {!precisa2fa ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Entrar na plataforma</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Acesso restrito a usuários autorizados.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="input"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                  <div className="relative">
                    <input
                      type={mostraSenha ? "text" : "password"}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="input pr-11"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setMostraSenha(!mostraSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {mostraSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full py-3 mt-2 rounded-xl font-semibold text-white transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #5B21B6)" }}
                >
                  {carregando
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
                    : "Entrar"
                  }
                </button>
              </form>
            </>
          ) : (
            /* ── Etapa 2FA ── */
            <>
              <div className="mb-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                     style={{ background: "#EDE9FE" }}>
                  <ShieldCheck className="w-6 h-6" style={{ color: "#7C3AED" }} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Verificação em 2 etapas</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Digite o código do seu aplicativo autenticador.
                </p>
              </div>

              <form onSubmit={handle2fa} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Código de 6 dígitos
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={codigo2fa}
                    onChange={(e) => setCodigo2fa(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    className="input text-center text-2xl tracking-[0.5em] font-mono"
                    placeholder="000000"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={carregando || codigo2fa.length < 6}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #5B21B6)" }}
                >
                  {carregando
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                    : "Verificar"
                  }
                </button>

                <button
                  type="button"
                  onClick={() => { setPrecisa2fa(false); setCodigo2fa(""); }}
                  className="w-full py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100
                             hover:bg-gray-200 transition-colors"
                >
                  Voltar
                </button>
              </form>
            </>
          )}

          <p className="text-center text-xs text-gray-400 mt-8">
            Mazzel Tech · Inteligência Eleitoral
          </p>
        </div>
      </div>
    </div>
  );
}
