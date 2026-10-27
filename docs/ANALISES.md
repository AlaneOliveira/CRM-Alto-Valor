# Catálogo de análises e indicadores

As análises abaixo podem ser construídas com a base atual. Elas devem apoiar fidelização e preservação de valor, não aquisição indiscriminada de clientes.

## Análises prioritárias para o MVP

| Análise | Pergunta respondida | Variáveis principais | Saída ou ação |
|---|---|---|---|
| Clientes de alto valor em risco | Quem vale muito, mas está se afastando? | value score, health score, churn risk, recência | fila de recuperação premium |
| Frequência recente | Quem realizou 10 ou mais voos em 3 meses? Quem reduziu? | `flights_3m`, `flights_previous_3m` | reconhecimento, proteção ou reativação |
| RFM | Quem compra mais, com maior frequência e menor recência? | gasto, voos e recência | segmentos de valor acionáveis |
| Impacto operacional | Atrasos e cancelamentos reduziram NPS ou saúde? | atraso, cancelamento, NPS, health score | compensação proporcional ao impacto |
| Próxima melhor experiência | Qual ação tem maior aderência ao contexto do cliente? | scores, tier, clube, cartão, operação | ação, motivo, canal, custo e uplift |
| Valor em risco | Quanto de receita anual está associado a clientes frágeis? | gasto 12m, value score, health score | priorização por valor preservável |
| Sensibilidade a preço | O cliente costuma pagar acima ou abaixo da rota/mês? | tarifa paga e tarifa de referência | oferta com preço, pontos ou flexibilidade |
| Evolução de tier | Quem está próximo de subir, manter ou perder status? | tier, frequência, gasto e tendência | acelerador de tier personalizado |
| Afinidade com fidelidade | Quem tem frequência e valor, mas não possui clube ou cartão? | clube, cartão, tier, frequência, valor | cross-sell com relevância |
| Recuperação de serviço | A relação se recuperou depois de uma experiência ruim? | evento operacional, atendimento, NPS posterior | ajustar prazo e intensidade da recuperação |

## Indicadores de cliente

| Indicador | Definição | Leitura de negócio |
|---|---|---|
| Voos em 3 e 12 meses | quantidade de viagens nas janelas | recorrência e intensidade de uso |
| Tendência trimestral | voos 0–90 dias versus 91–180 dias | fortalecimento ou enfraquecimento |
| Recência | dias desde o último voo | risco de inatividade |
| Gasto em 12 meses | soma em viagens concluídas | valor monetário atual |
| Ticket médio | gasto / viagens concluídas | perfil de compra |
| Saldo e uso de pontos | saldo atual, ganho e resgate | engajamento no ecossistema |
| Ativos de fidelidade | tier, Clube Azul e cartão | profundidade do vínculo |
| Conversão de campanha | conversões / envios | resposta comercial observada |
| Engajamento | cliques / envios | interesse nas mensagens |

## Indicadores de experiência e operação

| Indicador | Definição | Cortes úteis |
|---|---|---|
| On-time | partida com atraso de até 15 minutos | cliente, rota, aeroporto, mês e tier |
| Atraso médio | média de minutos em voos concluídos | cliente e rota |
| Atraso severo | voos com atraso ≥ 60 minutos | concentração e reincidência |
| Cancelamento | cancelados / voos programados | cliente, aeroporto e rota |
| Exposição negativa | clientes com cancelamento ou atraso relevante | valor e saúde do relacionamento |
| NPS pós-voo | nota mais recente de 0 a 10 | antes/depois de irregularidade |
| Resolução de reclamação | resolvidas / reclamações | tier, canal e tempo de resposta |

## Indicadores de rota e mercado

| Indicador | Fonte | Aplicação |
|---|---|---|
| Tarifa média ponderada | tarifas × assentos | benchmark de preço por rota/mês |
| Índice de preço pago | tarifa paga / referência | distinguir sensibilidade de disposição a pagar |
| Oferta | assentos e decolagens | entender capacidade histórica |
| Demanda | passageiros pagos e RPK | entender intensidade histórica da rota |
| Aproveitamento | RPK / ASK | contexto histórico de ocupação |
| Concentração de rotas | participação das rotas nos voos do cliente | dependência de uma jornada crítica |
| Risco do aeroporto-base | atraso/cancelamento dos voos associados | antecipar proteção operacional |
| Sazonalidade | evolução mensal | ajustar comunicação e benefícios ao ciclo de viagem |

Demanda e oferta termina em 2021. Seus indicadores devem ser nomeados como “históricos” e não misturados com métricas atuais sem sinalização.

## Segmentações recomendadas

1. **Campeões saudáveis:** valor alto e saúde alta; foco em reconhecimento e exclusividade.
2. **Joias em risco:** valor alto e saúde baixa; maior prioridade de retenção.
3. **Crescimento:** valor médio, tendência positiva e engajamento; acelerar tier ou clube.
4. **Frequentes sem ecossistema:** quatro ou mais voos, sem clube ou cartão; oferta contextual.
5. **Afetados pela operação:** cancelamento ou atraso relevante; proteção de jornada.
6. **Adormecidos:** mais de 210 dias sem voar; reativação personalizada.
7. **Baixa resposta:** envios recorrentes sem clique; reduzir pressão e mudar canal.

## Priorização das ações

Para ordenar a fila do CRM, pode-se usar:

```text
valor_em_risco = spend_12m_brl × churn_risk_score / 100
beneficio_esperado = spend_12m_brl × expected_retention_uplift_pct / 100
retorno_estimado = beneficio_esperado - estimated_action_cost_brl
```

Essas medidas servem como hipótese de priorização. Não devem ser apresentadas como retorno financeiro comprovado sem dados reais de margem, retenção e grupo de controle.

## Perguntas que o dashboard deve responder

- Quantos clientes estão nas faixas alto valor + atenção/crítico?
- Qual o valor anual concentrado nesses clientes?
- Quantos fizeram 10 ou mais voos nos últimos 3 meses?
- Quantos reduziram a frequência em relação ao trimestre anterior?
- Qual a taxa de pontualidade e cancelamento por segmento, rota e aeroporto-base?
- Qual a diferença de NPS entre clientes expostos e não expostos a irregularidades?
- Quais ações são recomendadas e qual o custo total estimado?
- Qual canal deve receber cada ação?
- Quais clientes têm afinidade com Clube Azul ou cartão Itaú?
- Em quais rotas a referência tarifária e a experiência operacional mais pressionam a relação?

## Estrutura implementada no protótipo

1. **Visão executiva:** clientes, valor em risco, pulso de valor/saúde/risco, segmentos, fila acionável e rotas.
2. **Explorador de clientes:** pesquisa, tier, segmento, saúde, paginação e acesso ao perfil 360.
3. **Perfil 360:** scores, drivers, fidelidade, experiência operacional, interações e NBE.
4. **Next Best Experience:** ação, motivo, canal, custo, uplift hipotético, retorno e atalho de ativação.
5. **Rotas:** recorrência, atraso, cancelamento, tarifa, viagens de negócio e paginação.
6. **Catálogo:** visualização e busca sobre todas as tabelas processadas.
7. **Central de Ativação:** público individual ou em lote, mensagem, guardrails, aprovação, revisão, envio simulado e histórico.

Detalhes de cada rota estão em [Protótipo e funcionalidades](../PROTOTIPO_E_FUNCIONALIDADES.md).

## Indicadores de execução simulada

| Indicador | Definição no MVP | Uso futuro |
|---|---|---|
| Público elegível | clientes da NBE com consentimento | alcance autorizado da campanha |
| Bloqueados | clientes removidos por ausência de consentimento | controle de conformidade |
| Custo estimado da ação | soma de `estimated_action_cost_brl` | orçamento de benefício |
| Retorno potencial | soma de gasto × uplift menos custo | hipótese para priorização |
| Ativações simuladas | registros criados no navegador | campanhas aprovadas |
| Entrega, abertura e conversão | eventos avançados manualmente | webhooks automáticos por canal |

O custo técnico do canal ainda não é calculado. Em produção, deve ser separado do custo do benefício.

## Validação futura em produção

- Criar grupo de tratamento e controle por ação.
- Medir retenção, frequência, receita incremental, custo e satisfação em 30/60/90 dias.
- Calibrar o churn como probabilidade, com separação temporal entre treino e teste.
- Avaliar viés por região, faixa etária, canal e acesso a produtos de fidelidade.
- Monitorar drift de dados e desempenho das regras mensalmente.
- Permitir que atendimento e marketing registrem o resultado da recomendação para fechar o ciclo de aprendizado.
