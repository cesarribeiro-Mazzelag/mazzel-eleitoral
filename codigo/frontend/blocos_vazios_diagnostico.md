# Diagnostico - Blocos vazios no Dossie do Lula (candidato 931510)

**Data:** 24/04/2026
**Escopo:** 5 blocos sinalizados como vazios/com travessao no dossie do Lula (Presidente da Republica - cargo executivo, sem mandato legislativo).

> **Observacao metodologica:** o curl ao backend foi solicitado, mas o ambiente bloqueou execucao de Bash. O diagnostico foi feito por leitura estatica de:
> - schema Pydantic (`app/schemas/dossie.py`)
> - agente compilador (`app/agents/dossie.py` - funcoes `_build_legislativo`, `_build_executivo`)
> - adapter (`components/plataforma-v2/adapters/dossie.js`)
> - componentes (`HeaderHero.jsx`, `AtividadeLegislativa.jsx`, `AlertasJuridicos.jsx`, `Financeiro.jsx`, `Emendas.jsx`)
>
> O comportamento do JSON para Lula e inferido com alta confianca a partir do agente: Presidente sem mandato legislativo federal -> `legislativo.disponivel=False`, `executivo` populado, `juridico.sancoes=[]` (a menos que haja registro CGU), `financeiro` depende do ciclo selecionado.

---

## 1. KPIs ao lado da cartinha (Mandatos / PL aprovados / Presenca / Receita)

Renderizado em `HeaderHero.jsx` linhas 88-99 lendo `profile.stats[]`. Montado em `dossie.js` `adaptStats()` (linhas 180-192).

| Aspecto | Status |
|---|---|
| Backend retorna o campo? | **parcial** - `trajetoria.cargos_disputados` existe (Mandatos OK), `legislativo.projetos_aprovados` e `legislativo.presenca_plenario_pct` ficam **null** porque `_build_legislativo` retorna `Legislativo()` (disponivel=False) quando o candidato nao tem registro em `mandatos_legislativo`. Lula nunca foi parlamentar federal -> ambos null. `financeiro.total_arrecadado` e populado mas pode ser pequeno/0 conforme ciclo. |
| Adapter mapeia corretamente? | **nao** - so olha `dossie.legislativo`. Para cargo executivo (Presidente/Governador/Prefeito), o equivalente sao MPs/PLs de `dossie.executivo.n_mps_aprovadas / n_pls_enviados / total_atos` - **completamente ignorados** pelo adapter. "Presenca" tambem nao se aplica ao executivo (nao existe presenca em plenario). |
| Componente renderiza fallback adequado quando ausente? | **sim, mas raso** - mostra `"-"` (`fmtReais` e ternarios em `adaptStats`), o que casa com a regra "nunca inventar". Porem nao explica POR QUE esta vazio nem propoe metrica equivalente para executivo. |
| Recomendacao | `adaptStats` deve checar `dossie.executivo.cargo` e, quando presente, montar stats especificos do executivo: `MPs editadas` (`n_medidas_provisorias`), `Aprovadas` (`n_mps_aprovadas`), `Taxa MP` (`taxa_aprovacao_mps`), `Decretos` (`n_decretos`). "Presenca" so faz sentido para parlamentar - omitir do header de presidentes/governadores ou trocar por outro KPI. |

---

## 2. Secao "Atividade Legislativa" (`AtividadeLegislativa.jsx`)

| Aspecto | Status |
|---|---|
| Backend retorna o campo? | **nao para Lula** - `_build_legislativo` (linha 1366-1367) retorna `Legislativo()` com `disponivel=False`. Lula tem dados de governo em `dossie.executivo` (presidencia 2003-2010 e 2023-atual), com MPs, PLs, vetos e decretos populados. Nao ha bloco "Atividade Legislativa" para Presidente; ha bloco "Atividade Executiva" no schema (`Executivo`) que **nao tem componente frontend equivalente**. |
| Adapter mapeia corretamente? | **sim para o que existe** - `adaptLegislativo` (linhas 268-297) respeita `disponivel: false` e devolve `{ disponivel: false }`. Mas adapter nao gera nada para `dossie.executivo` -> bloco fica orfao. |
| Componente renderiza fallback adequado quando ausente? | **sim** - linhas 54-64 mostram EmptyState "Sem mandato legislativo ativo / Este candidato nao possui mandato parlamentar ativo no periodo analisado." Tecnicamente correto, mas para Presidente da Republica fica enganoso (sugere ausencia de atividade quando o cara editou centenas de MPs). |
| Recomendacao | Duas opcoes: (a) criar `AtividadeExecutiva.jsx` consumindo `profile.executivo` (MPs, PLs, vetos, decretos, taxa de aprovacao) e renderizar **em vez** de `AtividadeLegislativa` quando `dossie.executivo.cargo` esta presente; (b) ampliar `AtividadeLegislativa` para detectar cargo executivo e trocar headline + cards. Opcao (a) e mais limpa dado que o schema ja separa as duas secoes (`legislativo` vs `executivo`). |

---

## 3. Secao "Alertas Juridicos" (`AlertasJuridicos.jsx`)

| Aspecto | Status |
|---|---|
| Backend retorna o campo? | **parcial** - `juridico` esta no schema com `sancoes`, `processos_relevantes`, `ficha_limpa`, `historico_aptidao`. Para Lula, `sancoes` provavelmente vazio (CEIS/CEAF nao registram politicos eleitos), `processos_relevantes` provavelmente vazio (nao temos ETL de STF/TJs). `ficha_limpa` pode vir `null` (sem dado TSE) ou `true`. |
| Adapter mapeia corretamente? | **sim** - `adaptAlertas` (linhas 301-331) consolida sancoes + processos em `itens[]` e calcula `fichaLimpa = j.ficha_limpa === true && itens.length === 0`. |
| Componente renderiza fallback adequado quando ausente? | **NAO - bug** - a condicao `if (!A.itens.length && A.fichaLimpa)` (linha 18) so renderiza o EmptyState verde "Ficha limpa" quando `ficha_limpa === true` E nao ha alertas. Quando `ficha_limpa` for `null` ou `false` E `itens.length === 0` (cenario provavel para Lula: TSE sem registro determinavel), cai no bloco principal e renderiza apenas o cabecalho "0 alertas - ultima verif. ontem" com `<div class="space-y-3">` vazio. **Bloco aparece visualmente vazio.** |
| Recomendacao | Tratar 3 estados explicitamente: (a) `fichaLimpa === true` -> EmptyState verde atual; (b) `fichaLimpa !== true && itens.length === 0` -> EmptyState neutro "Sem dados juridicos consolidados" (e nao "ficha limpa", para nao prometer o que nao foi verificado); (c) `itens.length > 0` -> lista atual. Evita o "zero" enganoso. |

---

## 4. Secao "Financeiro" (`Financeiro.jsx`)

| Aspecto | Status |
|---|---|
| Backend retorna o campo? | **sim, com ressalva** - `financeiro.disponivel` defaulta `True` no schema. Para Lula (Presidente, financiamento publico), `total_arrecadado` e `total_gasto` devem vir > 0; `principais_doadores` provavelmente vazio (financiamento partidario/eleitoral, nao PF/PJ); `origem_recursos` populado parcial (alto pct fundo eleitoral); `cpv_benchmark` depende de pares - cargo Presidente tem N=2 ou 3 candidatos, benchmark fraco. |
| Adapter mapeia corretamente? | **parcial** - linhas 335-376. Bug: linha 337 retorna `{ disponivel: false }` se `F.disponivel=false`, mas para Lula deve vir `true`. Linha 38 do componente faz `Math.max(...F.fontes.map(f => f.v))` - se `fontes` vier vazio (nenhum `*_pct` definido), retorna `-Infinity` e quebra a renderizacao das barras. Topdoadores so existem se ETL detalhado rodou (`doadores_disponiveis=true`); para Presidente provavelmente vazio. |
| Componente renderiza fallback adequado quando ausente? | **parcial** - se `disponivel=false` mostra EmptyState OK. Mas se `disponivel=true` e `fontes=[]`, tem bug em `Math.max(...[])`; e Top doadores renderiza tabela vazia sem mensagem. Sem fallback intermediario para "ciclo informado mas sem detalhamento de doacoes/fontes". |
| Recomendacao | (1) No componente: guardar contra `fontes.length === 0` antes do `Math.max`; (2) renderizar mensagem "Detalhamento de fontes nao publicado pelo TSE" quando `fontes` vazio; (3) renderizar "Sem doadores PF nesta candidatura (financiamento publico)" quando `topDoadores` vazio; (4) considerar verificar tambem `doadores_disponiveis` no adapter para decidir se mostra a tabela. |

---

## 5. Secao "Emendas Parlamentares" (`Emendas.jsx`)

| Aspecto | Status |
|---|---|
| Backend retorna o campo? | **NAO** - nao existe campo `emendas` no schema `DossiePolitico` (verificado em `app/schemas/dossie.py`). Nenhum ETL de SIOP/Camara/emendas foi implementado (`grep emendas` em `app/` retorna apenas referencia em `models/campanha.py` - outro contexto). Esta no roadmap mencionado em `project_uniao_brasil_emendas_e_modulo_estudo.md` (20/04/2026, **visao**, nao entregue). |
| Adapter mapeia corretamente? | **nao se aplica** - linha 522 do adapter: `emendas: { aplicavel: false }` **hardcoded**. Comentario explicito: `// backend nao retorna bloco de emendas hoje`. |
| Componente renderiza fallback adequado quando ausente? | **sim** - `Emendas.jsx` linhas 70-80 renderiza EmptyState "Secao nao aplicavel - Emendas parlamentares sao um indicador exclusivo de parlamentares com mandato ativo." |
| Recomendacao | Mensagem atual e incorreta semanticamente: nao e que emendas "nao se apliquem" a Lula - e que o **dado nao esta integrado para ninguem ainda**. Trocar EmptyState para "Modulo Emendas em construcao - integracao SIOP/Camara prevista no roadmap" para nao confundir o usuario (ele pode pensar que parlamentares teriam o bloco preenchido, e nao tem). Alternativa: ocultar a secao ate o ETL existir, em vez de mostrar EmptyState (segue regra "nunca inventar"). |

---

## Sintese executiva (raiz do problema)

1. **Adapter ignora o eixo `executivo` do schema** - Lula e Presidente; toda a sua atividade institucional esta em `dossie.executivo` (MPs, PLs, vetos, decretos, taxa MP). O frontend so consome `dossie.legislativo`. Resultado: KPIs do header zerados + secao Legislativo com EmptyState. **Maior impacto.**

2. **Bug no `AlertasJuridicos`** quando ficha limpa nao e `true` mas tambem nao ha sancoes - renderiza grade vazia em vez de EmptyState. Atinge politicos sem ETL juridico completo.

3. **Bug no `Financeiro`** com `Math.max(...[])` quando `fontes` e vazio - pode quebrar a renderizacao silenciosamente.

4. **Emendas nao existe no backend** - hardcoded `aplicavel:false` no adapter; mensagem do EmptyState induz a erro semantico.

5. **Stats do header sem variantes por cargo** - "Presenca" nao se aplica a executivo; "PL aprovados" deveria ler de `executivo` quando aplicavel.

**Prioridade sugerida:** (1) criar componente `AtividadeExecutiva` + adaptar `adaptStats` para cargo executivo; (2) corrigir bug `AlertasJuridicos` (3 estados); (3) corrigir bug `Math.max` em `Financeiro` + EmptyStates intermediarios; (4) ajustar copy do `Emendas` ou ocultar secao.
