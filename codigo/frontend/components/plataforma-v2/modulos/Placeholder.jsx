"use client";

/* Placeholder para modulos ainda nao construidos.
 * Baseado no ModuleStub de designer/platform-stubs.jsx. */

import Link from "next/link";
import { Icon } from "../Icon";

export function Placeholder({ eyebrow, title, description, roadmap }) {
  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1200px] mx-auto px-8 py-10">
        <div className="mb-6">
          <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">{eyebrow}</div>
          <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">{title}</h1>
          {description && <div className="text-[13px] t-fg-muted mt-2 max-w-xl">{description}</div>}
        </div>
        <div className="t-bg-card ring-soft rounded-xl p-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl t-bg-tenant-soft mb-4">
            <Icon name="Build" size={22} className="t-tenant" />
          </div>
          <div className="text-[18px] font-semibold t-fg-strong">Módulo em construção</div>
          <div className="text-[13px] t-fg-muted mt-1 max-w-md mx-auto">
            {roadmap || "Esta seção já está prototipada no backlog. Use os módulos ao lado enquanto isso."}
          </div>
          <div className="flex items-center justify-center gap-2 mt-5">
            <Link href="/mazzel-preview" className="btn-ghost inline-flex items-center gap-1">
              <Icon name="Home" size={12} />Dashboard
            </Link>
            <Link href="/mazzel-preview/dossies" className="btn-ghost inline-flex items-center gap-1">
              <Icon name="FileSearch" size={12} />Dossiês
            </Link>
            <Link href="/mazzel-preview/mapa" className="btn-ghost inline-flex items-center gap-1">
              <Icon name="MapPin" size={12} />Mapa
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
