# VERSAO V2 (em desenvolvimento)

Voce esta no worktree da versao **V2**.

- **Branch:** `v2-dev`
- **Porta dev:** 3003 (PRESERVADA roda em 3002)
- **URL local:** http://localhost:3003
- **URL publica:** tunnel Cloudflare (fica de pe quando o Mac do Cesar esta ligado)
- **Status:** Em desenvolvimento ativo. Aqui e onde a integracao de dados acontece.

## O que tem aqui

- `app/mazzel-preview/*` = paginas da V2 (thin wrappers que importam de `plataforma-v2/modulos/`)
- `app/v1/*` = NAO existe; a versao antiga ficou no worktree PRESERVADA
- `components/plataforma-v2/` = implementacao real (Shell, Sidebar, Topbar, RBAC, modulos)
- `components/plataforma-v2/modulos/` = 18 modulos (Admin, Alertas, Dossies, Filiados, Home, Mapa, Radar, etc.)
- `public/mockups/` = artefatos oficiais do Claude Designer (`Plataforma-v2.html`, `dossie.html`, etc.)
- Backend: schemas v9, JOIN novo no dossie, coletas atividade parlamentar/governador/prefeito, migration 050 (presenca + lideranca)

## Como subir

```bash
# 1. Garantir backend de pe (uma vez)
cd /Users/cesarribeiro/projetos/uniao-brasil
docker compose up -d

# 2. Frontend desta versao (porta 3003 pra nao colidir com PRESERVADA)
cd /Users/cesarribeiro/projetos/uniao-brasil-v2/codigo/frontend
npm install   # so na primeira vez
PORT=3003 npm run dev
```

## Decisoes-chave (Obsidian)

- `Decisao - Migracao para mazzel-preview pos reuniao 2026-04-25.md`
- `Decisao - Overall Dossie v9 (6 dim x 3 sub-medidas).md`
- `Decisao - Busca e descoberta no modulo Dossie.md`
- `Decisao - MapLibre dois modos historico futuro 2026-04-25.md`

## PRESERVADA (versao da reuniao)

```bash
cd /Users/cesarribeiro/projetos/uniao-brasil-preservada/codigo/frontend
npm run dev
```
