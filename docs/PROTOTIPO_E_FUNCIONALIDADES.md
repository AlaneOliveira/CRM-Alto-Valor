# Protótipo e funcionalidades

## Objetivo do produto

O CRM Alto Valor é um MVP de decisão assistida para retenção. Ele organiza sinais de valor, relacionamento e risco, recomenda a próxima melhor experiência e demonstra como o CRM transforma uma recomendação em uma ativação controlada.

O produto não se limita a um dashboard. O ciclo demonstrado é:

```text
identificar → priorizar → explicar → recomendar → aprovar → ativar → acompanhar
```

## Rotas da aplicação

| Rota | Tela | Função principal |
|---|---|---|
| `/` | Visão executiva | consolidar KPIs, scores, segmentos, fila prioritária, sinais e rotas |
| `/clientes` | Explorador de clientes | pesquisar, filtrar, ordenar e paginar a carteira sintética |
| `/clientes/[id]` | Perfil Customer 360 | explicar valor, saúde, risco, NBE, voos e interações de um cliente |
| `/experiencias` | Next Best Experience | comparar recomendações, custo estimado e receita potencial preservada |
| `/ativacoes` | Central de Ativação | preparar, validar, aprovar e simular ações individuais ou em lote |
| `/rotas` | Rotas e contexto de jornada | analisar recorrência, atraso, cancelamento, tarifa e finalidade da viagem |
| `/dados` | Catálogo de dados | apresentar todas as tabelas processadas e suas contagens |
| `/dados/[dataset]` | Visualizador de tabela | pesquisar qualquer coluna e navegar pelos registros paginados |

## Visão executiva

A página inicial funciona como porta de entrada para as demais áreas. Ela mostra:

- clientes monitorados;
- clientes de alto valor em atenção;
- valor estimado em risco;
- retorno potencial hipotético;
- pulso do relacionamento com valor, saúde e risco médios;
- distribuição dos segmentos;
- fila prioritária ordenada por gasto multiplicado pelo risco;
- sinais operacionais e de fidelidade;
- distribuição das recomendações;
- rotas mais recorrentes.

Os três anéis do “Pulso do relacionamento” são médias da carteira, não scores de um cliente específico.

## Explorador de clientes

A listagem utiliza os 1.500 perfis sintéticos da visão Customer 360. Estão disponíveis:

- busca por ID, cidade, estado ou recomendação;
- filtros por tier, segmento e faixa de saúde;
- ordenação padrão por valor em risco;
- paginação de 20 clientes;
- total de resultados junto à paginação;
- acesso ao perfil 360.

Ao alterar uma busca ou filtro, a paginação retorna automaticamente para a primeira página.

## Perfil Customer 360

O detalhe do cliente reúne:

- identificação sintética e aeroporto-base;
- tier, segmento e faixa de relacionamento;
- Customer Value Score;
- Relationship Health Score;
- Churn Risk Score;
- valor em risco;
- drivers de valor e de relacionamento;
- frequência, recência, pontos, Clube Azul e Cartão Azul Itaú;
- NPS, pontualidade e canal preferido;
- voos e interações recentes;
- Next Best Experience, motivo, canal, custo e uplift hipotético;
- guardrails aplicáveis;
- atalho “Criar ativação”.

## Next Best Experience

A página de experiências agrega a carteira por ação recomendada. Para cada ação, exibe volume, canal dominante, risco médio, custo estimado, retorno potencial e necessidade de aprovação.

O custo representa o custo hipotético do benefício ou ação de relacionamento, não o custo técnico de enviar WhatsApp, e-mail, SMS ou push. Em uma evolução, os custos devem ser separados em:

1. custo do benefício;
2. custo do canal de comunicação;
3. custo total da campanha.

O retorno potencial representa receita potencialmente preservada com base em uplift hipotético. Não é retorno financeiro comprovado.

## Central de Ativação

A Central de Ativação fecha o ciclo entre análise e ação. Ela possui dois modos:

- **individual:** um cliente e uma mensagem personalizada;
- **em lote:** todos os clientes elegíveis para uma mesma NBE.

Ao abrir `/ativacoes` pelo menu, a tela inicia no Histórico. A aba Nova ativação aparece em seguida. Acessos contextuais pelo perfil do cliente ou pela página de experiências abrem diretamente a nova ativação com o cliente ou a ação já selecionados.

### Etapa 1 — Público

- seleção do cliente ou da ação em lote;
- contagem de elegíveis;
- remoção automática de clientes sem consentimento;
- exibição da razão e do perfil recomendado.

### Etapa 2 — Mensagem

- canal inicialmente definido pela recomendação;
- rascunho determinístico gerado pela regra da NBE;
- edição humana permitida;
- preview da mensagem;
- limite de 500 caracteres;
- bloqueio de promessa não autorizada de preço, percentual, desconto ou gratuidade.

### Etapa 3 — Guardrails

- consentimento de marketing;
- conteúdo seguro;
- aprovação humana;
- auditoria do escopo do agente.

Clientes com `customer_value_score >= 70` e jornadas sensíveis — Recuperação premium ou Proteção de jornada — exigem aprovação humana.

### Etapa 4 — Revisão

- modo e público elegível;
- ação e canal;
- custo estimado da ação;
- retorno potencial hipotético;
- mensagem final;
- trilha de decisões;
- envio simulado.

### Histórico e aprendizado

O histórico é mantido no `localStorage` com a chave `crm-alto-valor.activations.v1`. A sequência demonstrada é:

```text
envio simulado → entregue → aberto → convertido
```

No MVP, os eventos são avançados por botões para demonstrar o fluxo. Em produção, seriam atualizados automaticamente por webhooks e eventos do canal, aplicativo, site, sistema de reservas, Salesforce ou Snowflake.

“Convertido” significa que o cliente realizou o resultado configurado para a ação, por exemplo nova compra, renovação, ativação de benefício ou retorno à frequência esperada. A definição deve ser específica por campanha.

O histórico pode ser exportado em JSON. Nenhuma API externa é chamada e nenhuma mensagem real é enviada.

## Rotas e contexto operacional

A página de rotas agrega os voos sintéticos por origem e destino e mostra:

- volume de voos;
- clientes sintéticos associados;
- atraso médio;
- cancelamento;
- tarifa média;
- participação de viagens de negócio;
- classificação de experiência;
- paginação sobre todos os corredores disponíveis.

Os dados da ANAC calibram o contexto operacional. Eles não identificam passageiros.

## Catálogo navegável

O catálogo permite inspecionar diretamente:

- clientes;
- Customer 360;
- voos;
- interações;
- dicionário de dados.

Cada tabela possui busca textual, paginação, contagem total e indicação de grão. A leitura é feita no servidor a partir dos CSVs processados.

## Agente de mensagens

Existem duas implementações complementares:

- `prototype/lib/activations.ts`: regras e mensagens usadas pela Central de Ativação;
- `prototype/agent/agente_mensagens.py`: agente executável por linha de comando, com auditoria em arquivo.

O agente recebe a NBE já escolhida. Ele não decide a ação, não muda público ou custo e não realiza envio. A integração opcional com LLM permanece preparada, mas não homologada com um provedor real.

## Limitações do protótipo

- clientes e seus comportamentos são sintéticos;
- custo, uplift e retorno são hipóteses;
- histórico de ativação fica somente no navegador;
- não existe autenticação ou autorização por perfil;
- não existem integrações ativas com Salesforce, Snowflake ou canais;
- não há modelo supervisionado de churn ou CLV;
- o frontend não deve ser utilizado para contato real.
