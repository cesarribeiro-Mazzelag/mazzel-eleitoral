"use client";

/* Dossie v9 - motor central de dados da plataforma.
 *
 * Busca /dossie/{id} do backend, adapta para o shape do Designer e
 * renderiza as 9 secoes. Fallback para o PROFILES mock (wagner|marcal)
 * quando sem sessao ou id numerico de mock. */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/plataforma-v2/Icon";
import { findProfile } from "@/components/plataforma-v2/data";
import { API, ApiError } from "@/components/plataforma-v2/api";
import { adaptDossie } from "@/components/plataforma-v2/adapters/dossie";
import { HeaderHero }          from "@/components/plataforma-v2/modulos/dossie/HeaderHero";
import { OverallMap }          from "@/components/plataforma-v2/modulos/dossie/OverallMap";
import { DossieMapaEleitoral } from "@/components/plataforma-v2/modulos/dossie/MapaEleitoral";
import { TrajetoriaTimeline }  from "@/components/plataforma-v2/modulos/dossie/TrajetoriaTimeline";
import { AtividadeLegislativa }from "@/components/plataforma-v2/modulos/dossie/AtividadeLegislativa";
import { AtividadeExecutiva }  from "@/components/plataforma-v2/modulos/dossie/AtividadeExecutiva";
import { AlertasJuridicos }    from "@/components/plataforma-v2/modulos/dossie/AlertasJuridicos";
import { Financeiro }          from "@/components/plataforma-v2/modulos/dossie/Financeiro";
import { Emendas }             from "@/components/plataforma-v2/modulos/dossie/Emendas";
import { Perfil }              from "@/components/plataforma-v2/modulos/dossie/Perfil";

function isMockSlug(id) {
  if (!id) return false;
  const k = String(id).toLowerCase();
  return k === "wagner" || k === "marcal";
}

export default function Page() {
  const { id } = useParams();
  // Tenta resolver via mock no init (slug "wagner"/"marcal" ou id numerico de RADAR_CANDIDATOS).
  // Se backend responder, sobrescreve com dados reais.
  const [profile, setProfile] = useState(() => findProfile(id));
  const [status, setStatus] = useState(isMockSlug(id) ? "ok" : "loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isMockSlug(id)) {
      setProfile(findProfile(id));
      setStatus("ok");
      return;
    }
    let cancelled = false;
    async function load() {
      setStatus("loading");
      try {
        const dossie = await API.dossie(id);
        if (cancelled) return;
        const adapted = adaptDossie(dossie);
        setProfile(adapted);
        setStatus("ok");
      } catch (err) {
        if (cancelled) return;
        // Backend nao retornou - fallback para mock construido a partir de RADAR_CANDIDATOS.
        // Se id numerico bater com mock, mostra dossie minimo coerente do candidato.
        const mockProfile = findProfile(id);
        if (mockProfile) {
          setProfile(mockProfile);
          setStatus("ok");
          return;
        }
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setStatus("unauth");
          setProfile(null);
          setErrorMsg("Sem sessão ativa. Faça login para visualizar o dossiê.");
        } else if (err instanceof ApiError && err.status === 404) {
          setStatus("notfound");
          setProfile(null);
          setErrorMsg(`Candidato ${id} não encontrado no backend.`);
        } else {
          setStatus("error");
          setProfile(null);
          const detail = err instanceof ApiError ? `${err.status} ${err.message}` : (err.message || "Erro desconhecido");
          setErrorMsg(`Falha ao carregar dossiê do candidato ${id}: ${detail}`);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (status === "loading") {
    return (
      <div className="bg-page-grad min-h-full">
        <div className="max-w-[1200px] mx-auto px-8 py-7">
          <Link
            href="/mazzel-preview/dossies"
            className="inline-flex items-center gap-1.5 text-[12px] t-fg-muted hover:t-fg mb-4"
          >
            <Icon name="ChevronLeft" size={12} />Voltar para biblioteca
          </Link>
          <div className="t-bg-card ring-soft rounded-2xl p-8 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent-blue-strong)" }} />
            <span className="text-[13px] t-fg-muted">Carregando dossiê…</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === "notfound" || status === "unauth" || status === "error" || !profile) {
    const titulo = status === "unauth"
      ? "Sessão expirada"
      : status === "notfound"
      ? "Perfil não encontrado"
      : status === "error"
      ? "Falha ao carregar dossiê"
      : "Dossiê indisponível";
    return (
      <div className="bg-page-grad min-h-full">
        <div className="max-w-[1200px] mx-auto px-8 py-7">
          <Link
            href="/mazzel-preview/dossies"
            className="inline-flex items-center gap-1.5 text-[12px] t-fg-muted hover:t-fg mb-4"
          >
            <Icon name="ChevronLeft" size={12} />Voltar para biblioteca
          </Link>
          <div className="t-bg-card ring-soft rounded-2xl p-8">
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Dossiê indisponível</div>
            <h1 className="text-[28px] font-display font-bold t-fg-strong mt-1">{titulo}</h1>
            <div className="text-[13px] t-fg-muted mt-2">{errorMsg || "Não há dossiê completo para este id."}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1200px] mx-auto px-8 py-7 space-y-5">
        <Link
          href="/mazzel-preview/dossies"
          className="inline-flex items-center gap-1.5 text-[12px] t-fg-muted hover:t-fg"
        >
          <Icon name="ChevronLeft" size={12} />Voltar para biblioteca
        </Link>

        <HeaderHero profile={profile} alert={profile.sparse} />
        <OverallMap profile={profile} />
        <DossieMapaEleitoral profile={profile} />
        <TrajetoriaTimeline profile={profile} />
        <AtividadeLegislativa profile={profile} />
        <AtividadeExecutiva profile={profile} />
        <AlertasJuridicos profile={profile} />
        <Financeiro profile={profile} />
        <Emendas profile={profile} />
        <Perfil profile={profile} />
      </div>
    </div>
  );
}
