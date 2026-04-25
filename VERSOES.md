# Plataforma Uniao Brasil / Mazzel Eleitoral - Versoes

Este repo tem 2 versoes da plataforma rodando em paralelo via git worktree.
Esta pasta principal NAO E PRA TRABALHAR. Use os worktrees abaixo.

## Mapa

| Nome | Pasta | Branch | URL local | Status |
|------|-------|--------|-----------|--------|
| **PRESERVADA** | `../uniao-brasil-preservada/` | `preservada` | http://localhost:3002 | FROZEN, pra reuniao UB-SP |
| **V2** | `../uniao-brasil-v2/` | `v2-dev` | http://localhost:3003 + tunnel Cloudflare | Em desenvolvimento |

## Regras

1. NUNCA mexer no working tree desta pasta (`uniao-brasil/` raiz). Ela so guarda o `.git` e o `docker-compose.yml`.
2. Pra trabalhar, `cd` na pasta do worktree certo.
3. Antes de qualquer mudanca: rodar `git branch --show-current` e ler o `VERSOES.md` daquele worktree.
4. Backend, Postgres, Redis sao COMPARTILHADOS entre as duas (rodam via docker-compose desta pasta).

## Como subir tudo

```bash
# Backend + DB + Redis (uma vez, desta pasta)
cd /Users/cesarribeiro/projetos/uniao-brasil
docker compose up -d

# Frontend PRESERVADA (porta 3002)
cd /Users/cesarribeiro/projetos/uniao-brasil-preservada/codigo/frontend
npm run dev   # ja vem configurado pra 3002

# Frontend V2 (porta 3003)
cd /Users/cesarribeiro/projetos/uniao-brasil-v2/codigo/frontend
PORT=3003 npm run dev
```

## Backups

- Branch `backup/pre-correcao-25-04` (commit `ec9c2b2`): snapshot do estado caotico de 25/04 antes da reorganizacao em worktrees. NAO APAGAR ate as duas versoes estarem estaveis.
- Branch `main` (commit `662d42a`): commit inicial limpo. Ponto de partida.
