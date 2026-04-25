# Princípio: Portabilidade de Perfil + Isolamento de Dados Estratégicos

Decisão arquitetural-chave: o **político é dono dos dados pessoais dele**; o **partido é dono da estratégia confidencial sobre ele**. Quando político troca de partido, o que é pessoal vai junto; o que é estratégico fica.

> Decisão: César, sessão 25/04/2026 noite. Substitui visões anteriores que tratavam tudo como single-tenant.

---

## Por que existe

A plataforma é multi-tenant (cada partido = um tenant). Um político tem **vida política independente** — alianças informais, relação com base, equipe de gabinete própria, dossiê construído ao longo dos anos. Esse capital político é **dele**, não do partido onde ele está agora.

Mas o partido investe **inteligência estratégica** nele: planos, scoring interno secreto, designação em operações, relatórios sigilosos. Esse capital é **do partido**, mesmo que se refira ao político.

Sem essa separação:
- Partido fica refém do político (se ele sair, leva tudo)
- OU político fica refém do partido (se sair, perde tudo e começa do zero)

Com a separação correta, **incentivos ficam alinhados** e o produto cumpre LGPD por design.

---

## Tabela de propriedade dos dados

| Categoria de dado | Pertence a | Comportamento ao desfiliar |
|-------------------|-----------|----------------------------|
| **Identificação** (nome, CPF, título, contatos) | Político | Permanece com político |
| **Dossiê público** (TSE, Câmara, Senado, CGU, TCU, CNJ — dados oficiais) | Político (são dados públicos) | Permanece — o dossiê é público de qualquer forma |
| **Overall pessoal e histórico** | Político | Permanece. Cálculo continua sendo público |
| **Agenda pessoal** | Político | Permanece |
| **Alianças informais (relações pessoais)** | Político | Permanece |
| **Clipping pessoal** | Político | Permanece |
| **Equipe de gabinete (configuração)** | Político | Permanece |
| **Filiação atual / histórico de filiações** | Política compartilhado | Histórico permanece, registro de saída adicionado |
| **Estratégia confidencial do partido sobre ele** | Partido | Não migra. Fica no tenant |
| **Operações ativas onde ele é executor ou objetivo** | Partido | Canceladas / arquivadas no tenant antigo |
| **Designações em campanhas operacionais antigas** | Partido | Permanecem como auditoria interna do partido |
| **Relatórios de campanha que ele executou** (textos, fotos, check-ins) | Partido | Permanecem no tenant antigo (auditoria + LGPD: anonimizar se necessário) |
| **Inteligência interna do partido** (notas, scores secretos, classificações políticas internas) | Partido | Não migra |
| **Acesso ao Radar / Operações do tenant** | Partido | Revogado no momento da desfiliação |

---

## Fluxo: político troca de partido

1. **Estado inicial:** político X filiado ao Partido A. Tem dossiê pessoal + acesso ao Radar A + 3 operações ativas.
2. **Solicitação de saída:** político inicia desfiliação na plataforma (ou Diretório registra).
3. **Imediatamente:**
   - Operações ativas onde X é executor → status `arquivada por desfiliação`
   - Operações onde X é objetivo → mantidas (Partido A pode continuar tentando contato)
   - Acesso de X ao Radar/Operações do Partido A → revogado
4. **Período de carência (configurável, default 30 dias):**
   - X mantém acesso de leitura ao próprio dossiê pra exportar (LGPD)
   - X pode baixar os dados pessoais dele em formato portável (JSON + PDFs)
5. **Após registro de filiação no Partido B (validado via TSE):**
   - X ganha acesso ao Radar/Operações do Partido B
   - Dossiê pessoal de X aparece automaticamente no tenant B (são dados públicos)
   - Histórico de filiação aparece (B sabe que X veio de A)
6. **Estratégia do Partido A sobre X:** permanece em A, invisível pra X e pra B
7. **Estratégia do Partido B sobre X:** começa do zero (B precisa construir sua própria leitura)

---

## Diferencial competitivo embutido

Esse desenho cria **gravidade** pro partido sem ser abusivo:

- **Partido tem incentivo a fidelizar:** quanto mais inteligência estratégica acumular sobre X, mais X depende do contexto — não dos dados, mas do cenário interpretado
- **Político tem liberdade real:** se sair, leva tudo que é dele e pode reconstruir — mas perde a inteligência interpretativa do partido
- **Equilíbrio justo:** alinhamento de incentivos sem trava abusiva, e ainda atende LGPD direito de portabilidade
- **Negociação possível:** partido pode oferecer "pacote de saída" (exportação enriquecida, recomendação) como cortesia — humaniza a saída sem ferir o princípio

---

## Implicação técnica resumida

### Modelo de dados

```sql
-- Político como entidade global (cross-tenant)
CREATE TABLE politicos (
    id BIGSERIAL PRIMARY KEY,
    cpf VARCHAR(11) UNIQUE,
    nome_completo TEXT,
    titulo_eleitor VARCHAR(20) UNIQUE,
    -- demais campos pessoais
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- Filiação atual + histórico
CREATE TABLE filiacoes_partidarias (
    id BIGSERIAL PRIMARY KEY,
    politico_id BIGINT REFERENCES politicos,
    partido_tenant_id BIGINT,
    diretorio_id BIGINT,         -- onde se filiou
    data_inicio DATE,
    data_fim DATE NULL,           -- null = ativa
    motivo_saida TEXT NULL        -- 'mudou_partido' | 'desfiliacao_voluntaria' | 'expulsao' | 'falecimento'
);

-- Dados pessoais do político (cross-tenant readable)
CREATE TABLE politico_dossie (
    politico_id BIGINT REFERENCES politicos,
    -- todos os campos do dossie publico
    PRIMARY KEY (politico_id)
);

-- Estratégia do partido sobre o político (single-tenant)
CREATE TABLE partido_estrategia_politico (
    id BIGSERIAL PRIMARY KEY,
    partido_tenant_id BIGINT,    -- isolamento por tenant
    politico_id BIGINT REFERENCES politicos,
    tipo TEXT,                    -- 'avaliacao' | 'plano_carreira' | 'risco' | 'oportunidade'
    conteudo TEXT,
    autor_id BIGINT,
    criado_em TIMESTAMPTZ
);

-- Operações vinculadas ao tenant
CREATE TABLE operacoes (
    id BIGSERIAL PRIMARY KEY,
    partido_tenant_id BIGINT,
    politico_objetivo_id BIGINT NULL,
    politico_executor_id BIGINT NULL,
    -- demais campos da operação
    status TEXT
);
```

### Permissões de leitura

- `politico_dossie`: leitura cross-tenant (qualquer partido pode ver o dossiê público de qualquer político)
- `partido_estrategia_politico`: leitura restrita ao `partido_tenant_id` (cada partido só vê a estratégia DELE)
- `operacoes`: leitura restrita ao `partido_tenant_id`

### Trigger de desfiliação

```sql
-- Pseudo-trigger (lógica em service Python no produto)
ON UPDATE filiacoes_partidarias SET data_fim = NOW():
  - Operações WHERE politico_executor_id = X AND partido_tenant_id = A → status = 'arquivada_por_desfiliacao'
  - Revoke acesso de X ao Radar/Operações do tenant A
  - Marca período de carência (30 dias) com leitura permitida pra exportação
  - Após carência, revoke total
```

---

## Quem precisa lembrar disso

- **Designer:** ao desenhar painel pessoal do político, deixar claro o que é "Meu" (azul, persistente) e o que é "Do Partido" (cinza, do tenant atual)
- **Backend:** isolar `partido_estrategia_politico` por tenant — query sempre com `WHERE partido_tenant_id = current_tenant`
- **Frontend:** 2 origens de dados no painel pessoal (cross-tenant pessoal + single-tenant estratégico). Cuidado com cache misturando
- **Suporte:** comunicar claramente ao usuário no momento da desfiliação o que vai e o que fica
- **Legal:** manter direito LGPD de portabilidade dos dados pessoais

---

## Decisões relacionadas

- `docs/perfis_e_paineis.md` — Camada Eletiva e painel pessoal do político
- `docs/UB_estrutura_partidaria.md` — Nominata por nível, vinculação a Diretórios
- [[Decisao - Migracao para mazzel-preview pos reuniao 2026-04-25]] — V2 multi-tenant ready
