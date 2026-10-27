# CRM Alto Valor

Projeto do Hacka Business para identificar clientes de alto valor, acompanhar a saúde do relacionamento e recomendar a próxima melhor experiência de fidelização.

## Documentação de dados

- [Índice da documentação](docs/README.md): ponto de entrada para produto, arquitetura, dados e qualidade.
- [Protótipo e funcionalidades](docs/PROTOTIPO_E_FUNCIONALIDADES.md): telas, indicadores e Central de Ativação.
- [Arquitetura técnica](docs/ARQUITETURA_TECNICA.md): Next.js, React, TypeScript, componentes e execução.
- [Testes e qualidade](docs/TESTES_E_QUALIDADE.md): cobertura automatizada e controles do pipeline.
- [Documentação definitiva em PDF](docs/documentacao/CRM_Alto_Valor_Documentacao_Definitiva_v4.pdf) e [versão HTML navegável](docs/documentacao/CRM_ALTO_VALOR_DOCUMENTACAO_COMPLETA.html): visão executiva, arquitetura, Next.js, Central de Ativação, testes e governança.
- [Modelo de dados](docs/MODELO_DE_DADOS.md): tabelas, chaves, métricas, scores e regras de recomendação.
- [Catálogo de análises](docs/ANALISES.md): indicadores, segmentações, perguntas e estrutura de dashboard.
- [Catálogo técnico JSON](data/database.json) e [catálogo tabular CSV](data/database.csv): inventário gerado das fontes ativas.

## Gerar o catálogo e o CRM do MVP

Execute na raiz do repositório:

```powershell
python scripts/anac/build_catalog.py
python scripts/anac/build_crm_mvp.py
```

As tabelas prontas para análise são gravadas em `data/processed`. Os testes ficam em `data/quality`.

## Resultado do MVP

O pipeline combina o contexto real e público da ANAC com clientes e comportamentos sintéticos. Ele entrega:

- Customer Value Score;
- Relationship Health Score;
- Churn Risk Score;
- Next Best Experience com motivo, canal, custo e uplift hipotético.

Nenhum registro representa uma pessoa real ou permite identificar passageiros da Azul.

## Protótipo Next.js

A aplicação principal está em `prototype` e lê diretamente as tabelas de `data/processed` no servidor Next.js. Ela inclui visão executiva, explorador de clientes, perfil 360, NBE, rotas, catálogo paginado e uma Central de Ativação com envio simulado e auditoria local.

```powershell
npm.cmd --prefix prototype install
npm.cmd --prefix prototype run dev
```

Abra `http://localhost:3000`. O protótipo HTML anterior foi preservado em `prototype/legacy`.

## Agente de mensagens

O agente recebe a Next Best Experience já definida pelo motor de regras e redige um rascunho. Ele não escolhe a ação e não envia mensagens.

```powershell
python prototype/agent/agente_mensagens.py C000634
python prototype/agent/agente_mensagens.py --top 10
```

Em 26/10/2026, o modo de regras, os guardrails e a auditoria estão implementados. A integração opcional com LLM está preparada por variáveis de ambiente, mas ainda não foi homologada com um provedor real.

## Nomenclatura

- **Azul Fidelidade:** programa de fidelidade citado no enunciado oficial.
- **Clube Azul:** assinatura usada como ativo de relacionamento na base sintética.
- **Cartão Azul Itaú:** cartão co-branded usado como ativo de relacionamento na base sintética.
- **Mundo Azul:** termo mencionado em conversa de mentoria; o campo legado foi renomeado para `azul_fidelidade_member` para alinhar o esquema ao enunciado oficial.

## Status em 26/10/2026

- pipeline, catálogo, documentação de dados e tabelas processadas: concluídos para o MVP;
- aplicação Next.js e Central de Ativação: concluídas para o MVP;
- testes automatizados: 25 testes aprovados, além de TypeScript e build de produção validados;
- agente: funcional em modo de regras; modo LLM ainda pendente de homologação;
- integração real com Snowflake, Salesforce e canais de CRM: desenho futuro, fora do MVP;
- dados reais de clientes: não utilizados; toda a camada de clientes é sintética.
