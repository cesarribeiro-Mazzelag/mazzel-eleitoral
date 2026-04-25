# VERSAO PRESERVADA

Voce esta no worktree da versao **PRESERVADA**.

- **Branch:** `preservada`
- **Porta dev:** 3002
- **URL:** http://localhost:3002
- **Status:** FROZEN. Esta versao tem que funcionar pra reuniao UB-SP.

## UI esperada

Sidebar Mazzel · Inteligencia Eleitoral, com modulos:
- Visao Geral, Mapa Eleitoral, Radar Politico
- Suplentes, Coordenadores, Liderancas, Cabos Eleitorais, Delegados
- Filiados, Alertas, Relatorios, Glossario

## Como subir

```bash
# 1. Garantir backend de pe (uma vez)
cd /Users/cesarribeiro/projetos/uniao-brasil
docker compose up -d

# 2. Frontend desta versao
cd /Users/cesarribeiro/projetos/uniao-brasil-preservada/codigo/frontend
npm install   # so na primeira vez
npm run dev   # sobe em 3002 automatico
```

## NAO MEXER

- Frontend desta versao e congelado. So mudancas pra fix critico que afete a reuniao.
- Backend e DB sao compartilhados com a V2 - mexer no schema afeta as duas.
- Se precisa de feature/dado novo: faca no worktree `../uniao-brasil-v2/`.

## V2 (em desenvolvimento)

```bash
cd /Users/cesarribeiro/projetos/uniao-brasil-v2/codigo/frontend
PORT=3003 npm run dev
```
