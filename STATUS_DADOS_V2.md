# Status de dados — Plataforma V2 (Mazzel Eleitoral)

Documento pra orientar quem vier estilizar / evoluir a V2 (Designer, próximo agente). Mostra **quais blocos da UI já consomem dado real do backend** vs **quais ainda mostram mock**, sem precisar abrir cada arquivo.

> Atualizado em 25/04/2026, sessão de governança de dados (Etapa 2 + 3 entregues).

---

## Legenda

- ✅ **REAL** — endpoint backend existe e retorna dado real do banco
- 🟡 **HÍBRIDO** — tenta API; se falhar (404/500), cai pra mock visualmente equivalente (`apiX || HOME_X`). Designer vê layout sempre preenchido
- 🔴 **MOCK** — sem endpoint backend; valores hardcoded em `components/plataforma-v2/data.js` ou no próprio componente
- ⚪ **PLACEHOLDER** — tela ainda não implementada (componente Placeholder.jsx ou page.jsx vazio)

---

## Padrão de fallback graceful

Quase todos os módulos seguem este padrão (ex: Home.jsx):

```jsx
const apiAlertas = await API.alertas(...).catch(() => null);
const alertas = apiAlertas || HOME_ALERTS;  // mock quando backend falha
```

Isso significa que **o Designer sempre vê algo preenchido na tela**, mesmo sem backend funcionando. Pra forçar mock localmente: parar o backend (`docker stop ub_backend`).

---

## Inventário por módulo

### Sidebar principal

| Rota | Componente | Endpoint(s) | Status |
|------|-----------|-------------|--------|
| `/mazzel-preview` (Home) | `modulos/Home.jsx` | `/dashboard/visao-geral`, `/alertas`, `/dossies`, `/admin/auditoria` | 🟡 HÍBRIDO (todos os 4 fetches) |
| `/mazzel-preview/dossies` | `modulos/Dossies.jsx` | `/dossies` | ✅ REAL (cobertura ~70k eleitos backfilled em `politico_overall_v9`) |
| `/mazzel-preview/dossies/[id]` | `app/mazzel-preview/dossies/[id]/page.jsx` | `/dossie/{id}` | ✅ REAL (compila + lazy warmup) |
| `/mazzel-preview/mapa` | `components/map/MapaEleitoral.tsx` (3196 linhas — corrigido 25/04 noite) | `/mapa/farol`, `/mapa/estado/*`, `/mapa/municipio/*/top2`, `/mapa/geojson/*`, `/mapa/distritos-geojson`, `/mapa/escola/*`, `/mapa/totais-apuracao` | ✅ REAL com TODAS as features (drill-down 5 níveis, foto-on-hover, sidebar contextual, tabs turno, tooltip X9, microbairros SP). Componente skeletal antigo `modulos/Mapa.jsx` marcado @deprecated |
| `/mazzel-preview/radar` | `modulos/Radar.jsx` | — | ⚪ PLACEHOLDER (vai virar observatório dinâmico — decisão 21/04) |
| `/mazzel-preview/aliancas` | `app/mazzel-preview/aliancas/page.jsx` | — | ⚪ PLACEHOLDER |
| `/mazzel-preview/estudo` | `modulos/Estudo.jsx` | — | ⚪ PLACEHOLDER (módulo Estudo de panorama nacional, planejado) |
| `/mazzel-preview/campanha` | `modulos/campanha/Campanha.jsx` | — | 🔴 MOCK (8 conceitos arquitetados em 20/04, sem código backend) |
| `/mazzel-preview/chat` | `app/mazzel-preview/chat/page.jsx` | — | ⚪ PLACEHOLDER |
| `/mazzel-preview/ia` | `modulos/IA.jsx` | `/ia/chat` | ✅ REAL (Claude API) |
| `/mazzel-preview/liderancas` | `modulos/Liderancas.jsx` | `/liderancas` (CRUD completo) | ✅ REAL |
| `/mazzel-preview/filiados` | `modulos/Filiados.jsx` | `/filiados` | 🟡 HÍBRIDO (KPIs agregados são mock: `FILIADOS_FAIXA_IDADE`, `FILIADOS_NOVOS_*`, `FILIADOS_TOTAL`) |
| `/mazzel-preview/delegados` | `modulos/Delegados.jsx` | `/delegados` | 🟡 HÍBRIDO |
| `/mazzel-preview/cabo` | `modulos/cabos-gestao/CabosGestao.jsx` | — | 🔴 MOCK |
| `/mazzel-preview/agenda` | `app/mazzel-preview/agenda/page.jsx` | — | ⚪ PLACEHOLDER |
| `/mazzel-preview/alertas` | `modulos/Alertas.jsx` | `/alertas` | ✅ REAL |
| `/mazzel-preview/relatorios` | `app/mazzel-preview/relatorios/page.jsx` | — | ⚪ PLACEHOLDER |
| `/mazzel-preview/portal` | `modulos/Portal.jsx` | `/meu-painel/resumo` | ✅ REAL |
| `/mazzel-preview/coordenadores` | `modulos/Coordenadores.jsx` | — | ⚪ PLACEHOLDER |
| `/mazzel-preview/super` | `app/mazzel-preview/super/page.jsx` | — | ⚪ PLACEHOLDER |
| `/mazzel-preview/admin` | `modulos/Admin.jsx` | `/admin/usuarios`, `/admin/auditoria` | 🟡 HÍBRIDO (fallback `ADMIN_USUARIOS`, `ADMIN_AUDIT`, `ADMIN_PAPEIS`) |
| `/mazzel-preview/afiliados` | `app/mazzel-preview/afiliados/page.jsx` | — | ⚪ PLACEHOLDER |
| `/mazzel-preview/mandato` | `app/mazzel-preview/mandato/page.jsx` | — | ⚪ PLACEHOLDER |

### Blocos internos do Home (4 KPIs + lateral)

| Bloco | Status |
|-------|--------|
| 4 KPIs do topo (Total Eleitos, Candidatos, Cobertura, Receita) | ✅ REAL via `/dashboard/visao-geral` (cacheado Redis 10min) |
| Mapa do Brasil (cores por UF) | 🔴 MOCK (`PARTY_STRENGTH`) |
| Alertas 24h | 🟡 HÍBRIDO (`/alertas?limit=8` + fallback `HOME_ALERTS`) |
| Top candidatos | 🟡 HÍBRIDO (`/dossies?por_pagina=10` + fallback `HOME_TOP_CANDIDATOS`) |
| Movimentações do dia | 🟡 HÍBRIDO (parsed de `/admin/auditoria`) |
| Auditoria feed | 🟡 HÍBRIDO (parsed de `/admin/auditoria`) |
| Emendas por UF | 🔴 MOCK (`HOME_EMENDAS_UF`) |

---

## Onde ficam os mocks

- **`components/plataforma-v2/data.js`** — agregado central com `HOME_KPIS`, `HOME_ALERTS`, `RADAR_CANDIDATOS`, `FILIADOS_*`, `DELEGADOS_LIST`, `ADMIN_*`, `PARTY_STRENGTH`, `UF_LIST` etc.
- **`components/plataforma-v2/modulos/campanha/data.js`** — mocks específicos do módulo Campanha 2026

Pra trocar mock por dado real:
1. Implementar endpoint backend (geralmente em `app/api/v1/endpoints/`)
2. Adicionar chamada em `components/plataforma-v2/api.js`
3. Trocar uso direto de `HOME_X` por `apiX || HOME_X` (ou só `apiX` se preferir falhar visivelmente)

---

## Fontes únicas de verdade já estabelecidas (Etapa 2)

Pra evitar inconsistências futuras:

- **Overall político (FIFA)** — tabela `politico_overall_v9` (PK `candidato_id, ciclo_ano`). Calculada via `app/services/dossie_inteligencia.calcular_overall_fifa()`. Backfill por `python -m scripts.backfill_overall_v9`. Lazy warmup automático em cada acesso ao dossiê. **`/dossies` e `/dossie/{id}` leem da mesma fonte.**
- **Listagem de cartinhas** — MV `mv_dossies_listagem` (DISTINCT ON pré-computado). Refresh manual via `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dossies_listagem`.

---

## Renomeação semântica (Radar → Dossiês)

Em 21/04/2026 o módulo "Radar Político" foi unificado com "Dossiês". A V2 inteira já fala "Dossiês":

- Rota canônica: `GET /dossies` (em `app/api/v1/endpoints/dossies_listagem.py`)
- Service canônico: `app/dossie/listagem.py::listar_dossies()`
- Schema canônico: `DossieCard`, `DossiesListagemResponse`, `FiltrosDossies`
- Frontend: `API.dossies(...)` em `components/plataforma-v2/api.js`

`GET /radar/politicos` foi mantido como **alias deprecated** pra não quebrar a versão preservada (UB-SP). Pode ser removido quando a V2 for promovida pra produção.

`/radar/partidos` (radar de partidos) **não foi tocado** — é um observatório legítimo de partidos.

---

## Latências atuais (warm cache)

| Endpoint | Tempo |
|----------|-------|
| `/dashboard/visao-geral` (cache hit) | ~5ms |
| `/dashboard/visao-geral` (cache miss) | ~9s (1ª chamada após restart) |
| `/dossies` ordenar overall (60 items) | ~500ms |
| `/dossies?busca=X` | ~400ms |
| `/dossie/{id}` (warm) | ~70ms |
| `/dossie/{id}` (cold + lazy warmup) | ~700-1500ms |

Próximo gargalo conhecido: `DISTINCT ON` em queries auxiliares e o `_anexar_trajetoria` no `/dossies`. Reduzível pra ~100ms se necessário.

---

## Pendência crítica — filtro de dados por tenant (27/04/2026)

César, em 27/04: hoje a plataforma exibe **todos os candidatos** do TSE (~1M). Pra produção, o tenant `uniao-brasil` deve filtrar **apenas os dados do União Brasil**:

- `/dossies` deve retornar apenas candidatos UB (filiação atual ou histórico — incluindo predecessores DEM nº 25 e PSL nº 17 conforme já mapeado em CLAUDE.md)
- `/dashboard` big numbers (1.247 eleitos UB) já está correto — manter
- Mapa Eleitoral deve permitir alternar **modo UB-only** (visão de comando) vs **modo geral** (inteligência competitiva)
- Multi-tenant futuro: cada tenant verá apenas seus candidatos; opção de "ver adversários" libera dados cross-tenant nos módulos certos (Radar Político, Saúde de Nominatas adversárias)

Por enquanto deixar todos os dados (não bloqueia o desenvolvimento atual, mas precisa ser ajustado antes do produto entrar em produção real). Sprint backend dedicado quando aprovado.

---

## Checklist pra próxima sessão de dados

- [ ] Backfill completo de `politico_overall_v9` (~70k eleitos restantes — comando: `docker exec ub_backend python -m scripts.backfill_overall_v9 --log-every 500`)
- [ ] ETLs faltantes do Sprint 2+ (ATV.3 CPIs/missões, BSE.3 Fidelidade, INF.3 Rede de apoios, PAC.1-3 Votações, MID.1-3 Mídia)
- [ ] Endpoint `/home/mapa-brasil` substituindo `PARTY_STRENGTH` mock
- [ ] Endpoint `/home/emendas-uf` substituindo `HOME_EMENDAS_UF` mock
- [ ] Endpoints CRUD pros placeholders (Aliancas, Agenda, Chat, Coordenadores, Afiliados, Mandato, Super)
- [ ] Implementar Campanha 2026 backend completo (8 conceitos no Cérebro, ver `project_uniao_brasil_modulo_campanha.md`)
