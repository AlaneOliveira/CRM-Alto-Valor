# Guia da base de dados — CRM Alto Valor

Este documento é o ponto de entrada para entender, atualizar e usar os dados do MVP. A base já é suficiente para demonstrar segmentação, valor do cliente, saúde do relacionamento e recomendação da próxima melhor experiência.

## O que existe hoje

A solução combina três naturezas de dado:

| Natureza | Origem | Exemplos | Uso correto |
|---|---|---|---|
| Pública real | ANAC | voos, horários, atrasos, cancelamentos, rotas, tarifas e aeródromos | contexto operacional e de mercado |
| Sintética | gerador do MVP | cliente, tier, pontos, cartão, clube, NPS, campanhas e reclamações | representar o CRM sem expor pessoas reais |
| Calculada | pipeline | frequência, recência, pontualidade, scores e recomendação | análise e tomada de decisão |

Nenhuma linha representa uma pessoa real. A ANAC não publica identificação de passageiros; por isso, o vínculo entre cliente e voo é simulado de forma reproduzível.

## Cobertura disponível

| Conjunto | Arquivos ativos | Cobertura | Papel no MVP |
|---|---:|---|---|
| VRA — voos realizados | 21 | jan/2025 a set/2026, mensal e contínua | atraso, cancelamento, regularidade, rota e aeroporto |
| Tarifas domésticas | 21 | jan/2025 a set/2026, mensal e contínua | preço de referência ponderado por assentos |
| Demanda e oferta | 1 | jan/2000 a abr/2021 | contexto histórico de capacidade, demanda, ASK e RPK |
| Aeródromos públicos | 1 | atualização de 15/10/2026 | cidade, UF e geolocalização |
| Empresas aéreas | 1 | snapshot de 14/07/2025 | validação e dimensão de companhia |

Os detalhes de cada arquivo, incluindo linhas, colunas, codificação, período e registros da Azul, ficam em [`docs/database.json`](../database.json) e [`docs/database.csv`](../database.csv).

## Organização das pastas

```text
docs/
├── data/
│   ├── README.md                  # este guia
│   ├── MODELO_DE_DADOS.md         # tabelas, chaves, scores e regras
│   └── ANALISES.md                # análises e indicadores possíveis
├── anac-data/
│   ├── raw/                       # fontes ativas e imutáveis
│   │   ├── operations/vra/        # voos mensais por ano
│   │   ├── market/domestic-fares/ # tarifas mensais por ano
│   │   ├── market/demand-supply/  # demanda e oferta histórica
│   │   └── dimensions/            # aeródromos e empresas aéreas
│   ├── archive/                   # preservado, fora do pipeline ativo
│   │   ├── partial-exports/       # exportações incompletas ou sobrepostas
│   │   ├── dimension-snapshots/   # versões antigas de dimensões
│   │   └── out-of-scope/          # arquivos sem uso no MVP atual
│   ├── processed/                 # tabelas prontas para análise
│   └── quality/                   # validações automatizadas
├── database.json                  # catálogo técnico detalhado
└── database.csv                   # catálogo tabular para Excel/BI
scripts/anac/
├── build_catalog.py               # perfila as fontes ativas
└── build_crm_mvp.py               # gera o CRM sintético e os scores
```

### Política das camadas

- `raw`: não editar o conteúdo. Novas fontes entram em sua pasta temática e temporal.
- `archive`: não apagar. O conteúdo é mantido para auditoria, mas não entra no pipeline.
- `processed`: pode ser regenerado; não deve receber ajustes manuais.
- `quality`: registra os testes da última execução.

## Saídas processadas

| Arquivo | Grão | Conteúdo |
|---|---|---|
| `crm_customers_mvp.csv` | 1 linha por cliente | perfil, aeroporto-base, tier, Clube Azul, cartão e pontos |
| `crm_flights_mvp.csv` | 1 linha por cliente-voo | viagem, operação real da ANAC, tarifa e pontos simulados |
| `crm_interactions_mvp.csv` | 1 linha por interação | campanha, abertura, clique, conversão, NPS e atendimento |
| `crm_customer_360_mvp.csv` | 1 linha por cliente | métricas agregadas, três scores e recomendação |
| `crm_data_dictionary.csv` | 1 linha por variável | tipo, natureza e definição dos campos |
| `crm_mvp_manifest.json` | 1 manifesto por execução | data de referência, semente e fontes utilizadas |
| `crm_mvp_quality.json` | 1 relatório por execução | contagens, integridade, faixas e status dos testes |

O relacionamento lógico e as fórmulas estão em [MODELO_DE_DADOS.md](MODELO_DE_DADOS.md). O catálogo de perguntas de negócio está em [ANALISES.md](ANALISES.md).

## Como regenerar

Na raiz do projeto:

```powershell
python scripts/anac/build_catalog.py
python scripts/anac/build_crm_mvp.py
```

O primeiro comando atualiza o inventário técnico. O segundo reconstrói todas as tabelas do CRM usando a semente `20261024` e a data de referência `2026-09-30`, permitindo obter o mesmo resultado em todas as máquinas.

## Controles de qualidade

O pipeline valida automaticamente:

- unicidade de clientes, cliente-voo e interações;
- integridade das chaves estrangeiras para `customer_id`;
- scores no intervalo de 0 a 100;
- presença de registros nas cinco saídas tabulares;
- distribuição das recomendações e faixas dos scores;
- continuidade mensal do VRA e das tarifas entre jan/2025 e set/2026.

Antes de apresentar ou criar um dashboard, confirme que `status` é `pass` em `docs/anac-data/quality/crm_mvp_quality.json` e `ready_for_mvp` no catálogo `docs/database.json`.

## Limitações conhecidas

- Demanda e oferta termina em abr/2021; deve ser usada como referência histórica, não como retrato atual.
- Perfil, compras, pontos, NPS e resposta às campanhas são sintéticos e não medem clientes reais da Azul.
- O uplift de retenção e o custo das ações são hipóteses do MVP; precisam de experimentos A/B para calibração em produção.
- A recomendação atual é baseada em regras explicáveis, não em causalidade comprovada.
- Clima, conexão, bagagem, motivo detalhado da reclamação e disponibilidade de benefícios ainda não fazem parte da base.

## Próximas evoluções recomendadas

1. Conectar eventos reais do CRM/Salesforce, Snowflake, Mundo Azul, Clube Azul e cartão Itaú.
2. Substituir atributos sintéticos preservando os mesmos nomes e chaves do modelo.
3. Incorporar disponibilidade e custo real de benefícios antes de executar a recomendação.
4. Medir conversão e retenção por grupo de controle para aprender o impacto incremental de cada ação.
5. Adicionar clima, conexões e bagagem somente se trouxerem ganho mensurável de decisão.
