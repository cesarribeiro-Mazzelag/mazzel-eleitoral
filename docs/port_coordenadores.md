# Port: Coordenadores -> mazzel-preview

**Data:** 2026-04-24

## Arquivos criados

- `app/mazzel-preview/coordenadores/page.jsx` - page minima (padrao Shell)
- `components/plataforma-v2/modulos/Coordenadores.jsx` - componente completo

## O que foi portado

Logica 100% identica a `app/coordenadores/page.jsx`. Mudancas cirurgicas:

1. **AppLayout removido** - mazzel-preview usa Shell via `layout.jsx`, nao precisa de wrapper
2. **API client substituido** - `const API = process.env...` + `fetch` manual trocado por `fetchJson` de `@/components/plataforma-v2/api`. O `fetchJson` ja injeta token (localStorage ub_token + credentials:include), base URL e trata erros.
3. **Wrapper API nao necessario** - `fetchJson` cobre todos os 5 endpoints: `GET /coordenadores`, `GET/PUT/DELETE /coordenadores/:id`, `POST /coordenadores/:id/municipios`, `GET /coordenadores/sem-coordenador/:uf`. Nenhum wrapper adicionado a `api.js`.
4. **Export nomeado** - `export function Coordenadores()` em vez de `export default function CoordenadoresPag()`, alinhado ao padrao dos outros modulos (Delegados, Filiados etc).

## Validacao do backend

```
curl -H "Authorization: Bearer $TK" http://localhost:8002/coordenadores -> HTTP 200
```

## O que NAO foi testado

- Fluxo completo de criacao/edicao/exclusao de coordenador (requer dados no banco)
- Atribuicao de municipios (requer municipios sem coordenador cadastrados)
- Comportamento do painel lateral de detalhe com dados reais
- Permissoes PRESIDENTE/DIRETORIA (requer usuario com esse perfil no banco local)
