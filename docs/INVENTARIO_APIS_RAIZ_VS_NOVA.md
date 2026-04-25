# Inventario de APIs - Raiz vs Nova Plataforma

Data: 24/04/2026
Objetivo: mapear todos os endpoints consumidos pelos modulos raiz e comparar com o que ja existe em `mazzel-preview` / `plataforma-v2`.

---

## Client HTTP da nova plataforma

Arquivo: `components/plataforma-v2/api.js`

Funcoes disponiveis no objeto `API`:

| Funcao | Endpoint |
|--------|----------|
| `API.dashboard` | `GET /dashboard/visao-geral` |
| `API.dossie` | `GET /dossie/{id}` |
| `API.radar` | `GET /radar/politicos` |
| `API.filiados` | `GET /filiados` |
| `API.delegados` | `GET /delegados` |
| `API.alertas` | `GET /alertas` |
| `API.iaChat` | `POST /ia/chat` |
| `API.iaSugestoes` | `GET /ia/sugestoes` |
| `API.adminUsuarios` | `GET /admin/usuarios` |
| `API.adminAuditoria` | `GET /admin/auditoria` |
| `API.meuPainel` | `GET /meu-painel/resumo` |
| `API.mapaFarol` | `GET /mapa/farol` |
| `API.mapaEstadoEleitos` | `GET /mapa/estado/{uf}/eleitos` |
| `API.mapaEstadoForcas` | `GET /mapa/estado/{uf}/forcas` |
| `API.mapaGeojson` | `GET /mapa/geojson/{uf}` |
| `API.mapaDistritosGeojson` | `GET /mapa/distritos-geojson` |
| `API.mapaMunicipio` | `GET /mapa/municipio/{cod_ibge}` |

---

## Inventario por modulo raiz

| Modulo raiz | Endpoints consumidos | Existe em mazzel-preview? | Prioridade port |
|-------------|----------------------|--------------------------|-----------------|
| `dashboard` | `GET /dashboard/visao-geral?anos={ano}` (chamado 2x: 2024+2022) | **Sim** - `API.dashboard` mapeado | ALTA |
| `mapa` | `GET /mapa/geojson/brasil`, `/mapa/geojson/brasil-municipios`, `/mapa/geojson/{uf}`, `/mapa/geojson/{uf}/comparacao`, `/mapa/geojson/{uf}/comparacao-temporal`, `/mapa/geojson/{uf}/comparacao-partidos`, `/mapa/municipio/{ibge}`, `/mapa/municipio/{ibge}/microregioes`, `/mapa/municipio/{ibge}/locais`, `/mapa/mascara`, `/mapa/microregiao/{id}/geometry`, `/mapa/suplentes` | **Parcial** - `API.mapaFarol`, `API.mapaGeojson`, `API.mapaMunicipio` existem; microregioes/mascara/comparacao/locais nao estao no api.js da nova | ALTA |
| `radar` (hub com 4 tabs) | `GET /radar/politicos` (lista + filtros), `GET /radar/partidos` | **Parcial** - `API.radar` aponta so para `/radar/politicos`; `/radar/partidos` nao tem wrapper dedicado | ALTA |
| `radar/politicos/[id]` (DossieBureau) | `GET /dossie/{id}` | **Sim** - `API.dossie` mapeado | ALTA |
| `radar/partidos/[sigla]` | `GET /radar/partidos/{sigla}` | **Nao** - sem wrapper em api.js da nova | MEDIA |
| `alertas` (AlertasContent) | `GET /alertas`, `POST /alertas/{id}/lido`, `POST /alertas/lidos`, `POST /alertas/gerar` | **Parcial** - `API.alertas` so faz GET; acoes POST nao estao em api.js da nova | MEDIA |
| `filiados` (FiliadosContent) | `GET /filiados`, `POST /filiados`, `PUT /filiados/{id}`, `GET /filiados/exportar` | **Parcial** - `API.filiados` so faz GET; CRUD e exportar nao mapeados | MEDIA |
| `delegados` | `GET /delegados`, `POST /delegados`, `PUT /delegados/{id}`, `DELETE /delegados/{id}`, `GET /delegados/{id}`, `GET /delegados/{id}/performance`, `GET /delegados/{id}/zonas`, `POST /delegados/{id}/zonas` | **Parcial** - `API.delegados` so faz GET lista; CRUD completo nao mapeado | MEDIA |
| `admin` (AdminContent) | `GET /admin/usuarios`, `POST /admin/usuarios`, `PUT /admin/usuarios/{id}`, `POST /admin/usuarios/{id}/toggle`, `GET /admin/auditoria` | **Sim** - `API.adminUsuarios` e `API.adminAuditoria` mapeados (so leitura); escrita nao mapeada | MEDIA |
| `cabos` | `GET /cabos/`, `POST /cabos/`, `PATCH /cabos/{id}`, `DELETE /cabos/{id}`, `GET /auth/me`, `GET /liderancas/util/municipios/{uf}` | **Nao** - modulo nao tem wrapper em api.js da nova | MEDIA |
| `coordenadores` | `GET /coordenadores`, `POST /coordenadores`, `PUT /coordenadores/{id}`, `DELETE /coordenadores/{id}`, `GET /coordenadores/{id}`, `GET /coordenadores/sem-coordenador/{uf}`, `POST /coordenadores/{id}/municipios` | **Nao** - modulo nao tem wrapper em api.js da nova | MEDIA |
| `liderancas` (LiderancasContent) | `GET /liderancas/`, `POST /liderancas`, `PATCH /liderancas/{id}`, `DELETE /liderancas/{id}`, `GET /auth/me`, `GET /liderancas/util/municipios/{uf}` | **Nao** - modulo nao tem wrapper em api.js da nova | MEDIA |
| `suplentes` | `GET /mapa/suplentes?cargo=VEREADOR&ano=2024&faixa={faixa}&uf={uf}` | **Nao** - `/mapa/suplentes` nao esta em api.js da nova | BAIXA |
| `meu-painel` (MeuPainelContent) | `GET /meu-painel/resumo` | **Sim** - `API.meuPainel` mapeado | BAIXA |
| `meu-dossie` | `GET /meu-painel/resumo`, `GET /meu-painel/dossie/pdf` | **Parcial** - resumo existe; download PDF nao mapeado | BAIXA |
| `meus-votos` | `GET /meu-painel/votos` | **Nao** - `/meu-painel/votos` nao esta em api.js da nova | BAIXA |
| `relatorios` (RelatoriosContent) | `GET /relatorios`, `POST /relatorios`, `GET /relatorios/{id}/download` | **Nao** - modulo nao tem wrapper em api.js da nova | BAIXA |
| `configuracoes` | `GET /auth/me` (via `api.getUser()`), `POST /auth/trocar-senha` | **Parcial** - auth basico existe; trocar-senha nao mapeado em api.js da nova | BAIXA |
| `glossario` | Sem chamadas de API (conteudo estatico) | **N/A** | BAIXA |
| `politicos` | Redirect para `/radar/politicos` (sem chamada propria) | **N/A** | - |
| `mapa-google`, `mapa-v2`, `design-lab` | Paginas experimentais/internas - nao auditadas | - | DESCARTAVEL |

---

## Funcoes em api.js da nova que NAO estao sendo usadas em mazzel-preview

Com base no grep de `API.*` nas pastas `mazzel-preview` e `components/plataforma-v2`:

| Funcao presente em api.js | Usada em mazzel-preview? |
|---------------------------|--------------------------|
| `API.dashboard` | Sim |
| `API.dossie` | Sim |
| `API.radar` | Sim |
| `API.filiados` | Sim |
| `API.delegados` | Sim |
| `API.alertas` | Sim |
| `API.iaChat` | Sim |
| `API.adminUsuarios` | Sim |
| `API.adminAuditoria` | Sim |
| `API.meuPainel` | Sim |
| `API.mapaFarol` | Sim |
| `API.mapaEstadoEleitos` | Sim |
| `API.mapaEstadoForcas` | Sim |
| `API.mapaGeojson` | Sim |
| `API.mapaDistritosGeojson` | Sim |
| `API.mapaMunicipio` | Sim |
| `API.iaSugestoes` | **Nao** - definida mas sem uso confirmado em mazzel-preview |

---

## Endpoints da raiz sem correspondencia na nova plataforma (lacunas criticas)

Os itens abaixo precisam ser adicionados a `components/plataforma-v2/api.js` antes do port dos modulos:

1. `POST /alertas/{id}/lido`, `POST /alertas/lidos`, `POST /alertas/gerar`
2. `GET/POST/PUT/DELETE /filiados`, `GET /filiados/exportar`
3. CRUD completo de `/delegados`
4. `GET/POST/PUT/DELETE /cabos`
5. `GET/POST/PUT/DELETE /coordenadores`, `GET /coordenadores/sem-coordenador/{uf}`, `POST /coordenadores/{id}/municipios`
6. `GET/POST/PATCH/DELETE /liderancas`, `GET /liderancas/util/municipios/{uf}`
7. `GET /radar/partidos`, `GET /radar/partidos/{sigla}`
8. `GET /mapa/suplentes`
9. `GET /meu-painel/votos`, `GET /meu-painel/dossie/pdf`
10. `GET /relatorios`, `POST /relatorios`, `GET /relatorios/{id}/download`
11. `POST /auth/trocar-senha`
12. `GET /mapa/geojson/brasil`, `/mapa/geojson/brasil-municipios`, `/mapa/geojson/{uf}/comparacao`, `/mapa/geojson/{uf}/comparacao-temporal`, `/mapa/geojson/{uf}/comparacao-partidos`
13. `/mapa/municipio/{ibge}/microregioes`, `/mapa/municipio/{ibge}/locais`
14. `POST /admin/usuarios`, `PUT /admin/usuarios/{id}`, `POST /admin/usuarios/{id}/toggle`
