# Port: Cabos Gestao para /mazzel-preview/cabos-gestao

**Data:** 2026-04-24

## O que foi feito

### Arquivos criados
- `app/mazzel-preview/cabos-gestao/page.jsx` - rota Next.js, importa CabosGestao, metadata definido
- `components/plataforma-v2/modulos/cabos-gestao/CabosGestao.jsx` - componente completo portado

### Arquivos modificados
- `components/plataforma-v2/api.js` - adicionados 4 wrappers: `cabos()`, `caboCriar()`, `caboAtualizar()`, `caboDeletar()`
- `components/plataforma-v2/rbac.js` - modulo `cabos-gestao` inserido na secao "Estrutura" com icon "Zap" e RBAC_MATRIX (presidente/lideranca_estadual/coord_regional/coord_territorial = full ou filtered; cabo_eleitoral e demais = hidden)
- `components/plataforma-v2/Shell.jsx` - `matchModule()` reconhece `/mazzel-preview/cabos-gestao`

## Decisoes tecnicas

- Componente usa `fetchJson` e `ApiError` de `../../api` diretamente (sem wrapper API.cabos) para suportar paginacao com URLSearchParams dinamico
- Classes CSS: `input-v2` (padrao do Liderancas.jsx), `chip`, `btn-primary`, `btn-ghost`, `bg-page-grad` - todos do platform.css
- `chip-ghost` substituido por `chip-muted` (unico que nao existe no platform.css)
- AppLayout **nao** usado - componente usa a shell do mazzel-preview via `layout.jsx` pai
- `font-display` disponivel no platform.css

## O que NAO foi testado (sem servidor rodando)

- Renderizacao visual no browser
- Fluxo CRUD real (criar/editar/deletar cabo)
- Carregamento de municipios por UF via `/liderancas/util/municipios/:uf`
- Paginacao com dados reais
- Visibilidade RBAC na sidebar por perfil

## Backend confirmado

`GET /cabos/` retornou HTTP 200 com `{"total":0,"page":1,"items":[]}` usando o token fornecido.
