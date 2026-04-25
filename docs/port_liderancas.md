# Port: Liderancas para mazzel-preview

**Data:** 2026-04-24
**Status:** Entregue

## O que foi feito

### 1. Novo componente
`components/plataforma-v2/modulos/Liderancas.jsx`

Porta `LiderancasContent` (sistema legado) para o design system plataforma-v2:
- Usa tokens CSS do Shell: `bg-page-grad`, `t-bg-card`, `ring-soft`, `btn-primary`, `btn-ghost`, `chip-*`, `t-fg-*`
- Inputs com `INPUT_STYLE` inline (sem classe `input-v2` - nao existe no platform.css)
- Cards usam `t-bg-card ring-soft rounded-xl` (sem `.card` - nao existe no platform.css)
- `StatusBanner` do `useApiFetch` para exibir banner quando sem sessao

### 2. API adicionada
`components/plataforma-v2/api.js` - 5 novos metodos adicionados:
- `API.liderancas(params)` - lista paginada com filtros
- `API.liderancaMunicipios(uf)` - municipios por UF para o modal
- `API.liderancaCriar(body)` - POST
- `API.liderancaAtualizar(id, body)` - PATCH
- `API.liderancaDeletar(id)` - DELETE

### 3. Page atualizada
`app/mazzel-preview/liderancas/page.jsx` - substituiu placeholder pelo componente real.

## Funcionalidades portadas

- KPI strip: Ativos / Score Ouro / Criticos
- Grid de cards com score bar, badge, contatos, equipe
- Filtros: busca por nome, estado (UF), status, classificacao
- Paginacao (24 por pagina)
- Modal criar/editar: nome, nome politico, UF+municipio, bairro, telefone, whatsapp, email, equipe, status, observacoes
- Confirmar exclusao com loading
- Controle de acesso: podeEditar (PRESIDENTE/DIRETORIA/FUNCIONARIO), podeAdmin (PRESIDENTE)

## Endpoint backend

`GET /liderancas/?page=1&per_page=24` - retorna `{total, page, items}`
API responde 200 (testado com token JWT).

## Build

`npx next build --no-lint` saiu com exit code 0 sem erros.

## Nao testado

- Modal criar/editar em producao (backend retornou 0 registros - sem dados de teste)
- Fluxo de deletar (sem dados)
- Municipios por UF no modal (endpoint `/liderancas/util/municipios/{uf}` nao testado)
