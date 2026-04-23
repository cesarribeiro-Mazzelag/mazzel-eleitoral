# Mapa Eleitoral - Plano de Refinamento

Registrado em 2026-04-12, baseado no feedback direto do César após sessão de evolução.
**Este documento NÃO pode ser apagado.** É o roadmap de refinamento do mapa.

---

## Bugs reportados (prioridade alta - quebram funcionalidade)

### BUG-R1: Análise presidenciável não funciona
**Descrição**: candidatos a presidente não aparecem no mapa eleitoral. "Isso nunca funcionou."
**Onde**: `/mapa/geojson/brasil?cargo=PRESIDENTE&ano=2022`
**Impacto**: não dá pra analisar Lula vs Bolsonaro vs Tarcísio no nível nacional

### BUG-R2: Filtro por partido quebra lógicas do mapa
**Descrição**: quando usa partido como filtro no mapa, "as lógicas não funcionam, ficam quebradas"
**Onde**: provavelmente branch do MapaEleitoral.tsx onde `partidosSel.length === 1`
**Impacto**: análise por partido não serve

### BUG-R3: Sidebar não responsiva com candidatos eleitos
**Descrição**: ao navegar no modo VIGENTES sem selecionar candidatos, clicar em estados/cidades/municípios, a barra lateral não mostra candidatos eleitos corretamente
**Onde**: BarraLateral.tsx, PainelMunicipio.tsx, ou useMapaData hooks
**Impacto**: navegação exploratória não entrega informação útil

### BUG-R4: Aba "Não eleitos" não funciona
**Descrição**: na barra lateral tem aba "Eleitos" e "Não eleitos", a segunda não funciona
**Onde**: BarraLateral.tsx (vi na recuperação que tem toggle Eleitos/Não eleitos)
**Impacto**: informação de suplentes e derrotados não acessível

---

## Melhorias pendentes (prioridade média)

### MEL-R1: Percentil adaptativo no mapa principal
**Status**: aprovado, em implementação (Opção C)
**Descrição**: aplicar `enriquecer_features_auto` no mapa principal, mesma lógica que consertou o dossiê

### MEL-R2: Painel de informações na escola ao hover
**Descrição**: quando o usuário passa o mouse sobre uma escola no modo locais, aparece dados sobre o filtro aplicado (votos do partido/candidato nessa zona, eleitorado, performance do cabo)
**Referência**: PRODUCT_VISION seção 6.9 + print do template-d
**Impacto**: UX profissional, informação sem precisar clicar

### MEL-R3: Granularidade censitária (3 camadas de cruzamento)
**Descrição**: usar 3 camadas empilhadas pra mais precisão:
  1. Setor censitário do IBGE (base geográfica oficial)
  2. Cerca virtual (polígono do coordenador)
  3. Pin de escola (local de votação)
**Referência**: PRODUCT_VISION seção 6.8
**Status**: Cercas e escolas já existem no banco. Setor censitário NÃO. Precisa ETL do IBGE.

---

## Features novas (prioridade variável)

### FEAT-R1: Lacinho preto para políticos falecidos
**Descrição**: indicador visual discreto no card de político falecido
**Dados necessários**: coluna `falecido` (bool) + `data_falecimento` (date) no candidato
**Fontes**: TSE (DS_SIT_TOT_TURNO contém "FALECIDO" em alguns casos), Wikipedia, TSE Consulta Candidaturas
**Exemplo**: Major Olímpio (senador SP, faleceu 2021 de COVID-19)
**Impacto**: informação crucial para análise de sucessão
**Onde aplicar**: CardPolitico (Radar), ModalDossie, PainelMunicipio, PainelEscola, busca

### FEAT-R2: Sucessão política após falecimento
**Descrição**: quando político faleceu, mostrar quem assumiu o cargo (suplente)
**Dados necessários**: cruzar mandato do falecido com candidaturas da mesma chapa/coligação para encontrar suplente
**Exemplo**: Major Olímpio → Marcos do Val (suplente)
**Impacto**: "vale ouro saber" (César)

### FEAT-R3: Busca mostra se candidato faleceu
**Descrição**: na barra de busca do mapa, quando acha um candidato, mostrar informação se faleceu
**Onde**: FiltroMapa.tsx resultado de busca
**Impacto**: contexto imediato na busca

---

## Sequência proposta de execução

1. **MEL-R1** - Percentil adaptativo (AGORA - já aprovado)
2. **BUG-R1 a R4** - Diagnóstico + correção dos 4 bugs (PRÓXIMA sessão)
3. **MEL-R2** - Painel hover escola (PRÓXIMA sessão)
4. **FEAT-R1** - Lacinho preto falecidos (PRÓXIMA sessão)
5. **FEAT-R2** - Sucessão política (PRÓXIMA sessão)
6. **MEL-R3** - Granularidade censitária (sessão dedicada - precisa ETL IBGE)
7. **FEAT-R3** - Busca mostra falecimento (junto com FEAT-R1)

---

## Decisões pendentes

1. **Setor censitário**: vale o custo de ETL + storage + migration? Ou as cercas + escolas bastam?
2. **Dados de falecimento**: scraping do TSE? Campo manual? API do Wikipedia?
3. **Visual do lacinho preto**: badge na foto? ícone ao lado do nome? faixa preta no canto do card?
