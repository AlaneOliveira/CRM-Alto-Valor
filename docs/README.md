# Documentação — CRM Alto Valor

Este diretório concentra a documentação funcional, técnica e de dados do MVP. O produto atual é a aplicação Next.js em `prototype`; o painel HTML anterior permanece apenas em `prototype/legacy` como referência histórica.

## Estado atual

Em 26/10/2026, o repositório contém:

- pipeline reproduzível de dados públicos da ANAC e dados sintéticos de CRM;
- tabelas processadas de clientes, voos, interações e Customer 360;
- Customer Value Score, Relationship Health Score e Churn Risk Score;
- motor de Next Best Experience baseado em regras explicáveis;
- protótipo Next.js com análise, detalhe de cliente e execução simulada de CRM;
- agente determinístico de mensagens com guardrails;
- testes automatizados do frontend, regras e camada de dados;
- relatório de qualidade do pipeline.

Nenhum registro representa uma pessoa real. Os dados públicos da ANAC fornecem contexto operacional e tarifário; a associação com clientes é sintética.

## Índice

| Documento | Finalidade |
|---|---|
| [Protótipo e funcionalidades](PROTOTIPO_E_FUNCIONALIDADES.md) | páginas, indicadores, fluxos de usuário e Central de Ativação |
| [Arquitetura técnica](ARQUITETURA_TECNICA.md) | tecnologias, estrutura Next.js, componentes, estado e integrações |
| [Testes e qualidade](TESTES_E_QUALIDADE.md) | suíte Vitest, cobertura funcional e validações do pipeline |
| [Modelo de dados](MODELO_DE_DADOS.md) | tabelas, chaves, métricas, scores e regras de NBE |
| [Catálogo de análises](ANALISES.md) | indicadores, segmentações e perguntas de negócio |
| [Camadas de dados](../data/README.md) | política de `raw`, `archive`, `processed` e `quality` |
| [Documentação definitiva em PDF](documentacao/CRM_Alto_Valor_Documentacao_Definitiva_v4.pdf) | versão consolidada diagramada para entrega oficial (e [versão HTML](documentacao/CRM_ALTO_VALOR_DOCUMENTACAO_COMPLETA.html)) |
| [Catálogo JSON](../data/database.json) | inventário técnico detalhado das fontes |
| [Catálogo CSV](../data/database.csv) | inventário tabular para Excel e BI |

## Visão do sistema

```text
Dados públicos ANAC + premissas sintéticas
                 │
                 ▼
       scripts/anac/build_crm_mvp.py
                 │
                 ▼
 data/processed + quality
                 │
          ┌──────┴────────┐
          ▼               ▼
  Aplicação Next.js    Agente Python
  análise e ativação   rascunhos auditáveis
          │
          ▼
 localStorage: histórico simulado de ativações
```

## Execução rápida

Na raiz do repositório:

```powershell
npm.cmd --prefix prototype install
npm.cmd --prefix prototype run dev
```

Acesse `http://localhost:3000`.

Validação técnica:

```powershell
npm.cmd --prefix prototype test
npm.cmd --prefix prototype run typecheck
npm.cmd --prefix prototype run build
```

Regeneração dos dados:

```powershell
python scripts/anac/build_catalog.py
python scripts/anac/build_crm_mvp.py
```

## Responsabilidade de atualização

Ao alterar o produto:

1. atualizar [PROTOTIPO_E_FUNCIONALIDADES.md](PROTOTIPO_E_FUNCIONALIDADES.md) quando houver nova tela ou fluxo;
2. atualizar [ARQUITETURA_TECNICA.md](ARQUITETURA_TECNICA.md) quando houver nova tecnologia, dependência ou integração;
3. atualizar [TESTES_E_QUALIDADE.md](TESTES_E_QUALIDADE.md) quando a cobertura mudar;
4. atualizar a documentação de dados quando tabelas, campos ou fórmulas forem modificados;
5. manter o HTML consolidado alinhado ao estado real do repositório.
