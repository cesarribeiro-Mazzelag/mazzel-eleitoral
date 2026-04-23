"use client";
/**
 * Página de Configurações do usuário
 * - Visualizar/editar nome e e-mail
 * - Trocar senha
 * - Status do 2FA
 */
import { useState, useEffect } from "react";
import { Settings, User, KeyRound, ShieldCheck, ShieldOff, Save, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";

function Secao({ titulo, icone: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4 text-uniao-azul" />
        {titulo}
      </h2>
      {children}
    </div>
  );
}

export default function ConfiguracoesPage() {
  const toast = useToast();
  const [usuario, setUsuario] = useState(null);

  // Trocar senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaConfirm, setSenhaConfirm] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  useEffect(() => {
    setUsuario(api.getUser());
  }, []);

  async function handleTrocarSenha(e) {
    e.preventDefault();
    if (senhaNova !== senhaConfirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    if (senhaNova.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setSalvandoSenha(true);
    try {
      await api.auth.trocar_senha?.({ senha_atual: senhaAtual, senha_nova: senhaNova });
      toast.success("Senha alterada com sucesso.");
      setSenhaAtual("");
      setSenhaNova("");
      setSenhaConfirm("");
    } catch (err) {
      toast.error(err.message ?? "Erro ao alterar senha.");
    } finally {
      setSalvandoSenha(false);
    }
  }

  if (!usuario) return null;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-uniao-azul" />
            Configurações
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie sua conta e preferências.</p>
        </div>

        {/* Perfil */}
        <Secao titulo="Meu Perfil" icone={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
              <p className="text-sm font-semibold text-gray-900">{usuario.nome}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">E-mail</label>
              <p className="text-sm text-gray-700">{usuario.email}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Perfil de acesso</label>
              <span className="inline-block px-2.5 py-1 bg-uniao-azul/10 text-uniao-azul text-xs font-bold rounded-lg uppercase tracking-wide">
                {usuario.perfil}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
              <p className="text-sm text-gray-700">{usuario.estado_uf ?? "Nacional"}</p>
            </div>
          </div>
        </Secao>

        {/* Trocar senha */}
        <Secao titulo="Alterar Senha" icone={KeyRound}>
          <form onSubmit={handleTrocarSenha} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha atual</label>
              <input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                required
                className="input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nova senha</label>
              <input
                type="password"
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
                required
                minLength={8}
                className="input"
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar nova senha</label>
              <input
                type="password"
                value={senhaConfirm}
                onChange={(e) => setSenhaConfirm(e.target.value)}
                required
                className="input"
                placeholder="Repita a nova senha"
                autoComplete="new-password"
              />
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={salvandoSenha || !senhaAtual || !senhaNova || !senhaConfirm}
                className="flex items-center gap-2 px-5 py-2.5 bg-uniao-azul text-white text-sm font-medium rounded-xl hover:bg-uniao-azul/90 disabled:opacity-50 transition-colors"
              >
                {salvandoSenha
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                  : <><Save className="w-4 h-4" /> Salvar senha</>
                }
              </button>
            </div>
          </form>
        </Secao>

        {/* Status 2FA */}
        <Secao titulo="Verificação em Duas Etapas (2FA)" icone={ShieldCheck}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">
                {usuario.tem_2fa
                  ? "2FA ativo. Sua conta está protegida com autenticação de dois fatores."
                  : "2FA inativo. Recomendamos ativar para maior segurança."
                }
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Use um aplicativo como Google Authenticator ou Authy.
              </p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
              usuario.tem_2fa
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}>
              {usuario.tem_2fa
                ? <><ShieldCheck className="w-3.5 h-3.5" /> Ativo</>
                : <><ShieldOff className="w-3.5 h-3.5" /> Inativo</>
              }
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 border-t pt-3">
            Para ativar ou desativar o 2FA, entre em contato com o administrador da plataforma.
          </p>
        </Secao>
      </div>
    </AppLayout>
  );
}
