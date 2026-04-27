# Descoberta — API SGIP3 do TSE

Em 27/04/2026 confirmamos que o SGIP3 (Sistema de Gerenciamento de Informações Partidárias do TSE) expõe **API REST pública sem autenticação** com cobertura nacional de:

- Todos os partidos registrados (44 partidos)
- Todos os órgãos partidários (Diretórios Nacionais, Estaduais, Municipais — incluindo Comissões Provisórias)
- **Composição completa (nominata)** com nome + CPF + título de eleitor + cargo + datas + status
- Endereço da sede + telefones (com flag WhatsApp)
- Histórico de vigências (composições passadas e atuais)

Este documento registra o achado pra que time técnico saiba o que está disponível e use a fonte correta nos sprints de ETL.

> **Spec técnica de implementação:** `docs/etl_sgip_spec.md` (gerado em paralelo por agente Sonnet)

---

## Por que isso é fundacional

### Problema reportado pelo Anderson (cliente)
Caso real: executivo responsável pelas nominatas no UB-SP estava **vendendo nominatas pra outros partidos**. Partido oponente comprava o "espaço" da nominata UB e engavetava — aparecia corpo de diretório municipal mas zero operação. Milton só descobria quando tentava mobilizar.

### Como o SGIP destrava a solução
Antes: o partido reportava o que fazia, e a plataforma media atividade declarada.

Agora: cruzamento automático **SGIP (oficial) × atividade na plataforma**:
- Membro "Ativo" no SGIP **e** operando na plataforma → ✅ saudável
- Membro "Ativo" no SGIP **mas** zero atividade na plataforma → 🟡 inerte
- Comissão com todos membros inertes → 🔴 fantasma
- Diff temporal: snapshot diário detecta entradas, saídas, mudanças de cargo

E com isso o algoritmo **NÃO depende** de Milton ou Anderson reportarem nada. Detecta sozinho.

---

## Endpoints validados (ao vivo, sem auth)

Base URL: `https://sgip3.tse.jus.br/sgip3-consulta/api/v1/`

### Listas de referência

| Endpoint | Retorna |
|----------|---------|
| `GET /partidos` | 44 partidos com `sqPartido`, `numero` (TSE), `sigla`, `nome`, `cnpj`, `dataRegistro`, `dataFundacao`, `dataInativacao`, `federacao` |
| `GET /ufs` | 26 UFs + DF |
| `GET /ufs/{UF}/municipios` | Municípios da UF — atenção: campo `sigla` aqui é o **código TSE numérico** (ex: 68675 = Pinhalzinho-SP), não a sigla UF |
| `GET /cargos` | Lista canônica de cargos da nominata (parâmetros ainda não mapeados) |

### Listagem de órgãos partidários

```
GET /orgaoPartidario/consulta?
  siglaPartido=UNIAO            # opcional, filtra por partido (sem cedilha)
  &tpAbrangencia=82             # 81=Nacional, 82=Estadual, 83=Municipal, 84=Regional/DF, 85=Zonal/DF
  &sgUe=SP                      # UF ou código TSE de município
  &sgUeSuperior=SP              # UF superior (pra Municipal)
  &nrZona=                      # zona eleitoral (opcional)
  &isComposicoesHistoricas=true # se true inclui não-vigentes
  &dataInicioVigencia=01/01/2020
  &dataFimVigencia=31/12/2030
```

Retorna lista de órgãos com:
- `sqOrgaoPartidario` (chave pra puxar detalhe)
- `numero`, `sigla`, `tipoOrgao` (Comissão executiva / Órgão definitivo / Órgão provisório)
- `dataInicioVigencia`, `dataFimVigencia`, `situacaoiVigencia` (Vigente / Não Vigente)
- `abrangencia`, `uf`, `municipio`, `zona`
- `situacoes` (array de status: Anotado, Restabelecido, Inativado por decisão do partido, etc.)

### Detalhe completo + nominata

```
GET /orgaoPartidario/comAnotacoesEMembros?idOrgaoPartidario={sqOrgaoPartidario}
```

> **⚠️ CRÍTICO:** o parâmetro chave é `idOrgaoPartidario`. Outros nomes (`sqOrgao`, `sqOrgaoPartidario`, `id`) retornam HTTP 200 mas com membros = null. Foi descoberto por testes empíricos.

Retorna shape completo (validado):

```json
{
  "sqOrgaoPartidario": 447751,
  "tipoOrgao": "Órgão definitivo",
  "dataInicioVigencia": "01/05/2023",
  "dataFimVigencia": "30/04/2027",
  "situacaoiVigencia": "Vigente",
  "abrangencia": "Estadual",
  "uf": "SP",
  "municipio": "",
  "orgaoPartidario": {
    "sqEndereco": {
      "logradouro": "...", "numero": "...", "bairro": "...", "cep": "...",
      "municipio": "...", "uf": "...",
      "telefones": [
        {
          "sqTelefone": 12859491,
          "nrTelefone": "1127389498",
          "nrTelefoneFormatado": "(11) 2738-9498",
          "stNotificaMensagemApp": true,
          "descricaoAplicativoChat": "Whatsapp",
          "ddd": 11
        }
      ]
    }
  },
  "anotacaoOrgaoPartidarioInfo": [...],
  "membros": [
    {
      "id": 10700054,
      "nomeMembro": "ALESSANDRO DE OLIVEIRA BRAZ",
      "nomeCargo": "MEMBRO DA EXECUTIVA",
      "dataInicioExercicio": "01/05/2023",
      "dataFimExercicio": "30/04/2027",
      "situacao": "Ativo",
      "respAdministrativo": "NÃO",
      "respFinanceiro": "NÃO",
      "nrTitulo": "215019770167",
      "cpf": "15321887810",
      "des_raca_cor": null,
      "des_genero": "MASCULINO"
    }
  ]
}
```

### Export Excel

```
GET /orgaoPartidario/xls?<mesmos params da /consulta>
```

Retorna binário XLS — útil pra backup operacional sem implementar parser do JSON.

---

## Cargos canônicos da nominata (descobertos via API)

Em uma única consulta ao Diretório UB-SP encontramos:

- PRESIDENTE
- PRESIDENTE EM EXERCÍCIO
- PRIMEIRO VICE-PRESIDENTE
- SEGUNDO VICE-PRESIDENTE
- TERCEIRO VICE-PRESIDENTE
- SECRETÁRIO(A)-GERAL
- SECRETÁRIO(A) ADJUNTO(A)
- TESOUREIRO(A)
- TESOUREIRO(A) ADJUNTO
- MEMBRO DA EXECUTIVA
- SUPLENTE DA EXECUTIVA
- DELEGADO(A)
- DELEGADO(A) SUPLENTE

Membros podem acumular múltiplos cargos: ex. `"DELEGADO(A) SUPLENTE | MEMBRO DA EXECUTIVA | PRIMEIRO VICE-PRESIDENTE"`. Separador no nome do cargo é `" | "`.

---

## Volume estimado

| Esfera | Quantidade |
|--------|-----------|
| Diretórios Nacionais | 33 partidos × 1 = ~33 |
| Diretórios Estaduais | 33 × 27 = ~891 |
| Diretórios Municipais | 33 × 5.570 = ~184.000 (em tese) |
| Órgãos ativos reais | ~50-100 mil (nem todo município tem comissão de todos partidos) |
| Membros (média 50/diretório) | ~3-5 milhões pessoa-cargo |

Volume de armazenamento de snapshot completo: **~3-5 GB** de JSON.

---

## Confirmação ao vivo (validação 27/04/2026)

Testamos com `sqOrgaoPartidario=447751` (Diretório UB Estadual SP, vigente 01/05/2023 → 30/04/2027):

- ✅ 70 membros completos retornados
- ✅ Encontramos **MILTON LEITE DA SILVA** como **Tesoureiro Ativo** do diretório (literalmente o cliente que vai aprovar a plataforma)
- ✅ Telefone da sede (11) 2738-9498 bate com o papel timbrado oficial
- ✅ Encontramos Alexandre Leite como **Presidente em Exercício + 1º Vice** (consistente com o documento Word do Anderson onde aparece como "DD Presidente Diretório Estadual")
- ✅ Encontramos Kim Kataguiri como **2º Vice-Presidente**

Confiança alta de que os dados são verídicos e atualizados.

---

## 3 saltos estratégicos que isso destrava

### Salto 1 — Saúde da Nominata em escala industrial
Cruzamento automático SGIP × plataforma → detecção de fantasmas, inertes, mudanças temporais. Sem depender de reporte manual.

### Salto 2 — Inteligência competitiva (radar adversário)
Acessar nominatas de **todos os 33 partidos** em paralelo:
- Mapa Estratégico camada "Adversários" deixa de ser estimativa, vira fato
- Saber QUEM é o presidente municipal de PT/PL/PSDB em cada cidade que UB disputa
- Detectar trocas estratégicas (presidente PSDB Tatuí virou presidente UB Tatuí 6 meses depois → migração de elite local)
- Identificar overlaps suspeitos (mesma pessoa em múltiplas comissões de partidos diferentes)

### Salto 3 — Inteligência sobre dirigentes individuais
CPF + Título eleitoral de cada membro permite cruzamento com:
- Candidaturas TSE (o tesoureiro municipal já foi candidato? em que cargo? quanto recebeu?)
- Sanções CGU/CEAF/CEIS/TCU (presidente municipal está limpo?)
- Filiação histórica (já passou por outros partidos?)
- Doações eleitorais (quem o financia?)

**Resultado:** dossiê completo do dirigente partidário, não só do candidato eleito. Era o gap número 1 do produto.

---

## Considerações operacionais

### ✅ Legalidade
- Lei 9.096/95: composição de partidos é informação pública
- LGPD art. 7º (interesse público): coleta justificada
- TSE expõe API pública oficialmente (mesmo o CPF está na resposta — escolha do TSE)
- Nada clandestino — fonte oficial direta

### ⚠️ Rate limiting
Não testamos volumes altos. ETL deve usar:
- Delay entre requests (sugerido 200ms = 5 req/s)
- Coleta em horário de baixa carga (madrugada)
- Cache local pesado (atualiza só o que mudou no SGIP)
- User-Agent identificável

### ⚠️ Robustez
API pode mudar (versão atual `23.19.66`). Fallback:
- Snapshot mensal completo em disco
- Endpoint XLS como backup secundário
- Cache 30 dias por órgão

### ⚠️ Volume
~50-100 mil órgãos × ~30 KB JSON cada = **1.5-3 GB** snapshot completo. Manejável.

---

## Roadmap de implementação (resumo — detalhe em `etl_sgip_spec.md`)

| Fase | Entrega | Tempo |
|------|---------|-------|
| **A** | Modelagem: tabelas `tse_partido`, `orgao_partidario`, `membro_orgao_partidario`, `endereco_orgao`, `telefone_orgao`, `historico_membro_orgao` | 1 dia |
| **B** | Crawler etapa 1: lista órgãos por (partido × abrangência × UF) | 2 dias |
| **C** | Crawler etapa 2: detalhe + membros por `idOrgaoPartidario` | 2 dias |
| **D** | Cruzamento com `politicos` (já existe) por CPF/título | 2 dias |
| **E** | Diff temporal (snapshot diário, detectar mudanças) | 2 dias |
| **F** | Endpoints da plataforma: Saúde da Nominata + Mapa Estratégico camada nominatas | 3 dias |
| **G** | Algoritmo Saúde Nominata calibrado por porte | 2 dias |
| **H** | Sistema de alertas automáticos (membro saiu, comissão inerte, mudança de cargo) | 2 dias |

**~14 dias úteis** pra ter Saúde da Nominata cruzada com SGIP funcionando ponta a ponta.

---

## Decisões registradas

- **Fonte canônica de nominatas:** SGIP3 TSE
- **Não usar entrada manual** como fonte primária — apenas como complemento (notas internas, observações)
- **Sincronização diária** com diff temporal pra detectar mudanças
- **Backup XLS mensal** pra resiliência
- **Multi-tenant**: dados SGIP são públicos e cross-tenant readable; estratégia confidencial sobre dirigentes é per-tenant (princípio da portabilidade de perfil)
- **RBAC**: dirigentes de OUTROS partidos só são visíveis pra Pres Nacional + Pres Estaduais (inteligência competitiva); membros do PRÓPRIO tenant respeitam hierarquia normal

---

## Documentos relacionados

- `docs/etl_sgip_spec.md` — Spec técnica detalhada (em paralelo)
- `docs/UB_estrutura_partidaria.md` — Hierarquia partidária + nominata (substitui modelo manual quando SGIP estiver disponível)
- `docs/perfis_e_paineis.md` — Quem vê dirigentes do próprio tenant vs adversários
- `docs/modulo_emendas.md` — Cruzamento Emendas × Nominatas no Mapa Compliance
- `docs/principio_portabilidade_perfil.md` — Multi-tenant readiness
- `docs/mapa_eleitoral_evolucao.md` — 3 Modos do Mapa Estratégico
