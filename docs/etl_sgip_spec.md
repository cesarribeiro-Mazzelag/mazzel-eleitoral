# ETL SGIP3 - Especificacao Tecnica Completa

**Sistema:** Plataforma Uniao Brasil - Modulo Orgaos Partidarios  
**API Alvo:** SGIP3 TSE (Sistema de Gerenciamento de Informacoes Partidarias)  
**Base URL:** `https://sgip3.tse.jus.br/sgip3-consulta/api/v1/`  
**Versao:** 1.0 | **Data:** 25/04/2026  
**Autor:** Spec produzida para implementacao por engenheiro Python

---

## Indice

1. [Modelo de Dados (PostgreSQL)](#1-modelo-de-dados)
2. [Estrategia de Crawler](#2-estrategia-de-crawler)
3. [Diff Temporal (Deteccao de Mudancas)](#3-diff-temporal)
4. [Cruzamento com Dados Existentes](#4-cruzamento-com-dados-existentes)
5. [Algoritmo de Saude da Nominata](#5-algoritmo-de-saude-da-nominata)
6. [Robustez e Tratamento de Erros](#6-robustez)
7. [Seguranca e Legalidade](#7-seguranca-e-legalidade)
8. [Codigo de Exemplo Python Async](#8-codigo-de-exemplo)
9. [Estimativas de Volume e Tempo](#9-estimativas)
10. [Roadmap de Implementacao](#10-roadmap)

---

## 1. Modelo de Dados

### 1.1 Principios de Design

- Todas as tabelas de cache externo (TSE) prefixadas com `tse_`
- Tabelas de dominio proprio da plataforma sem prefixo
- Timestamps em UTC, zona `America/Sao_Paulo` somente para exibicao
- CPF armazenado como `VARCHAR(11)` sem mascara; validado na insercao
- Titulo eleitoral como `VARCHAR(12)` sem mascara
- `sqOrgaoPartidario` e `id` do TSE mapeados para `sq_orgao` e `id_membro_tse`

---

### 1.2 Tabelas

#### `tse_partido`

Cache da lista de partidos. Atualizado a cada backfill semanal completo.

```sql
CREATE TABLE tse_partido (
    id                  INTEGER PRIMARY KEY,  -- id retornado pela API
    sq_partido          BIGINT UNIQUE NOT NULL, -- sqPartido
    numero              INTEGER NOT NULL,
    sigla               VARCHAR(20) NOT NULL,
    nome                VARCHAR(200) NOT NULL,
    cnpj                VARCHAR(14),
    situacao            VARCHAR(50),
    data_registro       DATE,
    data_fundacao       DATE,
    data_inativacao     DATE,
    payload_raw         JSONB,               -- campo completo da API para auditoria
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tse_partido_sigla ON tse_partido (sigla);
CREATE INDEX idx_tse_partido_situacao ON tse_partido (situacao);
```

---

#### `tse_uf`

```sql
CREATE TABLE tse_uf (
    sigla               VARCHAR(2) PRIMARY KEY,
    nome                VARCHAR(100) NOT NULL,
    capital             VARCHAR(100),
    sigla_unidade_superior VARCHAR(2),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

#### `tse_municipio_codigo`

Mapa entre o codigo TSE (`sg_ue`) e o codigo IBGE. Essencial para cruzamento com dados eleitorais existentes. A API retorna `sigla` como codigo numerico TSE (ex: `68675`), nao a sigla UF.

```sql
CREATE TABLE tse_municipio_codigo (
    sg_ue               VARCHAR(10) PRIMARY KEY, -- codigo TSE numerico (ex: "68675")
    sigla_uf            VARCHAR(2) NOT NULL,
    nome                VARCHAR(200) NOT NULL,
    capital             BOOLEAN DEFAULT FALSE,
    codigo_ibge         VARCHAR(7),              -- preenchido via join externo (IBGE)
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tse_mun_uf ON tse_municipio_codigo (sigla_uf);
CREATE INDEX idx_tse_mun_ibge ON tse_municipio_codigo (codigo_ibge);
CREATE INDEX idx_tse_mun_nome ON tse_municipio_codigo (nome);
```

**Nota sobre mapeamento IBGE x TSE:** Os codigos nao sao diretamente conversiveis por formula. Recomenda-se cruzamento por (nome_normalizado, uf) contra a tabela IBGE `municipios` ja existente na plataforma. Fuzzy match via `pg_trgm` para os ~200 municipios com grafias divergentes.

---

#### `orgao_partidario`

Tabela central. Um orgao e uma instancia de diretorio ou comissao de um partido em um nivel de abrangencia.

```sql
CREATE TABLE orgao_partidario (
    id                      BIGSERIAL PRIMARY KEY,
    sq_orgao                BIGINT UNIQUE NOT NULL, -- sqOrgaoPartidario da API
    numero                  VARCHAR(50),
    sigla_orgao             VARCHAR(100),
    tipo_orgao              VARCHAR(100),           -- ex: "DIRETORIO MUNICIPAL"
    
    -- Partido
    sigla_partido           VARCHAR(20) NOT NULL,
    partido_id              INTEGER REFERENCES tse_partido(id),
    
    -- Abrangencia
    tp_abrangencia          SMALLINT,               -- 81-85
    abrangencia_descricao   VARCHAR(50),            -- "Nacional","Estadual","Municipal"...
    uf                      VARCHAR(2),
    sg_ue_sede              VARCHAR(10),            -- codigo TSE da UE sede
    municipio_nome          VARCHAR(200),
    zona                    INTEGER,
    municipio_id            BIGINT,                 -- FK para municipios da plataforma (se disponivel)
    
    -- Vigencia
    data_inicio_vigencia    DATE,
    data_fim_vigencia       DATE,
    situacao_vigencia       VARCHAR(50),            -- "Vigente", "Encerrado"...
    emitir_comissao_exec    BOOLEAN,
    
    -- Controle de fetch
    detalhe_fetched_em      TIMESTAMPTZ,            -- quando /comAnotacoesEMembros foi buscado
    detalhe_hash            VARCHAR(64),            -- SHA-256 do payload do detalhe (para detectar mudancas)
    
    -- Auditoria
    payload_consulta_raw    JSONB,                  -- payload do /consulta
    payload_detalhe_raw     JSONB,                  -- payload do /comAnotacoesEMembros
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em             TIMESTAMPTZ             -- soft delete se sumir da API
);

CREATE INDEX idx_op_sigla_partido ON orgao_partidario (sigla_partido);
CREATE INDEX idx_op_uf ON orgao_partidario (uf);
CREATE INDEX idx_op_sg_ue ON orgao_partidario (sg_ue_sede);
CREATE INDEX idx_op_abrangencia ON orgao_partidario (tp_abrangencia);
CREATE INDEX idx_op_situacao ON orgao_partidario (situacao_vigencia);
CREATE INDEX idx_op_sq_orgao ON orgao_partidario (sq_orgao);
CREATE INDEX idx_op_partido_uf ON orgao_partidario (sigla_partido, uf);
CREATE INDEX idx_op_municipio_id ON orgao_partidario (municipio_id) WHERE municipio_id IS NOT NULL;
```

---

#### `endereco_orgao_partidario`

```sql
CREATE TABLE endereco_orgao_partidario (
    id              BIGSERIAL PRIMARY KEY,
    orgao_id        BIGINT NOT NULL REFERENCES orgao_partidario(id) ON DELETE CASCADE,
    sq_endereco     BIGINT,                 -- sqEndereco da API
    logradouro      VARCHAR(300),
    numero          VARCHAR(20),
    complemento     VARCHAR(200),
    bairro          VARCHAR(200),
    cep             VARCHAR(8),
    municipio       VARCHAR(200),
    uf              VARCHAR(2),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_endereco_orgao UNIQUE (orgao_id)
);
```

---

#### `telefone_orgao_partidario`

```sql
CREATE TABLE telefone_orgao_partidario (
    id                      BIGSERIAL PRIMARY KEY,
    orgao_id                BIGINT NOT NULL REFERENCES orgao_partidario(id) ON DELETE CASCADE,
    sq_telefone             BIGINT,
    tp_telefone             VARCHAR(20),
    ddd                     VARCHAR(3),
    nr_telefone             VARCHAR(20),
    nr_telefone_formatado   VARCHAR(30),
    st_notifica_mensagem    BOOLEAN,
    tipo_app_mensagem       VARCHAR(50),
    outro_app_msg           VARCHAR(100),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tel_orgao ON telefone_orgao_partidario (orgao_id);
```

---

#### `membro_orgao_partidario`

Membro atual (vigente). Esta tabela representa o estado **presente** da composicao.

```sql
CREATE TABLE membro_orgao_partidario (
    id                  BIGSERIAL PRIMARY KEY,
    id_membro_tse       BIGINT NOT NULL,            -- id retornado pela API
    orgao_id            BIGINT NOT NULL REFERENCES orgao_partidario(id) ON DELETE CASCADE,
    
    -- Identificacao
    nome_membro         VARCHAR(300) NOT NULL,
    cpf                 VARCHAR(11),
    nr_titulo           VARCHAR(12),
    
    -- Cargo / situacao
    nome_cargo          VARCHAR(200),
    data_inicio_exercicio DATE,
    data_fim_exercicio  DATE,
    situacao            VARCHAR(50),                -- "Ativo", "Inativo"...
    resp_administrativo BOOLEAN DEFAULT FALSE,
    resp_financeiro     BOOLEAN DEFAULT FALSE,
    
    -- Dados demograficos (publicos conforme SGIP)
    des_raca_cor        VARCHAR(50),
    des_genero          VARCHAR(50),
    
    -- Cruzamento com politicos da plataforma
    politico_id         BIGINT,                     -- FK para politicos (preenchido pos-cruzamento)
    cruzamento_status   VARCHAR(20) DEFAULT 'pendente',
    -- valores: 'pendente', 'encontrado', 'nao_encontrado', 'ambiguo'
    cruzamento_em       TIMESTAMPTZ,
    
    -- Controle
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_membro_orgao UNIQUE (id_membro_tse, orgao_id)
);

CREATE INDEX idx_membro_orgao ON membro_orgao_partidario (orgao_id);
CREATE INDEX idx_membro_cpf ON membro_orgao_partidario (cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_membro_titulo ON membro_orgao_partidario (nr_titulo) WHERE nr_titulo IS NOT NULL;
CREATE INDEX idx_membro_politico ON membro_orgao_partidario (politico_id) WHERE politico_id IS NOT NULL;
CREATE INDEX idx_membro_nome_trgm ON membro_orgao_partidario USING gin (nome_membro gin_trgm_ops);
CREATE INDEX idx_membro_cargo ON membro_orgao_partidario (nome_cargo);
CREATE INDEX idx_membro_cruzamento ON membro_orgao_partidario (cruzamento_status);
```

---

#### `historico_membro_orgao`

Snapshot temporal para diff. Cada linha e um estado do membro em um dado momento. Permite reconstruir linha do tempo completa.

```sql
CREATE TABLE historico_membro_orgao (
    id                  BIGSERIAL PRIMARY KEY,
    orgao_id            BIGINT NOT NULL REFERENCES orgao_partidario(id),
    id_membro_tse       BIGINT NOT NULL,
    
    -- Estado no momento do snapshot
    snapshot_em         TIMESTAMPTZ NOT NULL,
    snapshot_tipo       VARCHAR(20) NOT NULL,
    -- valores: 'entrada', 'saida', 'mudanca_cargo', 'mudanca_situacao', 'full_sync'
    
    nome_membro         VARCHAR(300),
    cpf                 VARCHAR(11),
    nr_titulo           VARCHAR(12),
    nome_cargo          VARCHAR(200),
    nome_cargo_anterior VARCHAR(200),       -- preenchido em mudanca_cargo
    data_inicio_exercicio DATE,
    data_fim_exercicio  DATE,
    situacao            VARCHAR(50),
    situacao_anterior   VARCHAR(50),        -- preenchido em mudanca_situacao
    resp_administrativo BOOLEAN,
    resp_financeiro     BOOLEAN,
    des_genero          VARCHAR(50),
    
    -- Metadados do diff
    diff_json           JSONB,              -- { campo: [valor_anterior, valor_novo] }
    politico_id         BIGINT,
    
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hist_orgao ON historico_membro_orgao (orgao_id);
CREATE INDEX idx_hist_membro_tse ON historico_membro_orgao (id_membro_tse);
CREATE INDEX idx_hist_snapshot ON historico_membro_orgao (snapshot_em);
CREATE INDEX idx_hist_tipo ON historico_membro_orgao (snapshot_tipo);
CREATE INDEX idx_hist_cpf ON historico_membro_orgao (cpf) WHERE cpf IS NOT NULL;
```

---

#### `historico_orgao_partidario`

Snapshot do estado do proprio orgao (nao dos membros).

```sql
CREATE TABLE historico_orgao_partidario (
    id                  BIGSERIAL PRIMARY KEY,
    orgao_id            BIGINT NOT NULL REFERENCES orgao_partidario(id),
    snapshot_em         TIMESTAMPTZ NOT NULL,
    snapshot_tipo       VARCHAR(30) NOT NULL,
    -- valores: 'ativacao', 'inativacao', 'mudanca_vigencia', 'full_sync'
    situacao_vigencia   VARCHAR(50),
    situacao_anterior   VARCHAR(50),
    data_inicio_vigencia DATE,
    data_fim_vigencia   DATE,
    diff_json           JSONB,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hist_orgao_ts ON historico_orgao_partidario (orgao_id, snapshot_em);
```

---

#### `saude_nominata`

Score calculado periodicamente. Uma linha por orgao por data de calculo.

```sql
CREATE TABLE saude_nominata (
    id              BIGSERIAL PRIMARY KEY,
    orgao_id        BIGINT NOT NULL REFERENCES orgao_partidario(id),
    calculado_em    TIMESTAMPTZ NOT NULL,
    
    -- Sub-scores (0-100)
    score_oper      NUMERIC(5,2),   -- Operacao
    score_cres      NUMERIC(5,2),   -- Crescimento
    score_resp      NUMERIC(5,2),   -- Responsividade
    score_ter       NUMERIC(5,2),   -- Territorio
    score_fin       NUMERIC(5,2),   -- Financeiro
    score_gov       NUMERIC(5,2),   -- Governanca
    score_pres      NUMERIC(5,2),   -- Presenca real / anti-fantasma
    
    score_total     NUMERIC(5,2) GENERATED ALWAYS AS (
        (COALESCE(score_oper,0) * 0.20 +
         COALESCE(score_cres,0) * 0.15 +
         COALESCE(score_resp,0) * 0.10 +
         COALESCE(score_ter,0)  * 0.15 +
         COALESCE(score_fin,0)  * 0.15 +
         COALESCE(score_gov,0)  * 0.15 +
         COALESCE(score_pres,0) * 0.10)
    ) STORED,
    
    cluster_referencia  VARCHAR(50),    -- ex: "municipio_medio_sul"
    detalhes_json   JSONB,              -- breakdown completo do calculo
    
    CONSTRAINT uq_saude_orgao_data UNIQUE (orgao_id, calculado_em)
);

CREATE INDEX idx_saude_orgao ON saude_nominata (orgao_id);
CREATE INDEX idx_saude_score ON saude_nominata (score_total DESC);
CREATE INDEX idx_saude_calculado ON saude_nominata (calculado_em);
```

---

#### `etl_sgip_run`

Controle de execucao do ETL para idempotencia e monitoring.

```sql
CREATE TABLE etl_sgip_run (
    id              BIGSERIAL PRIMARY KEY,
    run_id          UUID NOT NULL DEFAULT gen_random_uuid(),
    tipo            VARCHAR(30) NOT NULL, -- 'full_backfill', 'incremental', 'detalhe_orgao'
    status          VARCHAR(20) NOT NULL DEFAULT 'running',
    -- valores: 'running', 'completed', 'failed', 'partial'
    
    -- Escopo
    sigla_partido   VARCHAR(20),        -- NULL = todos
    uf              VARCHAR(2),         -- NULL = todas
    
    -- Metricas
    orgaos_total    INTEGER DEFAULT 0,
    orgaos_novos    INTEGER DEFAULT 0,
    orgaos_atualizados INTEGER DEFAULT 0,
    membros_total   INTEGER DEFAULT 0,
    membros_novos   INTEGER DEFAULT 0,
    membros_saidos  INTEGER DEFAULT 0,
    requests_ok     INTEGER DEFAULT 0,
    requests_erro   INTEGER DEFAULT 0,
    
    -- Controle
    iniciado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalizado_em   TIMESTAMPTZ,
    erro_mensagem   TEXT,
    config_json     JSONB               -- parametros usados na run
);

CREATE INDEX idx_etl_run_status ON etl_sgip_run (status);
CREATE INDEX idx_etl_run_tipo ON etl_sgip_run (tipo, iniciado_em DESC);
```

---

### 1.3 Extensoes Necessarias

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- fuzzy match nomes
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS btree_gin;  -- indices compostos com JSONB
```

---

## 2. Estrategia de Crawler

### 2.1 Arquitetura Geral

O crawler e implementado como pipeline async em Python usando `httpx.AsyncClient`. A execucao e orquestrada por um `asyncio.Semaphore` global que limita o numero de requests concorrentes.

**Diagrama de execucao (top-down):**

```
[1] GET /partidos          → popula tse_partido (44 itens)
[2] GET /ufs               → popula tse_uf (27 itens)
[3] GET /ufs/{uf}/municipios   → popula tse_municipio_codigo (paralelo por UF)
[4] GET /orgaoPartidario/consulta?siglaPartido=X&tpAbrangencia=81  → Nacional
[5] GET /orgaoPartidario/consulta?siglaPartido=X&tpAbrangencia=82&sgUe={UF_TSE}
[6] GET /orgaoPartidario/consulta?siglaPartido=X&tpAbrangencia=83&sgUe={MUN}&sgUeSuperior={UF}
[7] GET /orgaoPartidario/comAnotacoesEMembros?idOrgaoPartidario={sq}  → detalhe + membros
```

Os passos 1-3 sao rapidos (< 100 requests total) e executados sequencialmente no inicio. Os passos 4-6 produzem a lista de `sq_orgao` a ser detalhada no passo 7.

---

### 2.2 Paralelismo e Rate Limiting

```python
# Configuracao recomendada
SEMAPHORE_LIMIT = 5        # max 5 requests concorrentes
DELAY_BETWEEN_BATCHES = 0.2  # 200ms entre batches
REQUESTS_PER_SECOND = 4    # meta: 4 req/s
TIMEOUT_CONNECT = 10       # segundos
TIMEOUT_READ = 30          # segundos
MAX_RETRIES = 4
BACKOFF_BASE = 2.0         # backoff exponencial: 2^tentativa segundos
```

**Estimativa de throughput:**
- 4 req/s x 3600s = 14.400 req/hora
- 100.000 orgaos / 14.400 = ~7 horas de backfill (apenas detalhes)
- Com paralelismo 5: ~1,5-2 horas de backfill total

Caso a API responda com HTTP 429 ou latencia > 5s constante, reduzir para 2 req/s automaticamente (ver secao 6).

---

### 2.3 Estrategia de Enumeracao de Orgaos

A API `/orgaoPartidario/consulta` nao tem paginacao explicita. O volume retornado por combinacao (partido + abrangencia + UE) e pequeno o suficiente para caber em uma unica resposta. Portanto:

**Cartesian product de busca:**

```
Para cada partido P in tse_partido (44):
  Para cada abrangencia A in [81, 82, 83]:
    Se A == 81 (Nacional):
      GET /consulta?siglaPartido=P.sigla&tpAbrangencia=81
    Se A == 82 (Estadual):
      Para cada UF in tse_uf (27):
        GET /consulta?siglaPartido=P.sigla&tpAbrangencia=82&sgUe={UF.codigo_tse}
    Se A == 83 (Municipal):
      Para cada UF in tse_uf:
        Para cada municipio M in tse_municipio_codigo WHERE uf=UF:
          GET /consulta?siglaPartido=P.sigla&tpAbrangencia=83&sgUe={M.sg_ue}&sgUeSuperior={UF.sigla}
```

**Volume estimado de requests para enumeracao:**
- Nacional: 44 partidos x 1 = 44 requests
- Estadual: 44 x 27 = 1.188 requests
- Municipal: 44 x ~5.570 municipios = ~245.000 requests

Para Municipal, usar primeiro `/orgaoPartidario/count` para filtrar combinacoes com count=0 antes de buscar o detalhe. Isso pode reduzir em 60-70% o numero de requests (muitos partidos nao tem diretorio em todos os municipios).

**Otimizacao: busca por sigla sem UE especifica:**

Antes do loop municipal, testar:
```
GET /consulta?siglaPartido=UNIAO&tpAbrangencia=83
```
Se retornar todos os municipais sem paginacao, usar esta abordagem e ignorar o loop por municipio. Validar no inicio do ETL qual abordagem funciona.

---

### 2.4 Full Backfill vs Sync Incremental

#### Full Backfill (execucao inicial e semanal)

```
1. Limpar flag detalhe_fetched_em em orgaos com > 7 dias
2. Executar pipeline completo (passos 1-7)
3. Soft-delete orgaos que nao apareceram na enumeracao atual
4. Registrar run em etl_sgip_run com tipo='full_backfill'
```

Recomenda-se executar full backfill semanalmente (domingos, 02h00 Brasilia), pois o SGIP pode nao ter endpoint de delta.

#### Sync Incremental (diario)

```
1. GET /partidos e comparar com tse_partido (raramente muda)
2. Para cada partido: GET /consulta?siglaPartido=X&isComposicoesHistoricas=false
   - filtrar apenas orgaos com dataInicioVigencia ou dataFimVigencia recente (< 30 dias)
3. Para orgaos modificados: re-fetch /comAnotacoesEMembros
4. Rodar diff e registrar historico
```

**Checkpoint/resume:** Se o ETL falhar no meio, retomar pelo ultimo `sq_orgao` processado com sucesso (armazenado em `etl_sgip_run.config_json`). Usar a coluna `detalhe_fetched_em` como cursor: so processar orgaos onde `detalhe_fetched_em IS NULL OR detalhe_fetched_em < NOW() - INTERVAL '7 days'`.

---

### 2.5 Cache Local

Durante o backfill inicial, salvar cada resposta da API em disco em formato JSON compactado (`.json.gz`) antes de inserir no banco. Isso permite re-processar sem re-fetchar em caso de bug de parsing.

```
cache/
  partidos.json.gz
  ufs.json.gz
  municipios/{uf}.json.gz
  consulta/{sigla_partido}/{abrangencia}/{sg_ue}.json.gz
  detalhe/{sq_orgao}.json.gz
```

Nao utilizar cache de detalhe com mais de 7 dias (sincronizacao incremental invalida).

---

### 2.6 User-Agent e Identificacao

```python
HEADERS = {
    "User-Agent": "UniaoBrasil-ETL/1.0 (plataforma-politica; contato@uniaobrasil.org.br)",
    "Accept": "application/json",
    "Accept-Encoding": "gzip, deflate",
}
```

O TSE nao tem `robots.txt` para SGIP3 (validar no inicio do ETL com `GET /robots.txt`). Se houver, respeitar as diretivas.

---

## 3. Diff Temporal

### 3.1 Estrategia de Snapshot

**Frequencia recomendada:** Snapshot completo semanal (full backfill) + diff diario apenas para orgaos marcados como modificados.

**Mecanismo de deteccao de mudanca:**

Para cada orgao, antes de processar o novo detalhe:
1. Calcular `SHA-256(json.dumps(payload, sort_keys=True))`
2. Comparar com `orgao_partidario.detalhe_hash`
3. Se igual: skip (sem mudanca)
4. Se diferente ou NULL: processar diff e atualizar

Este hash elimina re-processamento desnecessario em ~95% dos orgaos em sincronizacoes incrementais.

---

### 3.2 Algoritmo de Diff de Membros

```python
def calcular_diff_membros(orgao_id: int, membros_novos: list[dict], db_session) -> dict:
    """
    Compara lista nova de membros com estado atual no banco.
    Retorna dict com listas: entradas, saidas, mudancas_cargo, mudancas_situacao
    """
    # Estado atual: indexado por id_membro_tse
    membros_atuais = {
        m.id_membro_tse: m
        for m in db_session.query(MemberOrgao).filter_by(orgao_id=orgao_id)
    }
    
    ids_novos = {m["id"] for m in membros_novos}
    ids_atuais = set(membros_atuais.keys())
    
    entradas = ids_novos - ids_atuais
    saidas = ids_atuais - ids_novos
    permanencias = ids_novos & ids_atuais
    
    mudancas = []
    for id_tse in permanencias:
        membro_novo = next(m for m in membros_novos if m["id"] == id_tse)
        membro_atual = membros_atuais[id_tse]
        diff = {}
        
        # Campos monitorados para mudanca
        campos = ["nomeCargo", "situacao", "respAdministrativo", "respFinanceiro",
                  "dataFimExercicio", "dataInicioExercicio"]
        
        for campo in campos:
            valor_novo = membro_novo.get(campo)
            valor_atual = getattr(membro_atual, campo_map[campo], None)
            if normalizar(valor_novo) != normalizar(valor_atual):
                diff[campo] = [valor_atual, valor_novo]
        
        if diff:
            mudancas.append({"id_membro_tse": id_tse, "diff": diff})
    
    return {
        "entradas": [m for m in membros_novos if m["id"] in entradas],
        "saidas": [membros_atuais[id] for id in saidas],
        "mudancas": mudancas
    }
```

**Casos especiais:**

- **Comissao inteira substituida:** Se `len(saidas) / len(ids_atuais) > 0.6` (60% dos membros saiu), registrar um evento de `tipo='renovacao_total'` em `historico_orgao_partidario`. Nao e um bug - e uma renovacao de mandato.

- **Orgao inativado:** Se o orgao sumiu da enumeracao ativa mas existe no banco, verificar com `/consulta?isComposicoesHistoricas=true`. Se confirmado inativo, fazer soft-delete e registrar `tipo='inativacao'`.

- **Orgao reativado:** Se orgao com `deletado_em IS NOT NULL` aparece novamente na enumeracao, limpar `deletado_em` e registrar `tipo='reativacao'`.

- **Vigencia alterada:** Monitorar `data_inicio_vigencia` e `data_fim_vigencia` do orgao. Qualquer alteracao vai para `historico_orgao_partidario`.

---

### 3.3 Eficiencia de Armazenamento

A tabela `historico_membro_orgao` nao armazena o payload completo do membro - apenas os campos que mudaram (`diff_json`) mais os campos de identificacao. Isso reduz volume em ~80% versus snapshot completo.

Retencao sugerida: snapshots do tipo `full_sync` podem ser purgados apos 12 meses, mantendo apenas eventos de mudanca (`entrada`, `saida`, `mudanca_cargo`) indefinidamente.

```sql
-- Purge snapshots full_sync com mais de 1 ano
DELETE FROM historico_membro_orgao
WHERE snapshot_tipo = 'full_sync'
  AND snapshot_em < NOW() - INTERVAL '1 year';
```

---

## 4. Cruzamento com Dados Existentes

### 4.1 Entidade Central: `politico`

A tabela `politicos` ja existente na plataforma tem CPF e numero de titulo. O membro do SGIP tem `cpf` e `nrTitulo`. O cruzamento e feito em duas etapas:

**Etapa 1 - Match exato (CPF + Titulo):**

```sql
UPDATE membro_orgao_partidario m
SET politico_id = p.id,
    cruzamento_status = 'encontrado',
    cruzamento_em = NOW()
FROM politicos p
WHERE m.cruzamento_status = 'pendente'
  AND m.cpf IS NOT NULL
  AND m.cpf != ''
  AND m.cpf = p.cpf;
```

CPF e o identificador mais confiavel. Titulo pode ter inconsistencias de formato (com/sem digitos verificadores).

**Etapa 2 - Match por Titulo (quando CPF ausente):**

```sql
UPDATE membro_orgao_partidario m
SET politico_id = p.id,
    cruzamento_status = 'encontrado',
    cruzamento_em = NOW()
FROM politicos p
WHERE m.cruzamento_status = 'pendente'
  AND m.nr_titulo IS NOT NULL
  AND lpad(m.nr_titulo, 12, '0') = lpad(p.numero_titulo, 12, '0');
```

**Etapa 3 - Match fuzzy por nome + UF (casos ambiguos, revisao manual):**

```sql
-- Candidatos a match ambiguo
SELECT m.id, m.nome_membro, m.cpf,
       p.id as politico_id_candidato, p.nome, p.cpf as cpf_politico,
       similarity(m.nome_membro, p.nome) as sim
FROM membro_orgao_partidario m
JOIN politicos p ON similarity(m.nome_membro, p.nome) > 0.85
WHERE m.cruzamento_status = 'pendente'
  AND EXISTS (
    SELECT 1 FROM orgao_partidario o
    WHERE o.id = m.orgao_id AND o.uf = p.uf_principal
  )
ORDER BY sim DESC;
```

Matches com similaridade > 0.85 e mesma UF: marcar como `cruzamento_status = 'ambiguo'` para revisao humana.

---

### 4.2 Dirigentes Sem Cargo Eletivo

Membro que nao cruza com nenhum politico existente: criar nova entrada em `politicos` com:

```python
{
    "nome": membro["nomeMembro"],
    "cpf": membro["cpf"],
    "numero_titulo": membro["nrTitulo"],
    "tipo": "dirigente_partidario",    # novo valor no enum
    "fonte_criacao": "sgip3_etl",
    "criado_em": now()
}
```

Isso permite que o dirigente seja referenciado em outras partes da plataforma sem criar duplicatas.

---

### 4.3 Candidatos Derrotados

Candidatos derrotados ja existem em `politicos` com tipo `candidato`. O cruzamento por CPF funcionara normalmente - o `politico_id` sera preenchido e o tipo permanece `candidato`. A presenca em um orgao partidario e uma informacao adicional visivel no dossie do politico, sem alterar o tipo.

---

### 4.4 Visao Unificada (View)

```sql
CREATE VIEW vw_membro_orgao_completo AS
SELECT
    m.id,
    m.id_membro_tse,
    m.nome_membro,
    m.cpf,
    m.nr_titulo,
    m.nome_cargo,
    m.situacao,
    m.resp_administrativo,
    m.resp_financeiro,
    m.data_inicio_exercicio,
    m.data_fim_exercicio,
    m.des_genero,
    m.des_raca_cor,
    o.sigla_partido,
    o.abrangencia_descricao,
    o.uf,
    o.municipio_nome,
    o.tipo_orgao,
    o.situacao_vigencia,
    p.id as politico_id,
    p.nome as politico_nome_normalizado,
    p.tipo as politico_tipo,
    m.cruzamento_status
FROM membro_orgao_partidario m
JOIN orgao_partidario o ON o.id = m.orgao_id
LEFT JOIN politicos p ON p.id = m.politico_id;
```

---

## 5. Algoritmo de Saude da Nominata

### 5.1 Visao Geral

O Score de Saude da Nominata (SSN) avalia a "vitalidade real" de um diretorio ou comissao executiva partidaria. Um orgao pode existir formalmente no SGIP mas estar "morto" na pratica - sem atividade, sem membros conhecidos, sem presenca territorial.

**Score Total = Soma ponderada de 7 sub-scores (0-100)**

| Codigo | Nome | Peso | Pergunta Central |
|--------|------|------|-----------------|
| OPER | Operacao | 20% | O orgao esta funcionando? |
| CRES | Crescimento | 15% | O partido esta crescendo aqui? |
| RESP | Responsividade | 10% | Os responsaveis sao alcancaveis? |
| TER | Territorio | 15% | O orgao cobre bem o territorio? |
| FIN | Financeiro | 15% | O orgao tem historico financeiro saudavel? |
| GOV | Governanca | 15% | A composicao obedece as regras internas? |
| PRES | Presenca Real | 10% | Os membros sao "reais" na plataforma? |

---

### 5.2 Calculo de cada Sub-Score

#### OPER - Operacao (20%)

Mede se o orgao esta vigente e com composicao ativa.

```
OPER = (
    40 * (situacao_vigencia == 'Vigente')
  + 30 * (qtd_membros_ativos / max(qtd_membros_mandato, 1) >= 0.7)
  + 20 * (data_fim_vigencia IS NULL OR data_fim_vigencia > NOW() + 90 dias)
  + 10 * (endereco preenchido)
)
```

- Orgao vigente: +40
- >= 70% dos cargos preenchidos com membros ativos: +30
- Vigencia longe de expirar (>90 dias): +20
- Endereco registrado: +10

---

#### CRES - Crescimento (15%)

Cruzamento com `filiados` da plataforma (TSE dados de filiacao).

```
CRES = (
    40 * (delta_filiados_12m > 0)     -- cresceu nos ultimos 12 meses
  + 30 * min(delta_percentual_filiados / 5.0, 1.0) * 100
         -- crescimento % normalizado (5% = saturado = 100 pontos)
  + 30 * (taxa_retencao_filiados > 0.85)
         -- reteve mais de 85% dos filiados do ano anterior
)
```

Se dados de filiacao nao disponiveis para o municipio, CRES = NULL (excluido da media ponderada).

---

#### RESP - Responsividade (10%)

Mede se o responsavel administrativo e financeiro sao identificaveis e cruzaveis.

```
RESP = (
    50 * (resp_admin_tem_cpf_valido)
  + 30 * (resp_fin_tem_cpf_valido)
  + 20 * (resp_admin_cruzamento_status == 'encontrado')
)
```

---

#### TER - Territorio (15%)

Para orgaos municipais: avalia cobertura de zonas eleitorais. Para estaduais: cobertura de municipios com >= 1 representante no orgao.

```
Para Municipal:
  TER = (zonas_com_membro / total_zonas_municipio) * 100
  -- Se municipio tem so 1 zona: verificar se membro e de zona unica = 100

Para Estadual:
  TER = (municipios_com_orgao_ativo / total_municipios_uf) * 100
  -- normalizado: > 40% cobertura = score 100

Para Nacional:
  TER = (ufs_com_orgao_estadual_ativo / 27) * 100
```

---

#### FIN - Financeiro (15%)

Cruzamento com dados da plataforma de prestacao de contas (TSE SPCE / contas partidarias).

```
FIN = (
    40 * (prestacao_contas_em_dia)
    -- ultimo ciclo sem irregularidade registrada
  + 30 * (sem_multa_tse_ultimos_3_anos)
  + 30 * (receita_declarada > 0 OR abrangencia != 'Municipal')
    -- municipais sem receita declarada nao penalizados em abrangencia < 10k eleitores
)
```

Se dados financeiros nao disponiveis: FIN = 50 (neutro).

---

#### GOV - Governanca (15%)

Mede se a composicao respeita regras internas e legais.

```
GOV = (
    40 * (proporcao_feminina >= 0.30)
    -- Lei 9.096/95 art. 44: minimo 30% mulheres em orgaos executivos
  + 30 * (presidente_identificado)
    -- cargo de presidente claramente nomeado
  + 20 * (nenhum_membro_com_punicao_ativa_registrada)
    -- cruzamento com tabela de sancoes da plataforma
  + 10 * (tempo_medio_mandato >= 2)
    -- mandatos de pelo menos 2 anos = estabilidade
)
```

---

#### PRES - Presenca Real / Anti-Fantasma (10%)

```
PRES = (
    60 * (proporcao_membros_cruzados)
    -- qtd membros com politico_id / total membros
  + 40 * (proporcao_membros_com_atividade_recente)
    -- membros cruzados que tiveram alguma atividade na plataforma nos ultimos 180 dias
    -- atividade = evento registrado, candidatura, aparicao em votacao, etc.
)
```

Orgao fantasma: `PRES < 20` - nenhum membro reconhecido e sem atividade.

---

### 5.3 Calibracao por Cluster

Municipios sao agrupados em clusters para evitar comparacao injusta entre Sao Paulo capital e um municipio de 5.000 habitantes:

```python
CLUSTERS = {
    "metr_sudeste":     {"pop_min": 500_000, "regioes": ["SP","RJ","MG"]},
    "metr_outros":      {"pop_min": 300_000},
    "grande_interior":  {"pop_min": 100_000},
    "medio_interior":   {"pop_min": 30_000},
    "pequeno_sul":      {"pop_min": 0, "regioes": ["RS","SC","PR"]},
    "pequeno_nordeste": {"pop_min": 0, "regioes": ["BA","PE","CE","MA","PB","RN","PI","AL","SE"]},
    "pequeno_norte":    {"pop_min": 0, "regioes": ["AM","PA","AC","RO","RR","AP","TO"]},
    "pequeno_co":       {"pop_min": 0, "regioes": ["MT","MS","GO","DF"]},
}
```

Cada sub-score e normalizado dentro do cluster (percentil relativo), nao absoluto. Isso garante que um diretorio pequeno no Nordeste nao seja punido por ter menos filiados que SP.

---

### 5.4 Deteccao de Fantasma

Um orgao e marcado como "fantasma" se:

```sql
UPDATE orgao_partidario
SET flag_fantasma = TRUE
WHERE id IN (
    SELECT o.id
    FROM orgao_partidario o
    JOIN saude_nominata s ON s.orgao_id = o.id
    WHERE s.calculado_em = (SELECT MAX(calculado_em) FROM saude_nominata)
      AND s.score_pres < 20
      AND o.situacao_vigencia = 'Vigente'
      AND o.tp_abrangencia IN (82, 83)  -- Estadual e Municipal
);
```

---

## 6. Robustez

### 6.1 Rate Limiting Adaptativo

```python
class AdaptiveRateLimiter:
    def __init__(self, initial_rps=4.0):
        self.rps = initial_rps
        self.consecutive_429 = 0
        self.consecutive_slow = 0
    
    async def wait(self):
        await asyncio.sleep(1.0 / self.rps)
    
    def on_429(self):
        self.consecutive_429 += 1
        self.rps = max(1.0, self.rps * 0.5)
        logger.warning(f"Rate limited. Reduzindo para {self.rps:.1f} req/s")
    
    def on_slow_response(self, elapsed: float):
        if elapsed > 5.0:
            self.consecutive_slow += 1
            if self.consecutive_slow >= 3:
                self.rps = max(1.0, self.rps * 0.7)
    
    def on_success(self, elapsed: float):
        self.consecutive_429 = 0
        if elapsed < 1.0 and self.rps < 4.0:
            self.rps = min(4.0, self.rps * 1.1)
```

---

### 6.2 Retry com Backoff Exponencial

```python
async def fetch_with_retry(client, url, params=None, max_retries=4):
    for attempt in range(max_retries):
        try:
            response = await client.get(url, params=params, timeout=30)
            
            if response.status_code == 429:
                rate_limiter.on_429()
                wait_time = 2 ** attempt * 10  # 10s, 20s, 40s, 80s
                await asyncio.sleep(wait_time)
                continue
            
            if response.status_code >= 500:
                wait_time = 2 ** attempt * 2  # 2s, 4s, 8s, 16s
                await asyncio.sleep(wait_time)
                continue
            
            if response.status_code == 404:
                return None  # Orgao removido -- nao e erro
            
            response.raise_for_status()
            return response
            
        except httpx.TimeoutException:
            if attempt == max_retries - 1:
                logger.error(f"Timeout definitivo: {url}")
                raise
            await asyncio.sleep(2 ** attempt)
        except httpx.ConnectError:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(5)
    
    return None
```

---

### 6.3 Monitoramento de Mudancas na API

No inicio de cada run de ETL, executar um conjunto de "smoke tests" para detectar quebra de contrato:

```python
SMOKE_TESTS = [
    {
        "url": "/partidos",
        "assert_keys": ["sqPartido", "sigla", "situacao"],
        "assert_min_count": 40
    },
    {
        "url": "/orgaoPartidario/consulta",
        "params": {"siglaPartido": "UNIAO", "tpAbrangencia": 81},
        "assert_keys": ["sqOrgaoPartidario", "tipoOrgao", "abrangencia"],
        "assert_min_count": 1
    },
    {
        "url": "/orgaoPartidario/comAnotacoesEMembros",
        "params": {"idOrgaoPartidario": 447751},  # ID estavel de referencia
        "assert_keys": ["sqOrgaoPartidario", "membros", "orgaoPartidario"],
        "assert_nested": {"membros[0]": ["id", "nomeMembro", "nomeCargo"]}
    }
]
```

Se qualquer smoke test falhar: abortar o ETL e enviar alerta.

---

### 6.4 Encoding

A API SGIP3 retorna UTF-8, mas respostas legadas ou campos de texto livre podem conter:
- Caracteres ISO-8859-1 mal convertidos (ex: `Ã©` em vez de `e`)
- Espacos nao-quebravels Unicode (` `)
- Cedilhas e acentos em maiuscula fora do padrao

```python
def normalizar_texto(texto: str | None) -> str | None:
    if texto is None:
        return None
    # Remove espaços extra e normaliza Unicode
    import unicodedata
    texto = unicodedata.normalize("NFC", texto.strip())
    texto = " ".join(texto.split())  # colapsa multiplos espacos
    return texto or None
```

---

### 6.5 Validacao de CPF

```python
def validar_cpf(cpf: str | None) -> str | None:
    """Retorna CPF limpo (11 digitos) se valido, None se invalido."""
    if not cpf:
        return None
    
    cpf = re.sub(r'\D', '', str(cpf))
    
    if len(cpf) != 11:
        return None
    
    # CPFs invalidos conhecidos
    if len(set(cpf)) == 1:
        return None
    
    # Digitos verificadores
    def calc_digito(cpf, mult_start):
        total = sum(int(c) * m for c, m in zip(cpf, range(mult_start, 1, -1)))
        resto = (total * 10) % 11
        return 0 if resto == 10 else resto
    
    if calc_digito(cpf, 10) != int(cpf[9]):
        return None
    if calc_digito(cpf, 11) != int(cpf[10]):
        return None
    
    return cpf
```

---

### 6.6 Validacao de Titulo de Eleitor

```python
def validar_titulo(titulo: str | None) -> str | None:
    """Retorna titulo limpo (12 digitos) se valido, None se invalido."""
    if not titulo:
        return None
    
    titulo = re.sub(r'\D', '', str(titulo))
    
    if len(titulo) not in (8, 9, 10, 11, 12):
        return None
    
    # Normalizar para 12 digitos com leading zeros
    titulo = titulo.zfill(12)
    
    return titulo
```

Nota: O checksum do titulo eleitoral e complexo e dependente do estado. Para fins de cruzamento, usar apenas CPF como campo primario. Titulo e campo auxiliar.

---

### 6.7 Tratamento de Campos Nulos

Campos que a API pode omitir ou retornar como string `"null"`:

```python
def clean_field(value, expected_type=str):
    if value is None or value == "null" or value == "":
        return None
    if expected_type == bool:
        if isinstance(value, bool):
            return value
        return str(value).upper() in ("SIM", "TRUE", "1", "S")
    if expected_type == date:
        if isinstance(value, str):
            for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
                try:
                    return datetime.strptime(value, fmt).date()
                except ValueError:
                    pass
        return None
    return expected_type(value) if value is not None else None
```

---

## 7. Seguranca e Legalidade

### 7.1 Base Legal para Coleta

**Lei 9.096/95 (Lei dos Partidos Politicos):**
- Art. 15, IX: os partidos devem publicar lista de membros dos orgaos de direcao
- Art. 58: composicao dos diretórios e comissoes executivas e dado publico
- O SGIP3 e o sistema oficial do TSE para publicidade dessas informacoes

**LGPD (Lei 13.709/2018):**
- Art. 7o, inciso III: tratamento necessario para cumprimento de obrigacao legal ou regulatoria
- Art. 7o, inciso V: execucao de contrato quando o titular e parte
- Art. 7o, inciso IX: atender aos interesses legitimos do controlador ou de terceiro - dados publicos com previsao legal
- CPF e titulo sao identificadores minimos para cumprimento da finalidade

**Conclusao:** A coleta e processamento sao juridicamente respaldados. O dado e publico por forca de lei. Transparencia e finalidade (analise politica e controle social) sao justificativas validas.

---

### 7.2 Boas Praticas de Armazenamento

- **Nao criar perfis comerciais** a partir dos dados (nao vender, nao usar para marketing)
- **Nao armazenar** dados de contato pessoal (telefone celular de membros nao e dado do orgao)
- **Acesso controlado por tenant**: membro de um tenant nao acessa dados de outro
- **Logs de acesso** ao CPF: qualquer query que retorna CPF deve ser logada em `audit_log`
- **Mascaramento parcial** na exibicao: exibir CPF como `153.218.***-**` para roles sem permissao `dados_sensiveis`
- **Retencao limitada**: historico com mais de 5 anos pode ser purgado (dados politicos historicos tem menor relevancia operacional)

---

### 7.3 ToS da API SGIP3

A API SGIP3 e um servico publico do TSE sem ToS explicita. Principios a seguir:
- Nao causar carga excessiva (rate limit conservador: 4 req/s max)
- Identificar o crawler com User-Agent rastreavel
- Nao fazer scraping do HTML do SGIP3 (usar apenas a API REST)
- Se o TSE emitir nota publica restricao de uso: suspender imediatamente

---

## 8. Codigo de Exemplo

### 8.1 Estrutura do Crawler Principal

```python
# etl/sgip3/crawler.py
import asyncio
import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import AsyncIterator

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

BASE_URL = "https://sgip3.tse.jus.br/sgip3-consulta/api/v1"
SEMAPHORE_LIMIT = 5
HEADERS = {
    "User-Agent": "UniaoBrasil-ETL/1.0 (plataforma-politica; contato@uniaobrasil.org.br)",
    "Accept": "application/json",
}

logger = logging.getLogger("etl.sgip3")


class SGIP3Crawler:
    def __init__(self, db: AsyncSession, cache_dir: str = "/tmp/sgip3_cache"):
        self.db = db
        self.cache_dir = cache_dir
        self.semaphore = asyncio.Semaphore(SEMAPHORE_LIMIT)
        self.rate_limiter = AdaptiveRateLimiter(initial_rps=4.0)
        self.stats = {"requests_ok": 0, "requests_erro": 0, "orgaos_processados": 0}

    async def fetch(self, path: str, params: dict = None) -> dict | list | None:
        url = f"{BASE_URL}{path}"
        async with self.semaphore:
            await self.rate_limiter.wait()
            t0 = asyncio.get_event_loop().time()
            try:
                async with httpx.AsyncClient(headers=HEADERS, timeout=30) as client:
                    response = await fetch_with_retry(client, url, params=params)
                    if response is None:
                        return None
                    elapsed = asyncio.get_event_loop().time() - t0
                    self.rate_limiter.on_success(elapsed)
                    self.stats["requests_ok"] += 1
                    return response.json()
            except Exception as e:
                self.stats["requests_erro"] += 1
                logger.error(f"Erro ao buscar {url}: {e}")
                return None

    async def fetch_partidos(self) -> list[dict]:
        data = await self.fetch("/partidos")
        return data or []

    async def fetch_ufs(self) -> list[dict]:
        data = await self.fetch("/ufs")
        return data or []

    async def fetch_municipios_uf(self, uf_sigla: str) -> list[dict]:
        data = await self.fetch(f"/ufs/{uf_sigla}/municipios")
        return data or []

    async def fetch_orgaos_consulta(
        self,
        sigla_partido: str,
        tp_abrangencia: int,
        sg_ue: str = None,
        sg_ue_superior: str = None,
    ) -> list[dict]:
        params = {
            "siglaPartido": sigla_partido,
            "tpAbrangencia": tp_abrangencia,
            "isComposicoesHistoricas": "false",
        }
        if sg_ue:
            params["sgUe"] = sg_ue
        if sg_ue_superior:
            params["sgUeSuperior"] = sg_ue_superior
        data = await self.fetch("/orgaoPartidario/consulta", params=params)
        return data or []

    async def fetch_detalhe_orgao(self, sq_orgao: int) -> dict | None:
        return await self.fetch(
            "/orgaoPartidario/comAnotacoesEMembros",
            params={"idOrgaoPartidario": sq_orgao},
        )

    async def processar_orgao(self, sq_orgao: int) -> None:
        """Busca detalhe, compara com estado atual, persiste diff."""
        detalhe = await self.fetch_detalhe_orgao(sq_orgao)
        if detalhe is None:
            logger.warning(f"Orgao {sq_orgao} retornou None")
            return

        payload_str = json.dumps(detalhe, sort_keys=True, ensure_ascii=False)
        novo_hash = hashlib.sha256(payload_str.encode()).hexdigest()

        # Buscar estado atual no banco
        orgao = await self.db.get_orgao_by_sq(sq_orgao)

        if orgao and orgao.detalhe_hash == novo_hash:
            logger.debug(f"Orgao {sq_orgao}: sem mudancas (hash identico)")
            return

        # Calcular diff de membros
        membros_novos = detalhe.get("membros", [])
        if orgao:
            diff = await self.db.calcular_diff_membros(orgao.id, membros_novos)
            await self.db.registrar_historico(orgao.id, diff)

        # Upsert orgao + membros
        await self.db.upsert_orgao(detalhe, novo_hash)
        self.stats["orgaos_processados"] += 1

    async def run_backfill_partido(self, sigla_partido: str) -> None:
        """Backfill completo para um partido."""
        logger.info(f"Iniciando backfill: {sigla_partido}")

        # Nacional
        orgaos_nac = await self.fetch_orgaos_consulta(sigla_partido, 81)
        
        # Estadual (por UF)
        ufs = await self.db.get_ufs()
        tasks_estadual = [
            self.fetch_orgaos_consulta(sigla_partido, 82, sg_ue=uf.sigla)
            for uf in ufs
        ]
        resultados_estadual = await asyncio.gather(*tasks_estadual)
        orgaos_est = [o for lst in resultados_estadual for o in lst]

        # Municipal (por municipio)
        municipios = await self.db.get_municipios()
        tasks_municipal = [
            self.fetch_orgaos_consulta(
                sigla_partido, 83,
                sg_ue=m.sg_ue,
                sg_ue_superior=m.sigla_uf
            )
            for m in municipios
        ]
        resultados_municipal = await asyncio.gather(*tasks_municipal)
        orgaos_mun = [o for lst in resultados_municipal for o in lst]

        todos_orgaos = orgaos_nac + orgaos_est + orgaos_mun
        sq_orgaos = [o["sqOrgaoPartidario"] for o in todos_orgaos]

        logger.info(f"{sigla_partido}: {len(sq_orgaos)} orgaos encontrados")

        # Persistir lista basica
        await self.db.upsert_orgaos_consulta(todos_orgaos, sigla_partido)

        # Detalhe em paralelo (controlado pelo semaforo)
        tasks_detalhe = [self.processar_orgao(sq) for sq in sq_orgaos]
        await asyncio.gather(*tasks_detalhe)

    async def run_full_backfill(self) -> None:
        """Backfill completo de todos os partidos."""
        partidos = await self.fetch_partidos()
        siglas = [p["sigla"] for p in partidos if p.get("situacao") != "Cancelado"]
        
        for sigla in siglas:
            await self.run_backfill_partido(sigla)
        
        logger.info(f"Backfill concluido. Stats: {self.stats}")
```

---

### 8.2 Funcao de Cruzamento com Politicos

```python
# etl/sgip3/cruzamento.py

async def cruzar_membros_com_politicos(db: AsyncSession) -> dict:
    """
    Executa cruzamento em 3 etapas para membros pendentes.
    Retorna contagem de resultados.
    """
    stats = {"encontrados": 0, "nao_encontrados": 0, "ambiguos": 0}

    # Etapa 1: Match por CPF
    result_cpf = await db.execute("""
        UPDATE membro_orgao_partidario m
        SET politico_id = p.id,
            cruzamento_status = 'encontrado',
            cruzamento_em = NOW()
        FROM politicos p
        WHERE m.cruzamento_status = 'pendente'
          AND m.cpf IS NOT NULL
          AND m.cpf = p.cpf
        RETURNING m.id
    """)
    stats["encontrados"] += len(result_cpf.fetchall())

    # Etapa 2: Match por Titulo (membros ainda pendentes)
    result_titulo = await db.execute("""
        UPDATE membro_orgao_partidario m
        SET politico_id = p.id,
            cruzamento_status = 'encontrado',
            cruzamento_em = NOW()
        FROM politicos p
        WHERE m.cruzamento_status = 'pendente'
          AND m.nr_titulo IS NOT NULL
          AND lpad(m.nr_titulo, 12, '0') = lpad(p.numero_titulo, 12, '0')
        RETURNING m.id
    """)
    stats["encontrados"] += len(result_titulo.fetchall())

    # Etapa 3: Match fuzzy (ambiguos para revisao)
    result_fuzzy = await db.execute("""
        WITH candidatos AS (
            SELECT
                m.id as membro_id,
                p.id as politico_id,
                similarity(m.nome_membro, p.nome) as sim,
                ROW_NUMBER() OVER (
                    PARTITION BY m.id
                    ORDER BY similarity(m.nome_membro, p.nome) DESC
                ) as rn
            FROM membro_orgao_partidario m
            CROSS JOIN LATERAL (
                SELECT p2.id, p2.nome
                FROM politicos p2
                WHERE similarity(m.nome_membro, p2.nome) > 0.85
                LIMIT 3
            ) p
            WHERE m.cruzamento_status = 'pendente'
        )
        UPDATE membro_orgao_partidario m
        SET cruzamento_status = 'ambiguo',
            cruzamento_em = NOW()
        FROM candidatos c
        WHERE c.membro_id = m.id AND c.rn = 1
        RETURNING m.id
    """)
    stats["ambiguos"] += len(result_fuzzy.fetchall())

    # Etapa 4: Criar politicos novos para nao encontrados
    result_novos = await db.execute("""
        INSERT INTO politicos (nome, cpf, numero_titulo, tipo, fonte_criacao)
        SELECT DISTINCT ON (m.cpf)
            m.nome_membro, m.cpf, m.nr_titulo, 'dirigente_partidario', 'sgip3_etl'
        FROM membro_orgao_partidario m
        WHERE m.cruzamento_status = 'pendente'
          AND m.cpf IS NOT NULL
        RETURNING id
    """)
    novos_ids = [r[0] for r in result_novos.fetchall()]

    # Vincular novos politicos de volta
    if novos_ids:
        await db.execute("""
            UPDATE membro_orgao_partidario m
            SET politico_id = p.id,
                cruzamento_status = 'encontrado',
                cruzamento_em = NOW()
            FROM politicos p
            WHERE m.cruzamento_status = 'pendente'
              AND m.cpf = p.cpf
              AND p.tipo = 'dirigente_partidario'
        """)

    # Marcar restantes como nao_encontrados
    result_sem = await db.execute("""
        UPDATE membro_orgao_partidario
        SET cruzamento_status = 'nao_encontrado',
            cruzamento_em = NOW()
        WHERE cruzamento_status = 'pendente'
        RETURNING id
    """)
    stats["nao_encontrados"] += len(result_sem.fetchall())

    await db.commit()
    return stats
```

---

### 8.3 Funcao de Diff Temporal

```python
# etl/sgip3/diff.py

from dataclasses import dataclass
from typing import Optional

@dataclass
class MembroDiff:
    id_membro_tse: int
    tipo: str  # 'entrada', 'saida', 'mudanca_cargo', 'mudanca_situacao'
    diff_json: dict
    dados_membro: dict


def calcular_diff_membros(
    membros_anteriores: list[dict],  # do banco
    membros_novos: list[dict]        # da API
) -> list[MembroDiff]:
    """
    Compara duas listas de membros e retorna lista de diferencas.
    membros_anteriores: rows do banco serializados como dict
    membros_novos: lista bruta da API
    """
    CAMPOS_MONITORADOS = {
        "nomeCargo":            "nome_cargo",
        "situacao":             "situacao",
        "respAdministrativo":   "resp_administrativo",
        "respFinanceiro":       "resp_financeiro",
        "dataFimExercicio":     "data_fim_exercicio",
    }

    def normalizar_bool(v) -> Optional[bool]:
        if v is None:
            return None
        if isinstance(v, bool):
            return v
        return str(v).upper() in ("SIM", "TRUE", "1", "S")

    def normalizar_data(v) -> Optional[str]:
        if not v:
            return None
        for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
            try:
                from datetime import datetime
                return datetime.strptime(v, fmt).strftime("%Y-%m-%d")
            except ValueError:
                pass
        return str(v)

    idx_anterior = {m["id_membro_tse"]: m for m in membros_anteriores}
    idx_novo = {m["id"]: m for m in membros_novos}

    diffs = []

    # Entradas
    for id_tse, membro in idx_novo.items():
        if id_tse not in idx_anterior:
            diffs.append(MembroDiff(
                id_membro_tse=id_tse,
                tipo="entrada",
                diff_json={},
                dados_membro=membro
            ))

    # Saidas
    for id_tse, membro in idx_anterior.items():
        if id_tse not in idx_novo:
            diffs.append(MembroDiff(
                id_membro_tse=id_tse,
                tipo="saida",
                diff_json={},
                dados_membro=membro
            ))

    # Mudancas
    for id_tse in set(idx_anterior) & set(idx_novo):
        anterior = idx_anterior[id_tse]
        novo = idx_novo[id_tse]
        diff = {}

        for campo_api, campo_db in CAMPOS_MONITORADOS.items():
            val_novo = novo.get(campo_api)
            val_ant = anterior.get(campo_db)

            # Normalizar para comparacao
            if campo_api in ("respAdministrativo", "respFinanceiro"):
                val_novo = normalizar_bool(val_novo)
                val_ant = normalizar_bool(val_ant)
            elif campo_api.startswith("data"):
                val_novo = normalizar_data(val_novo)
                val_ant = normalizar_data(str(val_ant) if val_ant else None)
            else:
                val_novo = str(val_novo).strip().upper() if val_novo else None
                val_ant = str(val_ant).strip().upper() if val_ant else None

            if val_novo != val_ant:
                diff[campo_api] = [val_ant, val_novo]

        if diff:
            tipo = "mudanca_cargo" if "nomeCargo" in diff else "mudanca_situacao"
            diffs.append(MembroDiff(
                id_membro_tse=id_tse,
                tipo=tipo,
                diff_json=diff,
                dados_membro=novo
            ))

    return diffs
```

---

## 9. Estimativas

### 9.1 Volume de Dados

| Entidade | Estimativa | Tamanho medio/row | Total estimado |
|----------|------------|-------------------|----------------|
| tse_partido | 44 | 500 B | 22 KB |
| tse_municipio_codigo | 5.570 | 200 B | 1,1 MB |
| orgao_partidario | 80.000 | 2 KB (com payload_raw) | 160 MB |
| endereco_orgao_partidario | 60.000 | 300 B | 18 MB |
| telefone_orgao_partidario | 80.000 | 200 B | 16 MB |
| membro_orgao_partidario | 4.000.000 | 600 B | 2,4 GB |
| historico_membro_orgao | 500.000/ano | 400 B | 200 MB/ano |
| saude_nominata | 80.000/semana | 500 B | 40 MB/semana |
| **TOTAL INICIAL** | | | **~2,8 GB** |

Com indices PostgreSQL: multiplicar por 1.5 = **~4,2 GB total inicial**.

Crescimento anual estimado: ~300 MB (historico + saude).

---

### 9.2 Tempo de Backfill

**Fase 1 - Referencias (partidos, ufs, municipios):**
- ~100 requests, sequencial: < 2 minutos

**Fase 2 - Enumeracao de orgaos:**
- Nacional: 44 req
- Estadual: 44 x 27 = 1.188 req
- Municipal com /count primeiro: ~10.000 req (filtrar zeros)
- Municipal detalhe: ~5.000 req (apos filtrar)
- Total ~16.000 req a 4 req/s = ~67 minutos

**Fase 3 - Detalhe dos orgaos (passo critico):**
- 80.000 orgaos / 4 req/s = 20.000 segundos = **~5,5 horas**
- Com paralelismo 5 e API responsiva: **~1,5 horas**

**Total estimado de backfill inicial:** 3-8 horas dependendo da resposta da API.

---

### 9.3 Custo Computacional

- **RAM:** O crawler em si usa < 512 MB (streaming, nao carrega tudo em memoria)
- **CPU:** Baixo - O gargalo e I/O de rede
- **Banco de dados durante backfill:** ~2 IOPS/insert, pico de ~20 inserts/s = moderado
- **Disco temporario (cache):** ~5 GB para cache completo dos payloads raw

Recomendacao: executar o backfill em horario de baixo trafego (02h-08h). Para producao, usar uma instancia Railway/VPS separada para o ETL pesado para nao impactar a API da plataforma.

---

## 10. Roadmap de Implementacao

### Fase 1 - ETL Basico + Modelo de Dados (Semana 1-2)

**Sprint 1.1 - Infraestrutura:**
- [ ] Criar migration Alembic com todas as tabelas (secao 1)
- [ ] Instalar extensoes PostgreSQL (`pg_trgm`, `pgcrypto`)
- [ ] Configurar `etl_sgip_run` para controle de execucao
- [ ] Setup logging estruturado (JSON) com nivel por modulo

**Sprint 1.2 - Crawler Base:**
- [ ] Implementar `SGIP3Crawler` com semaforo e rate limiter adaptativo
- [ ] Implementar `fetch_with_retry` com backoff exponencial
- [ ] Implementar smoke tests pre-execucao
- [ ] Implementar cache local em disco (`.json.gz`)

**Sprint 1.3 - Pipeline de Enumeracao:**
- [ ] `fetch_partidos` + `upsert tse_partido`
- [ ] `fetch_ufs` + `upsert tse_uf`
- [ ] `fetch_municipios_uf` (paralelo por UF) + `upsert tse_municipio_codigo`
- [ ] Enumeracao de orgaos Nacional + Estadual
- [ ] Enumeracao Municipal com `/count` como filtro

**Sprint 1.4 - Detalhe e Persistencia:**
- [ ] `fetch_detalhe_orgao` com hash de mudanca
- [ ] `upsert_orgao` completo (orgao + endereco + telefones + membros)
- [ ] Validacao de CPF e normalizacao de campos
- [ ] Teste de carga com 1 partido completo (UNIAO ou PT)

**Entregavel Fase 1:** Banco populado com 1 partido completo. Script de backfill funcional. Logs e controle de execucao.

---

### Fase 2 - Cruzamento com Politicos (Semana 3)

**Sprint 2.1 - Cruzamento Automatico:**
- [ ] Implementar `cruzar_membros_com_politicos` (3 etapas: CPF, titulo, fuzzy)
- [ ] Criar politicos novos do tipo `dirigente_partidario`
- [ ] Implementar UI de revisao de casos `ambiguo` no admin da plataforma

**Sprint 2.2 - Visoes e Queries:**
- [ ] Criar `vw_membro_orgao_completo`
- [ ] Adicionar endpoint `/api/politico/{id}/orgaos_partidarios` no backend
- [ ] Adicionar secao "Orgaos Partidarios" no dossie do politico (frontend)

**Entregavel Fase 2:** Membros cruzados com politicos existentes. Dossie exibe cargos partidarios.

---

### Fase 3 - Algoritmo de Saude (Semana 4)

**Sprint 3.1 - Sub-scores Basicos:**
- [ ] Implementar OPER, GOV, PRES (dependem apenas de dados do SGIP)
- [ ] Implementar RESP (depende de validacao de CPF)
- [ ] Criar job diario de calculo e insercao em `saude_nominata`

**Sprint 3.2 - Sub-scores Cruzados:**
- [ ] Implementar CRES (requer dados de filiacao TSE)
- [ ] Implementar TER (requer dados de zonas eleitorais)
- [ ] Implementar FIN (requer dados de prestacao de contas TSE)

**Sprint 3.3 - Calibracao e UI:**
- [ ] Implementar clusterizacao de municipios
- [ ] Normalizar scores por percentil dentro de cluster
- [ ] Implementar deteccao de fantasma
- [ ] Criar componente de Score Card no frontend (estilo termometro)

**Entregavel Fase 3:** Score de saude calculado para todos os orgaos. UI exibe breakdown por sub-score.

---

### Fase 4 - Sync Incremental + Diff Temporal (Semana 5)

**Sprint 4.1 - Diff Engine:**
- [ ] Implementar `calcular_diff_membros` completo
- [ ] Implementar `registrar_historico` (insercao em `historico_membro_orgao`)
- [ ] Implementar deteccao de renovacao_total e inativacao de orgao

**Sprint 4.2 - Job Incremental:**
- [ ] Implementar run `tipo='incremental'` com filtro por data recente
- [ ] Configurar cron: backfill semanal (domingo 02h) + incremental diario (06h)
- [ ] Alertas de anomalia: orgao com >60% de mudanca em 24h

**Entregavel Fase 4:** Historico temporal completo. Alertas de mudancas significativas.

---

### Fase 5 - Endpoints da Plataforma (Semana 6)

**Sprint 5.1 - Backend:**
- [ ] `GET /api/orgaos-partidarios?partido=X&uf=Y&abrangencia=Z`
- [ ] `GET /api/orgaos-partidarios/{id}` (com membros e historico)
- [ ] `GET /api/orgaos-partidarios/{id}/saude` (breakdown do score)
- [ ] `GET /api/partido/{sigla}/mapa-orgaos` (para o mapa eleitoral)

**Sprint 5.2 - Frontend (Modulo Diretorios):**
- [ ] Tela de listagem de orgaos com filtros
- [ ] Tela de detalhe do orgao (membros + endereco + score de saude)
- [ ] Timeline de mudancas de composicao
- [ ] Integracao no mapa: camada de orgaos por municipio

**Sprint 5.3 - Admin e Monitoramento:**
- [ ] Dashboard de status do ETL (ultima run, proxima, erros)
- [ ] Metricas de cobertura por partido/UF
- [ ] Botao de re-sync manual por orgao ou partido

**Entregavel Fase 5:** Modulo Diretorios completo e integravel no produto.

---

## Apendice A - Mapeamento de Campos API -> Banco

| Campo API | Tabela | Campo Banco | Transformacao |
|-----------|--------|-------------|---------------|
| `sqOrgaoPartidario` | `orgao_partidario` | `sq_orgao` | Direto |
| `tipoOrgao` | `orgao_partidario` | `tipo_orgao` | Normalizar maiusculas |
| `dataInicioVigencia` | `orgao_partidario` | `data_inicio_vigencia` | `dd/MM/yyyy` -> `DATE` |
| `situacaoiVigencia` | `orgao_partidario` | `situacao_vigencia` | Corrigir typo original |
| `abrangencia` | `orgao_partidario` | `abrangencia_descricao` | Direto |
| `sgUeSede` | `orgao_partidario` | `sg_ue_sede` | Direto |
| `membros[].id` | `membro_orgao_partidario` | `id_membro_tse` | Direto |
| `membros[].nomeMembro` | `membro_orgao_partidario` | `nome_membro` | `normalizar_texto()` |
| `membros[].cpf` | `membro_orgao_partidario` | `cpf` | `validar_cpf()` |
| `membros[].nrTitulo` | `membro_orgao_partidario` | `nr_titulo` | `validar_titulo()` |
| `membros[].respAdministrativo` | `membro_orgao_partidario` | `resp_administrativo` | `"SIM"/"NÃO"` -> `BOOL` |
| `membros[].respFinanceiro` | `membro_orgao_partidario` | `resp_financeiro` | `"SIM"/"NÃO"` -> `BOOL` |
| `orgaoPartidario.sqEndereco.logradouro` | `endereco_orgao_partidario` | `logradouro` | Direto |
| `orgaoPartidario.sqEndereco.telefones[]` | `telefone_orgao_partidario` | `*` | Expandir array |

---

## Apendice B - Queries de Monitoramento

```sql
-- Cobertura por partido
SELECT
    p.sigla,
    COUNT(o.id) as total_orgaos,
    COUNT(o.id) FILTER (WHERE o.situacao_vigencia = 'Vigente') as vigentes,
    COUNT(m.id) as total_membros,
    COUNT(m.id) FILTER (WHERE m.cruzamento_status = 'encontrado') as membros_cruzados,
    ROUND(COUNT(m.id) FILTER (WHERE m.cruzamento_status = 'encontrado') * 100.0 /
          NULLIF(COUNT(m.id), 0), 1) as pct_cruzamento
FROM tse_partido p
LEFT JOIN orgao_partidario o ON o.sigla_partido = p.sigla
LEFT JOIN membro_orgao_partidario m ON m.orgao_id = o.id
GROUP BY p.sigla
ORDER BY total_orgaos DESC;

-- Orgaos fantasma por partido
SELECT o.sigla_partido, o.uf, o.municipio_nome, s.score_pres, s.score_total
FROM orgao_partidario o
JOIN saude_nominata s ON s.orgao_id = o.id
WHERE s.calculado_em > NOW() - INTERVAL '7 days'
  AND s.score_pres < 20
  AND o.situacao_vigencia = 'Vigente'
ORDER BY s.score_total;

-- Ultimas mudancas de membros
SELECT
    o.sigla_partido, o.abrangencia_descricao, o.uf, o.municipio_nome,
    h.snapshot_tipo, h.nome_membro, h.nome_cargo, h.snapshot_em
FROM historico_membro_orgao h
JOIN orgao_partidario o ON o.id = h.orgao_id
WHERE h.snapshot_tipo != 'full_sync'
  AND h.snapshot_em > NOW() - INTERVAL '7 days'
ORDER BY h.snapshot_em DESC
LIMIT 100;
```

---

*Spec gerada em 25/04/2026. Versao 1.0.*
