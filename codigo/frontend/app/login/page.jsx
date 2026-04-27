"use client";
/**
 * Login UB - Mazzel Eleitoral
 *
 * Designer V1.2 (27/04/2026): rebuild com branding Uniao Brasil oficial.
 * Layout 2 colunas:
 *   - Esquerda: brand UB (azul + amarelo, headline "Sabe onde esta")
 *   - Direita: form (CPF/email + senha + 2FA + SSO Google/MS futuro)
 *
 * Mantem TODA a logica de auth original (api.auth.login, fluxo 2FA,
 * redirect via ?next=). So muda visual.
 */
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";

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
  const [lembrar, setLembrar] = useState(true);
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

  function ssoIndisponivel() {
    toast("SSO disponível em breve.", "info");
  }

  return (
    <>
      <style jsx>{`
        .ub-login-stage {
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          height: 100vh;
          width: 100vw;
        }
        @media (max-width: 900px) {
          .ub-login-stage { grid-template-columns: 1fr; }
          .ub-brand-side { display: none; }
        }
        .ub-brand-side {
          position: relative;
          background:
            radial-gradient(1100px 600px at 18% 10%, rgba(255, 204, 0, 0.18), transparent 60%),
            radial-gradient(900px 700px at 90% 90%, rgba(0, 42, 123, 0.65), transparent 55%),
            linear-gradient(135deg, #001E5C 0%, #002A7B 50%, #001340 100%);
          color: #fff;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 56px 64px;
        }
        .ub-mesh {
          position: absolute; inset: 0; opacity: 0.18; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,204,0,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,204,0,0.08) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 70% at 50% 60%, black 30%, transparent 80%);
        }
        .ub-orbit {
          position: absolute; width: 1100px; height: 1100px;
          right: -380px; top: 50%; transform: translateY(-50%);
          border-radius: 50%; border: 1px solid rgba(255, 204, 0, 0.18);
          pointer-events: none;
        }
        .ub-orbit::before, .ub-orbit::after {
          content: ""; position: absolute; inset: 0; border-radius: 50%;
        }
        .ub-orbit::before { border: 1px solid rgba(255, 204, 0, 0.10); transform: scale(0.78); }
        .ub-orbit::after  { border: 1px solid rgba(255, 204, 0, 0.06); transform: scale(0.55); }
        .ub-blob {
          position: absolute; width: 460px; height: 460px;
          left: -160px; bottom: -180px;
          background: radial-gradient(circle, rgba(255, 204, 0, 0.32), transparent 60%);
          filter: blur(40px); pointer-events: none;
        }
        .ub-headline em { font-style: normal; color: #FFCC00; }
        .ub-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 12px;
          border: 1px solid rgba(255, 204, 0, 0.4);
          background: rgba(255, 204, 0, 0.08);
          border-radius: 999px;
          font-size: 11px; letter-spacing: 0.14em;
          color: #FFCC00; text-transform: uppercase; font-weight: 600;
        }
        .ub-eyebrow::before {
          content: ""; width: 6px; height: 6px;
          background: #FFCC00; border-radius: 50%;
          box-shadow: 0 0 12px rgba(255, 204, 0, 0.8);
        }
        .ub-pulse {
          width: 6px; height: 6px; border-radius: 50%;
          background: #FFCC00;
          animation: ubPulse 2.4s ease-in-out infinite;
        }
        @keyframes ubPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.4); }
        }
        .ub-form-side::before {
          content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #002A7B, #FFCC00);
        }
        .ub-input {
          width: 100%;
          background: var(--mz-bg-card);
          border: 1px solid var(--mz-rule-strong);
          color: var(--mz-fg-strong);
          font-size: 14px;
          padding: 11px 14px;
          border-radius: 10px;
          outline: none;
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }
        .ub-input:focus {
          border-color: #002A7B;
          box-shadow: 0 0 0 3px rgba(0, 42, 123, 0.35);
        }
        .ub-input::placeholder { color: var(--mz-fg-faint); }
        .ub-btn-primary {
          width: 100%;
          background: #002A7B;
          color: #fff;
          border: 0;
          padding: 12px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: filter 120ms;
          position: relative;
          overflow: hidden;
        }
        .ub-btn-primary:hover:not(:disabled) { filter: brightness(1.12); }
        .ub-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .ub-btn-primary::before {
          content: ""; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,204,0,0.15), transparent);
          transform: translateX(-100%);
          transition: transform 480ms;
        }
        .ub-btn-primary:hover:not(:disabled)::before { transform: translateX(100%); }
        .ub-btn-sso {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: var(--mz-bg-card);
          border: 1px solid var(--mz-rule-strong);
          color: var(--mz-fg);
          padding: 10px;
          border-radius: 10px;
          font-size: 12px; font-weight: 500;
          cursor: pointer;
          transition: border-color 120ms;
        }
        .ub-btn-sso:hover { border-color: var(--mz-fg-muted); }
        .ub-btn-sso svg { width: 16px; height: 16px; }
      `}</style>

      <div className="ub-login-stage">
        {/* ============ BRAND SIDE ============ */}
        <aside className="ub-brand-side">
          <div className="ub-mesh"></div>
          <div className="ub-orbit"></div>
          <div className="ub-blob"></div>

          <header className="relative z-[2] flex items-center gap-[14px]">
            <img
              src="/branding/uniao-brasil/logo_white.svg"
              alt="União Brasil 44"
              style={{ width: 200 }}
            />
            <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.24)" }}></div>
            <div className="text-[11px] uppercase" style={{ color: "rgba(255,255,255,0.55)", letterSpacing: "0.16em" }}>
              <b className="font-bold text-white" style={{ letterSpacing: "0.08em", fontSize: 14 }}>UNIÃO CONECTA</b>
              <br />Plataforma do partido
            </div>
          </header>

          <div className="relative z-[2] max-w-[540px]">
            <div className="ub-eyebrow mb-[28px]">Eleições 2026 · Comando partidário</div>
            <h2 className="ub-headline text-white m-0 mb-[24px]"
                style={{ fontSize: 56, lineHeight: 1.05, fontWeight: 900, letterSpacing: "-0.025em", textWrap: "balance" }}>
              O partido que <em>sabe onde está</em>, vence onde precisa.
            </h2>
            <p className="m-0" style={{ fontSize: 17, lineHeight: 1.55, color: "rgba(255,255,255,0.78)", maxWidth: 480 }}>
              Mapa estratégico em tempo real, dossiês de 1 milhão de candidatos e operações organizadas
              do Diretório Nacional ao último cabo eleitoral.
            </p>
          </div>

          <div className="relative z-[2] grid grid-cols-4 gap-[24px] pt-[32px]"
               style={{ borderTop: "1px solid rgba(255,255,255,0.10)", fontVariantNumeric: "tabular-nums" }}>
            {[
              ["1,05M", "Candidatos", "catalogados"],
              ["5.570", "Municípios", "cobertos"],
              ["645",   "Comissões",  "SP ativas"],
              ["100%",  "TSE",        "integrado"],
            ].map(([n, l1, l2]) => (
              <div key={n}>
                <span className="block leading-none"
                      style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "#FFCC00" }}>{n}</span>
                <span className="block mt-[8px] uppercase"
                      style={{ fontSize: 11, letterSpacing: "0.10em", color: "rgba(255,255,255,0.55)", fontWeight: 500, lineHeight: 1.4 }}>
                  {l1}<br />{l2}
                </span>
              </div>
            ))}
          </div>

          <div className="relative z-[2] flex items-center gap-[8px] uppercase"
               style={{ fontSize: 11, letterSpacing: "0.14em", color: "rgba(255,255,255,0.5)" }}>
            <span className="ub-pulse"></span>
            <span>Sistema operacional · Última sync: agora</span>
          </div>
        </aside>

        {/* ============ FORM SIDE ============ */}
        <main className="ub-form-side relative flex items-center justify-center p-[48px]"
              style={{ background: "var(--mz-bg-page)" }}>
          <div className="w-full max-w-[420px]">

            {!precisa2fa ? (
              <>
                <div className="flex items-center gap-[10px] mb-[12px] uppercase"
                     style={{ fontSize: 12, color: "var(--mz-fg-muted)", letterSpacing: "0.06em", fontWeight: 500 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--mz-ok)", boxShadow: "0 0 10px var(--mz-ok)" }}></span>
                  <span>Acesso autorizado · UB-44</span>
                </div>

                <h1 className="m-0 mb-[8px]"
                    style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--mz-fg-strong)" }}>
                  Bem-vindo ao União Conecta
                </h1>
                <p className="mb-[28px]"
                   style={{ fontSize: 13, color: "var(--mz-fg-muted)", lineHeight: 1.55 }}>
                  Entre com suas credenciais do União Brasil. Cada perfil acessa só o que tem permissão —
                  Diretório, Comissão, Gabinete ou Operação.
                </p>

                <form onSubmit={handleLogin}>
                  <div className="mb-[14px]">
                    <label htmlFor="email" className="flex items-center justify-between mb-[6px] uppercase"
                           style={{ fontSize: 11, color: "var(--mz-fg-muted)", fontWeight: 500, letterSpacing: "0.06em" }}>
                      CPF ou e-mail institucional
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="ub-input"
                      placeholder="000.000.000-00 ou nome@uniaobrasil44.org.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </div>

                  <div className="mb-[14px]">
                    <label htmlFor="senha" className="flex items-center justify-between mb-[6px]">
                      <span className="uppercase" style={{ fontSize: 11, color: "var(--mz-fg-muted)", fontWeight: 500, letterSpacing: "0.06em" }}>
                        Senha
                      </span>
                      <a href="#" style={{ fontSize: 11, color: "var(--mz-fg-dim)", textDecoration: "none" }}
                         onClick={(e) => { e.preventDefault(); toast("Recuperação de senha em breve.", "info"); }}>
                        Esqueci minha senha
                      </a>
                    </label>
                    <div className="relative">
                      <input
                        id="senha"
                        type={mostraSenha ? "text" : "password"}
                        className="ub-input pr-11"
                        placeholder="••••••••"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setMostraSenha(!mostraSenha)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--mz-fg-muted)", background: "transparent", border: 0, cursor: "pointer" }}
                        tabIndex={-1}
                        aria-label={mostraSenha ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {mostraSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between my-[16px]" style={{ fontSize: 12 }}>
                    <label className="inline-flex items-center gap-[8px] cursor-pointer select-none"
                           style={{ color: "var(--mz-fg-muted)" }}>
                      <input type="checkbox" checked={lembrar}
                             onChange={(e) => setLembrar(e.target.checked)}
                             className="sr-only" />
                      <span style={{
                        width: 14, height: 14,
                        border: "1px solid var(--mz-rule-strong)",
                        borderRadius: 3,
                        background: lembrar ? "#FFCC00" : "var(--mz-bg-card)",
                        position: "relative",
                        display: "inline-block",
                      }}>
                        {lembrar && (
                          <span style={{
                            content: '""', position: "absolute", left: 3, top: 0,
                            width: 4, height: 8,
                            borderRight: "2px solid #0a0a0b",
                            borderBottom: "2px solid #0a0a0b",
                            transform: "rotate(45deg)",
                          }}></span>
                        )}
                      </span>
                      <span>Manter conectado neste dispositivo</span>
                    </label>
                  </div>

                  <button type="submit" disabled={carregando} className="ub-btn-primary mt-[6px]">
                    {carregando ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Entrando...
                      </span>
                    ) : (
                      "Entrar no Diretório União Brasil →"
                    )}
                  </button>
                </form>

                <div className="flex items-center gap-[12px] my-[22px] uppercase"
                     style={{ fontSize: 11, color: "var(--mz-fg-faint)", letterSpacing: "0.14em" }}>
                  <span style={{ flex: 1, height: 1, background: "var(--mz-rule)" }}></span>
                  ou continue com
                  <span style={{ flex: 1, height: 1, background: "var(--mz-rule)" }}></span>
                </div>

                <div className="grid grid-cols-2 gap-[10px]">
                  <button type="button" onClick={ssoIndisponivel} className="ub-btn-sso">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21.35 11.1h-9.17v2.92h5.27c-.23 1.5-1.7 4.4-5.27 4.4-3.18 0-5.77-2.62-5.77-5.85s2.59-5.85 5.77-5.85c1.81 0 3.02.77 3.71 1.43l2.53-2.43c-1.62-1.51-3.72-2.43-6.24-2.43C6.92 3.29 3.05 7.16 3.05 12s3.87 8.71 8.71 8.71c5.03 0 8.36-3.54 8.36-8.51 0-.57-.07-1.01-.16-1.6l-1.61.5z"/>
                    </svg>
                    Google Workspace
                  </button>
                  <button type="button" onClick={ssoIndisponivel} className="ub-btn-sso">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                    </svg>
                    Microsoft 365
                  </button>
                </div>
              </>
            ) : (
              /* ── Etapa 2FA ── */
              <>
                <div className="mb-[24px]">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-[16px]"
                       style={{ background: "rgba(0,42,123,0.18)" }}>
                    <ShieldCheck className="w-6 h-6" style={{ color: "#FFCC00" }} />
                  </div>
                  <h1 className="m-0 mb-[8px]"
                      style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--mz-fg-strong)" }}>
                    Verificação em 2 etapas
                  </h1>
                  <p style={{ fontSize: 13, color: "var(--mz-fg-muted)", lineHeight: 1.55 }}>
                    Digite o código de 6 dígitos do seu aplicativo autenticador.
                  </p>
                </div>

                <form onSubmit={handle2fa}>
                  <div className="mb-[14px]">
                    <label className="flex items-center justify-between mb-[6px] uppercase"
                           style={{ fontSize: 11, color: "var(--mz-fg-muted)", fontWeight: 500, letterSpacing: "0.06em" }}>
                      Código
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={codigo2fa}
                      onChange={(e) => setCodigo2fa(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                      autoFocus
                      className="ub-input text-center font-mono"
                      style={{ fontSize: 24, letterSpacing: "0.5em" }}
                      placeholder="000000"
                    />
                  </div>

                  <button type="submit" disabled={carregando || codigo2fa.length < 6} className="ub-btn-primary mb-[10px]">
                    {carregando ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
                      </span>
                    ) : (
                      "Verificar"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setPrecisa2fa(false); setCodigo2fa(""); }}
                    style={{
                      width: "100%", padding: "10px",
                      background: "var(--mz-bg-card)",
                      border: "1px solid var(--mz-rule-strong)",
                      borderRadius: 10, color: "var(--mz-fg-muted)",
                      fontSize: 13, fontWeight: 500, cursor: "pointer",
                    }}
                  >
                    Voltar
                  </button>
                </form>
              </>
            )}
          </div>

          <footer className="absolute left-0 right-0 bottom-[28px] flex justify-between items-center px-[48px]"
                  style={{ fontSize: 11, color: "var(--mz-fg-faint, #52525b)", letterSpacing: "0.04em" }}>
            <span className="inline-flex items-center gap-[6px] uppercase" style={{ letterSpacing: "0.08em" }}>
              <span style={{
                width: 14, height: 14, borderRadius: 3,
                background: "linear-gradient(135deg, #7C3AED, #A78BFA)",
              }}></span>
              União Conecta · operado por Mazzel · v2.4
            </span>
            <div>
              <a href="#" style={{ color: "var(--mz-fg-dim, #71717a)", textDecoration: "none" }}
                 onClick={(e) => e.preventDefault()}>Política de privacidade</a>
              <span style={{ padding: "0 8px", color: "var(--mz-fg-ghost, #3f3f46)" }}>·</span>
              <a href="#" style={{ color: "var(--mz-fg-dim, #71717a)", textDecoration: "none" }}
                 onClick={(e) => e.preventDefault()}>Termos</a>
              <span style={{ padding: "0 8px", color: "var(--mz-fg-ghost, #3f3f46)" }}>·</span>
              <a href="#" style={{ color: "var(--mz-fg-dim, #71717a)", textDecoration: "none" }}
                 onClick={(e) => e.preventDefault()}>Suporte</a>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
