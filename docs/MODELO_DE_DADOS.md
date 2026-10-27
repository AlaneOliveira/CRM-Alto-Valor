# Modelo de dados do CRM Alto Valor

## Visão lógica

```text
crm_customers_mvp (1 cliente)
    ├──< crm_flights_mvp (N viagens)
    ├──< crm_interactions_mvp (N interações)
    └─── crm_customer_360_mvp (1 fotografia analítica)

ANAC VRA ───────────────> contexto operacional de crm_flights_mvp
ANAC tarifas ───────────> fare_reference_brl de crm_flights_mvp
ANAC aeródromos ────────> localização do aeroporto-base
```

`customer_id` é a chave de integração do CRM. Códigos ICAO, ano e mês são as chaves de enriquecimento com a ANAC.

## Tabelas processadas

| Tabela | Grão | Chave primária | Relacionamentos e uso |
|---|---|---|---|
| `crm_customers_mvp.csv` | cliente | `customer_id` | dimensão mestre do cliente sintético |
| `crm_flights_mvp.csv` | cliente-voo | `customer_flight_id` | `customer_id` → clientes; origem/destino e mês → ANAC |
| `crm_interactions_mvp.csv` | interação | `interaction_id` | `customer_id` → clientes; campanhas, NPS e atendimento |
| `crm_customer_360_mvp.csv` | cliente na data de referência | `customer_id` | consolida perfil, comportamento, scores e ação sugerida |
| `crm_data_dictionary.csv` | variável de uma tabela | `table + column` | contrato semântico e natureza do dado |

## Fontes ANAC

| Conjunto | Grão original | Chave recomendada | Variáveis principais |
|---|---|---|---|
| VRA | voo programado | empresa + número do voo + partida prevista + origem + destino | horários, situação, equipamento e assentos |
| Tarifas | preço comercializado em uma rota/mês | ano + mês + empresa + origem + destino + tarifa | tarifa e assentos vendidos |
| Demanda e oferta | empresa-rota-mês-natureza-grupo | empresa + ano + mês + origem + destino + natureza + grupo | passageiros, assentos, decolagens, ASK e RPK |
| Aeródromos | aeródromo | código ICAO | município, UF, latitude, longitude e situação |
| Empresas aéreas | empresa | ID da empresa | razão social, ICAO, IATA e atividade |

Para tarifa média, use média ponderada: `soma(tarifa × assentos) / soma(assentos)`. Uma média simples daria o mesmo peso a faixas tarifárias com volumes muito diferentes.

## Métricas do Customer 360

| Métrica | Regra atual |
|---|---|
| `flights_3m` | voos nos 90 dias anteriores a 30/09/2026 |
| `flights_previous_3m` | voos entre 91 e 180 dias antes da referência |
| `flights_12m` | voos nos 365 dias anteriores à referência |
| `spend_12m_brl` | soma da tarifa paga em voos não cancelados nos últimos 12 meses |
| `average_ticket_brl` | gasto de 12 meses / voos concluídos |
| `recency_days` | dias desde o último voo |
| `on_time_rate_12m` | partidas com atraso de até 15 minutos / partidas com horário realizado |
| `cancellation_rate_12m` | voos cancelados / voos dos últimos 12 meses |
| `campaign_engagement_rate` | cliques / campanhas enviadas |
| `complaint_resolution_rate` | reclamações resolvidas / reclamações |
| `latest_nps` | nota mais recente de 0 a 10 |

## Customer Value Score

O score mede valor realizado e potencial, de 0 a 100.

| Componente | Peso | Normalização |
|---|---:|---|
| Gasto em 12 meses | 30% | percentil na população do MVP |
| Frequência em 12 meses | 25% | percentil na população do MVP |
| Recência | 15% | decai linearmente até zero em 365 dias |
| Tier | 15% | Básico 20; Topázio 45; Safira 72; Diamante 100 |
| Ativos de fidelidade | 10% | Clube 35; cartão 35; saldo de pontos até 30 |
| Tendência de frequência | 5% | comparação dos últimos 3 meses com os 3 anteriores |

Faixas: `alto ≥ 70`, `médio ≥ 40 e < 70`, `baixo < 40`.

## Relationship Health Score

O score mede a força atual da relação, de 0 a 100.

| Componente | Peso | Interpretação |
|---|---:|---|
| NPS | 25% | nota de 0–10 convertida para 0–100 |
| Pontualidade | 25% | percentual de partidas com atraso ≤ 15 minutos |
| Ausência de cancelamento | 15% | `1 - taxa de cancelamento` |
| Engajamento | 15% | cliques / campanhas enviadas |
| Resolução | 10% | taxa de reclamações resolvidas; 100 sem reclamação |
| Tendência de frequência | 10% | crescimento ou redução do comportamento recente |

Faixas: `saudável ≥ 70`, `atenção ≥ 45 e < 70`, `crítico < 45`.

## Churn Risk Score

O risco é uma visão inversa de saúde, recência e engajamento:

```text
churn_risk = 100 - (
    60% × relationship_health
  + 25% × recency_score
  + 15% × engagement_score
)
```

Quanto maior, maior a prioridade de retenção. No MVP ele é um índice heurístico, não uma probabilidade calibrada de churn.

## Next Best Experience

As regras são avaliadas na ordem abaixo. A primeira condição verdadeira define a ação.

| Prioridade | Condição | Recomendação | Objetivo |
|---:|---|---|---|
| 1 | valor ≥ 70 e saúde < 55 | Recuperação premium | preservar cliente valioso fragilizado |
| 2 | cancelamento recente ou atraso médio ≥ 45 min | Proteção de jornada | reparar impacto operacional |
| 3 | valor ≥ 75 e saúde ≥ 70 | Reconhecimento exclusivo | reforçar fidelidade saudável |
| 4 | sem cartão Azul Itaú e valor ≥ 48 | Oferta Cartão Azul Itaú | ampliar vínculo e acúmulo de pontos |
| 5 | sem Clube Azul e frequência anual ≥ 4 | Oferta Clube Azul | converter recorrência em assinatura |
| 6 | recência > 210 dias | Reativação personalizada | recuperar atividade |
| 7 | demais casos | Acelerador de tier | estimular crescimento |

Cada ação tem canal preferido, custo estimado e uplift hipotético de retenção. Esses valores servem para priorização no hackathon e precisam de calibração experimental antes de uso real.

### Uso na Central de Ativação

A página `/ativacoes` recebe uma projeção tipada da visão Customer 360 com ID, localidade, tier, consentimento, NBE, canal, custo, uplift, gasto e scores. Ela aplica as regras abaixo:

- clientes sem consentimento são removidos do público elegível;
- valor igual ou superior a 70 exige aprovação humana;
- Recuperação premium e Proteção de jornada exigem aprovação independentemente do score;
- o custo exibido é o custo estimado da ação ou benefício, não o custo do canal;
- o retorno potencial é `gasto × uplift / 100 - custo da ação`;
- envio, entrega, abertura e conversão são simulados e não alteram a base processada.

O histórico da simulação fica no navegador e não integra o modelo persistente de dados.

## Regras de junção

- Cliente → voos: `customer_id`.
- Cliente → interações: `customer_id`.
- Voos → tarifa: `ano + mês + origem_icao + destino_icao`, filtrando `empresa_icao = AZU`.
- Voos → VRA: número do voo, origem, destino e data/hora programada.
- Aeroporto → aeródromo: código ICAO.
- Análise competitiva: manter todas as empresas; análise do relacionamento Azul: filtrar `AZU`.

## Natureza e governança dos campos

O dicionário classifica cada variável como `ANAC`, `ANAC aggregate`, `synthetic`, `ANAC+synthetic` ou `calculated`. Em produção, os campos sintéticos devem ser substituídos pelas fontes internas sem alterar os identificadores e os contratos das tabelas. Dados pessoais devem permanecer pseudonimizados e sujeitos a consentimento, finalidade e controles de acesso compatíveis com a LGPD.

## Contrato com a aplicação

- `prototype/lib/types.ts` replica os contratos necessários no TypeScript;
- `prototype/lib/data.ts` lê e agrega as tabelas no servidor;
- `prototype/lib/activations.ts` implementa regras e guardrails da ativação;
- mudanças de nome, tipo ou semântica exigem atualização coordenada no pipeline, dicionário, tipos, testes e documentação;
- os testes em `prototype/tests/data.test.ts` validam unicidade, agregações, ordenação, busca e relacionamento entre tabelas.
